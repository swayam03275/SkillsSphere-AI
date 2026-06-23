import assert from "node:assert/strict";
import test from "node:test";
import { buildCoverLetterPrompt } from "../coverLetterPromptBuilder.js";

const TONES = [
  "Professional",
  "Formal",
  "Confident",
  "Concise",
  "Startup-Friendly",
  "Creative",
];

test("buildCoverLetterPrompt includes critical instruction for English", () => {
  const prompt = buildCoverLetterPrompt({
    resumeData: { personalInfo: { name: "Jane Doe" }, skills: ["JS", "React"] },
    jobDescription: "We need a senior developer.",
  });
  assert.ok(prompt.includes("ENGLISH"), "should include language instruction");
});

test("buildCoverLetterPrompt includes critical instruction for non-English language", () => {
  const prompt = buildCoverLetterPrompt({
    resumeData: {},
    jobDescription: "Open position.",
    language: "Spanish",
  });
  assert.ok(prompt.includes("SPANISH"), "should include Spanish language instruction");
});

test("each tone option is embedded in the output prompt", () => {
  // Map each tone to a distinctive keyword present in its instruction text
  const toneKeywords = {
    "Professional": "professional",
    "Formal": "formal",
    "Confident": "conviction",
    "Concise": "direct",
    "Startup-Friendly": "modern",
    "Creative": "unconventional",
  };
  for (const tone of TONES) {
    const prompt = buildCoverLetterPrompt({
      resumeData: {},
      jobDescription: "Test job.",
      tone,
    });
    const keyword = toneKeywords[tone];
    assert.ok(
      prompt.toLowerCase().includes(keyword),
      `tone '${tone}' should include keyword '${keyword}'`
    );
  }
});

test("missing resumeData fields fall back to placeholder text", () => {
  const prompt = buildCoverLetterPrompt({
    jobDescription: "Test job.",
  });
  assert.ok(prompt.includes("[Your Name]"), "missing name falls back to placeholder");
});

test("empty jobDescription is handled gracefully", () => {
  const prompt = buildCoverLetterPrompt({
    resumeData: { personalInfo: { name: "Bob" } },
    jobDescription: "",
  });
  assert.ok(typeof prompt === "string", "returns a string even with empty JD");
  assert.ok(prompt.length > 0, "prompt is non-empty");
});

test("prompt includes key instruction sections", () => {
  const prompt = buildCoverLetterPrompt({
    resumeData: { personalInfo: { name: "Alice" }, skills: ["Python"] },
    jobDescription: "Backend engineer needed.",
  });
  assert.ok(prompt.includes("### CANDIDATE PROFILE"), "has candidate profile section");
  assert.ok(prompt.includes("### TARGET JOB DESCRIPTION"), "has JD section");
  assert.ok(prompt.includes("### REQUIRED OUTPUT"), "has output section");
});

test("prompt does not fabricate experiences not in resumeData", () => {
  const prompt = buildCoverLetterPrompt({
    resumeData: { personalInfo: { name: "Alice" } },
    jobDescription: "Backend engineer needed.",
  });
  assert.ok(prompt.includes("NO HALLUCINATIONS"), "has hallucination warning");
});

test("prompt includes today's date", () => {
  const prompt = buildCoverLetterPrompt({
    resumeData: {},
    jobDescription: "Open role.",
  });
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  assert.ok(prompt.includes(today), "prompt includes today's date");
});

test("default tone is Professional when not specified", () => {
  const prompt = buildCoverLetterPrompt({
    resumeData: {},
    jobDescription: "Open role.",
  });
  assert.ok(
    prompt.includes("professional"),
    "default tone is Professional"
  );
});

test("prompt is a non-empty string for all tone options", () => {
  for (const tone of TONES) {
    const prompt = buildCoverLetterPrompt({
      resumeData: {},
      jobDescription: "Test.",
      tone,
    });
    assert.ok(typeof prompt === "string", `tone '${tone}' returns a string`);
    assert.ok(prompt.length > 0, `tone '${tone}' returns non-empty prompt`);
  }
});
