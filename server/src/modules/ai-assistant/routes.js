import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { aiActionLimiter } from "../../middleware/rateLimiter.js";
import { generateChatResponse } from "./controller.js";

const router = express.Router();

/**
 * @openapi
 * /api/ai-assistant:
 *   post:
 *     summary: Generate an AI assistant chat response
 *     tags: [AI Assistant]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: The user's input message
 *     responses:
 *       200:
 *         description: Successful AI response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 reply:
 *                   type: string
 *       400:
 *         description: Bad request, message missing
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Internal server error
 */
router.post("/", protect, aiActionLimiter, generateChatResponse);

export default router;
