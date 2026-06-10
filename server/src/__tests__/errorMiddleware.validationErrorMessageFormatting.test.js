import globalErrorHandler from "../middleware/errorMiddleware.js";

import { describe, test } from "node:test";
import assert from "node:assert/strict";

describe("errorMiddleware handleValidationErrorDB message formatting", () => {
  const makeRes = () => {
    const res = {
      statusCode: null,
      payload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      },
    };
    return res;
  };

  const next = () => {};

  test("preserves original punctuation in field messages and joins with '; '", async () => {
    process.env.NODE_ENV = "production";

    // Mock a ValidationError-like shape.
    // Each fieldErr.message contains different sentence-ending punctuation.
    const err = new Error("Validation failed");

    err.isOperational = true;
    err.statusCode = 400;
    err.status = "error";
    err.errors = {
      email: { message: "Email must be valid!" },
      password: { message: "Password must be at least 8 characters." },
      nickname: { message: "Nickname cannot be empty?" },
    };
    err.name = "ValidationError";

    const req = { method: "POST", originalUrl: "/api/test" };
    const res = makeRes();

    globalErrorHandler(err, req, res, next);

    assert.equal(res.statusCode, 400);
    assert.equal(res.payload.statusCode, 400);

    // Ensure punctuation from individual messages is preserved.
    assert.match(res.payload.message, /Email must be valid!/);
    assert.match(res.payload.message, /Password must be at least 8 characters\./);
    assert.match(res.payload.message, /Nickname cannot be empty\?/);

    // Ensure we use the intended delimiter without normalizing punctuation away.
    assert.match(res.payload.message, /Invalid input data: .*; .*; .*/);
    assert.ok(!res.payload.message.endsWith(".."));
    assert.ok(!res.payload.message.endsWith(". ."));
  });
});

