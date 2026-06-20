import test, { mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import cacheMiddleware from "../cacheMiddleware.js";

afterEach(() => {
  mock.restoreAll();
});

const invokeMiddleware = (middleware, req, res = {}) =>
  new Promise((resolve) => {
    const response = {
      statusCode: 200,
      ...res,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.jsonBody = body;
        resolve({ response, jsonCalled: true });
        return this;
      },
    };

    middleware(req, response, (err) => {
      if (err) {
        resolve({ nextError: err });
        return;
      }
      resolve({ nextCalled: true, response });
    });
  });

test("non-GET requests call next() without caching", async () => {
  const req = { method: "POST", originalUrl: "/api/test" };
  const result = await invokeMiddleware(cacheMiddleware("test", 60), req);

  assert.equal(result.nextCalled, true);
});

test("non-GET requests call next() for PUT method", async () => {
  const req = { method: "PUT", originalUrl: "/api/update" };
  const result = await invokeMiddleware(cacheMiddleware("update", 60), req);

  assert.equal(result.nextCalled, true);
});

test("non-GET requests call next() for DELETE method", async () => {
  const req = { method: "DELETE", originalUrl: "/api/delete" };
  const result = await invokeMiddleware(cacheMiddleware("delete", 60), req);

  assert.equal(result.nextCalled, true);
});

test("non-GET requests call next() for PATCH method", async () => {
  const req = { method: "PATCH", originalUrl: "/api/patch" };
  const result = await invokeMiddleware(cacheMiddleware("patch", 60), req);

  assert.equal(result.nextCalled, true);
});

test("middleware exports a function that returns a function", () => {
  const result = cacheMiddleware("test", 60);
  assert.equal(typeof result, "function");
});

test("middleware returns async function", async () => {
  const middleware = cacheMiddleware("test", 60);
  const req = { method: "GET", originalUrl: "/api/test" };
  // Just verify it returns a promise when called
  const result = middleware(req, {}, () => {});
  assert.equal(typeof result.then, "function");
});
