import { describe, test, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import AuditLog from "../../database/models/AuditLog.js";
import { logAction } from "../auditLogger.js";

const invokeMiddleware = (middleware, req) =>
  new Promise((resolve) => {
    let finishCallback = null;
    const res = {
      statusCode: 200,
      on: (event, cb) => {
        if (event === "finish") finishCallback = cb;
      },
    };
    middleware(req, res, () => resolve({ nextCalled: true, finishCallback }));
  });

afterEach(() => {
  mock.restoreAll();
});

test("logAction calls next synchronously", async () => {
  const req = { user: null, ip: "127.0.0.1", headers: {}, originalUrl: "/api/test" };
  const result = await invokeMiddleware(logAction("LOGIN"), req);
  assert.ok(result.nextCalled);
  assert.ok(result.finishCallback != null, "finish callback should be registered");
});

test("logAction captures userId from req.user on finish", async () => {
  const createCalls = [];
  mock.method(AuditLog, "create", async (...args) => {
    createCalls.push(...args);
    return {};
  });

  const req = { user: { _id: "user123" }, ip: "127.0.0.1", headers: {}, originalUrl: "/api/test" };
  const result = await invokeMiddleware(logAction("LOGIN"), req);
  await result.finishCallback();
  await new Promise(r => setTimeout(r, 5));

  assert.ok(createCalls.length > 0, "AuditLog.create should have been called");
  const [callData] = createCalls;
  assert.equal(callData.userId, "user123");
  assert.equal(callData.action, "LOGIN");
  assert.equal(callData.resource, "/api/test");
});

test("logAction uses x-forwarded-for header when req.ip is absent", async () => {
  const createCalls = [];
  mock.method(AuditLog, "create", async (...args) => {
    createCalls.push(...args);
    return {};
  });

  const req = {
    user: null,
    ip: undefined,
    headers: { "x-forwarded-for": "203.0.113.50" },
    originalUrl: "/api/upload"
  };
  const result = await invokeMiddleware(logAction("RESUME_UPLOAD"), req);
  await result.finishCallback();
  await new Promise(r => setTimeout(r, 5));

  assert.ok(createCalls.length > 0);
  const [callData] = createCalls;
  assert.equal(callData.ipAddress, "203.0.113.50");
});

test("logAction does not throw when AuditLog.create rejects", async () => {
  mock.method(AuditLog, "create", async () => {
    throw new Error("DB write error");
  });

  const req = { user: null, ip: "127.0.0.1", headers: {}, originalUrl: "/api/test" };
  const result = await invokeMiddleware(logAction("LOGIN"), req);

  // Should not throw
  await result.finishCallback();
  await new Promise(r => setTimeout(r, 5));
  assert.ok(true, "finish callback should complete without throwing");
});

test("logAction calls extractMetadata and handles its errors gracefully", async () => {
  const createCalls = [];
  mock.method(AuditLog, "create", async (...args) => {
    createCalls.push(...args);
    return {};
  });

  const extractMeta = () => { throw new Error("meta extraction failed"); };
  const req = { user: null, ip: "127.0.0.1", headers: {}, originalUrl: "/api/test" };
  const result = await invokeMiddleware(logAction("LOGIN", extractMeta), req);
  await result.finishCallback();
  await new Promise(r => setTimeout(r, 5));

  // create should still have been called (with empty metadata)
  assert.ok(createCalls.length > 0, "AuditLog.create should be called despite extractMetadata error");
  const [callData] = createCalls;
  assert.deepEqual(callData.metadata, {});
});
