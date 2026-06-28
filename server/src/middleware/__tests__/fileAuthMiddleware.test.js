import test, { mock, afterEach } from "node:test";
import assert from "node:assert/strict";

const mockVerifySigned = mock.fn(() => true);

mock.module("../../utils/signedFileUrl.js", {
  namedExports: { verifySignedFileUrl: mockVerifySigned },
});

afterEach(() => {
  mock.restoreAll();
  mockVerifySigned.mock.resetCalls();
});

const invokeMiddleware = (req) => {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ statusCode: this.statusCode, body: payload, jsonCalled: true });
        return this;
      },
    };
    protectFileAccess(req, res, (err) => {
      if (err) {
        resolve({ nextError: err });
        return;
      }
      resolve({ nextCalled: true, user: req.user, signedUserId: req.signedUserId });
    });
  });
};

const { protectFileAccess } = await import("../fileAuthMiddleware.js");

test("signed URL path calls next() with req.signedUserId when signature is valid", async () => {
  mockVerifySigned.mock.mockImplementation(() => true);
  const result = await invokeMiddleware({
    baseUrl: "",
    path: "/api/files/avatars/user123.jpg",
    query: { exp: "9999999999", sig: "validsig", uid: "user456" },
  });
  assert.strictEqual(result.nextCalled, true);
  assert.strictEqual(result.signedUserId, "user456");
});

test("signed URL path returns 400 AppError for non-protected path", async () => {
  const result = await invokeMiddleware({
    baseUrl: "",
    path: "/api/other/path",
    query: { exp: "9999999999", sig: "validsig" },
  });
  assert.strictEqual(result.nextError?.statusCode, 400);
  assert.ok(result.nextError?.message.includes("Invalid file path"));
});

test("signed URL path returns 401 when signature is invalid", async () => {
  mockVerifySigned.mock.mockImplementation(() => false);
  const result = await invokeMiddleware({
    baseUrl: "",
    path: "/api/files/avatars/user.jpg",
    query: { exp: "9999999999", sig: "invalidsig" },
  });
  assert.strictEqual(result.nextError?.statusCode, 401);
  assert.ok(result.nextError?.message.includes("Signed URL"));
});

test("JWT path returns 401 when no Authorization header is present", async () => {
  const result = await invokeMiddleware({
    baseUrl: "",
    path: "/api/files/avatars/user.jpg",
    query: {},
    headers: {},
  });
  assert.strictEqual(result.nextError?.statusCode, 401);
  assert.ok(result.nextError?.message.includes("not logged in"));
});

test("JWT path returns 401 for malformed Authorization header (no token)", async () => {
  const result = await invokeMiddleware({
    baseUrl: "",
    path: "/api/files/avatars/user.jpg",
    query: {},
    headers: { authorization: "Bearer" },
  });
  assert.strictEqual(result.nextError?.statusCode, 401);
});

test("signed URL path skips signed URL logic when only exp is provided without sig", async () => {
  // When sig is missing, it falls through to JWT path and returns 401 (no auth header)
  const result = await invokeMiddleware({
    baseUrl: "",
    path: "/api/files/avatars/user.jpg",
    query: { exp: "9999999999" },
    headers: {},
  });
  assert.strictEqual(result.nextError?.statusCode, 401);
});

test("JWT path returns 401 when token is invalid", async () => {
  const result = await invokeMiddleware({
    baseUrl: "",
    path: "/api/files/avatars/user.jpg",
    query: {},
    headers: { authorization: "Bearer bad.jwt.token" },
  });
  assert.strictEqual(result.nextError?.statusCode, 401);
  assert.ok(result.nextError?.message.includes("Invalid token"));
});


