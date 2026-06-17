require("dotenv").config({ path: "server/.env" });
const mongoose = require("mongoose");
const { encryptDeterministic } = require("./server/src/utils/encryption.js");

// --- Helpers ---
function assert(condition, label) {
  if (!condition) { console.error(`[FAIL] ${label}`); process.exit(1); }
  console.log(`[PASS] ${label}`);
}

function normalizeEmail(email) {
  if (!email || typeof email !== "string") throw new Error("invalid email input");
  return email.toLowerCase().trim();
}

async function findByEncryptedEmail(collection, email) {
  const encrypted = encryptDeterministic(normalizeEmail(email));
  console.log(`[debug] encrypted email: ${encrypted}`);
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

  // 3. Case/whitespace normalization before encrypt
  const encLower = encryptDeterministic(normalizeEmail("TestAuth4@Gmail.com"));
  assert(encLower === enc1, "normalization: uppercase matches lowercase encrypted");

  // 4. Query DB with encrypted email
  const rawUser = await findByEncryptedEmail(users, "testauth4@gmail.com");
  console.log(`[debug] user found in DB: ${!!rawUser}`);
  assert(rawUser !== null, "DB query: user found by encrypted email");

  // 5. Wrong email returns null
  const wrongUser = await findByEncryptedEmail(users, "nonexistent@gmail.com");
  assert(wrongUser === null, "DB query: wrong email returns null");

  // 6. Plaintext email NOT findable (encryption working)
  const plainUser = await users.findOne({ email: "testauth4@gmail.com" });
  assert(plainUser === null, "DB at-rest: plaintext email not stored");

  // 7. Empty string throws
  try {
    normalizeEmail("");
    assert(false, "empty email should throw");
  } catch {
    assert(true, "empty email throws correctly");
  }

  // 8. Null input throws
  try {
    normalizeEmail(null);
    assert(false, "null email should throw");
  } catch {
    assert(true, "null email throws correctly");
  }

  await mongoose.disconnect();
  console.log("[done] all tests passed");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("[error]", err.message);
  process.exit(1);
});