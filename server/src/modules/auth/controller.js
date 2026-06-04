import {
  validateForgotPasswordInput,
  validateLoginInput,
  validateRegisterInput,
  validateResendOTPInput,
  validateResetPasswordInput,
  validateVerifyEmailInput,
} from "../../validations/authValidation.js";

import {
  exchangeAuthCodeForToken,
  forgotPasswordRequest,
  loginUser,
  registerUserAndIssueToken,
  resendUserOTP,
  resetUserPassword,
  verifyUserEmail,
  verifyGoogleToken,
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

export const DEFAULT_OAUTH_REDIRECT_PATH = "/auth/callback";

const decodeRedirectPath = (value) => {
  let decoded = value;

  // Decode repeatedly until the string stabilises (i.e. no more encoded
  // characters remain). A fixed-iteration loop (e.g. 2 rounds) would leave
  // triple-encoded payloads like %25252e%25252e%25252f partially decoded,
  // allowing them to bypass the safety checks below.
  while (true) {
    let next;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      return null;
    }
    if (next === decoded) break;
    decoded = next;
  }

  return decoded;
};

export const isSafeRedirectPath = (value) => {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) {
    return false;
  }

  if (/[\s\\\u0000-\u001F\u007F]/.test(value)) {
    return false;
  }

  const decoded = decodeRedirectPath(value);
  if (!decoded || decoded.length === 0 || decoded !== decoded.trim()) {
    return false;
  }

  if (/[\s\\\u0000-\u001F\u007F]/.test(decoded)) {
    return false;
  }

  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(decoded)) {
    return false;
  }

  return decoded.startsWith("/") && !decoded.startsWith("//");
};

export const normalizeOAuthRedirectPath = (
  value,
  fallbackPath = DEFAULT_OAUTH_REDIRECT_PATH,
) => {
  if (!isSafeRedirectPath(value)) {
    return fallbackPath;
  }

  return decodeRedirectPath(value);
};

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

  const { user } = await verifyUserEmail(
    validation.data.email,
    validation.data.otp,
  );

  const token = jwt.sign(
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
    message: "Email verified successfully",
    token,
    user: {
      id: user._id.toString(),
      name: user.get("name"),
      email: user.get("email"),
      role: user.role,
      isOnboarded: user.isOnboarded,
      profilePic: user.profilePic,
    },
  });
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
      name: user.get('name'),
      email: user.get('email'),
      role: user.role,
      isOnboarded: user.isOnboarded,
      profilePic: user.profilePic,
    },
  });
});

// Google OAuth callback (redirect flow)
export const googleOAuthCallback = asyncHandler(async (req, res, next) => {
  const { code, state } = req.query;
  const frontendRedirectBase =
    process.env.FRONTEND_URL || "http://localhost:5174";
  const frontendRedirectOrigin = new URL(frontendRedirectBase).origin;
  const fallbackCallbackUrl = `${frontendRedirectOrigin}${DEFAULT_OAUTH_REDIRECT_PATH}`;
  let callbackUrl = fallbackCallbackUrl;
  let requestedRole = "student";
  let requestedAction = "signup"; // Default to signup

  if (typeof state === "string" && state.length > 0) {
    try {
      const decoded = Buffer.from(decodeURIComponent(state), "base64").toString(
        "utf8",
      );
      
      let stateObj;
      try {
        stateObj = JSON.parse(decoded);
      } catch {
        // Fallback for legacy state which was just a raw URL string
        stateObj = { redirect: decoded };
      }

      if (stateObj.role) {
        requestedRole = stateObj.role;
      }
      
      if (stateObj.action) {
        requestedAction = stateObj.action;
      }

      const redirectPath = normalizeOAuthRedirectPath(stateObj.redirect);
      callbackUrl = `${frontendRedirectOrigin}${redirectPath}`;
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
    user = await findOrCreateGoogleUser({ 
      ...googleUser, 
      role: requestedRole,
      action: requestedAction 
    });
  } catch (error) {
    const message =
      error instanceof AppError
        ? error.message
        : LOCAL_EMAIL_REGISTERED_MESSAGE;
    return res.redirect(
      `${callbackUrl}?error=${encodeURIComponent(message)}`,
    );
  }

  // Generate a short-lived one-time auth code (never expose JWT in URL)
  const authCode = await generateAuthCode(user._id.toString());

  res.redirect(`${callbackUrl}?code=${authCode}`);
});

// Exchange one-time auth code for JWT (never expose token in URL)
export const exchangeOAuthCode = asyncHandler(async (req, res, next) => {
  const { code } = req.body;
  if (!code) {
    return next(new AppError("Authorization code is required", 400));
  }

  const result = await exchangeAuthCodeForToken(code);
  if (!result) {
    return next(new AppError("Invalid or expired authorization code", 401));
  }

  return res.status(200).json({
    success: true,
    token: result.token,
    user: result.user,
  });
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
