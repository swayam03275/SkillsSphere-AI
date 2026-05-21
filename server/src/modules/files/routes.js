import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { protectFileAccess } from "../../middleware/fileAuthMiddleware.js";
import { createSignedFileUrl, serveResume, serveAvatar } from "./controller.js";

const router = express.Router();

// All file access requires auth headers or a signed URL
router.get("/resumes/:filename", protectFileAccess, serveResume);
router.get("/avatars/:filename", protectFileAccess, serveAvatar);

// Signed URL generator for protected files
router.post("/sign", protect, createSignedFileUrl);

export default router;
