import { describe, expect, it } from "vitest";

import {
  isTrustedProtectedAssetOrigin,
  resolveProtectedFilePath,
} from "./protectedAssetUrl";

describe("resolveProtectedFilePath", () => {
  it("keeps relative protected API paths", () => {
    expect(resolveProtectedFilePath("/api/files/resumes/resume.pdf?download=1")).toBe(
      "/api/files/resumes/resume.pdf"
    );
  });

  it("maps relative legacy upload paths to protected API routes", () => {
    expect(resolveProtectedFilePath("/uploads/avatars/avatar-user.png")).toBe(
      "/api/files/avatars/avatar-user.png"
    );
    expect(resolveProtectedFilePath("/uploads/resume.pdf")).toBe(
      "/api/files/resumes/resume.pdf"
    );
  });

  it("rejects third-party URLs that contain protected file path segments", () => {
    expect(resolveProtectedFilePath("https://evil.example/uploads/resume.pdf")).toBeNull();
    expect(resolveProtectedFilePath("https://evil.example/api/files/resumes/resume.pdf")).toBeNull();
  });

  it("accepts same-origin absolute protected file URLs", () => {
    expect(
      resolveProtectedFilePath(`${window.location.origin}/api/files/avatars/avatar.png`)
    ).toBe("/api/files/avatars/avatar.png");
  });
});

describe("isTrustedProtectedAssetOrigin", () => {
  it("trusts the browser origin", () => {
    expect(isTrustedProtectedAssetOrigin(`${window.location.origin}/api/files/resumes/a.pdf`)).toBe(
      true
    );
  });

  it("does not trust unrelated origins", () => {
    expect(isTrustedProtectedAssetOrigin("https://cdn.example/api/files/resumes/a.pdf")).toBe(
      false
    );
  });
});
