require("dotenv").config({ path: "server/.env" });
const mongoose = require("mongoose");
const { encryptDeterministic } = require("./server/src/utils/encryption.js");

// --- Helpers ---
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (!condition) { console.error(`[FAIL] ${label}`); failed++; }
  else { console.log(`[PASS] ${label}`); passed++; }
}

function normalizeEmail(email) {
  if (!email || typeof email !== "string") throw new Error("invalid email input");
  return email.toLowerCase().trim();
}

async function findByEncryptedEmail(collection, email) {
  const encrypted = encryptDeterministic(normalizeEmail(email));
  return collection.findOne({ email: encrypted });
}

async function runTests() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("[db] connected");

  const users = mongoose.connection.collection("users");

  // 1. Deterministic — same input = same ciphertext
  const enc1 = encryptDeterministic(normalizeEmail("testauth4@gmail.com"));
  const enc2 = encryptDeterministic(normalizeEmail("testauth4@gmail.com"));
  assert(enc1 === enc2, "deterministic: same input = same ciphertext");

  // 2. Different emails = different ciphertext
  const enc3 = encryptDeterministic(normalizeEmail("other@gmail.com"));
  assert(enc1 !== enc3, "deterministic: different input = different ciphertext");

  // 3. Case/whitespace normalization
  const encLower = encryptDeterministic(normalizeEmail("TestAuth4@Gmail.com"));
  assert(encLower === enc1, "normalization: uppercase matches lowercase encrypted");

  // 4. Whitespace trimming
  const encTrimmed = encryptDeterministic(normalizeEmail("  testauth4@gmail.com  "));
  assert(encTrimmed === enc1, "normalization: whitespace trimmed before encrypt");

  // 5. Ciphertext not plaintext
  assert(!enc1.includes("testauth4@gmail.com"), "plaintext not in ciphertext");

  // 6. Ciphertext is string
  assert(typeof enc1 === "string" && enc1.length > 0, "ciphertext is non-empty string");

  // 7. Query DB with encrypted email
  const rawUser = await findByEncryptedEmail(users, "testauth4@gmail.com");
  console.log(`[debug] user found in DB: ${!!rawUser}`);
  assert(rawUser !== null, "DB query: user found by encrypted email");

  // 8. Wrong email returns null
  const wrongUser = await findByEncryptedEmail(users, "nonexistent@gmail.com");
  assert(wrongUser === null, "DB query: wrong email returns null");

  // 9. Plaintext email NOT findable
  const plainUser = await users.findOne({ email: "testauth4@gmail.com" });
  assert(plainUser === null, "DB at-rest: plaintext email not stored");

  // 10. Multiple users don't collide
  const encA = encryptDeterministic(normalizeEmail("usera@gmail.com"));
  const encB = encryptDeterministic(normalizeEmail("userb@gmail.com"));
  assert(encA !== encB, "no collision: different users encrypt differently");

  // 11. Empty string throws
  try {
    normalizeEmail("");
    assert(false, "empty email should throw");
  } catch {
    assert(true, "empty email throws correctly");
  }

  // 12. Null throws
  try {
    normalizeEmail(null);
    assert(false, "null email should throw");
  } catch {
    assert(true, "null email throws correctly");
  }

  // 13. Number input throws
  try {
    normalizeEmail(12345);
    assert(false, "number input should throw");
  } catch {
    assert(true, "number input throws correctly");
  }

  // 14. Object input throws
  try {
    normalizeEmail({});
    assert(false, "object input should throw");
  } catch {
    assert(true, "object input throws correctly");
  }

  await mongoose.disconnect();

  console.log(`\n[done] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

runTests().catch((err) => {
  console.error("[error]", err.message);
  process.exit(1);
});