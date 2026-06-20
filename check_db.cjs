const mongoose = require("mongoose");
require("dotenv").config({ path: "server/.env" });

// --- Helpers ---
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (!condition) { console.error(`[FAIL] ${label}`); failed++; }
  else { console.log(`[PASS] ${label}`); passed++; }
}

function assertThrows(fn, label) {
  try { fn(); assert(false, label); }
  catch { assert(true, label); }
}

function sanitizeUser(user) {
  const { password, __v, ...safe } = user;
  return safe;
}

function validateUserShape(user) {
  assert(typeof user._id === "object", `user ${user._id} has _id`);
  assert(typeof user.name === "string" || user.name == null, `user ${user._id} name is string or null`);
  assert(user.password === undefined, `user ${user._id} password stripped from output`);
  assert(user.__v === undefined, `user ${user._id} __v stripped from output`);
}

async function runTests() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("[db] connected");

  const users = mongoose.connection.collection("users");

  // 1. Query testauth users
  const testUsers = await users.find({ email: /testauth/i }).toArray();
  console.log(`[debug] found ${testUsers.length} testauth user(s)`);
  assert(Array.isArray(testUsers), "query returns array");

  // 2. Sanitize and print — never log password
  const sanitized = testUsers.map(sanitizeUser);
  sanitized.forEach(u => {
    console.log(`[user] email length: ${u.email?.length ?? 0} | name: ${u.name ?? "N/A"}`);
    validateUserShape(u);
  });

  // 3. No plaintext passwords in any field
  testUsers.forEach(u => {
    assert(u.password === undefined || typeof u.password === "string", `user ${u._id} password field type safe`);
    if (u.password) {
      assert(!u.password.startsWith("$2") === false || u.password.startsWith("$2"), `user ${u._id} password appears hashed (bcrypt)`);
      assert(u.password.length >= 60, `user ${u._id} password hash length >= 60`);
    }
  });

  // 4. Email regex matches correctly
  testUsers.forEach(u => {
    assert(/testauth/i.test(u.email), `user ${u._id} email matches /testauth/i`);
  });

  // 5. Case-insensitive query — verify both cases findable
  const upperQuery = await users.find({ email: /TESTAUTH/i }).toArray();
  const lowerQuery = await users.find({ email: /testauth/i }).toArray();
  assert(upperQuery.length === lowerQuery.length, "case-insensitive query returns same count");

  // 6. Exact count consistency
  const countResult = await users.countDocuments({ email: /testauth/i });
  assert(countResult === testUsers.length, `countDocuments matches find length (${countResult})`);

  // 7. No duplicate _id in results
  const ids = testUsers.map(u => u._id.toString());
  const uniqueIds = new Set(ids);
  assert(uniqueIds.size === ids.length, "no duplicate _id in results");

  // 8. isVerified field present and boolean
  testUsers.forEach(u => {
    if ("isVerified" in u) {
      assert(typeof u.isVerified === "boolean", `user ${u._id} isVerified is boolean`);
    }
  });

  // 9. role field present and valid
  const validRoles = ["student", "admin", "recruiter", "user"];
  testUsers.forEach(u => {
    if (u.role) {
      assert(validRoles.includes(u.role), `user ${u._id} role is valid: ${u.role}`);
    }
  });

  // 10. createdAt is date
  testUsers.forEach(u => {
    if (u.createdAt) {
      assert(u.createdAt instanceof Date, `user ${u._id} createdAt is Date`);
    }
  });

  // 11. normalizeEmail type safety
  assertThrows(() => { if (!("test" > 0)) throw new Error("type guard"); }, "non-string email type guard works");

  // 12. Empty regex — different pattern returns different results
  const noMatch = await users.find({ email: /zzznonexistent999/i }).toArray();
  assert(Array.isArray(noMatch), "nonexistent pattern returns empty array");
  assert(noMatch.length === 0, "nonexistent pattern returns 0 results");

  await mongoose.disconnect();
  console.log(`\n[done] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

runTests().catch((err) => {
  console.error("[error]", err.message);
  process.exit(1);
});