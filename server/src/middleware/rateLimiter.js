import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redisClient from "../config/redis.js";

/**
 * Creates a RedisStore for express-rate-limit when the Redis client is ready,
 * or returns undefined to fall back to the in-memory store (e.g. in development
 * when Redis is unavailable). This keeps all rate limit counters shared across
 * multiple Node.js instances in a horizontally-scaled deployment.
 */
const createRedisStore = (prefix) => {
  try {
    if (!redisClient || !redisClient.isOpen) return undefined;
    return new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
      prefix: `rl:${prefix}:`,
    });
  } catch {
    return undefined;
  }
};

const unifiedKeyGenerator = (req) => {
  if (req.user?._id) {
    return `user_${req.user._id.toString()}`;
  }
  const email = req.body?.email?.trim()?.toLowerCase();
  if (email) {
    return `email_${email}`;
  }
  const ip = req.ip || req.connection?.remoteAddress || 'unknown-ip';
  return `ip_${ip}`;
};

const commonValidateConfig = {
  xForwardedForHeader: false,
  trustProxy: false,
  default: true,
  ip: false,
  keyGeneratorIpFallback: false
};

const getRole = (req) => {
  return req.user?.role || req.user?.get?.("role") || null;
};

export const authRateLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_LIMIT_WINDOW) || 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_LIMIT_MAX) || 10,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again after 15 minutes.",
    error: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore("auth"),
  keyGenerator: unifiedKeyGenerator,
  validate: commonValidateConfig,
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  }
});

export const jobCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: (req) => {
    const role = getRole(req);
    if (role === "admin") return 100;
    if (role === "recruiter") return parseInt(process.env.JOB_CREATION_LIMIT_MAX) || 30;
    return 2;
  },
  message: {
    success: false,
    message: "You have reached the maximum number of job postings allowed per hour. Please try again later.",
    error: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore("job_creation"),
  keyGenerator: unifiedKeyGenerator,
  validate: commonValidateConfig,
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  }
});

export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many OTP attempts, please try again after 15 minutes",
    error: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore("otp"),
  keyGenerator: unifiedKeyGenerator,
  validate: commonValidateConfig,
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  }
});

export const resumeAnalysisLimiter = rateLimit({
  windowMs: parseInt(process.env.RESUME_LIMIT_WINDOW) || 60 * 60 * 1000,
  max: (req) => {
    const role = getRole(req);
    if (role === "admin") return 100;
    if (role === "recruiter") return 50;
    if (role === "student") return parseInt(process.env.RESUME_LIMIT_MAX) || 10;
    return 5;
  },
  message: {
    success: false,
    message: "Too many resume analysis attempts. Please try again later.",
    error: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore("resume_analysis"),
  keyGenerator: unifiedKeyGenerator,
  validate: commonValidateConfig,
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  }
});

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req) => {
    const role = getRole(req);
    if (role === "admin") return 5000;
    if (role === "recruiter") return 1000;
    if (role === "tutor") return 800;
    if (role === "student") return 400;
    return parseInt(process.env.GLOBAL_LIMIT_MAX) || 150;
  },
  message: {
    success: false,
    message: "Too many requests, please try again after 15 minutes.",
    error: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore("global"),
  keyGenerator: unifiedKeyGenerator,
  validate: commonValidateConfig,
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  }
});

export const aiActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: (req) => {
    const role = getRole(req);
    if (role === "admin") return 200;
    if (role === "recruiter") return 60;
    if (role === "tutor") return 60;
    if (role === "student") return parseInt(process.env.AI_LIMIT_MAX) || 20;
    return 5;
  },
  message: {
    success: false,
    message: "You have exceeded the maximum number of AI actions. Please try again after 1 hour.",
    error: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore("ai_action"),
  keyGenerator: unifiedKeyGenerator,
  validate: commonValidateConfig,
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  }
});
