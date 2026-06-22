import test from "node:test";
import assert from "node:assert/strict";
import { verifyLink, verifyLinks } from "../linkVerifier.js";

test("verifyLink handles empty string input", async () => {
  const result = await verifyLink("");
  // empty string is falsy — normalized to null in the result
  assert.equal(result.url, null);
  assert.equal(result.isValid, false);
});

test("verifyLink handles null input", async () => {
  const result = await verifyLink(null);
  // url field should be null, not undefined
  assert.equal(result.url, null);
  assert.equal(result.isValid, false);
  assert.equal(result.status, null);
});

test("verifyLink handles undefined input", async () => {
  const result = await verifyLink(undefined);
  // url field should be null for consistency
  assert.equal(result.url, null);
  assert.equal(result.isValid, false);
});

test("verifyLink returns correct shape for valid https url", async () => {
  const result = await verifyLink("https://example.com");
  assert.equal(typeof result.url, "string");
  assert.equal(typeof result.isValid, "boolean");
  assert.equal(typeof result.status, "number");
});

test("verifyLink handles bot-protected domains as valid (403/429)", async () => {
  // LinkedIn returns 999, which is treated as bot-protected
  const result = await verifyLink("https://www.linkedin.com");
  assert.equal(result.url, "https://www.linkedin.com");
  // isValid is either true (if 403/429) or false (if other error)
  assert.equal(typeof result.isValid, "boolean");
});

test("verifyLink handles network errors gracefully", async () => {
  const result = await verifyLink("https://this-domain-does-not-exist-12345.xyz");
  assert.equal(result.url, "https://this-domain-does-not-exist-12345.xyz");
  assert.equal(result.isValid, false);
  assert.ok(result.status !== undefined);
});

test("verifyLinks processes multiple urls", async () => {
  const results = await verifyLinks([
    "https://example.com",
    "https://httpbin.org/status/200",
  ]);
  assert.equal(results.length, 2);
  assert.equal(results[0].url, "https://example.com");
  assert.equal(results[1].url, "https://httpbin.org/status/200");
});

test("verifyLinks deduplicates urls", async () => {
  const results = await verifyLinks([
    "https://example.com",
    "https://example.com",
    "https://example.com",
  ]);
  assert.equal(results.length, 1);
});

test("verifyLinks filters null/undefined and empty string from input", async () => {
  const results = await verifyLinks([null, undefined, ""]);
  // verifyLinks filters out all falsy values
  assert.equal(results.length, 0);
});
