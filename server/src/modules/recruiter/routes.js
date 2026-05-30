import express from "express";
import { protect, authorizeRoles } from "../../middleware/authMiddleware.js";
import {
  searchTalent,
  matchCandidate,
  inviteCandidate
} from "./controller.js";

const router = express.Router();

// Apply auth middleware to protect all recruiter routes
router.use(protect);
router.use(authorizeRoles("recruiter"));

// Define routes
router.get("/talent-finder", searchTalent);
router.post("/match-candidate", matchCandidate);
router.post("/invite-candidate", inviteCandidate);

export default router;
