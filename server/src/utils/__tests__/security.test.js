import test from "node:test";
import assert from "node:assert";

process.env.ENCRYPTION_KEY = "x".repeat(32);

import { encrypt, encryptDeterministic, decrypt } from "../encryption.js";
import { sanitizeValue } from "../logSanitizer.js";

test("Encryption Utility - AES-256-GCM Non-Deterministic Encryption", () => {
  const plainText = "Sensitive PII Data!";
  const encrypted1 = encrypt(plainText);
  const encrypted2 = encrypt(plainText);

  assert.ok(encrypted1.startsWith("v1:gcm:"), "Should be prefixed with GCM version");
  assert.notStrictEqual(encrypted1, encrypted2, "Non-deterministic ciphertexts should differ");

  const decrypted1 = decrypt(encrypted1);
  const decrypted2 = decrypt(encrypted2);

  assert.strictEqual(decrypted1, plainText, "Decrypted text should match original");
  assert.strictEqual(decrypted2, plainText, "Decrypted text should match original");
});

test("Encryption Utility - AES-256-CBC Deterministic Encryption", () => {
  const plainText = "candidate@example.com";
  const encrypted1 = encryptDeterministic(plainText);
  const encrypted2 = encryptDeterministic(plainText);

  assert.ok(encrypted1.startsWith("v1:cbc:"), "Should be prefixed with CBC version");
  assert.strictEqual(encrypted1, encrypted2, "Deterministic ciphertexts should be identical");

  const decrypted = decrypt(encrypted1);
  assert.strictEqual(decrypted, plainText, "Decrypted text should match original");
});

test("Encryption Utility - JSON Object/Array Serialization and Decryption", () => {
  const payload = {
    nested: {
      array: ["one", "two"],
      val: 42
    }
  };

  const encrypted = encrypt(payload);
  const decrypted = decrypt(encrypted);

  assert.deepStrictEqual(decrypted, payload, "Decrypted structure should match original structure");
});

test("Log Sanitizer - String Masking", () => {
  const rawLog = "User with email john.doe@domain.com and phone +1-555-123-4567 registered.";
  const sanitized = sanitizeValue(rawLog);

  assert.strictEqual(
    sanitized,
    "User with email [MASKED_EMAIL] and phone [MASKED_PHONE] registered."
  );
});

test("Log Sanitizer - Object Recursive Masking", () => {
  const rawObject = {
    user: {
      name: "Alice Smith",
      email: "alice@gmail.com",
      profile: {
        phone: "9876543210",
        role: "student"
      }
    },
    metadata: {
      isScannedPdf: false,
      token: "secretJWTToken123"
    }
  };

  const sanitized = sanitizeValue(rawObject);

  assert.deepStrictEqual(sanitized, {
    user: {
      name: "[MASKED_PII]",
      email: "[MASKED_PII]",
      profile: {
        phone: "[MASKED_PII]",
        role: "student"
      }
    },
    metadata: {
      isScannedPdf: false,
      token: "[MASKED_PII]"
    }
  });
});
