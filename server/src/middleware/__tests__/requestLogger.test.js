import test, { mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { requestLogger } from "../requestLogger.js";
import logger from "../../utils/logger.js";

afterEach(() => {
  mock.restoreAll();
});

test("requestLogger - assigns req.id as a UUID string", () => {
  let nextCalled = false;
  const req = {};
  const res = { on: () => {} };
  const next = () => { nextCalled = true; };

  requestLogger(req, res, next);

  assert.ok(req.id, "req.id should be assigned");
  assert.equal(typeof req.id, "string", "req.id should be a string");
  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  assert.match(req.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.equal(nextCalled, true);
});

test("requestLogger - measures request duration and calls logger.error for 5xx", async () => {
  let finishHandler;
  const req = {
    method: "GET",
    originalUrl: "/api/test",
    ip: "1.2.3.4",
    user: { _id: "user1" },
    get: () => "Mozilla/5.0"
  };
  const res = {
    statusCode: 500,
    on: (event, handler) => {
      if (event === "finish") finishHandler = handler;
    }
  };
  const next = () => {};

  const errorSpy = mock.method(logger, "error", () => {});
  const warnSpy = mock.method(logger, "warn", () => {});
  const infoSpy = mock.method(logger, "info", () => {});

  requestLogger(req, res, next);

  await finishHandler();

  assert.equal(errorSpy.mock.calls.length, 1, "should log error for 5xx");
  assert.equal(warnSpy.mock.calls.length, 0, "should not log warn for 5xx");
  assert.equal(infoSpy.mock.calls.length, 0, "should not log info for 5xx");

  const [message, meta] = errorSpy.mock.calls[0].arguments;
  assert.equal(message, "Request failed");
  assert.ok(meta.reqId, "meta should include reqId");
  assert.equal(meta.userId, "user1");
  assert.equal(meta.method, "GET");
  assert.equal(meta.url, "/api/test");
  assert.equal(meta.status, 500);
  assert.ok(meta.duration, "meta should include duration");
  assert.equal(meta.ip, "1.2.3.4");
});

test("requestLogger - calls logger.warn for 4xx status codes", async () => {
  let finishHandler;
  const req = {
    method: "POST",
    originalUrl: "/api/test",
    ip: "1.2.3.4",
    user: undefined,
    get: () => "TestAgent/1.0"
  };
  const res = {
    statusCode: 404,
    on: (event, handler) => {
      if (event === "finish") finishHandler = handler;
    }
  };
  const next = () => {};

  const warnSpy = mock.method(logger, "warn", () => {});
  const errorSpy = mock.method(logger, "error", () => {});
  const infoSpy = mock.method(logger, "info", () => {});

  requestLogger(req, res, next);

  await finishHandler();

  assert.equal(warnSpy.mock.calls.length, 1, "should log warn for 4xx");
  assert.equal(errorSpy.mock.calls.length, 0);
  assert.equal(infoSpy.mock.calls.length, 0);

  const [message, meta] = warnSpy.mock.calls[0].arguments;
  assert.equal(message, "Request client error");
  assert.equal(meta.status, 404);
});

test("requestLogger - calls logger.info for 2xx status codes", async () => {
  let finishHandler;
  const req = {
    method: "DELETE",
    originalUrl: "/api/resource/123",
    ip: "5.6.7.8",
    user: { _id: "user2" },
    get: () => "Chrome/120"
  };
  const res = {
    statusCode: 200,
    on: (event, handler) => {
      if (event === "finish") finishHandler = handler;
    }
  };
  const next = () => {};

  const infoSpy = mock.method(logger, "info", () => {});
  const warnSpy = mock.method(logger, "warn", () => {});
  const errorSpy = mock.method(logger, "error", () => {});

  requestLogger(req, res, next);

  await finishHandler();

  assert.equal(infoSpy.mock.calls.length, 1, "should log info for 2xx");
  assert.equal(warnSpy.mock.calls.length, 0);
  assert.equal(errorSpy.mock.calls.length, 0);

  const [message, meta] = infoSpy.mock.calls[0].arguments;
  assert.equal(message, "Request completed");
  assert.equal(meta.status, 200);
  assert.equal(meta.method, "DELETE");
  assert.equal(meta.userId, "user2");
});

test("requestLogger - includes userId as undefined when req.user is absent", async () => {
  let finishHandler;
  const req = {
    method: "GET",
    originalUrl: "/api/public",
    ip: "10.0.0.1",
    user: undefined,
    get: () => "TestBot"
  };
  const res = {
    statusCode: 200,
    on: (event, handler) => {
      if (event === "finish") finishHandler = handler;
    }
  };
  const next = () => {};

  const infoSpy = mock.method(logger, "info", () => {});

  requestLogger(req, res, next);
  await finishHandler();

  const [, meta] = infoSpy.mock.calls[0].arguments;
  assert.equal(meta.userId, undefined);
});
