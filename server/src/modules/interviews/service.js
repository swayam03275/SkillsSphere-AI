import InterviewSession from "../../database/models/InterviewSession.js";
import QuestionBank from "../../database/models/QuestionBank.js";
import ConceptGraph from "../../database/models/ConceptGraph.js";
import LearningProgress from "../../database/models/LearningProgress.js";
import AppError from "../../utils/AppError.js";
import mongoose from "mongoose";
import {
  transcribeAudio,
  evaluateAnswer,
} from "../../integrations/aiInterviewService.js";
import redisClient from "../../config/redis.js";
import Notification from "../../database/models/Notification.js";
import { getIO } from "../../utils/socketIO.js";

import logger from "../../utils/logger.js";

// Guards against concurrent answer submissions for the same session.
// Since processAnswerSubmission spans async I/O (transcription, evaluation),
// two calls can otherwise read the same currentQuestionIndex and collide.
const pendingSubmissions = new Map();

/**
 * Select random questions from the bank for a given topic and difficulty.
 * Avoids repeating questions from the user's last 3 sessions on the same topic.
 */
const selectQuestions = async (topic, difficulty, userId, count = 5) => {
  // Get question IDs from user's recent sessions to avoid repeats
  const recentSessions = await InterviewSession.find({
    userId,
    topic,
  })
    .sort({ createdAt: -1 })
    .limit(3)
    .select("answers.questionId")
    .lean();

  const recentQuestionIds = recentSessions.flatMap((s) =>
    s.answers.map((a) => a.questionId)
  );

  // Try to find questions excluding recent ones
  let questions = await QuestionBank.find({
    topic,
    difficulty,
    _id: { $nin: recentQuestionIds },
  });

  // If not enough fresh questions, fall back to full pool
  if (questions.length < count) {
    questions = await QuestionBank.find({ topic, difficulty });
  }

  if (questions.length === 0) {
    throw new AppError(
      `No questions found for topic "${topic}" with difficulty "${difficulty}"`,
      404
    );
  }

  // Shuffle and pick 'count' questions
  const shuffled = questions.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
};

/**
 * Create a new interview session with pre-selected questions.
 */
export const createSession = async ({ userId, topic, difficulty, persona }) => {
  // Verify the topic exists in our question bank
  const topicExists = await QuestionBank.exists({ topic });
  if (!topicExists) {
    throw new AppError(`Topic "${topic}" is not available`, 400);
  }

  const questions = await selectQuestions(topic, difficulty, userId);

  // Pre-populate the answers array with question info (scores filled in later)
  const answers = questions.map((q) => ({
    questionId: q._id,
    questionText: q.questionText,
    concepts: {
      expected: q.expectedConcepts,
      detected: [],
      missed: [],
    },
  }));

  const session = await InterviewSession.create({
    userId,
    topic,
    difficulty,
    persona,
    answers,
    totalQuestions: answers.length,
    currentQuestionIndex: 0,
    startedAt: new Date(),
  });

  return session;
};

/**
 * Fetch a session by ID, ensuring it belongs to the requesting user.
 */
export const getSessionById = async (sessionId, userId) => {
  const session = await InterviewSession.findOne({
    _id: sessionId,
    userId,
  });
  return session;
};

/**
 * Process a submitted answer — send to Python AI service for evaluation.
 */
export const processAnswerSubmission = async ({
  sessionId,
  userId,
  transcript,
  audioFile,
}) => {
  const lockKey = `interview_lock:${sessionId}`;
  const useRedis = redisClient.isReady;

  if (useRedis) {
    const acquired = await redisClient.set(lockKey, "LOCKED", { NX: true, EX: 30 });
    if (!acquired) {
      throw new AppError("Answer submission already in progress for this session", 429);
    }
  } else {
    if (pendingSubmissions.get(sessionId)) {
      throw new AppError("Answer submission already in progress for this session", 429);
    }
    pendingSubmissions.set(sessionId, true);
  }

  try {
    const session = await InterviewSession.findOne({
      _id: sessionId,
      userId,
      status: "in_progress",
    });

    if (!session) {
      throw new AppError("Active interview session not found", 404);
    }

    const currentIndex = session.currentQuestionIndex;

    if (currentIndex >= session.totalQuestions) {
      throw new AppError("All questions have been answered", 400);
    }

    const currentAnswer = session.answers[currentIndex];

    // Get the full question details for evaluation
    const question = await QuestionBank.findById(currentAnswer.questionId);

    if (!question) {
      throw new AppError("Question not found in bank", 500);
    }

    // Step 1: If audio file provided, transcribe it via Python service
    let finalTranscript = transcript;
    if (audioFile && !transcript) {
      try {
        const transcription = await transcribeAudio(audioFile.buffer);
        finalTranscript = transcription.transcript;
      } catch (err) {
        logger.error("[interview] Transcription failed:", err.message);
        throw new AppError("Audio transcription failed. Please try submitting text instead.", 500);
      }
    }

    if (!finalTranscript || finalTranscript.trim().length === 0) {
      throw new AppError("No transcript available for evaluation", 400);
    }

    // Step 2: Evaluate the answer via Python service
    let evaluation;
    try {
      evaluation = await evaluateAnswer(
        finalTranscript,
        question.expectedAnswer,
        question.expectedConcepts
      );
    } catch (err) {
      logger.error("[interview] Evaluation failed:", err.message);
      evaluation = {
        technical: 0,
        communication: 0,
        relevance: 0,
        concepts: { detected: [], missed: question.expectedConcepts },
        fillerWords: 0,
        speakingSpeed: "normal",
      };
    }

    // Step 3: Update the session with the answer data
    session.answers[currentIndex].transcript = finalTranscript;
    session.answers[currentIndex].scores = {
      technical: evaluation.technical || 0,
      communication: evaluation.communication || 0,
      relevance: evaluation.relevance || 0,
    };
    session.answers[currentIndex].concepts.detected =
      evaluation.concepts?.detected || [];
    session.answers[currentIndex].concepts.missed =
      evaluation.concepts?.missed || [];
    session.answers[currentIndex].fillerWords = evaluation.fillerWords || 0;
    session.answers[currentIndex].speakingSpeed =
      evaluation.speakingSpeed || "normal";
    session.answers[currentIndex].answeredAt = new Date();

    if (audioFile) {
      session.answers[currentIndex].audioPath = audioFile.path || null;
    }

    // Move to next question
    session.currentQuestionIndex = currentIndex + 1;
    await session.save();

    // Prepare response
    const isLastQuestion = currentIndex + 1 >= session.totalQuestions;
    const nextQuestion = !isLastQuestion
      ? {
          index: currentIndex + 1,
          questionText: session.answers[currentIndex + 1].questionText,
          questionId: session.answers[currentIndex + 1].questionId,
        }
      : null;

    return {
      scores: session.answers[currentIndex].scores,
      concepts: session.answers[currentIndex].concepts,
      transcript: finalTranscript,
      isLastQuestion,
      nextQuestion,
    };
  } finally {
    if (useRedis) {
      await redisClient.del(lockKey).catch(logger.error);
    } else {
      pendingSubmissions.delete(sessionId);
    }
  }
};

/**
 * Finalize an interview — calculate overall scores and mark as completed.
 */
export const finalizeInterview = async (sessionId, userId) => {
  const session = await InterviewSession.findOne({
    _id: sessionId,
    userId,
    status: "in_progress",
  });

  if (!session) {
    throw new AppError("Active interview session not found", 404);
  }

  // Calculate overall scores from answered questions
  const answeredQuestions = session.answers.filter((a) => a.answeredAt);

  if (answeredQuestions.length === 0) {
    throw new AppError("Cannot complete an interview with no answers", 400);
  }

  const totalScores = answeredQuestions.reduce(
    (acc, a) => ({
      technical: acc.technical + a.scores.technical,
      communication: acc.communication + a.scores.communication,
      relevance: acc.relevance + a.scores.relevance,
    }),
    { technical: 0, communication: 0, relevance: 0 }
  );

  const count = answeredQuestions.length;
  const avgTechnical = Math.round(totalScores.technical / count);
  const avgCommunication = Math.round(totalScores.communication / count);
  const avgRelevance = Math.round(totalScores.relevance / count);

  // Overall score is weighted average: technical 50%, communication 25%, relevance 25%
  const overallScore = Math.round(
    avgTechnical * 0.5 + avgCommunication * 0.25 + avgRelevance * 0.25
  );

  // Collect all missed concepts across all answers
  const allMissed = answeredQuestions.flatMap((a) => a.concepts.missed);
  // Count frequency and sort by most missed
  const missedCounts = {};
  allMissed.forEach((c) => {
    missedCounts[c] = (missedCounts[c] || 0) + 1;
  });
  const weakConcepts = Object.entries(missedCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([concept]) => concept);

  // Calculate duration
  const duration = Math.round((Date.now() - session.startedAt.getTime()) / 1000);

  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    session.status = "completed";
    session.overallScore = overallScore;
    session.weakConcepts = weakConcepts;
    session.duration = duration;
    session.completedAt = new Date();
    
    // Save within the transaction
    await session.save({ session: dbSession });
    
    // If future logic updates LearningProgress here, it should pass { session: dbSession }
    
    await dbSession.commitTransaction();
  } catch (error) {
    await dbSession.abortTransaction();
    logger.error("Transaction aborted in finalizeInterview:", error);
    throw error;
  } finally {
    dbSession.endSession();
  }

  return {
    overallScore,
    scores: {
      technical: avgTechnical,
      communication: avgCommunication,
      relevance: avgRelevance,
    },
    weakConcepts,
    totalAnswered: count,
    totalQuestions: session.totalQuestions,
    duration,
  };
};

/**
 * Get paginated interview history for a user.
 */
export const getUserInterviewHistory = async (userId, page, limit) => {
  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    InterviewSession.find({ userId })
      .select("topic difficulty status overallScore totalQuestions duration createdAt completedAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    InterviewSession.countDocuments({ userId }),
  ]);

  return {
    sessions,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get detailed results for a completed session.
 */
export const getSessionResults = async (sessionId, userId) => {
  const session = await InterviewSession.findOne({
    _id: sessionId,
    userId,
  }).lean();

  if (!session) return null;

  return {
    topic: session.topic,
    difficulty: session.difficulty,
    status: session.status,
    overallScore: session.overallScore,
    weakConcepts: session.weakConcepts,
    duration: session.duration,
    totalQuestions: session.totalQuestions,
    answers: session.answers.map((a) => ({
      questionText: a.questionText,
      transcript: a.transcript,
      scores: a.scores,
      concepts: a.concepts,
      fillerWords: a.fillerWords,
      speakingSpeed: a.speakingSpeed,
    })),
    startedAt: session.startedAt,
    completedAt: session.completedAt,
  };
};

/**
 * List all available interview topics from the question bank.
 */
export const listAvailableTopics = async () => {
  const CACHE_KEY = "interview_topics";

  if (redisClient?.isReady) {
    try {
      const cached = await redisClient.get(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {
      // Redis unavailable — compute fresh
    }
  }

  const topics = await QuestionBank.aggregate([
    {
      $group: {
        _id: "$topic",
        questionCount: { $sum: 1 },
        difficulties: { $addToSet: "$difficulty" },
      },
    },
    {
      $project: {
        topic: "$_id",
        questionCount: 1,
        difficulties: 1,
        _id: 0,
      },
    },
    { $sort: { topic: 1 } },
  ]);

  if (redisClient?.isReady) {
    try {
      await redisClient.setEx(CACHE_KEY, 1800, JSON.stringify(topics));
    } catch {
      // silently fail
    }
  }
  return topics;
};

export const getTutorSessionsList = async (tutorId, page, limit) => {
  const skip = (page - 1) * limit;

  // Find all students assigned to this tutor
  const roadmaps = await LearningProgress.find({ tutorsTracking: tutorId }).select("user");
  const studentIds = roadmaps.map((r) => r.user);

  const [sessions, total] = await Promise.all([
    InterviewSession.find({ userId: { $in: studentIds }, status: "completed" })
      .populate('userId', 'name email')
      .select('topic difficulty status overallScore tutorOverallScore duration createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    InterviewSession.countDocuments({ userId: { $in: studentIds }, status: 'completed' }),
  ]);
  return { sessions, total, page, pages: Math.ceil(total / limit) };
};

export const getTutorSessionDetails = async (sessionId, tutorId) => {
  const session = await InterviewSession.findById(sessionId).populate('userId', 'name email').lean();
  if (!session) return null;

  const authorizedRoadmap = await LearningProgress.findOne({
    user: session.userId._id || session.userId,
    tutorsTracking: tutorId
  });

  if (!authorizedRoadmap) {
    throw new AppError("You are not authorized to view this interview session", 403);
  }

  return {
    id: session._id,
    userId: session.userId || { name: 'Unknown User' },
    topic: session.topic,
    difficulty: session.difficulty,
    status: session.status,
    overallScore: session.overallScore,
    tutorOverallScore: session.tutorOverallScore,
    tutorOverallFeedback: session.tutorOverallFeedback,
    weakConcepts: session.weakConcepts || [],
    duration: session.duration,
    totalQuestions: session.totalQuestions,
    answers: (session.answers || []).map((a) => ({
      questionId: a.questionId,
      questionText: a.questionText,
      transcript: a.transcript,
      audioPath: a.audioPath,
      scores: a.scores || {},
      tutorScores: a.tutorScores || {},
      tutorFeedback: a.tutorFeedback || "",
      concepts: a.concepts || { detected: [], missed: [], expected: [] },
      fillerWords: a.fillerWords,
      speakingSpeed: a.speakingSpeed,
    })),
    startedAt: session.startedAt,
    completedAt: session.completedAt,
  };
};

export const addTutorFeedback = async (sessionId, tutorId, { tutorOverallScore, tutorOverallFeedback, answersFeedback }) => {
  const client = mongoose.connection?.client;
  const topologyType = client?.topology?.description?.type;
  const useTransaction = topologyType && (
    topologyType.includes("ReplicaSet") ||
    topologyType === "Sharded" ||
    (client?.topology?.description?.servers && client.topology.description.servers.size > 1)
  );

  if (useTransaction) {
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      const session = await InterviewSession.findById(sessionId).session(dbSession);
      if (!session) throw new AppError('Session not found', 404);
      
      const authorizedRoadmap = await LearningProgress.findOne({
        user: session.userId,
        tutorsTracking: tutorId
      }).session(dbSession);

      if (!authorizedRoadmap) {
        throw new AppError("You are not authorized to add feedback to this session", 403);
      }

      if (tutorOverallScore !== undefined) session.tutorOverallScore = tutorOverallScore;
      if (tutorOverallFeedback !== undefined) session.tutorOverallFeedback = tutorOverallFeedback;
      
      if (answersFeedback && Array.isArray(answersFeedback)) {
        answersFeedback.forEach(fb => {
          const answer = session.answers.find(a => a.questionId.toString() === fb.questionId);
          if (answer) {
            if (fb.tutorScores) answer.tutorScores = fb.tutorScores;
            if (fb.tutorFeedback) answer.tutorFeedback = fb.tutorFeedback;
          }
        });
      }
      
      await session.save({ session: dbSession });

      // Create persistent notification in DB for student
      const [notif] = await Notification.create([{
        userId: session.userId,
        type: "interview",
        title: "Interview Feedback Submitted",
        message: `Tutor has submitted feedback for your "${session.topic}" interview.`,
        metadata: {
          relatedId: session._id,
          relatedModel: "Interview",
          actionUrl: `/mock-interview/${session._id}/results`,
        },
      }], { session: dbSession });

      await dbSession.commitTransaction();

      // Emit real-time socket notification to the student (after commit)
      const io = getIO();
      if (io) {
        const roomName = `user_${session.userId}`;
        io.to(roomName).emit("new-notification", notif);
      }

      return session;
    } catch (error) {
      await dbSession.abortTransaction();
      logger.error("Transaction aborted in addTutorFeedback:", error);
      throw error;
    } finally {
      dbSession.endSession();
    }
  } else {
    const session = await InterviewSession.findById(sessionId);
    if (!session) throw new AppError('Session not found', 404);
    
    const authorizedRoadmap = await LearningProgress.findOne({
      user: session.userId,
      tutorsTracking: tutorId
    });

    if (!authorizedRoadmap) {
      throw new AppError("You are not authorized to add feedback to this session", 403);
    }

    if (tutorOverallScore !== undefined) session.tutorOverallScore = tutorOverallScore;
    if (tutorOverallFeedback !== undefined) session.tutorOverallFeedback = tutorOverallFeedback;
    
    if (answersFeedback && Array.isArray(answersFeedback)) {
      answersFeedback.forEach(fb => {
        const answer = session.answers.find(a => a.questionId.toString() === fb.questionId);
        if (answer) {
          if (fb.tutorScores) answer.tutorScores = fb.tutorScores;
          if (fb.tutorFeedback) answer.tutorFeedback = fb.tutorFeedback;
        }
      });
    }
    
    await session.save();

    // Create persistent notification in DB for student
    const notif = await Notification.create({
      userId: session.userId,
      type: "interview",
      title: "Interview Feedback Submitted",
      message: `Tutor has submitted feedback for your "${session.topic}" interview.`,
      metadata: {
        relatedId: session._id,
        relatedModel: "Interview",
        actionUrl: `/mock-interview/${session._id}/results`,
      },
    });

    // Emit real-time socket notification to the student
    const io = getIO();
    if (io) {
      const roomName = `user_${session.userId}`;
      io.to(roomName).emit("new-notification", notif);
    }

    return session;
  }
};
