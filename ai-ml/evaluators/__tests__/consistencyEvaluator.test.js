import { test, describe } from "node:test";
import assert from "node:assert/strict";
import consistencyEvaluator from "../../evaluators/consistencyEvaluator.js";

await describe("consistencyEvaluator", async () => {
  test("returns expected shape", () => {
    const result = consistencyEvaluator({ resumeText: "" });
    assert.ok(result.key, "has key");
    assert.ok(result.label, "has label");
    assert.ok(typeof result.score === "number", "score is a number");
    assert.ok(result.summary, "has summary");
    assert.ok(Array.isArray(result.details.overusedWords), "has overusedWords");
    assert.ok(Array.isArray(result.details.duplicateSentences), "has duplicateSentences");
    assert.ok(Array.isArray(result.details.genericPhrases), "has genericPhrases");
    assert.ok(Array.isArray(result.details.feedback), "has feedback");
    assert.ok(result.meta, "has meta");
  });

  test("empty text scores 100 with no feedback", () => {
    const result = consistencyEvaluator({ resumeText: "" });
    assert.strictEqual(result.score, 100, "empty text scores 100");
  });

  test("generic phrases incur 7pt penalty each", () => {
    const result = consistencyEvaluator({
      resumeText: "I am a hardworking team player who is a quick learner.",
    });
    assert.ok(result.details.genericPhrases.length >= 2, "detected multiple generic phrases");
    assert.ok(result.score < 100, "score reduced for generic phrases");
    assert.ok(result.meta.penaltyApplied >= 14, "penalty applied");
  });

  test("generic phrase detection uses word boundaries", () => {
    const result = consistencyEvaluator({
      resumeText: "team player is a great team player",
    });
    assert.strictEqual(
      result.details.genericPhrases.includes("team player"),
      true,
      "phrase detected"
    );
  });

  test("technical keywords are excluded from overuse detection", () => {
    const result = consistencyEvaluator({
      resumeText: "javascript ".repeat(20),
    });
    assert.strictEqual(
      result.details.overusedWords.includes("javascript"),
      false,
      "technical keyword not flagged as overused"
    );
  });

  test("duplicate sentences are detected", () => {
    const result = consistencyEvaluator({
      resumeText: "Built a REST API. Built a REST API. Managed a team.",
    });
    assert.ok(result.details.duplicateSentences.length >= 1, "duplicate sentence detected");
    assert.ok(result.score < 100, "score reduced for duplicates");
  });

  test("dynamic threshold increases with word count", () => {
    const shortResult = consistencyEvaluator({ resumeText: "hello world ".repeat(10) });
    const longResult = consistencyEvaluator({ resumeText: "hello world ".repeat(500) });
    assert.ok(
      longResult.meta.thresholdUsed >= shortResult.meta.thresholdUsed,
      "threshold scales with document length"
    );
  });

  test("score is never below 0", () => {
    const result = consistencyEvaluator({
      resumeText:
        "hardworking hardworking hardworking hardworking hardworking " +
        "team player quick learner detail oriented self motivated " +
        "I am a hardworking team player. I am a hardworking team player. " +
        "I am a hardworking team player. I am a hardworking team player.",
    });
    assert.ok(result.score >= 0, "score is not negative");
    assert.ok(result.meta.penaltyApplied > 50, "heavy penalty applied");
  });

  test("meta includes word count and threshold", () => {
    const result = consistencyEvaluator({ resumeText: "one two three four five" });
    assert.ok(typeof result.meta.wordCount === "number", "has wordCount");
    assert.ok(typeof result.meta.thresholdUsed === "number", "has thresholdUsed");
    assert.ok(typeof result.meta.penaltyApplied === "number", "has penaltyApplied");
  });
});
