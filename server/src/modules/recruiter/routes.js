import express from "express";
import { protect, authorizeRoles } from "../../middleware/authMiddleware.js";
import { validateBody } from "../../middleware/validation.js";
import { matchCandidateSchema, inviteCandidateSchema } from "../../validations/recruiterValidation.js";
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
router.post("/match-candidate", validateBody(matchCandidateSchema), matchCandidate);
router.post("/invite-candidate", validateBody(inviteCandidateSchema), inviteCandidate);

export default router;
