import express from "express";
import { getSkillGapHeatmap } from "./controller.js";
import { protect, authorizeRoles } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.get("/skill-gaps", protect, authorizeRoles("tutor"), getSkillGapHeatmap);

export default router;
