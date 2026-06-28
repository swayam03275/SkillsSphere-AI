import { describe, it } from "node:test";
import assert from "node:assert/strict";
import gapAnalyzer from "../utils/gapAnalyzer.js";

describe("gapAnalyzer", () => {
  it("returns suggestions array", () => {
    const result = gapAnalyzer({});
    assert.ok(Array.isArray(result.suggestions));
  });

  it("returns up to 6 suggestions", () => {
    const result = gapAnalyzer({
      skillMatch: { score: 50, details: { missingSkills: ["js", "python", "react"] } },
      keywordMatch: { score: 50, details: { missingKeywords: ["api", "sql"] } },
      experienceMatch: { score: 40 },
      consistencyMatch: { score: 60 },
      readabilityMatch: { score: 70 },
      impactMatch: { score: 40 },
      atsOptimization: { score: 60, details: { sectionResults: { Experience: false }, contactResults: { email: false } } },
      techStandard: { score: 40, details: {} },
      resumeText: "react javascript frontend",
      isJDProvided: true,
    });
    assert.ok(result.suggestions.length <= 6, "suggestions should be capped at 6");
  });

  it("adds critical suggestion when atsOptimization score < 80", () => {
    const result = gapAnalyzer({
      atsOptimization: { score: 50, details: { sectionResults: { Experience: false }, contactResults: {} } },
    });
    assert.ok(
      result.suggestions.some((s) => s.priority === "Critical"),
      "should have a Critical priority suggestion"
    );
  });

  it("adds optimization suggestion when atsOptimization score >= 80 and < 100", () => {
    const result = gapAnalyzer({
      atsOptimization: { score: 85, details: { sectionResults: {}, contactResults: {} } },
      skillMatch: {},
      keywordMatch: {},
      experienceMatch: {},
      consistencyMatch: {},
      readabilityMatch: {},
      impactMatch: { score: 80 },
      techStandard: { score: 90, details: {} },
      resumeText: "",
    });
    assert.ok(
      result.suggestions.some((s) => s.priority === "Optimization"),
      "should have an Optimization priority suggestion for ATS"
    );
  });

  it("adds strategic suggestion when isJDProvided and skillMatch score < 100", () => {
    const result = gapAnalyzer({
      skillMatch: { score: 60, details: { missingSkills: ["nodejs"] } },
      isJDProvided: true,
    });
    assert.ok(
      result.suggestions.some((s) => s.priority === "Strategic"),
      "should have a Strategic priority suggestion when JD is provided"
    );
  });

  it("adds contribution milestone suggestions", () => {
    const result = gapAnalyzer({
      atsOptimization: { score: 95, details: { sectionResults: {}, contactResults: {} } },
      skillMatch: { score: 95 },
      keywordMatch: { score: 95 },
      experienceMatch: {},
      consistencyMatch: {},
      readabilityMatch: { details: {} },
      impactMatch: { score: 80 },
      techStandard: { score: 90, details: {} },
      resumeText: "react javascript developer",
      isJDProvided: false,
    });
    assert.ok(
      result.suggestions.some((s) => s.priority === "Contribution"),
      "should have a Contribution milestone suggestion"
    );
  });

  it("handles missing atsOptimization details gracefully", () => {
    const result = gapAnalyzer({ atsOptimization: { score: 50 } });
    assert.ok(Array.isArray(result.suggestions));
  });

  it("adds Polish suggestion when suggestions < 4 and resume is short", () => {
    const result = gapAnalyzer({
      atsOptimization: { score: 95, details: { sectionResults: {}, contactResults: {} } },
      skillMatch: { score: 95 },
      keywordMatch: { score: 95 },
      experienceMatch: {},
      consistencyMatch: {},
      readabilityMatch: { details: { passiveVoiceCount: 0 } },
      impactMatch: { score: 80 },
      techStandard: { score: 90, details: {} },
      resumeText: "js react",
      isJDProvided: false,
    });
    assert.ok(
      result.suggestions.length >= 1,
      "should have at least one suggestion including Polish"
    );
  });
});
