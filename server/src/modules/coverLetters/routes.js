import express from "express";
import { getCoverLetters, getCoverLetterById } from "./controller.js";
import { protect, authorizeRoles } from "../../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @openapi
 * /api/cover-letters:
 *   get:
 *     summary: Get all generated cover letters for the authenticated user
 *     tags: [CoverLetters]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/", protect, authorizeRoles("student"), getCoverLetters);

/**
 * @openapi
 * /api/cover-letters/{id}:
 *   get:
 *     summary: Get a specific cover letter by ID
 *     tags: [CoverLetters]
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
 *       404:
 *         description: Not found
 */
router.get("/:id", protect, authorizeRoles("student"), getCoverLetterById);

export default router;
