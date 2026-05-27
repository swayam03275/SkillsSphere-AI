import {
  validateForgotPasswordInput,
  validateLoginInput,
  validateRegisterInput,
  validateResendOTPInput,
  validateResetPasswordInput,
  validateVerifyEmailInput,
} from "../../validations/authValidation.js";

import {
  forgotPasswordRequest,
  loginUser,
  registerUserAndIssueToken,
  resendUserOTP,
  resetUserPassword,
  verifyGoogleToken,
  verifyUserEmail,
  findOrCreateGoogleUser,
  LOCAL_EMAIL_REGISTERED_MESSAGE,
} from "./service.js";

import jwt from "jsonwebtoken";
import crypto from "crypto";
import AppError from "../../utils/AppError.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { blacklistToken } from "../../utils/tokenBlacklist.js";
import { generateAuthCode } from "../../utils/authCodeStore.js";
import {
  getGoogleOAuthConfig,
  GOOGLE_OAUTH_NOT_CONFIGURED_MESSAGE,
  isGoogleOAuthConfigured,
} from "../../config/googleOAuth.js";

// 📝 Register User
export const register = asyncHandler(async (req, res, next) => {
  const validation = validateRegisterInput(req.body);

  if (!validation.isValid) {
    return next(new AppError("Invalid registration payload", 400));
  }

  const authResult = await registerUserAndIssueToken(validation.data);

  return res.status(201).json({
    success: true,
    message:
      "User registered successfully. Please check your email for verification code.",
    token: authResult.token,
    user: authResult.user,
  });
});

// 📧 Verify Email
export const verifyEmail = asyncHandler(async (req, res, next) => {
  const validation = validateVerifyEmailInput(req.body);

  if (!validation.isValid) {
    return next(new AppError("Invalid verification data", 400));
  }

  const result = await verifyUserEmail(
    validation.data.email,
    validation.data.otp,
  );
  return res.status(200).json(result);
});

// 🔑 Forgot Password
export const forgotPassword = asyncHandler(async (req, res, next) => {
  const validation = validateForgotPasswordInput(req.body);

  if (!validation.isValid) {
    return next(new AppError("Invalid email address", 400));
  }

  const result = await forgotPasswordRequest(validation.data.email);
  return res.status(200).json(result);
});

// 🔄 Reset Password
export const resetPassword = asyncHandler(async (req, res, next) => {
  const validation = validateResetPasswordInput(req.body);

  if (!validation.isValid) {
    return next(new AppError("Invalid reset data", 400));
  }

  const result = await resetUserPassword(
    validation.data.email,
    validation.data.otp,
    validation.data.newPassword,
  );

  return res.status(200).json(result);
});

// 🔁 Resend OTP
export const resendOTP = asyncHandler(async (req, res, next) => {
  const validation = validateResendOTPInput(req.body);

  if (!validation.isValid) {
    return next(new AppError("Invalid email address", 400));
  }

  const result = await resendUserOTP(validation.data.email);
  return res.status(200).json(result);
});

export const login = asyncHandler(async (req, res, next) => {
  const validation = validateLoginInput(req.body);

  if (!validation.isValid) {
    return next(new AppError("Invalid login payload", 400));
  }

  const result = await loginUser(
    validation.data.email,
    validation.data.password,
  );

  return res.status(200).json({
    success: true,
    message: "Login successful",
    ...result,
  });
});

// 🔐 Google Login
export const googleLogin = asyncHandler(async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return next(new AppError("Google token is required", 400));
  }

  const googleUser = await verifyGoogleToken(token);
  const user = await findOrCreateGoogleUser(googleUser);

  // 🔐 Generate JWT
  const jwtToken = jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      jti: crypto.randomUUID(),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
  );

  return res.status(200).json({
    success: true,
    message: "Google login successful",
    token: jwtToken,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// Google OAuth callback (redirect flow)
export const googleOAuthCallback = asyncHandler(async (req, res, next) => {
  const { code, state } = req.query;
  const frontendRedirectBase =
    process.env.FRONTEND_URL || "http://localhost:5174";
  const fallbackCallbackUrl = `${frontendRedirectBase}/auth/callback`;
  let callbackUrl = fallbackCallbackUrl;

  if (typeof state === "string" && state.length > 0) {
    try {
      const decoded = Buffer.from(decodeURIComponent(state), "base64").toString(
        "utf8",
      );
      const decodedUrl = new URL(decoded);
      const fallbackOrigin = new URL(frontendRedirectBase).origin;
      const isAllowedLocalhost =
        decodedUrl.hostname === "localhost" ||
        decodedUrl.hostname === "127.0.0.1";

      if (decodedUrl.origin === fallbackOrigin || isAllowedLocalhost) {
        callbackUrl = decodedUrl.toString();
      }
    } catch {
      callbackUrl = fallbackCallbackUrl;
    }
  }

  if (!code) {
    return res.redirect(
      `${callbackUrl}?error=${encodeURIComponent("No code received")}`,
    );
  }

  if (!isGoogleOAuthConfigured()) {
    return res.redirect(
      `${callbackUrl}?error=${encodeURIComponent(GOOGLE_OAUTH_NOT_CONFIGURED_MESSAGE)}`,
    );
  }

  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();

  // Exchange code for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return res.redirect(
      `${callbackUrl}?error=${encodeURIComponent("Failed to get access token")}`,
    );
  }

  // Get user info from Google
  const userRes = await fetch(
    `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${accessToken}`,
  );
  const googleUser = await userRes.json();

  let user;
  try {
    user = await findOrCreateGoogleUser(googleUser);
  } catch (error) {
    const message =
      error instanceof AppError
        ? error.message
        : LOCAL_EMAIL_REGISTERED_MESSAGE;
    return res.redirect(
      `${callbackUrl}?error=${encodeURIComponent(message)}`,
    );
  }

  const authCode = await generateAuthCode(user._id.toString());
  res.redirect(`${callbackUrl}?code=${authCode}`);
});

// 👤 Get Current User
export const getMe = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

// 🚪 Logout
export const logout = asyncHandler(async (req, res, next) => {
  // Extract token from Authorization header and blacklist its JTI
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.jti && decoded.exp) {
        blacklistToken(decoded.jti, decoded.exp);
      }
    } catch {
      // Token decode failure is non-fatal for logout
    }
  }

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});
