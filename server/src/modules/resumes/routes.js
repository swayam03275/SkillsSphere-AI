import express from "express";
import {
  parseResumeUpload,
  validateAndPersistResumeFile,
} from "../../middleware/uploadResume.js";
import {
  uploadResume,
  analyzeResume,
  getResumeResult,
  getLatestResume,
  compareVersions,
  listResumes,
  setActiveResume,
  renameResume,
  deleteResume,
} from "./controller.js";
import { generateCoverLetterForResume } from "./coverLetter.controller.js";
import { resumeAnalysisLimiter, aiActionLimiter } from "../../middleware/rateLimiter.js";

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
 *               resume:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Resume uploaded successfully
 *       400:
 *         description: Invalid or spoofed file (magic-byte validation failed)
 */
router.post(
  "/upload",
  protect,
  authorizeRoles("student"),
  parseResumeUpload,
  validateAndPersistResumeFile,
  uploadResume
);

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
 *               resume:
 *                 type: string
 *                 format: binary
 *               jobDescription:
 *                 type: string
 *                 description: Optional JD text for benchmarking
 *     responses:
 *       200:
 *         description: Analysis complete
 *       400:
 *         description: Invalid or spoofed file (magic-byte validation failed)
 */
router.post(
  "/analyze",
  resumeAnalysisLimiter,
  protect,
  authorizeRoles("student"),
  parseResumeUpload,
  validateAndPersistResumeFile,
  analyzeResume
);

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
router.get("/list", protect, authorizeRoles("student"), listResumes);
router.patch("/:id/active", protect, authorizeRoles("student"), setActiveResume);
router.patch("/:id/rename", protect, authorizeRoles("student"), renameResume);
router.delete("/:id", protect, authorizeRoles("student"), deleteResume);

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
router.post("/compare", aiActionLimiter, protect, compareVersions);

/**
 * @openapi
 * /api/resume/{id}/cover-letter:
 *   post:
 *     summary: Generate an AI cover letter for a specific resume
 *     tags: [Resumes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jobDescription
 *             properties:
 *               jobDescription:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cover letter generated successfully
 *       400:
 *         description: Job description missing
 *       404:
 *         description: Resume not found
 *       500:
 *         description: AI generation failed
 */
router.post("/:id/cover-letter", aiActionLimiter, protect, authorizeRoles("student"), generateCoverLetterForResume);

export default router;
