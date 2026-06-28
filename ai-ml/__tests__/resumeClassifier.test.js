import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyResume } from "../utils/resumeClassifier.js";

describe("classifyResume", () => {
  it("returns Beginner for score below 40", () => {
    const result = classifyResume({ score: 30, skillMatch: {}, experienceMatch: {} });
    assert.strictEqual(result.level, "Beginner");
    assert.strictEqual(result.label, "Low Profile Strength");
    assert.strictEqual(result.color, "red");
  });

  it("returns Intermediate for score 40-69", () => {
    const result = classifyResume({ score: 55, skillMatch: {}, experienceMatch: {} });
    assert.strictEqual(result.level, "Intermediate");
    assert.strictEqual(result.label, "Moderate Profile Strength");
    assert.strictEqual(result.color, "yellow");
  });

  it("returns Advanced for score 70-84", () => {
    const result = classifyResume({ score: 78, skillMatch: {}, experienceMatch: {} });
    assert.strictEqual(result.level, "Advanced");
    assert.strictEqual(result.label, "Strong Profile");
    assert.strictEqual(result.color, "blue");
  });

  it("returns Strong Match for score 85 and above", () => {
    const result = classifyResume({ score: 92, skillMatch: {}, experienceMatch: {} });
    assert.strictEqual(result.level, "Strong Match");
    assert.strictEqual(result.label, "Highly Suitable Candidate");
    assert.strictEqual(result.color, "green");
  });

  it("handles score exactly at boundary 40", () => {
    const result = classifyResume({ score: 40, skillMatch: {}, experienceMatch: {} });
    assert.strictEqual(result.level, "Intermediate");
  });

  it("handles score exactly at boundary 70", () => {
    const result = classifyResume({ score: 70, skillMatch: {}, experienceMatch: {} });
    assert.strictEqual(result.level, "Advanced");
  });

  it("handles score exactly at boundary 85", () => {
    const result = classifyResume({ score: 85, skillMatch: {}, experienceMatch: {} });
    assert.strictEqual(result.level, "Strong Match");
  });

  it("adds Exceptional Skills highlight when skillMatch score >= 90", () => {
    const result = classifyResume({ score: 50, skillMatch: { score: 95 }, experienceMatch: {} });
    assert.ok(result.label.includes("Exceptional Skills"));
  });

  it("adds Solid Skill Match highlight when skillMatch score 70-89", () => {
    const result = classifyResume({ score: 50, skillMatch: { score: 75 }, experienceMatch: {} });
    assert.ok(result.label.includes("Solid Skill Match"));
  });

  it("adds Skill Gaps Noted when skillMatch score < 30", () => {
    const result = classifyResume({ score: 50, skillMatch: { score: 20 }, experienceMatch: {} });
    assert.ok(result.label.includes("Skill Gaps Noted"));
  });

  it("adds Deep Experience highlight when experienceMatch score >= 90", () => {
    const result = classifyResume({ score: 50, skillMatch: {}, experienceMatch: { score: 92 } });
    assert.ok(result.label.includes("Deep Experience"));
  });

  it("adds Relevant Background highlight when experienceMatch score 70-89", () => {
    const result = classifyResume({ score: 50, skillMatch: {}, experienceMatch: { score: 78 } });
    assert.ok(result.label.includes("Relevant Background"));
  });

  it("adds Experience Mismatch when experienceMatch score < 30", () => {
    const result = classifyResume({ score: 50, skillMatch: {}, experienceMatch: { score: 15 } });
    assert.ok(result.label.includes("Experience Mismatch"));
  });

  it("does not add highlights when skillMatch score is null", () => {
    const result = classifyResume({ score: 50, skillMatch: { score: null }, experienceMatch: {} });
    assert.ok(!result.label.includes("Skill"));
  });

  it("does not add highlights when skillMatch score is undefined", () => {
    const result = classifyResume({ score: 50, skillMatch: {}, experienceMatch: {} });
    assert.ok(!result.label.includes("Skill"));
  });

  it("returns correct shape with all fields present", () => {
    const result = classifyResume({ score: 88, skillMatch: { score: 85 }, experienceMatch: { score: 80 } });
    assert.ok("level" in result);
    assert.ok("label" in result);
    assert.ok("color" in result);
    assert.strictEqual(result.color, "green");
  });
});
