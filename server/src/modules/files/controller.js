import fs from "fs";
import path from "path";
import User from "../../database/models/User.js";
import Resume from "../../database/models/Resume.js";
import JobApplication from "../../database/models/JobApplication.js";
import AppError from "../../utils/AppError.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { resolveUploadPath } from "../../utils/uploadPaths.js";
import { buildSignedFileUrl, normalizeProtectedFilePath } from "../../utils/signedFileUrl.js";

const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sendFileIfExists = (res, absolutePath, filename) => {
  if (!fs.existsSync(absolutePath)) {
    return false;
  }

  const ext = path.extname(filename).toLowerCase();
  const mimeByExt = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };

  res.setHeader("Content-Type", mimeByExt[ext] || "application/octet-stream");
  res.setHeader("Cache-Control", "private, no-store");
  res.sendFile(absolutePath);
  return true;
};

/**
 * Helper to check if a user is authorized to access a resume file.
 * Returns true if the user is the owner OR a recruiter evaluating an application.
 */
const checkResumeAccess = async (userId, filename) => {
  const escapedFilename = escapeRegex(filename);

  // 1. Check if user is the direct owner (Student)
  const ownedResume = await Resume.findOne({
    user: userId,
    $or: [
      { "file.storedName": filename },
      { "file.path": { $regex: new RegExp(`\\/${escapedFilename}$`) } },
    ],
  }).select("_id");

  if (ownedResume) return true;

  // 2. Check if user is a recruiter who received this resume via JobApplication
  const resumeDoc = await Resume.findOne({
    $or: [
      { "file.storedName": filename },
      { "file.path": { $regex: new RegExp(`\\/${escapedFilename}$`) } },
    ],
  }).select("_id");

  if (resumeDoc) {
    const jobApp = await JobApplication.findOne({ resume: resumeDoc._id })
      .populate({
        path: "job",
        match: { recruiter: userId },
        select: "_id recruiter",
      });

    if (jobApp && jobApp.job) {
      return true;
    }
  }

  return false;
};

/**
 * @desc    Serve a resume file (owner only)
 * @route   GET /api/files/resumes/:filename
 */
export const serveResume = asyncHandler(async (req, res, next) => {
  const resolved = resolveUploadPath("resumes", req.params.filename);

  if (!resolved) {
    return next(new AppError("Invalid file path", 400));
  }

  const requesterId = req.user?._id?.toString() || req.signedUserId;
  if (!requesterId) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  const hasAccess = await checkResumeAccess(requesterId, resolved.safeName);

  if (!hasAccess) {
    return next(
      new AppError("You do not have permission to access this file", 403)
    );
  }

  if (!sendFileIfExists(res, resolved.absolutePath, resolved.safeName)) {
    return next(new AppError("File not found", 404));
  }
});

/**
 * @desc    Serve an avatar image (any authenticated user)
 * @route   GET /api/files/avatars/:filename
 */
export const serveAvatar = asyncHandler(async (req, res, next) => {
  const resolved = resolveUploadPath("avatars", req.params.filename);

  if (!resolved) {
    return next(new AppError("Invalid file path", 400));
  }

  const escapedFilename = escapeRegex(resolved.safeName);
  const avatarOwner = await User.findOne({
    profilePic: { $regex: new RegExp(`\\/${escapedFilename}$`) },
  }).select("_id");

  if (!avatarOwner) {
    return next(new AppError("File not found", 404));
  }

  if (!sendFileIfExists(res, resolved.absolutePath, resolved.safeName)) {
    return next(new AppError("File not found", 404));
  }
});

/**
 * @desc    Create a signed URL for protected file access
 * @route   POST /api/files/sign
 */
export const createSignedFileUrl = asyncHandler(async (req, res, next) => {
  const { path: rawPath, ttlSeconds } = req.body;
  const filePath = normalizeProtectedFilePath(rawPath);

  if (!filePath) {
    return next(new AppError("Invalid file path", 400));
  }

  if (filePath.startsWith("/api/files/resumes/")) {
    const filename = filePath.split("/api/files/resumes/").pop();
    
    const hasAccess = await checkResumeAccess(req.user._id, filename);

    if (!hasAccess) {
      return next(
        new AppError("You do not have permission to access this file", 403)
      );
    }
  }

  const ttl = Number.isFinite(Number(ttlSeconds)) ? Number(ttlSeconds) : 300;
  const expiresAt = Math.floor(Date.now() / 1000) + Math.max(ttl, 30);
  const signedPath = buildSignedFileUrl({
    path: filePath,
    expiresAt,
    extra: req.user._id.toString(),
  });

  const baseUrl =
    process.env.BACKEND_URL || `${req.protocol}://${req.get("host")}`;

  res.status(200).json({
    success: true,
    url: `${baseUrl}${signedPath}`,
    expiresAt: expiresAt * 1000,
  });
});
