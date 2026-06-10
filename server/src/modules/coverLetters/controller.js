import CoverLetter from "../../database/models/CoverLetter.js";
import { generateCoverLetterService } from "./service.js";
import asyncHandler from "../../utils/asyncHandler.js";
import AppError from "../../utils/AppError.js";
import { COVER_LETTER_LIMIT } from "../../validations/coverLetterValidation.js";

/**
 * @desc    Get all cover letters for the authenticated user
 * @route   GET /api/cover-letters
 * @access  Private (Student)
 */
export const getCoverLetters = asyncHandler(async (req, res, next) => {
  const userId = req.user._id || req.user.id;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(20, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;

  const [coverLetters, total] = await Promise.all([
    CoverLetter.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CoverLetter.countDocuments({ user: userId })
  ]);
  res.status(200).json({
    success: true,
    count: coverLetters.length,
    totalCount: total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    data: coverLetters,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});
/**
 * @desc    Get single cover letter by ID
 * @route   GET /api/cover-letters/:id
 * @access  Private (Student)
 */
export const getCoverLetterById = asyncHandler(async (req, res, next) => {
  const userId = req.user._id || req.user.id;
  
  const coverLetter = await CoverLetter.findById(req.params.id).lean();

  if (!coverLetter) {
    return next(new AppError("Cover letter not found", 404));
  }

  // Ensure user owns this cover letter
  if (coverLetter.user.toString() !== userId.toString()) {
    return next(new AppError("Not authorized to access this cover letter", 403));
  }

  res.status(200).json({
    success: true,
    data: coverLetter,
  });
});

/**
 * @desc    Generate a new personalized cover letter
 * @route   POST /api/cover-letters/generate
 * @access  Private (Student)
 */
export const generateCoverLetter = asyncHandler(async (req, res, next) => {
  const userId = req.user._id || req.user.id;
  const { resumeId, jobDescription } = req.body;

  if (!resumeId || !jobDescription) {
    return next(new AppError("Resume ID and Job Description are required", 400));
  }

  const count = await CoverLetter.countDocuments({ user: userId });
  if (count >= COVER_LETTER_LIMIT) {
    return next(
      new AppError(
        `Maximum limit of ${COVER_LETTER_LIMIT} cover letters reached. Please delete an existing one to generate a new one.`,
        400
      )
    );
  }

  // Sanitize: remove null bytes and strip HTML tags
  const sanitizedJobDescription = jobDescription
    .replace(/\0/g, "")
    .replace(/<[^>]*>/g, "");

  const newCoverLetter = await generateCoverLetterService(userId, resumeId, sanitizedJobDescription);

  res.status(201).json({
    success: true,
    message: "Cover letter generated successfully",
    data: newCoverLetter,
  });
});

/**
 * @desc    Delete a cover letter by ID
 * @route   DELETE /api/cover-letters/:id
 * @access  Private (Student)
 */
export const deleteCoverLetter = asyncHandler(async (req, res, next) => {
  const userId = req.user._id || req.user.id;

  const coverLetter = await CoverLetter.findById(req.params.id);

  if (!coverLetter) {
    return next(new AppError("Cover letter not found", 404));
  }

  if (coverLetter.user.toString() !== userId.toString()) {
    return next(new AppError("Not authorized to delete this cover letter", 403));
  }

  await coverLetter.deleteOne();

  res.status(200).json({
    success: true,
    message: "Cover letter deleted successfully",
  });
});
