import { describe, test, mock } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "../..");

// Mock logger (which imports winston) before importing encryption
await mock.module(`file://${serverRoot}/src/utils/logger.js`, {
  namedExports: {},
  defaultExport: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
});

// Set env vars BEFORE importing the module
process.env.ENCRYPTION_KEY = "test-encryption-key-32-characters!";
process.env.NODE_ENV = "test";

const { encrypt, encryptDeterministic, decrypt } = await import("../utils/encryption.js");

describe("encryption utility", () => {

  describe("encrypt (AES-256-GCM, non-deterministic)", () => {
    test("encrypts and decrypts a string roundtrip", () => {
      const original = "hello world";
      const encrypted = encrypt(original);
      assert.ok(encrypted.startsWith("v1:gcm:"), "should use GCM mode");
      const decrypted = decrypt(encrypted);
      assert.equal(decrypted, original);
    });

    test("encrypts and decrypts an object roundtrip", () => {
      const original = { name: "Alice", score: 42, active: true };
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      assert.equal(decrypted.name, original.name);
      assert.equal(decrypted.score, original.score);
      assert.equal(decrypted.active, original.active);
    });

    test("returns null/undefined as-is (idempotent)", () => {
      assert.equal(encrypt(null), null);
      assert.equal(encrypt(undefined), undefined);
    });

    test("returns already-encrypted value as-is (idempotent)", () => {
      const original = "v1:gcm:abc123:xyz:0:data";
      assert.equal(encrypt(original), original);
    });

    test("different encryptions of same string produce different ciphertexts (non-deterministic)", () => {
      const original = "test string";
      const enc1 = encrypt(original);
      const enc2 = encrypt(original);
      assert.notEqual(enc1, enc2, "GCM should produce different ciphertexts due to random IV");
    });

    test("decrypt fails gracefully on corrupted ciphertext", () => {
      const result = decrypt("v1:gcm:invalid:data");
      assert.equal(result, null, "decrypt should return null on failure");
    });
  });

  describe("encryptDeterministic (AES-256-CBC, deterministic)", () => {
    test("encrypts and decrypts a string roundtrip", () => {
      const original = "alice@example.com";
      const encrypted = encryptDeterministic(original);
      assert.ok(encrypted.startsWith("v1:cbc:"), "should use CBC mode");
      const decrypted = decrypt(encrypted);
      assert.equal(decrypted, original);
    });

    test("same plaintext always produces same ciphertext (determinism)", () => {
      const plaintext = "bob@example.com";
      const enc1 = encryptDeterministic(plaintext);
      const enc2 = encryptDeterministic(plaintext);
      assert.equal(enc1, enc2, "Deterministic encryption should produce identical ciphertexts");
    });

    test("different plaintexts produce different ciphertexts", () => {
      const enc1 = encryptDeterministic("user1@example.com");
      const enc2 = encryptDeterministic("user2@example.com");
      assert.notEqual(enc1, enc2);
    });

    test("returns null/undefined as-is (idempotent)", () => {
      assert.equal(encryptDeterministic(null), null);
      assert.equal(encryptDeterministic(undefined), undefined);
    });
  });

  describe("decrypt (auto-detects GCM vs CBC)", () => {
    test("decrypts GCM ciphertext", () => {
      const original = "secret message";
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      assert.equal(decrypted, original);
    });

    test("decrypts CBC ciphertext", () => {
      const original = "another secret";
      const encrypted = encryptDeterministic(original);
      const decrypted = decrypt(encrypted);
      assert.equal(decrypted, original);
    });

    test("returns non-encrypted string as-is", () => {
      const plaintext = "not encrypted at all";
      assert.equal(decrypt(plaintext), plaintext);
    });

    test("returns null for invalid ciphertext (GCM auth failure)", () => {
      // A GCM ciphertext with tampered data should fail decryption
      const encrypted = encrypt("secret");
      const tampered = encrypted.slice(0, -5) + "XXXXX";
      const result = decrypt(tampered);
      assert.equal(result, null, "tampered GCM ciphertext should return null");
    });

    test("returns null for malformed encrypted string", () => {
      const result = decrypt("v1:unknownmode:data");
      assert.equal(result, null);
    });
  });
});
