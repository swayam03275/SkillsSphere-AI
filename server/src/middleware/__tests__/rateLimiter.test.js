import assert from "node:assert/strict";
import test from "node:test";
import {
  authRateLimiter,
  jobCreationLimiter,
  otpRateLimiter,
  resumeAnalysisLimiter
} from "../rateLimiter.js";

const createMockResponse = () => {
  return {
    statusCode: null,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    }
  };
};

test("rateLimiter - authRateLimiter exports a valid middleware and allows first requests", async () => {
  assert.equal(typeof authRateLimiter, "function");

  const req = { ip: "1.2.3.4", headers: {}, app: { get: () => {} } };
  const res = createMockResponse();
  let nextCalled = false;

  await authRateLimiter(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test("rateLimiter - jobCreationLimiter exports a valid middleware and allows first requests", async () => {
  assert.equal(typeof jobCreationLimiter, "function");

  const req = { ip: "1.2.3.4", headers: {}, app: { get: () => {} } };
  const res = createMockResponse();
  let nextCalled = false;

  await jobCreationLimiter(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test("rateLimiter - otpRateLimiter exports a valid middleware and allows first requests", async () => {
  assert.equal(typeof otpRateLimiter, "function");

  const req = { ip: "1.2.3.4", headers: {}, app: { get: () => {} } };
  const res = createMockResponse();
  let nextCalled = false;

  await otpRateLimiter(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test("rateLimiter - resumeAnalysisLimiter exports a valid middleware and allows first requests", async () => {
  assert.equal(typeof resumeAnalysisLimiter, "function");

  const req = { ip: "1.2.3.4", headers: {}, app: { get: () => {} } };
  const res = createMockResponse();
  let nextCalled = false;

  await resumeAnalysisLimiter(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});
