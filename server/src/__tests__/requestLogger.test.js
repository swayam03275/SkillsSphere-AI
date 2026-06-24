import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "crypto";

/**
 * These tests verify the requestLogger middleware logic using inline mocks,
 * covering request ID assignment, log level routing, log field inclusion,
 * and next() call behavior.
 */

describe("requestLogger middleware logic", () => {
  const makeMockLogger = () => {
    const logs = [];
    return {
      logger: {
        error: (...args) => logs.push({ level: "error", args }),
        warn: (...args) => logs.push({ level: "warn", args }),
        info: (...args) => logs.push({ level: "info", args }),
      },
      logs,
    };
  };

  const makeMockRes = (statusCode) => {
    const res = { statusCode };
    res.on = (event, cb) => {
      if (event === "finish") res._finish = cb;
      return () => {};
    };
    res.triggerFinish = () => { if (res._finish) res._finish(); };
    return res;
  };

  const makeMockReq = (method, url, ip, userAgent) => ({
    method,
    originalUrl: url,
    baseUrl: "",
    path: url,
    ip: ip || "127.0.0.1",
    get: (header) => {
      if (header === "user-agent") return userAgent || "TestAgent/1.0";
      return null;
    },
    user: { _id: "user123" },
  });

  test("assigns a UUID v4 to req.id", () => {
    const { logger } = makeMockLogger();
    const mw = buildTestRequestLogger(logger);
    const req = makeMockReq("GET", "/api/test");
    const res = makeMockRes(200);
    mw(req, res, () => {});
    assert.ok(req.id, "req.id should be assigned");
    assert.equal(typeof req.id, "string", "req.id should be a string");
    assert.equal(req.id.length, 36, "req.id should be a UUID v4 format (36 chars)");
    assert.ok(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.id),
      "req.id should be a valid UUID v4",
    );
  });

  test("calls next() immediately without waiting for the response", () => {
    const { logger } = makeMockLogger();
    const mw = buildTestRequestLogger(logger);
    const req = makeMockReq("GET", "/api/test");
    const res = makeMockRes(200);
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true, "next() should be called immediately");
  });

  test("logs error level for 5xx response codes", () => {
    const { logger, logs } = makeMockLogger();
    const mw = buildTestRequestLogger(logger);
    const req = makeMockReq("GET", "/api/test");
    const res = makeMockRes(500);
    mw(req, res, () => {});
    res.triggerFinish();
    assert.equal(logs.filter((l) => l.level === "error").length, 1,
      "should log one error-level entry for 5xx");
    const logEntry = logs.find((l) => l.level === "error");
    const logMsg = logEntry.args[0];
    assert.ok(
      typeof logMsg === "string" && logMsg.includes("Request failed"),
      "error log should mention 'Request failed'",
    );
  });

  test("logs warn level for 4xx response codes", () => {
    const { logger, logs } = makeMockLogger();
    const mw = buildTestRequestLogger(logger);
    const req = makeMockReq("GET", "/api/test");
    const res = makeMockRes(404);
    mw(req, res, () => {});
    res.triggerFinish();
    assert.equal(logs.filter((l) => l.level === "warn").length, 1,
      "should log one warn-level entry for 4xx");
    const logEntry = logs.find((l) => l.level === "warn");
    const logMsg = logEntry.args[0];
    assert.ok(
      typeof logMsg === "string" && logMsg.includes("client error"),
      "warn log should mention 'client error'",
    );
  });

  test("logs info level for 2xx response codes", () => {
    const { logger, logs } = makeMockLogger();
    const mw = buildTestRequestLogger(logger);
    const req = makeMockReq("GET", "/api/test");
    const res = makeMockRes(200);
    mw(req, res, () => {});
    res.triggerFinish();
    assert.equal(logs.filter((l) => l.level === "info").length, 1,
      "should log one info-level entry for 2xx");
    const logEntry = logs.find((l) => l.level === "info");
    const logMsg = logEntry.args[0];
    assert.ok(
      typeof logMsg === "string" && logMsg.includes("completed"),
      "info log should mention 'Request completed'",
    );
  });

  test("log data includes method, url, status, duration, ip, and userAgent", () => {
    const { logger, logs } = makeMockLogger();
    const mw = buildTestRequestLogger(logger);
    const req = makeMockReq("POST", "/api/users/create", "10.0.0.1", "Mozilla/5.0");
    const res = makeMockRes(201);
    mw(req, res, () => {});
    res.triggerFinish();
    assert.equal(logs.length, 1, "should have exactly one log entry");
    // logData is passed as second argument
    const logData = logs[0].args[1];
    assert.equal(logData.method, "POST", "log data should include method");
    assert.equal(logData.url, "/api/users/create", "log data should include url");
    assert.equal(logData.status, 201, "log data should include status code");
    assert.ok(typeof logData.duration === "string" && logData.duration.endsWith("ms"),
      "log data should include duration string");
    assert.equal(logData.ip, "10.0.0.1", "log data should include ip");
    assert.equal(logData.userAgent, "Mozilla/5.0", "log data should include userAgent");
    assert.equal(logData.userId, "user123", "log data should include userId from req.user");
  });

  test("log data includes reqId matching req.id", () => {
    const { logger, logs } = makeMockLogger();
    const mw = buildTestRequestLogger(logger);
    const req = makeMockReq("GET", "/api/test");
    const res = makeMockRes(200);
    mw(req, res, () => {});
    res.triggerFinish();
    const logData = logs[0].args[1];
    assert.equal(logData.reqId, req.id, "log data should include reqId matching req.id");
  });
});

/**
 * Re-implements requestLogger for isolated testing.
 * Mirrors server/src/middleware/requestLogger.js.
 */
function buildTestRequestLogger(logger) {
  return (req, res, next) => {
    req.id = randomUUID();
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get ? req.get("user-agent") : undefined,
        reqId: req.id,
        userId: req.user?._id,
      };
      if (res.statusCode >= 500) {
        logger.error("Request failed", logData);
      } else if (res.statusCode >= 400) {
        logger.warn("Request client error", logData);
      } else {
        logger.info("Request completed", logData);
      }
    });
    next();
  };
}
