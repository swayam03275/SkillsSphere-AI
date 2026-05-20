import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { resolveUploadPath, buildAvatarFileUrl, buildResumeFileUrl } from "../uploadPaths.js";

test("resolveUploadPath - returns null for empty or invalid filename inputs", () => {
  assert.equal(resolveUploadPath("avatars", null), null);
  assert.equal(resolveUploadPath("avatars", ""), null);
  assert.equal(resolveUploadPath("avatars", 123), null);
  assert.equal(resolveUploadPath("avatars", {}), null);
});

test("resolveUploadPath - blocks path traversal attempts", () => {
  assert.equal(resolveUploadPath("avatars", "../traversal.png"), null);
  assert.equal(resolveUploadPath("avatars", "sub/folder/file.png"), null);
  assert.equal(resolveUploadPath("avatars", "sub\\folder\\file.png"), null);
});

test("resolveUploadPath - returns safeName and absolutePath for valid avatar filename", () => {
  const result = resolveUploadPath("avatars", "profile.jpg");
  assert.ok(result);
  assert.equal(result.safeName, "profile.jpg");
  assert.ok(result.absolutePath.endsWith(path.join("src", "uploads", "avatars", "profile.jpg")));
});

test("resolveUploadPath - returns safeName and absolutePath for valid resume filename", () => {
  const result = resolveUploadPath("resumes", "cv.pdf");
  assert.ok(result);
  assert.equal(result.safeName, "cv.pdf");
  assert.ok(result.absolutePath.endsWith(path.join("src", "uploads", "cv.pdf")));
});

test("buildAvatarFileUrl - returns the correct absolute URL segment path", () => {
  assert.equal(buildAvatarFileUrl("avatar.png"), "/api/files/avatars/avatar.png");
});

test("buildResumeFileUrl - returns the correct absolute URL segment path", () => {
  assert.equal(buildResumeFileUrl("resume.pdf"), "/api/files/resumes/resume.pdf");
});
