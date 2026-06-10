import express from "express";
import { protect, authorizeRoles } from "../../middleware/authMiddleware.js";
import { validateBody } from "../../middleware/validation.js";
import { createClassroomSchema } from "../../validations/classrooms.validation.js";
import {
  createClassroomSession,
  getTutorClassroomSessions,
  getClassroomSessionByRoomId,
  endClassroomSession,
  getActiveClassroomSessions,
} from "./controller.js";

const router = express.Router();

// Authenticate all routes
router.use(protect);

/**
 * @openapi
 * /api/classrooms/create:
 *   post:
 *     summary: Create a new live classroom session
 *     tags: [Classrooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               subject:
 *                 type: string
 *               maxParticipants:
 *                 type: number
 *     responses:
 *       201:
 *         description: Classroom session created successfully
 */
router.post("/create", authorizeRoles("tutor"), validateBody(createClassroomSchema), createClassroomSession);

/**
 * @openapi
 * /api/classrooms/my-sessions:
 *   get:
 *     summary: Get all classroom sessions created by the tutor
 *     tags: [Classrooms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/my-sessions", authorizeRoles("tutor"), getTutorClassroomSessions);

/**
 * @openapi
 * /api/classrooms/active:
 *   get:
 *     summary: Get all active classroom sessions
 *     tags: [Classrooms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/active", getActiveClassroomSessions);


/**
 * @openapi
 * /api/classrooms/{roomId}:
 *   get:
 *     summary: Get classroom session metadata by room ID
 *     tags: [Classrooms]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/:roomId", getClassroomSessionByRoomId);

/**
 * @openapi
 * /api/classrooms/{roomId}/end:
 *   patch:
 *     summary: End a live classroom session
 *     tags: [Classrooms]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Classroom session ended successfully
 */
router.patch("/:roomId/end", authorizeRoles("tutor"), endClassroomSession);

export default router;
