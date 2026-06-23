import express from "express";
import { protect, authorizeRoles, requireFullAccess } from "../../middleware/authMiddleware.js";
import { validateBody } from "../../middleware/validation.js";
import { matchCandidateSchema, inviteCandidateSchema } from "../../validations/recruiterValidation.js";
import {
  searchTalent,
  matchCandidate,
  inviteCandidate
} from "./controller.js";
import { compareCandidates } from "./comparison.controller.js";

const router = express.Router();

// Apply auth middleware to protect all recruiter routes
router.use(protect);
router.use(authorizeRoles("recruiter"));

// Define routes

/**
 * @openapi
 * /api/recruiter/talent-finder:
 *   get:
 *     summary: Search for talent
 *     tags: [Recruiter]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Talent search results retrieved
 */
router.get("/talent-finder", requireFullAccess, searchTalent);

/**
 * @openapi
 * /api/recruiter/match-candidate:
 *   post:
 *     summary: Match a candidate to a job
 *     tags: [Recruiter]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               candidateId:
 *                 type: string
 *               jobId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Candidate matched
 */
router.post("/match-candidate", requireFullAccess, validateBody(matchCandidateSchema), matchCandidate);

/**
 * @openapi
 * /api/recruiter/invite-candidate:
 *   post:
 *     summary: Invite a candidate
 *     tags: [Recruiter]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               candidateId:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Candidate invited
 */
router.post("/invite-candidate", requireFullAccess, validateBody(inviteCandidateSchema), inviteCandidate);

/**
 * @openapi
 * /api/recruiter/compare-candidates:
 *   post:
 *     summary: Compare up to 3 candidates side-by-side
 *     tags: [Recruiter]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               candidateIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               jobId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Candidates comparison retrieved
 */
router.post("/compare-candidates", requireFullAccess, compareCandidates);

export default router;
