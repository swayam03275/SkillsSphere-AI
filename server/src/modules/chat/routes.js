import express from "express";
import * as chatController from "./controller.js";
import { protect } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, chatController.generateChatReply);

export default router;
