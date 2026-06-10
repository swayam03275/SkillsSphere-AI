import assert from "node:assert/strict";
import test, { mock } from "node:test";
import fs from "fs";
import mongoose from "mongoose";
import Notification from "../../database/models/Notification.js";
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
import RoadmapComment from "../../database/models/RoadmapComment.js";
import { cascadeDeleteUser } from "../cascadeDelete.js";

test("cascadeDeleteUser sweeps all physical files and databases", async () => {
  const userId = new mongoose.Types.ObjectId();
  const mockUser = {
    _id: userId,
    profilePic: "http://localhost:5000/uploads/avatars/user-avatar.jpg",
  };

  const mockResume = {
    _id: new mongoose.Types.ObjectId(),
    user: userId,
    file: {
      path: "src/uploads/resumes/resume.pdf"
    }
  };

  const mockInterviewSession = {
    _id: new mongoose.Types.ObjectId(),
    userId: userId,
    answers: [
      {
        audioPath: "src/uploads/interviews/audio.webm"
      }
    ]
  };

  const mockJobPosting = {
    _id: new mongoose.Types.ObjectId(),
    recruiter: userId,
  };

  // Mock Mongoose Query / Methods
  mock.method(mongoose, "startSession", async () => ({
    startTransaction: () => {},
    commitTransaction: async () => {},
    abortTransaction: async () => {},
    endSession: () => {}
  }));
  mock.method(Notification, "deleteMany", async () => ({ deletedCount: 1 }));
  mock.method(User, "findById", async () => mockUser);
  mock.method(User, "findByIdAndDelete", async () => mockUser);

  mock.method(Resume, "find", () => ({ session: async () => [mockResume] }));
  mock.method(Resume, "deleteMany", async () => ({ deletedCount: 1 }));

  mock.method(MatchResult, "deleteMany", async () => ({ deletedCount: 1 }));
  mock.method(MatchResult, "updateMany", async () => ({ modifiedCount: 1 }));
  mock.method(LearningProgress, "deleteMany", async () => ({ deletedCount: 1 }));
  mock.method(JobApplication, "deleteMany", async () => ({ deletedCount: 1 }));
  mock.method(CoverLetter, "deleteMany", async () => ({ deletedCount: 1 }));
  mock.method(InterviewSession, "find", () => ({ session: async () => [mockInterviewSession] }));
  mock.method(InterviewSession, "deleteMany", async () => ({ deletedCount: 1 }));
  mock.method(InterviewSession, "updateMany", async () => ({ modifiedCount: 1 }));
  mock.method(AnalysisHistory, "deleteMany", async () => ({ deletedCount: 1 }));
  mock.method(ClassroomSession, "deleteMany", async () => ({ deletedCount: 1 }));
  mock.method(ClassroomSession, "updateMany", async () => ({ modifiedCount: 1 }));
  mock.method(RoadmapComment, "deleteMany", async () => ({ deletedCount: 1 }));

  mock.method(JobPosting, "find", () => ({ session: async () => [mockJobPosting] }));
  mock.method(JobPosting, "deleteMany", async () => ({ deletedCount: 1 }));
  mock.method(RoadmapComment, "deleteMany", async () => ({ deletedCount: 1 }));

  // Mock File System operations
  const unlinkedFiles = [];
  mock.method(fs, "existsSync", () => true);
  mock.method(fs, "unlinkSync", (filePath) => {
    unlinkedFiles.push(filePath);
  });

  // Execute utility
  await cascadeDeleteUser(userId);

  // Assert that fs.unlinkSync was called for avatar, resume, and interview audio
  assert.equal(unlinkedFiles.length, 3, "Should unlink 3 physical files");
  assert.ok(unlinkedFiles[0].endsWith("user-avatar.jpg"), "Should unlink avatar");
  assert.ok(unlinkedFiles[1].endsWith("resume.pdf"), "Should unlink resume file");
  assert.ok(unlinkedFiles[2].endsWith("audio.webm"), "Should unlink interview audio file");
});
