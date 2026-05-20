import assert from "node:assert/strict";
import test from "node:test";
import path from "path";
import {
  resolveUploadPath,
  buildAvatarFileUrl,
  buildResumeFileUrl
} from "../uploadPaths.js";

test("resolveUploadPath - returns null for invalid input, traversal attempts, or directory symbols", () => {
  // Invalid input types
  assert.equal(resolveUploadPath("avatars", null), null);
  assert.equal(resolveUploadPath("avatars", undefined), null);
  assert.equal(resolveUploadPath("avatars", 123), null);

  // Path traversal attacks (..)
  assert.equal(resolveUploadPath("avatars", "somefile/../../other"), null);
  assert.equal(resolveUploadPath("avatars", "../avatar.png"), null);
  assert.equal(resolveUploadPath("avatars", "avatar..png"), null); // contains ".."

  // Slash or backslash characters
  assert.equal(resolveUploadPath("avatars", "sub/avatar.png"), null);
  assert.equal(resolveUploadPath("avatars", "sub\\avatar.png"), null);
});

test("resolveUploadPath - resolves valid avatars subdirectories correctly", () => {
  const result = resolveUploadPath("avatars", "my-avatar.png");
  assert.ok(result);
  assert.equal(result.safeName, "my-avatar.png");
  assert.ok(result.absolutePath.endsWith(path.join("src", "uploads", "avatars", "my-avatar.png")));
});

test("resolveUploadPath - resolves valid resume/default subdirectories correctly", () => {
  const result = resolveUploadPath("resumes", "my-resume.pdf");
  assert.ok(result);
  assert.equal(result.safeName, "my-resume.pdf");
  assert.ok(result.absolutePath.endsWith(path.join("src", "uploads", "my-resume.pdf")));
});

test("buildAvatarFileUrl and buildResumeFileUrl build correct URLs", () => {
  assert.equal(buildAvatarFileUrl("test.png"), "/api/files/avatars/test.png");
  assert.equal(buildResumeFileUrl("test.pdf"), "/api/files/resumes/test.pdf");
});
