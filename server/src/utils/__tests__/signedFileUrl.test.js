import assert from "node:assert/strict";
import test from "node:test";
import { normalizeProtectedFilePath, buildSignedFileUrl, verifySignedFileUrl } from "../signedFileUrl.js";

// Setup environment secret for signing tests
process.env.FILE_URL_SIGNING_SECRET = "super-secret-key-for-testing";

test("normalizeProtectedFilePath - normalizes and filters paths correctly", () => {
  // Empty & invalid inputs
  assert.equal(normalizeProtectedFilePath(null), null);
  assert.equal(normalizeProtectedFilePath(123), null);
  assert.equal(normalizeProtectedFilePath("/api/files/other/profile.png"), null);

  // Full URLs
  assert.equal(
    normalizeProtectedFilePath("https://example.com/api/files/avatars/john.jpg?query=1"),
    "/api/files/avatars/john.jpg"
  );
  assert.equal(
    normalizeProtectedFilePath("http://localhost:5000/api/files/resumes/cv.pdf"),
    "/api/files/resumes/cv.pdf"
  );

  // Upload relative paths
  assert.equal(
    normalizeProtectedFilePath("/uploads/avatars/avatar.png"),
    "/api/files/avatars/avatar.png"
  );
  assert.equal(
    normalizeProtectedFilePath("/uploads/my-resume.pdf"),
    "/api/files/resumes/my-resume.pdf"
  );
});

test("buildSignedFileUrl & verifySignedFileUrl - creates and validates correct HMAC signature link", () => {
  const filePath = "/api/files/resumes/cv.pdf";
  const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

  const signedUrl = buildSignedFileUrl({ path: filePath, expiresAt });
  assert.ok(signedUrl.startsWith(filePath));
  assert.ok(signedUrl.includes(`exp=${expiresAt}`));
  assert.ok(signedUrl.includes("sig="));

  // Extract signature from URL
  const parsedUrl = new URL(`http://localhost${signedUrl}`);
  const sig = parsedUrl.searchParams.get("sig");
  assert.ok(sig);

  // Verification checks
  assert.equal(verifySignedFileUrl(filePath, expiresAt, sig), true);
  assert.equal(verifySignedFileUrl(filePath, expiresAt, "invalid-sig"), false);
  assert.equal(verifySignedFileUrl("/different/path", expiresAt, sig), false);
  assert.equal(verifySignedFileUrl(filePath, expiresAt - 7200, sig), false); // expired
});

test("verifySignedFileUrl - returns false if secret or parameters are missing", () => {
  const oldSecret = process.env.FILE_URL_SIGNING_SECRET;
  const oldJwt = process.env.JWT_SECRET;
  
  delete process.env.FILE_URL_SIGNING_SECRET;
  delete process.env.JWT_SECRET;

  assert.equal(verifySignedFileUrl("/path", 1234567890, "sig"), false);

  // Restore env variables
  process.env.FILE_URL_SIGNING_SECRET = oldSecret;
  process.env.JWT_SECRET = oldJwt;
});
