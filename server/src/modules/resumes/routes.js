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
import asyncHandler from "../../utils/asyncHandler.js";

const router = express.Router();

/**
 * @openapi
 * /api/resume/upload:
 *   post:
 *     summary: Upload a resume file
 *     tags: [Resumes]
 * /api/interviews/topics:
 *   get:
 *     summary: Retrieve available practice tracks and question pools
 *     tags: [Mock Interviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully compiled topics directory
 */
router.get(
  "/topics",
  protect,
  asyncHandler(async (req, res) => {
    const interviewTopicsPool = [
      { id: "react-dev", title: "React.js Core Concepts", questionsCount: 10, difficulty: "Intermediate" },
      { id: "node-sys", title: "Node.js Back-End Systems", questionsCount: 8, difficulty: "Advanced" },
      { id: "dsa-algo", title: "Data Structures & Algorithms", questionsCount: 15, difficulty: "Hard" }
    ];

    return res.status(200).json({
      success: true,
      topics: interviewTopicsPool
    });
  })
);

// 2. LIFECYCLE CREATION ENGINE (START SESSION)

/**
 * @openapi
 * /api/interviews/start:
 *   post:
 *     summary: Instantiate a new adaptive mock interview workspace track
 *     tags: [Mock Interviews]
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
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topicId
 *             properties:
 *               topicId:
 *                 type: string
 *               difficulty:
 *                 type: string
 *     responses:
 *       201:
 *         description: Environment initialized and session frames locked
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
 * /api/interviews/{id}/answer:
 *   post:
 *     summary: Submit a transcribed string response for structural evaluation
 *     description: Enforces an isolated connection handler containing a strict timeout barrier against the Python NLP evaluator container.
 *     tags: [Mock Interviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - answerText
 *             properties:
 *               question:
 *                 type: string
 *               answerText:
 *                 type: string
 *     responses:
 *       200:
 *         description: Evaluation output resolved cleanly (or fallback injected)
 */
router.post(
  "/analyze",
  protect,                  
  resumeAnalysisLimiter,    
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
 * /api/interviews/{id}/complete:
 *   post:
 *     summary: Terminate an open interview window frame and calculate structural statistics
 *     tags: [Mock Interviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Aggregate records locked down and calculated
 */
router.get("/me/latest", protect, getLatestResume);

/**
 * @openapi
 * /api/resume/list:
 *   get:
 *     summary: List all resumes for the user
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of resumes
 */
router.get("/list", protect, authorizeRoles("student"), listResumes);

/**
 * @openapi
 * /api/resume/{id}/active:
 *   patch:
 *     summary: Set a resume as active
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resume set as active
 */
router.patch("/:id/active", protect, authorizeRoles("student"), setActiveResume);

/**
 * @openapi
 * /api/resume/{id}/rename:
 *   patch:
 *     summary: Rename a resume
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Resume renamed
 */
router.patch("/:id/rename", protect, authorizeRoles("student"), renameResume);

/**
 * @openapi
 * /api/resume/{id}:
 *   delete:
 *     summary: Delete a resume
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resume deleted
 */
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
 * /api/interviews/ai-status:
 *   get:
 *     summary: Verify health metrics status of upstream microservices
 *     tags: [Mock Interviews]
 *     responses:
 *       200:
 *         description: Returns communication status data maps
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
router.post("/compare", protect, aiActionLimiter, compareVersions);

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
router.post("/:id/cover-letter", protect, aiActionLimiter, authorizeRoles("student"), generateCoverLetterForResume);

export default router;