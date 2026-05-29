import { Queue } from "bullmq";
import { AI_QUEUE_NAME } from "./constants.js";

const getRedisConnection = () => {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || "localhost",
      port: Number(parsed.port) || 6379,
      password: parsed.password || undefined,
      username: parsed.username || undefined,
      maxRetriesPerRequest: null,
    };
  } catch {
    return { host: "localhost", port: 6379, maxRetriesPerRequest: null };
  }
};

let aiJobQueue = null;

export const getAiJobQueue = () => {
  if (!aiJobQueue) {
    aiJobQueue = new Queue(AI_QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: { age: 3600, count: 500 },
        removeOnFail: { age: 86400, count: 200 },
        attempts: 2,
        backoff: { type: "exponential", delay: 3000 },
      },
    });
  }
  return aiJobQueue;
};

export { getRedisConnection };
