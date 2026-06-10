import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../../database/models/User.js";
import { OAuth2Client } from "google-auth-library";
import { sendOTP } from "../../utils/emailService.js";
import AppError from "../../utils/AppError.js";
import { consumeAuthCode } from "../../utils/authCodeStore.js";
import logger from "../../utils/logger.js";

import {
  isLocalPasswordAccount,
  LOCAL_EMAIL_REGISTERED_MESSAGE,
} from "./googleAuthPolicy.js";

export { LOCAL_EMAIL_REGISTERED_MESSAGE, isLocalPasswordAccount };

const SALT_ROUNDS = 12;
const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;

// Google OAuth client (initialized lazily to avoid crash on import)
let googleClient;
const getGoogleClient = () => {
  if (!googleClient) {
    googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return googleClient;
};

// 🔐 JWT generator
const buildAuthToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new AppError("Missing JWT_SECRET in environment variables", 500);
  }

  return jwt.sign(
    { userId: user._id.toString(), role: user.role, jti: crypto.randomUUID() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

// 🔢 Generate OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// 📝 Register user
export const registerUserAndIssueToken = async ({ name, email, password, role }) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new AppError("User already exists with this email", 409);
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const emailMode = process.env.EMAIL_SERVICE_MODE || "console";
  const skipVerification = emailMode !== "smtp";

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const hashedOtp = await bcrypt.hash(otp, SALT_ROUNDS);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    verificationToken: skipVerification ? undefined : hashedOtp,
    verificationTokenExpires: skipVerification ? undefined : otpExpiry,
    isVerified: skipVerification,
  });

  // In SMTP mode, send real OTP email; in console mode, auto-verify the user
  if (!skipVerification) {
    try {
      await sendOTP(email, otp, "verification");
    } catch (error) {
      throw new AppError("Failed to send verification email. Please try again.", 500);
    }
  } else {
    logger.info(`[AUTH] User ${email} auto-verified (EMAIL_SERVICE_MODE=${emailMode})`);
  }

  const token = buildAuthToken(user);

  return {
    token,
    user: {
      id: user._id.toString(),
      name: user.get('name'),
      email: user.get('email'),
      isVerified: skipVerification,
      isOnboarded: user.isOnboarded,
      profilePic: user.profilePic,
    },
  };
};

// 📧 Verify email
export const verifyUserEmail = async (email, otp) => {
  const user = await User.findOne({ email });

  if (!user) {
  throw new AppError("No account found with this email", 404);
}
if (user.isVerified) {
  throw new AppError("Email is already verified. Please log in.", 400);
}
  if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
    throw new AppError("Too many attempts. Please request a new OTP.", 429);
  }

  const isMatch = await bcrypt.compare(otp, user.verificationToken);
  const isExpired = user.verificationTokenExpires < Date.now();

  if (isExpired) {
    // Clear the expired token so it does not accumulate in the database.
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    user.otpAttempts = 0;
    await user.save();
    throw new AppError("OTP expired. Please request a new one.", 400);
  }

  if (!isMatch) {
    user.otpAttempts += 1;
    await user.save();
    throw new AppError("Invalid OTP", 400);
  }

  user.isVerified = true;
  user.verificationToken = null;
  user.verificationTokenExpires = null;
  user.otpAttempts = 0;
  await user.save();

  return { user };
};

// 🔑 Forgot password
export const forgotPasswordRequest = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    return { success: true, message: "If an account exists with this email, a reset code has been sent." };
  }

  if (user.resetPasswordExpires && user.resetPasswordExpires.getTime() > Date.now() + (OTP_EXPIRY_MINUTES - 1) * 60 * 1000) {
    throw new AppError("Please wait a minute before requesting another reset code", 429);
  }

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const hashedOtp = await bcrypt.hash(otp, SALT_ROUNDS);

  user.resetPasswordToken = hashedOtp;
  user.resetPasswordExpires = otpExpiry;
  user.otpAttempts = 0;
  await user.save();

  try {
    await sendOTP(email, otp, "reset");
  } catch (error) {
    throw new AppError("Failed to send reset code. Please try again.", 500);
  }

  return { success: true, message: "If an account exists with this email, a reset code has been sent." };
};

// 🔄 Reset password
export const resetUserPassword = async (email, otp, newPassword) => {
  const user = await User.findOne({ email });

  if (!user || !user.resetPasswordToken) {
    throw new AppError("Invalid request", 400);
  }

  if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
    throw new AppError("Too many attempts. Please request a new code.", 429);
  }

  const isMatch = await bcrypt.compare(otp, user.resetPasswordToken);
  const isExpired = user.resetPasswordExpires < Date.now();

  if (isExpired) {
    // Clear the expired token so it does not accumulate in the database.
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.otpAttempts = 0;
    await user.save();
    throw new AppError("Code expired. Please request a new password reset.", 400);
  }

  if (!isMatch) {
    user.otpAttempts += 1;
    await user.save();
    throw new AppError("Invalid code", 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

  user.password = hashedPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.otpAttempts = 0;
  user.passwordChangedAt = new Date();
  await user.save();

  return { success: true, message: "Password reset successfully" };
};

// 🔁 Resend OTP
export const resendUserOTP = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    return { success: true, message: "If an account exists with this email, a verification code has been sent." };
  }

  if (user.isVerified) {
    throw new AppError("User is already verified", 400);
  }

  if (user.verificationTokenExpires && user.verificationTokenExpires.getTime() > Date.now() + (OTP_EXPIRY_MINUTES - 1) * 60 * 1000) {
    throw new AppError("Please wait a minute before requesting another verification code", 429);
  }

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const hashedOtp = await bcrypt.hash(otp, SALT_ROUNDS);

  user.verificationToken = hashedOtp;
  user.verificationTokenExpires = otpExpiry;
  user.otpAttempts = 0;
  await user.save();

  try {
    await sendOTP(email, otp, "verification");
  } catch (error) {
    throw new AppError("Failed to resend verification code. Please try again.", 500);
  }

  return { success: true, message: "If an account exists with this email, a verification code has been sent." };
};

export const loginUser = async (email, password) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  if (isLocalPasswordAccount(user) && !user.password) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!isLocalPasswordAccount(user)) {
    throw new AppError(
      "This account uses Google Sign-In. Please use Continue with Google.",
      400,
    );
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    throw new AppError("Invalid email or password", 401);
  }

  // In console email mode, skip verification check for development convenience
  const emailMode = process.env.EMAIL_SERVICE_MODE || "console";
  if (!user.isVerified && emailMode === "smtp") {
    throw new AppError("Please verify your email before logging in", 403);
  }

  const token = buildAuthToken(user);

  return {
    token,
    user: {
      id: user._id.toString(),
      name: user.get('name'),
      email: user.get('email'),
      role: user.role,
      isOnboarded: user.isOnboarded,
      profilePic: user.profilePic,
    }
  };
};

export const findOrCreateGoogleUser = async ({ email, name, picture, role = "student", action = "signup" }) => {
  const existing = await User.findOne({ email });

  if (existing) {
    if (isLocalPasswordAccount(existing)) {
      throw new AppError(LOCAL_EMAIL_REGISTERED_MESSAGE, 409);
    }
    return existing;
  }

  if (action === "login") {
    throw new AppError("No account found with this Google email. Please sign up first.", 404);
  }

  return User.create({
    name,
    email,
    profilePic: picture,
    role,
    provider: "google",
    isVerified: true,
  });
};

// Exchange a one-time auth code for a JWT
export const exchangeAuthCodeForToken = async (code) => {
  const userId = await consumeAuthCode(code);
  if (!userId) return null;

  const user = await User.findById(userId);
  if (!user) return null;

  const token = buildAuthToken(user);

  return {
    token,
    user: {
      id: user._id.toString(),
      name: user.get('name'),
      email: user.get('email'),
      role: user.role,
      isOnboarded: user.isOnboarded,
      profilePic: user.profilePic,
    },
  };
};

// 🔐 Google Token Verification
export const verifyGoogleToken = async (token) => {
  try {
    const client = getGoogleClient();
    const ticket = await client.verifyIdToken({
      id_token: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  } catch (error) {
    throw new AppError("Invalid Google token", 401);
  }
};
