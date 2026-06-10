import { GoogleGenerativeAI } from "@google/generative-ai";
import asyncHandler from "../../middleware/asyncHandler.js";
import logger from "../../utils/logger.js";
import AppError from "../../utils/AppError.js";

export let geminiModel = null;
if (process.env.GEMINI_API_KEY) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

export const generateChatResponse = asyncHandler(async (req, res, next) => {
  const body = req.body || {};

  // Backward compatibility:
  // - New format: { "messages": [{ sender: "user"|"bot", text: "..." }] }
  // - Old format: { "message": "..." }
  let messages = body.messages;
  if (!messages && typeof body.message === "string" && body.message.trim()) {
    messages = [
      {
        sender: "user",
        text: body.message.trim(),
      },
    ];
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return next(new AppError("Messages array is required", 400));
  }


  if (!geminiModel) {
    return next(new AppError("AI service is currently unconfigured. Please set GEMINI_API_KEY in .env", 503));
  }

  // Build the conversation history
  let promptContext = `You are the "SkillsSphere Career Assistant", an expert AI specializing in tech careers, resumes, recruitment, and technical interviews. 
Keep your answers concise, helpful, and professional. You can use markdown formatting for code snippets, bold text, and lists. If the user asks something completely unrelated to careers or the platform, politely decline to answer.\n\n`;

  promptContext += "Conversation History:\n";
  messages.forEach((msg) => {
    // Only include user and bot messages, ignoring "Thinking..." indicators just in case they slipped through
    if (msg.text !== "Thinking...") {
      promptContext += `${msg.sender === "bot" ? "Assistant" : "User"}: ${msg.text}\n`;
    }
  });

  promptContext += "Assistant:";

  try {
    const result = await geminiModel.generateContent(promptContext);
    const reply = result.response.text();

    res.json({ success: true, reply });
  } catch (error) {
    logger.error("Chat API error:", error);
    return next(new AppError("Failed to generate AI response", 500));
  }
});
