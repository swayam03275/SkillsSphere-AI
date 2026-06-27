import test from "node:test";
import assert from "node:assert/strict";
import { requestLogger } from "../requestLogger.js";

const invokeMiddleware = (middleware, req, res) =>
  new Promise((resolve) => {
    res = res || {};
    const finishListeners = [];
    res.on = (event, cb) => {
      if (event === "finish") finishListeners.push(cb);
    };
    const fireFinish = () => finishListeners.forEach((cb) => cb());

    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; });

    resolve({ nextCalled, req, res, fireFinish });
  });

test("requestLogger sets a UUID on req.id", async () => {
  const req = { method: "GET", originalUrl: "/api/test", ip: "127.0.0.1" };
  const { req: resultReq } = await invokeMiddleware(requestLogger, req);
  assert.ok(resultReq.id, "req.id should be set");
  assert.equal(typeof resultReq.id, "string", "req.id should be a string");
  assert.ok(resultReq.id.length > 0, "req.id should not be empty");
});

test("requestLogger calls next() synchronously", async () => {
  const req = { method: "GET", originalUrl: "/api/test" };
  const { nextCalled } = await invokeMiddleware(requestLogger, req);
  assert.equal(nextCalled, true, "next() should be called immediately");
});

test("requestLogger registers a finish event listener on the response", async () => {
  const req = { method: "POST", originalUrl: "/api/data" };
  const res = {};
  const finishListeners = [];
  res.on = (event, cb) => {
    if (event === "finish") finishListeners.push(cb);
  };

  let nextCalled = false;
  requestLogger(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.ok(finishListeners.length > 0, "a finish listener should be registered");
});

test("requestLogger finish handler does not throw on res without user", async () => {
  const req = { method: "GET", originalUrl: "/api/public", ip: "10.0.0.1", get: () => "test-agent" };
  const res = { statusCode: 200 };
  const finishListeners = [];
  res.on = (event, cb) => {
    if (event === "finish") finishListeners.push(cb);
  };

  let nextCalled = false;
  requestLogger(req, res, () => { nextCalled = true; });

  assert.doesNotThrow(() => finishListeners.forEach((cb) => cb()));
});

test("requestLogger finish handler handles authenticated user context", async () => {
  const req = {
    method: "DELETE",
    originalUrl: "/api/jobs/123",
    ip: "10.0.0.5",
    user: { _id: "user-id-42" },
    get: () => "Mozilla/5.0",
  };
  const res = { statusCode: 204 };
  const finishListeners = [];
  res.on = (event, cb) => {
    if (event === "finish") finishListeners.push(cb);
  };

  let nextCalled = false;
  requestLogger(req, res, () => { nextCalled = true; });

  assert.doesNotThrow(() => finishListeners.forEach((cb) => cb()));
});

test("requestLogger logs on error status codes (>= 500)", async () => {
  const req = {
    method: "GET",
    originalUrl: "/api/cause-error",
    ip: "127.0.0.1",
    get: () => "curl/7.0",
  };
  const res = { statusCode: 500 };
  const finishListeners = [];
  res.on = (event, cb) => {
    if (event === "finish") finishListeners.push(cb);
  };

  let nextCalled = false;
  requestLogger(req, res, () => { nextCalled = true; });

  assert.doesNotThrow(() => finishListeners.forEach((cb) => cb()));
  assert.equal(nextCalled, true);
});

test("requestLogger logs on client error status codes (>= 400 and < 500)", async () => {
  const req = {
    method: "POST",
    originalUrl: "/api/invalid",
    ip: "127.0.0.1",
    get: () => "curl/7.0",
  };
  const res = { statusCode: 422 };
  const finishListeners = [];
  res.on = (event, cb) => {
    if (event === "finish") finishListeners.push(cb);
  };

  let nextCalled = false;
  requestLogger(req, res, () => { nextCalled = true; });

  assert.doesNotThrow(() => finishListeners.forEach((cb) => cb()));
  assert.equal(nextCalled, true);
});
