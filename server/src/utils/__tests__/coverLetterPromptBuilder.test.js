import assert from "node:assert/strict";
import test from "node:test";
import { buildCoverLetterPrompt } from "../coverLetterPromptBuilder.js";

test("buildCoverLetterPrompt falls back to [Your Name] when personalInfo.name is missing", () => {
  const result = buildCoverLetterPrompt({ resumeData: {}, analysisData: {}, jobDescription: "Test JD" });
  assert.ok(result.includes("[Your Name]"));
});

test("buildCoverLetterPrompt uses candidate name when provided", () => {
  const result = buildCoverLetterPrompt({
    resumeData: { personalInfo: { name: "Alice Smith" } },
    analysisData: {},
    jobDescription: "Test JD"
  });
  assert.ok(result.includes("Alice Smith"));
  assert.ok(!result.includes("[Your Name]"));
});

test("buildCoverLetterPrompt formats skillsList from array of strings", () => {
  const result = buildCoverLetterPrompt({
    resumeData: { skills: ["JavaScript", "React", "Node.js"] },
    analysisData: {},
    jobDescription: "Test JD"
  });
  assert.ok(result.includes("JavaScript"));
  assert.ok(result.includes("React"));
  assert.ok(result.includes("Node.js"));
});

test("buildCoverLetterPrompt formats skillsList from array of objects", () => {
  const result = buildCoverLetterPrompt({
    resumeData: { skills: [{ name: "Python" }, { name: "Django" }] },
    analysisData: {},
    jobDescription: "Test JD"
  });
  assert.ok(result.includes("Python"));
  assert.ok(result.includes("Django"));
});

test("buildCoverLetterPrompt formats experience highlights with role and company", () => {
  const result = buildCoverLetterPrompt({
    resumeData: {
      experience: [
        { role: "Software Engineer", company: "Acme Corp", description: "Built scalable APIs" }
      ]
    },
    analysisData: {},
    jobDescription: "Test JD"
  });
  assert.ok(result.includes("Software Engineer"));
  assert.ok(result.includes("Acme Corp"));
  assert.ok(result.includes("Built scalable APIs"));
});

test("buildCoverLetterPrompt falls back to title when role is missing", () => {
  const result = buildCoverLetterPrompt({
    resumeData: {
      experience: [
        { title: "Developer", description: "Wrote code" }
      ]
    },
    analysisData: {},
    jobDescription: "Test JD"
  });
  assert.ok(result.includes("Developer"));
});

test("buildCoverLetterPrompt formats project highlights correctly", () => {
  const result = buildCoverLetterPrompt({
    resumeData: {
      projects: [
        { name: "Portfolio Site", description: "Showcased work" }
      ]
    },
    analysisData: {},
    jobDescription: "Test JD"
  });
  assert.ok(result.includes("Portfolio Site"));
  assert.ok(result.includes("Showcased work"));
});

test("buildCoverLetterPrompt maps tone to correct instruction", () => {
  const conciseResult = buildCoverLetterPrompt({
    resumeData: {},
    analysisData: {},
    jobDescription: "Test JD",
    tone: "Concise"
  });
  assert.ok(conciseResult.includes("Be extremely direct and brief"));

  const creativeResult = buildCoverLetterPrompt({
    resumeData: {},
    analysisData: {},
    jobDescription: "Test JD",
    tone: "Creative"
  });
  assert.ok(creativeResult.includes("engaging, slightly unconventional"));
});

test("buildCoverLetterPrompt defaults to Professional tone for unknown tone", () => {
  const result = buildCoverLetterPrompt({
    resumeData: {},
    analysisData: {},
    jobDescription: "Test JD",
    tone: "UnknownTone"
  });
  assert.ok(result.includes("professional, formal"));
});

test("buildCoverLetterPrompt uses missing JD fallback when jobDescription is empty", () => {
  const result = buildCoverLetterPrompt({
    resumeData: {},
    analysisData: {},
    jobDescription: ""
  });
  assert.ok(result.includes("No job description provided"));
});

test("buildCoverLetterPrompt includes ATS insights when provided", () => {
  const result = buildCoverLetterPrompt({
    resumeData: {},
    analysisData: {
      atsAnalysis: {
        feedback: ["Improve keyword density", "Add more quantifiable metrics"]
      }
    },
    jobDescription: "Test JD"
  });
  assert.ok(result.includes("Improve keyword density"));
  assert.ok(result.includes("quantifiable metrics"));
});

test("buildCoverLetterPrompt includes today's date in the prompt", () => {
  const result = buildCoverLetterPrompt({
    resumeData: {},
    analysisData: {},
    jobDescription: "Test JD"
  });
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  assert.ok(result.includes(today));
});

test("buildCoverLetterPrompt handles missing resumeData and analysisData gracefully", () => {
  const result = buildCoverLetterPrompt({});
  assert.ok(result.includes("You are an expert career coach"));
  assert.ok(result.includes("[Your Name]"));
  assert.ok(result.includes("No specific experience provided"));
});
