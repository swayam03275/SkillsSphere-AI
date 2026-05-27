import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { deleteProfile } from "../controller.js";
import User from "../../../database/models/User.js";
import Resume from "../../../database/models/Resume.js";
import MatchResult from "../../../database/models/MatchResult.js";
import LearningProgress from "../../../database/models/LearningProgress.js";
import JobApplication from "../../../database/models/JobApplication.js";
import CoverLetter from "../../../database/models/CoverLetter.js";
import InterviewSession from "../../../database/models/InterviewSession.js";
import AnalysisHistory from "../../../database/models/AnalysisHistory.js";
import ClassroomSession from "../../../database/models/ClassroomSession.js";
import JobPosting from "../../../database/models/JobPosting.js";
import Notification from "../../../database/models/Notification.js";
import fs from "fs";

describe("deleteProfile", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { _id: new mongoose.Types.ObjectId() },
    };
    res = {
      status: mock.fn(() => res),
      json: mock.fn(),
    };
    next = mock.fn();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("cascades deletion to files and relational models", async () => {
    const mockUser = {
      _id: req.user._id,
      profilePic: "avatar.jpg",
    };

    // Mock MongooseTransaction / Session
    const mockSession = {
      startTransaction: mock.fn(),
      commitTransaction: mock.fn(),
      abortTransaction: mock.fn(),
      endSession: mock.fn(),
    };
    mock.method(mongoose, "startSession", async () => mockSession);

    const mockQueryWithSession = {
      session: mock.fn(() => mockQueryWithSession),
      then: mock.fn((onFulfilled) => onFulfilled([])),
    };

    mock.method(User, "findById", async () => mockUser);
    mock.method(User, "findByIdAndDelete", async () => mockUser);
    
    mock.method(Resume, "find", () => mockQueryWithSession);
    mock.method(Resume, "deleteMany", async () => ({}));
    
    mock.method(MatchResult, "deleteMany", async () => ({}));
    mock.method(MatchResult, "updateMany", async () => ({}));
    mock.method(LearningProgress, "deleteMany", async () => ({}));
    mock.method(JobApplication, "deleteMany", async () => ({}));
    mock.method(CoverLetter, "deleteMany", async () => ({}));
    
    mock.method(InterviewSession, "find", () => mockQueryWithSession);
    mock.method(InterviewSession, "deleteMany", async () => ({}));
    mock.method(InterviewSession, "updateMany", async () => ({}));
    
    mock.method(AnalysisHistory, "deleteMany", async () => ({}));
    mock.method(ClassroomSession, "deleteMany", async () => ({}));
    mock.method(ClassroomSession, "updateMany", async () => ({}));
    
    mock.method(JobPosting, "find", () => mockQueryWithSession);
    mock.method(JobPosting, "deleteMany", async () => ({}));
    
    mock.method(Notification, "deleteMany", async () => ({}));

    mock.method(fs, "existsSync", () => true);
    mock.method(fs, "unlinkSync", () => {});

    await deleteProfile(req, res, next);

    if (next.mock.calls.length > 0) {
      throw next.mock.calls[0].arguments[0];
    }

    assert.equal(res.status.mock.calls.length, 1);
    assert.equal(res.status.mock.calls[0].arguments[0], 200);
    assert.equal(res.json.mock.calls[0].arguments[0].success, true);
  });
});
