import rateLimit from "express-rate-limit";

/**
 * Custom Rate Limiter for Authentication routes
 * Prevents brute-force attacks and OTP/Email bombing
 */
export const authRateLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_LIMIT_WINDOW) || 15 * 60 * 1000, // Default 15 minutes
  max: parseInt(process.env.AUTH_LIMIT_MAX) || 5, // Default 5 attempts per window
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again after 15 minutes.",
    error: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  }
});

/**
 * Rate Limiter for Job Creation
 * Prevents spamming of the job database by malicious or compromised accounts
 */
export const jobCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: parseInt(process.env.JOB_CREATION_LIMIT_MAX) || 15, // Default 15 jobs per hour
  message: {
    success: false,
    message: "You have reached the maximum number of job postings allowed per hour. Please try again later.",
    error: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  }
});

/**
 * Rate Limiter for Resume Uploads and Analysis
 * Prevents API quota abuse and CPU starvation from excessive file processing
 */
export const resumeAnalysisLimiter = rateLimit({
  windowMs: parseInt(process.env.RESUME_LIMIT_WINDOW) || 60 * 60 * 1000, // Default 1 hour
  max: parseInt(process.env.RESUME_LIMIT_MAX) || 10, // Default 10 resume analyses per window
  message: {
    success: false,
    message: "Too many resume analysis attempts. Please try again later.",
    error: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  }
});
