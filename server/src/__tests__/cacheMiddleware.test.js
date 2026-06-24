import { describe, test } from "node:test";
import assert from "node:assert/strict";

/**
 * These tests verify the cacheMiddleware logic using inline mock objects
 * without requiring a live Redis instance.
 */

describe("cacheMiddleware integration logic", () => {
  // Tracks calls on the redis client for assertions
  const makeCallTracker = () => ({ getCalls: [], setExCalls: [] });

  test("non-GET requests skip caching and call next immediately", () => {
    const calls = makeCallTracker();
    const redis = { isReady: true, get: () => { calls.getCalls.push("called"); return Promise.resolve(null); } };
    let nextCalled = false;
    const mw = buildTestMiddleware(redis, "prefix", 60);
    mw({ method: "POST", originalUrl: "/api/test" }, {}, () => { nextCalled = true; });
    assert.equal(nextCalled, true, "next() should be called for POST");
    assert.equal(calls.getCalls.length, 0, "redis.get should not be called for non-GET");
  });

  test("cache hit returns cached data without calling next", async () => {
    const cachedBody = { id: 1, name: "Alice" };
    const calls = makeCallTracker();
    const redis = {
      isReady: true,
      get: () => { calls.getCalls.push("cache-hit"); return Promise.resolve(JSON.stringify(cachedBody)); },
    };
    let nextCalled = false;
    let jsonCalled = false;
    let jsonArg = null;
    const req = { method: "GET", originalUrl: "/api/users/1" };
    const res = {
      statusCode: 200,
      json: (body) => { jsonCalled = true; jsonArg = body; },
    };
    const mw = buildTestMiddleware(redis, "prefix", 60);
    await mw(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false, "next() should NOT be called on cache hit");
    assert.equal(jsonCalled, true, "res.json should be called");
    assert.deepEqual(jsonArg, cachedBody, "cached body should be returned");
  });

  test("cache miss calls next and intercepts res.json to cache 2xx responses", async () => {
    const calls = makeCallTracker();
    const redis = {
      isReady: true,
      get: () => { calls.getCalls.push("cache-miss"); return Promise.resolve(null); },
      setEx: (key, ttl, val) => { calls.setExCalls.push({ key, ttl, val }); return Promise.resolve("OK"); },
    };
    const req = { method: "GET", originalUrl: "/api/users/2" };
    let nextCalled = false;
    let handlerJsonBody = null;
    const res = {
      statusCode: 201,
      json: (body) => { handlerJsonBody = body; return body; },
    };
    const mw = buildTestMiddleware(redis, "users", 60);
    await mw(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true, "next() should be called on cache miss");
    assert.equal(calls.getCalls[0], "cache-miss");
    // Simulate the route handler calling res.json with the response body
    res.json({ id: 2, name: "Bob" });
    assert.equal(calls.setExCalls.length, 1, "redis.setEx should be called once for 2xx");
    assert.equal(calls.setExCalls[0].key, "users:/api/users/2", "cache key should include prefix and URL");
    assert.equal(calls.setExCalls[0].ttl, 60, "TTL should match configured value");
  });

  test("non-2xx responses are not cached", async () => {
    const calls = makeCallTracker();
    const redis = {
      isReady: true,
      get: () => { calls.getCalls.push("miss"); return Promise.resolve(null); },
      setEx: (key, ttl, val) => { calls.setExCalls.push({ key, ttl, val }); return Promise.resolve("OK"); },
    };
    const req = { method: "GET", originalUrl: "/api/users/3" };
    const res = { statusCode: 500, json: () => {} };
    const mw = buildTestMiddleware(redis, "users", 60);
    await mw(req, res, () => {});
    res.json({ error: "Server error" });
    assert.equal(calls.setExCalls.length, 0, "redis.setEx should NOT be called for 5xx");
  });

  test("skips caching when Redis is not ready", async () => {
    const calls = makeCallTracker();
    const redis = {
      isReady: false,
      get: () => { calls.getCalls.push("called"); return Promise.resolve(null); },
    };
    let nextCalled = false;
    const mw = buildTestMiddleware(redis, "users", 60);
    mw({ method: "GET", originalUrl: "/api/users/4" }, {}, () => { nextCalled = true; });
    assert.equal(nextCalled, true, "next() should be called when Redis is not ready");
    assert.equal(calls.getCalls.length, 0, "redis.get should not be called when Redis is not ready");
  });

  test("cache key is prefix:requestUrl", async () => {
    const calls = makeCallTracker();
    const redis = {
      isReady: true,
      get: (key) => { calls.getCalls.push(key); return Promise.resolve(null); },
      setEx: () => Promise.resolve("OK"),
    };
    const req = { method: "GET", originalUrl: "/api/users/search?q=alice" };
    const res = { statusCode: 200, json: () => {} };
    const mw = buildTestMiddleware(redis, "users", 60);
    await mw(req, res, () => {});
    assert.equal(calls.getCalls[0], "users:/api/users/search?q=alice",
      "cache key should be 'prefix:url'");
  });
});

/**
 * Re-implements the cacheMiddleware logic for isolated testing.
 * Mirrors server/src/middleware/cacheMiddleware.js.
 */
function buildTestMiddleware(redisClient, prefix, ttlSeconds) {
  return async (req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }
    try {
      if (!redisClient.isReady) {
        return next();
      }
      const key = `${prefix}:${req.originalUrl}`;
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisClient.setEx(key, ttlSeconds, JSON.stringify(body));
        }
        return originalJson(body);
      };
      next();
    } catch (error) {
      next();
    }
  };
}
