import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Module-level mocks — must be registered BEFORE importing the controller
// so that the controller's top-level imports resolve to our stubs.
// Run with: node --experimental-test-module-mocks --test <this-file>
// ---------------------------------------------------------------------------

const parseResumeMock = mock.fn(() => Promise.resolve({}));
mock.module("../../../utils/parseResume.js", {
  namedExports: { parseResume: parseResumeMock },
});

const upsertResumeMock = mock.fn(() => Promise.resolve({}));
const getLatestResumeMock = mock.fn(() => Promise.resolve(null));
mock.module("../../resumes/service.js", {
  namedExports: {
    upsertResume: upsertResumeMock,
    getLatestResume: getLatestResumeMock,
  },
});

const evaluateMatchesMock = mock.fn(() => Promise.resolve({}));
mock.module("../service.js", {
  namedExports: {
    evaluateMatches: evaluateMatchesMock,
  },
});

const unlinkMock = mock.fn(() => Promise.resolve());
mock.module("fs/promises", {
  defaultExport: { unlink: unlinkMock },
});

// Stub asyncHandler so we can test the raw handler behavior directly
mock.module("../../../utils/asyncHandler.js", {
  defaultExport: (fn) => (req, res, next) => fn(req, res, next).catch(next),
});

// Stub AppError so we can inspect instances
mock.module("../../../utils/AppError.js", {
  defaultExport: class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
    }
  },
});

// Now import the controller (its imports resolve to the stubs above)
const { evaluate } = await import("../controller.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const flush = () => new Promise((r) => setTimeout(r, 0));

const buildReq = (overrides = {}) => ({
  user: { _id: "user123", name: "Test User" },
  file: null,
  body: {},
  ...overrides,
});

const buildRes = () => {
  const res = {
    status: mock.fn(() => res),
    json: mock.fn(),
  };
  return res;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Matching Controller – evaluate", () => {
  let req, res, next;

  beforeEach(() => {
    req = buildReq();
    res = buildRes();
    next = mock.fn();

    // Reset call history on all mocks
    parseResumeMock.mock.resetCalls();
    upsertResumeMock.mock.resetCalls();
    getLatestResumeMock.mock.resetCalls();
    evaluateMatchesMock.mock.resetCalls();
    unlinkMock.mock.resetCalls();
  });

  // -------------------------------------------------------------------------
  // 1. Successful file upload — file must NOT be deleted
  // -------------------------------------------------------------------------
  describe("file upload – success path", () => {
    it("should keep the uploaded file on disk and respond 200 with match results", async () => {
      const fakeFile = {
        path: "/tmp/uploads/resume_abc.pdf",
        originalname: "resume.pdf",
        filename: "resume_abc.pdf",
        size: 102400,
        mimetype: "application/pdf",
      };
      req = buildReq({ file: fakeFile });

      const parsedData = { skills: ["javascript", "react"], resumeText: "..." };
      const savedResume = { _id: "resume1", ...parsedData };
      const matchResult = { recommendations: [{ job: "job1", score: 85 }] };

      parseResumeMock.mock.mockImplementation(() => Promise.resolve(parsedData));
      upsertResumeMock.mock.mockImplementation(() => Promise.resolve(savedResume));
      evaluateMatchesMock.mock.mockImplementation(() => Promise.resolve(matchResult));

      evaluate(req, res, next);
      await flush();

      // File must NOT have been deleted
      assert.equal(unlinkMock.mock.calls.length, 0, "unlink should NOT be called on success");

      // Response assertions
      assert.equal(res.status.mock.calls[0].arguments[0], 200);
      const body = res.json.mock.calls[0].arguments[0];
      assert.equal(body.success, true);
      assert.deepEqual(body.data, matchResult);

      // Verify upsertResume was called with the correct file metadata
      const upsertArgs = upsertResumeMock.mock.calls[0].arguments;
      assert.equal(upsertArgs[0], "user123");
      assert.equal(upsertArgs[1].file.path, fakeFile.path);
      assert.equal(upsertArgs[1].file.originalName, fakeFile.originalname);
      assert.equal(upsertArgs[2], true); // includeText flag
    });
  });

  // -------------------------------------------------------------------------
  // 2. Parsing failure — file MUST be cleaned up
  // -------------------------------------------------------------------------
  describe("file upload – parsing failure", () => {
    it("should unlink the uploaded file and forward the error when parseResume throws", async () => {
      const fakeFile = {
        path: "/tmp/uploads/bad_resume.pdf",
        originalname: "bad.pdf",
        filename: "bad.pdf",
        size: 512,
        mimetype: "application/pdf",
      };
      req = buildReq({ file: fakeFile });

      const parseError = new Error("Corrupted PDF");
      parseResumeMock.mock.mockImplementation(() => Promise.reject(parseError));
      unlinkMock.mock.mockImplementation(() => Promise.resolve());

      evaluate(req, res, next);
      await flush();

      // File MUST be cleaned up
      assert.equal(unlinkMock.mock.calls.length, 1, "unlink should be called once on parse failure");
      assert.equal(unlinkMock.mock.calls[0].arguments[0], fakeFile.path);

      // The error should be forwarded via asyncHandler → next(err)
      assert.equal(next.mock.calls.length, 1);
      assert.equal(next.mock.calls[0].arguments[0], parseError);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Database error — file MUST be cleaned up
  // -------------------------------------------------------------------------
  describe("file upload – database save failure", () => {
    it("should unlink the uploaded file and forward the error when upsertResume throws", async () => {
      const fakeFile = {
        path: "/tmp/uploads/resume_xyz.pdf",
        originalname: "resume.pdf",
        filename: "resume_xyz.pdf",
        size: 2048,
        mimetype: "application/pdf",
      };
      req = buildReq({ file: fakeFile });

      const parsedData = { skills: ["python"] };
      const dbError = new Error("MongoServerError: validation failed");

      parseResumeMock.mock.mockImplementation(() => Promise.resolve(parsedData));
      upsertResumeMock.mock.mockImplementation(() => Promise.reject(dbError));
      unlinkMock.mock.mockImplementation(() => Promise.resolve());

      evaluate(req, res, next);
      await flush();

      // File MUST be cleaned up
      assert.equal(unlinkMock.mock.calls.length, 1, "unlink should be called once on DB failure");
      assert.equal(unlinkMock.mock.calls[0].arguments[0], fakeFile.path);

      // The error should be forwarded via asyncHandler → next(err)
      assert.equal(next.mock.calls.length, 1);
      assert.equal(next.mock.calls[0].arguments[0], dbError);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Library reuse (no file) — uses latest resume from DB
  // -------------------------------------------------------------------------
  describe("library reuse – no file uploaded", () => {
    it("should fetch the latest library resume and run matching when no file is uploaded", async () => {
      req = buildReq({ file: null });

      const libraryResume = { _id: "resume99", skills: ["java", "spring"], resumeText: "..." };
      const matchResult = { recommendations: [{ job: "job5", score: 72 }] };

      getLatestResumeMock.mock.mockImplementation(() => Promise.resolve(libraryResume));
      evaluateMatchesMock.mock.mockImplementation(() => Promise.resolve(matchResult));

      evaluate(req, res, next);
      await flush();

      // parseResume should NOT be called (no file)
      assert.equal(parseResumeMock.mock.calls.length, 0);

      // unlink should NOT be called
      assert.equal(unlinkMock.mock.calls.length, 0);

      // getLatestResume called with userId and includeText=true
      assert.equal(getLatestResumeMock.mock.calls[0].arguments[0], "user123");
      assert.equal(getLatestResumeMock.mock.calls[0].arguments[1], true);

      // Response assertions
      assert.equal(res.status.mock.calls[0].arguments[0], 200);
      assert.deepEqual(res.json.mock.calls[0].arguments[0].data, matchResult);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Library reuse — no resume found → 404
  // -------------------------------------------------------------------------
  describe("library reuse – no resume in library", () => {
    it("should call next with AppError(404) when no library resume exists", async () => {
      req = buildReq({ file: null });

      getLatestResumeMock.mock.mockImplementation(() => Promise.resolve(null));

      evaluate(req, res, next);
      await flush();

      // next() should be called with an error
      assert.equal(next.mock.calls.length, 1);
      const err = next.mock.calls[0].arguments[0];
      assert.equal(err.statusCode, 404);
      assert.ok(err.message.includes("No resume found"));
    });
  });
});
