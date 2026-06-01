import asyncHandler from "../../utils/asyncHandler.js";
import AppError from "../../utils/AppError.js";
import AnalysisHistory from "../../database/models/AnalysisHistory.js";

export const getHistory = asyncHandler(async (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [history, total] = await Promise.all([
    AnalysisHistory.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AnalysisHistory.countDocuments({ user: req.user._id })
  ]);

  res.status(200).json({
    success: true,
    message: "Analysis history fetched successfully",
    data: history,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    }
  });
});
