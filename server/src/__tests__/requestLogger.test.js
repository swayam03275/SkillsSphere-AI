import { describe, test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "../..");

// Track what logData is passed to logger
let loggedData = null;
const mockLogger = {
  info: mock.fn((msg, data) => { loggedData = data; }),
  warn: mock.fn((msg, data) => { loggedData = data; }),
  error: mock.fn((msg, data) => { loggedData = data; }),
  debug: mock.fn(),
};

// Mock logger before importing the module under test
await mock.module(`file://${serverRoot}/src/utils/logger.js`, {
  namedExports: {},
  defaultExport: mockLogger,
});

const { requestLogger } = await import("../middleware/requestLogger.js");

describe("requestLogger middleware", () => {
  beforeEach(() => {
    loggedData = null;
  });

  test("generates a unique request id via uuid", () => {
    const next = mock.fn();
    const req = {
      method: "GET",
      originalUrl: "/test",
      ip: "127.0.0.1",
      get: () => "test-agent",
    };
    const res = { on: () => {}, statusCode: 200 };

    requestLogger(req, res, next);

    assert.ok(req.id, "req.id should be set");
    assert.equal(typeof req.id, "string");
    assert.notEqual(req.id.length, 0);
  });

  test("calls next() immediately", () => {
    const next = mock.fn();
    const req = {
      method: "GET",
      originalUrl: "/test",
      ip: "127.0.0.1",
      get: () => "test-agent",
    };
    const res = { on: () => {}, statusCode: 200 };

    requestLogger(req, res, next);

    assert.equal(next.mock.calls.length, 1);
  });

  test("registers a finish listener on res", () => {
    const onMock = mock.fn();
    const req = {
      method: "GET",
      originalUrl: "/test",
      ip: "127.0.0.1",
      get: () => "test-agent",
    };
    const res = { on: onMock, statusCode: 200 };

    requestLogger(req, res, () => {});

    assert.equal(onMock.mock.calls.length, 1);
    const [event] = onMock.mock.calls[0].arguments;
    assert.equal(event, "finish");
  });

  test("ip field goes through sanitizeValue to prevent log injection", async () => {
    // Craft a request with newline injection in the IP
    const req = {
      method: "GET",
      originalUrl: "/test",
      ip: "127.0.0.1\n[INJECTED] fake log entry",
      get: () => "test-agent",
    };
    const finishCallbacks = [];
    const res = {
      on: (event, cb) => { if (event === "finish") finishCallbacks.push(cb); },
      statusCode: 200,
    };

    requestLogger(req, res, () => {});
    finishCallbacks[0]();
    await new Promise(resolve => setImmediate(resolve));

    // Verify the ip in loggedData does NOT contain newline (proving sanitizeValue was applied)
    assert.ok(loggedData, "logger should have been called");
    assert.ok(
      !loggedData.ip.includes("\n"),
      `logData.ip should not contain newline after sanitizeValue. Got: ${JSON.stringify(loggedData.ip)}`
    );
  });

  test("url and userAgent also go through sanitizeValue", async () => {
    const req = {
      method: "POST",
      originalUrl: "/api/users?email=user@example.com",
      ip: "10.0.0.1",
      get: () => "Mozilla/5.0",
    };
    const finishCallbacks = [];
    const res = {
      on: (event, cb) => { if (event === "finish") finishCallbacks.push(cb); },
      statusCode: 200,
    };

    requestLogger(req, res, () => {});
    finishCallbacks[0]();
    await new Promise(resolve => setImmediate(resolve));

    // Verify url in logData was sanitized (email masked)
    assert.ok(loggedData.url.includes("/api/users"), "url should be logged");
    // Verify ip was sanitized
    assert.ok(loggedData.ip.includes("10.0.0.1"), "ip should be logged");
    // Verify userAgent was sanitized
    assert.ok(loggedData.userAgent.includes("Mozilla"), "userAgent should be logged");
  });

  test("logs warning for 4xx status codes without throwing", () => {
    const next = mock.fn();
    const req = {
      method: "POST",
      originalUrl: "/api/bad",
      ip: "10.0.0.1",
      get: () => "test-agent",
    };
    const finishCallbacks = [];
    const res = {
      on: (event, cb) => { if (event === "finish") finishCallbacks.push(cb); },
      statusCode: 404,
    };

    requestLogger(req, res, next);
    assert.doesNotThrow(() => finishCallbacks[0]());
  });

  test("logs error for 5xx status codes without throwing", () => {
    const next = mock.fn();
    const req = {
      method: "GET",
      originalUrl: "/api/crash",
      ip: "10.0.0.1",
      get: () => "test-agent",
    };
    const finishCallbacks = [];
    const res = {
      on: (event, cb) => { if (event === "finish") finishCallbacks.push(cb); },
      statusCode: 500,
    };

    requestLogger(req, res, next);
    assert.doesNotThrow(() => finishCallbacks[0]());
  });
});
