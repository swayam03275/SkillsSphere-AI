import express from "express";
import * as roadmapController from "./controller.js";
import { protect } from "../../middleware/authMiddleware.js";

const router = express.Router();

// All roadmap routes are protected (require login)
router.use(protect);

router.get("/me", roadmapController.getMyProgress);
router.post("/sync", roadmapController.syncRoadmap);
router.patch("/update-topic", roadmapController.updateTopicStatus);

export default router;
