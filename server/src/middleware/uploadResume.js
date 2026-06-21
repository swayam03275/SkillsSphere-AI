import multer from "multer";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import AppError from "../utils/AppError.js";
import { fileURLToPath } from "url";
import { validateResumeBufferSignature } from "../utils/validateFileSignature.js";
import asyncHandler from "../utils/asyncHandler.js";
import logger from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the absolute path for the uploads directory
const uploadDirectory = path.join(__dirname, "..", "uploads");

// Ensure the upload directory exists synchronously on server startup
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

// Allowed MIME types for resume processing
const allowedMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

// Allowed file extensions for resume processing
const allowedExtensions = [".pdf", ".doc", ".docx", ".txt"];

/**
 * Filter to validate file extension, MIME type, and sanitize filename
 * against directory traversal attacks before buffering.
 * * @param {Object} _req - Express request object (unused)
 * @param {Object} file - Multer file object
 * @param {Function} cb - Multer callback function
 */
export const fileFilter = (_req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const hasAllowedMimeType = allowedMimeTypes.includes(file.mimetype);
  const hasAllowedExtension = allowedExtensions.includes(extension);

  // Defense in depth: strictly reject malicious traversal characters
  // This prevents attacks like "../../../etc/passwd" as a filename
  if (/[/\\]/.test(file.originalname) || file.originalname.includes("..")) {
    const traversalError = new Error("Invalid filename: Directory traversal is not allowed");
    traversalError.code = "INVALID_FILE_NAME";
    return cb(traversalError, false);
  }

  // Verify both extension and MIME type map correctly
  if (hasAllowedExtension && hasAllowedMimeType) {
    cb(null, true);
  } else {
    const typeError = new Error("Only PDF, DOC, DOCX, and TXT files are allowed");
    typeError.code = "INVALID_FILE_TYPE";
    cb(typeError, false);
  }
};

/**
 * Multer Configuration
 * Keeps the file entirely in memory (RAM) until the magic-byte 
 * validation passes. Enforces a strict 5MB payload limit to prevent OOM errors.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB Max File Size
  },
});

/**
 * Utility function to gracefully remove a file from disk if 
 * a downstream validation or processing step fails.
 * * @param {string} filePath - Absolute path to the file
 */
export const removeUploadedFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fsPromises.unlink(filePath);
  } catch (error) {
    // Best-effort cleanup after rejected upload
    // Failing silently here is acceptable to prevent crashing the worker
    logger.warn(`[Cleanup Warning] Failed to delete file at ${filePath}: ${error.message}`);
  }
};

/**
 * Generates a collision-resistant, sanitized filename for disk storage.
 * * @param {string} originalName - The original filename from the user
 * @returns {string} Sanitized filename prefixed with a timestamp
 */
const buildStoredFilename = (originalName) => {
  const safeOriginalName = path.basename(originalName);
  const ext = path.extname(safeOriginalName);
  // Remove extension, replace spaces with hyphens, and remove special characters
  const name = safeOriginalName
    .replace(ext, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, ""); 
    
  return `${Date.now()}-${name}${ext}`;
};

/**
 * Write a validated resume buffer to disk. 
 * This should ONLY be called after magic-byte checks pass.
 * * @param {Buffer} buffer - The file buffer from memory
 * @param {string} originalName - The original filename
 * @returns {Promise<Object>} Object containing the new filename and absolute filePath
 */
export const persistValidatedResumeFile = async (buffer, originalName) => {
  const filename = buildStoredFilename(originalName);
  const filePath = path.join(uploadDirectory, filename);
  
  await fsPromises.writeFile(filePath, buffer);
  
  return { filename, filePath };
};

/**
 * Standardized error handler for Multer and file validation errors.
 * Formats the response cleanly for the frontend API client.
 * * @param {Error} error - The caught error
 * @param {Object} res - Express response object
 * @returns {Object|null} JSON response or null if no error
 */
const handleMulterError = (error, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return next(new AppError("Payload Too Large: File size must be less than or equal to 5 MB", 413));
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return next(new AppError("Invalid form field name. Use `resume` as the file field key in form-data.", 400));
    }

    return next(new AppError(error.message || "Invalid file upload request", 400));
  }

  // Handle custom file filter errors
  if (error?.code === "INVALID_FILE_TYPE" || error?.code === "INVALID_FILE_NAME") {
    return next(new AppError(error.message, 400));
  }

  // Handle generic unknown errors
  if (error) {
    logger.error(`[Upload Error] Unexpected multer error: ${error.message}`);
    return next(new AppError("Internal server error occurred while processing the upload.", 500));
  }

  return null;
};

/**
 * Middleware Step 1: Parse multipart body into memory (req.file.buffer). 
 * Nothing is written to disk at this stage. Catches Multer limits/filter errors.
 */
export const parseResumeUpload = (req, res, next) => {
  upload.single("resume")(req, res, (error) => {
    const handled = error ? handleMulterError(error, res, next) : null;
    
    // If the error was handled and a response was sent, terminate the request chain
    if (handled !== null) return;
    
    next();
  });
};

/**
 * Middleware Step 2: Validate magic bytes from memory, then persist only authentic files.
 * Protects against users renaming an .exe to .pdf to bypass the fileFilter.
 */
export const validateAndPersistResumeFile = asyncHandler(async (req, res, next) => {
  // If no file was uploaded, just pass control to the next middleware (or controller)
  if (!req.file) {
    return next();
  }

  // Asynchronously validate the magic bytes of the memory buffer
  const signatureCheck = await validateResumeBufferSignature(
    req.file.buffer,
    req.file.originalname
  );

  if (!signatureCheck.valid) {
    // Clear the memory reference to aid Garbage Collection
    req.file = undefined; 
    
    return next(new AppError(signatureCheck.message || "The uploaded file failed content validation. Please upload a genuine PDF, DOC, DOCX, or TXT file.", 415));
  }

  // The file is authentic. Write it from RAM to the Disk.
  const { filename, filePath } = await persistValidatedResumeFile(
    req.file.buffer,
    req.file.originalname
  );

  // Mutate the req.file object to mimic a standard multer diskStorage output
  // so downstream controllers don't need to be rewritten.
  req.file.filename = filename;
  req.file.path = filePath;
  req.file.destination = uploadDirectory;
  
  // Optional: clear the buffer now that it's on disk to free up RAM early
  delete req.file.buffer; 

  return next();
});

/** * @deprecated Use `parseResumeUpload` followed by `validateAndPersistResumeFile`
 */
export const validateResumeFileContent = validateAndPersistResumeFile;

/** * Unified Middleware Array for Routes:
 * 1. Memory parse (Multer)
 * 2. Magic byte validation -> Disk persistence
 */
export const uploadResumeMiddleware = [
  parseResumeUpload, 
  validateAndPersistResumeFile
];