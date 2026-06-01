import jwt from "jsonwebtoken";
import User from "../database/models/User.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { verifySignedFileUrl } from "../utils/signedFileUrl.js";
import { isTokenBlacklisted } from "../utils/tokenBlacklist.js";

const PROTECTED_PATH_RE = /^\/api\/files\/(avatars|resumes)\/[^/]+$/;

/**
 * Auth for file downloads. Accepts JWT via Authorization header or a signed URL
 * so <img src="..."> can load protected avatars without custom fetch logic.
 */
export const protectFileAccess = asyncHandler(async (req, res, next) => {
  const requestPath = `${req.baseUrl}${req.path}`;
  const { exp, sig, uid } = req.query;

  if (exp && sig) {
    if (!PROTECTED_PATH_RE.test(requestPath)) {
      return next(new AppError("Invalid file path.", 400));
    }

    const isValid = verifySignedFileUrl(requestPath, exp, sig, uid);
    if (!isValid) {
      return next(new AppError("Signed URL is invalid or expired.", 401));
    }

    if (uid) {
      req.signedUserId = uid.toString();
    }

    return next();
  }

  let token;
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

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.jti && await isTokenBlacklisted(decoded.jti)) {
      return next(new AppError("Token has been revoked. Please log in again.", 401));
    }

    const currentUser = await User.findById(decoded.userId).select("-password");

    if (!currentUser) {
      return next(
        new AppError("The user belonging to this token no longer exists.", 401)
      );
    }

    req.user = currentUser;
    next();
  } catch {
    return next(new AppError("Invalid token. Please log in again.", 401));
  }
});
