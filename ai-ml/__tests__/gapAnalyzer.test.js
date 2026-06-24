import { describe, it } from "node:test";
import assert from "node:assert/strict";

import gapAnalyzer from "../utils/gapAnalyzer.js";

describe("gapAnalyzer", () => {
  it("returns an object with suggestions array", () => {
    const result = gapAnalyzer({});
    assert.ok(result);
    assert.ok(Array.isArray(result.suggestions));
  });

  it("returns suggestions with priority, text, icon, and type fields", () => {
    const result = gapAnalyzer({});
    assert.ok(result.suggestions.length > 0);
    const suggestion = result.suggestions[0];
    assert.ok("priority" in suggestion);
    assert.ok("text" in suggestion);
    assert.ok("icon" in suggestion);
    assert.ok("type" in suggestion);
  });

  it("adds Critical priority suggestion when ATS score is below 80 and sections are missing", () => {
    const result = gapAnalyzer({
      atsOptimization: { score: 70, details: { sectionResults: { summary: false, experience: false } } },
    });
    assert.ok(result.suggestions.some(s => s.priority === "Critical" && s.text.includes("summary")));
  });

  it("adds Critical priority suggestion for missing contact fields", () => {
    const result = gapAnalyzer({
      atsOptimization: { score: 70, details: { contactResults: { email: false, phone: false } } },
    });
    assert.ok(result.suggestions.some(s => s.priority === "Critical" && s.text.includes("email")));
  });

  it("adds Optimization suggestions when ATS score is between 80 and 100", () => {
    const result = gapAnalyzer({
      atsOptimization: { score: 95, details: {} },
    });
    assert.ok(result.suggestions.some(s => s.priority === "Optimization"));
  });

  it("adds Strategic suggestions for missing skills when JD is provided", () => {
    const result = gapAnalyzer({
      isJDProvided: true,
      skillMatch: { score: 70, details: { missingSkills: ["React", "Node.js"] } },
    });
    assert.ok(result.suggestions.some(s => s.priority === "Strategic" && (s.text.includes("React") || s.text.includes("technical gap"))));
  });

  it("does not add skill advice when isJDProvided is false", () => {
    const result = gapAnalyzer({
      isJDProvided: false,
      skillMatch: { score: 50, details: { missingSkills: ["React"] } },
    });
    assert.strictEqual(
      result.suggestions.filter(s => s.priority === "Strategic" && s.text.includes("React")).length,
      0
    );
  });

  it("adds Optimization advice for low impact score", () => {
    const result = gapAnalyzer({ impactMatch: { score: 30 } });
    assert.ok(result.suggestions.some(s => s.priority === "Optimization" && (s.text.includes("XYZ") || s.text.includes("result-oriented"))));
  });

  it("adds Contribution suggestions based on resume text keywords", () => {
    const result = gapAnalyzer({ resumeText: "Experience with React and Node.js" });
    assert.ok(result.suggestions.some(s => s.priority === "Contribution" && s.text.includes("open-source")));
  });

  it("limits suggestions to at most 6 items", () => {
    const result = gapAnalyzer({});
    assert.ok(result.suggestions.length <= 6);
  });

  it("handles empty/null optional fields gracefully", () => {
    const result = gapAnalyzer({ resumeText: "", atsOptimization: null, skillMatch: null });
    assert.ok(result.suggestions);
  });
});
