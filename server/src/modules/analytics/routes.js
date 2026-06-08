import express from "express";
import { getSkillGapHeatmap, getDashboardAnalytics } from "./controller.js";
import { protect, authorizeRoles } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.get("/skill-gaps", protect, authorizeRoles("tutor", "recruiter"), getSkillGapHeatmap);
router.get("/dashboard", protect, getDashboardAnalytics);

export default router;
