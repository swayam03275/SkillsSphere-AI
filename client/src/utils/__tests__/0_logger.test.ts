import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Top-level vi.mock: DEV = true, applied before any imports
vi.mock("import.meta.env", () => ({ DEV: true, VITE_API_URL: "http://localhost:5000" }));

// Set window for jsdom
beforeEach(() => {
  Object.defineProperty(globalThis, "window", { value: { document: {} }, writable: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("client logger - log levels (DEV mode)", () => {
  let consoleLog: ReturnType<typeof vi.spyOn>;
  let consoleInfo: ReturnType<typeof vi.spyOn>;
  let consoleWarn: ReturnType<typeof vi.spyOn>;
  let consoleError: ReturnType<typeof vi.spyOn>;
  let consoleDebug: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLog = vi.spyOn(console, "log");
    consoleInfo = vi.spyOn(console, "info");
    consoleWarn = vi.spyOn(console, "warn");
    consoleError = vi.spyOn(console, "error");
    consoleDebug = vi.spyOn(console, "debug");
  });

  it("log() calls console.log in dev mode", async () => {
    const { default: logger } = await import("../logger");
    logger.log("hello", { key: "value" });
    expect(consoleLog).toHaveBeenCalledWith("hello", { key: "value" });
  });

  it("info() calls console.info in dev mode", async () => {
    const { default: logger } = await import("../logger");
    logger.info("info message");
    expect(consoleInfo).toHaveBeenCalledWith("info message");
  });

  it("warn() calls console.warn in dev mode", async () => {
    const { default: logger } = await import("../logger");
    logger.warn("warn message");
    expect(consoleWarn).toHaveBeenCalledWith("warn message");
  });

  it("debug() calls console.debug in dev mode", async () => {
    const { default: logger } = await import("../logger");
    logger.debug("debug message");
    expect(consoleDebug).toHaveBeenCalledWith("debug message");
  });

  it("error() calls console.error in dev mode", async () => {
    const { default: logger } = await import("../logger");
    logger.error("error message");
    expect(consoleError).toHaveBeenCalledWith("error message");
  });
});

describe("suppressReactScriptTagWarning", () => {
  it("patches console.error and filters React script-tag warnings in dev mode", async () => {
    // Capture what console.error is called with
    const calls = [];
    const originalError = console.error.bind(console);
    const patchedError = (...args: unknown[]) => {
      calls.push(args);
      const firstArg = args[0];
      if (typeof firstArg === "string" && firstArg.includes("Encountered a script tag while rendering React component")) {
        return; // suppressed
      }
      originalError(...args);
    };
    console.error = patchedError;

    const { suppressReactScriptTagWarning } = await import("../logger");
    suppressReactScriptTagWarning();

    // Trigger the warning - should be filtered by the suppressor's patch
    console.error("Encountered a script tag while rendering React component in Suspense");
    console.error("normal error message");

    // The React warning should NOT have called the original error
    const reactCall = calls.find(c => c[0] === "Encountered a script tag while rendering React component in Suspense");
    expect(reactCall).toBeUndefined();
    // Normal error should have been called
    const normalCall = calls.find(c => c[0] === "normal error message");
    expect(normalCall).toBeDefined();
  });
});
