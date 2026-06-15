// @ts-nocheck

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../../../services/apiClient";
import {
  createJobPosting,
  getJobPostingById,
  getRecruiterJobs,
} from "../jobPostingService";

// Mock the apiClient
vi.mock("../../../../services/apiClient", () => ({
  apiRequest: vi.fn(),
  normalizeApiError: vi.fn((error) => ({
    message: error.message || "Something went wrong",
    status: error.status ?? 500,
    errors: error.errors || {},
  })),
}));

describe("jobPostingService", () => {
  const mockToken = "test-token-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Only clear mock history to preserve implementations
    vi.clearAllMocks();
  });

  describe("createJobPosting", () => {
    const validJobData = {
      title: "Senior Engineer",
      description: "Job description",
      skills: ["react", "node"],
      status: "draft",
      location: {
        city: "Mumbai",
        state: "MH",
        country: "India",
        remote: false,
      },
      salary: {
        min: 100000,
        max: 200000,
        currency: "INR",
        isNegotiable: false,
      },
    };

    it("calls apiRequest with POST method and correct path", async () => {
      apiRequest.mockResolvedValue({
        success: true,
        job: { _id: "123", ...validJobData },
      });

      await createJobPosting(validJobData, mockToken);

      expect(apiRequest).toHaveBeenCalledWith("/api/jobs", {
        method: "POST",
        body: validJobData,
        token: mockToken,
      });
    });

    it("transforms comma-separated skills string to array", async () => {
      const jobDataWithStringSkills = {
        ...validJobData,
        skills: "react, node.js, typescript",
      };
      apiRequest.mockResolvedValue({ success: true, job: { _id: "123" } });

      await createJobPosting(jobDataWithStringSkills, mockToken);

      expect(apiRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.objectContaining({
            skills: ["react", "node.js", "typescript"],
          }),
        }),
      );
    });

    it("keeps skills array if already an array", async () => {
      apiRequest.mockResolvedValue({ success: true, job: { _id: "123" } });

      await createJobPosting(validJobData, mockToken);

      expect(apiRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.objectContaining({
            skills: ["react", "node"],
          }),
        }),
      );
    });

    it("filters empty skills after splitting", async () => {
      const jobDataWithEmptySkills = {
        ...validJobData,
        skills: "react, , node, ,",
      };
      apiRequest.mockResolvedValue({ success: true, job: { _id: "123" } });

      await createJobPosting(jobDataWithEmptySkills, mockToken);

      expect(apiRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.objectContaining({
            skills: ["react", "node"],
          }),
        }),
      );
    });

    it("returns success response with job data", async () => {
      const mockJob = { _id: "123", title: "Senior Engineer" };
      apiRequest.mockResolvedValue({ success: true, job: mockJob });

      const result = await createJobPosting(validJobData, mockToken);

      expect(result).toEqual({ success: true, job: mockJob });
    });

    it("throws normalized error on API failure", async () => {
      const apiError = new Error("Validation failed");
      apiError.status = 400;
      apiError.errors = { title: "Title is required" };
      apiRequest.mockRejectedValue(apiError);

      await expect(
        createJobPosting(validJobData, mockToken),
      ).rejects.toMatchObject({
        message: expect.any(String),
        status: 400,
      });
    });

    it("provides user-friendly message for 401/403 errors", async () => {
      const authError = new Error("Unauthorized");
      authError.status = 401;
      apiRequest.mockRejectedValue(authError);

      await expect(
        createJobPosting(validJobData, mockToken),
      ).rejects.toMatchObject({
        message: expect.stringContaining("not authorized"),
        status: 401,
      });
    });

    it("provides user-friendly message for network errors", async () => {
      const networkError = new Error("Network error");
      networkError.status = 0;
      apiRequest.mockRejectedValue(networkError);

      await expect(
        createJobPosting(validJobData, mockToken),
      ).rejects.toMatchObject({
        message: expect.stringContaining("Unable to connect"),
        status: 0,
      });
    });
  });

  describe("getRecruiterJobs", () => {
    it("calls apiRequest with GET method and correct path", async () => {
      apiRequest.mockResolvedValue({ success: true, jobs: [] });

      await getRecruiterJobs(mockToken);

      expect(apiRequest).toHaveBeenCalledWith("/api/jobs/recruiter?page=1&limit=10", {
        token: mockToken,
      });
    });

    it("returns jobs array from response", async () => {
      const mockJobs = [
        { _id: "1", title: "Job 1" },
        { _id: "2", title: "Job 2" },
      ];
      apiRequest.mockResolvedValue({ success: true, jobs: mockJobs });

      const result = await getRecruiterJobs(mockToken);

      expect(result).toEqual({ 
        success: true, 
        jobs: mockJobs,
        currentPage: 1,
        totalPages: 1,
        totalCount: 0
      });
    });

    it("handles response with data field instead of jobs", async () => {
      const mockJobs = [{ _id: "1", title: "Job 1" }];
      apiRequest.mockResolvedValue({ success: true, data: mockJobs });

      const result = await getRecruiterJobs(mockToken);

      expect(result.jobs).toEqual(mockJobs);
      expect(result.currentPage).toBe(1);
    });

    it("returns empty array when no jobs field in response", async () => {
      apiRequest.mockResolvedValue({ success: true });

      const result = await getRecruiterJobs(mockToken);

      expect(result.jobs).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it("throws normalized error on failure", async () => {
      apiRequest.mockRejectedValue(new Error("Network error"));

      await expect(getRecruiterJobs(mockToken)).rejects.toBeDefined();
    });
  });

  describe("getJobPostingById", () => {
    it("calls apiRequest with correct path including id", async () => {
      apiRequest.mockResolvedValue({ success: true, job: { _id: "123" } });

      await getJobPostingById("123", mockToken);

      expect(apiRequest).toHaveBeenCalledWith("/api/jobs/123", {
        token: mockToken,
      });
    });

    it("returns job data from response", async () => {
      const mockJob = { _id: "123", title: "Senior Engineer" };
      apiRequest.mockResolvedValue({ success: true, job: mockJob });

      const result = await getJobPostingById("123", mockToken);

      expect(result).toEqual({ success: true, job: mockJob });
    });

    it("handles response with data field instead of job", async () => {
      const mockJob = { _id: "123", title: "Senior Engineer" };
      apiRequest.mockResolvedValue({ success: true, data: mockJob });

      const result = await getJobPostingById("123", mockToken);

      expect(result.job).toEqual(mockJob);
    });

    it("throws normalized error on 404", async () => {
      const notFoundError = new Error("Job posting not found");
      notFoundError.status = 404;
      apiRequest.mockRejectedValue(notFoundError);

      await expect(getJobPostingById("999", mockToken)).rejects.toMatchObject({
        message: expect.stringContaining("not found"),
        status: 404,
      });
    });
  });
});
