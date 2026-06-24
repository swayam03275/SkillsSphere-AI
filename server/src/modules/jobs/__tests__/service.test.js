import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import * as jobService from "../service.js";
import JobPosting from "../../../database/models/JobPosting.js";
import JobApplication from "../../../database/models/JobApplication.js";
import Resume from "../../../database/models/Resume.js";
import AppError from "../../../utils/AppError.js";
import Notification from "../../../database/models/Notification.js";
import * as resumeService from "../../resumes/service.js";
import matchingService from "../../matching/service.js";
import mongoose from "mongoose";

describe("Job Service", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  describe("createJob", () => {
    it("should successfully create a job posting", async () => {
      const mockJobData = { title: "Software Engineer", skills: ["React", "Node"] };
      const mockRecruiterId = "recruiter123";

      const mockCreatedJob = { ...mockJobData, recruiter: mockRecruiterId, _id: "job123" };
      mock.method(JobPosting, "create", () => mockCreatedJob);

      const result = await jobService.createJob(mockJobData, mockRecruiterId);

      assert.equal(JobPosting.create.mock.calls.length, 1);
      assert.deepEqual(JobPosting.create.mock.calls[0].arguments[0], {
        ...mockJobData,
        recruiter: mockRecruiterId,
      });
      assert.deepEqual(result, mockCreatedJob);
    });
  });

  describe("updateJob", () => {
    it("should update a job successfully when user is the owner", async () => {
      const mockJobId = new mongoose.Types.ObjectId();
      const mockRecruiterId = "recruiter123";
      const mockUpdateData = { title: "Senior Software Engineer" };

      const mockExistingJob = { _id: mockJobId, recruiter: { toString: () => mockRecruiterId } };
      const mockUpdatedJob = { ...mockExistingJob, ...mockUpdateData };

      mock.method(JobPosting, "findById", () => mockExistingJob);
      mock.method(JobPosting, "findByIdAndUpdate", () => mockUpdatedJob);

      const result = await jobService.updateJob(mockJobId, mockUpdateData, mockRecruiterId);

      assert.equal(JobPosting.findById.mock.calls.length, 1);
      assert.equal(JobPosting.findById.mock.calls[0].arguments[0], mockJobId);
      assert.equal(JobPosting.findByIdAndUpdate.mock.calls.length, 1);
      assert.deepEqual(JobPosting.findByIdAndUpdate.mock.calls[0].arguments, [
        mockJobId,
        mockUpdateData,
        { new: true, runValidators: true }
      ]);
      assert.deepEqual(result, mockUpdatedJob);
    });

    it("should throw AppError(404) if job not found", async () => {
      mock.method(JobPosting, "findById", () => null);

      await assert.rejects(
        () => jobService.updateJob("invalidId", {}, "recruiter123"),
        (err) => {
          assert.ok(err instanceof AppError);
          assert.equal(err.statusCode, 404);
          return true;
        }
      );
    });

    it("should throw AppError(403) if recruiter is not the owner", async () => {
      const mockExistingJob = { _id: "job123", recruiter: { toString: () => "differentRecruiter" } };
      mock.method(JobPosting, "findById", () => mockExistingJob);

      await assert.rejects(
        () => jobService.updateJob("job123", {}, "recruiter123"),
        (err) => {
          assert.ok(err instanceof AppError);
          assert.equal(err.statusCode, 403);
          return true;
        }
      );
    });
  });

  describe("deleteJob", () => {
    it("should delete a job and its applications when user is owner", async () => {
      const mockJobId = new mongoose.Types.ObjectId();
      const mockRecruiterId = "recruiter123";

      const mockExistingJob = { _id: mockJobId, recruiter: { toString: () => mockRecruiterId } };

      mock.method(JobPosting, "findById", () => mockExistingJob);
      mock.method(JobApplication, "find", () => ({
        select: async () => [{ applicant: "applicant123" }]
      }));
      mock.method(JobApplication, "updateMany", () => ({ modifiedCount: 5 }));
      const mockQuery = {
        select: mock.fn(() => mockQuery),
        then: function(resolve) { resolve([{ applicant: new mongoose.Types.ObjectId().toString() }]); }
      };
      mock.method(JobApplication, "find", () => mockQuery);
      mock.method(JobPosting, "findByIdAndUpdate", () => mockExistingJob);
      mock.method(Notification, "insertMany", async () => ([{}]));

      await jobService.deleteJob(mockJobId, mockRecruiterId);

      assert.equal(JobPosting.findById.mock.calls.length, 1);
      assert.equal(JobPosting.findById.mock.calls[0].arguments[0], mockJobId);
      assert.equal(JobApplication.updateMany.mock.calls.length, 1);
      assert.deepEqual(JobApplication.updateMany.mock.calls[0].arguments[0], { job: mockJobId });
      assert.equal(JobPosting.findByIdAndUpdate.mock.calls.length, 1);
      assert.equal(JobPosting.findByIdAndUpdate.mock.calls[0].arguments[0], mockJobId);
    });

    it("should throw AppError(404) if job not found for deletion", async () => {
      mock.method(JobPosting, "findById", () => null);

      await assert.rejects(
        () => jobService.deleteJob("invalidId", "recruiter123"),
        (err) => {
          assert.ok(err instanceof AppError);
          assert.equal(err.statusCode, 404);
          return true;
        }
      );
    });

    it("should throw AppError(403) if recruiter does not own the job for deletion", async () => {
      const mockExistingJob = { _id: "job123", recruiter: { toString: () => "differentRecruiter" } };
      mock.method(JobPosting, "findById", () => mockExistingJob);

      await assert.rejects(
        () => jobService.deleteJob("job123", "recruiter123"),
        (err) => {
          assert.ok(err instanceof AppError);
          assert.equal(err.statusCode, 403);
          return true;
        }
      );
    });
  });

  describe("getJobRecommendations", () => {
    it("should return job recommendations successfully and call DB limit(100)", async () => {
      const mockUser = { _id: new mongoose.Types.ObjectId() };
      const mockResume = {
        _id: "resume123",
        skills: ["React"],
        keywords: ["Developer"]
      };

      const mockQuery = {
        select: mock.fn(() => mockQuery),
        lean: mock.fn(async () => mockResume)
      };
      mock.method(Resume, "findOne", () => mockQuery);

      const mockJobs = [
        {
          _id: "job123",
          title: "Software Engineer",
          skills: ["React"],
          description: "Develop React apps",
          _doc: { _id: "job123", title: "Software Engineer", skills: ["React"], description: "Develop React apps" }
        }
      ];

      const mockLimitFn = mock.fn(async () => mockJobs);
      const mockSortFn = mock.fn(() => ({ limit: mockLimitFn }));
      mock.method(JobPosting, "find", () => ({
        sort: mockSortFn,
        limit: mockLimitFn
      }));

      const mockMatchResult = {
        recommendations: [
          {
            job: "job123",
            score: 85,
            breakdown: { skill: 90, experience: 80 },
            skillMatch: { feedback: ["Great match"] }
          }
        ]
      };
      mock.method(matchingService, "evaluateMatches", async () => mockMatchResult);
      mock.method(matchingService, "getLatestRecommendations", async () => null);

      const result = await jobService.getJobRecommendations(mockUser);

      assert.equal(Resume.findOne.mock.calls.length, 1);
      assert.equal(JobPosting.find.mock.calls.length, 1);
      assert.equal(mockLimitFn.mock.calls.length, 1);
      assert.equal(mockLimitFn.mock.calls[0].arguments[0], 100);
      assert.equal(matchingService.evaluateMatches.mock.calls.length, 1);
      assert.equal(result.success, true);
      assert.equal(result.jobs.length, 1);
      assert.equal(result.jobs[0].matchScore, 85);
      assert.equal(result.jobs[0].relevanceInsights, "Great match");
    });

    it("should sort recommendations by matchScore (default/score) descending and limit results", async () => {
      const mockUser = { _id: new mongoose.Types.ObjectId() };
      const mockResume = {
        _id: "resume123",
        skills: ["React"],
        keywords: ["Developer"]
      };

      const mockQuery = {
        select: mock.fn(() => mockQuery),
        lean: mock.fn(async () => mockResume)
      };
      mock.method(Resume, "findOne", () => mockQuery);

      const mockJobs = [
        { _id: "job1", title: "Job 1", salary: { max: 100 }, createdAt: new Date("2026-06-01"), _doc: { _id: "job1", title: "Job 1", salary: { max: 100 }, createdAt: new Date("2026-06-01") } },
        { _id: "job2", title: "Job 2", salary: { max: 200 }, createdAt: new Date("2026-06-03"), _doc: { _id: "job2", title: "Job 2", salary: { max: 200 }, createdAt: new Date("2026-06-03") } },
        { _id: "job3", title: "Job 3", salary: { max: 150 }, createdAt: new Date("2026-06-02"), _doc: { _id: "job3", title: "Job 3", salary: { max: 150 }, createdAt: new Date("2026-06-02") } }
      ];

      const mockLimitFn = mock.fn(async () => mockJobs);
      const mockSortFn = mock.fn(() => ({ limit: mockLimitFn }));
      mock.method(JobPosting, "find", () => ({
        sort: mockSortFn,
        limit: mockLimitFn
      }));

      const mockMatchResult = {
        recommendations: [
          { job: "job1", score: 70 },
          { job: "job2", score: 95 },
          { job: "job3", score: 85 }
        ]
      };
      mock.method(matchingService, "evaluateMatches", async () => mockMatchResult);
      mock.method(matchingService, "getLatestRecommendations", async () => null);

      // Verify default sorting by score and limiting to 2
      const result = await jobService.getJobRecommendations(mockUser, { sortBy: "score", limit: 2 });
      assert.equal(result.success, true);
      assert.equal(result.jobs.length, 2);
      assert.equal(result.jobs[0].title, "Job 2"); // score 95
      assert.equal(result.jobs[1].title, "Job 3"); // score 85
    });

    it("should sort recommendations by highest salary descending when sortBy: 'salary' is passed", async () => {
      const mockUser = { _id: new mongoose.Types.ObjectId() };
      const mockResume = {
        _id: "resume123",
        skills: ["React"],
        keywords: ["Developer"]
      };

      const mockQuery = {
        select: mock.fn(() => mockQuery),
        lean: mock.fn(async () => mockResume)
      };
      mock.method(Resume, "findOne", () => mockQuery);

      const mockJobs = [
        { _id: "job1", title: "Job 1", salary: { max: 100 }, createdAt: new Date("2026-06-01"), _doc: { _id: "job1", title: "Job 1", salary: { max: 100 }, createdAt: new Date("2026-06-01") } },
        { _id: "job2", title: "Job 2", salary: { max: 200 }, createdAt: new Date("2026-06-03"), _doc: { _id: "job2", title: "Job 2", salary: { max: 200 }, createdAt: new Date("2026-06-03") } },
        { _id: "job3", title: "Job 3", salary: { max: 150 }, createdAt: new Date("2026-06-02"), _doc: { _id: "job3", title: "Job 3", salary: { max: 150 }, createdAt: new Date("2026-06-02") } }
      ];

      const mockLimitFn = mock.fn(async () => mockJobs);
      const mockSortFn = mock.fn(() => ({ limit: mockLimitFn }));
      mock.method(JobPosting, "find", () => ({
        sort: mockSortFn,
        limit: mockLimitFn
      }));

      const mockMatchResult = {
        recommendations: [
          { job: "job1", score: 70 },
          { job: "job2", score: 95 },
          { job: "job3", score: 85 }
        ]
      };
      mock.method(matchingService, "evaluateMatches", async () => mockMatchResult);
      mock.method(matchingService, "getLatestRecommendations", async () => null);

      const result = await jobService.getJobRecommendations(mockUser, { sortBy: "salary" });
      assert.equal(result.success, true);
      assert.equal(result.jobs.length, 3);
      assert.equal(result.jobs[0].title, "Job 2"); // salary max 200
      assert.equal(result.jobs[1].title, "Job 3"); // salary max 150
      assert.equal(result.jobs[2].title, "Job 1"); // salary max 100
      // Check MongoDB sort was called with {"salary.max": -1}
      assert.equal(mockSortFn.mock.calls.length, 1);
      assert.deepEqual(mockSortFn.mock.calls[0].arguments[0], { "salary.max": -1 });
    });

    it("should sort recommendations by posting date descending when sortBy: 'date' is passed", async () => {
      const mockUser = { _id: new mongoose.Types.ObjectId() };
      const mockResume = {
        _id: "resume123",
        skills: ["React"],
        keywords: ["Developer"]
      };

      const mockQuery = {
        select: mock.fn(() => mockQuery),
        lean: mock.fn(async () => mockResume)
      };
      mock.method(Resume, "findOne", () => mockQuery);

      const mockJobs = [
        { _id: "job1", title: "Job 1", salary: { max: 100 }, createdAt: new Date("2026-06-01"), _doc: { _id: "job1", title: "Job 1", salary: { max: 100 }, createdAt: new Date("2026-06-01") } },
        { _id: "job2", title: "Job 2", salary: { max: 200 }, createdAt: new Date("2026-06-03"), _doc: { _id: "job2", title: "Job 2", salary: { max: 200 }, createdAt: new Date("2026-06-03") } },
        { _id: "job3", title: "Job 3", salary: { max: 150 }, createdAt: new Date("2026-06-02"), _doc: { _id: "job3", title: "Job 3", salary: { max: 150 }, createdAt: new Date("2026-06-02") } }
      ];

      const mockLimitFn = mock.fn(async () => mockJobs);
      const mockSortFn = mock.fn(() => ({ limit: mockLimitFn }));
      mock.method(JobPosting, "find", () => ({
        sort: mockSortFn,
        limit: mockLimitFn
      }));

      const mockMatchResult = {
        recommendations: [
          { job: "job1", score: 70 },
          { job: "job2", score: 95 },
          { job: "job3", score: 85 }
        ]
      };
      mock.method(matchingService, "evaluateMatches", async () => mockMatchResult);
      mock.method(matchingService, "getLatestRecommendations", async () => null);

      const result = await jobService.getJobRecommendations(mockUser, { sortBy: "date" });
      assert.equal(result.success, true);
      assert.equal(result.jobs.length, 3);
      assert.equal(result.jobs[0].title, "Job 2"); // createdAt 2026-06-03
      assert.equal(result.jobs[1].title, "Job 3"); // createdAt 2026-06-02
      assert.equal(result.jobs[2].title, "Job 1"); // createdAt 2026-06-01
      // Check MongoDB sort was called with {createdAt: -1}
      assert.equal(mockSortFn.mock.calls.length, 1);
      assert.deepEqual(mockSortFn.mock.calls[0].arguments[0], { createdAt: -1 });
    });

    it("should cap the recommendation limit at 50 if a larger limit is requested", async () => {
      const mockUser = { _id: new mongoose.Types.ObjectId() };
      const mockResume = {
        _id: "resume123",
        skills: ["React"],
        keywords: ["Developer"]
      };

      const mockQuery = {
        select: mock.fn(() => mockQuery),
        lean: mock.fn(async () => mockResume)
      };
      mock.method(Resume, "findOne", () => mockQuery);

      const mockJobs = Array.from({ length: 60 }, (_, i) => ({
        _id: `job${i}`,
        title: `Job ${i}`,
        salary: { max: 100 },
        createdAt: new Date("2026-06-01"),
        _doc: { _id: `job${i}`, title: `Job ${i}`, salary: { max: 100 }, createdAt: new Date("2026-06-01") }
      }));

      const mockLimitFn = mock.fn(async () => mockJobs);
      const mockSortFn = mock.fn(() => ({ limit: mockLimitFn }));
      mock.method(JobPosting, "find", () => ({
        sort: mockSortFn,
        limit: mockLimitFn
      }));

      const mockMatchResult = {
        recommendations: mockJobs.map((j, i) => ({ job: j._id, score: 50 + (i % 50) }))
      };
      mock.method(matchingService, "evaluateMatches", async () => mockMatchResult);
      mock.method(matchingService, "getLatestRecommendations", async () => null);

      const result = await jobService.getJobRecommendations(mockUser, { limit: 100 });
      assert.equal(result.success, true);
      assert.equal(result.jobs.length, 50); // capped at 50
    });
  });

  describe("getJobApplications", () => {
    const mockJobId = new mongoose.Types.ObjectId();
    const mockRecruiterId = "recruiter123";

    it("should return all applications for the job when no status filter is provided", async () => {
      const mockJob = { _id: mockJobId, recruiter: { toString: () => mockRecruiterId } };
      const mockApps = [{ _id: "app1", job: mockJobId, status: "pending" }];

      mock.method(JobPosting, "findById", async () => mockJob);

      const mockQuery = {
        populate: mock.fn(() => mockQuery),
        sort: mock.fn(() => mockQuery),
        skip: mock.fn(() => mockQuery),
        limit: mock.fn(() => mockQuery),
        select: mock.fn(() => mockQuery),
        lean: mock.fn(async () => mockApps),
      };
      // We don't use lean() anymore, so we also need to mock exec or just let the query be awaitable
      mockQuery.then = function(resolve) { resolve(mockApps); };

      mock.method(JobApplication, "find", () => mockQuery);
      mock.method(JobApplication, "countDocuments", async () => 1);

      const result = await jobService.getJobApplications(mockJobId, mockRecruiterId);

      assert.equal(JobPosting.findById.mock.calls.length, 1);
      assert.equal(JobPosting.findById.mock.calls[0].arguments[0], mockJobId);
      assert.equal(JobApplication.find.mock.calls.length, 1);
      assert.deepEqual(JobApplication.find.mock.calls[0].arguments[0], { job: mockJobId });
      // The result of the new service method contains pagination data
      assert.deepEqual(result.applications, mockApps);
      assert.equal(result.totalCount, 1);
    });

    it("should filter applications by status when status filter is provided", async () => {
      const mockJob = { _id: mockJobId, recruiter: { toString: () => mockRecruiterId } };
      const mockApps = [{ _id: "app1", job: mockJobId, status: "shortlisted" }];

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

      const result = await jobService.getJobApplications(mockJobId, mockRecruiterId, "shortlisted");

      assert.equal(JobPosting.findById.mock.calls.length, 1);
      assert.equal(JobApplication.find.mock.calls.length, 1);
      assert.deepEqual(JobApplication.find.mock.calls[0].arguments[0], { job: mockJobId, status: "shortlisted" });
      assert.deepEqual(result.applications, mockApps);
      assert.equal(result.totalCount, 1);
    });

    it("should throw AppError(404) if job not found", async () => {
      mock.method(JobPosting, "findById", async () => null);

      await assert.rejects(
        () => jobService.getJobApplications("invalidId", mockRecruiterId),
        (err) => {
          assert.ok(err instanceof AppError);
          assert.equal(err.statusCode, 404);
          assert.equal(err.message, "Job not found");
          return true;
        }
      );
    });

    it("should throw AppError(403) if recruiter is not the job owner", async () => {
      const mockJob = { _id: mockJobId, recruiter: { toString: () => "otherRecruiter" } };
      mock.method(JobPosting, "findById", async () => mockJob);

      await assert.rejects(
        () => jobService.getJobApplications(mockJobId, mockRecruiterId),
        (err) => {
          assert.ok(err instanceof AppError);
          assert.equal(err.statusCode, 403);
          assert.equal(err.message, "You do not have permission to view these applications");
          return true;
        }
      );
    });
  });
});
