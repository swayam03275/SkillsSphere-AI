import express from "express";
import { getSkillGapHeatmap, getDashboardAnalytics } from "./controller.js";
import { protect, authorizeRoles } from "../../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @openapi
 * /api/analytics/skill-gaps:
 *   get:
 *     summary: Get skill gaps heatmap data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Skill gap data successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get("/skill-gaps", protect, authorizeRoles("tutor", "recruiter"), getSkillGapHeatmap);

/**
 * @openapi
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get role-specific dashboard analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard analytics successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/dashboard", protect, getDashboardAnalytics);

export default router;
