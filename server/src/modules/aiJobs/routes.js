import express from "express";
import { protect, authorizeRoles } from "../../middleware/authMiddleware.js";
import { captureIdempotencyKey } from "../../middleware/idempotencyMiddleware.js";
import { resumeAnalysisLimiter } from "../../middleware/rateLimiter.js";
import {
  parseResumeUpload,
  validateAndPersistResumeFile,
} from "../../middleware/uploadResume.js";
import {
  enqueueResumeAnalyze,
  enqueueMatchingEvaluate,
  getJobStatus,
} from "./controller.js";

const router = express.Router();

router.use(protect);
router.use(captureIdempotencyKey);

router.post(
  "/resume-analyze",
  authorizeRoles("student"),
  resumeAnalysisLimiter,
  parseResumeUpload,
  validateAndPersistResumeFile,
  enqueueResumeAnalyze
);

router.post(
  "/matching-evaluate",
  parseResumeUpload,
  validateAndPersistResumeFile,
  enqueueMatchingEvaluate
);

router.get("/:jobId", getJobStatus);

export default router;
