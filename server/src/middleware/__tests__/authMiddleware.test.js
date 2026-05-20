import assert from "node:assert/strict";
import test, { mock } from "node:test";
import jwt from "jsonwebtoken";
import User from "../../database/models/User.js";
import { protect, authorizeRoles, verifySocketToken } from "../authMiddleware.js";

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

test("authMiddleware - protect returns 401 when no token is present", async () => {
  const req = { headers: {} };
  let errorArg = null;
  const next = (err) => {
    errorArg = err;
  };

  await protect(req, {}, next);

  assert.ok(errorArg);
  assert.equal(errorArg.statusCode, 401);
  assert.equal(errorArg.message, "You are not logged in! Please log in to get access.");
});

test("authMiddleware - protect returns 401 when token is invalid", async () => {
  const req = {
    headers: {
      authorization: "Bearer invalid-token"
    }
  };
  let errorArg = null;
  const next = (err) => {
    errorArg = err;
  };

  await protect(req, {}, next);

  assert.ok(errorArg);
  assert.equal(errorArg.statusCode, 401);
  assert.equal(errorArg.message, "Invalid token. Please log in again.");
});

test("authMiddleware - protect returns 401 when user does not exist", async () => {
  const req = {
    headers: {
      authorization: "Bearer valid-token"
    }
  };
  let errorArg = null;
  const next = (err) => {
    errorArg = err;
  };

  mockUserRecord = null; // simulate user not found

  await protect(req, {}, next);

  assert.ok(errorArg);
  assert.equal(errorArg.statusCode, 401);
  assert.equal(errorArg.message, "The user belonging to this token no longer exists.");
});

test("authMiddleware - protect grants access and sets req.user when valid", async () => {
  const req = {
    headers: {
      authorization: "Bearer valid-token"
    }
  };
  let errorArg = null;
  let nextCalled = false;
  const next = (err) => {
    errorArg = err;
    nextCalled = true;
  };

  const testUser = { _id: "user123", email: "user@test.com", role: "student" };
  mockUserRecord = testUser;

  await protect(req, {}, next);

  assert.equal(errorArg, undefined);
  assert.equal(nextCalled, true);
  assert.deepEqual(req.user, testUser);
});

test("authMiddleware - authorizeRoles blocks unauthorized users", () => {
  const req = {
    user: { role: "student" }
  };
  let errorArg = null;
  const next = (err) => {
    errorArg = err;
  };

  const middleware = authorizeRoles("recruiter", "tutor");
  middleware(req, {}, next);

  assert.ok(errorArg);
  assert.equal(errorArg.statusCode, 403);
  assert.equal(errorArg.message, "You do not have permission to perform this action");
});

test("authMiddleware - authorizeRoles allows authorized users", () => {
  const req = {
    user: { role: "recruiter" }
  };
  let errorArg = null;
  let nextCalled = false;
  const next = (err) => {
    errorArg = err;
    nextCalled = true;
  };

  const middleware = authorizeRoles("recruiter", "tutor");
  middleware(req, {}, next);

  assert.equal(errorArg, undefined);
  assert.equal(nextCalled, true);
});

test("authMiddleware - verifySocketToken rejects when token is missing", async () => {
  await assert.rejects(
    verifySocketToken(null),
    /Authentication required/
  );
});

test("authMiddleware - verifySocketToken rejects when token is invalid", async () => {
  await assert.rejects(
    verifySocketToken("invalid-token"),
    /Invalid token/
  );
});

test("authMiddleware - verifySocketToken rejects when user is not found", async () => {
  mockUserRecord = null;
  await assert.rejects(
    verifySocketToken("valid-token"),
    /User not found/
  );
});

test("authMiddleware - verifySocketToken resolves user when valid", async () => {
  const testUser = { _id: "user123", email: "user@test.com", role: "student" };
  mockUserRecord = testUser;
  const resolvedUser = await verifySocketToken("valid-token");
  assert.deepEqual(resolvedUser, testUser);
});
