import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { createJobPosting, exportApplicationsToCSV } from "../controller.js";
import JobPosting from "../../../database/models/JobPosting.js";
import JobApplication from "../../../database/models/JobApplication.js";
import AppError from "../../../utils/AppError.js";

describe("Job Controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { _id: new mongoose.Types.ObjectId().toString() },
    };
    res = {
      status: mock.fn(() => res),
      json: mock.fn(),
      setHeader: mock.fn(),
      send: mock.fn(),
    };
    next = mock.fn();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe("createJobPosting", () => {
    const validBody = () => ({
      title: "Software Engineer",
      description: "We need a skilled software engineer to join our team and build amazing things.",
      skills: ["React", "Node.js"],
      location: { city: "San Francisco", state: "CA" },
      salary: { min: 100000, max: 150000 },
    });

    it("should respond with 201 and created job", async () => {
      const body = validBody();
      req.body = body;
      const mockCreatedJob = { _id: "job123", ...body, recruiter: req.user._id };
      
      mock.method(JobPosting, "create", async () => mockCreatedJob);

      await createJobPosting(req, res, next);

      if (next.mock.calls.length > 0) {
        throw next.mock.calls[0].arguments[0];
      }

      assert.equal(res.status.mock.calls.length, 1);
      assert.equal(res.status.mock.calls[0].arguments[0], 201);
      assert.equal(res.json.mock.calls.length, 1);
      assert.equal(res.json.mock.calls[0].arguments[0].success, true);
    });
  });

  describe("exportApplicationsToCSV", () => {
    it("should export applications as CSV and set correct headers", async () => {
      const mockJobId = new mongoose.Types.ObjectId().toString();
      req.params.id = mockJobId;
      
      const mockJob = {
        _id: mockJobId,
        recruiter: { toString: () => req.user._id }
      };
      
      const mockApplications = [
        {
          applicant: { name: "Alice", email: "alice@example.com" },
          aiMatchScore: 90,
          matchCategory: "Excellent Match",
          status: "shortlisted",
          createdAt: new Date("2026-05-24T00:00:00.000Z"),
          resumeLink: "https://example.com/alice.pdf",
          coverNote: "Hi there!",
        }
      ];
      
      mock.method(JobPosting, "findById", async () => mockJob);
      
      const mockQuery = {
        populate: mock.fn(function() { return this; }),
        sort: mock.fn(function() { return this; }),
        skip: mock.fn(function() { return this; }),
        limit: mock.fn(function() { return this; }),
        then: mock.fn(function(onFulfilled) { onFulfilled(mockApplications); }),
      };
      
      mock.method(JobApplication, "find", () => mockQuery);
      mock.method(JobApplication, "countDocuments", async () => 1);
      
      await exportApplicationsToCSV(req, res, next);

      if (next.mock.calls.length > 0) {
        throw next.mock.calls[0].arguments[0];
      }

      assert.equal(res.status.mock.calls.length, 1);
      assert.equal(res.status.mock.calls[0].arguments[0], 200);
      assert.equal(res.setHeader.mock.calls.some(call => call.arguments[0] === "Content-Type" && call.arguments[1] === "text/csv"), true);
      assert.equal(res.send.mock.calls.length, 1);
    });
  });
});
