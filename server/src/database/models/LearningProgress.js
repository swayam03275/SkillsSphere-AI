import mongoose from "mongoose";

const topicProgressSchema = new mongoose.Schema({
  topicName: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["not_started", "in_progress", "completed"],
    default: "not_started",
  },
  completedAt: {
    type: Date,
  },
  resources: [
    {
      title: String,
      url: String,
      type: { type: String, enum: ["video", "article", "documentation"] }
    }
  ]
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
    overallProgress: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

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

const LearningProgress = mongoose.model("LearningProgress", learningProgressSchema);
export default LearningProgress;
