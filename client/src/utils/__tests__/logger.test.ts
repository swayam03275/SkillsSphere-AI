import { describe, expect, it, vi } from "vitest";
import logger, { suppressReactScriptTagWarning } from "../logger";

describe("logger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("exports log, info, warn, debug, and error methods", () => {
    expect(typeof logger.log).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("suppressReactScriptTagWarning is exported and is a function", () => {
    expect(typeof suppressReactScriptTagWarning).toBe("function");
  });

  it("suppressReactScriptTagWarning executes without throwing", () => {
    expect(() => suppressReactScriptTagWarning()).not.toThrow();
  });

  it("log method is callable without throwing", () => {
    expect(() => logger.log("test message")).not.toThrow();
  });

  it("info method is callable without throwing", () => {
    expect(() => logger.info("info message")).not.toThrow();
  });

  it("warn method is callable without throwing", () => {
    expect(() => logger.warn("warn message")).not.toThrow();
  });

  it("debug method is callable without throwing", () => {
    expect(() => logger.debug("debug message")).not.toThrow();
  });

  it("error method is callable without throwing", () => {
    expect(() => logger.error("error message")).not.toThrow();
  });

  it("logger methods accept multiple arguments", () => {
    expect(() => logger.log("arg1", "arg2", { key: "value" })).not.toThrow();
  });
});