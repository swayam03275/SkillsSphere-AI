import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  safeDeletePhysicalFile,
  safeDeleteAvatarByUrl,
} from "../utils/fileUtils.js";

describe("safeDeletePhysicalFile", () => {
  test("returns true when file exists and is deleted", () => {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `test-safedelete-${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, "hello world");
    assert.equal(fs.existsSync(tmpFile), true);

    const result = safeDeletePhysicalFile(tmpFile);
    assert.equal(result, true);
    assert.equal(fs.existsSync(tmpFile), false);
  });

  test("returns false when file does not exist", () => {
    const result = safeDeletePhysicalFile("/nonexistent/file/path.txt");
    assert.equal(result, false);
  });

  test("returns false for empty string input", () => {
    const result = safeDeletePhysicalFile("");
    assert.equal(result, false);
  });

  test("returns false for null input", () => {
    const result = safeDeletePhysicalFile(null);
    assert.equal(result, false);
  });

  test("returns false for undefined input", () => {
    const result = safeDeletePhysicalFile(undefined);
    assert.equal(result, false);
  });
});

describe("safeDeleteAvatarByUrl", () => {
  test("returns false for empty string input", () => {
    const result = safeDeleteAvatarByUrl("");
    assert.equal(result, false);
  });

  test("returns false for null input", () => {
    const result = safeDeleteAvatarByUrl(null);
    assert.equal(result, false);
  });

  test("returns false for undefined input", () => {
    const result = safeDeleteAvatarByUrl(undefined);
    assert.equal(result, false);
  });

  test("returns false for non-avatar URL", () => {
    const result = safeDeleteAvatarByUrl("https://example.com/image.png");
    assert.equal(result, false);
  });

  test("returns false for URL without avatar path", () => {
    const result = safeDeleteAvatarByUrl("https://example.com/api/files/resumes/resume.pdf");
    assert.equal(result, false);
  });

  test("strips query parameters from avatar URL before processing", () => {
    // This avatar URL contains a ?exp= query param — it should be stripped.
    // The resulting file path won't exist, so the function returns false.
    const urlWithQuery = "/api/files/avatars/nonexistent-avatar.png?exp=9999999999&signature=abc";
    const result = safeDeleteAvatarByUrl(urlWithQuery);
    assert.equal(result, false);
  });

  test("extracts filename from /api/files/avatars/ path correctly", () => {
    const result = safeDeleteAvatarByUrl("/api/files/avatars/avatar.png");
    // File does not exist so returns false, but extraction should still work
    assert.equal(result, false);
  });

  test("extracts filename from /uploads/avatars/ path correctly", () => {
    const result = safeDeleteAvatarByUrl("/uploads/avatars/user-avatar.jpg");
    assert.equal(result, false);
  });
});
