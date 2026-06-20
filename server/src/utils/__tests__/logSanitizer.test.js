import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeString, sanitizeValue, setupGlobalLogSanitizer } from "../logSanitizer.js";

test("sanitizeString - masks email addresses", () => {
  const result = sanitizeString("Contact: john.doe@example.com");
  assert.equal(result, "Contact: [MASKED_EMAIL]");
});

test("sanitizeString - masks multiple emails in a string", () => {
  const result = sanitizeString("user1@test.com and user2@test.org");
  assert.equal(result, "[MASKED_EMAIL] and [MASKED_EMAIL]");
});

test("sanitizeString - masks phone numbers", () => {
  const result = sanitizeString("Call me at 9876543210");
  assert.equal(result, "Call me at [MASKED_PHONE]");
});

test("sanitizeString - masks mixed emails and phones", () => {
  const result = sanitizeString("Email: admin@site.com, Phone: 9876543210");
  assert.equal(result, "Email: [MASKED_EMAIL], Phone: [MASKED_PHONE]");
});

test("sanitizeString - returns non-string values as-is", () => {
  assert.equal(sanitizeString(123), 123);
  assert.equal(sanitizeString(null), null);
  assert.equal(sanitizeString(undefined), undefined);
});

test("sanitizeString - returns string unchanged when no PII present", () => {
  const result = sanitizeString("Hello world, this is a normal log message.");
  assert.equal(result, "Hello world, this is a normal log message.");
});

test("sanitizeValue - returns null and undefined unchanged", () => {
  assert.equal(sanitizeValue(null), null);
  assert.equal(sanitizeValue(undefined), undefined);
});

test("sanitizeValue - sanitizes strings directly", () => {
  const result = sanitizeValue("Reach me at jane@company.org");
  assert.equal(result, "Reach me at [MASKED_EMAIL]");
});

test("sanitizeValue - sanitizes arrays recursively", () => {
  const input = [
    "Email me at foo@bar.com",
    42,
    { email: "secret@domain.com", role: "admin" },
  ];
  const result = sanitizeValue(input);
  assert.equal(result[0], "Email me at [MASKED_EMAIL]");
  assert.equal(result[1], 42);
  assert.equal(result[2].email, "[MASKED_PII]");
  assert.equal(result[2].role, "admin");
});

test("sanitizeValue - masks keys containing PII terms", () => {
  const input = {
    email: "user@test.com",
    password: "supersecret",
    token: "abc123",
    resetPasswordToken: "reset456",
    verificationToken: "verify789",
    name: "Alice Smith",
    phone: "9876543210",
    address: "123 Main St",
    normalField: "safe value",
  };
  const result = sanitizeValue(input);
  assert.equal(result.email, "[MASKED_PII]");
  assert.equal(result.password, "[MASKED_PII]");
  assert.equal(result.token, "[MASKED_PII]");
  assert.equal(result.resetPasswordToken, "[MASKED_PII]");
  assert.equal(result.verificationToken, "[MASKED_PII]");
  assert.equal(result.name, "[MASKED_PII]");
  assert.equal(result.phone, "[MASKED_PII]");
  assert.equal(result.address, "[MASKED_PII]");
  assert.equal(result.normalField, "safe value");
});

test("sanitizeValue - masks nested PII keys", () => {
  const input = { user: { email: "test@test.com", role: "admin" } };
  const result = sanitizeValue(input);
  assert.equal(result.user.email, "[MASKED_PII]");
  assert.equal(result.user.role, "admin");
});

test("sanitizeValue - passes Date objects through unchanged", () => {
  const date = new Date("2026-01-01");
  const result = sanitizeValue(date);
  assert.equal(result, date);
});

test("sanitizeValue - passes Buffer objects through unchanged", () => {
  const buf = Buffer.from("hello");
  const result = sanitizeValue(buf);
  assert.equal(result, buf);
});

test("sanitizeValue - passes RegExp objects through unchanged", () => {
  const re = /test/gi;
  const result = sanitizeValue(re);
  assert.equal(result, re);
});

test("sanitizeValue - sanitizes Error objects", () => {
  const err = new Error("Contact me at alice@company.com");
  const result = sanitizeValue(err);
  assert.equal(result.message, "Contact me at [MASKED_EMAIL]");
});

test("sanitizeValue - sanitizes Error objects with stack traces", () => {
  const err = new Error("invalid credentials for admin@company.com");
  const result = sanitizeValue(err);
  assert.equal(result.message, "invalid credentials for [MASKED_EMAIL]");
  assert.ok(result.stack.includes("[MASKED_EMAIL]"));
});

test("sanitizeValue - returns numbers and booleans unchanged", () => {
  assert.equal(sanitizeValue(42), 42);
  assert.equal(sanitizeValue(true), true);
  assert.equal(sanitizeValue(3.14), 3.14);
});

test("sanitizeValue - handles empty objects and arrays", () => {
  assert.deepEqual(sanitizeValue({}), {});
  assert.deepEqual(sanitizeValue([]), []);
});

test("setupGlobalLogSanitizer - patches console methods", () => {
  const originals = { log: console.log, info: console.info, warn: console.warn, error: console.error };

  setupGlobalLogSanitizer();

  assert.notEqual(console.log, originals.log);
  assert.notEqual(console.info, originals.info);
  assert.notEqual(console.warn, originals.warn);
  assert.notEqual(console.error, originals.error);

  // Restore originals to avoid polluting global state for subsequent tests
  console.log = originals.log;
  console.info = originals.info;
  console.warn = originals.warn;
  console.error = originals.error;
});
