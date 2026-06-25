import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getToken, TOKEN_KEY } from "../authToken";

describe("authToken", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("TOKEN_KEY is defined", () => {
    expect(TOKEN_KEY).toBe("skillssphere.auth.token");
  });

  it("getToken returns token from localStorage", () => {
    localStorage.setItem(TOKEN_KEY, "local-storage-token");
    expect(getToken()).toBe("local-storage-token");
  });

  it("getToken prefers localStorage over sessionStorage", () => {
    localStorage.setItem(TOKEN_KEY, "local-token");
    sessionStorage.setItem(TOKEN_KEY, "session-token");
    expect(getToken()).toBe("local-token");
  });

  it("getToken falls back to sessionStorage when localStorage is empty", () => {
    sessionStorage.setItem(TOKEN_KEY, "session-token");
    expect(getToken()).toBe("session-token");
  });

  it("getToken returns null when both storages are empty", () => {
    expect(getToken()).toBeNull();
  });

  it("getToken returns null when storage contains empty string", () => {
    localStorage.setItem(TOKEN_KEY, "");
    sessionStorage.setItem(TOKEN_KEY, "");
    expect(getToken()).toBeNull();
  });
});
