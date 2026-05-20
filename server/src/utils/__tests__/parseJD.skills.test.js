import assert from "node:assert/strict";
import test from "node:test";

import { extractDataFromJD, hasSkillToken } from "../parseJD.js";

test("hasSkillToken matches punctuation-heavy technical skills", () => {
  assert.equal(hasSkillToken("Experience with Node.js, Express, and C#.", "node.js"), true);
  assert.equal(hasSkillToken("Experience with Node.js, Express, and C#.", "c#"), true);
});

test("hasSkillToken rejects embedded word matches", () => {
  assert.equal(hasSkillToken("Build reactive interfaces.", "react"), false);
  assert.equal(hasSkillToken("JavaScript experience required.", "java"), false);
});

test("extractDataFromJD extracts special-character skills", () => {
  const result = extractDataFromJD(
    "We need 3-5 years of experience with Node.js, Express, C#, and JavaScript."
  );

  assert.ok(result.skills.includes("node.js"));
  assert.ok(result.skills.includes("express"));
  assert.ok(result.skills.includes("c#"));
  assert.ok(result.skills.includes("javascript"));
  assert.equal(result.skills.includes("java"), false);
  assert.equal(result.yearsOfExperience > 0, true);
});
