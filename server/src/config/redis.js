import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config({ override: true });

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) return new Error("Redis max retries reached");
      return Math.min(retries * 100, 3000);
    },
  },
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err.message);
});

redisClient.on("connect", () => {
  console.log("Redis Client Connected");
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.log("Redis connection skipped for local development");
  }
};

export default redisClient;
