import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { registerUserAndIssueToken, loginUser } from "../service.js";
import User from "../../../database/models/User.js";

process.env.JWT_SECRET = "test_secret_for_jwt";

describe("Login Flow with Deterministic Encryption", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should successfully register and login a user using correct credentials", async () => {
    const email = "BugTest_Case@example.com";
    const password = "Password123!Secure";
    
    // 1. Register User
    const regResult = await registerUserAndIssueToken({
      name: "Bug Tester",
      email: email.toLowerCase().trim(), // Simulating Zod schema
      password: password,
      role: "student"
    });
    
    assert.strictEqual(regResult.user.email, email.toLowerCase().trim());
    assert.ok(regResult.token, "Should issue a token upon registration");

    // 2. Verify Deterministic Encryption in Database
    const dbUser = await User.findOne({ email: email.toLowerCase().trim() });
    assert.ok(dbUser, "User should be found in DB");
    
    // 3. Attempt Login
    const loginResult = await loginUser(email.toLowerCase().trim(), password);
    assert.strictEqual(loginResult.user.email, email.toLowerCase().trim());
    assert.ok(loginResult.token, "Should issue a token upon successful login");
  });
});
