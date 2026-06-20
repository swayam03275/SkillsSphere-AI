import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import asyncHandler from "../../utils/asyncHandler.js";
import AppError from "../../utils/AppError.js";
import logger from "../../utils/logger.js";

const MAX_CHAT_MESSAGE_LENGTH = 2000;

const validateChatPayload = (req, _res, next) => {
  const payload = req.body;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return next(new AppError("Message is required", 400));
  }

  const keys = Object.keys(payload);
  if (keys.length !== 1 || keys[0] !== "message") {
    return next(new AppError("Request body must contain only a message field", 400));
  }

  if (typeof payload.message !== "string" || payload.message.trim().length === 0) {
    return next(new AppError("Message is required", 400));
  }

  if (payload.message.length > MAX_CHAT_MESSAGE_LENGTH) {
    return next(new AppError("Message must be 2000 characters or fewer", 400));
  }

  req.body.message = payload.message.trim();
  return next();
};

export const createChatRouter = ({ getGeminiModel }) => {
  const router = express.Router();

  /**
   * @openapi
   * /api/chat:
   *   post:
   *     summary: Send a message to the AI career assistant
   *     tags: [Chat]
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
   *                 description: The chat message for the AI
   *     responses:
   *       200:
   *         description: AI response generated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 reply:
   *                   type: string
   *       400:
   *         description: Bad request (missing or invalid message)
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Server error
   *       503:
   *         description: AI service unavailable
   */
  router.post(
    "/",
    protect,
    validateChatPayload,
    asyncHandler(async (req, res) => {
      const geminiModel = getGeminiModel();

      if (!geminiModel) {
        return res.status(503).json({
          error:
            "AI service is currently unconfigured. Please set GEMINI_API_KEY in .env",
        });
      }

      const prompt = `You are the "SkillsSphere Career Assistant", an expert AI specializing in tech careers, resumes, recruitment, and technical interviews. 
Keep your answers concise, helpful, and professional. If the user asks something completely unrelated to careers or the platform, politely decline to answer.
User message: ${req.body.message}`;

      try {
        const result = await geminiModel.generateContent(prompt);
        const reply = result.response.text();

        return res.json({ reply });
      } catch (error) {
        logger.error("Chat API error:", error);
        return res.status(500).json({ error: "Failed to generate AI response" });
      }
    }),
  );

  return router;
};

export default createChatRouter;
