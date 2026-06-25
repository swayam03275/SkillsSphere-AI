import { test, describe } from "node:test";
import assert from "node:assert/strict";

await describe("generateRecommendations", async () => {
  test("returns empty array when resumeData is null", async () => {
    const { generateRecommendations } = await import("../recommendationEngine.js");
    const result = await generateRecommendations(null, [
      { _id: "1", skills: ["js"], description: "desc" },
    ]);
    assert.deepStrictEqual(result, []);
  });

  test("returns empty array when jobs is empty", async () => {
    const { generateRecommendations } = await import("../recommendationEngine.js");
    const result = await generateRecommendations({ email: "a@b.com" }, []);
    assert.deepStrictEqual(result, []);
  });

  test("returns empty array when jobs is undefined", async () => {
    const { generateRecommendations } = await import("../recommendationEngine.js");
    const result = await generateRecommendations({ email: "a@b.com" }, undefined);
    assert.deepStrictEqual(result, []);
  });

  test("result includes all required fields for a valid job", async () => {
    const { generateRecommendations } = await import("../recommendationEngine.js");
    const resumeData = { email: "a@b.com" };
    const jobs = [{ _id: "job1", skills: ["js"], description: "build apps" }];
    const result = await generateRecommendations(resumeData, jobs);
    assert.ok(result.length >= 1, "returns at least 1 result");
    const rec = result[0];
    assert.strictEqual(rec.jobId, "job1");
    assert.ok(typeof rec.score === "number", "score is a number");
    assert.ok(rec.breakdown !== undefined, "has breakdown");
    assert.ok(rec.skillMatch !== undefined, "has skillMatch");
    assert.ok(rec.experienceMatch !== undefined, "has experienceMatch");
    assert.ok(rec.relevanceInsights !== undefined, "has relevanceInsights");
    assert.ok(rec.matchLevel !== undefined, "has matchLevel");
  });

  test("results are sorted by score descending", async () => {
    const { generateRecommendations } = await import("../recommendationEngine.js");
    const resumeData = { email: "sort@test.com" };
    const jobs = [
      { _id: "job1", skills: ["js"], description: "a" },
      { _id: "job2", skills: ["py"], description: "b" },
      { _id: "job3", skills: ["go"], description: "c" },
    ];
    const result = await generateRecommendations(resumeData, jobs);
    assert.ok(result.length <= 3, "returns at most as many results as jobs");
    for (let i = 1; i < result.length; i++) {
      assert.ok(
        result[i - 1].score >= result[i].score,
        "scores not descending"
      );
    }
  });
});
