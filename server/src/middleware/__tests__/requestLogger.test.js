import { describe, test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { requestLogger } from "../requestLogger.js";
import logger from "../../utils/logger.js";

const makeReq = (overrides = {}) => ({
  method: "GET",
  originalUrl: "/api/test",
  ip: "127.0.0.1",
  headers: {},
  user: null,
  get: (header) => overrides.headers?.[header] || "",
  ...overrides,
});

const invokeMiddleware = (middleware, req) =>
  new Promise((resolve) => {
    let finishCallback = null;
    const res = {
      statusCode: 200,
      on: (event, cb) => {
        if (event === "finish") finishCallback = cb;
      },
    };
    middleware(req, res, () => resolve({ nextCalled: true, finishCallback, res }));
  });

afterEach(() => {
  mock.restoreAll();
});

test("requestLogger sets req.id to a valid UUID", async () => {
  const req = makeReq();
  const result = await invokeMiddleware(requestLogger, req);
  assert.ok(result.nextCalled);
  assert.ok(req.id, "req.id should be set");
  assert.ok(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.id),
    "req.id should be a valid UUID"
  );
});

test("requestLogger logs at warn level for 4xx status codes", async () => {
  const warnSpy = mock.method(logger, "warn", () => {});
  const infoSpy = mock.method(logger, "info", () => {});

  const req = makeReq();
  const result = await invokeMiddleware(requestLogger, req);
  result.res.statusCode = 404;
  await result.finishCallback();
  await new Promise(r => setTimeout(r, 5));

  assert.ok(warnSpy.mock.calls.length > 0, "logger.warn should be called for 4xx");
  assert.equal(infoSpy.mock.calls.length, 0, "logger.info should not be called for 4xx");
});

test("requestLogger logs at error level for 5xx status codes", async () => {
  const errorSpy = mock.method(logger, "error", () => {});
  const infoSpy = mock.method(logger, "info", () => {});
  const warnSpy = mock.method(logger, "warn", () => {});

  const req = makeReq();
  const result = await invokeMiddleware(requestLogger, req);
  result.res.statusCode = 500;
  await result.finishCallback();
  await new Promise(r => setTimeout(r, 5));

  assert.ok(errorSpy.mock.calls.length > 0, "logger.error should be called for 5xx");
  assert.equal(infoSpy.mock.calls.length, 0, "logger.info should not be called for 5xx");
  assert.equal(warnSpy.mock.calls.length, 0, "logger.warn should not be called for 5xx");
});

test("requestLogger logs at info level for 2xx status codes", async () => {
  const infoSpy = mock.method(logger, "info", () => {});
  const warnSpy = mock.method(logger, "warn", () => {});
  const errorSpy = mock.method(logger, "error", () => {});

  const req = makeReq();
  const result = await invokeMiddleware(requestLogger, req);
  result.res.statusCode = 200;
  await result.finishCallback();
  await new Promise(r => setTimeout(r, 5));

  assert.ok(infoSpy.mock.calls.length > 0, "logger.info should be called for 2xx");
  assert.equal(warnSpy.mock.calls.length, 0);
  assert.equal(errorSpy.mock.calls.length, 0);
});

test("requestLogger includes req.user._id in log data when user is present", async () => {
  const infoSpy = mock.method(logger, "info", () => {});

  const req = makeReq({ user: { _id: "user456" } });
  const result = await invokeMiddleware(requestLogger, req);
  await result.finishCallback();
  await new Promise(r => setTimeout(r, 5));

  assert.ok(infoSpy.mock.calls.length > 0);
  const logCall = infoSpy.mock.calls[0];
  assert.equal(logCall.arguments[1].userId, "user456", "userId should be logged when user is present");
});
