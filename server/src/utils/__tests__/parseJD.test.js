import assert from "node:assert/strict";
import test from "node:test";
import { extractDataFromJD } from "../parseJD.js";

test("extractDataFromJD returns empty arrays for null/undefined input", () => {
  const result1 = extractDataFromJD(null);
  assert.deepEqual(result1, { skills: [], yearsOfExperience: 0 });

  const result2 = extractDataFromJD(undefined);
  assert.deepEqual(result1, { skills: [], yearsOfExperience: 0 });

  const result3 = extractDataFromJD("");
  assert.deepEqual(result3, { skills: [], yearsOfExperience: 0 });
});

test("extractDataFromJD extracts skills from tech keywords in job description", () => {
  const result = extractDataFromJD("We are looking for Python developers with JavaScript and React experience");
  assert.ok(result.skills.length > 0, "Should match at least one skill keyword");
  assert.ok(result.skills.includes("Python") || result.skills.includes("python"), "Should match Python");
});

test("extractDataFromJD extracts 5+ years experience pattern", () => {
  const result = extractDataFromJD("We need a senior engineer with 5+ years of experience in backend development");
  assert.equal(result.yearsOfExperience, 5);
});

test("extractDataFromJD extracts range years experience (3-5 years)", () => {
  const result = extractDataFromJD("Required: 3-5 years of professional software engineering experience");
  assert.equal(result.yearsOfExperience, 5, "Should take the upper bound of the range");
});

test("extractDataFromJD extracts minimum years experience", () => {
  const result = extractDataFromJD("Minimum 2 years of experience with database systems required");
  assert.equal(result.yearsOfExperience, 2);
});

test("extractDataFromJD extracts experience with 'years of experience' phrasing", () => {
  const result = extractDataFromJD("Candidate must have 3 years of experience in machine learning");
  assert.equal(result.yearsOfExperience, 3);
});

test("extractDataFromJD returns the maximum years when multiple patterns match", () => {
  const result = extractDataFromJD(
    "Looking for someone with 2+ years in Python and 5+ years overall in software development"
  );
  // Should capture 2 from "2+ years" and 5 from "5+ years" — max is 5
  assert.equal(result.yearsOfExperience, 5);
});

test("extractDataFromJD deduplicates matched skills", () => {
  const result = extractDataFromJD(
    "Seeking a developer with JavaScript skills. Strong JavaScript knowledge is a plus."
  );
  const jsCount = result.skills.filter(s => s.toLowerCase() === "javascript").length;
  assert.ok(jsCount <= 1, "JavaScript should appear only once in skills list");
});
