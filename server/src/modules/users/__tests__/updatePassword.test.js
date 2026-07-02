import assert from "node:assert/strict";
import test, { mock } from "node:test";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../../../database/models/User.js";
import { updatePassword } from "../controller.js";
import { updatePasswordSchema } from "../../../validations/users.validation.js";

test("updatePasswordSchema - validation logic", () => {
  // Valid payload
  const validResult = updatePasswordSchema.safeParse({
    currentPassword: "oldPassword123!",
    newPassword: "NewPassword123!",
  });
  assert.ok(validResult.success, "Should validate a strong password");

  // Invalid: weak password
  const weakResult = updatePasswordSchema.safeParse({
    currentPassword: "oldPassword123!",
    newPassword: "weak",
  });
  assert.equal(weakResult.success, false, "Should reject a weak password");
});

test("updatePassword controller - successful password update", async () => {
  const userId = new mongoose.Types.ObjectId();
  const mockUser = {
    _id: userId,
    provider: "local",
    password: "hashed_old_password",
    save: mock.fn(async function () {
      return this;
    }),
  };

  mock.method(User, "findById", async () => mockUser);
  mock.method(bcrypt, "compare", async (password, hashed) => {
    assert.equal(password, "oldPassword123!");
    assert.equal(hashed, "hashed_old_password");
    return true;
  });
  mock.method(bcrypt, "hash", async (password, saltRounds) => {
    assert.equal(password, "NewPassword123!");
    assert.equal(saltRounds, 12);
    return "hashed_new_password";
  });

  const req = {
    user: { _id: userId },
    body: {
      currentPassword: "oldPassword123!",
      newPassword: "NewPassword123!",
    },
  };

  let responseData = null;
  const res = {
    status(code) {
      assert.equal(code, 200);
      return this;
    },
    json(data) {
      responseData = data;
    },
  };

  const next = (err) => {
    assert.fail("next should not be called: " + err?.message);
  };

  await updatePassword(req, res, next);

  assert.ok(responseData, "Response should be sent");
  assert.equal(responseData.success, true);
  assert.equal(responseData.message, "Password updated successfully");
  assert.equal(mockUser.password, "hashed_new_password", "Password should be updated with new hash");
  assert.ok(mockUser.passwordChangedAt instanceof Date, "passwordChangedAt should be set");
});

test("updatePassword controller - incorrect current password", async () => {
  const userId = new mongoose.Types.ObjectId();
  const mockUser = {
    _id: userId,
    provider: "local",
    password: "hashed_old_password",
  };

  mock.method(User, "findById", async () => mockUser);
  mock.method(bcrypt, "compare", async () => false);

  const req = {
    user: { _id: userId },
    body: {
      currentPassword: "wrongPassword",
      newPassword: "NewPassword123!",
    },
  };

  const res = {};
  let nextCalled = false;

  const next = (err) => {
    nextCalled = true;
    assert.ok(err, "An error should be passed to next");
    assert.equal(err.statusCode, 401);
    assert.equal(err.message, "Incorrect current password");
  };

  await updatePassword(req, res, next);
  assert.ok(nextCalled, "next should be called");
});

test("updatePassword controller - reject social login users", async () => {
  const userId = new mongoose.Types.ObjectId();
  const mockUser = {
    _id: userId,
    provider: "google",
    password: null,
  };

  mock.method(User, "findById", async () => mockUser);

  const req = {
    user: { _id: userId },
    body: {
      currentPassword: "oldPassword123!",
      newPassword: "NewPassword123!",
    },
  };

  const res = {};
  let nextCalled = false;

  const next = (err) => {
    nextCalled = true;
    assert.ok(err, "An error should be passed to next");
    assert.equal(err.statusCode, 400);
    assert.equal(err.message, "Accounts using social login cannot update password directly");
  };

  await updatePassword(req, res, next);
  assert.ok(nextCalled, "next should be called");
});
