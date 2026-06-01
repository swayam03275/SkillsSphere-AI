import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { createJobPosting, exportApplicationsToCSV } from "../controller.js";
import JobPosting from "../../../database/models/JobPosting.js";
import JobApplication from "../../../database/models/JobApplication.js";
import AppError from "../../../utils/AppError.js";

import logger from "../../../utils/logger.js";

describe("Job Controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { _id: "user123" },
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

  describe("createJobPosting", () => {
    const validBody = () => ({
      title: "Software Engineer",
      description: "We need a skilled software engineer to join our team",
      skills: ["React", "Node.js"],
      location: { city: "San Francisco", state: "CA" },
      salary: { min: 100000, max: 150000 },
    });

    it("should respond with 201 and created job", async () => {
      const body = validBody();
      req.body = body;
      const mockCreatedJob = { _id: "job123", ...body, recruiter: req.user._id };
      mock.method(JobPosting, "create", () => mockCreatedJob);

      await createJobPosting(req, res, next);

      assert.equal(JobPosting.create.mock.calls.length, 1);
      const createArg = JobPosting.create.mock.calls[0].arguments[0];
      assert.equal(createArg.title, body.title);
      assert.equal(createArg.description, body.description);
      assert.deepEqual(createArg.skills, body.skills);
      assert.deepEqual(createArg.location, body.location);
      assert.deepEqual(createArg.salary, body.salary);
      assert.equal(createArg.status, "draft");
      assert.equal(createArg.recruiter, req.user._id);
      
      // Since res.status() returns res, we check the first call's first argument
      if (next.mock.calls.length > 0) {
        logger.error("Next was called with error:", next.mock.calls[0].arguments[0]);
      }
      assert.equal(res.status.mock.calls.length, 1);
      assert.equal(res.status.mock.calls[0].arguments[0], 201);
      
      assert.equal(res.json.mock.calls.length, 1);
      assert.equal(res.json.mock.calls[0].arguments[0].success, true);
      assert.deepEqual(res.json.mock.calls[0].arguments[0].job, mockCreatedJob);
    });

    it("should throw AppError(400) when title is missing", async () => {
      req.body = { ...validBody() };
      delete req.body.title;

      await createJobPosting(req, res, next);

      assert.equal(next.mock.calls.length, 1);
      const error = next.mock.calls[0].arguments[0];
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 400);
      assert.ok(error.errors.title);
    });

    it("should throw AppError(400) when description is missing", async () => {
      req.body = { ...validBody() };
      delete req.body.description;

      await createJobPosting(req, res, next);

      assert.equal(next.mock.calls.length, 1);
      const error = next.mock.calls[0].arguments[0];
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 400);
      assert.ok(error.errors.description);
    });

    it("should throw AppError(400) when skills are missing", async () => {
      req.body = { ...validBody() };
      delete req.body.skills;

      await createJobPosting(req, res, next);

      assert.equal(next.mock.calls.length, 1);
      const error = next.mock.calls[0].arguments[0];
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 400);
      assert.ok(error.errors.skills);
    });

    it("should throw AppError(400) when skills array is empty", async () => {
      req.body = { ...validBody() };
      req.body.skills = [];

      await createJobPosting(req, res, next);

      assert.equal(next.mock.calls.length, 1);
      const error = next.mock.calls[0].arguments[0];
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 400);
      assert.ok(error.errors.skills);
    });

    it("should throw AppError(400) when location is missing", async () => {
      req.body = { ...validBody() };
      delete req.body.location;

      await createJobPosting(req, res, next);

      assert.equal(next.mock.calls.length, 1);
      const error = next.mock.calls[0].arguments[0];
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 400);
      assert.ok(error.errors.location);
    });

    it("should throw AppError(400) when location.city is missing", async () => {
      req.body = { ...validBody() };
      delete req.body.location.city;

      await createJobPosting(req, res, next);

      assert.equal(next.mock.calls.length, 1);
      const error = next.mock.calls[0].arguments[0];
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 400);
      assert.ok(error.errors["location.city"]);
    });

    it("should throw AppError(400) when location.state is missing", async () => {
      req.body = { ...validBody() };
      delete req.body.location.state;

      await createJobPosting(req, res, next);

      assert.equal(next.mock.calls.length, 1);
      const error = next.mock.calls[0].arguments[0];
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 400);
      assert.ok(error.errors["location.state"]);
    });

    it("should throw AppError(400) when salary is missing", async () => {
      req.body = { ...validBody() };
      delete req.body.salary;

      await createJobPosting(req, res, next);

      assert.equal(next.mock.calls.length, 1);
      const error = next.mock.calls[0].arguments[0];
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 400);
      assert.ok(error.errors.salary);
    });

    it("should throw AppError(400) when salary.min is missing", async () => {
      req.body = { ...validBody() };
      delete req.body.salary.min;

      await createJobPosting(req, res, next);

      assert.equal(next.mock.calls.length, 1);
      const error = next.mock.calls[0].arguments[0];
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 400);
      assert.ok(error.errors["salary.min"]);
    });

    it("should throw AppError(400) when salary.max is missing", async () => {
      req.body = { ...validBody() };
      delete req.body.salary.max;

      await createJobPosting(req, res, next);

      assert.equal(next.mock.calls.length, 1);
      const error = next.mock.calls[0].arguments[0];
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 400);
      assert.ok(error.errors["salary.max"]);
    });

    it("should throw AppError(400) when salary.min exceeds salary.max", async () => {
      req.body = { ...validBody() };
      req.body.salary.min = 200000;
      req.body.salary.max = 100000;

      await createJobPosting(req, res, next);

      assert.equal(next.mock.calls.length, 1);
      const error = next.mock.calls[0].arguments[0];
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 400);
      assert.ok(error.errors["salary.max"]);
    });

    it("should pass non-validation errors to next()", async () => {
      req.body = validBody();
      const dbError = new Error("DB connection failed");
      mock.method(JobPosting, "create", () => { throw dbError; });

      await createJobPosting(req, res, next);

      assert.equal(next.mock.calls.length, 1);
      assert.equal(next.mock.calls[0].arguments[0], dbError);
    });
  });

  describe("exportApplicationsToCSV", () => {
    it("should export applications as CSV and set correct headers", async () => {
      req.params.id = "job123";
      
      const mockJob = {
        _id: "job123",
        recruiter: { toString: () => "user123" }
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
      
      mock.method(JobPosting, "findById", () => Promise.resolve(mockJob));
      
      const mockQuery = {
        populate() { return this; },
        sort() { return this; },
        skip() { return this; },
        limit() { return this; },
        lean() { return this; }
      };
      // We don't use lean anymore in the updated service, we let the promise resolve:
      mockQuery.then = function(resolve) { resolve(mockApplications); };
      
      mock.method(JobApplication, "find", () => mockQuery);
      mock.method(JobApplication, "countDocuments", () => Promise.resolve(1));
      
      const headers = {};
      let sentContent = "";
      
      let resolveTest;
      const testPromise = new Promise((resolve) => { resolveTest = resolve; });
      
      res.setHeader = mock.fn((name, value) => { headers[name] = value; });
      res.send = mock.fn((content) => {
        sentContent = content;
        resolveTest();
      });
      next = mock.fn((err) => {
        resolveTest(err);
      });

      await exportApplicationsToCSV(req, res, next);
      const err = await testPromise;
      if (err) throw err;

      assert.equal(res.status.mock.calls[0].arguments[0], 200);
      assert.equal(headers["Content-Type"], "text/csv");
      assert.ok(headers["Content-Disposition"].includes("job-job123-applicants.csv"));
      
      const lines = sentContent.split("\n");
      assert.equal(lines[0], "Candidate Name,Candidate Email,Match Score,Match Category,Status,Apply Date,Resume Link,Cover Note");
      assert.ok(lines[1].includes('"Alice"'));
      assert.ok(lines[1].includes('"alice@example.com"'));
      assert.ok(lines[1].includes('"90%"'));
      assert.ok(lines[1].includes('"Excellent Match"'));
    });

    it("should throw 403 error if recruiter is not owner of the job", async () => {
      req.params.id = "job123";
      
      const mockJob = {
        _id: "job123",
        recruiter: { toString: () => "differentUser" }
      };
      
      mock.method(JobPosting, "findById", () => Promise.resolve(mockJob));

      let resolveTest;
      const testPromise = new Promise((resolve) => { resolveTest = resolve; });
      
      next = mock.fn((err) => {
        resolveTest(err);
      });

      await exportApplicationsToCSV(req, res, next);
      const error = await testPromise;

      assert.equal(next.mock.calls.length, 1);
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 403);
    });
  });
});
