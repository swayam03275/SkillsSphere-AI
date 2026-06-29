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
  updateQuestionBookmark,
  getBookmarkedQuestions,
} from "./service.js";
import { getServiceStatus } from "../../integrations/aiInterviewService.js";
import asyncHandler from "../../utils/asyncHandler.js";
import AppError from "../../utils/AppError.js";
import InterviewSession from "../../database/models/InterviewSession.js";
import { safeDeletePhysicalFile } from "../../utils/fileUtils.js";

export const startInterview = asyncHandler(async (req, res) => {
  const { topic, difficulty, persona } = req.body;

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
            bookmarked: Boolean(session.answers[0].bookmarked),
          }
        : null,
    },
  });
});

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
    data: {
      ...result,
      is_ai_evaluated: result.is_ai_evaluated ?? true,
      ...(result.fallback_reason && { fallback_reason: result.fallback_reason }),
    },
  });
});

export const completeInterview = asyncHandler(async (req, res) => {
  const result = await finalizeInterview(req.params.id, req.user._id);

  res.status(200).json({
    success: true,
    message: "Interview completed",
    data: result,
  });
});

export const getInterviewHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const history = await getUserInterviewHistory(req.user._id, page, limit);

  res.status(200).json({
    success: true,
    data: history,
  });
});

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

export const bookmarkQuestion = asyncHandler(async (req, res) => {
  const bookmark = await updateQuestionBookmark({
    sessionId: req.params.id,
    questionId: req.params.questionId,
    userId: req.user._id,
    bookmarked: req.body?.bookmarked,
  });

  res.status(200).json({
    success: true,
    message: bookmark.bookmarked ? "Question bookmarked" : "Question bookmark removed",
    data: bookmark,
  });
});

export const getInterviewBookmarks = asyncHandler(async (req, res) => {
  const bookmarks = await getBookmarkedQuestions(req.user._id);

  res.status(200).json({
    success: true,
    data: bookmarks,
  });
});

export const getAvailableTopics = asyncHandler(async (req, res) => {
  const topics = await listAvailableTopics();

  res.status(200).json({
    success: true,
    data: topics,
  });
});

export const getAIServiceStatus = asyncHandler(async (req, res) => {
  const status = await getServiceStatus();

  res.status(200).json({
    success: true,
    data: status,
  });
});

export const getTutorSessions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const data = await getTutorSessionsList(req.user._id, page, limit);

  res.status(200).json({
    success: true,
    data,
  });
});

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

export const submitTutorFeedback = asyncHandler(async (req, res) => {
  const session = await addTutorFeedback(req.params.id, req.user._id, req.body);

  res.status(200).json({
    success: true,
    message: "Feedback submitted successfully",
    data: session,
  });
});

export const deleteInterviewSession = asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!session) {
    throw new AppError("Interview session not found", 404);
  }

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