import express from "express";
import { getCoverLetters, getCoverLetterById, generateCoverLetter, deleteCoverLetter } from "./controller.js";
import { protect, authorizeRoles } from "../../middleware/authMiddleware.js";
import { validateBody } from "../../middleware/validation.js";
import { generateCoverLetterSchema } from "../../validations/coverLetterValidation.js";

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
 * /api/cover-letters/generate:
 *   post:
 *     summary: Generate a new personalized cover letter
 *     tags: [CoverLetters]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resumeId
 *               - jobDescription
 *             properties:
 *               resumeId:
 *                 type: string
 *               jobDescription:
 *                 type: string
 *                 maxLength: 5000
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Bad request
 */
router.post("/generate", protect, authorizeRoles("student"), validateBody(generateCoverLetterSchema), generateCoverLetter);

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
 *   delete:
 *     summary: Delete a specific cover letter by ID
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
 *         description: Deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.get("/:id", protect, authorizeRoles("student"), getCoverLetterById);
router.delete("/:id", protect, authorizeRoles("student"), deleteCoverLetter);

export default router;
