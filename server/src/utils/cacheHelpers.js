import redisClient from "../config/redis.js";

export const invalidateCacheByPrefix = async (prefix) => {
  try {
    let cursor = 0;
    const keys = [];
    do {
      const reply = await redisClient.scan(cursor, {
        MATCH: `${prefix}:*`,
        COUNT: 100,
      });
      cursor = reply.cursor;
      keys.push(...reply.keys);
    } while (cursor !== 0);

    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`Cache invalidated for ${keys.length} keys matching: ${prefix}:*`);
    }
  } catch (error) {
    console.error(`Failed to invalidate cache for prefix: ${prefix}`, error);
  }
};
