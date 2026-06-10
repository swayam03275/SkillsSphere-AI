import * as matchingService from "./service.js";
import * as resumeService from "../resumes/service.js";
import { parseResume } from "../../utils/parseResume.js";
import asyncHandler from "../../utils/asyncHandler.js";
import AppError from "../../utils/AppError.js";
import fsPromises from "fs/promises";

/**
 * Handle matching evaluation.
 * Supports both library reuse (no file) and fresh upload (file present).
 * 
 * @route POST /api/matching/evaluate
 */
export const evaluate = asyncHandler(async (req, res, next) => {
  let resume;

  if (req.file) {
    // Fresh upload flow — parse and persist the resume.
    // The file is only cleaned up on failure; on success the file stays on disk
    // so the database record's stored path remains valid and downloadable.
    try {
      const parsedData = await parseResume(req.file.path);

      resume = await resumeService.upsertResume(req.user._id, {
        ...parsedData,
        file: {
          originalName: req.file.originalname,
          storedName: req.file.filename,
          path: req.file.path,
          size: `${(req.file.size / 1024).toFixed(2)} KB`,
          mimeType: req.file.mimetype,
        },
      }, true);
    } catch (err) {
      // Parsing or database save failed — clean up the orphaned temp file
      if (req.file?.path) {
        await fsPromises.unlink(req.file.path).catch(() => {});
      }
      throw err;
    }
  } else {
    // Resume library reuse flow
    // If no file is provided, we use the user's latest parsed resume record
    // We include resumeText for the matching pipeline (keyword evaluation)
    resume = await resumeService.getLatestResume(req.user._id, true);
    if (!resume) {
      return next(new AppError("No resume found in your library. Please upload one to begin matching.", 404));
    }
  }

  // Perform matching against all open jobs
  const result = await matchingService.evaluateMatches(req.user, resume);

  res.status(200).json({
    success: true,
    message: "Job matching evaluation completed successfully",
    data: result,
  });
});

/**
 * Fetch the most recent job recommendations for the user.
 * 
 * @route GET /api/matching/recommended
 */
export const getRecommended = asyncHandler(async (req, res, next) => {
  const result = await matchingService.getLatestRecommendations(req.user._id);

  if (!result) {
    return res.status(200).json({
      success: true,
      message: "No recommendations found. Run an evaluation to see matches.",
      data: null,
    });
  }

  res.status(200).json({
    success: true,
    message: "Latest recommendations fetched successfully",
    data: result,
  });
});

/**
 * Get a detailed match score between a job and the user's resume.
 *
 * @route GET /api/matching/detailed-score
 */
export const getDetailedScore = asyncHandler(async (req, res, next) => {
  const { jobId } = req.query;
  if (!jobId) {
    return next(new AppError("jobId is required", 400));
  }

  const resume = await resumeService.getLatestResume(req.user._id, false);
  if (!resume) {
    return next(new AppError("No resume found. Please upload a resume first.", 404));
  }

  const result = await matchingService.getDetailedMatchScore(jobId, resume);

  res.status(200).json({
    success: true,
    data: result,
  });
});
