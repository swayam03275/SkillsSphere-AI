import redisClient from "../config/redis.js";

export const invalidateCacheByPrefix = async (prefix) => {
  if (!redisClient || !redisClient.isReady) return;
  try {
    const keys = await redisClient.keys(`${prefix}:*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`Cache invalidated for keys matching: ${prefix}:*`);
    }
  } catch (error) {
    console.error(`Failed to invalidate cache for prefix: ${prefix}`, error);
  }
};
