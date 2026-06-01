import test from "node:test";
import assert from "node:assert/strict";
import {
  SOCKET_AUTH_ERROR_CODES,
  createSocketAuthError,
  getSocketAuthErrorMessage,
} from "../socketAuthError.js";

test("getSocketAuthErrorMessage returns a safe message for Error instances", () => {
  assert.equal(getSocketAuthErrorMessage(new Error("Invalid auth token")), "Invalid auth token");
});

test("getSocketAuthErrorMessage falls back for non-Error values", () => {
  assert.equal(getSocketAuthErrorMessage(undefined), "Socket authentication failed");
  assert.equal(getSocketAuthErrorMessage({}), "Socket authentication failed");
  assert.equal(getSocketAuthErrorMessage("Token missing"), "Token missing");
});

test("createSocketAuthError attaches a stable error code", () => {
  const error = createSocketAuthError("Missing auth token", SOCKET_AUTH_ERROR_CODES.missingToken);

  assert.equal(error.message, "Missing auth token");
  assert.equal(error.data.code, SOCKET_AUTH_ERROR_CODES.missingToken);
});