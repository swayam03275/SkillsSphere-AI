import redisClient from "../config/redis.js";

/**
 * JWT token blacklist (Redis-backed with in-memory fallback).
 */

const blacklist = new Map();
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

export const blacklistToken = async (jti, exp) => {
  if (!jti || !exp) return;
  const now = Math.floor(Date.now() / 1000);
  const ttl = exp - now;
  
  if (ttl <= 0) return;

  if (redisClient?.isReady) {
    try {
      await redisClient.setEx(`bl_${jti}`, ttl, "1");
      return;
    } catch (err) {
      console.error("Redis blacklist error:", err);
    }
  }
  
  // Fallback
  blacklist.set(jti, exp);
};

export const isTokenBlacklisted = async (jti) => {
  if (!jti) return false;
  
  if (redisClient?.isReady) {
    try {
      const exists = await redisClient.exists(`bl_${jti}`);
      if (exists) return true;
    } catch (err) {
      console.error("Redis check error:", err);
    }
  }
  
  return blacklist.has(jti);
};

const purgeExpired = () => {
  const now = Math.floor(Date.now() / 1000);
  for (const [jti, exp] of blacklist) {
    if (exp <= now) {
      blacklist.delete(jti);
    }
  }
};

const cleanupTimer = setInterval(purgeExpired, CLEANUP_INTERVAL_MS);
if (cleanupTimer.unref) {
  cleanupTimer.unref();
}
