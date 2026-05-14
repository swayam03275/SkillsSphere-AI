import mongoose from "mongoose";
import JobPosting from "../../database/models/JobPosting.js";
import JobApplication from "../../database/models/JobApplication.js";
import * as resumeService from "../resumes/service.js";
import * as matchingService from "../matching/service.js";
import { generateRecommendations } from "../../../../ai-ml/pipeline/recommendationEngine.js";
import AppError from "../../utils/AppError.js";

/**
 * Create a new job posting
 * @param {Object} jobData - Job data
 * @param {string} recruiterId - ID of the recruiter posting the job
 * @returns {Promise<Object>} - Created job
 */
export const createJob = async (jobData, recruiterId) => {
  const job = await JobPosting.create({
    ...jobData,
    recruiter: recruiterId,
  });
  return job;
};

/**
 * Get all published jobs with optional filtering
 * @param {Object} queryParams - Query filters (minSalary, maxSalary, designation, postedWithin)
 * @returns {Promise<Array>} - List of jobs
 */
export const getAllJobs = async (queryParams = {}) => {
  const { minSalary, maxSalary, designation, postedWithin, page = 1, limit = 10 } = queryParams;

  // Base filter: only show open jobs
  const filters = { status: "open" };

  // Filter by designation (case-insensitive regex search on title)
  if (designation) {
    filters.title = { $regex: designation, $options: "i" };
  }

  // Filter by Salary Range
  if (minSalary || maxSalary) {
    // If minSalary is provided, ensure job's min salary is >= minSalary
    // Or more commonly: ensure the job's max salary is at least the user's min expectation
    if (minSalary) {
      filters["salary.min"] = { $gte: Number(minSalary) };
    }
    if (maxSalary) {
      filters["salary.max"] = { $lte: Number(maxSalary) };
    }
  }

  // Filter by Date Posted
  if (postedWithin) {
    const now = new Date();
    let cutoffDate;

    switch (postedWithin) {
      case "1d":
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = null;
    }

    if (cutoffDate) {
      filters.createdAt = { $gte: cutoffDate };
    }
  }

  const skip = (page - 1) * limit;

  const [jobs, totalCount] = await Promise.all([
    JobPosting.find(filters)
      .populate("recruiter", "name email company")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit),
    JobPosting.countDocuments(filters)
  ]);

  return {
    jobs,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page
  };
};

/**
 * Get job by ID
 * @param {string} id - Job ID
 * @returns {Promise<Object>} - Job details
 */
export const getJobById = async (id) => {
  const job = await JobPosting.findById(id).populate("recruiter", "name email company");

  if (!job) {
    throw new AppError("Job not found", 404);
  }

  return job;
};

/**
 * Update a job posting
 * @param {string} id - Job ID
 * @param {Object} updateData - Data to update
 * @param {string} recruiterId - ID of the recruiter
 * @returns {Promise<Object>} - Updated job
 */
export const updateJob = async (id, updateData, recruiterId) => {
  const job = await JobPosting.findById(id);

  if (!job) {
    throw new AppError("Job not found", 404);
  }

  // Check if the recruiter owns this job
  if (job.recruiter.toString() !== recruiterId.toString()) {
    throw new AppError("You do not have permission to update this job", 403);
  }

  const updatedJob = await JobPosting.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  return updatedJob;
};

/**
 * Aggregates the most requested skills from all open job postings.
 * @returns {Promise<Array>} Array of { skill: string, count: number }
 */
export const getSkillTrends = async () => {
  const trends = await JobPosting.aggregate([
    { $match: { status: "open" } },
    { $unwind: "$skills" },
    {
      $group: {
        _id: "$skills",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
    {
      $project: {
        _id: 0,
        skill: "$_id",
        count: 1,
      },
    },
  ]);
  return trends;
};

/**
 * Delete a job posting
 * @param {string} id - Job ID
 * @param {string} recruiterId - ID of the recruiter
 * @returns {Promise<void>}
 */
export const deleteJob = async (id, recruiterId) => {
  const job = await JobPosting.findById(id);

  if (!job) {
    throw new AppError("Job not found", 404);
  }

  // Check if the recruiter owns this job
  if (job.recruiter.toString() !== recruiterId.toString()) {
    throw new AppError("You do not have permission to delete this job", 403);
  }

  // Delete all associated applications
  await JobApplication.deleteMany({ job: id });
  
  await JobPosting.findByIdAndDelete(id);
};

/**
 * Get personalized job recommendations for a student based on their resume.
 * 
 * @param {Object} user - The authenticated user object
 * @returns {Promise<Object>} Recommendations and status message
 */
export const getJobRecommendations = async (user) => {
  // 1. Get the latest parsed resume for the user
  const resume = await resumeService.getLatestResume(user._id, true);

  if (!resume) {
    return {
      success: true,
      message: "Please upload a resume to see personalized matches.",
      jobs: [],
      hasResume: false
    };
  }

  // 2. Optimization: Pre-filter jobs to reduce load on the heavy AI engine
  const query = { status: "open" };

  // Combine and normalize candidate skills and keywords
  const candidateTerms = [
    ...(resume.skills || []),
    ...(resume.keywords || []),
  ].map((term) => term.trim().toLowerCase()).filter(Boolean);

  const uniqueTerms = [...new Set(candidateTerms)];

  if (uniqueTerms.length > 0) {
    // Pre-filter: Only fetch jobs where at least one skill or title matches a candidate term.
    // This drastically reduces the number of jobs sent to the AI evaluator.
    const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // We avoid \b for terms with special characters (like C++, Node.js) as it causes matching issues
    const regexTerms = uniqueTerms.map((term) => {
      const escaped = escapeRegex(term);
      return new RegExp(`^${escaped}$|\\b${escaped}\\b`, "i");
    });
    
    query.$or = [
      { skills: { $in: regexTerms } },
      { keywords: { $in: regexTerms } },
      { title: { $in: regexTerms } }
    ];
  }

  // Fetch only the relevant subset of jobs
  const openJobs = await JobPosting.find(query);

  // 3. Perform deep evaluation using the AI/ML Recommendation Engine on the filtered subset
  const rankedResults = await generateRecommendations(resume, openJobs);

  // 3. Persist the MatchResult for analytics (keeping sync with matching module)
  await matchingService.evaluateMatches(user, resume);

  if (!rankedResults || rankedResults.length === 0) {
    return {
      success: true,
      message: "No suitable jobs found matching your profile yet.",
      jobs: [],
      hasResume: true
    };
  }

  // Format the results for the API response
  // We re-attach the full job details from the DB
  const jobMap = new Map(openJobs.map(j => [j._id.toString(), j]));
  
  const jobsWithDetails = rankedResults.map(rec => ({
    ...jobMap.get(rec.jobId.toString())._doc,
    matchScore: rec.score,
    matchBreakdown: rec.breakdown,
    relevanceInsights: rec.relevanceInsights
  }));

  return {
    success: true,
    message: "Personalized matches found by SkillSphere AI",
    jobs: jobsWithDetails,
    hasResume: true
  };
};

/**
 * Get aggregated analytics for a recruiter's job postings
 * @param {string} recruiterId - ID of the recruiter
 * @returns {Promise<Object>} - Analytics data
 */
export const getRecruiterAnalytics = async (recruiterId) => {
  // Get all jobs for this recruiter
  const allJobs = await JobPosting.find({ recruiter: recruiterId })
    .sort({ createdAt: -1 })
    .lean();

  // Status breakdown
  const statusBreakdown = { open: 0, draft: 0, closed: 0 };
  allJobs.forEach((job) => {
    const status = job.status || "draft";
    if (statusBreakdown[status] !== undefined) {
      statusBreakdown[status] += 1;
    }
  });

  // Jobs by month (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const jobsByMonthAgg = await JobPosting.aggregate([
    {
      $match: {
        recruiter: new mongoose.Types.ObjectId(recruiterId),
        createdAt: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const jobsByMonth = jobsByMonthAgg.map((item) => ({
    month: `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
    count: item.count,
  }));

  // Top skills across all jobs
  const skillCount = {};
  allJobs.forEach((job) => {
    (job.skills || []).forEach((skill) => {
      const normalized = skill.toLowerCase().trim();
      if (normalized) {
        skillCount[normalized] = (skillCount[normalized] || 0) + 1;
      }
    });
  });

  const topSkills = Object.entries(skillCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, count }));

  // Recent jobs (last 5)
  const recentJobs = allJobs.slice(0, 5).map((job) => ({
    _id: job._id,
    title: job.title,
    status: job.status,
    location: job.location,
    salary: job.salary,
    createdAt: job.createdAt,
  }));

  return {
    totalJobs: allJobs.length,
    statusBreakdown,
    jobsByMonth,
    topSkills,
    recentJobs,
  };
};

/**
 * Apply to a job posting (for students)
 * @param {string} jobId - ID of the job
 * @param {string} applicantId - ID of the student
 * @param {Object} options - Optional fields (resumeId, resumeLink, coverNote)
 * @returns {Promise<Object>} - Created application
 */
export const applyToJob = async (jobId, applicantId, options = {}) => {
  const job = await JobPosting.findById(jobId);
  if (!job) {
    throw new AppError("Job not found", 404);
  }

  if (job.status !== "open") {
    throw new AppError("This job is not accepting applications", 400);
  }

  // resumeLink is required for student applications
  if (!options.resumeLink || !options.resumeLink.trim()) {
    throw new AppError("A shareable resume link is required to apply", 400);
  }

  // Check for duplicate application
  const existing = await JobApplication.findOne({ job: jobId, applicant: applicantId });
  if (existing) {
    throw new AppError("You have already applied to this job", 409);
  }

  const application = await JobApplication.create({
    job: jobId,
    applicant: applicantId,
    resume: options.resumeId || null,
    resumeLink: options.resumeLink.trim(),
    coverNote: options.coverNote?.trim() || "",
    statusHistory: [{ status: "pending", comment: "Application submitted" }],
  });

  return application;
};

/**
 * Get all applications for a specific job (for recruiters)
 * @param {string} jobId - ID of the job
 * @param {string} recruiterId - ID of the recruiter (for ownership check)
 * @returns {Promise<Array>} - List of applications
 */
export const getJobApplications = async (jobId, recruiterId) => {
  const job = await JobPosting.findById(jobId);
  if (!job) {
    throw new AppError("Job not found", 404);
  }

  if (job.recruiter.toString() !== recruiterId.toString()) {
    throw new AppError("You do not have permission to view these applications", 403);
  }

  const applications = await JobApplication.find({ job: jobId })
    .populate("applicant", "name email")
    .populate("resume", "fileName")
    .sort({ createdAt: -1 });

  return applications;
};

/**
 * Get applicant analytics for a recruiter's jobs
 * @param {string} recruiterId - ID of the recruiter
 * @returns {Promise<Object>} - Applicant analytics
 */
export const getApplicantAnalytics = async (recruiterId) => {
  // Get all jobs for this recruiter
  const recruiterJobIds = await JobPosting.find({ recruiter: recruiterId })
    .select("_id")
    .lean();
  const jobIds = recruiterJobIds.map((j) => j._id);

  if (jobIds.length === 0) {
    return {
      totalApplicants: 0,
      applicantsByStatus: { pending: 0, reviewed: 0, shortlisted: 0, rejected: 0 },
      applicantsPerJob: [],
    };
  }

  // Total applicant count
  const totalApplicants = await JobApplication.countDocuments({ job: { $in: jobIds } });

  // Applicants by status
  const statusAgg = await JobApplication.aggregate([
    { $match: { job: { $in: jobIds } } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const applicantsByStatus = { pending: 0, reviewed: 0, shortlisted: 0, rejected: 0 };
  statusAgg.forEach((item) => {
    if (applicantsByStatus[item._id] !== undefined) {
      applicantsByStatus[item._id] = item.count;
    }
  });

  // Applicants per job (top 10 by count)
  const perJobAgg = await JobApplication.aggregate([
    { $match: { job: { $in: jobIds } } },
    { $group: { _id: "$job", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "jobpostings",
        localField: "_id",
        foreignField: "_id",
        as: "jobInfo",
      },
    },
    { $unwind: "$jobInfo" },
    {
      $project: {
        _id: 1,
        count: 1,
        title: "$jobInfo.title",
        status: "$jobInfo.status",
      },
    },
  ]);

  return {
    totalApplicants,
    applicantsByStatus,
    applicantsPerJob: perJobAgg,
  };
};

/**
 * Get all job IDs the current student has applied to
 * @param {string} applicantId - ID of the student
 * @returns {Promise<string[]>} - Array of job IDs
 */
export const getMyAppliedJobIds = async (applicantId) => {
  const applications = await JobApplication.find({ applicant: applicantId })
    .select("job")
    .lean();

  return applications.map((app) => app.job.toString());
};

/**
 * Get all applications with full job details for the current student (paginated)
 * @param {string} applicantId - ID of the student
 * @param {Object} options - Pagination options
 * @param {number} options.page - Page number (1-indexed)
 * @param {number} options.limit - Items per page
 * @returns {Promise<Object>} - { applications, totalCount, totalPages, currentPage }
 */
export const getMyApplicationsWithDetails = async (applicantId, { page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;

  const [applications, totalCount] = await Promise.all([
    JobApplication.find({ applicant: applicantId })
      .populate("job", "title skills location status salary jobLevel description")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    JobApplication.countDocuments({ applicant: applicantId }),
  ]);

  return {
    applications,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
  };
};

/**
 * Withdraw a job application
 * @param {string} jobId - ID of the job
 * @param {string} applicantId - ID of the student
 * @returns {Promise<Object>} - Updated application
 */
export const withdrawApplication = async (jobId, applicantId) => {
  const application = await JobApplication.findOne({
    job: jobId,
    applicant: applicantId,
  });

  if (!application) {
    throw new AppError("Application not found", 404);
  }

  if (application.status === "withdrawn") {
    throw new AppError("Application is already withdrawn", 400);
  }

  if (["shortlisted", "rejected"].includes(application.status)) {
    throw new AppError(
      `Cannot withdraw a ${application.status} application`,
      400
    );
  }

  application.status = "withdrawn";
  application.statusHistory.push({
    status: "withdrawn",
    comment: "Application withdrawn by candidate",
    updatedAt: Date.now(),
  });
  await application.save();

  return application;
};

/**
 * Update the status of a job application (for recruiters)
 * @param {string} applicationId - ID of the application
 * @param {string} recruiterId - ID of the recruiter (for ownership check)
 * @param {Object} updateData - { status, comment }
 * @returns {Promise<Object>} - Updated application
 */
export const updateApplicationStatus = async (applicationId, recruiterId, { status, comment }) => {
  const application = await JobApplication.findById(applicationId).populate("job");
  if (!application) {
    throw new AppError("Application not found", 404);
  }

  // Check if the recruiter owns the job associated with this application
  if (application.job.recruiter.toString() !== recruiterId.toString()) {
    throw new AppError("You do not have permission to update this application", 403);
  }

  // Update top-level status and push to history
  application.status = status;
  application.statusHistory.push({
    status,
    comment: comment || `Status updated to ${status}`,
    updatedAt: Date.now(),
  });

  await application.save();
  return application;
};
