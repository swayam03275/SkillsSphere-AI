import AiJob from "../../database/models/AiJob.js";
import AppError from "../../utils/AppError.js";
import { getAiJobQueue } from "./queue.js";
import { AI_JOB_TYPES } from "./constants.js";

const IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000;

const findIdempotentJob = async (userId, type, idempotencyKey) => {
  if (!idempotencyKey) return null;

  const since = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS);
  return AiJob.findOne({
    user: userId,
    type,
    idempotencyKey,
    createdAt: { $gte: since },
    status: { $in: ["queued", "active", "completed"] },
  }).sort({ createdAt: -1 });
};

export const enqueueAiJob = async ({
  userId,
  type,
  payload,
  idempotencyKey,
}) => {
  const existing = await findIdempotentJob(userId, type, idempotencyKey);
  if (existing) {
    return { job: existing, reused: true };
  }

  const aiJob = await AiJob.create({
    user: userId,
    type,
    status: "queued",
    progress: { percent: 0, stage: "queued" },
    payload,
    idempotencyKey: idempotencyKey || undefined,
  });

  try {
    const queue = getAiJobQueue();
    const bullJob = await queue.add(
      type,
      { aiJobId: aiJob._id.toString() },
      { jobId: aiJob._id.toString() }
    );

    aiJob.bullJobId = bullJob.id;
    await aiJob.save();
  } catch (err) {
    await AiJob.findByIdAndUpdate(aiJob._id, {
      status: "failed",
      error: { message: `Failed to enqueue: ${err.message}` },
    });
    throw new AppError(
      "Job queue is unavailable. Ensure Redis is running and REDIS_URL is configured.",
      503
    );
  }

  return { job: aiJob, reused: false };
};

export const getAiJobForUser = async (jobId, userId) => {
  const job = await AiJob.findOne({ _id: jobId, user: userId }).lean();
  if (!job) {
    throw new AppError("AI job not found", 404);
  }
  return job;
};

export const formatJobResponse = (job) => ({
  jobId: job._id?.toString?.() ?? job._id,
  type: job.type,
  status: job.status,
  progress: job.progress,
  result: job.status === "completed" ? job.result : undefined,
  error:
    job.status === "failed" && job.error
      ? { message: job.error.message }
      : undefined,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
});

export { AI_JOB_TYPES };
