import mongoose from "mongoose";
import JobPosting from "../../database/models/JobPosting.js";
import JobApplication from "../../database/models/JobApplication.js";
import Notification from "../../database/models/Notification.js";
import * as resumeService from "../resumes/service.js";
import matchingService from "../matching/service.js";
import { generateRecommendations } from "../../../../ai-ml/pipeline/recommendationEngine.js";
import AppError from "../../utils/AppError.js";
import { getIO } from "../../utils/socketIO.js";
import recruiterIntelligenceService from "../recruiterIntelligence/service.js";
import Resume from "../../database/models/Resume.js";
import redisClient from "../../config/redis.js";


import logger from "../../utils/logger.js";

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
  if (designation && typeof designation === "string") {
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filters.title = { $regex: escapeRegex(designation), $options: "i" };
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
      .populate("recruiter", "name email company companyWebsite")
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
  const job = await JobPosting.findById(id).populate("recruiter", "name email company companyWebsite");

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

  // Prevent Mass Assignment: Remove protected fields
  delete updateData.recruiter;
  delete updateData._id;
  delete updateData.createdAt;
  delete updateData.updatedAt;
  delete updateData.__v;

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
  const CACHE_KEY = "global_skill_trends";

  if (redisClient?.isReady) {
    try {
      const cached = await redisClient.get(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {
      // Redis unavailable — compute fresh
    }
  }

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

  if (redisClient?.isReady) {
    try {
      await redisClient.setEx(CACHE_KEY, 900, JSON.stringify(trends));
    } catch {
      // silently fail
    }
  }
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

  // Fetch only the relevant subset of jobs (limit to 100 at DB level)
  const openJobs = await JobPosting.find(query).limit(100);

  // 3. Perform matching and save result using matching service (ranks to top 20 and runs AI evaluation)
  const matchResult = await matchingService.evaluateMatches(user, resume, openJobs);
  const recommendations = matchResult.recommendations || [];

  if (recommendations.length === 0) {
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
  
  const jobsWithDetails = recommendations.map(rec => {
    const jobDoc = jobMap.get(rec.job.toString());
    return {
      ...(jobDoc ? jobDoc._doc : {}),
      matchScore: rec.score,
      matchBreakdown: rec.breakdown,
      relevanceInsights: rec.skillMatch?.feedback?.[0] || "Good match based on your background."
    };
  });

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
  const CACHE_KEY = `recruiter_analytics_${recruiterId.toString()}`;

  if (redisClient?.isReady) {
    try {
      const cached = await redisClient.get(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {
      // Redis unavailable — compute fresh
    }
  }

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

  const result = {
    totalJobs: allJobs.length,
    statusBreakdown,
    jobsByMonth,
    topSkills,
    recentJobs,
  };

  if (redisClient?.isReady) {
    try {
      await redisClient.setEx(CACHE_KEY, 300, JSON.stringify(result));
    } catch {
      // silently fail
    }
  }
  return result;
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

  // Prevent IDOR: Ensure the provided resumeId actually belongs to the applicant
  if (options.resumeId) {
    const resume = await Resume.findOne({ _id: options.resumeId, user: applicantId });
    if (!resume) {
      throw new AppError("Invalid resume selected or you do not have permission to use this resume", 403);
    }
  }

  // Check for duplicate application
  const existing = await JobApplication.findOne({ job: jobId, applicant: applicantId });
  
  if (existing) {
    if (existing.status === "withdrawn") {
      // Re-activate the withdrawn application
      existing.status = "pending";
      existing.resume = options.resumeId || null;
      existing.resumeLink = options.resumeLink.trim();
      existing.coverNote = options.coverNote?.trim() || "";
      existing.statusHistory.push({ status: "pending", comment: "Application re-submitted after withdrawal" });
      await existing.save();

      // Re-evaluate candidate match asynchronously
      recruiterIntelligenceService.evaluateCandidateMatch(existing._id).catch(err => {
        logger.error("Failed to evaluate candidate match on re-apply:", err);
      });

      return existing;
    }
    throw new AppError("You have already applied to this job", 409);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  let application;
  try {
    const appDocs = await JobApplication.create([{
      job: jobId,
      applicant: applicantId,
      resume: options.resumeId || null,
      resumeLink: options.resumeLink.trim(),
      coverNote: options.coverNote?.trim() || "",
      statusHistory: [{ status: "pending", comment: "Application submitted" }],
    }], { session });
    
    application = appDocs[0];

    const notifDocs = await Notification.create([{
      userId: job.recruiter,
      type: "new_application",
      title: "New Job Application",
      message: `A new candidate has applied for ${job.title}.`,
      relatedData: { jobId: job._id, applicationId: application._id, studentId: applicantId }
    }], { session });

    await session.commitTransaction();

    const io = getIO();
    if (io) {
      io.to(`user_${job.recruiter}`).emit("new-notification", notifDocs[0]);
    }

  } catch (error) {
    await session.abortTransaction();
    logger.error("Transaction aborted in applyToJob:", error);
    throw error;
  } finally {
    session.endSession();
  }

  // Evaluate candidate match asynchronously
  recruiterIntelligenceService.evaluateCandidateMatch(application._id).catch(err => {
    logger.error("Failed to evaluate candidate match:", err);
  });

  return application;
};

/**
 * Get all applications for a specific job (for recruiters)
 * @param {string} jobId - ID of the job
 * @param {string} recruiterId - ID of the recruiter (for ownership check)
 * @param {string} status - Optional status filter
 * @param {string} sortBy - Optional sort strategy ("matchScore", "newest", "oldest")
 * @returns {Promise<Array>} - List of applications
 */
export const getJobApplications = async (jobId, recruiterId, statusOrParams, sortByParam = "matchScore") => {
  const job = await JobPosting.findById(jobId);
  if (!job) {
    throw new AppError("Job not found", 404);
  }

  if (job.recruiter.toString() !== recruiterId.toString()) {
    throw new AppError("You do not have permission to view these applications", 403);
  }

  // Normalize inputs to support legacy positional calls and object-based query formats
  let status = "";
  let sortBy = "matchScore";
  let filters = {};

  if (statusOrParams && typeof statusOrParams === "object") {
    filters = statusOrParams;
    status = filters.status || "";
    sortBy = filters.sortBy || "matchScore";
  } else {
    status = statusOrParams || "";
    sortBy = sortByParam || "matchScore";
    filters = { status, sortBy };
  }

  const query = { job: jobId };
  if (status) {
    query.status = status;
  }

  // AI Match Score Range Filters
  if (filters.minScore !== undefined && filters.minScore !== "") {
    query.aiMatchScore = { ...query.aiMatchScore, $gte: Number(filters.minScore) };
  }
  if (filters.maxScore !== undefined && filters.maxScore !== "") {
    query.aiMatchScore = { ...query.aiMatchScore, $lte: Number(filters.maxScore) };
  }

  // ATS Compatibility Score Filters
  if (filters.minAtsScore !== undefined && filters.minAtsScore !== "") {
    query["matchBreakdown.atsCompatibility"] = { ...query["matchBreakdown.atsCompatibility"], $gte: Number(filters.minAtsScore) };
  }
  if (filters.maxAtsScore !== undefined && filters.maxAtsScore !== "") {
    query["matchBreakdown.atsCompatibility"] = { ...query["matchBreakdown.atsCompatibility"], $lte: Number(filters.maxAtsScore) };
  }

  // Match Category Filters
  if (filters.matchCategory) {
    const categoryMap = {
      excellent: "Excellent Match",
      moderate: "Moderate Match",
      growth: "Growth Potential",
      weak: "Weak Alignment",
      "excellent match": "Excellent Match",
      "moderate match": "Moderate Match",
      "growth potential": "Growth Potential",
      "weak alignment": "Weak Alignment"
    };

    const requestedCategories = Array.isArray(filters.matchCategory)
      ? filters.matchCategory
      : filters.matchCategory.split(",").map(c => c.trim().toLowerCase());

    const mappedCategories = requestedCategories
      .map(c => categoryMap[c] || c)
      .filter(Boolean);

    if (mappedCategories.length > 0) {
      query.matchCategory = { $in: mappedCategories };
    }
  }

  // Contribution Activity Filters
  if (filters.contributorOnly === "true" || filters.contributorOnly === true) {
    query["matchBreakdown.contributionActivity"] = { $in: ["High", "Medium"] };
  } else if (filters.contributionLevel) {
    const levels = Array.isArray(filters.contributionLevel)
      ? filters.contributionLevel
      : filters.contributionLevel.split(",").map(l => l.trim());
    query["matchBreakdown.contributionActivity"] = { $in: levels };
  }

  // Career Readiness Filters
  if (filters.careerReadiness) {
    const readinessLevels = Array.isArray(filters.careerReadiness)
      ? filters.careerReadiness
      : filters.careerReadiness.split(",").map(r => r.trim());
    query["matchBreakdown.careerReadiness"] = { $in: readinessLevels };
  }

  // Specialization Filters (using subqueries on the Resume collection)
  if (filters.specialization) {
    const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const specMap = {
      frontend: ['html', 'css', 'react', 'angular', 'vue', 'javascript', 'typescript', 'tailwind', 'next.js', 'nextjs', 'redux', 'frontend', 'front-end'],
      backend: ['node.js', 'nodejs', 'express', 'python', 'django', 'fastapi', 'java', 'spring', 'ruby', 'rails', 'go', 'golang', 'php', 'backend', 'back-end'],
      devops: ['docker', 'kubernetes', 'aws', 'gcp', 'azure', 'ci/cd', 'cicd', 'git', 'github actions', 'terraform', 'ansible', 'devops'],
      aiml: ['machine learning', 'deep learning', 'pytorch', 'tensorflow', 'scikit-learn', 'nlp', 'computer vision', 'ai', 'ml', 'artificial intelligence'],
      database: ['sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'oracle', 'sqlite', 'cassandra', 'dynamodb', 'database']
    };

    const requestedSpecs = Array.isArray(filters.specialization)
      ? filters.specialization
      : filters.specialization.split(",").map(s => s.trim().toLowerCase());

    const resumeQueryConditions = [];

    requestedSpecs.forEach(spec => {
      if (spec === "fullstack") {
        resumeQueryConditions.push({
          $and: [
            { skills: { $in: specMap.frontend.map(s => new RegExp(`^${escapeRegex(s)}$`, "i")) } },
            { skills: { $in: specMap.backend.map(s => new RegExp(`^${escapeRegex(s)}$`, "i")) } }
          ]
        });
      } else if (specMap[spec]) {
        resumeQueryConditions.push({
          skills: { $in: specMap[spec].map(s => new RegExp(`^${escapeRegex(s)}$`, "i")) }
        });
      }
    });

    if (resumeQueryConditions.length > 0) {
      // Optimize: Only search resumes that are attached to applications for this job
      const currentAppResumes = await JobApplication.distinct("resume", { job: jobId });
      const matchingResumes = await Resume.find({ 
        _id: { $in: currentAppResumes },
        $or: resumeQueryConditions 
      }).select("_id").lean();
      
      const resumeIds = matchingResumes.map(r => r._id);
      query.resume = { $in: resumeIds };
    }
  }

  // Direct skills keyword filtering
  if (filters.skills) {
    const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const skillList = Array.isArray(filters.skills)
      ? filters.skills
      : filters.skills.split(",").map(s => s.trim());
    const skillRegexes = skillList.map(s => new RegExp(`^${escapeRegex(s)}$`, "i"));
    
    // Optimize: Only search resumes that are attached to applications for this job
    const currentAppResumes = await JobApplication.distinct("resume", { job: jobId });
    const matchingResumes = await Resume.find({ 
      _id: { $in: currentAppResumes },
      skills: { $in: skillRegexes } 
    }).select("_id").lean();
    
    const resumeIds = matchingResumes.map(r => r._id);
    query.resume = { ...query.resume, $in: resumeIds };
  }

  let sortConfig = { createdAt: -1 };
  if (sortBy === "matchScore") {
    // Sort by match score descending, fallback to creation date
    sortConfig = { aiMatchScore: -1, createdAt: -1 };
  } else if (sortBy === "newest") {
    sortConfig = { createdAt: -1 };
  } else if (sortBy === "oldest") {
    sortConfig = { createdAt: 1 };
  }

  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 20));
  const skip = (page - 1) * limit;

  const [applications, totalCount] = await Promise.all([
    JobApplication.find(query)
      .populate("applicant", "name email")
      .populate("resume", "fileName")
      .sort(sortConfig)
      .skip(skip)
      .limit(limit),
    JobApplication.countDocuments(query)
  ]);

  return {
    applications,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page
  };
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
      averageAiMatchScore: 0,
      topCandidatesCount: 0,
      matchCategoryDistribution: {
        "Excellent Match": 0,
        "Moderate Match": 0,
        "Growth Potential": 0,
        "Weak Alignment": 0
      },
      averageAtsScore: 0,
      atsReadyPercentage: 0,
      lowAtsCount: 0,
      ossContributorCount: 0,
      ossContributorPercentage: 0,
      activeRoadmapCount: 0,
      specializationCounts: {
        frontend: 0,
        backend: 0,
        fullstack: 0,
        devops: 0,
        aiml: 0,
        database: 0
      }
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

  // Dynamic Hiring Intelligence Metrics
  const allApps = await JobApplication.find({ job: { $in: jobIds } }).lean();

  let totalScored = 0;
  let totalScoreSum = 0;
  let topCandidatesCount = 0;
  
  let totalAtsScored = 0;
  let totalAtsSum = 0;
  let atsReadyCount = 0;
  let lowAtsCount = 0;

  let ossContributorCount = 0;
  let activeRoadmapCount = 0;

  const matchCategoryDistribution = {
    "Excellent Match": 0,
    "Moderate Match": 0,
    "Growth Potential": 0,
    "Weak Alignment": 0
  };

  allApps.forEach(app => {
    // AI Match Scores
    if (app.aiMatchScore !== null && app.aiMatchScore !== undefined) {
      totalScored += 1;
      totalScoreSum += app.aiMatchScore;
      if (app.aiMatchScore >= 85) {
        topCandidatesCount += 1;
      }
    }

    if (app.matchCategory) {
      if (matchCategoryDistribution[app.matchCategory] !== undefined) {
        matchCategoryDistribution[app.matchCategory] += 1;
      }
    }

    // Breakdown details
    if (app.matchBreakdown) {
      const ats = app.matchBreakdown.atsCompatibility;
      if (ats !== null && ats !== undefined) {
        totalAtsScored += 1;
        totalAtsSum += ats;
        if (ats >= 80) {
          atsReadyCount += 1;
        }
        if (ats < 50) {
          lowAtsCount += 1;
        }
      }

      const contr = app.matchBreakdown.contributionActivity;
      if (contr === "High" || contr === "Medium") {
        ossContributorCount += 1;
      }

      const career = app.matchBreakdown.careerReadiness;
      if (career === "High" || career === "Medium") {
        activeRoadmapCount += 1;
      }
    }
  });

  const averageAiMatchScore = totalScored > 0 ? Math.round(totalScoreSum / totalScored) : 0;
  const averageAtsScore = totalAtsScored > 0 ? Math.round(totalAtsSum / totalAtsScored) : 0;
  const atsReadyPercentage = totalAtsScored > 0 ? Math.round((atsReadyCount / totalAtsScored) * 100) : 0;
  const ossContributorPercentage = totalApplicants > 0 ? Math.round((ossContributorCount / totalApplicants) * 100) : 0;

  // Query resumes to count specialization statistics
  const applicationsWithResumes = await JobApplication.find({ job: { $in: jobIds } })
    .select("resume")
    .populate("resume", "skills")
    .lean();

  const specMap = {
    frontend: ['html', 'css', 'react', 'angular', 'vue', 'javascript', 'typescript', 'tailwind', 'next.js', 'nextjs', 'redux', 'frontend', 'front-end'],
    backend: ['node.js', 'nodejs', 'express', 'python', 'django', 'fastapi', 'java', 'spring', 'ruby', 'rails', 'go', 'golang', 'php', 'backend', 'back-end'],
    devops: ['docker', 'kubernetes', 'aws', 'gcp', 'azure', 'ci/cd', 'cicd', 'git', 'github actions', 'terraform', 'ansible', 'devops'],
    aiml: ['machine learning', 'deep learning', 'pytorch', 'tensorflow', 'scikit-learn', 'nlp', 'computer vision', 'ai', 'ml', 'artificial intelligence'],
    database: ['sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'oracle', 'sqlite', 'cassandra', 'dynamodb', 'database']
  };

  const specializationCounts = { frontend: 0, backend: 0, fullstack: 0, devops: 0, aiml: 0, database: 0 };

  applicationsWithResumes.forEach(app => {
    const skills = (app.resume?.skills || []).map(s => s.toLowerCase().trim());
    if (skills.length === 0) return;

    let hasFrontend = skills.some(s => specMap.frontend.includes(s));
    let hasBackend = skills.some(s => specMap.backend.includes(s));
    let hasDevops = skills.some(s => specMap.devops.includes(s));
    let hasAiml = skills.some(s => specMap.aiml.includes(s));
    let hasDatabase = skills.some(s => specMap.database.includes(s));

    if (hasFrontend && hasBackend) {
      specializationCounts.fullstack += 1;
    } else {
      if (hasFrontend) specializationCounts.frontend += 1;
      if (hasBackend) specializationCounts.backend += 1;
    }
    if (hasDevops) specializationCounts.devops += 1;
    if (hasAiml) specializationCounts.aiml += 1;
    if (hasDatabase) specializationCounts.database += 1;
  });

  return {
    totalApplicants,
    applicantsByStatus,
    applicantsPerJob: perJobAgg,
    averageAiMatchScore,
    topCandidatesCount,
    matchCategoryDistribution,
    averageAtsScore,
    atsReadyPercentage,
    lowAtsCount,
    ossContributorCount,
    ossContributorPercentage,
    activeRoadmapCount,
    specializationCounts
  };
};

/**
 * Get all job IDs the current student has applied to
 * @param {string} applicantId - ID of the student
 * @returns {Promise<string[]>} - Array of job IDs
 */
export const getMyAppliedJobIds = async (applicantId) => {
  const applications = await JobApplication.find({ 
    applicant: applicantId,
    status: { $ne: "withdrawn" } 
  })
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

  // Create persistent notification for the student
  const notification = await Notification.create({
    userId: application.applicant,
    type: "application",
    title: "Application Status Updated",
    message: `Your application for ${application.job.title} has been marked as ${status}.`,
    relatedData: { jobId: application.job._id, studentId: application.applicant, applicationId: application._id }
  });

  // Emit real-time standard notification to the applicant
  const io = getIO();
  if (io) {
    const roomName = `user_${application.applicant}`;
    io.to(roomName).emit("new-notification", notification);
  }

  return application;
};
