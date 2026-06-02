import { describe, it, before, after } from "node:test";
import assert from "node:assert";

const { semanticEvaluator } = await import("../semanticEvaluator.js");

// --- Helpers ---
function assertValidShape(result) {
  assert.strictEqual(typeof result, "object");
  assert.ok("key" in result, "Missing key");
  assert.ok("label" in result, "Missing label");
  assert.ok("score" in result, "Missing score");
  assert.ok("summary" in result, "Missing summary");
  assert.ok("details" in result, "Missing details");
  assert.ok("meta" in result, "Missing meta");
  assert.ok(result.score >= 0 && result.score <= 100, `Score out of range: ${result.score}`);
}

function assertMissingInput(result, fieldHint) {
  assert.strictEqual(result.score, 0);
  assert.strictEqual(result.key, "semanticMatch");
  assert.strictEqual(result.label, "Semantic Match");
  assert.ok(
    result.summary.toLowerCase().includes("missing"),
    `Expected summary to mention 'missing' for ${fieldHint}, got: "${result.summary}"`
  );
}

// =============================================
await describe("semanticEvaluator", async () => {

  // =============================================
  // 1. CONTRACT / INTERFACE TESTS
  // =============================================
  await describe("interface contract", async () => {

    await it("exports a function", () => {
      assert.strictEqual(typeof semanticEvaluator, "function");
    });

    await it("returns correct shape for empty inputs", async () => {
      const result = await semanticEvaluator({ resumeText: "", jobDescription: "" });
      assertValidShape(result);
    });

    await it("score is always a number between 0 and 100", async () => {
      const result = await semanticEvaluator({
        resumeText: "experienced software engineer",
        jobDescription: "software engineer role",
      });
      assert.ok(typeof result.score === "number");
      assert.ok(result.score >= 0 && result.score <= 100);
    });

    await it("key is always semanticMatch", async () => {
      const result = await semanticEvaluator({ resumeText: "", jobDescription: "" });
      assert.strictEqual(result.key, "semanticMatch");
    });

    await it("label is always Semantic Match", async () => {
      const result = await semanticEvaluator({ resumeText: "", jobDescription: "" });
      assert.strictEqual(result.label, "Semantic Match");
    });
  });

  // =============================================
  // 2. MISSING / EMPTY INPUT TESTS
  // =============================================
  await describe("missing input handling", async () => {

    await it("returns score 0 when resumeText is empty string", async () => {
      const result = await semanticEvaluator({
        resumeText: "",
        jobDescription: "senior backend engineer with node.js experience",
      });
      assertMissingInput(result, "resumeText");
    });

    await it("returns score 0 when jobDescription is empty string", async () => {
      const result = await semanticEvaluator({
        resumeText: "5 years of backend development with node.js",
        jobDescription: "",
      });
      assertMissingInput(result, "jobDescription");
    });

    await it("returns score 0 when resumeText is whitespace only", async () => {
      const result = await semanticEvaluator({
        resumeText: "   ",
        jobDescription: "backend engineer",
      });
      assert.strictEqual(result.score, 0);
    });

    await it("returns score 0 when jobDescription is whitespace only", async () => {
      const result = await semanticEvaluator({
        resumeText: "backend engineer with 5 years experience",
        jobDescription: "   ",
      });
      assert.strictEqual(result.score, 0);
    });

    await it("returns score 0 when both inputs are missing", async () => {
      const result = await semanticEvaluator({ resumeText: "", jobDescription: "" });
      assert.strictEqual(result.score, 0);
    });

    await it("handles undefined inputs without throwing", async () => {
      const result = await semanticEvaluator({});
      assert.strictEqual(result.score, 0);
    });

    await it("handles null-like inputs without throwing", async () => {
      const result = await semanticEvaluator({
        resumeText: null ?? "",
        jobDescription: null ?? "",
      });
      assert.strictEqual(result.score, 0);
    });
  });

  // =============================================
  // 3. PROVIDER / API FAILURE TESTS
  // =============================================
  await describe("provider failure handling", async () => {

    let originalKey;

    before(() => {
      originalKey = process.env.HF_API_TOKEN;
    });

    after(() => {
      process.env.HF_API_TOKEN = originalKey;
    });

    await it("throws with HF_API_TOKEN message when token is missing", async () => {
      delete process.env.HF_API_TOKEN;

      await assert.rejects(
        async () => {
          await semanticEvaluator({
            resumeText: "test resume with experience",
            jobDescription: "test job description",
          });
        },
        /HF_API_TOKEN/
      );
    });

    await it("throws an Error instance (not a plain object) on provider failure", async () => {
      delete process.env.HF_API_TOKEN;

      try {
        await semanticEvaluator({
          resumeText: "test resume",
          jobDescription: "test job",
        });
        assert.fail("Expected error to be thrown");
      } catch (err) {
        assert.ok(err instanceof Error, `Expected Error instance, got: ${typeof err}`);
      } finally {
        process.env.HF_API_TOKEN = originalKey;
      }
    });

    await it("restores env token after provider failure test", async () => {
      // Validates test isolation — token should be restored by after() hook
      assert.strictEqual(typeof process.env.HF_API_TOKEN, "string");
    });
  });

  // =============================================
  // 4. SEMANTIC RELEVANCE BOUNDARY TESTS
  // =============================================
  await describe("semantic relevance scoring", async () => {

    await it("identical resume and job description scores higher than unrelated", async () => {
      const identical = await semanticEvaluator({
        resumeText: "machine learning engineer with pytorch and transformers",
        jobDescription: "machine learning engineer with pytorch and transformers",
      });

      const unrelated = await semanticEvaluator({
        resumeText: "chef with 5 years of culinary experience in Italian cuisine",
        jobDescription: "machine learning engineer with pytorch and transformers",
      });

      assert.ok(
        identical.score > unrelated.score,
        `Expected identical (${identical.score}) > unrelated (${unrelated.score})`
      );
    });

    await it("highly relevant resume scores above 60", async () => {
      const result = await semanticEvaluator({
        resumeText:
          "senior software engineer with 6 years experience in react, node.js, and AWS cloud infrastructure",
        jobDescription:
          "looking for a software engineer with react and node.js skills and cloud experience",
      });

      assert.ok(result.score >= 60, `Expected score >= 60, got ${result.score}`);
    });

    await it("completely unrelated resume scores below 40", async () => {
      const result = await semanticEvaluator({
        resumeText:
          "professional pastry chef specializing in French desserts and chocolate sculpting",
        jobDescription:
          "senior devops engineer with kubernetes, terraform, and CI/CD pipeline experience",
      });

      assert.ok(result.score < 40, `Expected score < 40, got ${result.score}`);
    });
  });

  // =============================================
  // 5. EDGE CASE TESTS
  // =============================================
  await describe("edge cases", async () => {

    await it("handles very long resume text without throwing", async () => {
      const longText = "experienced software engineer ".repeat(300);
      const result = await semanticEvaluator({
        resumeText: longText,
        jobDescription: "software engineer with backend experience",
      });
      assertValidShape(result);
    });

    await it("handles special characters in input without throwing", async () => {
      const result = await semanticEvaluator({
        resumeText: "engineer with C++ & Python (3.x), Node.js — AWS/GCP",
        jobDescription: "C++ developer with cloud (AWS/GCP) experience",
      });
      assertValidShape(result);
    });

    await it("handles non-english text without throwing", async () => {
      const result = await semanticEvaluator({
        resumeText: "ingénieur logiciel avec 5 ans d'expérience en Python",
        jobDescription: "software engineer with python experience",
      });
      assertValidShape(result);
    });

    await it("handles numeric-only input without throwing", async () => {
      const result = await semanticEvaluator({
        resumeText: "12345 67890",
        jobDescription: "99999 11111",
      });
      assertValidShape(result);
    });
  });
});