import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { forgotPasswordRequest, resendUserOTP } from "../service.js";
import User from "../../../database/models/User.js";

const GENERIC_RESET_MESSAGE = "If an account exists with this email, a reset code has been sent.";
const GENERIC_VERIFY_MESSAGE = "If an account exists with this email, a verification code has been sent.";

const createMockUser = (overrides = {}) => ({
  email: overrides.email || "user@example.com",
  isVerified: overrides.isVerified ?? false,
  resetPasswordExpires: overrides.resetPasswordExpires,
  verificationTokenExpires: overrides.verificationTokenExpires,
  otpAttempts: overrides.otpAttempts ?? 0,
  resetPasswordToken: overrides.resetPasswordToken,
  verificationToken: overrides.verificationToken,
  save: async function () { return this; },
});

describe("forgotPasswordRequest enumeration safety", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("returns generic response for a non-existent email", async () => {
    mock.method(User, "findOne", async () => null);

    const result = await forgotPasswordRequest("nobody@example.com");

    assert.equal(result.success, true);
    assert.equal(result.message, GENERIC_RESET_MESSAGE);
  });

  it("returns the same generic response when a recent reset request is already pending", async () => {
    const user = createMockUser({
      resetPasswordExpires: new Date(Date.now() + 4.5 * 60 * 1000), // issued < 1 min ago
    });
    mock.method(User, "findOne", async () => user);

    const result = await forgotPasswordRequest(user.email);

    assert.equal(result.success, true);
    assert.equal(result.message, GENERIC_RESET_MESSAGE);
  });
});

describe("resendUserOTP enumeration safety", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("returns generic response for a non-existent email", async () => {
    mock.method(User, "findOne", async () => null);

    const result = await resendUserOTP("nobody@example.com");

    assert.equal(result.success, true);
    assert.equal(result.message, GENERIC_VERIFY_MESSAGE);
  });

  it("returns the same generic response when the account is already verified", async () => {
    const user = createMockUser({ isVerified: true });
    mock.method(User, "findOne", async () => user);

    const result = await resendUserOTP(user.email);

    assert.equal(result.success, true);
    assert.equal(result.message, GENERIC_VERIFY_MESSAGE);
  });

  it("returns the same generic response when a recent verification OTP is already pending", async () => {
    const user = createMockUser({
      isVerified: false,
      verificationTokenExpires: new Date(Date.now() + 4.5 * 60 * 1000),
    });
    mock.method(User, "findOne", async () => user);

    const result = await resendUserOTP(user.email);

    assert.equal(result.success, true);
    assert.equal(result.message, GENERIC_VERIFY_MESSAGE);
  });
});