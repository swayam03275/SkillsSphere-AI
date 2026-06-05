import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { safeDeleteAvatarByUrl, safeDeletePhysicalFile } from "./fileUtils.js";
import { deleteCloudinaryAsset } from "../config/cloudinary.js";
import User from "../database/models/User.js";
import Resume from "../database/models/Resume.js";
import MatchResult from "../database/models/MatchResult.js";
import LearningProgress from "../database/models/LearningProgress.js";
import JobApplication from "../database/models/JobApplication.js";
import CoverLetter from "../database/models/CoverLetter.js";
import InterviewSession from "../database/models/InterviewSession.js";
import AnalysisHistory from "../database/models/AnalysisHistory.js";
import ClassroomSession from "../database/models/ClassroomSession.js";
import JobPosting from "../database/models/JobPosting.js";
import Notification from "../database/models/Notification.js";
import RoadmapComment from "../database/models/RoadmapComment.js";

import logger from "./logger.js";

/**
 * Sweeps and deletes all physical files and MongoDB documents associated with a user.
 * This ensures GDPR compliance and prevents storage bloat.
 * 
 * @param {string|mongoose.Types.ObjectId} userId - The ID of the user to delete
 * @returns {Promise<void>}
 */
export const cascadeDeleteUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    return;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  let resumes = [];
  let interviewSessions = [];
  
  const userIdStr = userId.toString();
  const userIdObj = new mongoose.Types.ObjectId(userIdStr);

  try {
    // 2. Find and delete user resumes
    resumes = await Resume.find({ user: userId }).session(session);
    await Resume.deleteMany({ user: userId }, { session });

    // 3. Find and delete user interview sessions
    interviewSessions = await InterviewSession.find({ userId }).session(session);
    await InterviewSession.deleteMany({ userId }, { session });
    
    // Clear user from conductor and observer roles in other sessions
    await InterviewSession.updateMany(
      { conductorId: userId },
      { $unset: { conductorId: "" } },
      { session }
    );
    await InterviewSession.updateMany(
      { observers: userId },
      { $pull: { observers: userId } },
      { session }
    );

    // 4. Delete other student-related relational data
    await Notification.deleteMany({ userId }, { session });
    await MatchResult.deleteMany({ user: userId }, { session });
    await LearningProgress.deleteMany({ user: userId }, { session });
    await JobApplication.deleteMany({ applicant: userId }, { session });
    await CoverLetter.deleteMany({ user: userId }, { session });
    await AnalysisHistory.deleteMany({ user: userId }, { session });
    await RoadmapComment.deleteMany({ sender: userId }, { session });
    await ClassroomSession.deleteMany({ host: userId }, { session });

    // Remove the deleted user from the participants list of any classroom
    // session they joined as a guest. The user.id field in participants is
    // stored as a plain string (see classrooms/socket.js).
    await ClassroomSession.updateMany(
      { "participants.user.id": userIdStr },
      { $pull: { participants: { "user.id": userIdStr } } },
      { session }
    );

    // Remove chat messages sent by this user in other classrooms
    await ClassroomSession.updateMany(
      { 
        $or: [
          { "chatHistory.sender.id": userIdStr },
          { "chatHistory.sender.id": userIdObj }
        ]
      },
      { 
        $pull: { 
          chatHistory: { 
            $or: [
              { "sender.id": userIdStr },
              { "sender.id": userIdObj }
            ]
          } 
        } 
      },
      { session }
    );

    // 5. If recruiter: delete posted jobs and cascading applications to them
    const postedJobs = await JobPosting.find({ recruiter: userId }).session(session);
    if (postedJobs.length > 0) {
      const jobIds = postedJobs.map((j) => j._id);
      await JobApplication.deleteMany({ job: { $in: jobIds } }, { session });
      
      // Clean up orphaned match results recommendations referencing these jobs
      await MatchResult.updateMany(
        { "recommendations.job": { $in: jobIds } },
        { $pull: { recommendations: { job: { $in: jobIds } } } },
        { session }
      );
      
      await JobPosting.deleteMany({ recruiter: userId }, { session });
    }

    // 6. Delete User document itself
    await User.findByIdAndDelete(userId, { session });

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    logger.error("Transaction aborted in cascadeDeleteUser:", error);
    throw error;
  } finally {
    session.endSession();
  }

  // 1. Delete profile picture from Cloudinary, or from disk for legacy local avatars.
  if (user.profilePicPublicId) {
    await deleteCloudinaryAsset(user.profilePicPublicId).catch((error) => {
      logger.error("[cascadeDeleteUser] Failed to delete Cloudinary avatar:", error.message);
    });
  } else {
    safeDeleteAvatarByUrl(user.profilePic);
  }

  // Delete physical PDF/DOCX files
  for (const resume of resumes) {
    if (resume.file && resume.file.path) {
      safeDeletePhysicalFile(resume.file.path);
    }
  }

  // Delete physical audio files
  for (const interviewSession of interviewSessions) {
    if (interviewSession.answers && Array.isArray(interviewSession.answers)) {
      for (const answer of interviewSession.answers) {
        if (answer.audioPath) {
          safeDeletePhysicalFile(answer.audioPath);
        }
      }
    }
  }
};
