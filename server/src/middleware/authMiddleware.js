import jwt from "jsonwebtoken";
import User from "../database/models/User.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { isTokenBlacklisted } from "../utils/tokenBlacklist.js";

/**
 * Middleware to protect routes - checks if user is logged in
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1) Check if token exists in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 2) Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Check if token has been revoked (logged out)
    if (decoded.jti && await isTokenBlacklisted(decoded.jti)) {
      return next(
        new AppError("Token has been revoked. Please log in again.", 401)
      );
    }

    // 4) Check if user still exists
    const currentUser = await User.findById(decoded.userId).select("-password").lean();
    if (!currentUser) {
      return next(
        new AppError("The user belonging to this token no longer exists.", 401)
      );
    }

    // 4) GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    next();
  } catch (error) {
    return next(new AppError("Invalid token. Please log in again.", 401));
  }
});

/**
 * Middleware to restrict access based on user roles
 * @param  {...string} roles - Allowed roles (e.g., 'student', 'recruiter')
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // roles is an array like ['recruiter', 'tutor']
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};

/**
 * Verify a JWT token and return the matching User document.
 * Used by Socket.io io.use() middleware to authenticate WebSocket connections.
 * @param {string} token - JWT string from the socket handshake
 * @returns {Promise<Object>} Authenticated user document (without password)
 * @throws {Error} If token is missing, invalid, or user no longer exists
 */
export const verifySocketToken = async (token) => {
  if (!token) {
    throw new Error("Missing auth token");
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new Error("Invalid auth token");
  }

  if (decoded.jti && await isTokenBlacklisted(decoded.jti)) {
    throw new Error("Token has been revoked");
  }

  const user = await User.findById(decoded.userId).select("-password").lean();
  if (!user) {
    throw new Error("User not found");
  }

  return user;
};
