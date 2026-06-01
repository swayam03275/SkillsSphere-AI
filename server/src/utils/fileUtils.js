import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import logger from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(__dirname, "..", "..", filePath);
    
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
