import assert from "node:assert/strict";
import test from "node:test";
import { resolveUploadPath, buildAvatarFileUrl, buildResumeFileUrl } from "../uploadPaths.js";

test("resolveUploadPath rejects null and empty filenames", () => {
  assert.equal(resolveUploadPath("resumes", null), null);
  assert.equal(resolveUploadPath("avatars", null), null);
  assert.equal(resolveUploadPath("resumes", ""), null);
  assert.equal(resolveUploadPath("avatars", ""), null);
});

test("resolveUploadPath rejects non-string filenames", () => {
  assert.equal(resolveUploadPath("resumes", 123), null);
  assert.equal(resolveUploadPath("avatars", undefined), null);
  assert.equal(resolveUploadPath("resumes", {}), null);
});

test("resolveUploadPath blocks path traversal with ..", () => {
  assert.equal(resolveUploadPath("resumes", "../etc/passwd"), null);
  assert.equal(resolveUploadPath("avatars", "avatars/../../secret.png"), null);
  assert.equal(resolveUploadPath("resumes", "..\\windows\\system32\\config"), null);
});

test("resolveUploadPath blocks filenames with path separators", () => {
  assert.equal(resolveUploadPath("resumes", "myfile/../../../etc/passwd"), null);
  assert.equal(resolveUploadPath("avatars", "path\\to\\file.png"), null);
});

test("resolveUploadPath accepts valid filenames", () => {
  const result = resolveUploadPath("resumes", "resume.pdf");
  assert.notEqual(result, null);
  assert.equal(typeof result, "object");
  assert.equal(result.safeName, "resume.pdf");
  assert.ok(result.absolutePath.endsWith("resume.pdf"));
});

test("resolveUploadPath uses avatars directory for avatars subdir", () => {
  const result = resolveUploadPath("avatars", "avatar.png");
  assert.notEqual(result, null);
  assert.ok(result.absolutePath.includes("avatars"));
});

test("resolveUploadPath uses resumes directory for non-avatars subdir", () => {
  const result = resolveUploadPath("resumes", "cv.pdf");
  assert.notEqual(result, null);
  assert.ok(result.absolutePath.includes("uploads"));
});

test("resolveUploadPath resolves parent-path traversal attempt to null", () => {
  // Even though safeName would be '..', the full resolved path escapes uploads dir
  const result = resolveUploadPath("resumes", "..");
  assert.equal(result, null);
});

test("buildAvatarFileUrl returns correct avatar URL", () => {
  const url = buildAvatarFileUrl("avatar.png");
  assert.equal(url, "/api/files/avatars/avatar.png");
});

test("buildResumeFileUrl returns correct resume URL", () => {
  const url = buildResumeFileUrl("resume.pdf");
  assert.equal(url, "/api/files/resumes/resume.pdf");
});
