import { describe, test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "../..");

const createdLogs = [];
const mockCreate = mock.fn(async (data) => {
  createdLogs.push(data);
  return {};
});

// Mock modules BEFORE importing the module under test
const auditPath = `file://${serverRoot}/src/database/models/AuditLog.js`;
const loggerPath = `file://${serverRoot}/src/utils/logger.js`;

await mock.module(auditPath, {
  namedExports: {},
  defaultExport: { create: mockCreate },
});

await mock.module(loggerPath, {
  namedExports: {},
  defaultExport: {
    info: mock.fn(),
    warn: mock.fn(),
    error: mock.fn(),
    debug: mock.fn(),
  },
});

const { logAction } = await import("../middleware/auditLogger.js");

describe("auditLogger middleware", () => {
  beforeEach(() => {
    createdLogs.length = 0;
    mockCreate.mock.resetCalls();
  });

  test("logAction is a function that returns a 3-arg middleware function", () => {
    assert.equal(typeof logAction, "function");
    const middleware = logAction("TEST_ACTION");
    assert.equal(typeof middleware, "function");
    assert.equal(middleware.length, 3);
  });

  test("middleware calls next() immediately without waiting for response", () => {
    const next = mock.fn();
    const req = { user: null, ip: "127.0.0.1", originalUrl: "/test", headers: {} };
    const res = { on: () => {}, statusCode: 200 };

    const middleware = logAction("IMMEDIATE_NEXT");
    middleware(req, res, next);

    assert.equal(next.mock.callCount(), 1);
  });

  test("middleware registers a 'finish' event listener on res", () => {
    const onMock = mock.fn();
    const req = { user: null, ip: "127.0.0.1", originalUrl: "/test", headers: {} };
    const res = { on: onMock, statusCode: 200 };

    const middleware = logAction("REG_FINISH");
    middleware(req, res, () => {});

    assert.equal(onMock.mock.calls.length, 1);
    const [event, cb] = onMock.mock.calls[0].arguments;
    assert.equal(event, "finish");
    assert.equal(typeof cb, "function");
  });

  test("finish callback creates audit log with null userId when unauthenticated", async () => {
    const req = {
      user: null,
      ip: "192.168.1.10",
      originalUrl: "/api/public",
      headers: {},
    };
    const finishCallbacks = [];
    const res = {
      on: (event, cb) => { if (event === "finish") finishCallbacks.push(cb); },
      statusCode: 200,
    };

    const middleware = logAction("PUBLIC_ENDPOINT");
    middleware(req, res, () => {});
    finishCallbacks[0]();
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(createdLogs.length, 1);
    assert.equal(createdLogs[0].userId, null);
    assert.equal(createdLogs[0].action, "PUBLIC_ENDPOINT");
    assert.equal(createdLogs[0].resource, "/api/public");
    assert.equal(createdLogs[0].ipAddress, "192.168.1.10");
  });

  test("finish callback creates audit log with populated userId when authenticated", async () => {
    const req = {
      user: { _id: "user_abc123" },
      ip: "10.0.0.5",
      originalUrl: "/api/users/profile",
      headers: {},
    };
    const finishCallbacks = [];
    const res = {
      on: (event, cb) => { if (event === "finish") finishCallbacks.push(cb); },
      statusCode: 201,
    };

    const middleware = logAction("USER_PROFILE_UPDATE");
    middleware(req, res, () => {});
    finishCallbacks[0]();
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(createdLogs.length, 1);
    assert.equal(createdLogs[0].userId, "user_abc123");
    assert.equal(createdLogs[0].action, "USER_PROFILE_UPDATE");
  });

  test("extractMetadata result is included in audit log metadata", async () => {
    const extractMetadata = (req, res) => ({
      requestId: "req_xyz",
      status: res.statusCode,
    });

    const req = {
      user: { _id: "user_meta" },
      ip: "1.2.3.4",
      originalUrl: "/api/meta",
      headers: {},
    };
    const finishCallbacks = [];
    const res = {
      on: (event, cb) => { if (event === "finish") finishCallbacks.push(cb); },
      statusCode: 200,
    };

    const middleware = logAction("META_ACTION", extractMetadata);
    middleware(req, res, () => {});
    finishCallbacks[0]();
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(createdLogs.length, 1);
    assert.equal(createdLogs[0].metadata.requestId, "req_xyz");
    assert.equal(createdLogs[0].metadata.status, 200);
  });

  test("extractMetadata errors are caught and do not propagate", () => {
    const extractMetadata = () => {
      throw new Error("intentional extraction failure");
    };

    const req = {
      user: { _id: "user_err" },
      ip: "5.6.7.8",
      originalUrl: "/api/err",
      headers: {},
    };
    const finishCallbacks = [];
    const res = {
      on: (event, cb) => { if (event === "finish") finishCallbacks.push(cb); },
      statusCode: 200,
    };

    const middleware = logAction("META_ERROR_TEST", extractMetadata);
    middleware(req, res, () => {});

    assert.doesNotThrow(() => finishCallbacks[0]());
  });

  test("x-forwarded-for is used as ipAddress fallback when req.ip is absent", async () => {
    const req = {
      user: null,
      ip: undefined,
      headers: { "x-forwarded-for": "203.0.113.50, 70.41.3.18" },
      originalUrl: "/api/proxied",
    };
    const finishCallbacks = [];
    const res = {
      on: (event, cb) => { if (event === "finish") finishCallbacks.push(cb); },
      statusCode: 200,
    };

    const middleware = logAction("PROXIED_REQ");
    middleware(req, res, () => {});
    finishCallbacks[0]();
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(createdLogs.length, 1);
    assert.equal(createdLogs[0].ipAddress, "203.0.113.50, 70.41.3.18");
  });
});
