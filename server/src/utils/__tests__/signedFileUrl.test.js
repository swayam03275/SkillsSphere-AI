import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSignedFileUrl,
  normalizeProtectedFilePath,
  verifySignedFileUrl,
} from "../signedFileUrl.js";

process.env.FILE_URL_SIGNING_SECRET = "test-signing-secret";

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
