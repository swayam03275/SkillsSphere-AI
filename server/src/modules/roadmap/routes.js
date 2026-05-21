import express from "express";
import * as roadmapController from "./controller.js";
import { protect, authorizeRoles } from "../../middleware/authMiddleware.js";

const router = express.Router();

// All roadmap routes are protected (require login)
router.use(protect);

/**
 * @openapi
 * /api/roadmap/me:
 *   get:
 *     summary: Get current student's roadmap progress
 *     tags: [Roadmap]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roadmap data
 */
router.get("/me", roadmapController.getMyProgress);

/**
 * @openapi
 * /api/roadmap/sync:
 *   post:
 *     summary: Sync roadmap with latest resume analysis
 *     tags: [Roadmap]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync successful
 */
router.post("/sync", roadmapController.syncRoadmap);

/**
 * @openapi
 * /api/roadmap/update-topic:
 *   patch:
 *     summary: Update completion status of a roadmap topic
 *     tags: [Roadmap]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               topicId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [not-started, in-progress, completed]
 *     responses:
 *       200:
 *         description: Topic updated
 */
router.patch("/update-topic", roadmapController.updateTopicStatus);

// Tutor endpoints

/**
 * @openapi
 * /api/roadmap/tutor/students:
 *   get:
 *     summary: Get all active student roadmaps (Tutors only)
 *     tags: [Roadmap]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active student list with progress
 */
router.get("/tutor/students", authorizeRoles("tutor"), roadmapController.getStudentsRoadmaps);

/**
 * @openapi
 * /api/roadmap/tutor/students/{studentId}:
 *   get:
 *     summary: Get specific student's learning progress (Tutors only)
 *     tags: [Roadmap]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detailed student progress roadmap
 */
router.get("/tutor/students/:studentId", authorizeRoles("tutor"), roadmapController.getStudentRoadmap);

/**
 * @openapi
 * /api/roadmap/tutor/assign-resource:
 *   post:
 *     summary: Assign a custom resource link to a student's topic (Tutors only)
 *     tags: [Roadmap]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, topicId, title, url, type]
 *             properties:
 *               studentId:
 *                 type: string
 *               topicId:
 *                 type: string
 *               title:
 *                 type: string
 *               url:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [video, article, documentation]
 *     responses:
 *       200:
 *         description: Resource assigned successfully
 */
router.post("/tutor/assign-resource", authorizeRoles("tutor"), roadmapController.assignTutorResource);

/**
 * @openapi
 * /api/roadmap/tutor/verify-topic:
 *   post:
 *     summary: Toggle verification state of a student's roadmap milestone (Tutors only)
 *     tags: [Roadmap]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, topicId, isVerified]
 *             properties:
 *               studentId:
 *                 type: string
 *               topicId:
 *                 type: string
 *               isVerified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Milestone verification updated
 */
router.post("/tutor/verify-topic", authorizeRoles("tutor"), roadmapController.verifyTopic);

export default router;
