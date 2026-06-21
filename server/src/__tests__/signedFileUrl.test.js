import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeProtectedFilePath,
  buildSignedFileUrl,
  verifySignedFileUrl,
} from "../utils/signedFileUrl.js";

test("normalizeProtectedFilePath returns path for valid avatar path", () => {
  const result = normalizeProtectedFilePath("/api/files/avatars/foo.png");
  assert.equal(result, "/api/files/avatars/foo.png");
});

test("normalizeProtectedFilePath returns path for valid resume path", () => {
  const result = normalizeProtectedFilePath("/api/files/resumes/bar.pdf");
  assert.equal(result, "/api/files/resumes/bar.pdf");
});

test("normalizeProtectedFilePath extracts path from legacy /uploads/avatars/ URL", () => {
  const result = normalizeProtectedFilePath(
    "https://example.com/uploads/avatars/avatar-123.png",
  );
  assert.equal(result, "/api/files/avatars/avatar-123.png");
});

test("normalizeProtectedFilePath extracts path from legacy /uploads/resumes/ URL", () => {
  const result = normalizeProtectedFilePath(
    "https://example.com/uploads/resumes/resume-456.pdf",
  );
  assert.equal(result, "/api/files/resumes/resume-456.pdf");
});

test("normalizeProtectedFilePath strips query parameters from HTTP URLs", () => {
  const result = normalizeProtectedFilePath(
    "https://example.com/api/files/avatars/foo.png?token=abc",
  );
  assert.equal(result, "/api/files/avatars/foo.png");
});

test("normalizeProtectedFilePath returns null for external https URL outside uploads", () => {
  const result = normalizeProtectedFilePath("https://google.com/page");
  assert.equal(result, null);
});

test("normalizeProtectedFilePath returns null for non-protected paths", () => {
  const result = normalizeProtectedFilePath("/api/other/foo.png");
  assert.equal(result, null);
});

test("normalizeProtectedFilePath returns null for null input", () => {
  assert.equal(normalizeProtectedFilePath(null), null);
});

test("normalizeProtectedFilePath returns null for undefined input", () => {
  assert.equal(normalizeProtectedFilePath(undefined), null);
});

test("normalizeProtectedFilePath returns null for empty string", () => {
  assert.equal(normalizeProtectedFilePath(""), null);
});

test("buildSignedFileUrl returns URL containing path and query params", () => {
  const originalSecret = process.env.FILE_URL_SIGNING_SECRET;
  process.env.FILE_URL_SIGNING_SECRET = "test-secret-key-at-least-32-characters";
  try {
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
    const url = buildSignedFileUrl({
      path: "/api/files/avatars/foo.png",
      expiresAt: futureExpiry,
    });
    assert(url.includes("/api/files/avatars/foo.png"));
    assert(url.includes("exp=" + futureExpiry));
    assert(url.includes("sig="));
  } finally {
    if (originalSecret !== undefined) {
      process.env.FILE_URL_SIGNING_SECRET = originalSecret;
    } else {
      delete process.env.FILE_URL_SIGNING_SECRET;
    }
  }
});

test("buildSignedFileUrl includes uid parameter when extra is provided", () => {
  const originalSecret = process.env.FILE_URL_SIGNING_SECRET;
  process.env.FILE_URL_SIGNING_SECRET = "test-secret-key-at-least-32-characters";
  try {
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
    const url = buildSignedFileUrl({
      path: "/api/files/avatars/foo.png",
      expiresAt: futureExpiry,
      extra: "user123",
    });
    assert(url.includes("uid=user123"));
  } finally {
    if (originalSecret !== undefined) {
      process.env.FILE_URL_SIGNING_SECRET = originalSecret;
    } else {
      delete process.env.FILE_URL_SIGNING_SECRET;
    }
  }
});

test("buildSignedFileUrl produces different signatures for different paths", () => {
  const originalSecret = process.env.FILE_URL_SIGNING_SECRET;
  process.env.FILE_URL_SIGNING_SECRET = "test-secret-key-at-least-32-characters";
  try {
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
    const url1 = buildSignedFileUrl({
      path: "/api/files/avatars/foo.png",
      expiresAt: futureExpiry,
    });
    const url2 = buildSignedFileUrl({
      path: "/api/files/avatars/bar.png",
      expiresAt: futureExpiry,
    });
    const sig1 = new URL(url1, "http://localhost").searchParams.get("sig");
    const sig2 = new URL(url2, "http://localhost").searchParams.get("sig");
    assert.notStrictEqual(sig1, sig2);
  } finally {
    if (originalSecret !== undefined) {
      process.env.FILE_URL_SIGNING_SECRET = originalSecret;
    } else {
      delete process.env.FILE_URL_SIGNING_SECRET;
    }
  }
});

test("verifySignedFileUrl returns true for a freshly built valid signed URL", () => {
  const originalSecret = process.env.FILE_URL_SIGNING_SECRET;
  process.env.FILE_URL_SIGNING_SECRET = "test-secret-key-at-least-32-characters";
  try {
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
    const validPath = "/api/files/avatars/foo.png";
    const url = buildSignedFileUrl({ path: validPath, expiresAt: futureExpiry });
    const params = new URL(url, "http://localhost").searchParams;
    const result = verifySignedFileUrl(
      validPath,
      params.get("exp"),
      params.get("sig"),
    );
    assert.equal(result, true);
  } finally {
    if (originalSecret !== undefined) {
      process.env.FILE_URL_SIGNING_SECRET = originalSecret;
    } else {
      delete process.env.FILE_URL_SIGNING_SECRET;
    }
  }
});

test("verifySignedFileUrl returns false for an expired URL", () => {
  const originalSecret = process.env.FILE_URL_SIGNING_SECRET;
  process.env.FILE_URL_SIGNING_SECRET = "test-secret-key-at-least-32-characters";
  try {
    const pastExpiry = Math.floor(Date.now() / 1000) - 3600;
    const validPath = "/api/files/avatars/foo.png";
    const url = buildSignedFileUrl({ path: validPath, expiresAt: pastExpiry });
    const params = new URL(url, "http://localhost").searchParams;
    const result = verifySignedFileUrl(
      validPath,
      params.get("exp"),
      params.get("sig"),
    );
    assert.equal(result, false);
  } finally {
    if (originalSecret !== undefined) {
      process.env.FILE_URL_SIGNING_SECRET = originalSecret;
    } else {
      delete process.env.FILE_URL_SIGNING_SECRET;
    }
  }
});

test("verifySignedFileUrl returns false for a wrong signature", () => {
  const originalSecret = process.env.FILE_URL_SIGNING_SECRET;
  process.env.FILE_URL_SIGNING_SECRET = "test-secret-key-at-least-32-characters";
  try {
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
    const validPath = "/api/files/avatars/foo.png";
    const result = verifySignedFileUrl(
      validPath,
      String(futureExpiry),
      "a".repeat(64),
    );
    assert.equal(result, false);
  } finally {
    if (originalSecret !== undefined) {
      process.env.FILE_URL_SIGNING_SECRET = originalSecret;
    } else {
      delete process.env.FILE_URL_SIGNING_SECRET;
    }
  }
});

test("verifySignedFileUrl returns false for an invalid path", () => {
  const originalSecret = process.env.FILE_URL_SIGNING_SECRET;
  process.env.FILE_URL_SIGNING_SECRET = "test-secret-key-at-least-32-characters";
  try {
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
    const result = verifySignedFileUrl(
      "/api/other/foo.png",
      String(futureExpiry),
      "a".repeat(64),
    );
    assert.equal(result, false);
  } finally {
    if (originalSecret !== undefined) {
      process.env.FILE_URL_SIGNING_SECRET = originalSecret;
    } else {
      delete process.env.FILE_URL_SIGNING_SECRET;
    }
  }
});

test("verifySignedFileUrl returns false for empty signature", () => {
  const originalSecret = process.env.FILE_URL_SIGNING_SECRET;
  process.env.FILE_URL_SIGNING_SECRET = "test-secret-key-at-least-32-characters";
  try {
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
    const result = verifySignedFileUrl(
      "/api/files/avatars/foo.png",
      String(futureExpiry),
      "",
    );
    assert.equal(result, false);
  } finally {
    if (originalSecret !== undefined) {
      process.env.FILE_URL_SIGNING_SECRET = originalSecret;
    } else {
      delete process.env.FILE_URL_SIGNING_SECRET;
    }
  }
});

test("verifySignedFileUrl returns false for missing signature", () => {
  const originalSecret = process.env.FILE_URL_SIGNING_SECRET;
  process.env.FILE_URL_SIGNING_SECRET = "test-secret-key-at-least-32-characters";
  try {
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
    const result = verifySignedFileUrl(
      "/api/files/avatars/foo.png",
      String(futureExpiry),
      null,
    );
    assert.equal(result, false);
  } finally {
    if (originalSecret !== undefined) {
      process.env.FILE_URL_SIGNING_SECRET = originalSecret;
    } else {
      delete process.env.FILE_URL_SIGNING_SECRET;
    }
  }
});