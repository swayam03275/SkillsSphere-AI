import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import {
  buildSignedFileUrl,
  normalizeProtectedFilePath,
  verifySignedFileUrl,
  parseSignedUrlExpiry,
} from "../signedFileUrl.js";

process.env.FILE_URL_SIGNING_SECRET = "test-signing-secret-that-is-long-enough-for-hmac";

test("normalizeProtectedFilePath handles legacy uploads", () => {
  assert.equal(
    normalizeProtectedFilePath("/uploads/avatars/avatar.png"),
    "/api/files/avatars/avatar.png",
  );
  assert.equal(
    normalizeProtectedFilePath("/uploads/resume.pdf"),
    "/api/files/resumes/resume.pdf",
  );
});

test("normalizeProtectedFilePath rejects non-allowed paths", () => {
  assert.equal(normalizeProtectedFilePath("/api/files/admin/secret"), null);
  assert.equal(normalizeProtectedFilePath("/etc/passwd"), null);
  assert.equal(normalizeProtectedFilePath(null), null);
  assert.equal(normalizeProtectedFilePath(""), null);
});

test("buildSignedFileUrl and verifySignedFileUrl accept valid signatures", () => {
  const path = "/api/files/avatars/avatar.png";
  const expiresAt = Math.floor(Date.now() / 1000) + 60;
  const signed = buildSignedFileUrl({ path, expiresAt, extra: "user123" });
  const params = new URL(`http://localhost${signed}`).searchParams;

  assert.equal(
    verifySignedFileUrl(path, params.get("exp"), params.get("sig"), params.get("uid")),
    true,
  );
});

test("verifySignedFileUrl rejects expired signatures", () => {
  const path = "/api/files/avatars/avatar.png";
  const expiresAt = Math.floor(Date.now() / 1000) - 10;
  const signed = buildSignedFileUrl({ path, expiresAt, extra: "user123" });
  const params = new URL(`http://localhost${signed}`).searchParams;

  assert.equal(
    verifySignedFileUrl(path, params.get("exp"), params.get("sig"), params.get("uid")),
    false,
  );
});

test("verifySignedFileUrl rejects paths outside allowed patterns", () => {
  const expiresAt = Math.floor(Date.now() / 1000) + 60;
  const secret = process.env.FILE_URL_SIGNING_SECRET;
  const payload = `/api/files/admin/secret.${expiresAt}.user123`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  assert.equal(
    verifySignedFileUrl("/api/files/admin/secret", expiresAt.toString(), sig, "user123"),
    false,
  );
});

test("verifySignedFileUrl rejects tampered signatures", () => {
  const path = "/api/files/avatars/avatar.png";
  const expiresAt = Math.floor(Date.now() / 1000) + 60;
  const signed = buildSignedFileUrl({ path, expiresAt, extra: "user123" });
  const params = new URL(`http://localhost${signed}`).searchParams;

  assert.equal(
    verifySignedFileUrl(path, params.get("exp"), "deadbeef".repeat(8), params.get("uid")),
    false,
  );
});

test("buildSignedFileUrl throws when FILE_URL_SIGNING_SECRET is missing", () => {
  const original = process.env.FILE_URL_SIGNING_SECRET;
  delete process.env.FILE_URL_SIGNING_SECRET;

  assert.throws(
    () => buildSignedFileUrl({ path: "/api/files/avatars/a.png", expiresAt: 999 }),
    /FILE_URL_SIGNING_SECRET/,
  );

  process.env.FILE_URL_SIGNING_SECRET = original;
});

test("buildSignedFileUrl throws when FILE_URL_SIGNING_SECRET is too short", () => {
  const original = process.env.FILE_URL_SIGNING_SECRET;
  process.env.FILE_URL_SIGNING_SECRET = "short";

  assert.throws(
    () => buildSignedFileUrl({ path: "/api/files/avatars/a.png", expiresAt: 999 }),
    /FILE_URL_SIGNING_SECRET/,
  );

  process.env.FILE_URL_SIGNING_SECRET = original;
});

test("parseSignedUrlExpiry returns expiry for valid future timestamp", () => {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  const result = parseSignedUrlExpiry(`/api/files/avatars/x.png?exp=${futureExp}&sig=abc`);
  assert.equal(result, futureExp);
});

test("parseSignedUrlExpiry returns null for expired timestamp", () => {
  const pastExp = Math.floor(Date.now() / 1000) - 10;
  const result = parseSignedUrlExpiry(`/api/files/avatars/x.png?exp=${pastExp}&sig=abc`);
  assert.equal(result, null);
});

test("parseSignedUrlExpiry returns null when exp parameter is missing", () => {
  assert.equal(parseSignedUrlExpiry("/api/files/avatars/x.png?sig=abc"), null);
  assert.equal(parseSignedUrlExpiry("/api/files/avatars/x.png"), null);
});

test("parseSignedUrlExpiry returns null for non-numeric exp value", () => {
  assert.equal(parseSignedUrlExpiry("/api/files/avatars/x.png?exp=not-a-number"), null);
  assert.equal(parseSignedUrlExpiry("/api/files/avatars/x.png?exp="), null);
  assert.equal(parseSignedUrlExpiry("/api/files/avatars/x.png?exp=0"), null);
  assert.equal(parseSignedUrlExpiry("/api/files/avatars/x.png?exp=-10"), null);
});

test("parseSignedUrlExpiry returns null for null/undefined/empty input", () => {
  assert.equal(parseSignedUrlExpiry(null), null);
  assert.equal(parseSignedUrlExpiry(undefined), null);
  assert.equal(parseSignedUrlExpiry(""), null);
});

test("parseSignedUrlExpiry handles full URLs with query strings", () => {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  const result = parseSignedUrlExpiry(
    `https://example.com/api/files/avatars/x.png?exp=${futureExp}&sig=abc&uid=user1`
  );
  assert.equal(result, futureExp);
});
