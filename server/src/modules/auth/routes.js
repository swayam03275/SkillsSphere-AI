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

/**
 * @openapi
 * /api/auth/google:
 *   get:
 *     summary: Initiate Google OAuth
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirects to Google
 */
router.get("/google", initiateGoogleOAuth);

/**
 * @openapi
 * /api/auth/google/callback:
 *   get:
 *     summary: Callback from Google OAuth
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirects to frontend with tokens
 */
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
/**
 * @openapi
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify user email using OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 */
router.post("/verify-email", otpRateLimiter, authRateLimiter, validateBody(verifyEmailSchema), verifyEmail);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset email sent
 */
router.post("/forgot-password", authRateLimiter, validateBody(forgotPasswordSchema), forgotPassword);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
router.post("/reset-password", authRateLimiter, validateBody(resetPasswordSchema), resetPassword);

/**
 * @openapi
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP resent
 */
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

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User logged out
 */
router.post("/logout", protect, logout);

/**
 * @openapi
 * /api/auth/google:
 *   post:
 *     summary: Google login via token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post("/google", validateBody(googleAuthSchema), googleLogin);

/**
 * @openapi
 * /api/auth/exchange-code:
 *   post:
 *     summary: Exchange one-time code for JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token exchange successful
 */
router.post("/exchange-code", authRateLimiter, exchangeOAuthCode);

export default router;
