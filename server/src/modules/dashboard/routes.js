import express from "express";
import { getHistory } from "./controller.js";
import { protect } from "../../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @openapi
 * /api/dashboard/history:
 *   get:
 *     summary: Get dashboard history
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard history retrieved
 */
router.get("/history", protect, getHistory);

export default router;
