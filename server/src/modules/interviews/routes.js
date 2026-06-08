import express from "express";
import multer from "multer";
import path from "path";
import { authorizeRoles, protect } from "../../middleware/authMiddleware.js";
import cacheMiddleware from "../../middleware/cacheMiddleware.js";
import { aiActionLimiter } from "../../middleware/rateLimiter.js";
import AppError from "../../utils/AppError.js";
import {
  completeInterview,
  deleteInterviewSession,
  getAIServiceStatus,
  getAvailableTopics,
  getInterviewHistory,
  getSession,
  getSessionResults,
  getTutorSession,
  getTutorSessions,
  startInterview,
  submitAnswer,
  submitTutorFeedback,
} from "./controller.js";

const router = express.Router();

const AUDIO_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;
const SUPPORTED_AUDIO_TYPES = new Map([
  ["audio/webm", [".webm"]],
  ["audio/wav", [".wav"]],
  ["audio/x-wav", [".wav"]],
  ["audio/mpeg", [".mp3", ".mpeg"]],
  ["audio/mp3", [".mp3"]],
  ["audio/ogg", [".ogg"]],
  ["audio/m4a", [".m4a"]],
  ["audio/mp4", [".m4a", ".mp4"]],
]);

const hasSupportedAudioExtension = (file) => {
  const extension = path.extname(file.originalname || "").toLowerCase();
  return SUPPORTED_AUDIO_TYPES.get(file.mimetype)?.includes(extension) || false;
};

const hasSupportedAudioSignature = (file) => {
  const buffer = file?.buffer;
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return false;

  if (file.mimetype === "audio/webm") {
    return buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  }

  if (file.mimetype === "audio/wav" || file.mimetype === "audio/x-wav") {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WAVE"
    );
  }

  if (file.mimetype === "audio/mpeg" || file.mimetype === "audio/mp3") {
    return (
      buffer.length >= 3 &&
      (buffer.subarray(0, 3).toString("ascii") === "ID3" ||
        (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0))
    );
  }

  if (file.mimetype === "audio/ogg") {
    return buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "OggS";
  }

  if (file.mimetype === "audio/m4a" || file.mimetype === "audio/mp4") {
    return buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp";
  }

  return false;
};

const normalizeAudioUploadError = (error) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return new AppError("Audio file size must be 10 MB or less", 413);
  }

  if (error instanceof AppError) {
    return error;
  }

  return new AppError("Invalid audio upload", 400);
};

const handleAudioUpload = (req, res, next) => {
  upload.single("audio")(req, res, (error) => {
    if (error) {
      return next(normalizeAudioUploadError(error));
    }

    next();
  });
};

const validateUploadedAudioFile = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  if (req.file.size > AUDIO_UPLOAD_LIMIT_BYTES) {
    return next(new AppError("Audio file size must be 10 MB or less", 413));
  }

  if (req.file.size === 0) {
    return next(new AppError("Audio file cannot be empty", 400));
  }

  if (!hasSupportedAudioSignature(req.file)) {
    return next(new AppError("Unsupported audio file type", 400));
  }

  next();
};

// Multer config for audio uploads (max 10MB, memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AUDIO_UPLOAD_LIMIT_BYTES + 1 },
  fileFilter: (req, file, cb) => {
    if (SUPPORTED_AUDIO_TYPES.has(file.mimetype) && hasSupportedAudioExtension(file)) {
      cb(null, true);
    } else {
      cb(new AppError("Unsupported audio file type", 400), false);
    }
  },
});

// All interview routes require authentication
router.use(protect);

// Topic discovery
/**
 * @openapi
 * /api/interviews/topics:
 *   get:
 *     summary: Get available interview topics and difficulty levels
 *     tags: [Interviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of topics
 */
router.get("/topics", cacheMiddleware("topics", 600), getAvailableTopics);

// AI service status (for debugging)
router.get("/ai-status", getAIServiceStatus);

/**
 * @openapi
 * /api/interviews/start:
 *   post:
 *     summary: Start a new mock interview session
 *     tags: [Interviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topic
 *             properties:
 *               topic:
 *                 type: string
 *               difficulty:
 *                 type: string
 *                 enum: [Beginner, Intermediate, Advanced]
 *     responses:
 *       201:
 *         description: Session started
 */
router.post("/start", aiActionLimiter, startInterview);

/**
 * @openapi
 * /api/interviews/history:
 *   get:
 *     summary: Get current student's interview history
 *     tags: [Interviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of previous sessions
 */
router.get("/history", getInterviewHistory);

// Tutor routes (must be before /:id to avoid route conflict)
router.get("/tutor/sessions", authorizeRoles("tutor"), getTutorSessions);
router.get("/tutor/sessions/:id", authorizeRoles("tutor"), getTutorSession);
router.post(
  "/tutor/sessions/:id/feedback",
  authorizeRoles("tutor"),
  submitTutorFeedback,
);

router.get("/:id", getSession);
router.delete("/:id", deleteInterviewSession);
router.post(
  "/:id/answer",
  aiActionLimiter,
  handleAudioUpload,
  validateUploadedAudioFile,
  submitAnswer,
);
router.post("/:id/complete", completeInterview);
router.get("/:id/results", getSessionResults);

export default router;
