import {
  validateRegisterInput,
  validateVerifyEmailInput,
  validateForgotPasswordInput,
  validateResetPasswordInput,
  validateResendOTPInput,
  validateLoginInput
} from "../../validations/authValidation.js";

import {
  registerUserAndIssueToken,
  verifyUserEmail,
  forgotPasswordRequest,
  resetUserPassword,
  resendUserOTP,
  verifyGoogleToken,
  loginUser
} from "./service.js";

import asyncHandler from "../../utils/asyncHandler.js";
import AppError from "../../utils/AppError.js";
import User from "../../database/models/User.js";
import jwt from "jsonwebtoken";


// 📝 Register User
export const register = asyncHandler(async (req, res, next) => {
  const validation = validateRegisterInput(req.body);

  if (!validation.isValid) {
    return next(new AppError("Invalid registration payload", 400));
  }

  const authResult = await registerUserAndIssueToken(validation.data);

  return res.status(201).json({
    success: true,
    message: "User registered successfully. Please check your email for verification code.",
    token: authResult.token,
    user: authResult.user
  });
});


// 📧 Verify Email
export const verifyEmail = asyncHandler(async (req, res, next) => {
  const validation = validateVerifyEmailInput(req.body);

  if (!validation.isValid) {
    return next(new AppError("Invalid verification data", 400));
  }

  const result = await verifyUserEmail(validation.data.email, validation.data.otp);
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
    validation.data.newPassword
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


// 🔑 Login User
export const login = asyncHandler(async (req, res, next) => {
  const validation = validateLoginInput(req.body);

  if (!validation.isValid) {
    return next(new AppError("Invalid email or password format", 400));
  }

  const result = await loginUser(validation.data.email, validation.data.password);

  return res.status(200).json({
    success: true,
    message: "Login successful",
    token: result.token,
    user: result.user,
  });
});


// 🔐 Google Login (YOUR FEATURE)
export const googleLogin = asyncHandler(async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return next(new AppError("Google token is required", 400));
  }

  // ✅ Verify Google token
  const googleUser = await verifyGoogleToken(token);

  // 🔍 Check if user exists
  let user = await User.findOne({ email: googleUser.email });

  // 🟢 Create new user if not exists
  if (!user) {
    user = await User.create({
      name: googleUser.name,
      email: googleUser.email,
      profilePic: googleUser.picture,
      role: "student",
      provider: "google",
    });
  }

  // 🔐 Generate JWT
  const jwtToken = jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
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