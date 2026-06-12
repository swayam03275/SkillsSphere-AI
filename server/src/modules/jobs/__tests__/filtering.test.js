import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import * as jobService from "../service.js";
import JobPosting from "../../../database/models/JobPosting.js";
import JobApplication from "../../../database/models/JobApplication.js";
import Resume from "../../../database/models/Resume.js";
import User from "../../../database/models/User.js";
import AppError from "../../../utils/AppError.js";
import mongoose from "mongoose";
describe("Job Service Filtering", () => {
  const mockJobId = new mongoose.Types.ObjectId();
  const mockRecruiterId = "recruiter123";
  let savedDistinct;

  afterEach(() => {
    mock.restoreAll();
    if (savedDistinct !== undefined) {
      JobApplication.distinct = savedDistinct;
      savedDistinct = undefined;
    }
  });

  it("should filter applications by minScore and maxScore correctly", async () => {
    const mockJob = { _id: mockJobId, recruiter: { toString: () => mockRecruiterId } };
    const mockApps = [{ _id: "app1", job: mockJobId, aiMatchScore: 88 }];

    mock.method(JobPosting, "findById", async () => mockJob);

    const mockQuery = {
      populate: mock.fn(() => mockQuery),
      sort: mock.fn(() => mockQuery),
      skip: mock.fn(() => mockQuery),
      limit: mock.fn(() => mockQuery),
      select: mock.fn(() => mockQuery),
      lean: mock.fn(async () => mockApps),
    };
    mockQuery.then = function(resolve) { resolve(mockApps); };
    mock.method(JobApplication, "find", () => mockQuery);
    mock.method(JobApplication, "countDocuments", async () => 1);

    const filters = { minScore: 80, maxScore: 95 };
    const result = await jobService.getJobApplications(mockJobId, mockRecruiterId, filters);

    assert.equal(JobPosting.findById.mock.calls.length, 1);
    assert.equal(JobApplication.find.mock.calls.length, 1);
    
    const findArgs = JobApplication.find.mock.calls[0].arguments[0];
    assert.equal(findArgs.job, mockJobId);
    assert.deepEqual(findArgs.aiMatchScore, { $gte: 80, $lte: 95 });
    assert.deepEqual(result.applications, mockApps);
    assert.equal(result.totalCount, 1);
  });

  it("should filter applications by minAtsScore and maxAtsScore correctly", async () => {
    const mockJob = { _id: mockJobId, recruiter: { toString: () => mockRecruiterId } };
    const mockApps = [{ _id: "app1", job: mockJobId, "matchBreakdown.atsCompatibility": 82 }];

    mock.method(JobPosting, "findById", async () => mockJob);

    const mockQuery = {
      populate: mock.fn(() => mockQuery),
      sort: mock.fn(() => mockQuery),
      skip: mock.fn(() => mockQuery),
      limit: mock.fn(() => mockQuery),
      select: mock.fn(() => mockQuery),
      lean: mock.fn(async () => mockApps),
    };
    mockQuery.then = function(resolve) { resolve(mockApps); };
    mock.method(JobApplication, "find", () => mockQuery);
    mock.method(JobApplication, "countDocuments", async () => 1);

    const filters = { minAtsScore: 75, maxAtsScore: 90 };
    const result = await jobService.getJobApplications(mockJobId, mockRecruiterId, filters);

    assert.equal(JobApplication.find.mock.calls.length, 1);
    
    const findArgs = JobApplication.find.mock.calls[0].arguments[0];
    assert.equal(findArgs.job, mockJobId);
    assert.deepEqual(findArgs["matchBreakdown.atsCompatibility"], { $gte: 75, $lte: 90 });
    assert.deepEqual(result.applications, mockApps);
    assert.equal(result.totalCount, 1);
  });

  it("should filter applications by matchCategory correctly", async () => {
    const mockJob = { _id: mockJobId, recruiter: { toString: () => mockRecruiterId } };
    const mockApps = [{ _id: "app1", job: mockJobId, matchCategory: "Excellent Match" }];

    mock.method(JobPosting, "findById", async () => mockJob);

    const mockQuery = {
      populate: mock.fn(() => mockQuery),
      sort: mock.fn(() => mockQuery),
      skip: mock.fn(() => mockQuery),
      limit: mock.fn(() => mockQuery),
      select: mock.fn(() => mockQuery),
      lean: mock.fn(async () => mockApps),
    };
    mockQuery.then = function(resolve) { resolve(mockApps); };
    mock.method(JobApplication, "find", () => mockQuery);
    mock.method(JobApplication, "countDocuments", async () => 1);

    const filters = { matchCategory: "excellent,moderate" };
    const result = await jobService.getJobApplications(mockJobId, mockRecruiterId, filters);

    assert.equal(JobApplication.find.mock.calls.length, 1);
    
    const findArgs = JobApplication.find.mock.calls[0].arguments[0];
    assert.equal(findArgs.job, mockJobId);
    assert.deepEqual(findArgs.matchCategory, { $in: ["Excellent Match", "Moderate Match"] });
    assert.deepEqual(result.applications, mockApps);
    assert.equal(result.totalCount, 1);
  });

  it("should filter applications by contributorOnly correctly", async () => {
    const mockJob = { _id: mockJobId, recruiter: { toString: () => mockRecruiterId } };
    const mockApps = [{ _id: "app1", job: mockJobId, "matchBreakdown.contributionActivity": "High" }];

    mock.method(JobPosting, "findById", async () => mockJob);

    const mockQuery = {
      populate: mock.fn(() => mockQuery),
      sort: mock.fn(() => mockQuery),
      skip: mock.fn(() => mockQuery),
      limit: mock.fn(() => mockQuery),
      select: mock.fn(() => mockQuery),
      lean: mock.fn(async () => mockApps),
    };
    mockQuery.then = function(resolve) { resolve(mockApps); };
    mock.method(JobApplication, "find", () => mockQuery);
    mock.method(JobApplication, "countDocuments", async () => 1);

    const filters = { contributorOnly: "true" };
    const result = await jobService.getJobApplications(mockJobId, mockRecruiterId, filters);

    assert.equal(JobApplication.find.mock.calls.length, 1);
    
    const findArgs = JobApplication.find.mock.calls[0].arguments[0];
    assert.equal(findArgs.job, mockJobId);
    assert.deepEqual(findArgs["matchBreakdown.contributionActivity"], { $in: ["High", "Medium"] });
    assert.deepEqual(result.applications, mockApps);
    assert.equal(result.totalCount, 1);
  });

  it("should filter applications by careerReadiness correctly", async () => {
    const mockJob = { _id: mockJobId, recruiter: { toString: () => mockRecruiterId } };
    const mockApps = [{ _id: "app1", job: mockJobId, "matchBreakdown.careerReadiness": "High" }];

    mock.method(JobPosting, "findById", async () => mockJob);

    const mockQuery = {
      populate: mock.fn(() => mockQuery),
      sort: mock.fn(() => mockQuery),
      skip: mock.fn(() => mockQuery),
      limit: mock.fn(() => mockQuery),
      select: mock.fn(() => mockQuery),
      lean: mock.fn(async () => mockApps),
    };
    mockQuery.then = function(resolve) { resolve(mockApps); };
    mock.method(JobApplication, "find", () => mockQuery);
    mock.method(JobApplication, "countDocuments", async () => 1);

    const filters = { careerReadiness: "High,Medium" };
    const result = await jobService.getJobApplications(mockJobId, mockRecruiterId, filters);

    assert.equal(JobApplication.find.mock.calls.length, 1);
    
    const findArgs = JobApplication.find.mock.calls[0].arguments[0];
    assert.equal(findArgs.job, mockJobId);
    assert.deepEqual(findArgs["matchBreakdown.careerReadiness"], { $in: ["High", "Medium"] });
    assert.deepEqual(result.applications, mockApps);
    assert.equal(result.totalCount, 1);
  });

  it("should filter applications by applicant name or email search", async () => {
    const mockJob = { _id: mockJobId, recruiter: { toString: () => mockRecruiterId } };
    const applicantId = new mongoose.Types.ObjectId();
    const mockApps = [{ _id: "app1", job: mockJobId, applicant: applicantId }];

    mock.method(JobPosting, "findById", async () => mockJob);
    mock.method(User, "find", () => ({
      select: mock.fn(() => ({
        lean: mock.fn(async () => [{ _id: applicantId }])
      }))
    }));

    const mockQuery = {
      populate: mock.fn(() => mockQuery),
      sort: mock.fn(() => mockQuery),
      skip: mock.fn(() => mockQuery),
      limit: mock.fn(() => mockQuery),
      select: mock.fn(() => mockQuery),
      lean: mock.fn(async () => mockApps),
    };
    mockQuery.then = function(resolve) { resolve(mockApps); };
    mock.method(JobApplication, "find", () => mockQuery);
    mock.method(JobApplication, "countDocuments", async () => 1);

    const result = await jobService.getJobApplications(mockJobId, mockRecruiterId, { q: "asha@example.com" });

    assert.equal(User.find.mock.calls.length, 1);
    assert.equal(JobApplication.find.mock.calls.length, 1);

    const findArgs = JobApplication.find.mock.calls[0].arguments[0];
    assert.equal(findArgs.job, mockJobId);
    assert.deepEqual(findArgs.applicant, { $in: [applicantId] });
    assert.deepEqual(result.applications, mockApps);
    assert.equal(result.totalCount, 1);
  });

  it("should filter applications by applied date range", async () => {
    const mockJob = { _id: mockJobId, recruiter: { toString: () => mockRecruiterId } };
    const mockApps = [{ _id: "app1", job: mockJobId, createdAt: new Date("2026-06-10T12:00:00Z") }];

    mock.method(JobPosting, "findById", async () => mockJob);

    const mockQuery = {
      populate: mock.fn(() => mockQuery),
      sort: mock.fn(() => mockQuery),
      skip: mock.fn(() => mockQuery),
      limit: mock.fn(() => mockQuery),
      select: mock.fn(() => mockQuery),
      lean: mock.fn(async () => mockApps),
    };
    mockQuery.then = function(resolve) { resolve(mockApps); };
    mock.method(JobApplication, "find", () => mockQuery);
    mock.method(JobApplication, "countDocuments", async () => 1);

    const result = await jobService.getJobApplications(mockJobId, mockRecruiterId, {
      appliedFrom: "2026-06-01",
      appliedTo: "2026-06-30",
    });

    assert.equal(JobApplication.find.mock.calls.length, 1);

    const findArgs = JobApplication.find.mock.calls[0].arguments[0];
    const expectedFrom = new Date("2026-06-01");
    expectedFrom.setHours(0, 0, 0, 0);
    const expectedTo = new Date("2026-06-30");
    expectedTo.setHours(23, 59, 59, 999);

    assert.equal(findArgs.job, mockJobId);
    assert.equal(findArgs.createdAt.$gte.getTime(), expectedFrom.getTime());
    assert.equal(findArgs.createdAt.$lte.getTime(), expectedTo.getTime());
    assert.deepEqual(result.applications, mockApps);
    assert.equal(result.totalCount, 1);
  });

  it("should filter applications by specialization correctly using Resume subquery", async () => {
    const mockJob = { _id: mockJobId, recruiter: { toString: () => mockRecruiterId } };
    const resumeId1 = new mongoose.Types.ObjectId();
    const resumeId2 = new mongoose.Types.ObjectId();
    const mockApps = [{ _id: "app1", job: mockJobId, resume: resumeId1 }];
    const mockResumes = [{ _id: resumeId1 }, { _id: resumeId2 }];

    mock.method(JobPosting, "findById", async () => mockJob);
    mock.method(Resume, "find", () => ({
      select: mock.fn(() => ({
        lean: mock.fn(async () => mockResumes)
      }))
    }));

    const mockQuery = {
      populate: mock.fn(() => mockQuery),
      sort: mock.fn(() => mockQuery),
      skip: mock.fn(() => mockQuery),
      limit: mock.fn(() => mockQuery),
      select: mock.fn(() => mockQuery),
      lean: mock.fn(async () => mockApps),
    };
    mockQuery.then = function(resolve) { resolve(mockApps); };
    mock.method(JobApplication, "find", () => mockQuery);
    mock.method(JobApplication, "countDocuments", async () => 1);
    savedDistinct = JobApplication.distinct;
    JobApplication.distinct = async () => [resumeId1, resumeId2];
    mock.method(JobApplication, "distinct", async () => [resumeId1, resumeId2]);

    const filters = { specialization: "frontend" };
    const result = await jobService.getJobApplications(mockJobId, mockRecruiterId, filters);

    assert.equal(Resume.find.mock.calls.length, 1);
    assert.equal(JobApplication.find.mock.calls.length, 1);
    
    const findArgs = JobApplication.find.mock.calls[0].arguments[0];
    assert.equal(findArgs.job, mockJobId);
    assert.deepEqual(findArgs.resume, { $in: [resumeId1, resumeId2] });
    assert.deepEqual(result.applications, mockApps);
    assert.equal(result.totalCount, 1);
  });
});
