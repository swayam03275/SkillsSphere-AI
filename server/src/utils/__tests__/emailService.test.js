import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { sendEmail, sendOTP } from "../emailService.js";

test("sendEmail in console mode logs the email details", async () => {
  const originalMode = process.env.EMAIL_SERVICE_MODE;
  process.env.EMAIL_SERVICE_MODE = "console";

  let loggedTo = null;
  let loggedSubject = null;
  let loggedContent = null;

  // Import logger to mock its methods
  const logger = await import("../logger.js");
  const originalInfo = logger.default.info;
  logger.default.info = (...args) => {
    const msg = args[0];
    if (msg.includes("[EMAIL SERVICE] To:")) loggedTo = msg;
    if (msg.includes("[EMAIL SERVICE] Subject:")) loggedSubject = msg;
    if (msg.includes("[EMAIL SERVICE] Content:")) loggedContent = msg;
  };

  try {
    await sendEmail("test@example.com", "Test Subject", "Hello world");

    assert.ok(loggedTo?.includes("test@example.com"), "To field should be logged");
    assert.ok(loggedSubject?.includes("Test Subject"), "Subject should be logged");
    assert.ok(loggedContent?.includes("Hello world"), "Content should be logged");
  } finally {
    logger.default.info = originalInfo;
    process.env.EMAIL_SERVICE_MODE = originalMode ?? "";
  }
});

test("sendOTP constructs email with verification subject for verification type", async () => {
  const originalMode = process.env.EMAIL_SERVICE_MODE;
  process.env.EMAIL_SERVICE_MODE = "console";

  let loggedSubject = null;

  const logger = await import("../logger.js");
  const originalInfo = logger.default.info;
  logger.default.info = (...args) => {
    const msg = args[0];
    if (msg.includes("[EMAIL SERVICE] Subject:")) loggedSubject = msg;
  };

  try {
    await sendOTP("user@example.com", "123456", "verification");

    assert.ok(loggedSubject?.includes("[SkillsSphere AI] Verify Your Account"), "Verification subject should be used");
  } finally {
    logger.default.info = originalInfo;
    process.env.EMAIL_SERVICE_MODE = originalMode ?? "";
  }
});

test("sendOTP constructs email with password reset subject for password_reset type", async () => {
  const originalMode = process.env.EMAIL_SERVICE_MODE;
  process.env.EMAIL_SERVICE_MODE = "console";

  let loggedSubject = null;

  const logger = await import("../logger.js");
  const originalInfo = logger.default.info;
  logger.default.info = (...args) => {
    const msg = args[0];
    if (msg.includes("[EMAIL SERVICE] Subject:")) loggedSubject = msg;
  };

  try {
    await sendOTP("user@example.com", "654321", "password_reset");

    assert.ok(loggedSubject?.includes("[SkillsSphere AI] Password Reset Request"), "Password reset subject should be used");
  } finally {
    logger.default.info = originalInfo;
    process.env.EMAIL_SERVICE_MODE = originalMode ?? "";
  }
});

test("sendEmail falls back to console when EMAIL_USER is missing", async () => {
  const originalMode = process.env.EMAIL_SERVICE_MODE;
  const originalUser = process.env.EMAIL_USER;
  process.env.EMAIL_SERVICE_MODE = "smtp";
  delete process.env.EMAIL_USER;

  let loggedFallback = false;

  const logger = await import("../logger.js");
  const originalError = logger.default.error;
  const originalInfo = logger.default.info;
  logger.default.error = () => {};
  logger.default.info = (msg) => {
    if (msg?.includes("[FALLBACK]")) loggedFallback = true;
  };

  try {
    await sendEmail("user@example.com", "Test", "Body");

    assert.equal(loggedFallback, true, "Should fall back to console when EMAIL_USER is missing");
  } finally {
    logger.default.error = originalError;
    logger.default.info = originalInfo;
    process.env.EMAIL_SERVICE_MODE = originalMode ?? "";
    process.env.EMAIL_USER = originalUser ?? "";
  }
});
