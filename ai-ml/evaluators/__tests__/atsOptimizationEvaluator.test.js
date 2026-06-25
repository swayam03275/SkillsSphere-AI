import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { atsOptimizationEvaluator } from "../../evaluators/atsOptimizationEvaluator.js";

await describe("atsOptimizationEvaluator", async () => {
  await test("returns expected shape", () => {
    const result = atsOptimizationEvaluator({
      resumeData: {
        experience: [{ company: "Acme" }],
        education: [{ institution: "MIT" }],
        skills: ["js"],
        email: "a@b.com",
        phone: "1",
        linkedin: "x",
        github: "x",
        portfolio: "x",
        resumeText: "professional summary",
      },
    });
    assert.ok(result.key, "has key");
    assert.ok(result.label, "has label");
    assert.ok(typeof result.score === "number", "score is a number");
    assert.ok(result.summary, "has summary");
    assert.ok(Array.isArray(result.details.feedback), "has feedback");
    assert.ok(Array.isArray(result.details.suggestions), "has suggestions");
  });

  await test("detects experience section from experience array", () => {
    const result = atsOptimizationEvaluator({
      resumeData: {
        experience: [{ company: "Acme" }],
        education: [],
        skills: [],
        resumeText: "",
      },
    });
    assert.strictEqual(result.details.sectionResults.experience, true);
  });

  await test("detects education section from education array", () => {
    const result = atsOptimizationEvaluator({
      resumeData: {
        experience: [],
        education: [{ institution: "MIT" }],
        skills: [],
        resumeText: "",
      },
    });
    assert.strictEqual(result.details.sectionResults.education, true);
  });

  await test("detects skills section from skills array", () => {
    const result = atsOptimizationEvaluator({
      resumeData: {
        experience: [],
        education: [],
        skills: ["javascript", "react"],
        resumeText: "",
      },
    });
    assert.strictEqual(result.details.sectionResults.skills, true);
  });

  await test("detects summary when resumeText contains standalone summary keyword", () => {
    const result = atsOptimizationEvaluator({
      resumeData: {
        experience: [],
        education: [],
        skills: [],
        resumeText: "Professional Summary",
      },
    });
    assert.strictEqual(result.details.sectionResults.summary, true);
  });

  await test("reports missing sections in feedback when experience is absent", () => {
    const result = atsOptimizationEvaluator({
      resumeData: {
        experience: [],
        education: [{ institution: "MIT" }],
        skills: ["js"],
        email: "a@b.com",
        phone: "1",
        linkedin: "x",
        github: "x",
        portfolio: "x",
        resumeText: "professional summary",
      },
    });
    assert.ok(
      result.details.feedback.some((f) => f.toLowerCase().includes("missing")),
      "feedback mentions missing section"
    );
  });

  await test("flags tables as a formatting issue", () => {
    const result = atsOptimizationEvaluator({
      resumeData: {
        experience: [],
        education: [],
        skills: [],
        resumeText: "<table><tr><td>x</td></tr></table>",
      },
    });
    assert.strictEqual(result.details.formattingIssues.hasTables, true);
  });

  await test("score is reduced for formatting issues", () => {
    const clean = atsOptimizationEvaluator({
      resumeData: {
        experience: [{ company: "Acme" }],
        education: [{ institution: "MIT" }],
        skills: ["js"],
        email: "a@b.com",
        phone: "1",
        linkedin: "x",
        github: "x",
        portfolio: "x",
        resumeText: "professional summary",
      },
    });
    const dirty = atsOptimizationEvaluator({
      resumeData: {
        experience: [{ company: "Acme" }],
        education: [{ institution: "MIT" }],
        skills: ["js"],
        email: "a@b.com",
        phone: "1",
        linkedin: "x",
        github: "x",
        portfolio: "x",
        resumeText: "<table>x</table> professional summary",
      },
    });
    assert.ok(dirty.score < clean.score, "table reduces score");
  });

  await test("score is clamped between 0 and 100", () => {
    const result = atsOptimizationEvaluator({
      resumeData: {
        experience: [],
        education: [],
        skills: [],
        resumeText: "<table>" + "javascript ".repeat(30),
      },
    });
    assert.ok(result.score >= 0 && result.score <= 100, "score out of range: " + result.score);
  });

  await test("handles empty resumeData gracefully", () => {
    const result = atsOptimizationEvaluator({ resumeData: {} });
    assert.ok(typeof result.score === "number", "score computed");
    assert.ok(result.summary, "summary provided");
  });
});
