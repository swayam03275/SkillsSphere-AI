import test from "node:test";
import assert from "node:assert/strict";
import { classifyResume } from "../resumeClassifier.js";

test("classifyResume - Beginner for score below 40", () => {
  const result = classifyResume({ score: 30 });
  assert.equal(result.level, "Beginner");
  assert.equal(result.label, "Low Profile Strength");
  assert.equal(result.color, "red");
});

test("classifyResume - Intermediate for score 40-69", () => {
  const result = classifyResume({ score: 55 });
  assert.equal(result.level, "Intermediate");
  assert.equal(result.label, "Moderate Profile Strength");
  assert.equal(result.color, "yellow");
});

test("classifyResume - Advanced for score 70-84", () => {
  const result = classifyResume({ score: 75 });
  assert.equal(result.level, "Advanced");
  assert.equal(result.label, "Strong Profile");
  assert.equal(result.color, "blue");
});

test("classifyResume - Strong Match for score 85 and above", () => {
  const result = classifyResume({ score: 90 });
  assert.equal(result.level, "Strong Match");
  assert.equal(result.label, "Highly Suitable Candidate");
  assert.equal(result.color, "green");
});

test("classifyResume - skillScore >= 90 adds Exceptional Skills highlight", () => {
  const result = classifyResume({ score: 55, skillMatch: { score: 92 } });
  assert.ok(result.label.includes("Exceptional Skills"));
});

test("classifyResume - skillScore >= 70 and < 90 adds Solid Skill Match highlight", () => {
  const result = classifyResume({ score: 55, skillMatch: { score: 75 } });
  assert.ok(result.label.includes("Solid Skill Match"));
});

test("classifyResume - skillScore < 30 adds Skill Gaps Noted highlight", () => {
  const result = classifyResume({ score: 55, skillMatch: { score: 25 } });
  assert.ok(result.label.includes("Skill Gaps Noted"));
});

test("classifyResume - experienceScore >= 90 adds Deep Experience highlight", () => {
  const result = classifyResume({ score: 55, experienceMatch: { score: 95 } });
  assert.ok(result.label.includes("Deep Experience"));
});

test("classifyResume - experienceScore >= 70 and < 90 adds Relevant Background highlight", () => {
  const result = classifyResume({ score: 55, experienceMatch: { score: 80 } });
  assert.ok(result.label.includes("Relevant Background"));
});

test("classifyResume - experienceScore < 30 adds Experience Mismatch highlight", () => {
  const result = classifyResume({ score: 55, experienceMatch: { score: 20 } });
  assert.ok(result.label.includes("Experience Mismatch"));
});

test("classifyResume - label includes highlights when available", () => {
  const result = classifyResume({
    score: 50,
    skillMatch: { score: 95 },
    experienceMatch: { score: 20 },
  });
  assert.ok(result.label.includes("Exceptional Skills"));
  assert.ok(result.label.includes("Experience Mismatch"));
  assert.ok(result.label.includes("Moderate Profile Strength"));
});

test("classifyResume - undefined skillMatch does not add highlights", () => {
  const result = classifyResume({ score: 50, skillMatch: undefined });
  assert.equal(result.level, "Intermediate");
  assert.ok(!result.label.includes("Skill"));
});

test("classifyResume - null score values are handled gracefully", () => {
  const result = classifyResume({ score: 50, skillMatch: { score: null } });
  assert.equal(result.level, "Intermediate");
  assert.ok(!result.label.includes("Skill"));
});

test("classifyResume - no skillMatch or experienceMatch still returns valid result", () => {
  const result = classifyResume({ score: 65 });
  assert.equal(result.level, "Intermediate");
  assert.ok(result.label.includes("Moderate Profile Strength"));
  assert.equal(result.color, "yellow");
});

test("classifyResume - score boundary at 40", () => {
  const below = classifyResume({ score: 39 });
  assert.equal(below.level, "Beginner");
  const at = classifyResume({ score: 40 });
  assert.equal(at.level, "Intermediate");
});

test("classifyResume - score boundary at 70", () => {
  const below = classifyResume({ score: 69 });
  assert.equal(below.level, "Intermediate");
  const at = classifyResume({ score: 70 });
  assert.equal(at.level, "Advanced");
});

test("classifyResume - score boundary at 85", () => {
  const below = classifyResume({ score: 84 });
  assert.equal(below.level, "Advanced");
  const at = classifyResume({ score: 85 });
  assert.equal(at.level, "Strong Match");
});
