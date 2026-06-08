import JobPosting from "../../database/models/JobPosting.js";
import {
  getAllJobs,
  getJobRecommendations,
  getRankedCandidatesForJob,
  getRecruiterAnalytics as getAnalyticsData,
  applyToJob as applyToJobService,
  getJobApplications as getJobAppsService,
  getApplicantAnalytics as getApplicantAnalyticsData,
  getMyAppliedJobIds as getMyAppliedJobIdsService,
  getMyApplicationsWithDetails as getMyAppsDetailedService,
  withdrawApplication as withdrawAppService,
  updateJob as updateJobService,
  deleteJob as deleteJobService,
  getSkillTrends as getSkillTrendsService,
  updateApplicationStatus as updateApplicationStatusService,
  updateStudentApplicationStatusService,
} from "./service.js";
import AppError from "../../utils/AppError.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { invalidateCacheByPrefix } from "../../utils/cacheHelpers.js";
import redisClient from "../../config/redis.js";

/**
 * Sanitizes a string to prevent CSV Injection (Formula Injection).
 * If the string starts with a dangerous character (=, +, -, @, \t, \r),
 * it prepends a single quote to force the spreadsheet application to treat it as text.
 * It also escapes double quotes and wraps the result in quotes.
 * 
 * @param {string} str - The string to sanitize
 * @returns {string} The sanitized, quote-wrapped string ready for CSV insertion
 */
const sanitizeCSVField = (str) => {
  if (typeof str !== "string") str = String(str || "");
  
  // Clean newlines
  let cleaned = str.replace(/\r?\n|\r/g, " ");

  // Escape double quotes
  cleaned = cleaned.replace(/"/g, '""');

  // Prevent formula injection by neutralizing dangerous starting characters
  if (/^[=+\-@\t\r]/.test(cleaned)) {
    cleaned = "'" + cleaned;
  }

  return `"${cleaned}"`;
};

const invalidateAnalyticsCache = async (recruiterId) => {
  if (!redisClient || !redisClient.isReady) return;
  try {
    await redisClient.del(["global_skill_trends", `recruiter_analytics_${recruiterId}`]);
  } catch {
    // Redis unavailable — skip invalidation
  }
};

/**
 * @desc    Create a new job posting
 * @route   POST /api/recruiter/jobs
 * @access  Private (Recruiters only)
 */
export const createJobPosting = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    requirements,
    responsibilities,
    skills,
    experienceRequired,
    jobLevel,
    status,
    location,
    salary,
    keywords,
  } = req.body;

  // Validate required fields with detailed errors
  const validationErrors = {};
  if (!title) validationErrors.title = "Job title is required";
  if (!description) validationErrors.description = "Job description is required";
  if (!skills || (Array.isArray(skills) && skills.length === 0)) {
    validationErrors.skills = "At least one skill is required";
  }
  if (!location) {
    validationErrors.location = "Location is required";
  } else {
    if (!location.city) validationErrors["location.city"] = "City is required";
    if (!location.state) validationErrors["location.state"] = "State is required";
  }
  if (!salary) {
    validationErrors.salary = "Salary information is required";
  } else {
    if (salary.min === undefined || salary.min === null) {
      validationErrors["salary.min"] = "Minimum salary is required";
    }
    if (salary.max === undefined || salary.max === null) {
      validationErrors["salary.max"] = "Maximum salary is required";
    }
    if (salary.min !== undefined && salary.max !== undefined && salary.min > salary.max) {
      validationErrors["salary.max"] = "Maximum salary must be greater than or equal to minimum";
    }
  }

  if (Object.keys(validationErrors).length > 0) {
    const error = new AppError("Please provide all required fields", 400);
    error.errors = validationErrors;
    throw error;
  }

  // Create job posting with recruiter from authenticated user
  const jobPosting = await JobPosting.create({
    title,
    description,
    requirements,
    responsibilities,
    skills,
    experienceRequired,
    jobLevel,
    status: status || "draft",
    location,
    salary,
    keywords,
    recruiter: req.user._id,
  });

  // Invalidate jobs cache
  await invalidateCacheByPrefix("jobs");
  await invalidateAnalyticsCache(req.user._id.toString());

  res.status(201).json({
    success: true,
    job: jobPosting,
  });
});

/**
 * @desc    Get all job postings for the authenticated recruiter
 * @route   GET /api/recruiter/jobs
 * @access  Private (Recruiters only)
 */
export const getRecruiterJobs = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const [jobs, totalCount] = await Promise.all([
    JobPosting.find({ recruiter: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    JobPosting.countDocuments({ recruiter: req.user._id })
  ]);

  res.status(200).json({
    success: true,
    count: jobs.length,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
    jobs,
  });
});

/**
 * @desc    Get a single job posting by ID
 * @route   GET /api/recruiter/jobs/:id
 * @access  Private (Recruiters only)
 */
export const getJobPostingById = asyncHandler(async (req, res) => {
  const job = await JobPosting.findOne({
    _id: req.params.id,
    recruiter: req.user._id,
  });

  if (!job) {
    throw new AppError("Job posting not found", 404);
  }

  res.status(200).json({
    success: true,
    job,
  });
});

/**
 * @desc    Update a job posting
 * @route   PUT /api/jobs/:id
 * @access  Private (Recruiters only)
 */
export const updateJobPosting = asyncHandler(async (req, res) => {
  const updatedJob = await updateJobService(req.params.id, req.body, req.user._id);
  await invalidateCacheByPrefix("jobs");
  await invalidateAnalyticsCache(req.user._id.toString());
  res.status(200).json({
    success: true,
    job: updatedJob,
  });
});

/**
 * @desc    Delete a job posting
 * @route   DELETE /api/jobs/:id
 * @access  Private (Recruiters only)
 */
export const deleteJobPosting = asyncHandler(async (req, res) => {
  await deleteJobService(req.params.id, req.user._id);
  await invalidateCacheByPrefix("jobs");
  await invalidateAnalyticsCache(req.user._id.toString());
  res.status(200).json({
    success: true,
    message: "Job deleted successfully",
  });
});

/**
 * @desc    Get all open job postings with optional filters
 * @route   GET /api/jobs
 * @access  Private (All authenticated users)
 */
export const getJobs = asyncHandler(async (req, res) => {
  const { minSalary, maxSalary, designation, postedWithin } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

  const result = await getAllJobs({
    minSalary,
    maxSalary,
    designation,
    postedWithin,
    page,
    limit
  });

  res.status(200).json({
    success: true,
    count: result.jobs.length,
    totalCount: result.totalCount,
    totalPages: result.totalPages,
    currentPage: result.currentPage,
    jobs: result.jobs,
  });
});

/**
 * @desc    Get personalized job recommendations for students
 * @route   GET /api/jobs/recommendations
 * @access  Private (Students only)
 */
export const getRecommendations = asyncHandler(async (req, res) => {
  const { sortBy, limit } = req.query;
  const recommendations = await getJobRecommendations(req.user, { sortBy, limit });
  res.status(200).json(recommendations);
});

/**
 * @desc    Get recruiter analytics (job stats, trends, top skills)
 * @route   GET /api/jobs/recruiter/analytics
 * @access  Private (Recruiters only)
 */
export const getRecruiterAnalytics = asyncHandler(async (req, res) => {
  const [jobAnalytics, applicantAnalytics] = await Promise.all([
    getAnalyticsData(req.user._id),
    getApplicantAnalyticsData(req.user._id),
  ]);

  res.status(200).json({
    success: true,
    analytics: {
      ...jobAnalytics,
      ...applicantAnalytics,
    },
  });
});

/**
 * @desc    Apply to a job posting
 * @route   POST /api/jobs/:id/apply
 * @access  Private (Students only)
 */
export const applyToJobPosting = asyncHandler(async (req, res) => {
  const { resumeId, resumeLink, coverNote } = req.body;

  const application = await applyToJobService(
    req.params.id,
    req.user._id,
    { resumeId, resumeLink, coverNote }
  );

  res.status(201).json({
    success: true,
    message: "Application submitted successfully",
    application,
  });
});

/**
 * @desc    Get all applications for a job posting
 * @route   GET /api/jobs/:id/applications
 * @access  Private (Recruiters only)
 */
export const getApplications = asyncHandler(async (req, res) => {
  if (req.query.view === "insights") {
    return getRankedCandidates(req, res);
  }

  const result = await getJobAppsService(req.params.id, req.user._id, {
    ...req.query,
    page: Math.max(1, parseInt(req.query.page) || 1),
    limit: Math.min(100, Math.max(1, parseInt(req.query.limit) || 20))
  });

  res.status(200).json({
    success: true,
    count: result.applications.length,
    totalCount: result.totalCount,
    totalPages: result.totalPages,
    currentPage: result.currentPage,
    applications: result.applications,
  });
});

export const getRankedCandidates = asyncHandler(async (req, res) => {
  const result = await getRankedCandidatesForJob(req.params.id, req.user._id, req.query);

  return res.status(200).json({
    success: true,
    job: result.job,
    candidates: result.candidates,
    totalCount: result.totalCount,
    totalPages: result.totalPages,
    currentPage: result.currentPage,
    summary: result.summary,
  });
});

/**
 * @desc    Export all applications for a job posting as CSV
 * @route   GET /api/jobs/:id/applications/export
 * @access  Private (Recruiters only)
 */
export const exportApplicationsToCSV = asyncHandler(async (req, res) => {
  const { status, sortBy } = req.query || {};
  const result = await getJobAppsService(req.params.id, req.user._id, status, sortBy);
  const applications = result.applications || result;

  // Construct CSV headers
  const headers = [
    "Candidate Name",
    "Candidate Email",
    "Match Score",
    "Match Category",
    "Status",
    "Apply Date",
    "Resume Link",
    "Cover Note"
  ];

  const toCSVField = (value) => {
    if (value === null || value === undefined || value === "") return '"N/A"';
    let str = String(value);
    
    // Prevent CSV Injection (Macro Injection)
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    
    // Escape quotes and replace newlines with space
    str = str.replace(/"/g, '""').replace(/\r?\n|\r/g, " ");
    
    return `"${str}"`;
  };

  // Convert applications to CSV rows
  const rows = applications.map(app => {
    return [
      toCSVField(app.applicant?.name),
      toCSVField(app.applicant?.email),
      toCSVField(app.aiMatchScore !== null && app.aiMatchScore !== undefined ? `${app.aiMatchScore}%` : null),
      toCSVField(app.matchCategory),
      toCSVField(app.status || "pending"),
      toCSVField(new Date(app.createdAt).toLocaleDateString()),
      toCSVField(app.resumeLink),
      toCSVField(app.coverNote)
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=job-${req.params.id}-applicants.csv`
  );
  res.status(200).send(csvContent);
});

/**
 * @desc    Get current student's applied job IDs
 * @route   GET /api/jobs/my-applications
 * @access  Private (Students only)
 */
export const getMyApplications = asyncHandler(async (req, res) => {
  const jobIds = await getMyAppliedJobIdsService(req.user._id);

  res.status(200).json({
    success: true,
    appliedJobIds: jobIds,
  });
});

/**
 * @desc    Get current student's applied jobs with full details
 * @route   GET /api/jobs/my-applications/details
 * @access  Private (Students only)
 */
export const getMyApplicationsDetailed = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

  const result = await getMyAppsDetailedService(req.user._id, { page, limit });

  res.status(200).json({
    success: true,
    count: result.applications.length,
    totalCount: result.totalCount,
    totalPages: result.totalPages,
    currentPage: result.currentPage,
    applications: result.applications,
  });
});

/**
 * @desc    Withdraw a job application
 * @route   PATCH /api/jobs/:id/withdraw
 * @access  Private (Students only)
 */
export const withdrawJobApplication = asyncHandler(async (req, res) => {
  const application = await withdrawAppService(req.params.id, req.user._id);

  res.status(200).json({
    success: true,
    message: "Application withdrawn successfully",
    application,
  });
});

/**
 * @desc    Get top trending skills from open job postings
 * @route   GET /api/jobs/trends/skills
 * @access  Private (All authenticated users)
 */
export const getSkillTrends = asyncHandler(async (req, res) => {
  const trends = await getSkillTrendsService();
  res.status(200).json({
    success: true,
    trends,
  });
});

/**
 * @desc    Update the status of a job application
 * @route   PATCH /api/jobs/applications/:id/status
 * @access  Private (Recruiters only)
 */
export const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { status, comment } = req.body;

  if (!status) {
    throw new AppError("Status is required", 400);
  }

  const application = await updateApplicationStatusService(
    req.params.id,
    req.user._id,
    { status, comment }
  );

  res.status(200).json({
    success: true,
    message: `Application status updated to ${status}`,
    application,
  });
});

/**
 * @desc    Update the student's personal CRM status for a job application
 * @route   PATCH /api/jobs/applications/:id/student-status
 * @access  Private (Students only)
 */
export const updateStudentApplicationStatus = asyncHandler(async (req, res) => {
  const { studentStatus } = req.body;

  if (studentStatus === undefined) {
    throw new AppError("studentStatus is required", 400);
  }

  const application = await updateStudentApplicationStatusService(
    req.params.id,
    req.user._id,
    studentStatus
  );

  res.status(200).json({
    success: true,
    message: `Student tracking status updated`,
    application,
  });
});
