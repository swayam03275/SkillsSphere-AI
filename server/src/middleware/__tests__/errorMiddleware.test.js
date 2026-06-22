import test, { mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import AppError from "../../utils/AppError.js";
import globalErrorHandler from "../errorMiddleware.js";

const invokeHandler = (err, env = "development") =>
  new Promise((resolve) => {
    let savedBody = null;
    let savedStatus = null;
    const res = {
      statusCode: 200,
      status(code) {
        savedStatus = code;
        return this;
      },
      json(body) {
        savedBody = body;
        resolve({ status: savedStatus, body: savedBody });
      },
    };
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = env;
    globalErrorHandler(err, {}, res, () => {});
    process.env.NODE_ENV = originalEnv;
  });

afterEach(() => {
  mock.restoreAll();
});

test("globalErrorHandler responds with stack trace in development", async () => {
  const err = new Error("Something broke");
  err.statusCode = 500;

  const result = await invokeHandler(err, "development");

  assert.equal(result.status, 500);
  assert.equal(result.body.success, false);
  assert.equal(result.body.status, "error");
  assert.equal(result.body.message, "Something broke");
  assert.ok(result.body.stack);
});

test("globalErrorHandler responds with clean payload for operational errors in production", async () => {
  const err = new AppError("Not found", 404);
  err.errors = { id: "Record not found" };

  const result = await invokeHandler(err, "production");

  assert.equal(result.status, 404);
  assert.equal(result.body.success, false);
  assert.equal(result.body.message, "Not found");
  assert.equal(result.body.errors.id, "Record not found");
});

test("globalErrorHandler uses default 500 for non-operational errors in production", async () => {
  const err = new Error("Crash");
  err.statusCode = undefined;
  err.isOperational = false;

  const result = await invokeHandler(err, "production");

  assert.equal(result.status, 500);
  assert.equal(result.body.success, false);
  assert.equal(result.body.status, "error");
  assert.equal(result.body.message, "Something went very wrong!");
  assert.deepEqual(result.body.errors, {});
});

test("globalErrorHandler delegates CastError to produce 400", async () => {
  const err = new Error("Cast error");
  err.name = "CastError";
  err.path = "userId";
  err.value = "xyz";
  err.isOperational = true;

  const result = await invokeHandler(err, "production");

  assert.equal(result.status, 400);
  assert.match(result.body.message, /Invalid userId/);
  assert.match(result.body.message, /xyz/);
});

test("globalErrorHandler delegates duplicate key error (code 11000) to produce 400", async () => {
  const err = new Error("dup");
  err.code = 11000;
  err.keyValue = { username: "john" };
  err.isOperational = true;

  const result = await invokeHandler(err, "production");

  assert.equal(result.status, 400);
  assert.match(result.body.message, /Duplicate field value/);
  assert.match(result.body.message, /john/);
});

test("globalErrorHandler falls back to errmsg parsing for duplicate key", async () => {
  const err = new Error('E11000 dup key: { email: "user@test.com" }');
  err.code = 11000;
  err.isOperational = true;

  const result = await invokeHandler(err, "production");

  assert.equal(result.status, 400);
  assert.match(result.body.message, /Duplicate field value/);
});

test("globalErrorHandler delegates ValidationError to produce 400 with field errors", async () => {
  const err = new Error("validation");
  err.name = "ValidationError";
  err.errors = {
    email: { message: "Invalid email" },
    age: { message: "Must be a number" },
  };
  err.isOperational = true;

  const result = await invokeHandler(err, "production");

  assert.equal(result.status, 400);
  assert.equal(result.body.errors.email, "Invalid email");
  assert.equal(result.body.errors.age, "Must be a number");
  assert.match(result.body.message, /Invalid email/);
});

test("globalErrorHandler handles ValidationError with no errors object gracefully", async () => {
  const err = new Error("validation");
  err.name = "ValidationError";
  err.errors = undefined;
  err.isOperational = true;

  const result = await invokeHandler(err, "production");

  assert.equal(result.status, 400);
  assert.equal(result.body.message, "Invalid input data.");
});

test("globalErrorHandler sets fail status for 4xx AppErrors", async () => {
  const err = new AppError("Bad request", 400);

  const result = await invokeHandler(err, "production");

  assert.equal(result.status, 400);
  assert.equal(result.body.status, "fail");
});

test("globalErrorHandler sets error status for 5xx AppErrors", async () => {
  const err = new AppError("Server error", 500);

  const result = await invokeHandler(err, "production");

  assert.equal(result.status, 500);
  assert.equal(result.body.status, "error");
});

test("globalErrorHandler handles AI axios error tagged with x-ai-provider header", async () => {
  const err = new Error("AI unavailable");
  err.isAxiosError = true;
  err.config = { headers: { "x-ai-provider": "gemini" } };
  err.isOperational = true;

  const result = await invokeHandler(err, "production");

  assert.equal(result.status, 503);
  assert.match(result.body.message, /AI service|unavailable/i);
});

test("globalErrorHandler handles typed Gemini SDK error", async () => {
  const err = new Error("Gemini error");
  err.name = "GoogleGenerativeAI";
  err.provider = "gemini";
  err.status = 401;
  err.isOperational = true;

  const result = await invokeHandler(err, "production");

  assert.equal(result.status, 401);
  assert.match(result.body.message, /Authentication|auth/i);
});

test("globalErrorHandler preserves existing field-level errors from Mongoose err.errors", async () => {
  const err = new Error("boom");
  err.name = "CastError";
  err.path = "_id";
  err.value = "abc";
  err.isOperational = true;
  err.errors = {
    fieldA: { message: "Mongoose field error" },
  };

  const result = await invokeHandler(err, "production");

  assert.equal(result.status, 400);
  assert.equal(result.body.errors.fieldA, "Mongoose field error");
});

test("globalErrorHandler defaults to 500 when no statusCode is set", async () => {
  const err = new Error("Unknown error");
  err.statusCode = undefined;
  err.isOperational = false;

  const result = await invokeHandler(err, "production");

  assert.equal(result.status, 500);
  assert.equal(result.body.status, "error");
});
