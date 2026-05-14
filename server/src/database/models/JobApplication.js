import mongoose from "mongoose";

const jobApplicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPosting",
      required: [true, "Job reference is required"],
      index: true,
    },

    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Applicant reference is required"],
      index: true,
    },

    resume: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "reviewed", "shortlisted", "rejected", "withdrawn"],
      default: "pending",
    },

    resumeLink: {
      type: String,
      trim: true,
      maxlength: [2048, "Resume link cannot exceed 2048 characters"],
      default: null,
      validate: {
        validator: function (v) {
          if (!v) return true; // allow null/empty
          try {
            const url = new URL(v);
            return url.protocol === "http:" || url.protocol === "https:";
          } catch {
            return false;
          }
        },
        message: "Resume link must be a valid HTTP or HTTPS URL",
      },
    },

    coverNote: {
      type: String,
      trim: true,
      maxlength: [1000, "Cover note cannot exceed 1000 characters"],
      default: "",
    },

    statusHistory: [
      {
        status: {
          type: String,
          enum: ["pending", "reviewed", "shortlisted", "rejected", "withdrawn"],
          required: true,
        },
        comment: {
          type: String,
          trim: true,
          default: "",
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// Prevent duplicate applications: one applicant per job
jobApplicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

// Index for recruiter analytics queries
jobApplicationSchema.index({ job: 1, status: 1 });

const JobApplication = mongoose.model("JobApplication", jobApplicationSchema);
export default JobApplication;
