import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { validateBody } from "../../middleware/validation.js";
import {
  registerSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendOtpSchema,
  loginSchema,
  googleAuthSchema,
} from "../../validations/auth.validation.js";

import {
  authRateLimiter,
  otpRateLimiter,
} from "../../middleware/rateLimiter.js";
import {
  exchangeOAuthCode,
  forgotPassword,
  getMe,
  googleLogin,
  googleOAuthCallback,
  initiateGoogleOAuth,
  login,
  logout,
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
router.get("/google", initiateGoogleOAuth);

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
router.post("/register", authRateLimiter, validateBody(registerSchema), register);
router.post("/verify-email", otpRateLimiter, authRateLimiter, validateBody(verifyEmailSchema), verifyEmail);
router.post("/forgot-password", authRateLimiter, validateBody(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", authRateLimiter, validateBody(resetPasswordSchema), resetPassword);
router.post("/resend-otp", authRateLimiter, validateBody(resendOtpSchema), resendOTP);
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
router.post("/login", authRateLimiter, validateBody(loginSchema), login);

// 🚪 Logout
router.post("/logout", protect, logout);

// 🔐 Google Login
router.post("/google", validateBody(googleAuthSchema), googleLogin);

// Exchange one-time auth code for JWT
router.post("/exchange-code", authRateLimiter, exchangeOAuthCode);

export default router;
