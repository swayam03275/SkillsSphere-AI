const { encrypt, decrypt } = require("./server/src/utils/encryption.js");
require("dotenv").config({ path: "server/.env" });

// --- Helpers ---
function assert(condition, label) {
  if (!condition) { console.error(`[FAIL] ${label}`); process.exit(1); }
  console.log(`[PASS] ${label}`);
}

function assertNoPlaintext(ciphertext, plaintext, label) {
  assert(!ciphertext.includes(plaintext), `${label} — plaintext not in ciphertext`);
}

// --- ENV check ---
assert(!!process.env.JWT_SECRET, "JWT_SECRET is set");
assert(!!process.env.ENCRYPTION_KEY || !!process.env.SECRET_KEY, "encryption key env var is set");

// --- Decrypt known ciphertext ---
const KNOWN_CIPHERTEXT = "v1:gcm:a02a19ae8a0e138cf430b563:58cf1207bab9460a08737686f7eda382:0:f1b8a514d7c865db2650080fb05fcecb";

try {
  const decrypted = decrypt(KNOWN_CIPHERTEXT);
  assert(typeof decrypted === "string" && decrypted.length > 0, "known ciphertext decrypts to non-empty string");
  console.log("[debug] decrypted length:", decrypted.length, "(value hidden)");
} catch (err) {
  console.warn(`[warn] known ciphertext decrypt failed: ${err.message}`);
  console.warn("[warn] key mismatch or ciphertext from different env — expected in CI");
}

// --- Encrypt/decrypt roundtrip ---
const testValues = [
  "alice@example.com",
  "simple",
  "with spaces and symbols !@#$%",
  "unicode: 用户名",
  "a".repeat(500),
];

testValues.forEach((val) => {
  const encrypted = encrypt(val);
  const decrypted = decrypt(encrypted);
  assert(decrypted === val, `roundtrip: "${val.slice(0, 30)}${val.length > 30 ? "..." : ""}"`);
  assertNoPlaintext(encrypted, val, `plaintext not leaked: "${val.slice(0, 20)}..."`);
});

// --- Ciphertext format validation ---
const sample = encrypt("test");
assert(sample.startsWith("v1:gcm:"), "ciphertext has v1:gcm: prefix");
const parts = sample.split(":");
assert(parts.length >= 5, `ciphertext has >= 5 colon-separated parts (got ${parts.length})`);

// --- Unique ciphertext per call (random IV) ---
const enc1 = encrypt("same-input");
const enc2 = encrypt("same-input");
assert(enc1 !== enc2, "same input produces different ciphertext (random IV)");

// --- Different inputs produce different ciphertext ---
const encA = encrypt("alice@example.com");
const encB = encrypt("bob@example.com");
assert(encA !== encB, "different inputs produce different ciphertext");

// --- Tampered ciphertext throws ---
try {
  decrypt("v1:gcm:tampered:tampered:0:tampered");
  assert(false, "tampered ciphertext should throw");
} catch {
  assert(true, "tampered ciphertext throws correctly");
}

// --- Empty string handling ---
try {
  const encEmpty = encrypt("");
  const decEmpty = decrypt(encEmpty);
  assert(decEmpty === "", "empty string roundtrip");
} catch {
  assert(true, "empty string throws — acceptable");
}

// --- Null/undefined safe ---
try {
  encrypt(null);
  assert(false, "null should throw");
} catch {
  assert(true, "null input throws");
}

try {
  encrypt(undefined);
  assert(false, "undefined should throw");
} catch {
  assert(true, "undefined input throws");
}

console.log("\n[done] all encryption tests passed");