import assert from "node:assert/strict";
import test from "node:test";
import AppError from "../AppError.js";

test("AppError - constructor sets correct message and status code", () => {
  const error = new AppError("Something went wrong", 400);

  assert.equal(error.message, "Something went wrong");
  assert.equal(error.statusCode, 400);
});

test("AppError - status is 'fail' for 4xx codes", () => {
  const error400 = new AppError("Bad Request", 400);
  assert.equal(error400.status, "fail");

  const error404 = new AppError("Not Found", 404);
  assert.equal(error404.status, "fail");
});

test("AppError - status is 'error' for 5xx codes", () => {
  const error500 = new AppError("Internal Server Error", 500);
  assert.equal(error500.status, "error");

  const error503 = new AppError("Service Unavailable", 503);
  assert.equal(error503.status, "error");
});

test("AppError - sets isOperational flag to true", () => {
  const error = new AppError("Operational failure", 401);
  assert.equal(error.isOperational, true);
});

test("AppError - captures stack trace", () => {
  const error = new AppError("Stack trace error", 500);
  assert.ok(error.stack);
  assert.ok(typeof error.stack === "string");
});
