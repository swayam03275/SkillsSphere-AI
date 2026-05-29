import User from "../../database/models/User.js";
import Resume from "../../database/models/Resume.js";
import MatchResult from "../../database/models/MatchResult.js";
import LearningProgress from "../../database/models/LearningProgress.js";
import JobApplication from "../../database/models/JobApplication.js";
import CoverLetter from "../../database/models/CoverLetter.js";
import InterviewSession from "../../database/models/InterviewSession.js";
import AnalysisHistory from "../../database/models/AnalysisHistory.js";
import ClassroomSession from "../../database/models/ClassroomSession.js";
import JobPosting from "../../database/models/JobPosting.js";
import AppError from "../../utils/AppError.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { cascadeDeleteUser } from "../../utils/cascadeDelete.js";
import { getBackendUrl } from "../../config/env.js";
import { safeDeleteAvatarByUrl } from "../../utils/fileUtils.js";
import { deleteCloudinaryAsset, uploadAvatarBuffer } from "../../config/cloudinary.js";

/**
 * @desc    Update user profile details
 * @route   PUT /api/users/me
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res, next) => {
  const { name, company, companyWebsite } = req.body;

  if (!name || name.trim().length < 2) {
    return next(new AppError("Please provide a valid name (at least 2 characters)", 400));
  }

  const updateData = { name: name.trim() };

  if (req.user.role === "recruiter") {
    if (company !== undefined) {
      updateData.company = company ? company.trim() : null;
    }
    if (companyWebsite !== undefined) {
      let web = companyWebsite ? companyWebsite.trim() : null;
      if (web && !/^https?:\/\//i.test(web)) {
        web = `https://${web}`;
      }
      updateData.companyWebsite = web;
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    updateData,
    { new: true, runValidators: true }
  ).select("-password -__v");

  if (!updatedUser) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    user: updatedUser,
  });
});

/**
 * @desc    Upload / replace profile photo
 * @route   PUT /api/users/me/avatar
 * @access  Private
 */
export const uploadAvatar = asyncHandler(async (req, res, next) => {
  if (!req.file?.buffer) {
    return next(new AppError("No image file provided", 400));
  }

  const currentUser = await User.findById(req.user._id);
  if (!currentUser) {
    return next(new AppError("User not found", 404));
  }
  const uploadedAvatar = await uploadAvatarBuffer(req.file.buffer, req.user._id);
  const previousPublicId = currentUser.profilePicPublicId;
  const previousProfilePic = currentUser.profilePic;

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      profilePic: uploadedAvatar.secure_url,
      profilePicPublicId: uploadedAvatar.public_id,
    },
    { new: true }
  ).select("-password -__v");

  if (!updatedUser) {
    await deleteCloudinaryAsset(uploadedAvatar.public_id).catch((error) => {
      console.error("[uploadAvatar] Failed to clean up orphaned Cloudinary avatar:", error.message);
    });
    return next(new AppError("User not found", 404));
  }

  if (previousPublicId) {
    await deleteCloudinaryAsset(previousPublicId).catch((error) => {
      console.error("[uploadAvatar] Failed to delete previous Cloudinary avatar:", error.message);
    });
  } else {
    safeDeleteAvatarByUrl(previousProfilePic);
  }

  res.status(200).json({
    success: true,
    message: "Profile photo updated",
    user: updatedUser,
  });
});

/**
 * @desc    Remove profile photo
 * @route   DELETE /api/users/me/avatar
 * @access  Private
 */
export const removeAvatar = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user) return next(new AppError("User not found", 404));

  const previousPublicId = user.profilePicPublicId;
  const previousProfilePic = user.profilePic;

  user.profilePic = null;
  user.profilePicPublicId = null;
  await user.save();

  if (previousPublicId) {
    await deleteCloudinaryAsset(previousPublicId).catch((error) => {
      console.error("[removeAvatar] Failed to delete Cloudinary avatar:", error.message);
    });
  } else {
    safeDeleteAvatarByUrl(previousProfilePic);
  }

  res.status(200).json({
    success: true,
    message: "Profile photo removed",
    user: { ...user.toObject(), password: undefined, __v: undefined },
  });
});

/**
 * @desc    Delete user account completely
 * @route   DELETE /api/users/me
 * @access  Private
 */
export const deleteProfile = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const user = await User.findById(userId);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  await cascadeDeleteUser(userId);

  res.status(200).json({
    success: true,
    message: "Account and all associated files/data deleted successfully (GDPR compliant)",
  });
});
