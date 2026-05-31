import { describe, expect, it } from "vitest";
import { normalizeApiError } from "../apiClient";

describe("normalizeApiError", () => {
  it("keeps plain-text error responses as the message", () => {
    const error = new Error("Request failed");
    error.status = 401;
    error.data = { message: "Unauthorized" };

    expect(normalizeApiError(error)).toMatchObject({
      status: 401,
      message: "Unauthorized",
      errors: {},
    });
  });

  it("prefers FastAPI detail messages over the generic fallback", () => {
    const error = {
      status: 422,
      response: {
        data: {
          detail: "Invalid request payload",
        },
      },
    };

    expect(normalizeApiError(error)).toMatchObject({
      status: 422,
      message: "Invalid request payload",
      errors: {},
    });
  });

  it("extracts field errors from common detail and error schemas", () => {
    const error = {
      status: 400,
      response: {
        data: {
          details: {
            title: "Title is required",
            skills: "At least one skill is required",
          },
          detail: "Validation failed",
        },
      },
    };

    expect(normalizeApiError(error)).toMatchObject({
      status: 400,
      message: "Validation failed",
      errors: {
        title: "Title is required",
        skills: "At least one skill is required",
      },
    });
  });

  it("maps FastAPI validation arrays into field errors", () => {
    const error = {
      status: 422,
      response: {
        data: {
          detail: [
            {
              loc: ["body", "title"],
              msg: "Field required",
            },
            {
              loc: ["body", "skills"],
              msg: "At least one skill is required",
            },
          ],
        },
      },
    };

    expect(normalizeApiError(error)).toMatchObject({
      status: 422,
      message: "Field required",
      errors: {
        title: "Field required",
        skills: "At least one skill is required",
      },
    });
  });

  it("falls back to nested error objects when the top-level payload uses error", () => {
    const error = {
      status: 400,
      response: {
        data: {
          error: {
            email: "Email is already in use",
          },
        },
      },
    };

    expect(normalizeApiError(error)).toMatchObject({
      status: 400,
      message: "Something went wrong",
      errors: {
        email: "Email is already in use",
      },
    });
  });
});