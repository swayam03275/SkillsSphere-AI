import assert from "node:assert/strict";
import test from "node:test";
import asyncHandler from "../asyncHandler.js";

test("asyncHandler passes resolved value through when handler succeeds", async () => {
  const mockReq = {};
  const mockRes = {};
  const mockNext = () => {};

  const handler = asyncHandler(async (req, res, next) => {
    return "resolved value";
  });

  const result = await handler(mockReq, mockRes, mockNext);
  assert.equal(result, "resolved value");
});

test("asyncHandler calls next with error when handler throws", async () => {
  const mockReq = {};
  const mockRes = {};
  let nextCalledWith = undefined;

  const expectedError = new Error("Handler error");
  const mockNext = (err) => {
    nextCalledWith = err;
  };

  const handler = asyncHandler(async (req, res, next) => {
    throw expectedError;
  });

  await handler(mockReq, mockRes, mockNext);
  assert.equal(nextCalledWith, expectedError);
});

test("asyncHandler passes req, res, and next to the wrapped function", async () => {
  const mockReq = { id: 42 };
  const mockRes = { status: "ok" };
  const mockNext = () => {};
  let receivedReq = null;
  let receivedRes = null;
  let receivedNext = null;

  const handler = asyncHandler(async (req, res, next) => {
    receivedReq = req;
    receivedRes = res;
    receivedNext = next;
    return "ok";
  });

  await handler(mockReq, mockRes, mockNext);
  assert.equal(receivedReq, mockReq);
  assert.equal(receivedRes, mockRes);
  assert.equal(receivedNext, mockNext);
});
