import JobPosting from "../../database/models/JobPosting.js";
import { getAllJobs } from "./service.js";
import AppError from "../../utils/AppError.js";
import asyncHandler from "../../utils/asyncHandler.js";

/**
 * @desc    Create a new job posting
 * @route   POST /api/recruiter/jobs
 * @access  Private (Recruiters only)
 */
export const createJobPosting = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    skills,
    status,
    location,
    salary,
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
    // Country is optional here as it has a default value in the Mongoose model
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
    skills,
    status: status || "draft",
    location,
    salary,
    recruiter: req.user._id,
  });

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
  const jobs = await JobPosting.find({ recruiter: req.user._id })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
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
 * @desc    Get all open job postings with optional filters
 * @route   GET /api/jobs
 * @access  Private (All authenticated users)
 */
export const getJobs = asyncHandler(async (req, res) => {
  const { minSalary, maxSalary, designation, postedWithin } = req.query;
  
  const jobs = await getAllJobs({
    minSalary,
    maxSalary,
    designation,
    postedWithin,
  });

  res.status(200).json({
    success: true,
    count: jobs.length,
    jobs,
  });
});
