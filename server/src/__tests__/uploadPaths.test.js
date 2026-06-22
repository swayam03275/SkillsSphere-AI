import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  resolveUploadPath,
  buildAvatarFileUrl,
  buildResumeFileUrl,
} from "../utils/uploadPaths.js";

describe("resolveUploadPath", () => {
  test("returns null for empty filename", () => {
    assert.equal(resolveUploadPath("avatars", ""), null);
  });

  test("returns null for null filename", () => {
    assert.equal(resolveUploadPath("avatars", null), null);
  });

  test("returns null for undefined filename", () => {
    assert.equal(resolveUploadPath("avatars", undefined), null);
  });

  test("returns null for non-string filename", () => {
    assert.equal(resolveUploadPath("avatars", 12345), null);
  });

  test("returns null for filename containing path traversal ..", () => {
    assert.equal(resolveUploadPath("avatars", "../etc/passwd"), null);
    assert.equal(resolveUploadPath("avatars", ".."), null);
    assert.equal(resolveUploadPath("resumes", "../../../.env"), null);
  });

  test("returns null for filename containing forward slash", () => {
    assert.equal(resolveUploadPath("avatars", "subdir/file.png"), null);
  });

  test("returns null for filename containing backslash", () => {
    assert.equal(resolveUploadPath("avatars", "subdir\\file.png"), null);
  });

  test("returns object with safeName and absolutePath for valid filename", () => {
    const result = resolveUploadPath("avatars", "profile.png");
    assert.notEqual(result, null);
    assert.equal(result.safeName, "profile.png");
    assert.equal(typeof result.absolutePath, "string");
    assert.ok(result.absolutePath.endsWith("profile.png"));
  });

  test("uses avatars directory when subdir is avatars", () => {
    const result = resolveUploadPath("avatars", "avatar.png");
    assert.notEqual(result, null);
    assert.ok(result.absolutePath.includes("avatars"));
  });

  test("uses resumes directory when subdir is not avatars", () => {
    const result = resolveUploadPath("resumes", "resume.pdf");
    assert.notEqual(result, null);
    assert.ok(result.absolutePath.includes("uploads"));
  });

  test("uses resumes directory for empty subdir", () => {
    const result = resolveUploadPath("", "file.txt");
    assert.notEqual(result, null);
    assert.ok(result.absolutePath.includes("uploads"));
  });

  test("strips directory components from filename (path.basename)", () => {
    // Even though a slash gets rejected above, testing path.basename behavior
    // with a benign-looking filename
    const result = resolveUploadPath("avatars", "legitimate.png");
    assert.equal(result.safeName, "legitimate.png");
  });
});

describe("buildAvatarFileUrl", () => {
  test("returns correct URL for avatar filename", () => {
    assert.equal(buildAvatarFileUrl("avatar.png"), "/api/files/avatars/avatar.png");
  });

  test("handles filenames with special characters", () => {
    assert.equal(
      buildAvatarFileUrl("user_123_avatar.png"),
      "/api/files/avatars/user_123_avatar.png"
    );
  });

  test("handles filenames with timestamps", () => {
    assert.equal(
      buildAvatarFileUrl("1699999999_avatar.jpg"),
      "/api/files/avatars/1699999999_avatar.jpg"
    );
  });
});

describe("buildResumeFileUrl", () => {
  test("returns correct URL for resume filename", () => {
    assert.equal(buildResumeFileUrl("resume.pdf"), "/api/files/resumes/resume.pdf");
  });

  test("handles filenames with timestamps", () => {
    assert.equal(
      buildResumeFileUrl("resume_2024.pdf"),
      "/api/files/resumes/resume_2024.pdf"
    );
  });
});
