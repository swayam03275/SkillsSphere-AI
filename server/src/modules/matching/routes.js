import express from "express";
import * as controller from "./controller.js";
import { protect } from "../../middleware/authMiddleware.js";
import {
  parseResumeUpload,
  validateAndPersistResumeFile,
} from "../../middleware/uploadResume.js";

const router = express.Router();

/**
 * All matching routes require authentication.
 */
router.use(protect);

/**
 * POST /api/matching/evaluate
 * Evaluates a resume against available jobs.
 * Supports optional file upload (field name: 'resume').
 */
router.post(
  "/evaluate",
  parseResumeUpload,
  validateAndPersistResumeFile,
  controller.evaluate
);

/**
 * GET /api/matching/recommended
 * Retrieves the latest match results/recommendations.
 */
router.get("/recommended", controller.getRecommended);

export default router;
