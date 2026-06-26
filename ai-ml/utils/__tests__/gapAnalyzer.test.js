import test from "node:test";
import assert from "node:assert/strict";
import gapAnalyzer from "../gapAnalyzer.js";

test("gapAnalyzer returns a suggestions array", () => {
  const result = gapAnalyzer({});
  assert.ok(Array.isArray(result.suggestions));
});

test("returns suggestions capped at 6 items", () => {
  const result = gapAnalyzer({
    atsOptimization: { score: 50, details: { sectionResults: {}, contactResults: {} } },
    isJDProvided: true,
    skillMatch: { score: 50, missingSkills: ["react", "node", "python", "sql", "docker", "aws"] },
    keywordMatch: { score: 50, missingKeywords: ["api", "graphql", "microservices"] },
    impactMatch: { score: 40 },
    readabilityMatch: { details: {} },
    resumeText: "react developer with node experience",
  });
  assert.ok(result.suggestions.length <= 6);
});

test("adds critical suggestion when atsOptimization score is below 80", () => {
  const result = gapAnalyzer({
    atsOptimization: { score: 50, details: { sectionResults: { education: false }, contactResults: {} } },
    resumeText: "developer",
  });
  const critical = result.suggestions.filter((s) => s.priority === "Critical");
  assert.ok(critical.length > 0, "should have critical suggestions for low ATS score");
});

test("adds optimization suggestion when atsOptimization score is between 80 and 100", () => {
  const result = gapAnalyzer({
    atsOptimization: { score: 85, details: { sectionResults: {}, contactResults: {} } },
    resumeText: "developer",
  });
  const opt = result.suggestions.filter((s) => s.priority === "Optimization");
  assert.ok(opt.length > 0, "should have optimization suggestions for good ATS score");
});

test("does not add skillMatch strategic suggestions when isJDProvided is false", () => {
  const result = gapAnalyzer({
    atsOptimization: { score: 50, details: { sectionResults: {}, contactResults: {} } },
    isJDProvided: false,
    skillMatch: { score: 50, missingSkills: ["react"] },
    resumeText: "developer",
  });
  const strategic = result.suggestions.filter((s) => s.priority === "Strategic");
  const hasReactTip = strategic.some((s) => s.text.includes("react"));
  assert.equal(hasReactTip, false, "skill suggestions should not appear without JD");
});

test("adds strategic skill suggestions when isJDProvided is true", () => {
  const result = gapAnalyzer({
    atsOptimization: { score: 50, details: { sectionResults: {}, contactResults: {} } },
    isJDProvided: true,
    skillMatch: { score: 50, missingSkills: ["react", "node"] },
    resumeText: "developer",
  });
  const strategic = result.suggestions.filter((s) => s.priority === "Strategic");
  assert.ok(strategic.length > 0, "should have strategic suggestions with JD provided");
});

test("adds XYZ formula suggestion when impactMatch score is below 50", () => {
  const result = gapAnalyzer({
    atsOptimization: { score: 90, details: {} },
    impactMatch: { score: 40 },
    readabilityMatch: { details: {} },
    resumeText: "developer",
  });
  const opt = result.suggestions.filter((s) => s.priority === "Optimization");
  const hasXYZ = opt.some((s) => s.text.includes("XYZ"));
  assert.equal(hasXYZ, true, "should suggest XYZ formula for low impact score");
});

test("adds contribution suggestion based on resume field keywords", () => {
  const resultReact = gapAnalyzer({
    atsOptimization: { score: 90, details: {} },
    impactMatch: { score: 60 },
    readabilityMatch: { details: {} },
    resumeText: "I work with React and frontend development",
  });
  const hasReactContrib = resultReact.suggestions.some((s) =>
    s.text.toLowerCase().includes("react") || s.text.toLowerCase().includes("frontend")
  );

  const resultNode = gapAnalyzer({
    atsOptimization: { score: 90, details: {} },
    impactMatch: { score: 60 },
    readabilityMatch: { details: {} },
    resumeText: "backend developer with node and python",
  });
  const hasNodeContrib = resultNode.suggestions.some((s) =>
    s.text.toLowerCase().includes("backend") || s.text.toLowerCase().includes("repository")
  );

  assert.ok(hasReactContrib || hasNodeContrib, "should add field-specific contribution suggestions");
});

test("handles empty resumeText gracefully", () => {
  const result = gapAnalyzer({
    atsOptimization: { score: 90, details: {} },
    impactMatch: { score: 60 },
    readabilityMatch: { details: {} },
    resumeText: "",
  });
  assert.ok(Array.isArray(result.suggestions));
});

test("handles missing atsOptimization gracefully", () => {
  const result = gapAnalyzer({
    atsOptimization: undefined,
    impactMatch: { score: 60 },
    readabilityMatch: { details: {} },
    resumeText: "developer",
  });
  assert.ok(Array.isArray(result.suggestions));
});
