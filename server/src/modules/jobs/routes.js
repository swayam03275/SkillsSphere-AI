import express from "express";
import { protect, authorizeRoles } from "../../middleware/authMiddleware.js";
import {
  createJobPosting,
  getRecruiterJobs,
  getJobPostingById,
  getJobs,
} from "./controller.js";

const router = express.Router();

// Protect all routes
router.use(protect);

// Public job discovery (for all authenticated users)
router.get("/", getJobs);

// Recruiter-only routes
router.get("/recruiter", authorizeRoles("recruiter"), getRecruiterJobs);
router.post("/", authorizeRoles("recruiter"), createJobPosting);

router
  .route("/:id")
  .get(authorizeRoles("recruiter"), getJobPostingById);

export default router;
