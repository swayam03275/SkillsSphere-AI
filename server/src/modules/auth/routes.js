import express from "express";
import { getFrontendUrl } from "../../config/env.js";
import {
  buildGoogleAuthUrl,
  GOOGLE_OAUTH_NOT_CONFIGURED_MESSAGE,
  isGoogleOAuthConfigured,
} from "../../config/googleOAuth.js";
import { protect } from "../../middleware/authMiddleware.js";
import logger from "../../utils/logger.js";

import {
  authRateLimiter,
  otpRateLimiter,
} from "../../middleware/rateLimiter.js";
import {
  exchangeOAuthCode,
  DEFAULT_OAUTH_REDIRECT_PATH,
  forgotPassword,
  getMe,
  googleLogin,
  googleOAuthCallback,
  login,
  logout,
  normalizeOAuthRedirectPath,
  register,
  resendOTP,
  resetPassword,
  verifyEmail,
} from "./controller.js";

const router = express.Router();


/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 */
router.get("/me", protect, getMe);

// Initiate Google OAuth
router.get("/google", (req, res) => {
  const frontendOrigin = new URL(getFrontendUrl()).origin;
  const requestedRedirect = req.query.redirect;
  const role = req.query.role;
  const redirectPath =
    typeof requestedRedirect === "string" && requestedRedirect.length > 0
      ? normalizeOAuthRedirectPath(requestedRedirect)
      : DEFAULT_OAUTH_REDIRECT_PATH;
  const redirectTarget = `${frontendOrigin}${redirectPath}`;

  const stateObj = { redirect: redirectPath };
  if (role) {
    stateObj.role = role;
  }
  if (req.query.action) {
    stateObj.action = req.query.action;
  }

  const state = encodeURIComponent(
    Buffer.from(JSON.stringify(stateObj), "utf8").toString("base64"),
  );

  if (!isGoogleOAuthConfigured()) {
    logger.error("[AUTH] Google OAuth env vars are missing in server/.env");
    return res.redirect(
      `${redirectTarget}?error=${encodeURIComponent(GOOGLE_OAUTH_NOT_CONFIGURED_MESSAGE)}`,
    );
  }

  res.redirect(buildGoogleAuthUrl({ state }));
});

// Callback from Google
router.get("/google/callback", googleOAuthCallback);

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [student, recruiter, admin]
 *     responses:
 *       201:
 *         description: User registered
 */
router.post("/register", authRateLimiter, register);
router.post("/verify-email", otpRateLimiter, authRateLimiter, verifyEmail);
router.post("/forgot-password", authRateLimiter, forgotPassword);
router.post("/reset-password", authRateLimiter, resetPassword);
router.post("/resend-otp", authRateLimiter, resendOTP);
/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post("/login", authRateLimiter, login);

// 🚪 Logout
router.post("/logout", protect, logout);

// 🔐 Google Login
router.post("/google", googleLogin);

// Exchange one-time auth code for JWT
router.post("/exchange-code", authRateLimiter, exchangeOAuthCode);

export default router;
