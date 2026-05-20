import assert from "node:assert/strict";
import test from "node:test";
import globalErrorHandler from "../errorMiddleware.js";

const createMockResponse = () => {
  return {
    statusCode: null,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    }
  };
};

test("errorMiddleware - handles CastError database error correctly in production", () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  try {
    const error = {
      name: "CastError",
      path: "id",
      value: "invalid-id-value",
      message: "Cast to ObjectId failed"
    };

    const res = createMockResponse();
    globalErrorHandler(error, {}, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.success, false);
    assert.equal(res.jsonData.status, "fail");
    assert.equal(res.jsonData.message, "Invalid id: invalid-id-value.");
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});

test("errorMiddleware - handles duplicate fields database error correctly in production", () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  try {
    const error = {
      code: 11000,
      errmsg: 'E11000 duplicate key error collection: test.users index: email_1 dup key: { email: "dup@example.com" }'
    };

    const res = createMockResponse();
    globalErrorHandler(error, {}, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.success, false);
    assert.equal(res.jsonData.message, 'Duplicate field value: "dup@example.com". Please use another value!');
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});

test("errorMiddleware - handles Mongoose ValidationError correctly in production", () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  try {
    const error = {
      name: "ValidationError",
      errors: {
        email: { message: "Email is required." },
        password: { message: "Password is too short." }
      }
    };

    const res = createMockResponse();
    globalErrorHandler(error, {}, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.success, false);
    assert.equal(res.jsonData.errors.email, "Email is required.");
    assert.equal(res.jsonData.errors.password, "Password is too short.");
    assert.ok(res.jsonData.message.includes("Invalid input data. Email is required.. Password is too short."));
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});

test("errorMiddleware - handles AI/Axios Service Errors correctly", () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  try {
    // Test Rate Limit (429) AI Error
    const rateLimitError = {
      isAxiosError: true,
      status: 429
    };
    let res = createMockResponse();
    globalErrorHandler(rateLimitError, {}, res, () => {});
    assert.equal(res.statusCode, 429);
    assert.equal(res.jsonData.message, "AI Rate limit exceeded. Please wait a moment.");

    // Test Auth Fail (401) AI Error
    const authError = {
      isAxiosError: true,
      status: 401
    };
    res = createMockResponse();
    globalErrorHandler(authError, {}, res, () => {});
    assert.equal(res.statusCode, 500);
    assert.equal(res.jsonData.message, "AI Authentication failed. Please check system configuration.");
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});

test("errorMiddleware - development mode contains full stack and error objects", () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";

  try {
    const error = new Error("Operational Failure Message");
    error.statusCode = 403;
    error.status = "fail";

    const res = createMockResponse();
    globalErrorHandler(error, {}, res, () => {});

    assert.equal(res.statusCode, 403);
    assert.equal(res.jsonData.success, false);
    assert.equal(res.jsonData.status, "fail");
    assert.equal(res.jsonData.message, "Operational Failure Message");
    assert.ok(res.jsonData.stack);
    assert.ok(res.jsonData.error);
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});
