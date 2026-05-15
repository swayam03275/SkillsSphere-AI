import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuestionBank",
      required: true,
    },

    questionText: {
      type: String,
      required: true,
    },

    audioPath: {
      type: String,
      default: null,
    },

    transcript: {
      type: String,
      default: "",
    },

    scores: {
      technical: { type: Number, default: 0, min: 0, max: 100 },
      communication: { type: Number, default: 0, min: 0, max: 100 },
      relevance: { type: Number, default: 0, min: 0, max: 100 },
      _id: false,
    },

    concepts: {
      expected: { type: [String], default: [] },
      detected: { type: [String], default: [] },
      missed: { type: [String], default: [] },
      _id: false,
    },

    fillerWords: {
      type: Number,
      default: 0,
    },

    speakingSpeed: {
      type: String,
      enum: ["slow", "normal", "fast"],
      default: "normal",
    },

    answeredAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const interviewSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },

    topic: {
      type: String,
      required: [true, "Interview topic is required"],
      trim: true,
      lowercase: true,
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },

    status: {
      type: String,
      enum: ["in_progress", "completed", "abandoned"],
      default: "in_progress",
    },

    answers: {
      type: [answerSchema],
      default: [],
    },

    currentQuestionIndex: {
      type: Number,
      default: 0,
    },

    totalQuestions: {
      type: Number,
      default: 0,
    },

    overallScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    weakConcepts: {
      type: [String],
      default: [],
    },

    duration: {
      type: Number, // total seconds
      default: 0,
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for fetching user's interview history efficiently
interviewSessionSchema.index({ userId: 1, createdAt: -1 });
interviewSessionSchema.index({ status: 1 });

const InterviewSession = mongoose.model(
  "InterviewSession",
  interviewSessionSchema
);
export default InterviewSession;
