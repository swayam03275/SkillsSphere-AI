import test from "node:test";
import assert from "node:assert/strict";

const invokeMiddleware = (middleware, req = {}, res = {}) => {
  let nextCalled = false;
  let nextError = null;
  let finishCallback = null;

  // Provide defaults that the middleware expects
  const request = {
    id: undefined,
    method: req.method || "GET",
    originalUrl: req.originalUrl || "/",
    ip: req.ip || "127.0.0.1",
    user: req.user || null,
    get(name) {
      if (name === "user-agent") return this.userAgent || "test-agent";
      return this.headers?.[name.toLowerCase()];
    },
    userAgent: req.userAgent || "test-agent",
    headers: req.headers || {},
    ...req,
  };

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

  middleware(request, response, next);

  return { nextCalled, nextError, response, finishCallback, req: request };
};

test("requestLogger assigns a UUID to req.id", async () => {
  const { requestLogger } = await import("../requestLogger.js");
  const { req } = invokeMiddleware(requestLogger, {});
  assert.ok(req.id, "req.id should be assigned");
  assert.ok(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.id),
    "req.id should be a valid UUID"
  );
});

test("assigns a unique UUID per request", async () => {
  const { requestLogger } = await import("../requestLogger.js");
  const { req: req1 } = invokeMiddleware(requestLogger, {});
  const { req: req2 } = invokeMiddleware(requestLogger, {});
  assert.notEqual(req1.id, req2.id);
});

test("calls next() immediately without waiting for res.finish", async () => {
  const { requestLogger } = await import("../requestLogger.js");
  const { nextCalled, finishCallback } = invokeMiddleware(requestLogger, {}, {});

  assert.equal(nextCalled, true, "next should be called immediately");
  assert.equal(typeof finishCallback, "function", "finish callback should be registered");
});

test("registers res.on('finish') listener that fires without throwing", async () => {
  const { requestLogger } = await import("../requestLogger.js");
  const { finishCallback } = invokeMiddleware(requestLogger, {}, { statusCode: 200 });

  assert.equal(typeof finishCallback, "function");
  assert.doesNotThrow(finishCallback);
});

test("finish callback does not throw for various status codes", async () => {
  const { requestLogger } = await import("../requestLogger.js");
  const codes = [200, 201, 400, 401, 403, 404, 500, 502];

  for (const code of codes) {
    const { finishCallback } = invokeMiddleware(requestLogger, {}, { statusCode: code });
    assert.doesNotThrow(finishCallback, `finish callback should not throw for status ${code}`);
  }
});

test("handles req with user._id present", async () => {
  const { requestLogger } = await import("../requestLogger.js");
  const req = { user: { _id: "user123" } };
  const { finishCallback } = invokeMiddleware(requestLogger, req, { statusCode: 200 });

  assert.doesNotThrow(finishCallback);
});

test("handles missing user gracefully", async () => {
  const { requestLogger } = await import("../requestLogger.js");
  const req = {};
  const { finishCallback } = invokeMiddleware(requestLogger, req, { statusCode: 200 });

  assert.doesNotThrow(finishCallback);
});

test("handles various HTTP methods without throwing", async () => {
  const { requestLogger } = await import("../requestLogger.js");
  const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];

  for (const method of methods) {
    const req = { method, originalUrl: "/test", user: null };
    const { finishCallback } = invokeMiddleware(requestLogger, req, { statusCode: 200 });
    assert.doesNotThrow(finishCallback, `should handle method ${method}`);
  }
});

test("handles missing originalUrl gracefully", async () => {
  const { requestLogger } = await import("../requestLogger.js");
  const req = {};
  const { finishCallback } = invokeMiddleware(requestLogger, req, { statusCode: 200 });

  assert.doesNotThrow(finishCallback);
});
