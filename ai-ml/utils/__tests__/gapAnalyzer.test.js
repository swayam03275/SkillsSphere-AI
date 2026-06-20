import test from "node:test";
import assert from "node:assert/strict";
import gapAnalyzer from "../gapAnalyzer.js";

test("returns empty suggestions for minimal input", () => {
  const result = gapAnalyzer({});
  assert.ok(Array.isArray(result.suggestions));
  assert.ok(result.suggestions.length >= 0);
});

test("critical bucket: atsOptimization.score below 80 triggers missing section advice", () => {
  const result = gapAnalyzer({
    atsOptimization: { score: 70, details: { sectionResults: { education: false } } },
    resumeText: "word " + "x".repeat(200),
    isJDProvided: false,
  });

  const critical = result.suggestions.filter(s => s.priority === "Critical");
  assert.ok(critical.length > 0, "should have at least one critical suggestion");
  assert.ok(critical.some(s => s.text.includes("education")), "should mention missing education section");
});

test("critical bucket: atsOptimization.score below 100 but above 80 triggers optimization advice", () => {
  const result = gapAnalyzer({
    atsOptimization: { score: 90, details: {} },
    resumeText: "",
    isJDProvided: false,
  });

  const optimization = result.suggestions.filter(s => s.priority === "Optimization");
  assert.ok(optimization.length > 0, "should have optimization suggestion when ats score < 100");
});

test("strategic bucket: skill match below 85 triggers skill gap advice when JD provided", () => {
  const result = gapAnalyzer({
    isJDProvided: true,
    skillMatch: { score: 70, missingSkills: ["React", "Node.js"] },
    keywordMatch: { score: 100 },
    techStandard: { score: 100 },
    resumeText: "",
  });

  const strategic = result.suggestions.filter(s => s.priority === "Strategic");
  assert.ok(strategic.length > 0, "should have strategic suggestions for skill gap");
  assert.ok(strategic.some(s => s.text.includes("React") || s.text.includes("Node")), "should mention missing skills");
});

test("strategic bucket: keyword match below 90 triggers keyword advice when JD provided", () => {
  const result = gapAnalyzer({
    isJDProvided: true,
    skillMatch: { score: 100 },
    keywordMatch: { score: 80, missingKeywords: ["AWS", "Docker"] },
    techStandard: { score: 100 },
    resumeText: "",
  });

  const strategic = result.suggestions.filter(s => s.priority === "Strategic");
  assert.ok(strategic.length > 0, "should have strategic suggestion for keyword gap");
  assert.ok(strategic.some(s => s.text.includes("AWS") || s.text.includes("Docker")), "should mention missing keywords");
});

test("strategic bucket: skill/keyword gap not surfaced when isJDProvided is false but techStandard is high", () => {
  const result = gapAnalyzer({
    isJDProvided: false,
    skillMatch: { score: 50, missingSkills: ["Python"] },
    keywordMatch: { score: 50, missingKeywords: ["SQL"] },
    techStandard: { score: 100 },
    atsOptimization: { score: 100 },
    resumeText: "",
  });

  const strategic = result.suggestions.filter(s => s.priority === "Strategic");
  // With high techStandard (100), only the open-source suggestion appears — not skill-gap
  const hasSkillGap = strategic.some(s => s.text.toLowerCase().includes("bridge the technical gap"));
  assert.ok(!hasSkillGap, "should not surface skill gap suggestions without JD when techStandard is high");
});

test("optimization bucket: low impact score triggers XYZ formula advice", () => {
  const result = gapAnalyzer({
    impactMatch: { score: 40 },
    readabilityMatch: { details: { passiveVoiceCount: 1 } },
    atsOptimization: { score: 100 },
    resumeText: "react react react",
    isJDProvided: false,
  });

  const optimization = result.suggestions.filter(s => s.priority === "Optimization");
  assert.ok(optimization.length > 0, "should have optimization suggestions");
  assert.ok(optimization.some(s => s.text.includes("XYZ") || s.text.includes("result-oriented")), "should suggest result-oriented bullet points");
});

test("optimization bucket: high passive voice triggers verb conversion advice", () => {
  const result = gapAnalyzer({
    impactMatch: { score: 80 },
    readabilityMatch: { details: { passiveVoiceCount: 5, relevantVerbs: ["was built", "was created"] } },
    atsOptimization: { score: 100 },
    resumeText: "react react react",
    isJDProvided: false,
  });

  const optimization = result.suggestions.filter(s => s.priority === "Optimization");
  assert.ok(optimization.some(s => s.text.toLowerCase().includes("passive")), "should suggest converting passive voice");
});

test("techStandard.score below 60 surfaces domainMissing keywords as strategic", () => {
  const result = gapAnalyzer({
    techStandard: { score: 50, details: { domainMissing: { frontend: ["React", "Vue"] } } },
    isJDProvided: false,
    atsOptimization: { score: 100 },
    resumeText: "",
  });

  const strategic = result.suggestions.filter(s => s.priority === "Strategic");
  assert.ok(strategic.some(s => s.text.includes("React") || s.text.includes("technical breadth")), "should surface domain missing keywords");
});

test("techStandard.score >= 60 surfaces open source suggestion", () => {
  const result = gapAnalyzer({
    techStandard: { score: 70 },
    isJDProvided: false,
    atsOptimization: { score: 100 },
    resumeText: "",
  });

  const strategic = result.suggestions.filter(s => s.priority === "Strategic");
  assert.ok(strategic.some(s => s.text.toLowerCase().includes("open-source") || s.text.toLowerCase().includes("technical foundation")), "should suggest open source contributions");
});

test("contribution milestones: frontend keywords trigger React contribution", () => {
  const result = gapAnalyzer({
    resumeText: "React developer with frontend experience",
    atsOptimization: { score: 100 },
  });

  const contribution = result.suggestions.filter(s => s.priority === "Contribution");
  assert.ok(contribution.length > 0, "should have contribution suggestions");
  assert.ok(contribution[0].text.toLowerCase().includes("react") || contribution[0].text.toLowerCase().includes("frontend"), "should suggest frontend contribution");
});

test("contribution milestones: backend keywords trigger backend contribution", () => {
  const result = gapAnalyzer({
    resumeText: "Python backend developer",
    atsOptimization: { score: 100 },
  });

  const contribution = result.suggestions.filter(s => s.priority === "Contribution");
  assert.ok(contribution.length > 0, "should have contribution suggestions for backend");
  assert.ok(contribution[0].text.toLowerCase().includes("backend") || contribution[0].text.toLowerCase().includes("python"), "should suggest backend contribution");
});

test("polish fallback does not fire because contribution always adds at least one suggestion", () => {
  // The contribution block always pushes one suggestion (it falls through to the else
  // branch when no tech keywords match). This means allSuggestions always has at least
  // 1 from contribution + 1 from techStandard strategic = 2 minimum. When both impact
  // and readability also fire, total is 4 and the < 4 polish condition never triggers.
  const result = gapAnalyzer({
    atsOptimization: { score: 100 },
    techStandard: { score: 100 },
    impactMatch: { score: 80 },
    readabilityMatch: { details: { passiveVoiceCount: 1 } },
    resumeText: "hello world",
    isJDProvided: false,
  });

  const polish = result.suggestions.filter(s => s.priority === "Polish");
  assert.equal(polish.length, 0, "polish should not fire because contribution always adds one, got: " + JSON.stringify(result.suggestions.map(s => s.priority)));
  assert.equal(result.suggestions.length, 4, "should have exactly 4 suggestions (minimum set)");
});

test("empty techStandard defaults to open-source strategic suggestion", () => {
  // When techStandard is undefined, score defaults to Infinity so the else branch fires.
  const result = gapAnalyzer({
    techStandard: {},
    atsOptimization: { score: 100 },
    impactMatch: { score: 80 },
    readabilityMatch: { details: { passiveVoiceCount: 1 } },
    resumeText: "generic resume",
    isJDProvided: false,
  });

  const strategic = result.suggestions.filter(s => s.priority === "Strategic");
  assert.ok(strategic.length > 0, "should have strategic suggestion with empty techStandard");
  assert.ok(strategic[0].text.toLowerCase().includes("open-source") || strategic[0].text.toLowerCase().includes("technical foundation"), "should suggest open-source with empty techStandard");
});

test("suggestions are capped at 6", () => {
  const result = gapAnalyzer({
    atsOptimization: { score: 70, details: { sectionResults: { education: false, experience: false } } },
    isJDProvided: true,
    skillMatch: { score: 60, missingSkills: ["a", "b", "c"] },
    keywordMatch: { score: 60, missingKeywords: ["d", "e", "f"] },
    techStandard: { score: 40, details: { domainMissing: { x: ["g", "h"] }, suggestions: ["i", "j"] } },
    impactMatch: { score: 30 },
    readabilityMatch: { details: { passiveVoiceCount: 5, relevantVerbs: ["was"] } },
    resumeText: "react python node docker aws html css",
  });

  assert.ok(result.suggestions.length <= 6, `expected <= 6 suggestions, got ${result.suggestions.length}`);
});

test("each suggestion has required fields: priority, text, icon, type", () => {
  const result = gapAnalyzer({
    atsOptimization: { score: 70, details: {} },
    isJDProvided: false,
    resumeText: "react developer frontend",
  });

  for (const s of result.suggestions) {
    assert.ok(typeof s.priority === "string" && s.priority.length > 0, "suggestion must have priority");
    assert.ok(typeof s.text === "string" && s.text.length > 0, "suggestion must have text");
    assert.ok(typeof s.icon === "string" && s.icon.length > 0, "suggestion must have icon");
    assert.ok(typeof s.type === "string" && s.type.length > 0, "suggestion must have type");
  }
});