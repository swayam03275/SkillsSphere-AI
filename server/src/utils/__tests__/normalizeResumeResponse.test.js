import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeResumeData,
  normalizePipelineResult,
} from "../normalizeResumeResponse.js";

test("normalizeResumeData returns all fields when fully populated", () => {
  const input = {
    name: "Alice",
    email: "alice@example.com",
    phone: "+1234567890",
    skills: ["JavaScript", "Python"],
    education: [{ degree: "BSc" }],
    experience: [{ title: "Engineer" }],
    projects: [{ name: "App" }],
    certifications: ["AWS"],
    linkedin: "https://linkedin.com/in/alice",
    github: "https://github.com/alice",
    portfolio: "https://alice.dev",
    keywords: ["react"],
    extractedTextLength: 500,
    resumeText: "Sample resume text",
  };

  const result = normalizeResumeData(input);
  assert.equal(result.name, "Alice");
  assert.equal(result.email, "alice@example.com");
  assert.equal(result.phone, "+1234567890");
  assert.deepEqual(result.skills, ["JavaScript", "Python"]);
  assert.deepEqual(result.education, [{ degree: "BSc" }]);
  assert.deepEqual(result.experience, [{ title: "Engineer" }]);
  assert.deepEqual(result.projects, [{ name: "App" }]);
  assert.deepEqual(result.certifications, ["AWS"]);
  assert.equal(result.linkedin, "https://linkedin.com/in/alice");
  assert.equal(result.github, "https://github.com/alice");
  assert.equal(result.portfolio, "https://alice.dev");
  assert.deepEqual(result.keywords, ["react"]);
  assert.equal(result.extractedTextLength, 500);
  assert.equal(result.resumeText, "Sample resume text");
});

test("normalizeResumeData applies defaults for missing fields", () => {
  const result = normalizeResumeData({});
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

test("normalizeResumeData coerces non-array fields to arrays", () => {
  const result = normalizeResumeData({
    skills: "not an array",
    education: null,
    experience: undefined,
  });
  // Non-array skills is normalized to empty array (expected behavior)
  assert.deepEqual(result.skills, []);
  assert.deepEqual(result.education, []);
  assert.deepEqual(result.experience, []);
});

test("normalizeResumeData handles undefined input gracefully", () => {
  const result = normalizeResumeData(undefined);
  assert.equal(result.name, "");
  assert.deepEqual(result.skills, []);
  assert.equal(result.resumeText, "");
});

test("normalizePipelineResult returns normalized score and breakdown", () => {
  const input = {
    score: 85,
    breakdown: { readability: 90, impact: 80 },
    skillMatch: { score: 85 },
    keywordMatch: { score: 75 },
    experienceMatch: { score: 95 },
    consistencyMatch: { score: 88 },
    readabilityMatch: { score: 90 },
    impactMatch: { score: 80 },
    atsOptimization: { score: 70 },
    techStandard: { score: 75 },
    gapAnalysis: { suggestions: [] },
    isJDProvided: true,
    mode: "match",
  };

  const result = normalizePipelineResult(input);
  assert.equal(result.score, 85);
  assert.deepEqual(result.breakdown, { readability: 90, impact: 80 });
  assert.equal(result.skillMatch.score, 85);
  assert.equal(result.isJDProvided, true);
  assert.equal(result.mode, "match");
});

test("normalizePipelineResult applies defaults for missing numeric score", () => {
  const result = normalizePipelineResult({});
  assert.equal(result.score, 0);
  assert.deepEqual(result.breakdown, {});
  assert.deepEqual(result.skillMatch, {});
  assert.deepEqual(result.experienceMatch, {});
});

test("normalizePipelineResult coerces non-object sub-fields to empty objects", () => {
  const input = {
    breakdown: "not an object",
    skillMatch: null,
    experienceMatch: undefined,
  };
  const result = normalizePipelineResult(input);
  assert.deepEqual(result.breakdown, {});
  assert.deepEqual(result.skillMatch, {});
  assert.deepEqual(result.experienceMatch, {});
});

test("normalizePipelineResult handles classification field correctly", () => {
  const withClassification = {
    classification: { level: "Senior", score: 95 },
  };
  const result = normalizePipelineResult(withClassification);
  assert.deepEqual(result.classification, { level: "Senior", score: 95 });

  const withoutClassification = {};
  const result2 = normalizePipelineResult(withoutClassification);
  assert.equal(result2.classification, null);
});

test("normalizePipelineResult defaults mode to match", () => {
  const result = normalizePipelineResult({});
  assert.equal(result.mode, "match");
});

test("normalizePipelineResult normalizes isJDProvided to boolean", () => {
  const result1 = normalizePipelineResult({ isJDProvided: true });
  assert.equal(result1.isJDProvided, true);

  const result2 = normalizePipelineResult({ isJDProvided: false });
  assert.equal(result2.isJDProvided, false);
});
