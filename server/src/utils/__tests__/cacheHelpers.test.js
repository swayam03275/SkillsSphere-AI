import assert from "node:assert/strict";
import test from "node:test";
import { mock } from "node:test";
import redisClient from "../../config/redis.js";
import { invalidateCacheByPrefix } from "../cacheHelpers.js";

// Make isReady writable so tests can control the Redis availability flag
Object.defineProperty(redisClient, "isReady", {
  value: false,
  writable: true,
  configurable: true,
});

test("invalidateCacheByPrefix deletes matching keys via scan + del", async () => {
  const scanKeys = ["user:session:abc", "user:session:def"];
  const delCalled = [];

  redisClient.isReady = true;
  mock.method(redisClient, "scan", async () => ({ cursor: 0, keys: scanKeys }));
  mock.method(redisClient, "del", async (keys) => {
    delCalled.push(...keys);
    return keys.length;
  });

  await invalidateCacheByPrefix("user:session");

  assert.deepEqual(delCalled.sort(), ["user:session:abc", "user:session:def"].sort());

  mock.restoreAll();
  redisClient.isReady = false;
});

test("invalidateCacheByPrefix is no-op when Redis is unavailable", async () => {
  let called = false;
  redisClient.isReady = false;
  mock.method(redisClient, "scan", async () => { called = true; return { cursor: 0, keys: [] }; });

  await invalidateCacheByPrefix("user:session");

  assert.equal(called, false);
  mock.restoreAll();
});

test("invalidateCacheByPrefix skips del when scan returns no keys", async () => {
  let delCalled = false;
  redisClient.isReady = true;
  mock.method(redisClient, "scan", async () => ({ cursor: 0, keys: [] }));
  mock.method(redisClient, "del", async () => { delCalled = true; return 0; });

  await invalidateCacheByPrefix("nonexistent:prefix");

  assert.equal(delCalled, false);
  mock.restoreAll();
});

test("invalidateCacheByPrefix logs error and continues when scan throws", async () => {
  redisClient.isReady = true;
  mock.method(redisClient, "scan", async () => { throw new Error("Redis scan failed"); });

  // Should not throw — error is caught internally
  await invalidateCacheByPrefix("user:session");
  mock.restoreAll();
});

test("invalidateCacheByPrefix handles multiple scan pages", async () => {
  let callCount = 0;
  redisClient.isReady = true;
  mock.method(redisClient, "scan", async () => {
    callCount++;
    if (callCount === 1) return { cursor: 1, keys: ["a:1"] };
    return { cursor: 0, keys: ["a:2"] };
  });
  const delCalled = [];
  mock.method(redisClient, "del", async (keys) => {
    delCalled.push(...keys);
    return keys.length;
  });

  await invalidateCacheByPrefix("a");

  assert.deepEqual(delCalled.sort(), ["a:1", "a:2"].sort());
  mock.restoreAll();
  redisClient.isReady = false;
});
