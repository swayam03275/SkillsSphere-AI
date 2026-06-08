import assert from "node:assert/strict";
import test from "node:test";
import { validateEvaluatorResult } from "../evaluatorContract.js";

const validResult = (overrides = {}) => ({
  key: "keywordMatch",
  label: "Keyword Match",
  score: 80,
  weight: 0.2,
  weightedScore: 16,
  summary: "Resume contains important job keywords",
  details: {
    matchedKeywords: ["JavaScript"],
    missingKeywords: ["MongoDB"],
  },
  meta: {
    source: "keywordEvaluator",
  },
  ...overrides,
});

test("accepts a valid evaluator result object", () => {
  const result = validateEvaluatorResult(validResult());

  const expected = validResult();
  expected.details.feedback = [];
  expected.details.suggestions = [];

  assert.deepEqual(result, expected);
});

test("applies defaults for optional summary, details, and meta fields", () => {
  const result = validateEvaluatorResult({
    key: "experienceMatch",
    label: "Experience Match",
    score: 100,
    weight: 0.2,
    weightedScore: 20,
  });

  assert.equal(result.summary, "");
  assert.deepEqual(result.details, { feedback: [], suggestions: [] });
  assert.deepEqual(result.meta, {});
});

test("rejects an invalid evaluator result object", () => {
  assert.throws(
    () =>
      validateEvaluatorResult({
        ...validResult({
          key: "",
          score: 101,
          weight: -1,
        }),
        unexpectedField: true,
      }),
    (error) => {
      assert.ok(error.issues.some((issue) => issue.path.join(".") === "key"));
      assert.ok(error.issues.some((issue) => issue.path.join(".") === "score"));
      assert.ok(error.issues.some((issue) => issue.path.join(".") === "weight"));
      assert.ok(error.issues.some((issue) => issue.code === "unrecognized_keys"));
      return true;
    },
  );
});

