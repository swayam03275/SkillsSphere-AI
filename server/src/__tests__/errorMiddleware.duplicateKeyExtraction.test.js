import globalErrorHandler from "../middleware/errorMiddleware.js";

import { describe, test } from "node:test";
import assert from "node:assert/strict";

describe("errorMiddleware duplicate key value extraction", () => {
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

  test("uses err.keyValue as source of truth (prefers correct duplicate value)", async () => {
    process.env.NODE_ENV = "production";

    // Mocked MongoDB duplicate key error shape
    const err = new Error(
      "E11000 duplicate key error collection: users index: email_1 dup key: { email: \"RIGHT_VALUE\" }"
    );

    err.isOperational = true;
    err.statusCode = 400;
    err.status = "error";
    err.errors = undefined;
    err.code = 11000;
    err.keyValue = { email: "RIGHT_VALUE" };

    const req = { method: "POST", originalUrl: "/api/test" };
    const res = makeRes();

    globalErrorHandler(err, req, res, next);

    assert.equal(res.statusCode, 400);
    assert.match(
      res.payload.message,
      /Duplicate field value: RIGHT_VALUE\. Please use another value!/,
    );
  });

  test("falls back to parsing dup key section from message when keyValue is missing", async () => {
    process.env.NODE_ENV = "production";

    const err = new Error(
      "E11000 duplicate key error collection: users index: email_1 dup key: { email: \"FALLBACK_VALUE\" }"
    );

    err.isOperational = true;
    err.statusCode = 400;
    err.status = "error";
    err.errors = undefined;
    err.code = 11000;
    err.keyValue = undefined;

    const req = { method: "POST", originalUrl: "/api/test" };
    const res = makeRes();

    globalErrorHandler(err, req, res, next);

    assert.equal(res.statusCode, 400);
    assert.match(
      res.payload.message,
      /Duplicate field value: FALLBACK_VALUE\. Please use another value!/,
    );
  });
});

