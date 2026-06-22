import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, normalizeApiError } from "../apiClient";

describe("apiClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockFetch = (responseOverrides = {}) => {
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Map([["content-type", "application/json"]]),
      json: vi.fn().mockResolvedValue({}),
      text: vi.fn().mockResolvedValue(""),
      ...responseOverrides,
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);
    return mockResponse;
  };

  describe("apiRequest", () => {
    it("calls fetch with correct method GET by default", async () => {
      mockFetch({ ok: true, status: 200 });
      await apiRequest("/api/users");
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      const [url, init] = globalThis.fetch.mock.calls[0];
      expect(init.method).toBe("GET");
    });

    it("sends Authorization header when token is provided", async () => {
      mockFetch({ ok: true, status: 200 });
      await apiRequest("/api/users", { token: "abc123" });
      const init = globalThis.fetch.mock.calls[0][1];
      expect(init.headers.Authorization).toBe("Bearer abc123");
    });

    it("stringifies body and sets Content-Type for JSON POST", async () => {
      mockFetch({ ok: true, status: 200 });
      await apiRequest("/api/users", {
        method: "POST",
        body: { name: "Alice" },
      });
      const init = globalThis.fetch.mock.calls[0][1];
      expect(init.body).toBe(JSON.stringify({ name: "Alice" }));
      expect(init.headers["Content-Type"]).toBe("application/json");
    });

    it("does not set Content-Type for FormData body", async () => {
      const mockResponse = mockFetch({ ok: true, status: 200 });
      const formData = new FormData();
      formData.append("file", new Blob(["test"]));
      await apiRequest("/api/upload", {
        method: "POST",
        body: formData,
      });
      const init = globalThis.fetch.mock.calls[0][1];
      expect(init.body).toBe(formData);
      // Content-Type should NOT be set for FormData (browser sets it with boundary)
      expect(init.headers["Content-Type"]).toBeUndefined();
    });

    it("returns empty object for 204 No Content", async () => {
      mockFetch({ ok: true, status: 204, headers: new Map() });
      const result = await apiRequest("/api/logout", { method: "POST" });
      expect(result).toEqual({});
    });

    it("parses JSON response body", async () => {
      const mockResponse = mockFetch({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ id: 1, name: "Bob" }),
      });
      const result = await apiRequest("/api/users/1");
      expect(result).toEqual({ id: 1, name: "Bob" });
    });

    it("throws error with status for non-ok responses", async () => {
      const mockResponse = mockFetch({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: vi.fn().mockResolvedValue({ message: "Not found" }),
      });
      await expect(apiRequest("/api/users/999")).rejects.toMatchObject({
        message: "Not found",
        status: 404,
      });
    });

    it("extracts nested errors field from response body", async () => {
      mockFetch({
        ok: false,
        status: 422,
        statusText: "Unprocessable Entity",
        json: vi.fn().mockResolvedValue({
          message: "Validation failed",
          errors: { email: "Invalid email" },
        }),
      });
      try {
        await apiRequest("/api/register", { method: "POST", body: { email: "bad" } });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err.errors).toEqual({ email: "Invalid email" });
        expect(err.status).toBe(422);
      }
    });

    it("throws network error when fetch throws", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
      try {
        await apiRequest("/api/users");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err.message).toBe("Network error");
        expect(err.status).toBe(0);
      }
    });

    it("does not prefix non-absolute paths with base URL when base URL is empty", async () => {
      // When toUrl receives a path that starts with http, it returns as-is
      mockFetch({ ok: true, status: 200 });
      await apiRequest("https://other-site.com/api/data");
      const [url] = globalThis.fetch.mock.calls[0];
      expect(url).toBe("https://other-site.com/api/data");
    });

    it("does not prefix paths that do not start with /", async () => {
      mockFetch({ ok: true, status: 200 });
      // toUrl skips non-absolute paths
      await apiRequest("relative/path");
      const [url] = globalThis.fetch.mock.calls[0];
      expect(url).toBe("relative/path");
    });
  });

  describe("normalizeApiError", () => {
    it("returns default 500 error for null/undefined input", () => {
      const result = normalizeApiError(null);
      expect(result.status).toBe(500);
      expect(result.message).toBe("Something went wrong");
      expect(result.errors).toEqual({});
    });

    it("extracts status from error.status", () => {
      const result = normalizeApiError({ status: 404, message: "Not found" });
      expect(result.status).toBe(404);
      expect(result.message).toBe("Not found");
    });

    it("extracts nested errors from data.errors", () => {
      const result = normalizeApiError({
        status: 422,
        data: { message: "Bad", errors: { field: "required" } },
      });
      expect(result.errors).toEqual({ field: "required" });
    });

    it("extracts errors from data.error (singular)", () => {
      const result = normalizeApiError({
        data: { message: "Error", error: { server: "down" } },
      });
      expect(result.errors).toEqual({ server: "down" });
    });

    it("extracts errors from data.details", () => {
      const result = normalizeApiError({
        data: { message: "Error", details: { name: "too short" } },
      });
      expect(result.errors).toEqual({ name: "too short" });
    });

    it("returns default 500 for plain Error without status", () => {
      const result = normalizeApiError(new Error("Something broke"));
      expect(result.status).toBe(500);
      expect(result.message).toBe("Something broke");
    });

    it("extracts status from error.response.status for axios-style errors", () => {
      const result = normalizeApiError({
        response: { status: 401, data: { message: "Unauthorized" } },
      });
      expect(result.status).toBe(401);
      expect(result.message).toBe("Unauthorized");
    });
  });
});
