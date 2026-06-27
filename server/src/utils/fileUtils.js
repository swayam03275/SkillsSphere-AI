import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import logger from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolves an absolute file path from either an absolute path or a path
 * relative to the server/src directory (where uploads/ lives).
 * Returns null if the resolved path escapes the allowed uploads directories.
 */
const resolveUploadPath = (filePath) => {
  const baseDir = path.resolve(__dirname); // server/src
  const allowedRoots = [
    path.resolve(baseDir, "uploads"),       // server/src/uploads
    path.resolve(baseDir, "..", "uploads"),  // server/uploads (legacy)
  ];

  let resolved;
  if (path.isAbsolute(filePath)) {
    resolved = path.resolve(filePath);
  } else {
    // Relative paths are resolved against server/src to match the upload directory layout
    resolved = path.resolve(baseDir, filePath);
  }

  // Ensure resolved path does not traverse outside any allowed root
  const isInside = allowedRoots.some((root) => {
    return resolved.startsWith(root + path.sep) || resolved === root;
  });

  if (!isInside) {
    logger.warn(
      `[safeDeletePhysicalFile] Blocked attempt to delete path outside uploads: ${filePath}`
    );
    return null;
  }

  return resolved;
};

/**
 * Safely deletes a file from the local disk given its absolute path.
 * The path must resolve to the server/src/uploads directory tree.
 * Suppresses errors if the file doesn't exist or deletion fails.
 *
 * @param {string} filePath - The absolute or relative path to the file.
 * @returns {boolean} True if the file was deleted, false otherwise.
 */
export const safeDeletePhysicalFile = (filePath) => {
  if (!filePath) return false;

  try {
    const resolved = resolveUploadPath(filePath);
    if (!resolved) return false;

    if (fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
      return true;
    }
    return false;
  } catch (err) {
    logger.error(`[safeDeletePhysicalFile] Failed to delete file ${filePath}:`, err.message);
    return false;
  }
};

/**
 * Safely deletes an avatar file from the local disk given its URL.
 * It automatically strips signed query strings (e.g., ?exp=...) before resolving the filename.
 *
 * @param {string} avatarUrl - The URL of the avatar image.
 * @returns {boolean} True if the file was deleted, false otherwise.
 */
export const safeDeleteAvatarByUrl = (avatarUrl) => {
  if (!avatarUrl) return false;

  if (!avatarUrl.includes("/uploads/avatars/") && !avatarUrl.includes("/api/files/avatars/")) {
    return false; // Not a local avatar file
  }

  try {
    // Strip query parameters to prevent file resolution failure
    const cleanUrl = avatarUrl.split("?")[0];
    const filename = path.basename(cleanUrl);

    // Build path relative to server/src/uploads/avatars
    const relativePath = path.join("uploads", "avatars", filename);
    return safeDeletePhysicalFile(relativePath);
  } catch (err) {
    logger.error(`[safeDeleteAvatarByUrl] Failed to delete avatar ${avatarUrl}:`, err.message);
    return false;
  }
};
