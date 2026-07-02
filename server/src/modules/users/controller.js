import User from "../../database/models/User.js";
import bcrypt from "bcryptjs";
import Resume from "../../database/models/Resume.js";
import MatchResult from "../../database/models/MatchResult.js";
import LearningProgress from "../../database/models/LearningProgress.js";
import JobApplication from "../../database/models/JobApplication.js";
import CoverLetter from "../../database/models/CoverLetter.js";
import InterviewSession from "../../database/models/InterviewSession.js";
import AnalysisHistory from "../../database/models/AnalysisHistory.js";
import ClassroomSession from "../../database/models/ClassroomSession.js";
import JobPosting from "../../database/models/JobPosting.js";
import fsPromises from "fs/promises";
import AppError from "../../utils/AppError.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { cascadeDeleteUser } from "../../utils/cascadeDelete.js";

import { safeDeleteAvatarByUrl } from "../../utils/fileUtils.js";
import { deleteCloudinaryAsset, uploadAvatarBuffer } from "../../config/cloudinary.js";

import logger from "../../utils/logger.js";

export const DEFAULT_USER_PREFERENCES = {
  notifications: {
    emailNotifications: true,
    inAppNotifications: true,
    interviewReminders: true,
    jobUpdates: true,
    resumeAnalysis: true,
    systemAlerts: true,
  },
  emailFrequency: "weekly",
  privacy: {
    profileVisibility: "recruiters",
    showResumeToRecruiters: true,
    showInterviewHistory: false,
    allowPersonalizedRecommendations: true,
  },
};

const NOTIFICATION_KEYS = Object.keys(DEFAULT_USER_PREFERENCES.notifications);
const PRIVACY_KEYS = Object.keys(DEFAULT_USER_PREFERENCES.privacy);
const TOP_LEVEL_KEYS = ["notifications", "emailFrequency", "privacy"];
const EMAIL_FREQUENCIES = ["instant", "daily", "weekly", "never"];
const PROFILE_VISIBILITIES = ["public", "recruiters", "private"];

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const toPlainPreferences = (preferences = {}) =>
  typeof preferences?.toObject === "function" ? preferences.toObject() : preferences || {};

const normalizeNotificationPreferences = (notifications = {}) => {
  if (!isPlainObject(notifications)) return {};

  const normalized = {
    emailNotifications: notifications.emailNotifications,
    inAppNotifications: notifications.inAppNotifications,
    interviewReminders: notifications.interviewReminders,
    jobUpdates: notifications.jobUpdates ?? notifications.jobAlerts,
    resumeAnalysis: notifications.resumeAnalysis,
    systemAlerts: notifications.systemAlerts ?? notifications.platformUpdates,
  };

  return Object.fromEntries(
    Object.entries(normalized).filter(([, value]) => value !== undefined),
  );
};

export const getDefaultPreferences = () => ({
  notifications: { ...DEFAULT_USER_PREFERENCES.notifications },
  emailFrequency: DEFAULT_USER_PREFERENCES.emailFrequency,
  privacy: { ...DEFAULT_USER_PREFERENCES.privacy },
});

export const mergePreferencesWithDefaults = (preferences = {}) => {
  const plain = toPlainPreferences(preferences);

  return {
    notifications: {
      ...DEFAULT_USER_PREFERENCES.notifications,
      ...normalizeNotificationPreferences(plain.notifications),
    },
    emailFrequency: plain.emailFrequency || DEFAULT_USER_PREFERENCES.emailFrequency,
    privacy: {
      ...DEFAULT_USER_PREFERENCES.privacy,
      ...(isPlainObject(plain.privacy) ? plain.privacy : {}),
    },
  };
};

const rejectUnknownKeys = (payload, allowedKeys, label) => {
  const unknownKeys = Object.keys(payload).filter((key) => !allowedKeys.includes(key));
  if (unknownKeys.length > 0) {
    throw new AppError(`Unknown ${label} field: ${unknownKeys[0]}`, 400);
  }
};

export const validateAndMergePreferences = (currentPreferences = {}, payload = {}) => {
  if (!isPlainObject(payload)) {
    throw new AppError("Preferences payload must be an object", 400);
  }

  rejectUnknownKeys(payload, TOP_LEVEL_KEYS, "preferences");

  const nextPreferences = mergePreferencesWithDefaults(currentPreferences);

  if (payload.notifications !== undefined) {
    if (!isPlainObject(payload.notifications)) {
      throw new AppError("Notification preferences must be an object", 400);
    }

    rejectUnknownKeys(payload.notifications, NOTIFICATION_KEYS, "notification preference");

    NOTIFICATION_KEYS.forEach((key) => {
      if (payload.notifications[key] !== undefined) {
        if (typeof payload.notifications[key] !== "boolean") {
          throw new AppError(`${key} must be a boolean`, 400);
        }
        nextPreferences.notifications[key] = payload.notifications[key];
      }
    });
  }

  if (payload.emailFrequency !== undefined) {
    if (!EMAIL_FREQUENCIES.includes(payload.emailFrequency)) {
      throw new AppError("Invalid email frequency", 400);
    }
    nextPreferences.emailFrequency = payload.emailFrequency;
  }

  if (payload.privacy !== undefined) {
    if (!isPlainObject(payload.privacy)) {
      throw new AppError("Privacy settings must be an object", 400);
    }

    rejectUnknownKeys(payload.privacy, PRIVACY_KEYS, "privacy setting");

    PRIVACY_KEYS.forEach((key) => {
      if (payload.privacy[key] === undefined) return;

      if (key === "profileVisibility") {
        if (!PROFILE_VISIBILITIES.includes(payload.privacy[key])) {
          throw new AppError("Invalid profile visibility", 400);
        }
        nextPreferences.privacy[key] = payload.privacy[key];
        return;
      }

      if (typeof payload.privacy[key] !== "boolean") {
        throw new AppError(`${key} must be a boolean`, 400);
      }
      nextPreferences.privacy[key] = payload.privacy[key];
    });
  }

  return nextPreferences;
};

/**
 * @desc    Get current user preferences
 * @route   GET /api/users/preferences
 * @access  Private
 */
export const getPreferences = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select("preferences");

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    success: true,
    preferences: mergePreferencesWithDefaults(user.preferences),
  });
});

/**
 * @desc    Update current user preferences
 * @route   PUT /api/users/preferences
 * @access  Private
 */
export const updatePreferences = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select("preferences");

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  let preferences = mergePreferencesWithDefaults(user.preferences);
  
  // Since validateBody(updatePreferencesSchema) already stripped unknown keys and validated types,
  // we can safely merge req.body.
  if (req.body.notifications) {
    preferences.notifications = { ...preferences.notifications, ...req.body.notifications };
  }
  if (req.body.emailFrequency) {
    preferences.emailFrequency = req.body.emailFrequency;
  }
  if (req.body.privacy) {
    preferences.privacy = { ...preferences.privacy, ...req.body.privacy };
  }

  user.preferences = preferences;
  await user.save({ validateModifiedOnly: true });

  res.status(200).json({
    success: true,
    message: "Preferences updated successfully",
    preferences: mergePreferencesWithDefaults(user.preferences),
  });
});

/**
 * @desc    Onboard user (set name, role, and isOnboarded flag)
 * @route   PUT /api/users/onboard
 * @access  Private
 */
export const onboardUser = asyncHandler(async (req, res, next) => {
  if (req.user.isOnboarded) {
    return next(new AppError("User has already completed onboarding", 400));
  }

  const { name, role } = req.body;

  const accessLevel = (role === "recruiter" || role === "tutor") ? "pending" : "full";

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { 
      name: name.trim(),
      role: role,
      isOnboarded: true,
      accessLevel,
    },
    { new: true, runValidators: true }
  ).select("-password -__v");

  if (!updatedUser) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Onboarding completed successfully",
    user: updatedUser,
  });
});

/**
 * @desc    Update user profile details
 * @route   PUT /api/users/me
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res, next) => {
  const { name, company, companyWebsite, linkedinUrl, credentialUrl } = req.body;
  const updateData = {};
  if (name !== undefined) {
    updateData.name = name.trim();
  }

  // Handle linkedinUrl and credentialUrl for recruiter and tutor roles
  if (req.user.role === "recruiter" || req.user.role === "tutor") {
    if (linkedinUrl !== undefined) {
      updateData.linkedinUrl =
        typeof linkedinUrl === "string" && linkedinUrl.trim()
          ? linkedinUrl.trim()
          : null;
    }
    if (credentialUrl !== undefined) {
      updateData.credentialUrl =
        typeof credentialUrl === "string" && credentialUrl.trim()
          ? credentialUrl.trim()
          : null;
    }
  }

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
  { $set: updateData },
  { new: true, runValidators: true }
).select("-password -__v");

  if (!updatedUser) {
    return next(new AppError("User not found", 404));
  }

  // Recalculate verification status for recruiter and tutor roles
  if (updatedUser.role === "recruiter" || updatedUser.role === "tutor") {
    let shouldBeVerified = false;

    if (updatedUser.role === "recruiter") {
      // recruiter: linkedinUrl non-empty AND (company OR credentialUrl) non-empty
      shouldBeVerified = !!updatedUser.linkedinUrl &&
        (!!updatedUser.company || !!updatedUser.credentialUrl);
    } else if (updatedUser.role === "tutor") {
      // tutor: linkedinUrl non-empty AND credentialUrl non-empty
      shouldBeVerified = !!updatedUser.linkedinUrl && !!updatedUser.credentialUrl;
    }

    const targetAccessLevel = shouldBeVerified ? "full" : "pending";

    // Update accessLevel if it changed
    if (updatedUser.accessLevel !== targetAccessLevel) {
      const finalUser = await User.findByIdAndUpdate(
        req.user._id,
        { accessLevel: targetAccessLevel },
        { new: true, runValidators: true }
      ).select("-password -__v");

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        user: finalUser,
      });
    }
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
  if (!req.file?.buffer && !req.file?.path) {
    return next(new AppError("No image file provided", 400));
  }

  const currentUser = await User.findById(req.user._id);
  if (!currentUser) {
    return next(new AppError("User not found", 404));
  }

  const uploadBuffer = req.file.buffer ?? (await fsPromises.readFile(req.file.path));
  let uploadedAvatar;
  const previousPublicId = currentUser.profilePicPublicId;
  const previousProfilePic = currentUser.profilePic;

  try {
    uploadedAvatar = await uploadAvatarBuffer(uploadBuffer, req.user._id);

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
        logger.error("[uploadAvatar] Failed to clean up orphaned Cloudinary avatar:", error.message);
      });
      return next(new AppError("User not found", 404));
    }

    if (previousPublicId) {
      await deleteCloudinaryAsset(previousPublicId).catch((error) => {
        logger.error("[uploadAvatar] Failed to delete previous Cloudinary avatar:", error.message);
      });
    } else {
      safeDeleteAvatarByUrl(previousProfilePic);
    }

    res.status(200).json({
      success: true,
      message: "Profile photo updated",
      user: updatedUser,
    });
  } finally {
    if (req.file?.path) {
      await fsPromises.unlink(req.file.path).catch(() => {});
    }
  }
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
      logger.error("[removeAvatar] Failed to delete Cloudinary avatar:", error.message);
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

/**
 * @desc    Update user password
 * @route   PUT /api/users/me/password
 * @access  Private
 */
export const updatePassword = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(userId);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  if (user.provider !== "local") {
    return next(new AppError("Accounts using social login cannot update password directly", 400));
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return next(new AppError("Incorrect current password", 401));
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  user.password = hashedPassword;
  user.passwordChangedAt = new Date();
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
});
