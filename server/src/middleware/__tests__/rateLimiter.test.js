import test from "node:test";
import assert from "node:assert/strict";
import {
  authRateLimiter,
  jobCreationLimiter,
  otpRateLimiter,
  resumeAnalysisLimiter,
} from "../rateLimiter.js";

const makeMockRes = () => {
  const headers = {};
  return {
    statusCode: 200,
    headers,
    setHeader(name, value) {
      headers[name] = value;
      return this;
    },
    get(name) {
      return headers[name];
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this._body = payload;
    },
  };
};

test("authRateLimiter is a function (express middleware)", () => {
  assert.equal(typeof authRateLimiter, "function", "authRateLimiter must be a function");
});

test("jobCreationLimiter is a function (express middleware)", () => {
  assert.equal(typeof jobCreationLimiter, "function", "jobCreationLimiter must be a function");
});

test("otpRateLimiter is a function (express middleware)", () => {
  assert.equal(typeof otpRateLimiter, "function", "otpRateLimiter must be a function");
});

test("resumeAnalysisLimiter is a function (express middleware)", () => {
  assert.equal(typeof resumeAnalysisLimiter, "function", "resumeAnalysisLimiter must be a function");
});

test("authRateLimiter passes through on first request and sets rate-limit headers", async () => {
  const res = makeMockRes();
  const next = (err) => {
    if (err) throw err;
  };

  await authRateLimiter({ ip: "127.0.0.1" }, res, next);

  assert.equal(res.statusCode, 200, "should allow first request through");
  assert.ok(res.headers["RateLimit-Remaining"] !== undefined, "should set rate-limit headers");
  assert.ok(res.headers["RateLimit-Limit"] !== undefined, "should set RateLimit-Limit header");
});

test("jobCreationLimiter passes through on first request and sets rate-limit headers", async () => {
  const res = makeMockRes();
  const next = (err) => {
    if (err) throw err;
  };

  await jobCreationLimiter({ ip: "127.0.0.1" }, res, next);

  assert.equal(res.statusCode, 200, "should allow first request through");
  assert.ok(res.headers["RateLimit-Remaining"] !== undefined, "should set rate-limit headers");
});

test("otpRateLimiter passes through on first request and sets rate-limit headers", async () => {
  const res = makeMockRes();
  const next = (err) => {
    if (err) throw err;
  };

  await otpRateLimiter({ ip: "127.0.0.1" }, res, next);

  assert.equal(res.statusCode, 200, "should allow first request through");
  assert.ok(res.headers["RateLimit-Remaining"] !== undefined, "should set rate-limit headers");
});

test("resumeAnalysisLimiter passes through on first request and sets rate-limit headers", async () => {
  const res = makeMockRes();
  const next = (err) => {
    if (err) throw err;
  };

  await resumeAnalysisLimiter({ ip: "127.0.0.1" }, res, next);

  assert.equal(res.statusCode, 200, "should allow first request through");
  assert.ok(res.headers["RateLimit-Remaining"] !== undefined, "should set rate-limit headers");
});

test("each limiter sets RateLimit-Policy headers with different configurations", async () => {
  const [res1, res2, res3, res4] = [makeMockRes(), makeMockRes(), makeMockRes(), makeMockRes()];
  const next = (err) => { if (err) throw err; };

  await Promise.all([
    authRateLimiter({ ip: "192.168.1.1" }, res1, next),
    jobCreationLimiter({ ip: "192.168.1.2" }, res2, next),
    otpRateLimiter({ ip: "192.168.1.3" }, res3, next),
    resumeAnalysisLimiter({ ip: "192.168.1.4" }, res4, next),
  ]);

  assert.ok(res1.headers["RateLimit-Policy"] !== undefined, "authRateLimiter should set policy header");
  assert.ok(res2.headers["RateLimit-Policy"] !== undefined, "jobCreationLimiter should set policy header");
  assert.ok(res3.headers["RateLimit-Policy"] !== undefined, "otpRateLimiter should set policy header");
  assert.ok(res4.headers["RateLimit-Policy"] !== undefined, "resumeAnalysisLimiter should set policy header");
});

test("authRateLimiter headers decrement on sequential calls to the same IP", async () => {
  const next = (err) => { if (err) throw err; };
  // Sequential calls to the same IP should show decreasing RateLimit-Remaining.
  const ip = "10.9.9.77";
  const results = [];
  for (let i = 0; i < 3; i++) {
    const res = makeMockRes();
    await authRateLimiter({ ip }, res, next);
    results.push(res);
  }

  // Each call should set a RateLimit-Remaining header and it should decrease.
  const remaining = results.map(r => parseInt(r.headers["RateLimit-Remaining"] || "0", 10));
  assert.ok(remaining[0] > remaining[1], `first remaining (${remaining[0]}) should be > second (${remaining[1]})`);
  assert.ok(remaining[1] > remaining[2], `second remaining (${remaining[1]}) should be > third (${remaining[2]})`);
});