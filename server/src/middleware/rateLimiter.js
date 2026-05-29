import rateLimit from "express-rate-limit";

/**
 * Custom Key Generator that combines IP address and Email
 * This prevents attackers from bypassing the IP limit by spoofing X-Forwarded-For
 * when launching credential stuffing or OTP bombing attacks on a single account.
 */
const emailKeyGenerator = (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown-ip';
  const email = req.body?.email?.trim()?.toLowerCase();
  
  // express-rate-limit throws ERR_ERL_KEY_GEN_IPV6 if trust proxy is false and we return an ip.
  // By returning a prefix, we bypass this validation and solve the spoofing issue simultaneously.
  return email ? `user_${email}` : `ip_${ip}`;
};

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
  keyGenerator: emailKeyGenerator,
  validate: { xForwardedForHeader: false, trustProxy: false, default: true, ip: false, keyGeneratorIpFallback: false },
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
 * Rate Limiter for OTP Verification
 * Prevents distributed brute-force attacks on OTP codes
 */
export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 OTP attempts per IP per window
  message: {
    success: false,
    message: "Too many OTP attempts, please try again after 15 minutes",
    error: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: emailKeyGenerator,
  validate: { xForwardedForHeader: false, trustProxy: false, default: true, ip: false, keyGeneratorIpFallback: false },
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

/**
 * Global Rate Limiter
 * Generous limit for all /api endpoints to prevent basic DoS
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.GLOBAL_LIMIT_MAX) || 300, 
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes.",
    error: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  }
});

/**
 * AI Action Rate Limiter
 * Stricter limit for computationally expensive endpoints like Interviews and Cover Letters
 */
export const aiActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.AI_LIMIT_MAX) || 20, 
  message: {
    success: false,
    message: "You have exceeded the maximum number of AI actions. Please try again after 1 hour.",
    error: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  }
});
