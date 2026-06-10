import globalErrorHandler from "../middleware/errorMiddleware.js";

import { describe, test } from "node:test";
import assert from "node:assert/strict";

describe("errorMiddleware AI misclassification", () => {
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

  test("does not classify Axios errors as AI based on url substring alone", () => {
    process.env.NODE_ENV = "production";

    // Repro: Axios error whose config.url includes google/gemini strings.
    // Use an Error message that should be preserved (non-AI paths should not rewrite it).
    const err = new Error("Request failed with status code 502");

    err.isOperational = true;
    err.statusCode = 502;
    err.status = "error";

    err.isAxiosError = true;
    err.message = "Request failed with status code 502";
    err.config = {
      url: "https://example.com/googleapis.com/v1/models",
      headers: {
        // Intentionally missing x-ai-provider to ensure we don't classify as AI.
        authorization: "Bearer test",
      },
    };

    const req = { method: "GET", originalUrl: "/api/test" };
    const res = makeRes();

    globalErrorHandler(err, req, res, next);

    // If it misclassified as AI, message would contain "AI ..." and statusCode
    // would be mapped to AI-specific codes.
    assert.equal(res.statusCode, 502);
    assert.equal(res.payload.statusCode, 502);
    // globalErrorHandler preserves err.message; ensure it's NOT rewritten as an AI-specific message.
    assert.equal(res.payload.message, "Request failed with status code 502");


    assert.equal(res.payload.message.includes("AI "), false);

  });

  test("classifies Axios errors as AI when explicitly tagged with x-ai-provider", () => {
    process.env.NODE_ENV = "production";

    const err = new Error("Some provider error");
    err.isOperational = true;
    err.statusCode = 400;
    err.status = "error";

    err.isAxiosError = true;
    err.message = "invalid api key";
    err.config = {
      url: "https://generativelanguage.googleapis.com/v1beta/models/foo" ,
      headers: {
        "x-ai-provider": "gemini",
      },
    };

    const req = { method: "GET", originalUrl: "/api/test" };
    const res = makeRes();

    globalErrorHandler(err, req, res, next);

    assert.equal(res.statusCode, 401);
    assert.equal(res.payload.statusCode, 401);
    assert.match(res.payload.message, /AI Authentication failed/i);
  });
});

