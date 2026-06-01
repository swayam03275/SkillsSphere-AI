import redisClient from "../config/redis.js";

import logger from "../utils/logger.js";

const cacheMiddleware = (prefix, ttlSeconds) => {
  return async (req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }

    try {
      if (!redisClient.isReady) {
        return next();
      }

      const key = `${prefix}:${req.originalUrl}`;
      const cachedData = await redisClient.get(key);

      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      const originalJson = res.json.bind(res);
      res.json = async (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            await redisClient.setEx(key, ttlSeconds, JSON.stringify(body));
          } catch (err) {
            logger.error("Redis set error:", err);
          }
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error("Cache middleware error:", error);
      next();
    }
  };
};

export default cacheMiddleware;
