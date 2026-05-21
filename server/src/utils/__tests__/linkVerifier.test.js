import assert from "node:assert/strict";
import test, { mock } from "node:test";
import axios from "axios";
import { verifyLink, verifyLinks } from "../linkVerifier.js";

test("verifyLink - returns false if url is missing", async () => {
  const result = await verifyLink(null);
  assert.equal(result.isValid, false);
  assert.equal(result.status, null);
});

test("verifyLink - handles successful link verification", async () => {
  // Mock axios.get to return a successful response
  mock.method(axios, "get", async () => {
    return { status: 200 };
  });

  const result = await verifyLink("https://google.com");
  assert.equal(result.isValid, true);
  assert.equal(result.status, 200);

  // Restore the original method
  mock.restoreAll();
});

test("verifyLink - handles error status like 404 as invalid", async () => {
  // Mock axios.get to throw an error for 404
  mock.method(axios, "get", async () => {
    const err = new Error("Request failed with status code 404");
    err.response = { status: 404 };
    throw err;
  });

  const result = await verifyLink("https://google.com/invalid-page");
  assert.equal(result.isValid, false);
  assert.equal(result.status, 404);

  mock.restoreAll();
});

test("verifyLink - handles bot protection (403, 429) as potentially valid", async () => {
  mock.method(axios, "get", async () => {
    const err = new Error("Request failed with status code 403");
    err.response = { status: 403 };
    throw err;
  });

  const result = await verifyLink("https://linkedin.com/in/someone");
  assert.equal(result.isValid, true);
  assert.equal(result.status, 403);

  mock.restoreAll();
});

test("verifyLinks - verifies multiple links in parallel", async () => {
  let calls = 0;
  mock.method(axios, "get", async () => {
    calls++;
    return { status: 200 };
  });

  const urls = ["https://site1.com", "https://site2.com", "https://site1.com"];
  const results = await verifyLinks(urls);

  assert.equal(results.length, 2); // Duplicate 'site1.com' should be filtered out
  assert.equal(calls, 2);
  assert.equal(results[0].isValid, true);
  assert.equal(results[1].isValid, true);

  mock.restoreAll();
});
