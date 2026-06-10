import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "../User.js";
import Resume from "../Resume.js";

// Make sure we have the encryption key set for testing (so it doesn't throw)
process.env.ENCRYPTION_KEY = "fallback-test-encryption-key-32-characters";

test("User/Resume Encryption & Lean Query Decryption", async (t) => {
  // Set up in-memory mongodb connection
  const mongoServer = await MongoMemoryServer.create({
    instance: {
      startupTimeout: 60000,
    }
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Clean up database at the end
  t.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  await t.test("User.updateMany() & User.deleteMany() transparently encrypt email in filter", async () => {
    // 1. Create a user
    const user = new User({
      name: "Alice Smith",
      email: "alice@example.com",
      role: "student",
    });
    await user.save();

    // Verify it is stored encrypted in the database by querying raw MongoDB driver (which bypasses mongoose hooks)
    const rawUser = await mongoose.connection.db.collection("users").findOne({ _id: user._id });
    assert.ok(rawUser.email.startsWith("v1:cbc:"));
    assert.ok(rawUser.name.startsWith("v1:gcm:"));

    // 2. Perform updateMany using a query on plaintext email
    const updateResult = await User.updateMany(
      { email: "alice@example.com" },
      { $set: { proFeatures: true } }
    );
    // If hooks failed, this would match 0 documents.
    assert.equal(updateResult.matchedCount, 1);

    // Verify updated value
    const updatedUser = await User.findById(user._id);
    assert.equal(updatedUser.proFeatures, true);

    // 3. Perform deleteMany using a query on plaintext email
    const deleteResult = await User.deleteMany({ email: "alice@example.com" });
    assert.equal(deleteResult.deletedCount, 1);
  });

  await t.test("User/Resume .lean() queries return plaintext instead of ciphertext", async () => {
    // 1. Recreate User
    const user = new User({
      name: "Bob Jones",
      email: "bob@example.com",
      role: "student",
    });
    await user.save();

    // Create Resume associated with user
    const resume = new Resume({
      user: user._id,
      name: "Bob Jones",
      email: "bob@example.com",
      phone: "+1234567890",
      education: [{ school: "State University", degree: "BS CS" }],
      experience: [{ company: "Tech Inc", role: "Software Engineer" }],
      projects: [{ name: "SkillsSphere", description: "AI Platform" }],
      certifications: ["AWS Certified"],
      linkedin: "https://linkedin.com/in/bobjones",
      github: "https://github.com/bobjones",
      portfolio: "https://bobjones.dev",
      resumeText: "Resume text content for testing ATS evaluator...",
    });
    await resume.save();

    // 2. Query User using .lean()
    const leanUser = await User.findById(user._id).lean();
    assert.equal(leanUser.name, "Bob Jones");
    assert.equal(leanUser.email, "bob@example.com");

    // 3. Query Resume using .lean()
    const leanResume = await Resume.findById(resume._id).select("+resumeText").lean();
    assert.equal(leanResume.name, "Bob Jones");
    assert.equal(leanResume.email, "bob@example.com");
    assert.equal(leanResume.phone, "+1234567890");
    assert.deepEqual(leanResume.education, [{ school: "State University", degree: "BS CS" }]);
    assert.deepEqual(leanResume.experience, [{ company: "Tech Inc", role: "Software Engineer" }]);
    assert.deepEqual(leanResume.projects, [{ name: "SkillsSphere", description: "AI Platform" }]);
    assert.deepEqual(leanResume.certifications, ["AWS Certified"]);
    assert.equal(leanResume.linkedin, "https://linkedin.com/in/bobjones");
    assert.equal(leanResume.github, "https://github.com/bobjones");
    assert.equal(leanResume.portfolio, "https://bobjones.dev");
    assert.equal(leanResume.resumeText, "Resume text content for testing ATS evaluator...");
  });
});
