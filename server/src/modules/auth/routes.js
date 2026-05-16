import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { authRateLimiter } from "../../middleware/rateLimiter.js";
import {
  buildGoogleAuthUrl,
  GOOGLE_OAUTH_NOT_CONFIGURED_MESSAGE,
  isGoogleOAuthConfigured,
} from "../../config/googleOAuth.js";
import {
  forgotPassword,
  getMe,
  googleLogin,
  googleOAuthCallback,
  login,
  logout,
  register,
  resendOTP,
  resetPassword,
  verifyEmail,
} from "./controller.js";

const router = express.Router();

// 👤 Get Current User
router.get("/me", protect, getMe);

// Initiate Google OAuth
router.get("/google", (req, res) => {
  const envFrontendOrigin = process.env.FRONTEND_URL || "http://localhost:5174";
  const refererHeader = req.get("referer");
  let inferredFrontendOrigin = envFrontendOrigin;

  if (refererHeader) {
    try {
      inferredFrontendOrigin = new URL(refererHeader).origin;
    } catch {
      inferredFrontendOrigin = envFrontendOrigin;
    }
  }

  const fallbackCallback = `${inferredFrontendOrigin}/auth/callback`;
  const requestedRedirect = req.query.redirect;
  const redirectTarget =
    typeof requestedRedirect === "string" && requestedRedirect.length > 0
      ? requestedRedirect
      : fallbackCallback;
  const state = encodeURIComponent(
    Buffer.from(redirectTarget, "utf8").toString("base64"),
  );

  if (!isGoogleOAuthConfigured()) {
    console.error("[AUTH] Google OAuth env vars are missing in server/.env");
    return res.redirect(
      `${redirectTarget}?error=${encodeURIComponent(GOOGLE_OAUTH_NOT_CONFIGURED_MESSAGE)}`,
    );
  }

  res.redirect(buildGoogleAuthUrl({ state }));
});

// Callback from Google
router.get("/google/callback", googleOAuthCallback);

// 📝 Register & Auth (Rate Limited)
router.post("/register", authRateLimiter, register);
router.post("/verify-email", authRateLimiter, verifyEmail);
router.post("/forgot-password", authRateLimiter, forgotPassword);
router.post("/reset-password", authRateLimiter, resetPassword);
router.post("/resend-otp", authRateLimiter, resendOTP);
router.post("/login", authRateLimiter, login);

// 🚪 Logout
router.post("/logout", logout);

// 🔐 Google Login
router.post("/google", googleLogin);

export default router;
