import dotenv from "dotenv";
import { Worker } from "bullmq";
import mongoose from "mongoose";
import connectDB from "./src/database/db.js";
import AiJob from "./src/database/models/AiJob.js";
import { AI_QUEUE_NAME } from "./src/modules/aiJobs/constants.js";
import { getRedisConnection } from "./src/modules/aiJobs/queue.js";
import { dispatchAiJob } from "./src/modules/aiJobs/processors.js";

dotenv.config({ override: true });

const concurrency = Number(process.env.AI_WORKER_CONCURRENCY) || 2;

const startWorker = async () => {
  await connectDB();

  const worker = new Worker(
    AI_QUEUE_NAME,
    async (bullJob) => {
      const { aiJobId } = bullJob.data;
      const aiJobRecord = await AiJob.findById(aiJobId);

      if (!aiJobRecord) {
        throw new Error(`AiJob ${aiJobId} not found`);
      }

      try {
        return await dispatchAiJob(aiJobRecord, bullJob);
      } catch (error) {
        await AiJob.findByIdAndUpdate(aiJobId, {
          status: "failed",
          error: {
            message: error.message,
            stack: error.stack,
          },
        });
        throw error;
      }
    },
    {
      connection: getRedisConnection(),
      concurrency,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[ai-worker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[ai-worker] Job ${job?.id} failed:`, err.message);
  });

  console.log(
    `[ai-worker] Listening on queue "${AI_QUEUE_NAME}" (concurrency=${concurrency})`
  );

  const shutdown = async (signal) => {
    console.log(`\n[ai-worker] ${signal} — closing worker...`);
    await worker.close();
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

startWorker().catch((err) => {
  console.error("[ai-worker] Failed to start:", err);
  process.exit(1);
});
