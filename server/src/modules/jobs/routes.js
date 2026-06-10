import express from "express";
import { protect, authorizeRoles } from "../../middleware/authMiddleware.js";
import { validateBody } from "../../middleware/validation.js";
import {
  jobPostingSchema,
  updateJobSchema,
  applyToJobSchema,
  updateApplicationStatusSchema,
  updateStudentApplicationStatusSchema,
} from "../../validations/jobs.validation.js";
import { jobCreationLimiter } from "../../middleware/rateLimiter.js";
import cacheMiddleware from "../../middleware/cacheMiddleware.js";
import {
  createJobPosting,
  getRecruiterJobs,
  getJobPostingById,
  getJobs,
  getRecommendations,
  getRecruiterAnalytics,
  applyToJobPosting,
  getApplications,
  exportApplicationsToCSV,
  getMyApplications,
  getMyApplicationsDetailed,
  withdrawJobApplication,
  updateJobPosting,
  deleteJobPosting,
  getSkillTrends,
  updateApplicationStatus,
  updateStudentApplicationStatus,
} from "./controller.js";

const router = express.Router();

// Protect all routes
router.use(protect);

// Public job discovery (for all authenticated users)
/**
 * @openapi
 * /api/jobs:
 *   get:
 *     summary: Get all jobs (paginated/filtered)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of jobs
 */
router.get("/", cacheMiddleware("jobs", 300), getJobs);
/**
 * @openapi
 * /api/jobs/recommendations:
 *   get:
 *     summary: Get AI job recommendations for current student
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommended jobs
 */
router.get("/recommendations", getRecommendations);
router.get("/trends/skills", getSkillTrends);

// Recruiter-only routes
router.get("/recruiter", authorizeRoles("recruiter"), getRecruiterJobs);
/**
 * @openapi
 * /api/jobs/recruiter/analytics:
 *   get:
 *     summary: Get hiring analytics for recruiter
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics data
 */
router.get("/recruiter/analytics", authorizeRoles("recruiter"), getRecruiterAnalytics);
/**
 * @openapi
 * /api/jobs:
 *   post:
 *     summary: Create a new job posting
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - company
 *             properties:
 *               title:
 *                 type: string
 *               company:
 *                 type: string
 *     responses:
 *       201:
 *         description: Job created
 */
router.post("/", authorizeRoles("recruiter"), jobCreationLimiter, validateBody(jobPostingSchema), createJobPosting);

// Student application routes (must be before /:id to avoid route conflict)
router.get("/my-applications", authorizeRoles("student"), getMyApplications);
router.get("/my-applications/details", authorizeRoles("student"), getMyApplicationsDetailed);

// Job-specific routes
router
  .route("/:id")
  .get(authorizeRoles("recruiter"), getJobPostingById)
  .put(authorizeRoles("recruiter"), validateBody(updateJobSchema), updateJobPosting)
  .delete(authorizeRoles("recruiter"), deleteJobPosting);

// Application routes
router.post("/:id/apply", authorizeRoles("student"), validateBody(applyToJobSchema), applyToJobPosting);
router.patch("/:id/withdraw", authorizeRoles("student"), withdrawJobApplication);
router.get("/:id/applications", authorizeRoles("recruiter"), getApplications);
router.get("/:id/applications/export", authorizeRoles("recruiter"), exportApplicationsToCSV);
router.patch("/applications/:id/status", authorizeRoles("recruiter"), validateBody(updateApplicationStatusSchema), updateApplicationStatus);
router.patch("/applications/:id/student-status", authorizeRoles("student"), validateBody(updateStudentApplicationStatusSchema), updateStudentApplicationStatus);

export default router;
