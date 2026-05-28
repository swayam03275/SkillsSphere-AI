import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import * as jobService from "../service.js";
import JobPosting from "../../../database/models/JobPosting.js";
import JobApplication from "../../../database/models/JobApplication.js";
import Resume from "../../../database/models/Resume.js";
import AppError from "../../../utils/AppError.js";

describe("Job Service Filtering", () => {
  const mockJobId = "job123";
  const mockRecruiterId = "recruiter123";

  afterEach(() => {
    mock.restoreAll();
  });

  it("should filter applications by minScore and maxScore correctly", async () => {
    const mockJob = { _id: mockJobId, recruiter: { toString: () => mockRecruiterId } };
    const mockApps = [{ _id: "app1", job: mockJobId, aiMatchScore: 88 }];

    mock.method(JobPosting, "findById", async () => mockJob);

    const mockQuery = {
      populate: mock.fn(() => mockQuery),
      sort: mock.fn(() => mockQuery), skip: mock.fn(() => mockQuery), limit: mock.fn(async () => mockApps),
    };
    mock.method(JobApplication, 'find', () => mockQuery); mock.method(JobApplication, 'countDocuments', async () => mockApps ? mockApps.length : 1);

    const filters = { minScore: 80, maxScore: 95 };
    const result = await jobService.getJobApplications(mockJobId, mockRecruiterId, filters);

    assert.equal(JobPosting.findById.mock.calls.length, 1);
    assert.equal(JobApplication.find.mock.calls.length, 1);
    
    const findArgs = JobApplication.find.mock.calls[0].arguments[0];
    assert.equal(findArgs.job, mockJobId);
    assert.deepEqual(findArgs.aiMatchScore, { $gte: 80, $lte: 95 });
    assert.deepEqual(result, { applications: mockApps, totalCount: 1, totalPages: 1, currentPage: 1 });
  });

  it("should filter applications by minAtsScore and maxAtsScore correctly", async () => {
    const mockJob = { _id: mockJobId, recruiter: { toString: () => mockRecruiterId } };
    const mockApps = [{ _id: "app1", job: mockJobId, "matchBreakdown.atsCompatibility": 82 }];

    mock.method(JobPosting, "findById", async () => mockJob);

    const mockQuery = {
      populate: mock.fn(() => mockQuery),
      sort: mock.fn(() => mockQuery), skip: mock.fn(() => mockQuery), limit: mock.fn(async () => mockApps),
    };
    mock.method(JobApplication, 'find', () => mockQuery); mock.method(JobApplication, 'countDocuments', async () => mockApps ? mockApps.length : 1);

    const filters = { minAtsScore: 75, maxAtsScore: 90 };
    const result = await jobService.getJobApplications(mockJobId, mockRecruiterId, filters);

    assert.equal(JobApplication.find.mock.calls.length, 1);
    
    const findArgs = JobApplication.find.mock.calls[0].arguments[0];
    assert.equal(findArgs.job, mockJobId);
    assert.deepEqual(findArgs["matchBreakdown.atsCompatibility"], { $gte: 75, $lte: 90 });
    assert.deepEqual(result, { applications: mockApps, totalCount: 1, totalPages: 1, currentPage: 1 });
  });

  it("should filter applications by matchCategory correctly", async () => {
    const mockJob = { _id: mockJobId, recruiter: { toString: () => mockRecruiterId } };
    const mockApps = [{ _id: "app1", job: mockJobId, matchCategory: "Excellent Match" }];

    mock.method(JobPosting, "findById", async () => mockJob);

    const mockQuery = {
      populate: mock.fn(() => mockQuery),
      sort: mock.fn(() => mockQuery), skip: mock.fn(() => mockQuery), limit: mock.fn(async () => mockApps),
    };
    mock.method(JobApplication, 'find', () => mockQuery); mock.method(JobApplication, 'countDocuments', async () => mockApps ? mockApps.length : 1);

    const filters = { matchCategory: "excellent,moderate" };
    const result = await jobService.getJobApplications(mockJobId, mockRecruiterId, filters);

    assert.equal(JobApplication.find.mock.calls.length, 1);
    
    const findArgs = JobApplication.find.mock.calls[0].arguments[0];
    assert.equal(findArgs.job, mockJobId);
    assert.deepEqual(findArgs.matchCategory, { $in: ["Excellent Match", "Moderate Match"] });
    assert.deepEqual(result, { applications: mockApps, totalCount: 1, totalPages: 1, currentPage: 1 });
  });

  it("should filter applications by contributorOnly correctly", async () => {
    const mockJob = { _id: mockJobId, recruiter: { toString: () => mockRecruiterId } };
    const mockApps = [{ _id: "app1", job: mockJobId, "matchBreakdown.contributionActivity": "High" }];

    mock.method(JobPosting, "findById", async () => mockJob);

    const mockQuery = {
      populate: mock.fn(() => mockQuery),
      sort: mock.fn(() => mockQuery), skip: mock.fn(() => mockQuery), limit: mock.fn(async () => mockApps),
    };
    mock.method(JobApplication, 'find', () => mockQuery); mock.method(JobApplication, 'countDocuments', async () => mockApps ? mockApps.length : 1);

    const filters = { contributorOnly: "true" };
    const result = await jobService.getJobApplications(mockJobId, mockRecruiterId, filters);

    assert.equal(JobApplication.find.mock.calls.length, 1);
    
    const findArgs = JobApplication.find.mock.calls[0].arguments[0];
    assert.equal(findArgs.job, mockJobId);
    assert.deepEqual(findArgs["matchBreakdown.contributionActivity"], { $in: ["High", "Medium"] });
    assert.deepEqual(result, { applications: mockApps, totalCount: 1, totalPages: 1, currentPage: 1 });
  });

  it("should filter applications by careerReadiness correctly", async () => {
    const mockJob = { _id: mockJobId, recruiter: { toString: () => mockRecruiterId } };
    const mockApps = [{ _id: "app1", job: mockJobId, "matchBreakdown.careerReadiness": "High" }];

    mock.method(JobPosting, "findById", async () => mockJob);

    const mockQuery = {
      populate: mock.fn(() => mockQuery),
      sort: mock.fn(() => mockQuery), skip: mock.fn(() => mockQuery), limit: mock.fn(async () => mockApps),
    };
    mock.method(JobApplication, 'find', () => mockQuery); mock.method(JobApplication, 'countDocuments', async () => mockApps ? mockApps.length : 1);

    const filters = { careerReadiness: "High,Medium" };
    const result = await jobService.getJobApplications(mockJobId, mockRecruiterId, filters);

    assert.equal(JobApplication.find.mock.calls.length, 1);
    
    const findArgs = JobApplication.find.mock.calls[0].arguments[0];
    assert.equal(findArgs.job, mockJobId);
    assert.deepEqual(findArgs["matchBreakdown.careerReadiness"], { $in: ["High", "Medium"] });
    assert.deepEqual(result, { applications: mockApps, totalCount: 1, totalPages: 1, currentPage: 1 });
  });

  it("should filter applications by specialization correctly using Resume subquery", async () => {
    const mockJob = { _id: mockJobId, recruiter: { toString: () => mockRecruiterId } };
    const mockApps = [{ _id: "app1", job: mockJobId, resume: "resume123" }];
    const mockResumes = [{ _id: "resume123" }, { _id: "resume456" }];

    mock.method(JobPosting, "findById", async () => mockJob);
    mock.method(Resume, "find", () => ({
      select: mock.fn(() => ({
        lean: mock.fn(async () => mockResumes)
      }))
    }));

    const mockQuery = {
      populate: mock.fn(() => mockQuery),
      sort: mock.fn(() => mockQuery), skip: mock.fn(() => mockQuery), limit: mock.fn(async () => mockApps),
    };
    mock.method(JobApplication, 'find', () => mockQuery); mock.method(JobApplication, 'countDocuments', async () => mockApps ? mockApps.length : 1);

    const filters = { specialization: "frontend" };
    const result = await jobService.getJobApplications(mockJobId, mockRecruiterId, filters);

    assert.equal(Resume.find.mock.calls.length, 1);
    assert.equal(JobApplication.find.mock.calls.length, 1);
    
    const findArgs = JobApplication.find.mock.calls[0].arguments[0];
    assert.equal(findArgs.job, mockJobId);
    assert.deepEqual(findArgs.resume, { $in: ["resume123", "resume456"] });
    assert.deepEqual(result, { applications: mockApps, totalCount: 1, totalPages: 1, currentPage: 1 });
  });
});
