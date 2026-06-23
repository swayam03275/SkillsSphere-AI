import express from "express";
import { protect, authorizeRoles, requireFullAccess } from "../../middleware/authMiddleware.js";
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
  getJobRecommendationsForRecruiter,
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
router.get("/recommendations", authorizeRoles("student"), getRecommendations);
/**
 * @openapi
 * /api/jobs/trends/skills:
 *   get:
 *     summary: Get skill trends in job postings
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Skill trends data
 */
router.get("/trends/skills", getSkillTrends);

// Recruiter-only routes
/**
 * @openapi
 * /api/jobs/recruiter:
 *   get:
 *     summary: Get jobs posted by the recruiter
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of recruiter jobs
 */
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
router.post("/", authorizeRoles("recruiter"), requireFullAccess, jobCreationLimiter, validateBody(jobPostingSchema), createJobPosting);

// Student application routes (must be before /:id to avoid route conflict)
/**
 * @openapi
 * /api/jobs/my-applications:
 *   get:
 *     summary: Get student's job applications
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of applications
 */
router.get("/my-applications", authorizeRoles("student"), getMyApplications);

/**
 * @openapi
 * /api/jobs/my-applications/details:
 *   get:
 *     summary: Get detailed view of student applications
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Detailed applications
 */
router.get("/my-applications/details", authorizeRoles("student"), getMyApplicationsDetailed);

// Job-specific routes
/**
 * @openapi
 * /api/jobs/{id}:
 *   get:
 *     summary: Get a specific job posting
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job posting retrieved
 *   put:
 *     summary: Update a job posting
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job posting updated
 *   delete:
 *     summary: Delete a job posting
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job posting deleted
 */
router
  .route("/:id")
  .get(authorizeRoles("recruiter"), getJobPostingById)
  .put(authorizeRoles("recruiter"), validateBody(updateJobSchema), updateJobPosting)
  .delete(authorizeRoles("recruiter"), deleteJobPosting);

// Application routes
/**
 * @openapi
 * /api/jobs/{id}/apply:
 *   post:
 *     summary: Apply to a job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Application submitted
 */
router.post("/:id/apply", authorizeRoles("student"), validateBody(applyToJobSchema), applyToJobPosting);

/**
 * @openapi
 * /api/jobs/{id}/withdraw:
 *   patch:
 *     summary: Withdraw an application
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Application withdrawn
 */
router.patch("/:id/withdraw", authorizeRoles("student"), withdrawJobApplication);

/**
 * @openapi
 * /api/jobs/{id}/applications:
 *   get:
 *     summary: Get applications for a job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of applications
 */
router.get("/:id/applications", authorizeRoles("recruiter"), getApplications);

/**
 * @openapi
 * /api/jobs/{id}/recommendations:
 *   get:
 *     summary: Get AI recommended talent match candidates for recruiter job posting
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of recommended candidates
 */
router.get("/:id/recommendations", authorizeRoles("recruiter"), getJobRecommendationsForRecruiter);

/**
 * @openapi
 * /api/jobs/{id}/applications/export:
 *   get:
 *     summary: Export applications to CSV
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: CSV file downloaded
 */
router.get("/:id/applications/export", authorizeRoles("recruiter"), exportApplicationsToCSV);

/**
 * @openapi
 * /api/jobs/applications/{id}/status:
 *   patch:
 *     summary: Update application status (recruiter)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch("/applications/:id/status", authorizeRoles("recruiter"), validateBody(updateApplicationStatusSchema), updateApplicationStatus);

/**
 * @openapi
 * /api/jobs/applications/{id}/student-status:
 *   patch:
 *     summary: Update application status (student)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch("/applications/:id/student-status", authorizeRoles("student"), validateBody(updateStudentApplicationStatusSchema), updateStudentApplicationStatus);

export default router;
