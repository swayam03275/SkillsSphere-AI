import mongoose from "mongoose";

const coverLetterSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },
    resume: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      required: [true, "Resume reference is required"],
      index: true,
    },
    jobDescription: {
      type: String,
      required: [true, "Job description is required"],
    },
    generatedText: {
      type: String,
      required: [true, "Generated cover letter text is required"],
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Indexes for efficient querying by user (e.g., dashboard history)
coverLetterSchema.index({ user: 1, createdAt: -1 });

const CoverLetter = mongoose.model("CoverLetter", coverLetterSchema);
export default CoverLetter;
