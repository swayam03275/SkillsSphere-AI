import mongoose from "mongoose";

const jobPostingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
      minlength: [2, "Job title must be at least 2 characters"],
      maxlength: [120, "Job title cannot exceed 120 characters"],
    },

    description: {
      type: String,
      required: [true, "Job description is required"],
      trim: true,
      minlength: [20, "Job description must be at least 20 characters"],
    },

    requirements: {
      type: [String],
      default: [],
    },

    responsibilities: {
      type: [String],
      default: [],
    },

    skills: {
      type: [String],
      required: [true, "At least one skill is required"],
      validate: {
        validator: function (value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "At least one skill is required",
      },
      set: (skills) =>
        skills
          .map((skill) => String(skill).trim().toLowerCase())
          .filter(Boolean),
    },

    experienceRequired: {
      type: Number, // Years of experience
      required: [true, "Experience required is required"],
      default: 0,
    },

    jobLevel: {
      type: String,
      enum: ["Internship", "Entry Level", "Associate", "Mid-Senior Level", "Director", "Executive"],
      required: [true, "Job level is required"],
      default: "Entry Level",
    },

    status: {
      type: String,
      enum: ["draft", "open", "closed", "archived"],
      default: "draft",
      required: true,
    },

    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recruiter ownership is required"],
      index: true,
    },

    location: {
      city: {
        type: String,
        required: [true, "City is required"],
        trim: true,
      },
      state: {
        type: String,
        required: [true, "State is required"],
        trim: true,
      },
      country: {
        type: String,
        required: [true, "Country is required"],
        trim: true,
        default: "India",
      },
      remote: {
        type: Boolean,
        default: false,
      },
      _id: false,
    },

    salary: {
      min: {
        type: Number,
        required: [true, "Minimum salary is required"],
        min: [0, "Minimum salary cannot be negative"],
      },
      max: {
        type: Number,
        required: [true, "Maximum salary is required"],
        min: [0, "Maximum salary cannot be negative"],
      },
      currency: {
        type: String,
        default: "INR",
        trim: true,
        uppercase: true,
      },
      isNegotiable: {
        type: Boolean,
        default: false,
      },
      _id: false,
    },

    keywords: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Cross-field validation: ensure salary.max >= salary.min
jobPostingSchema.path("salary.max").validate(function (value) {
  // During updates, 'this' might not have the full salary object if it's a partial update
  // Check if salary and salary.min are available before comparing
  if (this.salary && typeof this.salary.min === 'number') {
    return value >= this.salary.min;
  }
  // If we can't perform the cross-field check, we let it pass here
  // (The required validators on min/max will still catch missing values)
  return true;
}, "Maximum salary must be greater than or equal to minimum salary");

// Indexes for efficient filtering
jobPostingSchema.index({ title: "text" });
jobPostingSchema.index({ "salary.min": 1, "salary.max": 1 });
jobPostingSchema.index({ status: 1, createdAt: -1 });
jobPostingSchema.index({ jobLevel: 1 });
jobPostingSchema.index({ "location.city": 1 });
jobPostingSchema.index({ skills: 1 });

const JobPosting = mongoose.model("JobPosting", jobPostingSchema);
export default JobPosting;
