import multer from "multer";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { validateResumeBufferSignatureSync } from "../utils/validateFileSignature.js";
import asyncHandler from "../utils/asyncHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDirectory = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const allowedMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const allowedExtensions = [".pdf", ".doc", ".docx", ".txt"];

export const fileFilter = (_req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const hasAllowedMimeType = allowedMimeTypes.includes(file.mimetype);
  const hasAllowedExtension = allowedExtensions.includes(extension);

  // Defense in depth: strictly reject malicious traversal characters
  if (/[/\\]/.test(file.originalname) || file.originalname.includes("..")) {
    const traversalError = new Error("Invalid filename: Directory traversal is not allowed");
    traversalError.code = "INVALID_FILE_NAME";
    return cb(traversalError, false);
  }

  if (hasAllowedExtension) {
    cb(null, true);
  } else {
    const typeError = new Error("Only PDF, DOC, DOCX, and TXT files are allowed");
    typeError.code = "INVALID_FILE_TYPE";
    cb(typeError, false);
  }
};

// Keep file in memory until magic-byte validation passes
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export const removeUploadedFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fsPromises.unlink(filePath);
  } catch {
    // Best-effort cleanup after rejected upload
  }
};

const buildStoredFilename = (originalName) => {
  const safeOriginalName = path.basename(originalName);
  const ext = path.extname(safeOriginalName);
  const name = safeOriginalName.replace(ext, "").replace(/\s+/g, "-");
  return `${Date.now()}-${name}${ext}`;
};

/**
 * Write a validated resume buffer to disk (call only after magic-byte checks pass).
 */
export const persistValidatedResumeFile = async (buffer, originalName) => {
  const filename = buildStoredFilename(originalName);
  const filePath = path.join(uploadDirectory, filename);
  await fsPromises.writeFile(filePath, buffer);
  return { filename, filePath };
};

const handleMulterError = (error, res) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size must be less than or equal to 5 MB",
      });
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message:
          "Invalid form field name. Use `resume` as the file field key in form-data.",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Invalid file upload request",
    });
  }

  if (error?.code === "INVALID_FILE_TYPE" || error?.code === "INVALID_FILE_NAME") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to upload resume",
    });
  }

  return null;
};

/**
 * Step 1: Parse multipart body into memory (req.file.buffer). Nothing is written to disk.
 */
export const parseResumeUpload = (req, res, next) => {
  upload.single("resume")(req, res, (error) => {
    const handled = error ? handleMulterError(error, res) : null;
    if (handled !== null) return;
    next();
  });
};

/**
 * Step 2: Validate magic bytes from memory, then persist only authentic files.
 */
export const validateAndPersistResumeFile = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  const signatureCheck = validateResumeBufferSignatureSync(
    req.file.buffer,
    req.file.originalname
  );

  if (!signatureCheck.valid) {
    req.file = undefined;
    return res.status(400).json({
      success: false,
      message:
        signatureCheck.message ||
        "The uploaded file failed content validation. Please upload a genuine PDF, DOC, DOCX, or TXT file.",
    });
  }

  const { filename, filePath } = await persistValidatedResumeFile(
    req.file.buffer,
    req.file.originalname
  );

  req.file.filename = filename;
  req.file.path = filePath;
  req.file.destination = uploadDirectory;

  return next();
});

/** @deprecated Use parseResumeUpload + validateAndPersistResumeFile */
export const validateResumeFileContent = validateAndPersistResumeFile;

/** Memory parse → validate buffer → persist authentic files only */
export const uploadResumeMiddleware = [parseResumeUpload, validateAndPersistResumeFile];
