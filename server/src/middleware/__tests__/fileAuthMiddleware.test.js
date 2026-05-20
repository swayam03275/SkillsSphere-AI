import assert from "node:assert/strict";
import test, { mock } from "node:test";
import jwt from "jsonwebtoken";
import User from "../../database/models/User.js";
import { protectFileAccess } from "../fileAuthMiddleware.js";
import { buildSignedFileUrl } from "../../utils/signedFileUrl.js";

// Setup environment variables for signed URL generation
process.env.FILE_URL_SIGNING_SECRET = "signing-secret-12345";
process.env.JWT_SECRET = "jwt-secret-12345";

// Mock User.findById
let mockUserRecord = null;
mock.method(User, "findById", () => {
  return {
    select(fields) {
      return mockUserRecord;
    }
  };
});

// Mock jwt.verify
mock.method(jwt, "verify", (token, secret) => {
  if (token === "invalid-token") {
    throw new Error("Invalid token");
  }
  return { userId: "user123" };
});

test("fileAuthMiddleware - protectFileAccess allows access via valid signed URL parameters", async () => {
  const requestPath = "/api/files/avatars/my-avatar.png";
  const expiresAt = Math.floor(Date.now() / 1000) + 3600; // expires in 1 hr
  const extraUid = "user999";

  // Generate valid signed URL using real signing utility
  const signedUrl = buildSignedFileUrl({
    path: requestPath,
    expiresAt,
    extra: extraUid
  });

  // Extract parameters to simulate incoming express query
  const parsedUrl = new URL(`http://localhost${signedUrl}`);
  const req = {
    baseUrl: "/api/files/avatars",
    path: "/my-avatar.png",
    query: {
      exp: parsedUrl.searchParams.get("exp"),
      sig: parsedUrl.searchParams.get("sig"),
      uid: parsedUrl.searchParams.get("uid")
    },
    headers: {}
  };

  let errorArg = null;
  let nextCalled = false;
  const next = (err) => {
    errorArg = err;
    nextCalled = true;
  };

  await protectFileAccess(req, {}, next);

  assert.equal(errorArg, undefined);
  assert.equal(nextCalled, true);
  assert.equal(req.signedUserId, "user999");
});

test("fileAuthMiddleware - protectFileAccess blocks access for expired or invalid signed URL", async () => {
  const requestPath = "/api/files/avatars/my-avatar.png";
  const expiresAt = Math.floor(Date.now() / 1000) - 3600; // expired 1 hr ago
  const extraUid = "user999";

  // Generate expired signed URL
  const signedUrl = buildSignedFileUrl({
    path: requestPath,
    expiresAt,
    extra: extraUid
  });

  const parsedUrl = new URL(`http://localhost${signedUrl}`);
  const req = {
    baseUrl: "/api/files/avatars",
    path: "/my-avatar.png",
    query: {
      exp: parsedUrl.searchParams.get("exp"),
      sig: parsedUrl.searchParams.get("sig"),
      uid: parsedUrl.searchParams.get("uid")
    },
    headers: {}
  };

  let errorArg = null;
  const next = (err) => {
    errorArg = err;
  };

  await protectFileAccess(req, {}, next);

  assert.ok(errorArg);
  assert.equal(errorArg.statusCode, 401);
  assert.equal(errorArg.message, "Signed URL is invalid or expired.");
});

test("fileAuthMiddleware - protectFileAccess blocks access when no credentials are provided", async () => {
  const req = {
    baseUrl: "/api/files/avatars",
    path: "/my-avatar.png",
    query: {},
    headers: {}
  };

  let errorArg = null;
  const next = (err) => {
    errorArg = err;
  };

  await protectFileAccess(req, {}, next);

  assert.ok(errorArg);
  assert.equal(errorArg.statusCode, 401);
  assert.equal(errorArg.message, "You are not logged in! Please log in to get access.");
});

test("fileAuthMiddleware - protectFileAccess allows access via valid JWT Bearer header", async () => {
  const req = {
    baseUrl: "/api/files/avatars",
    path: "/my-avatar.png",
    query: {},
    headers: {
      authorization: "Bearer valid-token"
    }
  };

  const testUser = { _id: "user123", email: "user@test.com" };
  mockUserRecord = testUser;

  let errorArg = null;
  let nextCalled = false;
  const next = (err) => {
    errorArg = err;
    nextCalled = true;
  };

  await protectFileAccess(req, {}, next);

  assert.equal(errorArg, undefined);
  assert.equal(nextCalled, true);
  assert.deepEqual(req.user, testUser);
});
