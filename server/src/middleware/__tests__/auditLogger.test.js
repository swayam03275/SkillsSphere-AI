import test, { mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { logAction } from "../auditLogger.js";
import AuditLog from "../../database/models/AuditLog.js";
import logger from "../../utils/logger.js";

afterEach(() => {
  mock.restoreAll();
});

test("logAction - returns a middleware function", () => {
  const middleware = logAction("TEST_ACTION");
  assert.equal(typeof middleware, "function");
});

test("logAction - calls next() immediately without blocking", () => {
  let nextCalled = false;
  const req = { user: { _id: "user123" }, ip: "127.0.0.1", headers: {}, originalUrl: "/api/test" };
  const res = { on: () => {} };
  const next = () => { nextCalled = true; };

  logAction("TEST_ACTION")(req, res, next);
  assert.equal(nextCalled, true);
});

test("logAction - calls AuditLog.create on finish event with correct fields", async () => {
  let finishHandler;
  const res = {
    on: (event, handler) => {
      if (event === "finish") finishHandler = handler;
    }
  };
  const req = {
    user: { _id: "user456" },
    ip: "192.168.1.1",
    headers: {},
    originalUrl: "/api/jobs"
  };
  const next = () => {};

  const createSpy = mock.method(AuditLog, "create", async () => ({ saved: true }));

  logAction("JOB_CREATE")(req, res, next);
  assert.ok(finishHandler, "finish handler should have been registered");

  await finishHandler();

  assert.equal(createSpy.mock.calls.length, 1);
  const [logEntry] = createSpy.mock.calls[0].arguments;
  assert.equal(logEntry.userId, "user456");
  assert.equal(logEntry.action, "JOB_CREATE");
  assert.equal(logEntry.resource, "/api/jobs");
  assert.equal(logEntry.ipAddress, "192.168.1.1");
});

test("logAction - sets userId to null when req.user is absent", async () => {
  let finishHandler;
  const res = {
    on: (event, handler) => {
      if (event === "finish") finishHandler = handler;
    }
  };
  const req = {
    user: undefined,
    ip: "10.0.0.1",
    headers: {},
    originalUrl: "/api/public",
    connection: {}
  };
  const next = () => {};

  const createSpy = mock.method(AuditLog, "create", async () => ({ saved: true }));

  logAction("PUBLIC_ACCESS")(req, res, next);
  await finishHandler();

  const [logEntry] = createSpy.mock.calls[0].arguments;
  assert.equal(logEntry.userId, null);
});

test("logAction - uses x-forwarded-for header when req.ip is absent", async () => {
  let finishHandler;
  const res = {
    on: (event, handler) => {
      if (event === "finish") finishHandler = handler;
    }
  };
  const req = {
    user: null,
    ip: undefined,
    headers: { "x-forwarded-for": "8.8.8.8" },
    originalUrl: "/api/test",
    connection: {}
  };
  const next = () => {};

  const createSpy = mock.method(AuditLog, "create", async () => ({ saved: true }));

  logAction("ACTION")(req, res, next);
  await finishHandler();

  const [logEntry] = createSpy.mock.calls[0].arguments;
  assert.equal(logEntry.ipAddress, "8.8.8.8");
});

test("logAction - calls extractMetadata and includes result in log entry", async () => {
  let finishHandler;
  const res = {
    on: (event, handler) => {
      if (event === "finish") finishHandler = handler;
    }
  };
  const extractMetadata = (req, res) => ({
    jobId: "job789",
    method: req.method
  });
  const req = {
    user: { _id: "user1" },
    ip: "1.2.3.4",
    headers: {},
    originalUrl: "/api/match",
    method: "POST"
  };
  const next = () => {};

  const createSpy = mock.method(AuditLog, "create", async () => ({ saved: true }));

  logAction("MATCH", extractMetadata)(req, res, next);
  await finishHandler();

  const [logEntry] = createSpy.mock.calls[0].arguments;
  assert.equal(logEntry.metadata.jobId, "job789");
  assert.equal(logEntry.metadata.method, "POST");
});

test("logAction - catches extractMetadata exceptions and logs a warning without crashing", async () => {
  let finishHandler;
  const res = {
    on: (event, handler) => {
      if (event === "finish") finishHandler = handler;
    }
  };
  const badExtract = () => { throw new Error("metadata extraction failed"); };
  const req = {
    user: { _id: "user1" },
    ip: "1.2.3.4",
    headers: {},
    originalUrl: "/api/test",
    connection: {}
  };
  const next = () => {};

  const warnSpy = mock.method(logger, "warn", () => {});
  const createSpy = mock.method(AuditLog, "create", async () => ({ saved: true }));

  logAction("ACTION", badExtract)(req, res, next);
  await finishHandler();

  // Should still have created the log entry with empty metadata
  assert.equal(createSpy.mock.calls.length, 1);
  const [logEntry] = createSpy.mock.calls[0].arguments;
  assert.deepEqual(logEntry.metadata, {});

  // Should have logged a warning
  assert.equal(warnSpy.mock.calls.length, 1);
  assert.match(warnSpy.mock.calls[0].arguments[0], /metadata extraction failed/);
});

test("logAction - catches AuditLog.create errors and logs without crashing", async () => {
  let finishHandler;
  const res = {
    on: (event, handler) => {
      if (event === "finish") finishHandler = handler;
    }
  };
  const req = {
    user: { _id: "user1" },
    ip: "1.2.3.4",
    headers: {},
    originalUrl: "/api/test",
    connection: {}
  };
  const next = () => {};

  const errorSpy = mock.method(logger, "error", () => {});
  mock.method(AuditLog, "create", async () => {
    throw new Error("DB write failed");
  });

  logAction("ACTION")(req, res, next);

  // Should not throw
  await finishHandler();

  // Should have logged an error
  assert.equal(errorSpy.mock.calls.length, 1);
  assert.match(errorSpy.mock.calls[0].arguments[0], /Error saving audit log/);
});
