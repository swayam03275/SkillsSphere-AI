import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeResumeData,
  normalizePipelineResult,
} from "../normalizeResumeResponse.js";

test("normalizePipelineResult returns score coerced to number", () => {
  const r1 = normalizePipelineResult({ score: "85" });
  assert.equal(r1.score, 0, "non-numeric string score should coerce to 0");

  const r2 = normalizePipelineResult({ score: 85 });
  assert.equal(r2.score, 85);

  const r3 = normalizePipelineResult({ score: null });
  assert.equal(r3.score, 0);

  const r4 = normalizePipelineResult({ score: undefined });
  assert.equal(r4.score, 0);
});

test("normalizePipelineResult defaults breakdown to empty object", () => {
  const r = normalizePipelineResult({});
  assert.deepEqual(r.breakdown, {});
  assert.equal(typeof r.breakdown, "object");
});

test("normalizePipelineResult normalizes all 10 match fields", () => {
  const r = normalizePipelineResult({
    skillMatch: null,
    keywordMatch: undefined,
    experienceMatch: "invalid",
    consistencyMatch: [],
    readabilityMatch: 123,
    impactMatch: NaN,
    atsOptimization: null,
    techStandard: undefined,
    gapAnalysis: false,
    classification: "Senior Engineer",
  });

  assert.deepEqual(r.skillMatch, {});
  assert.deepEqual(r.keywordMatch, {});
  assert.deepEqual(r.experienceMatch, {});
  // Arrays are objects in JS so they pass through as-is (not normalized to {})
  assert.deepEqual(r.consistencyMatch, []);
  assert.deepEqual(r.readabilityMatch, {});
  assert.deepEqual(r.impactMatch, {});
  assert.deepEqual(r.atsOptimization, {});
  assert.deepEqual(r.techStandard, {});
  assert.deepEqual(r.gapAnalysis, {});
  assert.equal(r.classification, "Senior Engineer", "string classification should pass through");
});

test("normalizePipelineResult preserves valid match objects", () => {
  const input = {
    skillMatch: { score: 90, details: { matched: ["React"] } },
    keywordMatch: { score: 80, missingKeywords: ["AWS"] },
    experienceMatch: { score: 70 },
  };

  const r = normalizePipelineResult(input);
  assert.equal(r.skillMatch.score, 90, "skillMatch score should be preserved");
  assert.equal(r.keywordMatch.score, 80, "keywordMatch score should be preserved");
  assert.equal(r.experienceMatch.score, 70, "experienceMatch score should be preserved");
  assert.equal(r.skillMatch.details?.matched?.[0], "React", "skillMatch.details should be spread in");
});

test("normalizePipelineResult defaults isJDProvided to false", () => {
  const r = normalizePipelineResult({});
  assert.equal(r.isJDProvided, false);
});

test("normalizePipelineResult defaults mode to 'match'", () => {
  const r1 = normalizePipelineResult({});
  assert.equal(r1.mode, "match");

  const r2 = normalizePipelineResult({ mode: "analyze" });
  assert.equal(r2.mode, "analyze");
});

test("normalizePipelineResult preserves non-object classification", () => {
  const r1 = normalizePipelineResult({ classification: { level: "Senior", score: 95 } });
  assert.deepEqual(r1.classification, { level: "Senior", score: 95 });

  const r2 = normalizePipelineResult({ classification: null });
  assert.equal(r2.classification, null);

  const r3 = normalizePipelineResult({ classification: undefined });
  assert.equal(r3.classification, null);
});

test("normalizePipelineResult handles fully populated input", () => {
  const input = {
    score: 82,
    breakdown: { total: 82 },
    skillMatch: { score: 90 },
    keywordMatch: { score: 85 },
    experienceMatch: { score: 75 },
    consistencyMatch: { score: 80 },
    readabilityMatch: { score: 70 },
    impactMatch: { score: 65 },
    atsOptimization: { score: 78 },
    techStandard: { score: 88 },
    gapAnalysis: { suggestions: [] },
    classification: { level: "Advanced" },
    isJDProvided: true,
    mode: "analyze",
  };

  const r = normalizePipelineResult(input);
  assert.equal(r.score, 82);
  assert.equal(r.isJDProvided, true);
  assert.equal(r.mode, "analyze");
  assert.equal(r.classification.level, "Advanced");
});

test("normalizePipelineResult handles empty input gracefully", () => {
  const r = normalizePipelineResult({});
  assert.equal(r.score, 0);
  assert.equal(r.isJDProvided, false);
  assert.equal(r.mode, "match");
  assert.deepEqual(r.breakdown, {});
  assert.deepEqual(r.skillMatch, {});
});

test("normalizeResumeData normalizes arrays and nulls", () => {
  const r = normalizeResumeData({
    name: "John Doe",
    email: "john@example.com",
    skills: ["React", "Node"],
    education: null,
    experience: undefined,
  });

  assert.equal(r.name, "John Doe");
  assert.equal(r.email, "john@example.com");
  assert.deepEqual(r.skills, ["React", "Node"]);
  assert.deepEqual(r.education, []);
  assert.deepEqual(r.experience, []);
  assert.deepEqual(r.projects, []);
  assert.deepEqual(r.certifications, []);
});

test("normalizeResumeData provides safe defaults for all fields", () => {
  const r = normalizeResumeData(null);
  assert.equal(r.name, "");
  assert.equal(r.email, null);
  assert.deepEqual(r.skills, []);
  assert.deepEqual(r.education, []);
  assert.deepEqual(r.experience, []);
  assert.deepEqual(r.projects, []);
  assert.deepEqual(r.certifications, []);
  assert.equal(r.linkedin, null);
  assert.equal(r.github, null);
  assert.equal(r.portfolio, null);
  assert.deepEqual(r.keywords, []);
  assert.equal(r.extractedTextLength, 0);
  assert.equal(r.resumeText, "");
});