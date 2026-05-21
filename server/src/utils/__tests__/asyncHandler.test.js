import assert from "node:assert/strict";
import test from "node:test";
import asyncHandler from "../asyncHandler.js";

test("asyncHandler - calls the wrapped function with req, res, next", async () => {
  let called = false;
  const req = {};
  const res = {};
  const next = () => {};

  const wrapped = asyncHandler(async (q, s, n) => {
    assert.equal(q, req);
    assert.equal(s, res);
    assert.equal(n, next);
    called = true;
  });

  wrapped(req, res, next);
  assert.equal(called, true);
});

test("asyncHandler - catches rejected promises and forwards to next()", async () => {
  const req = {};
  const res = {};
  const expectedError = new Error("Test rejection");
  let receivedError = null;

  const next = (err) => {
    receivedError = err;
  };

  const wrapped = asyncHandler(async () => {
    throw expectedError;
  });

  wrapped(req, res, next);

  // We await a microtask to allow async/promise callback queue to process
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(receivedError, expectedError);
});

test("asyncHandler - resolves normally when no error is thrown", async () => {
  const req = {};
  const res = {};
  let nextCalled = false;

  const next = () => {
    nextCalled = true;
  };

  const wrapped = asyncHandler(async () => {
    return "success";
  });

  wrapped(req, res, next);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(nextCalled, false);
});
