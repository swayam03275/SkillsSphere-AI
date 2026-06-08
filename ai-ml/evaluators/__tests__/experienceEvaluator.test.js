import test from "node:test";
import assert from "node:assert/strict";
import {
  experienceEvaluator,
  extractExperienceInYears,
} from "../experienceEvaluator.js";

test("extractExperienceInYears handles years, months, and combined values", () => {
  assert.equal(extractExperienceInYears("Need 3+ years experience"), 3);
  assert.equal(extractExperienceInYears("Worked for 18 months"), 1.5);
  assert.equal(extractExperienceInYears("Total 1 year 6 months"), 1.5);
  assert.equal(extractExperienceInYears("No experience number"), 0);
});

test("exact experience match returns 100", () => {
  const result = experienceEvaluator({
    candidateExperienceText: "2 years",
    jobDescription: "Need 2 years of experience",
  });

  assert.equal(result.score, 100);
  assert.equal(result.details.requiredExperience, 2);
  assert.equal(result.details.candidateExperience, 2);
  assert.equal(result.details.experienceGap, 0);
});

test("partial match returns ratio-based score", () => {
  const result = experienceEvaluator({
    candidateExperienceText: "1 year",
    jobDescription: "Need 3 years of experience",
  });

  assert.equal(result.score, 43.87);
  assert.equal(result.details.experienceGap, 2);
  assert.ok(
    result.details.feedback.some(f => f.includes("Candidate has significantly less experience than required"))
  );
});

test("months conversion can exceed required years", () => {
  const result = experienceEvaluator({
    candidateExperienceText: "18 months",
    jobDescription: "Need 1 year of experience",
  });

  assert.equal(result.details.candidateExperience, 1.5);
  assert.equal(result.details.requiredExperience, 1);
  assert.equal(result.score, 100);
});

test("combined year and month expression is parsed correctly", () => {
  const result = experienceEvaluator({
    candidateExperienceText: "1 year 6 months",
    jobDescription: "Need 2 years of experience",
  });

  assert.equal(result.details.candidateExperience, 1.5);
  assert.equal(result.details.requiredExperience, 2);
  assert.equal(result.score, 80.59);
  assert.equal(result.details.experienceGap, 0.5);
});

test("missing JD experience returns 0 with guidance feedback", () => {
  const result = experienceEvaluator({
    candidateExperienceText: "2 years",
    jobDescription: "Looking for a React developer",
  });

  assert.equal(result.score, 100); // Because requiredYears is 0
  assert.equal(result.details.requiredExperience, 0);
  assert.ok(
    result.details.feedback.some(f => f.includes("Could not detect required experience from the job description"))
  );
});
