import mongoose from "mongoose";

const aiJobSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["RESUME_ANALYZE", "MATCHING_EVALUATE"],
      required: true,
    },
    status: {
      type: String,
      enum: ["queued", "active", "completed", "failed"],
      default: "queued",
      index: true,
    },
    progress: {
      percent: { type: Number, default: 0 },
      stage: { type: String, default: "queued" },
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    error: {
      message: String,
      stack: String,
    },
    bullJobId: {
      type: String,
      index: true,
    },
    idempotencyKey: {
      type: String,
      index: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

aiJobSchema.index(
  { user: 1, idempotencyKey: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  }
);

const AiJob = mongoose.model("AiJob", aiJobSchema);

export default AiJob;
