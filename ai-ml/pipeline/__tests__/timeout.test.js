import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { withTimeout, TimeoutError } from "../withTimeout.js";
import { runPipeline } from "../runPipeline.js";

// Ensure process.env.HF_API_TOKEN is set so semanticMatch evaluator executes
if (!process.env.HF_API_TOKEN) {
  process.env.HF_API_TOKEN = "mock_token_for_timeout_tests";
}

describe("withTimeout utility", () => {
  it("resolves when the promise resolves before timeout", async () => {
    const p = new Promise((resolve) => setTimeout(() => resolve("success"), 5));
    const result = await withTimeout(p, 50, "test");
    assert.equal(result, "success");
  });

  it("rejects when the promise rejects before timeout", async () => {
    const p = new Promise((_, reject) => setTimeout(() => reject(new Error("oops")), 5));
    await assert.rejects(withTimeout(p, 50, "test"), /oops/);
  });

  it("rejects with TimeoutError when the timeout occurs first", async () => {
    const p = new Promise((resolve) => setTimeout(() => resolve("too slow"), 100));
    await assert.rejects(withTimeout(p, 10, "slow_evaluator"), (err) => {
      assert.ok(err instanceof TimeoutError);
      assert.equal(err.evaluatorName, "slow_evaluator");
      assert.equal(err.timeoutMs, 10);
      return true;
    });
  });
});

describe("runPipeline with timeouts", () => {
  let originalFetch;

  test.before(() => {
    originalFetch = globalThis.fetch;
    // Mock global fetch to delay responses by 100ms, simulating a slow external API
    globalThis.fetch = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return {
        ok: true,
        status: 200,
        json: async () => [0.85],
      };
    };
  });

  test.after(() => {
    globalThis.fetch = originalFetch;
  });

  it("enters degraded mode when evaluator exceeds deadline", async () => {
    const originalEnv = process.env.EVALUATOR_TIMEOUT_MS;
    // Set evaluator deadline to 20ms, which is less than the 100ms fetch delay
    process.env.EVALUATOR_TIMEOUT_MS = "20";

    console.log("[TEST DEBUG] process.env.EVALUATOR_TIMEOUT_MS set to:", process.env.EVALUATOR_TIMEOUT_MS);

    try {
      const result = await runPipeline({
        resumeData: {
          resumeText: "Experienced developer",
          skills: ["JavaScript"],
          experience: [],
          classification: { field: "frontend developer" },
        },
        jobSkills: ["JavaScript"],
        jobDescription: "React developer",
      });

      console.log("[TEST DEBUG] result.degraded:", result.degraded);
      console.log("[TEST DEBUG] result.timedOutEvaluators:", result.timedOutEvaluators);
      console.log("[TEST DEBUG] result.failedEvaluators:", result.failedEvaluators);

      assert.equal(result.degraded, true);
      assert.ok(result.timedOutEvaluators.includes("semanticMatch"));
      assert.ok(result.failedEvaluators.includes("semanticMatch"));
      assert.equal(typeof result.score, "number");
    } finally {
      if (originalEnv === undefined) {
        delete process.env.EVALUATOR_TIMEOUT_MS;
      } else {
        process.env.EVALUATOR_TIMEOUT_MS = originalEnv;
      }
    }
  });

  it("aborts and throws when global pipeline timeout is exceeded", async () => {
    const originalEnv = process.env.PIPELINE_TIMEOUT_MS;
    // Set global deadline to 20ms, which is less than the 100ms fetch delay
    process.env.PIPELINE_TIMEOUT_MS = "20";

    try {
      await assert.rejects(
        runPipeline({
          resumeData: {
            resumeText: "Experienced developer",
            skills: ["JavaScript"],
            experience: [],
            classification: { field: "frontend developer" },
          },
          jobSkills: ["JavaScript"],
          jobDescription: "React developer",
        }),
        /Resume analysis timed out/
      );
    } finally {
      if (originalEnv === undefined) {
        delete process.env.PIPELINE_TIMEOUT_MS;
      } else {
        process.env.PIPELINE_TIMEOUT_MS = originalEnv;
      }
    }
  });
});
