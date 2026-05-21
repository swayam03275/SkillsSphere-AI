import assert from "node:assert/strict";
import test from "node:test";
import { normalizeResumeData, normalizePipelineResult } from "../normalizeResumeResponse.js";

test("normalizeResumeData - applies safe default objects when empty or null", () => {
  const result = normalizeResumeData();

  assert.equal(result.name, "");
  assert.equal(result.email, null);
  assert.equal(result.phone, null);
  assert.deepEqual(result.skills, []);
  assert.deepEqual(result.education, []);
  assert.deepEqual(result.experience, []);
  assert.deepEqual(result.projects, []);
  assert.deepEqual(result.certifications, []);
  assert.equal(result.linkedin, null);
  assert.equal(result.github, null);
  assert.equal(result.portfolio, null);
  assert.deepEqual(result.keywords, []);
  assert.equal(result.extractedTextLength, 0);
  assert.equal(result.resumeText, "");
});

test("normalizeResumeData - preserves valid fields", () => {
  const customData = {
    name: "John Doe",
    email: "john@example.com",
    skills: ["Javascript", "Node.js"],
    extractedTextLength: 1200,
    github: "https://github.com/johndoe",
  };

  const result = normalizeResumeData(customData);

  assert.equal(result.name, "John Doe");
  assert.equal(result.email, "john@example.com");
  assert.deepEqual(result.skills, ["Javascript", "Node.js"]);
  assert.equal(result.extractedTextLength, 1200);
  assert.equal(result.github, "https://github.com/johndoe");
});

test("normalizePipelineResult - applies defaults", () => {
  const result = normalizePipelineResult();

  assert.equal(result.score, 0);
  assert.deepEqual(result.breakdown, {});
  assert.deepEqual(result.skillMatch, {});
  assert.deepEqual(result.gapAnalysis, {});
  assert.equal(result.isJDProvided, false);
  assert.equal(result.mode, "match");
});

test("normalizePipelineResult - preserves custom valid fields", () => {
  const mockResult = {
    score: 85,
    breakdown: { readability: 90, experience: 80 },
    skillMatch: { matched: ["react"] },
    isJDProvided: true,
    mode: "benchmark",
  };

  const result = normalizePipelineResult(mockResult);

  assert.equal(result.score, 85);
  assert.deepEqual(result.breakdown, { readability: 90, experience: 80 });
  assert.deepEqual(result.skillMatch, { matched: ["react"] });
  assert.equal(result.isJDProvided, true);
  assert.equal(result.mode, "benchmark");
});
