import assert from "node:assert/strict";
import test from "node:test";
import { SimpleCache } from "../cache.js";

test("get returns undefined for missing keys", () => {
  const cache = new SimpleCache();
  assert.equal(cache.get("nonexistent"), null);
});

test("set stores a value that can be retrieved with get", () => {
  const cache = new SimpleCache();
  cache.set("key1", "value1", 60);
  assert.equal(cache.get("key1"), "value1");
});

test("get returns null after TTL expires", async () => {
  const cache = new SimpleCache();
  cache.set("expiring", "data", 0); // 0 seconds = immediate expiry
  // Wait a tick to allow the expiry to take effect
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(cache.get("expiring"), null);
});

test("delete removes an existing key", () => {
  const cache = new SimpleCache();
  cache.set("key2", "value2", 60);
  cache.delete("key2");
  assert.equal(cache.get("key2"), null);
});

test("clear removes all keys", () => {
  const cache = new SimpleCache();
  cache.set("a", 1, 60);
  cache.set("b", 2, 60);
  cache.set("c", 3, 60);
  cache.clear();
  assert.equal(cache.get("a"), null);
  assert.equal(cache.get("b"), null);
  assert.equal(cache.get("c"), null);
});

test("set correctly overwrites an existing key", () => {
  const cache = new SimpleCache();
  cache.set("key3", "old", 60);
  cache.set("key3", "new", 60);
  assert.equal(cache.get("key3"), "new");
});

test("multiple keys coexist independently", () => {
  const cache = new SimpleCache();
  cache.set("name", "Alice", 60);
  cache.set("age", 30, 60);
  cache.set("city", "NYC", 60);
  assert.equal(cache.get("name"), "Alice");
  assert.equal(cache.get("age"), 30);
  assert.equal(cache.get("city"), "NYC");
});

test("get returns null for expired key without deleting it manually", async () => {
  const cache = new SimpleCache();
  cache.set("temp", "temporary-data", 0);
  await new Promise(resolve => setTimeout(resolve, 10));
  // Calling get on an expired key should return null and not throw
  const result = cache.get("temp");
  assert.equal(result, null);
});

test("storing and retrieving complex objects", () => {
  const cache = new SimpleCache();
  const complex = { user: "bob", scores: [95, 87, 92], meta: { active: true } };
  cache.set("complex", complex, 60);
  const retrieved = cache.get("complex");
  assert.deepEqual(retrieved, complex);
});

test("storing falsy values (false, 0, empty string) is supported", () => {
  const cache = new SimpleCache();
  cache.set("falsyFalse", false, 60);
  cache.set("falsyZero", 0, 60);
  cache.set("falsyEmpty", "", 60);
  assert.equal(cache.get("falsyFalse"), false);
  assert.equal(cache.get("falsyZero"), 0);
  assert.equal(cache.get("falsyEmpty"), "");
});

test("has returns true for existing non-expired key", () => {
  const cache = new SimpleCache();
  cache.set("key1", "value1", 60);
  assert.strictEqual(cache.has("key1"), true);
});

test("has returns false for missing key", () => {
  const cache = new SimpleCache();
  assert.strictEqual(cache.has("nonexistent"), false);
});

test("has returns false for expired key", async () => {
  const cache = new SimpleCache();
  cache.set("expiring", "data", 0);
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.strictEqual(cache.has("expiring"), false);
});

test("isExpired returns false for existing non-expired key", () => {
  const cache = new SimpleCache();
  cache.set("key1", "value1", 60);
  assert.strictEqual(cache.isExpired("key1"), false);
});

test("isExpired returns true for missing key", () => {
  const cache = new SimpleCache();
  assert.strictEqual(cache.isExpired("nonexistent"), true);
});

test("isExpired returns true for expired key", async () => {
  const cache = new SimpleCache();
  cache.set("expiring", "data", 0);
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.strictEqual(cache.isExpired("expiring"), true);
});

test("size returns 0 for empty cache", () => {
  const cache = new SimpleCache();
  assert.strictEqual(cache.size, 0);
});

test("size returns count of non-expired entries", () => {
  const cache = new SimpleCache();
  cache.set("a", 1, 60);
  cache.set("b", 2, 60);
  cache.set("c", 3, 60);
  assert.strictEqual(cache.size, 3);
});

test("size excludes expired entries from count", async () => {
  const cache = new SimpleCache();
  cache.set("a", 1, 60);
  cache.set("b", 2, 0);
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.strictEqual(cache.size, 1);
});

test("has does not remove the key from cache", () => {
  const cache = new SimpleCache();
  cache.set("key1", "value1", 60);
  cache.has("key1");
  assert.strictEqual(cache.has("key1"), true);
  assert.equal(cache.get("key1"), "value1");
});
