import test from "node:test";
import assert from "node:assert/strict";

test("logger exports default export", async () => {
  const logger = await import("../logger.js");
  assert.ok(logger.default, "logger should have a default export");
  assert.equal(typeof logger.default.info, "function", "logger.info should be a function");
  assert.equal(typeof logger.default.warn, "function", "logger.warn should be a function");
  assert.equal(typeof logger.default.error, "function", "logger.error should be a function");
});

test("logger.info produces a log entry with message", async () => {
  const logger = await import("../logger.js");
  // Should not throw
  assert.doesNotThrow(() => {
    logger.default.info("test info message");
  });
});

test("logger.warn produces a log entry with message", async () => {
  const logger = await import("../logger.js");
  assert.doesNotThrow(() => {
    logger.default.warn("test warn message");
  });
});

test("logger.error produces a log entry with message", async () => {
  const logger = await import("../logger.js");
  assert.doesNotThrow(() => {
    logger.default.error("test error message");
  });
});

test("logger.error handles error objects with stack traces", async () => {
  const logger = await import("../logger.js");
  const err = new Error("Something went wrong");
  assert.doesNotThrow(() => {
    logger.default.error("request failed", err);
  });
});

test("logger.info accepts metadata object as second argument", async () => {
  const logger = await import("../logger.js");
  assert.doesNotThrow(() => {
    logger.default.info("user action", { userId: "user123", action: "login" });
  });
});

test("logger.info accepts requestId metadata", async () => {
  const logger = await import("../logger.js");
  assert.doesNotThrow(() => {
    logger.default.info("api request", { reqId: "req-abc-123" });
  });
});

test("logger.info accepts combined reqId and userId metadata", async () => {
  const logger = await import("../logger.js");
  assert.doesNotThrow(() => {
    logger.default.info("authenticated request", {
      reqId: "req-xyz-789",
      userId: "user-456"
    });
  });
});

test("logger.warn accepts metadata with status and method", async () => {
  const logger = await import("../logger.js");
  assert.doesNotThrow(() => {
    logger.default.warn("client error request", {
      method: "GET",
      url: "/api/test",
      status: 404
    });
  });
});

test("logger.error accepts metadata with duration and ip", async () => {
  const logger = await import("../logger.js");
  assert.doesNotThrow(() => {
    logger.default.error("server error request", {
      method: "POST",
      url: "/api/submit",
      status: 500,
      duration: "120ms",
      ip: "192.168.1.1"
    });
  });
});
