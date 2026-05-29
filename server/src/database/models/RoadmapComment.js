import mongoose from "mongoose";

const roadmapCommentSchema = new mongoose.Schema(
  {
    roadmap: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LearningProgress",
      required: true,
    },
    milestoneId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["comment", "status_change", "task_assigned"],
      default: "comment",
    },
  },
  {
    timestamps: true,
  }
);

const RoadmapComment = mongoose.model("RoadmapComment", roadmapCommentSchema);
export default RoadmapComment;
