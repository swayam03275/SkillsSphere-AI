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
 * @openapi
 * /api/matching/evaluate:
 *   post:
 *     summary: Evaluate a resume against available jobs
 *     tags: [Matching]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               resume:
 *                 type: string
 *                 format: binary
 *                 description: Optional resume file upload
 *     responses:
 *       200:
 *         description: Evaluation successful
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  "/evaluate",
  parseResumeUpload,
  validateAndPersistResumeFile,
  controller.evaluate
);

/**
 * @openapi
 * /api/matching/recommended:
 *   get:
 *     summary: Retrieve recommended jobs based on latest evaluation
 *     tags: [Matching]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommended jobs retrieved
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/recommended", controller.getRecommended);

export default router;
