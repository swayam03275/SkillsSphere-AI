import express from "express";
import { uploadResumeMiddleware } from "../../middleware/uploadResume.js";
import {
  uploadResume,
  analyzeResume,
  getResumeResult,
  getLatestResume,
  compareVersions
} from "./controller.js";
import { resumeAnalysisLimiter } from "../../middleware/rateLimiter.js";

import { protect, authorizeRoles } from "../../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @openapi
 * /api/resume/upload:
 *   post:
 *     summary: Upload a resume file
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Resume uploaded successfully
 */
router.post("/upload", protect, authorizeRoles("student"), resumeAnalysisLimiter, uploadResumeMiddleware, uploadResume);

/**
 * @openapi
 * /api/resume/analyze:
 *   post:
 *     summary: Upload and analyze a resume
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               jobDescription:
 *                 type: string
 *                 description: Optional JD text for benchmarking
 *     responses:
 *       200:
 *         description: Analysis complete
 */
router.post("/analyze", protect, authorizeRoles("student"), resumeAnalysisLimiter, uploadResumeMiddleware, analyzeResume);

/**
 * @openapi
 * /api/resume/me/latest:
 *   get:
 *     summary: Get the current user's latest resume analysis
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/me/latest", protect, getLatestResume);

/**
 * @openapi
 * /api/resume/result/{id}:
 *   get:
 *     summary: Get a specific resume analysis result by ID
 *     tags: [Resumes]
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
 *         description: Success
 */
router.get("/result/:id", protect, getResumeResult);


/**
 * @openapi
 * /api/resume/compare:
 *   post:
 *     summary: Get AI-generated strategic comparison between two resume versions
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - versionAId
 *               - versionBId
 *             properties:
 *               versionAId:
 *                 type: string
 *               versionBId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Strategic comparison generated
 */
router.post("/compare", protect, compareVersions);


export default router;
