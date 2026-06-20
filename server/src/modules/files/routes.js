import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { protectFileAccess } from "../../middleware/fileAuthMiddleware.js";
import { createSignedFileUrl, serveResume, serveAvatar } from "./controller.js";

const router = express.Router();

// All file access requires auth headers or a signed URL
/**
 * @openapi
 * /api/files/resumes/{filename}:
 *   get:
 *     summary: Serve a resume file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: t
 *         schema:
 *           type: string
 *         description: Signed token
 *     responses:
 *       200:
 *         description: File served
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: File not found
 */
router.get("/resumes/:filename", protectFileAccess, serveResume);

/**
 * @openapi
 * /api/files/avatars/{filename}:
 *   get:
 *     summary: Serve an avatar file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: t
 *         schema:
 *           type: string
 *         description: Signed token
 *     responses:
 *       200:
 *         description: File served
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: File not found
 */
router.get("/avatars/:filename", protectFileAccess, serveAvatar);

/**
 * @openapi
 * /api/files/sign:
 *   post:
 *     summary: Create a signed URL for file access
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               path:
 *                 type: string
 *     responses:
 *       200:
 *         description: Signed URL created
 */
router.post("/sign", protect, createSignedFileUrl);

export default router;
