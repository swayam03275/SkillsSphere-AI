import express from "express";
import multer from "multer";
import { authorizeRoles, protect } from "../../middleware/authMiddleware.js";
import {
  startInterview,
  getSession,
  submitAnswer,
  completeInterview,
  getInterviewHistory,
  getSessionResults,
  getAvailableTopics,
  getAIServiceStatus,
  getTutorSessions,
  getTutorSession,
  submitTutorFeedback,
} from "./controller.js";

const router = express.Router();

// Multer config for audio uploads (max 10MB, memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "audio/webm",
      "audio/wav",
      "audio/x-wav",
      "audio/mpeg",
      "audio/mp3",
      "audio/ogg",
      "audio/m4a",
      "audio/mp4",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio format: ${file.mimetype}`), false);
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
router.get("/topics", getAvailableTopics);

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
router.post("/start", startInterview);

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

router.get("/:id", getSession);
router.post("/:id/answer", upload.single("audio"), submitAnswer);
router.post("/:id/complete", completeInterview);

/**
 * @openapi
 * /api/interviews/{id}/results:
 *   get:
 *     summary: Get final results and feedback for a completed session
 *     tags: [Interviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Detailed feedback and scores
 */
router.get("/:id/results", getSessionResults);

// Tutor routes
router.get("/tutor/sessions", authorizeRoles("tutor"), getTutorSessions);
router.get("/tutor/sessions/:id", authorizeRoles("tutor"), getTutorSession);
router.post("/tutor/sessions/:id/feedback", authorizeRoles("tutor"), submitTutorFeedback);

export default router;
