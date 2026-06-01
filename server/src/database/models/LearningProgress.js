import mongoose from "mongoose";

const topicProgressSchema = new mongoose.Schema({
  topicName: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["learning", "contribution"],
    default: "learning",
  },
  status: {
    type: String,
    enum: ["not_started", "in_progress", "completed"],
    default: "not_started",
  },
  completedAt: {
    type: Date,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  verifiedAt: {
    type: Date,
  },
  resources: [
    {
      title: String,
      url: String,
      type: { type: String, enum: ["video", "article", "documentation"] },
      tutorAssigned: {
        type: Boolean,
        default: false,
      },
      assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }
    }
  ],
  addedByTutor: {
    type: Boolean,
    default: false,
  }
});

const learningProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    targetRole: {
      type: String,
      required: true,
    },
    roadmap: [topicProgressSchema],
    achievements: [
      {
        badge: { type: String, enum: ["First Milestone Completed", "Open Source Explorer", "Roadmap Champion"] },
        earnedAt: { type: Date, default: Date.now },
      }
    ],
    overallProgress: {
      type: Number,
      default: 0,
    },
    recruitersTracking: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }
    ],
    tutorsTracking: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }
    ],
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual to check if any tutor has assigned custom resources on this roadmap
learningProgressSchema.virtual("hasTutorResources").get(function () {
  if (!this.roadmap) return false;
  return this.roadmap.some(topic => 
    topic.resources && topic.resources.some(res => res.tutorAssigned)
  );
});

// Middleware to calculate overall progress before saving
learningProgressSchema.pre("save", function (next) {
  if (this.roadmap && this.roadmap.length > 0) {
    const completedCount = this.roadmap.filter(
      (topic) => topic.status === "completed"
    ).length;
    this.overallProgress = Math.round((completedCount / this.roadmap.length) * 100);
  } else {
    this.overallProgress = 0;
  }
  next();
});

// Virtual to calculate readiness boost based on completed contribution milestones
learningProgressSchema.virtual("readinessBoost").get(function () {
  if (!this.roadmap) return 0;
  
  const contributionTopics = this.roadmap.filter((t) => t.type === "contribution");
  if (contributionTopics.length === 0) return 0;

  const completedContributions = contributionTopics.filter(
    (t) => t.status === "completed" || t.isVerified
  ).length;

  return completedContributions * 5; // Each completed contribution adds 5% boost
});

const LearningProgress = mongoose.model("LearningProgress", learningProgressSchema);
export default LearningProgress;
