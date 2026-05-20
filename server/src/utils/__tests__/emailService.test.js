import assert from "node:assert/strict";
import test from "node:test";
import { sendEmail, sendOTP } from "../emailService.js";

test("emailService - sendEmail in console mode prints logs with parameters", async () => {
  const originalEnv = process.env.EMAIL_SERVICE_MODE;
  process.env.EMAIL_SERVICE_MODE = "console";

  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => {
    logs.push(args.join(" "));
  };

  try {
    await sendEmail("test@example.com", "Test Subject", "Test Text Content");
    
    const combinedLog = logs.join("\n");
    assert.ok(combinedLog.includes("[EMAIL SERVICE] Mode: CONSOLE"));
    assert.ok(combinedLog.includes("To: test@example.com"));
    assert.ok(combinedLog.includes("Subject: Test Subject"));
    assert.ok(combinedLog.includes("Content: Test Text Content"));
  } finally {
    console.log = originalLog;
    process.env.EMAIL_SERVICE_MODE = originalEnv;
  }
});

test("emailService - sendEmail in smtp mode without credentials logs warning and falls back", async () => {
  const originalEnvMode = process.env.EMAIL_SERVICE_MODE;
  const originalEnvUser = process.env.EMAIL_USER;
  const originalEnvPass = process.env.EMAIL_PASS;

  process.env.EMAIL_SERVICE_MODE = "smtp";
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASS;

  const logs = [];
  const errors = [];
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args) => {
    logs.push(args.join(" "));
  };
  console.error = (...args) => {
    errors.push(args.join(" "));
  };

  try {
    await sendEmail("fallback@example.com", "Fallback Sub", "Fallback Content");

    const combinedErrors = errors.join("\n");
    const combinedLogs = logs.join("\n");

    assert.ok(combinedErrors.includes("SMTP Error: EMAIL_USER or EMAIL_PASS missing. Falling back to console."));
    assert.ok(combinedLogs.includes("[FALLBACK] To: fallback@example.com | Subject: Fallback Sub | Content: Fallback Content"));
  } finally {
    console.log = originalLog;
    console.error = originalError;
    process.env.EMAIL_SERVICE_MODE = originalEnvMode;
    process.env.EMAIL_USER = originalEnvUser;
    process.env.EMAIL_PASS = originalEnvPass;
  }
});

test("emailService - sendOTP formats verification type correctly", async () => {
  const originalEnv = process.env.EMAIL_SERVICE_MODE;
  process.env.EMAIL_SERVICE_MODE = "console";

  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => {
    logs.push(args.join(" "));
  };

  try {
    await sendOTP("verify@example.com", "999888", "verification");

    const combinedLog = logs.join("\n");
    assert.ok(combinedLog.includes("To: verify@example.com"));
    assert.ok(combinedLog.includes("Subject: [SkillsSphere AI] Verify Your Account - 999888"));
    assert.ok(combinedLog.includes("Thank you for joining SkillsSphere AI. Please use the following One-Time Password (OTP) to verify your account: 999888"));
  } finally {
    console.log = originalLog;
    process.env.EMAIL_SERVICE_MODE = originalEnv;
  }
});

test("emailService - sendOTP formats password reset request correctly", async () => {
  const originalEnv = process.env.EMAIL_SERVICE_MODE;
  process.env.EMAIL_SERVICE_MODE = "console";

  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => {
    logs.push(args.join(" "));
  };

  try {
    await sendOTP("reset@example.com", "111222", "reset");

    const combinedLog = logs.join("\n");
    assert.ok(combinedLog.includes("To: reset@example.com"));
    assert.ok(combinedLog.includes("Subject: [SkillsSphere AI] Password Reset Request - 111222"));
    assert.ok(combinedLog.includes("We received a request to reset your password. Please use the following One-Time Password (OTP) to proceed: 111222"));
  } finally {
    console.log = originalLog;
    process.env.EMAIL_SERVICE_MODE = originalEnv;
  }
});
