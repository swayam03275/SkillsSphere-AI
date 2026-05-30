import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reportError, __testing } from "../errorReporter";

describe("errorReporter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sanitizes sensitive values before building payloads", () => {
    const payload = __testing.buildErrorPayload(
      new Error("Request failed with token=super-secret"),
      {
        componentStack: "Component password: hunter2",
        source: "auth",
        token: "raw-token",
        nested: {
          accessToken: "raw-access-token",
          authorization: "Bearer abc123",
        },
      },
    );

    expect(payload.message).toContain("[redacted]");
    expect(payload.message).not.toContain("super-secret");
    expect(payload.componentStack).toContain("[redacted]");
    expect(payload.componentStack).not.toContain("hunter2");
    expect(payload.context.token).toBe("[redacted]");
    expect(payload.context.nested.accessToken).toBe("[redacted]");
    expect(payload.context.nested.authorization).toBe("[redacted]");
    expect(payload.timestamp).toBeTruthy();
  });

  it("reports errors to the backend without throwing", async () => {
    global.fetch.mockResolvedValue({ ok: true });

    const result = await reportError(
      new Error("Render failed"),
      { componentStack: "Component stack" },
    );

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/errors"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Render failed"),
      }),
    );
  });

  it("fails safely when the reporting service is unavailable", async () => {
    global.fetch.mockRejectedValue(new Error("Network down"));

    const result = await reportError(
      new Error("Render failed"),
      { componentStack: "Component stack" },
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });
});
