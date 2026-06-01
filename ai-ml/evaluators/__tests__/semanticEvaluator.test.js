import { describe, it } from "node:test";
import assert from "node:assert";

// Import the semanticEvaluator module (without mocking)
const { semanticEvaluator } = await import("../semanticEvaluator.js");

await describe("semanticEvaluator", async () => {

  await it("returns 0 with safe message when resume text is missing", async () => {
    const result = await semanticEvaluator({
      resumeText: "",
      jobDescription: "test job description",
    });

    assert.strictEqual(result.score, 0);
    assert.strictEqual(result.key, "semanticMatch");
    assert.strictEqual(result.label, "Semantic Match");
    assert.ok(result.summary.toLowerCase().includes("missing"));
  });

  await it("returns 0 with safe message when job description is missing", async () => {
    const result = await semanticEvaluator({
      resumeText: "test resume text",
      jobDescription: "",
    });

    assert.strictEqual(result.score, 0);
    assert.strictEqual(result.key, "semanticMatch");
    assert.strictEqual(result.label, "Semantic Match");
    assert.ok(result.summary.toLowerCase().includes("missing"));
  });

  await it("returns unavailable result when HF API key is missing (CI friendly)", async () => {
    const originalKey = process.env.HF_API_TOKEN;
    delete process.env.HF_API_TOKEN;

    try {
      const result = await semanticEvaluator({
        resumeText: "test resume with experience",
        jobDescription: "test job description",
      });

      assert.strictEqual(result.key, "semanticMatch");
      assert.strictEqual(result.label, "Semantic Match");
      assert.strictEqual(result.score, null);
      assert.ok(result.meta && result.meta.unavailable === true);
      assert.ok(result.summary.toLowerCase().includes("unconfigured") || result.summary.toLowerCase().includes("not set"));
    } finally {
      process.env.HF_API_TOKEN = originalKey;
    }
  });

  await it("has correct interface shape", async () => {
    // Verify the evaluator exports a function
    assert.strictEqual(typeof semanticEvaluator, "function");

    // Verify it accepts the required parameters
    const result = await semanticEvaluator({
      resumeText: "",
      jobDescription: "",
    });

    // Verify return shape even for empty inputs
    assert.strictEqual(typeof result, "object");
    assert.ok("key" in result);
    assert.ok("label" in result);
    assert.ok("score" in result);
    assert.ok("summary" in result);
  });
});
