import test, { mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { requestLogger } from "../requestLogger.js";

afterEach(() => {
  mock.restoreAll();
});

const invokeMiddleware = (req, res) => {
  return new Promise((resolve) => {
    const mockRes = {
      statusCode: res.statusCode || 200,
      on: (event, cb) => {
        if (event === "finish") {
          mockRes._finishCb = cb;
        }
      },
      finish: function () {
        if (this._finishCb) this._finishCb();
      },
      get: () => res.userAgent || "TestAgent/1.0",
    };
    const mockReq = {
      method: req.method || "GET",
      originalUrl: req.originalUrl || "/api/test",
      ip: req.ip || "127.0.0.1",
      user: req.user || null,
      id: undefined,
    };
    requestLogger(mockReq, mockRes, () => {
      resolve({ req: mockReq, nextCalled: true });
    });
  });
};

test("assigns a UUID to req.id", async () => {
  const { req } = await invokeMiddleware({}, { statusCode: 200 });
  assert.ok(req.id, "req.id should be assigned a UUID");
  assert.strictEqual(typeof req.id, "string", "req.id should be a string");
});

test("UUID matches v4 format", async () => {
  const { req } = await invokeMiddleware({}, { statusCode: 200 });
  assert.match(
    req.id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    "req.id should be a valid UUIDv4"
  );
});

test("calls next() synchronously", async () => {
  const { nextCalled } = await invokeMiddleware({}, { statusCode: 200 });
  assert.strictEqual(nextCalled, true, "next() should be called");
});

test("sets req.id before calling next()", async () => {
  let idDuringNext;
  const mockRes = {
    statusCode: 200,
    on: () => {},
    get: () => "TestAgent/1.0",
  };
  const mockReq = { method: "GET", originalUrl: "/api/test", ip: "127.0.0.1", user: null, id: undefined };
  requestLogger(mockReq, mockRes, () => {
    idDuringNext = mockReq.id;
  });
  assert.ok(idDuringNext, "req.id must be set before next() is called");
});

test("unique IDs for each request", async () => {
  const { req: req1 } = await invokeMiddleware({ method: "GET", originalUrl: "/api/test1" }, { statusCode: 200 });
  const { req: req2 } = await invokeMiddleware({ method: "GET", originalUrl: "/api/test2" }, { statusCode: 200 });
  assert.notStrictEqual(req1.id, req2.id, "each request should get a unique ID");
});
