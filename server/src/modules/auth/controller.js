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
  buildGoogleAuthUrl,
} from "../../config/googleOAuth.js";
import { getFrontendUrl } from "../../config/env.js";
import logger from "../../utils/logger.js";

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
  if (typeof value !== "string" || value.length === 0 || value.length > 500 || value !== value.trim()) {
    return false;
  }

  if (/[\s\\\u0000-\u001F\u007F]/.test(value)) {
    return false;
  }

  const decoded = decodeRedirectPath(value);
  if (!decoded || decoded.length === 0 || decoded.length > 500 || decoded !== decoded.trim()) {
    return false;
  }

  if (/[\s\\\u0000-\u001F\u007F]/.test(decoded)) {
    return false;
  }

  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(decoded)) {
    return false;
  }

  if (!decoded.startsWith("/") || decoded.startsWith("//")) {
    return false;
  }

  if (/\/\.\.\//.test(decoded) || /\/\.\.$/.test(decoded)) {
    return false;
  }

  const pathPart = decoded.split("?")[0];
  const allowedPathRegex = /^\/(auth|dashboard|profile|jobs|classrooms|mock-interview|resume-analyzer|settings|tutors|recruiters|interviews)?(\/[a-zA-Z0-9_\-\.\/]+)?$/;
  if (!allowedPathRegex.test(pathPart)) {
    return false;
  }

  const queryPart = decoded.split("?")[1];
  if (queryPart) {
    const queryParams = new URLSearchParams(queryPart);
    for (const [key, val] of queryParams.entries()) {
      if (!/^[a-zA-Z0-9_\-]+$/.test(key) || !/^[a-zA-Z0-9_\-\.\s@%:\/\+]*$/.test(val)) {
        return false;
      }
    }
  }

  return true;
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

/**
 * Roles that are allowed to be embedded in OAuth state and assigned
 * to newly created Google users. Any role not in this set is silently
 * replaced with the safe default "student" before user creation.
 *
 * This prevents a forged or tampered state payload from escalating
 * privileges (e.g. role=admin) even if signature verification passes.
 */
const VALID_OAUTH_ROLES = new Set(["student", "recruiter", "tutor"]);

/**
 * Returns the HMAC signing secret for OAuth state tokens.
 * Uses the dedicated OAUTH_STATE_SECRET environment variable — never JWT_SECRET.
 *
 * Throws at call time (not silently) if the secret is missing, so that a
 * misconfigured server fails loudly instead of falling back to a known string.
 *
 * @throws {Error} If OAUTH_STATE_SECRET is not set in the environment
 * @returns {string} The signing secret
 */
const getOAuthStateSecret = () => {
  const secret = process.env.OAUTH_STATE_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error(
      "[AUTH] OAUTH_STATE_SECRET is not configured. " +
      "Set this environment variable to a strong random string before using Google OAuth.",
    );
  }
  return secret.trim();
};

/**
 * Sanitizes a role value decoded from OAuth state against the allowlist.
 * Returns the role unchanged if valid, or "student" as a safe default.
 *
 * @param {*} role - Raw role value from decoded state
 * @returns {string} A validated, safe role string
 */
const sanitizeOAuthRole = (role) => {
  if (typeof role === "string" && VALID_OAUTH_ROLES.has(role.trim().toLowerCase())) {
    return role.trim().toLowerCase();
  }
  return "student";
};

export const signOAuthState = (stateObj) => {
  // Throws immediately if OAUTH_STATE_SECRET is missing — no silent fallback.
  const secret = getOAuthStateSecret();

  const payload = {
    ...stateObj,
    // role must pass the allowlist — sanitize before embedding in the signed payload
    // so that even if someone manages to call signOAuthState with a bad role,
    // the embedded value is already safe.
    role: sanitizeOAuthRole(stateObj.role),
    nonce: crypto.randomBytes(16).toString("hex"),
    iat: Math.floor(Date.now() / 1000), // issued-at timestamp for replay detection
  };

  const signString = `${payload.redirect || ""}:${payload.role}:${payload.nonce}:${payload.iat}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signString)
    .digest("hex");

  payload.sig = signature;
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
};

export const verifyAndDecodeOAuthState = (stateStr) => {
  if (!stateStr) return null;

  // Throws immediately if OAUTH_STATE_SECRET is missing — no silent fallback.
  let secret;
  try {
    secret = getOAuthStateSecret();
  } catch (err) {
    logger.error(err.message);
    return null;
  }

  let decodedStr = null;
  try {
    const rawState = stateStr.includes("%") ? decodeURIComponent(stateStr) : stateStr;
    decodedStr = Buffer.from(rawState, "base64").toString("utf8");
  } catch {
    decodedStr = null;
  }

  // If base64 decode failed, check if the raw value is a safe redirect path (legacy support).
  if (!decodedStr) {
    if (isSafeRedirectPath(stateStr)) {
      return { redirect: stateStr, role: "student" };
    }
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(decodedStr);
  } catch {
    // JSON parse failed — check if it's a plain redirect path (legacy support).
    if (isSafeRedirectPath(decodedStr)) {
      return { redirect: decodedStr, role: "student" };
    }
    return null;
  }

  if (!payload || typeof payload !== "object") return null;

  // Signed state: verify HMAC signature.
  if (payload.sig && payload.nonce) {
    const signString = `${payload.redirect || ""}:${payload.role || ""}:${payload.nonce}:${payload.iat || ""}`;;
    const computedSignature = crypto
      .createHmac("sha256", secret)
      .update(signString)
      .digest("hex");

    // Use timing-safe comparison to prevent timing oracle attacks.
    const expectedBuf = Buffer.from(computedSignature, "hex");
    const actualBuf   = Buffer.from(payload.sig,        "hex");
    const signaturesMatch =
      expectedBuf.length === actualBuf.length &&
      crypto.timingSafeEqual(expectedBuf, actualBuf);

    if (!signaturesMatch) {
      logger.error("[AUTH] Google OAuth state signature verification failed — possible CSRF or tamper attempt");
      return null;
    }

    // Enforce state freshness — reject states older than 10 minutes to limit replay window.
    const STATE_MAX_AGE_SECONDS = 10 * 60;
    if (payload.iat && Math.floor(Date.now() / 1000) - payload.iat > STATE_MAX_AGE_SECONDS) {
      logger.error("[AUTH] Google OAuth state is expired (older than 10 minutes) — possible replay attack");
      return null;
    }

    return {
      redirect: payload.redirect,
      // Always sanitize role through allowlist — even on a valid signed payload —
      // in case an older signed state embeds a role that is no longer valid.
      role: sanitizeOAuthRole(payload.role),
      action: payload.action,
      nonce: payload.nonce,
    };
  }

  // Legacy unsigned JSON state (no sig/nonce) — accept redirect only, force default role.
  if (isSafeRedirectPath(payload.redirect)) {
    return { redirect: payload.redirect, role: "student" };
  }

  // Final fallback: treat raw state string as a plain redirect path.
  if (isSafeRedirectPath(stateStr)) {
    return { redirect: stateStr, role: "student" };
  }

  return null;
};

export const initiateGoogleOAuth = (req, res) => {
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

  const state = encodeURIComponent(signOAuthState(stateObj));

  if (!isGoogleOAuthConfigured()) {
    logger.error("[AUTH] Google OAuth env vars are missing in server/.env");
    return res.redirect(
      `${redirectTarget}?error=${encodeURIComponent(GOOGLE_OAUTH_NOT_CONFIGURED_MESSAGE)}`,
    );
  }

  res.redirect(buildGoogleAuthUrl({ state }));
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
      const stateObj = verifyAndDecodeOAuthState(state);

      // Guard: verifyAndDecodeOAuthState returns null on invalid/tampered state.
      // Do not crash by accessing properties of null — fall back to defaults.
      if (stateObj) {
        // Role is already sanitized through VALID_OAUTH_ROLES inside verifyAndDecodeOAuthState.
        requestedRole = sanitizeOAuthRole(stateObj.role);

        if (stateObj.action) {
          requestedAction = stateObj.action;
        }

        const redirectPath = normalizeOAuthRedirectPath(stateObj.redirect);
        callbackUrl = `${frontendRedirectOrigin}${redirectPath}`;
      } else {
        logger.warn("[AUTH] OAuth state verification returned null — using fallback callback URL");
        callbackUrl = fallbackCallbackUrl;
      }
    } catch (err) {
      logger.error("[AUTH] Unexpected error decoding OAuth state:", err.message);
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
