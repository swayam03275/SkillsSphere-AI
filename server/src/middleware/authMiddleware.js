import jwt from "jsonwebtoken";
import User from "../database/models/User.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { isTokenBlacklisted } from "../utils/tokenBlacklist.js";
import redisClient from "../config/redis.js";

export const invalidateUserCache = async (userId) => {
  if (redisClient && redisClient.isReady) {
    try {
      await redisClient.del(`user_cache:${userId}`);
    } catch (err) {}
  }
};

const getCachedUser = async (userId) => {
  const cacheKey = `user_cache:${userId}`;
  let currentUser = null;

  if (redisClient && redisClient.isReady) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        currentUser = JSON.parse(cached);
        if (currentUser.passwordChangedAt) {
          currentUser.passwordChangedAt = new Date(currentUser.passwordChangedAt);
        }
      }
    } catch (err) {}
  }

  if (!currentUser) {
    currentUser = await User.findById(userId).select("-password");
    if (currentUser && redisClient && redisClient.isReady) {
      try {
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(currentUser));
      } catch (err) {}
    }
  }

  return currentUser;
};

/**
 * Middleware to protect routes - checks if user is logged in
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;
  const authorizationHeader = req.headers.authorization;

  // 1) Check if token exists in headers
  const bearerMatch = authorizationHeader?.match(/^Bearer\s+([^\s]+)$/);
  if (bearerMatch) {
    token = bearerMatch[1];
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
    const currentUser = await getCachedUser(decoded.userId);
    if (!currentUser) {
      return next(
        new AppError("The user belonging to this token no longer exists.", 401)
      );
    }

    // 5) Check if user changed password after the token was issued
    if (currentUser.passwordChangedAt && decoded.iat) {
      const changedTimestamp = parseInt(currentUser.passwordChangedAt.getTime() / 1000, 10);
      if (decoded.iat < changedTimestamp) {
        return next(
          new AppError("User recently changed password! Please log in again.", 401)
        );
      }
    }

    // 6) GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new AppError("Your session has expired. Please log in again.", 401));
    }
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
 * Middleware to require full access level for verified recruiter/tutor accounts.
 * Returns 403 if the user's accessLevel is not "full".
 */
export const requireFullAccess = (req, res, next) => {
  if (req.user.accessLevel === "full") return next();
  return res.status(403).json({
    success: false,
    message:
      "Please complete your profile (LinkedIn + supporting document) to access this feature. Your account is pending verification.",
  });
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

  const user = await getCachedUser(decoded.userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (user.passwordChangedAt && decoded.iat) {
    const changedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
    if (decoded.iat < changedTimestamp) {
      throw new Error("User recently changed password");
    }
  }

  return user;
};
