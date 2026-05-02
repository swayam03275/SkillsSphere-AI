import JobPosting from "../../database/models/JobPosting.js";
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
  const { minSalary, maxSalary, designation, postedWithin } = queryParams;
  
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

  const jobs = await JobPosting.find(filters)
    .populate("recruiter", "name email company")
    .sort("-createdAt");
    
  return jobs;
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
  
  await JobPosting.findByIdAndDelete(id);
};
