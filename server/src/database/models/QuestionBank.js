import mongoose from "mongoose";

const questionBankSchema = new mongoose.Schema(
  {
    topic: {
      type: String,
      required: [true, "Topic is required"],
      trim: true,
      lowercase: true,
      index: true,
    },

    subtopic: {
      type: String,
      required: [true, "Subtopic is required"],
      trim: true,
      lowercase: true,
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: [true, "Difficulty level is required"],
      default: "medium",
    },

    questionText: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
    },

    expectedConcepts: {
      type: [String],
      required: [true, "Expected concepts are required"],
      validate: {
        validator: (val) => Array.isArray(val) && val.length > 0,
        message: "At least one expected concept is required",
      },
    },

    expectedAnswer: {
      type: String,
      required: [true, "Expected answer is required"],
      trim: true,
    },

    followUpQuestions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "QuestionBank",
      },
    ],
  },
  { timestamps: true }
);

// Compound index for fetching questions by topic + difficulty
questionBankSchema.index({ topic: 1, difficulty: 1 });

const QuestionBank = mongoose.model("QuestionBank", questionBankSchema);
export default QuestionBank;
