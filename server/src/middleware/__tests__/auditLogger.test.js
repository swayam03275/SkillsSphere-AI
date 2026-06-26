import test, { mock } from "node:test";
import assert from "node:assert/strict";

const invokeMiddleware = (middleware, req = {}, res = {}) => {
  let nextCalled = false;
  let nextError = null;
  let finishCallback = null;

  const response = {
    statusCode: 200,
    ...res,
    on(evt, cb) {
      if (evt === "finish") finishCallback = cb;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
  };

  const next = (err) => {
    nextCalled = true;
    nextError = err;
  };

  middleware(req, response, next);

  return { nextCalled, nextError, response, finishCallback };
};

test("logAction returns a middleware function (3 args)", async () => {
  const { logAction } = await import("../auditLogger.js");
  const middleware = logAction("TEST_ACTION");
  assert.equal(typeof middleware, "function");
  assert.equal(middleware.length, 3);
});

test("calls next() immediately without waiting for res.finish", async () => {
  const { logAction } = await import("../auditLogger.js");
  const req = { user: null, ip: "127.0.0.1", originalUrl: "/test", headers: {} };
  const { nextCalled, finishCallback } = invokeMiddleware(logAction("VISIT"), req);

  assert.equal(nextCalled, true);
  assert.equal(typeof finishCallback, "function");
});

test("handles req with user._id present", async () => {
  const { logAction } = await import("../auditLogger.js");
  const req = { user: { _id: "user123" }, ip: "192.168.1.1", originalUrl: "/api/data", headers: {} };
  const { nextCalled } = invokeMiddleware(logAction("LOGIN"), req);

  assert.equal(nextCalled, true);
});

test("handles req without user (null) gracefully", async () => {
  const { logAction } = await import("../auditLogger.js");
  const req = { user: null, ip: "127.0.0.1", originalUrl: "/public", headers: {} };
  const { nextCalled } = invokeMiddleware(logAction("PUBLIC_VISIT"), req);

  assert.equal(nextCalled, true);
});

test("handles req without ip using x-forwarded-for header", async () => {
  const { logAction } = await import("../auditLogger.js");
  const req = { user: null, ip: undefined, originalUrl: "/proxy", headers: { "x-forwarded-for": "1.2.3.4" } };
  const { nextCalled } = invokeMiddleware(logAction("PROXY_VISIT"), req);

  assert.equal(nextCalled, true);
});

test("registers finish listener that fires when res emits finish", async () => {
  const { logAction } = await import("../auditLogger.js");
  const req = { user: { _id: "user456" }, ip: "10.0.0.1", originalUrl: "/action", headers: {} };
  const { finishCallback } = invokeMiddleware(logAction("CREATE"), req);

  assert.equal(typeof finishCallback, "function");
  // Calling the finish callback should not throw
  finishCallback();
});

test("uses extractMetadata function when provided", async () => {
  const { logAction } = await import("../auditLogger.js");
  const req = { user: { _id: "user789" }, ip: "10.0.0.1", originalUrl: "/action", headers: {} };
  const extractMeta = () => ({ resourceId: "res123" });

  const { nextCalled } = invokeMiddleware(logAction("CREATE", extractMeta), req);
  assert.equal(nextCalled, true);
});

test("calls next even when extractMetadata throws", async () => {
  const { logAction } = await import("../auditLogger.js");
  const req = { user: { _id: "user000" }, ip: "1.2.3.4", originalUrl: "/safe", headers: {} };
  const badExtract = () => { throw new Error("extract failed"); };

  const { nextCalled } = invokeMiddleware(logAction("SAFE_ACTION", badExtract), req);
  assert.equal(nextCalled, true);
});

test("accepts various action string values", async () => {
  const { logAction } = await import("../auditLogger.js");
  const actions = ["LOGIN", "RESUME_UPLOAD", "JOB_APPLICATION", "LOGOUT"];

  for (const action of actions) {
    const req = { user: { _id: "u1" }, ip: "1.1.1.1", originalUrl: "/", headers: {} };
    const { nextCalled } = invokeMiddleware(logAction(action), req);
    assert.equal(nextCalled, true, `Failed for action: ${action}`);
  }
});
