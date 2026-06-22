import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import gapAnalyzer from "../utils/gapAnalyzer.js";

// Helper to run the analyzer and get suggestions
const getSuggestions = (options = {}) =>
  gapAnalyzer({ isJDProvided: false, ...options }).suggestions;

const defaultOptions = () => ({
  isJDProvided: true,
  skillMatch: { score: 50, details: { missingSkills: ["react", "node"] } },
  keywordMatch: { score: 50, details: { missingKeywords: ["aws"] } },
  experienceMatch: { score: 70 },
  consistencyMatch: { score: 80 },
  readabilityMatch: { score: 90 },
  impactMatch: { score: 70 },
  atsOptimization: { score: 85 },
  techStandard: { score: 75, details: { domainMissing: {}, suggestions: [] } },
  resumeText: "Experienced software engineer with skills in JavaScript and Node.js.",
});

// =============================================
// 1. ATS CRITICAL GAPS
// =============================================
describe("ATS critical gaps", () => {
  it("adds critical suggestion when ATS score is below 80", () => {
    const opts = defaultOptions();
    opts.atsOptimization = { score: 60, details: { sectionResults: { Education: false }, contactResults: {} } };
    const result = gapAnalyzer(opts);
    const criticals = result.suggestions.filter((s) => s.priority === "Critical");
    assert.ok(criticals.length > 0, "Should have at least one critical suggestion");
    assert.ok(
      criticals.some((s) => s.text.toLowerCase().includes("ats") || s.text.toLowerCase().includes("header")),
      "Critical suggestion should mention ATS or headers"
    );
  });

  it("adds optimization suggestion when ATS score is 80-99", () => {
    const opts = defaultOptions();
    opts.atsOptimization = { score: 90, details: { sectionResults: {}, contactResults: {} } };
    const result = gapAnalyzer(opts);
    const opts_suggestions = result.suggestions.filter((s) => s.priority === "Optimization");
    assert.ok(opts_suggestions.length > 0, "Should have optimization suggestion for good ATS");
  });

  it("returns correct shape with suggestions array", () => {
    const result = gapAnalyzer(defaultOptions());
    assert.ok(Array.isArray(result.suggestions), "suggestions should be an array");
    assert.ok(result.suggestions.every((s) => typeof s.text === "string"), "each suggestion should have text");
    assert.ok(result.suggestions.every((s) => typeof s.priority === "string"), "each suggestion should have priority");
    assert.ok(result.suggestions.every((s) => typeof s.icon === "string"), "each suggestion should have icon");
  });
});

// =============================================
// 2. SKILL MATCH STRATEGIC SUGGESTIONS
// =============================================
describe("skill match strategic suggestions (JD provided)", () => {
  it("adds strategic skill suggestion when score < 100 and isJDProvided is true", () => {
    const opts = defaultOptions();
    opts.isJDProvided = true;
    opts.skillMatch = { score: 80, details: { missingSkills: ["docker", "kubernetes"] } };
    const result = gapAnalyzer(opts);
    const strategic = result.suggestions.filter((s) => s.priority === "Strategic");
    assert.ok(strategic.length > 0, "Should have strategic suggestions");
    assert.ok(
      strategic.some((s) => s.text.toLowerCase().includes("docker") || s.text.toLowerCase().includes("skill")),
      "Strategic suggestion should mention missing skills"
    );
  });

  it("does NOT mention specific missing skills when isJDProvided is false", () => {
    const opts = defaultOptions();
    opts.isJDProvided = false;
    opts.skillMatch = { score: 50, details: { missingSkills: ["react", "node"] } };
    // Ensure techStandard has no suggestions to avoid false positives
    opts.techStandard = { score: 90, details: { suggestions: [] } };
    const result = gapAnalyzer(opts);
    // When isJDProvided is false, skill gap suggestions should not appear
    const missingSkillMentions = result.suggestions.filter((s) =>
      s.text.toLowerCase().includes("react") || s.text.toLowerCase().includes("node")
    );
    assert.equal(missingSkillMentions.length, 0, "Should not mention missing skills when no JD provided");
  });
});

// =============================================
// 3. KEYWORD MATCH STRATEGIC SUGGESTIONS
// =============================================
describe("keyword match strategic suggestions", () => {
  it("adds keyword suggestion when score < 100 and isJDProvided is true", () => {
    const opts = defaultOptions();
    opts.isJDProvided = true;
    opts.keywordMatch = { score: 85, details: { missingKeywords: ["agile", "ci/cd"] } };
    const result = gapAnalyzer(opts);
    const strategic = result.suggestions.filter((s) => s.priority === "Strategic");
    assert.ok(strategic.some((s) => s.text.toLowerCase().includes("keyword") || s.text.toLowerCase().includes("agile")),
      "Should mention missing keywords");
  });
});

// =============================================
// 4. IMPACT OPTIMIZATION
// =============================================
describe("impact optimization", () => {
  it("suggests XYZ formula when impact score < 50", () => {
    const opts = defaultOptions();
    opts.impactMatch = { score: 30 };
    const result = gapAnalyzer(opts);
    const opt = result.suggestions.filter((s) => s.priority === "Optimization");
    assert.ok(opt.some((s) => s.text.toLowerCase().includes("xyz") || s.text.toLowerCase().includes("result")),
      "Should suggest result-oriented improvements");
  });

  it("acknowledges strong impact metrics when score >= 50", () => {
    const opts = defaultOptions();
    opts.impactMatch = { score: 75 };
    const result = gapAnalyzer(opts);
    const opt = result.suggestions.filter((s) => s.priority === "Optimization");
    assert.ok(opt.some((s) => s.text.toLowerCase().includes("impact") || s.text.toLowerCase().includes("metric")),
      "Should acknowledge strong impact");
  });
});

// =============================================
// 5. READABILITY OPTIMIZATION
// =============================================
describe("readability optimization", () => {
  it("suggests converting passive voice when passiveVoiceCount > 2", () => {
    const opts = defaultOptions();
    opts.readabilityMatch = { score: 60, details: { passiveVoiceCount: 5, relevantVerbs: ["was", "were"] } };
    const result = gapAnalyzer(opts);
    const opt = result.suggestions.filter((s) => s.priority === "Optimization");
    assert.ok(opt.length > 0, "Should suggest active voice");
  });
});

// =============================================
// 6. TECH STANDARD STRATEGIC SUGGESTIONS
// =============================================
describe("tech standard strategic suggestions", () => {
  it("adds strategic suggestion for missing domain keywords", () => {
    const opts = defaultOptions();
    opts.techStandard = { score: 50, details: { domainMissing: { frontend: ["svelte", "tailwind"] }, suggestions: [] } };
    const result = gapAnalyzer(opts);
    const strategic = result.suggestions.filter((s) => s.priority === "Strategic");
    assert.ok(strategic.some((s) => s.text.toLowerCase().includes("svelte") || s.text.toLowerCase().includes("keyword")),
      "Should mention missing domain keywords");
  });

  it("adds suggestions from techStandard.details.suggestions when score < 60", () => {
    const opts = defaultOptions();
    opts.techStandard = { score: 40, details: { suggestions: ["Add TypeScript for type safety."] } };
    const result = gapAnalyzer(opts);
    const strategic = result.suggestions.filter((s) => s.priority === "Strategic");
    assert.ok(strategic.some((s) => s.text.includes("TypeScript")), "Should include suggestion from details");
  });

  it("acknowledges solid technical foundation when score >= 60", () => {
    const opts = defaultOptions();
    opts.techStandard = { score: 80, details: { suggestions: [] } };
    const result = gapAnalyzer(opts);
    const strategic = result.suggestions.filter((s) => s.priority === "Strategic");
    assert.ok(strategic.some((s) => s.text.toLowerCase().includes("solid") || s.text.toLowerCase().includes("technical")),
      "Should acknowledge solid technical foundation");
  });
});

// =============================================
// 7. POLISH FALLBACK
// =============================================
describe("polish fallback suggestions", () => {
  // Polish fires only when pre-polish suggestions < 4.
  // We use minimal scores to keep pre-polish count at 3:
  // - atsOptimization.score=100 skips the optimization branch
  // - impactMatch.score=60 (>=50) gives 1 optimization ("impact metrics strong")
  // - readabilityMatch.details.passiveVoiceCount=3 (>2) gives 0 optimization
  // - techStandard.score=59 (<60) with empty domainMissing gives 0 strategic
  // - resumeText with no tech keywords gives 1 contribution
  // Pre-polish total: 1 optimization + 1 contribution = 2 < 4 -> Polish fires

  const minimalOpts = () => ({
    isJDProvided: false,
    skillMatch: { score: 100 },
    keywordMatch: { score: 100 },
    experienceMatch: {},
    consistencyMatch: {},
    readabilityMatch: { score: 90, details: { passiveVoiceCount: 3 } },
    impactMatch: { score: 60 },
    atsOptimization: { score: 100, details: {} },
    techStandard: { score: 59, details: { domainMissing: {}, suggestions: [] } },
    resumeText: "",
  });

  it("suggests brevity for long resumes (>1000 words)", () => {
    const opts = minimalOpts();
    opts.resumeText = "test word. ".repeat(600); // ~1200 words
    const result = gapAnalyzer(opts);
    const polish = result.suggestions.find((s) => s.priority === "Polish");
    assert.ok(polish, "Should have a Polish suggestion");
    assert.ok(
      polish.text.toLowerCase().includes("long") || polish.text.toLowerCase().includes("3+"),
      "Polish text should mention long resume"
    );
  });

  it("suggests adding detail for very short resumes (<200 words)", () => {
    const opts = minimalOpts();
    opts.resumeText = "Brief overview of skills.";
    const result = gapAnalyzer(opts);
    const polish = result.suggestions.find((s) => s.priority === "Polish");
    assert.ok(polish, "Should have a Polish suggestion");
    assert.ok(
      polish.text.toLowerCase().includes("brief") || polish.text.toLowerCase().includes("detail"),
      "Polish text should mention brief or detail"
    );
  });

  it("suggests competitive edge for medium-length resumes", () => {
    const opts = minimalOpts();
    // 7 words per repeat x 35 = 245 words (> 200, < 1000) -> top percentile polish
    opts.resumeText = "Experienced engineer. Managed teams. Deployed to AWS.".repeat(35);
    const result = gapAnalyzer(opts);
    const polish = result.suggestions.find((s) => s.priority === "Polish");
    assert.ok(polish, "Should have a Polish suggestion");
    assert.ok(
      polish.text.toLowerCase().includes("percentile") || polish.text.toLowerCase().includes("competitive"),
      "Polish text should mention top percentile or competitive"
    );
  });
});

// 8. EMPTY / EDGE CASE INPUTS
// =============================================
describe("empty and edge case inputs", () => {
  it("handles all-null score inputs gracefully", () => {
    const opts = {
      isJDProvided: false,
      skillMatch: {},
      keywordMatch: {},
      experienceMatch: {},
      consistencyMatch: {},
      readabilityMatch: {},
      impactMatch: {},
      atsOptimization: {},
      techStandard: {},
      resumeText: "",
    };
    const result = gapAnalyzer(opts);
    assert.ok(Array.isArray(result.suggestions), "Should return suggestions array");
  });

  it("limits suggestions to max 6 items", () => {
    const opts = defaultOptions();
    opts.skillMatch = { score: 0, details: { missingSkills: ["a", "b", "c", "d", "e", "f", "g"] } };
    opts.keywordMatch = { score: 0, details: { missingKeywords: ["h", "i", "j"] } };
    opts.atsOptimization = { score: 50, details: { sectionResults: { A: false, B: false }, contactResults: {} } };
    opts.techStandard = { score: 40, details: { domainMissing: { x: ["y", "z"] }, suggestions: ["s1", "s2"] } };
    const result = gapAnalyzer(opts);
    assert.ok(result.suggestions.length <= 6, "Suggestions should be capped at 6");
  });
});
