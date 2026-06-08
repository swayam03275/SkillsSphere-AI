import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { generateChatResponse } from "./controller.js";

const router = express.Router();

// Backward compatible chat handler:
// Normalizes legacy payload `{ "message": "..." }` into the `{ "messages": [...] }` array format
const transformLegacyMessage = (req, res, next) => {
  const body = req.body || {};
  if (body.message && typeof body.message === "string" && body.message.trim() && !body.messages) {
    req.body = {
      messages: [
        {
          sender: "user",
          text: body.message.trim(),
        },
      ],
    };
  }
  next();
};

router.post("/", protect, transformLegacyMessage, generateChatResponse);

export default router;
