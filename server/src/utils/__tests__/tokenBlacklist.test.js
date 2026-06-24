import { describe, it } from "node:test";
import assert from "node:assert/strict";
import test from "node:test";

// Mock redis module before importing tokenBlacklist
const mockRedis = {
  isReady: false,
  setEx: async () => { throw new Error("Redis not mocked"); },
  exists: async () => { throw new Error("Redis not mocked"); },
};

test.mock.module("../../config/redis.js", {
  defaultExport: mockRedis,
  namedExports: mockRedis,
});

const { blacklistToken, isTokenBlacklisted } = await import("../tokenBlacklist.js");

describe("tokenBlacklist", () => {
  let counter = 0;
  const nextJti = () => `jti-${Date.now()}-${++counter}`;

  describe("blacklistToken", () => {
    it("returns early when jti is null", async () => {
      await blacklistToken(null, Math.floor(Date.now() / 1000) + 3600);
    });

    it("returns early when exp is null", async () => {
      await blacklistToken(nextJti(), null);
    });

    it("returns early when token is already expired", async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 60;
      await blacklistToken(nextJti(), pastExp);
    });

    it("falls back to in-memory Map when Redis is not ready", async () => {
      mockRedis.isReady = false;
      const jti = nextJti();
      const exp = Math.floor(Date.now() / 1000) + 3600;
      await blacklistToken(jti, exp);
      const result = await isTokenBlacklisted(jti);
      assert.strictEqual(result, true);
    });
  });

  describe("isTokenBlacklisted", () => {
    it("returns false for null jti", async () => {
      const result = await isTokenBlacklisted(null);
      assert.strictEqual(result, false);
    });

    it("returns false for undefined jti", async () => {
      const result = await isTokenBlacklisted(undefined);
      assert.strictEqual(result, false);
    });

    it("returns false for non-blacklisted token", async () => {
      const result = await isTokenBlacklisted("never-added-jti");
      assert.strictEqual(result, false);
    });

    it("returns true for token added via blacklistToken", async () => {
      mockRedis.isReady = false;
      const jti = nextJti();
      const exp = Math.floor(Date.now() / 1000) + 3600;
      await blacklistToken(jti, exp);
      const result = await isTokenBlacklisted(jti);
      assert.strictEqual(result, true);
    });
  });
});
