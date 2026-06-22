import { describe, test, expect, vi, beforeEach } from "vitest";
import {
  getAuthToken,
  resolveProtectedFilePath,
  getProtectedAssetUrl,
} from "../protectedAssetUrl";

describe("getAuthToken", () => {
  test("returns empty string when no token is set", () => {
    localStorage.clear();
    sessionStorage.clear();
    expect(getAuthToken()).toBe("");
  });

  test("returns token from localStorage when available", () => {
    localStorage.clear();
    localStorage.setItem("skillssphere.auth.token", "local-token-123");
    expect(getAuthToken()).toBe("local-token-123");
  });

  test("returns token from sessionStorage when localStorage is empty", () => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem("skillssphere.auth.token", "session-token-456");
    expect(getAuthToken()).toBe("session-token-456");
  });

  test("prefers localStorage over sessionStorage", () => {
    localStorage.setItem("skillssphere.auth.token", "local-token");
    sessionStorage.setItem("skillssphere.auth.token", "session-token");
    expect(getAuthToken()).toBe("local-token");
  });
});

describe("resolveProtectedFilePath", () => {
  test("returns null for empty string", () => {
    expect(resolveProtectedFilePath("")).toBeNull();
  });

  // @ts-expect-error testing null input
  test("returns null for null input", () => {
    expect(resolveProtectedFilePath(null)).toBeNull();
  });

  // @ts-expect-error testing number input
  test("returns null for non-string input (number)", () => {
    expect(resolveProtectedFilePath(123)).toBeNull();
  });

  test("returns null for third-party https URL", () => {
    expect(resolveProtectedFilePath("https://google.com/image.png")).toBeNull();
    expect(resolveProtectedFilePath("https://example.com/assets/photo.jpg")).toBeNull();
  });

  test("rewrites /uploads/avatars/ path to /api/files/avatars/", () => {
    expect(resolveProtectedFilePath("/uploads/avatars/photo.png")).toBe(
      "/api/files/avatars/photo.png"
    );
    expect(resolveProtectedFilePath("/uploads/avatars/user_123.jpg")).toBe(
      "/api/files/avatars/user_123.jpg"
    );
  });

  test("rewrites /uploads/ path to /api/files/resumes/", () => {
    expect(resolveProtectedFilePath("/uploads/resume.pdf")).toBe(
      "/api/files/resumes/resume.pdf"
    );
  });

  test("passes through /api/files/ paths unchanged", () => {
    expect(resolveProtectedFilePath("/api/files/avatars/avatar.png")).toBe(
      "/api/files/avatars/avatar.png"
    );
    expect(resolveProtectedFilePath("/api/files/resumes/cv.pdf")).toBe(
      "/api/files/resumes/cv.pdf"
    );
  });

  test("strips query parameters from URLs", () => {
    expect(
      resolveProtectedFilePath("/api/files/avatars/photo.png?exp=9999999999&sig=abc")
    ).toBe("/api/files/avatars/photo.png");
    expect(
      resolveProtectedFilePath("/uploads/avatars/avatar.jpg?v=123")
    ).toBe("/api/files/avatars/avatar.jpg");
  });

  test("returns null for URL starting with http but not uploads or api/files", () => {
    expect(resolveProtectedFilePath("https://cdn.example.com/photo.png")).toBeNull();
  });
});

describe("getProtectedAssetUrl", () => {
  test("returns null for empty string", () => {
    expect(getProtectedAssetUrl("")).toBeNull();
  });

  // @ts-expect-error testing null input
  test("returns null for null input", () => {
    expect(getProtectedAssetUrl(null)).toBeNull();
  });

  test("returns rewritten API path for avatar URL", () => {
    expect(getProtectedAssetUrl("/uploads/avatars/photo.png")).toBe(
      "/api/files/avatars/photo.png"
    );
  });

  test("returns rewritten API path for resume URL", () => {
    expect(getProtectedAssetUrl("/uploads/resume.pdf")).toBe(
      "/api/files/resumes/resume.pdf"
    );
  });

  test("returns unchanged URL for third-party https URL", () => {
    const url = "https://example.com/image.png";
    expect(getProtectedAssetUrl(url)).toBe(url);
  });

  test("passes through /api/files/ paths unchanged", () => {
    expect(getProtectedAssetUrl("/api/files/avatars/photo.png")).toBe(
      "/api/files/avatars/photo.png"
    );
  });
});
