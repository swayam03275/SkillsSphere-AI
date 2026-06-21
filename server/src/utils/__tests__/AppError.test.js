import assert from "node:assert/strict";
import test from "node:test";
import AppError from "../AppError.js";

test("AppError sets statusCode from constructor argument", () => {
  const err = new AppError("Not found", 404);
  assert.equal(err.statusCode, 404);
});

test("AppError sets status to 'fail' for 4xx status codes", () => {
  const err400 = new AppError("Bad request", 400);
  assert.equal(err400.status, "fail");

  const err401 = new AppError("Unauthorized", 401);
  assert.equal(err401.status, "fail");

  const err403 = new AppError("Forbidden", 403);
  assert.equal(err403.status, "fail");

  const err404 = new AppError("Not found", 404);
  assert.equal(err404.status, "fail");
});

test("AppError sets status to 'error' for 5xx status codes", () => {
  const err500 = new AppError("Server error", 500);
  assert.equal(err500.status, "error");

  const err502 = new AppError("Bad gateway", 502);
  assert.equal(err502.status, "error");

  const err503 = new AppError("Service unavailable", 503);
  assert.equal(err503.status, "error");
});

test("AppError sets isOperational to true", () => {
  const err = new AppError("Something went wrong", 400);
  assert.equal(err.isOperational, true);
});

test("AppError message is set correctly", () => {
  const err = new AppError("Custom error message", 422);
  assert.equal(err.message, "Custom error message");
});

test("AppError captures stack trace", () => {
  const err = new AppError("Error occurred", 500);
  assert.ok(err.stack !== undefined);
  assert.ok(err.stack.length > 0);
});

test("AppError instanceof Error holds true", () => {
  const err = new AppError("Test error", 400);
  assert.ok(err instanceof Error);
  assert.ok(err instanceof AppError);
});
