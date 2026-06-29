import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import logger from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_ROOT = path.join(__dirname, "..", "uploads");

/**
 * Safely deletes a file from the local disk given its relative or absolute path.
 * Suppresses errors if the file doesn't exist or deletion fails.
 * 
 * @param {string} filePath - The absolute or relative path to the file.
 * @returns {boolean} True if the file was deleted, false otherwise.
 */
export const safeDeletePhysicalFile = (filePath) => {
  if (!filePath) return false;

  try {
    let absolutePath = filePath;
    
    if (!path.isAbsolute(filePath)) {
      absolutePath = path.resolve(UPLOADS_ROOT, filePath);
    }
    
    // Path traversal check: Ensure the resolved path is within UPLOADS_ROOT
    if (!absolutePath.startsWith(UPLOADS_ROOT + path.sep) && absolutePath !== UPLOADS_ROOT) {
      logger.warn(`[safeDeletePhysicalFile] Attempted path traversal to delete outside uploads: ${filePath}`);
      return false;
    }
    
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
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
    
    // Resolve absolute path assuming default upload directory
    const filePath = path.join(__dirname, "..", "uploads", "avatars", filename);
    return safeDeletePhysicalFile(filePath);
  } catch (err) {
    logger.error(`[safeDeleteAvatarByUrl] Failed to delete avatar ${avatarUrl}:`, err.message);
    return false;
  }
};
