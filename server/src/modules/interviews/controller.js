import {
  createSession,
  getSessionById,
  processAnswerSubmission,
  finalizeInterview,
  getUserInterviewHistory,
  getSessionResults as getResults,
  listAvailableTopics,
  getTutorSessionsList,
  getTutorSessionDetails,
  addTutorFeedback,
} from "./service.js";
import { getServiceStatus } from "../../integrations/aiInterviewService.js";
import asyncHandler from "../../utils/asyncHandler.js";
import AppError from "../../utils/AppError.js";
import InterviewSession from "../../database/models/InterviewSession.js";
import { safeDeletePhysicalFile } from "../../utils/fileUtils.js";

/**
 * @desc    Start a new interview session
 * @route   POST /api/interviews/start
 * @access  Private
 */
export const startInterview = asyncHandler(async (req, res) => {
  const { topic, difficulty, persona } = req.body;

  if (!topic) {
    throw new AppError("Topic is required to start an interview", 400);
  }

  const session = await createSession({
    userId: req.user._id,
    topic,
    difficulty: difficulty || "medium",
    persona: persona || "friendly",
  });

  res.status(201).json({
    success: true,
    message: "Interview session started",
    data: {
      sessionId: session._id,
      topic: session.topic,
      difficulty: session.difficulty,
      totalQuestions: session.totalQuestions,
      currentQuestion: session.answers[0]
        ? {
            index: 0,
            questionText: session.answers[0].questionText,
            questionId: session.answers[0].questionId,
          }
        : null,
    },
  });
});

/**
 * @desc    Get session details
 * @route   GET /api/interviews/:id
 * @access  Private
 */
export const getSession = asyncHandler(async (req, res) => {
  const session = await getSessionById(req.params.id, req.user._id);

  if (!session) {
    throw new AppError("Interview session not found", 404);
  }

  res.status(200).json({
    success: true,
    data: session,
  });
});

/**
 * @desc    Submit an answer for the current question
 * @route   POST /api/interviews/:id/answer
 * @access  Private
 */
export const submitAnswer = asyncHandler(async (req, res) => {
  const { transcript } = req.body;
  const audioFile = req.file || null;

  if (!transcript && !audioFile) {
    throw new AppError(
      "Either a transcript or audio file is required",
      400
    );
  }

  const result = await processAnswerSubmission({
    sessionId: req.params.id,
    userId: req.user._id,
    transcript,
    audioFile,
  });

  res.status(200).json({
    success: true,
    message: "Answer submitted successfully",
    data: result,
  });
});

/**
 * @desc    Complete the interview and calculate final scores
 * @route   POST /api/interviews/:id/complete
 * @access  Private
 */
export const completeInterview = asyncHandler(async (req, res) => {
  const result = await finalizeInterview(req.params.id, req.user._id);

  res.status(200).json({
    success: true,
    message: "Interview completed",
    data: result,
  });
});

/**
 * @desc    Get user's interview history
 * @route   GET /api/interviews/history
 * @access  Private
 */
export const getInterviewHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const history = await getUserInterviewHistory(req.user._id, page, limit);

  res.status(200).json({
    success: true,
    data: history,
  });
});

/**
 * @desc    Get detailed results for a specific session
 * @route   GET /api/interviews/:id/results
 * @access  Private
 */
export const getSessionResults = asyncHandler(async (req, res) => {
  const results = await getResults(req.params.id, req.user._id);

  if (!results) {
    throw new AppError("Interview session not found", 404);
  }

  res.status(200).json({
    success: true,
    data: results,
  });
});

/**
 * @desc    List available interview topics
 * @route   GET /api/interviews/topics
 * @access  Private
 */
export const getAvailableTopics = asyncHandler(async (req, res) => {
  const topics = await listAvailableTopics();

  res.status(200).json({
    success: true,
    data: topics,
  });
});

/**
 * @desc    Get AI service connection status
 * @route   GET /api/interviews/ai-status
 * @access  Private
 */
export const getAIServiceStatus = asyncHandler(async (req, res) => {
  const status = await getServiceStatus();

  res.status(200).json({
    success: true,
    data: status,
  });
});

/**
 * @desc    Tutor: Get all completed interview sessions
 * @route   GET /api/interviews/tutor/sessions
 * @access  Private (Tutor)
 */
export const getTutorSessions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const data = await getTutorSessionsList(req.user._id, page, limit);

  res.status(200).json({
    success: true,
    data,
  });
});

/**
 * @desc    Tutor: Get details of a completed interview session
 * @route   GET /api/interviews/tutor/sessions/:id
 * @access  Private (Tutor)
 */
export const getTutorSession = asyncHandler(async (req, res) => {
  const session = await getTutorSessionDetails(req.params.id, req.user._id);

  if (!session) {
    throw new AppError("Interview session not found", 404);
  }

  res.status(200).json({
    success: true,
    data: session,
  });
});

/**
 * @desc    Tutor: Submit manual feedback for an interview
 * @route   POST /api/interviews/tutor/sessions/:id/feedback
 * @access  Private (Tutor)
 */
export const submitTutorFeedback = asyncHandler(async (req, res) => {
  const session = await addTutorFeedback(req.params.id, req.user._id, req.body);

  res.status(200).json({
    success: true,
    message: "Feedback submitted successfully",
    data: session,
  });
});

/**
 * @desc    Delete an interview session and its associated audio files
 * @route   DELETE /api/interviews/:id
 * @access  Private (session owner only)
 */
export const deleteInterviewSession = asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!session) {
    throw new AppError("Interview session not found", 404);
  }

  // Delete associated audio files from disk before removing the DB record.
  if (Array.isArray(session.answers)) {
    for (const answer of session.answers) {
      if (answer.audioPath) {
        safeDeletePhysicalFile(answer.audioPath);
      }
    }
  }

  await session.deleteOne();

  res.status(200).json({
    success: true,
    message: "Interview session deleted successfully",
  });
});
