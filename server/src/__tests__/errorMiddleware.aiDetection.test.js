import globalErrorHandler from "../middleware/errorMiddleware.js";

// NOTE: these tests validate AI classification gating logic.
// They intentionally pass in a non-AI operational error whose message contains "google"
// to ensure it is NOT re-mapped via handleAIError().

import { describe, test } from "node:test";
import assert from "node:assert/strict";

describe("errorMiddleware AI detection", () => {
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

  test("does not classify non-AI operational errors containing " +
    "\"google\" as AI", async () => {
    process.env.NODE_ENV = "production";

    const err = new Error("Operational failure while calling google service");
    err.isOperational = true;
    err.statusCode = 502;
    err.status = "error";
    err.errors = undefined;
    err.isAxiosError = false;
    err.type = undefined;
    err.name = "OperationalError";
    err.provider = undefined;

    const req = { method: "GET", originalUrl: "/api/test" };
    const res = makeRes();

    globalErrorHandler(err, req, res, next);

    assert.equal(res.statusCode, 502);
    assert.equal(
      res.payload.message,
      "Operational failure while calling google service"
    );

    // If misclassified as AI, payload.message would be rewritten.
    assert.equal(
      String(res.payload.message).includes("AI service is currently unavailable"),
      false
    );
  });

  test("classifies GoogleGenerativeAI errors as AI", async () => {
    process.env.NODE_ENV = "production";

    const err = new Error("Bad request");
    err.isOperational = true;
    err.status = 400;
    err.statusCode = 400;
    err.code = undefined;
    err.isAxiosError = false;
    err.type = undefined;
    err.name = "GoogleGenerativeAI";
    err.provider = "google";

    const req = { method: "GET", originalUrl: "/api/test" };
    const res = makeRes();

    globalErrorHandler(err, req, res, next);

    assert.equal(res.statusCode, 400);
    assert.match(
      res.payload.message,
      /AI request was invalid|AI Authentication failed|AI access forbidden/i
    );

  });
});

