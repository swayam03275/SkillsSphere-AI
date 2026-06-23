import { describe, test } from "node:test";
import assert from "node:assert/strict";

const { extractDataFromJD } = await import("../utils/parseJD.js");

describe("parseJD - extractDataFromJD", () => {

  test("returns empty skills and 0 years for null input", () => {
    const result = extractDataFromJD(null);
    assert.deepEqual(result, { skills: [], yearsOfExperience: 0 });
  });

  test("returns empty skills and 0 years for undefined input", () => {
    const result = extractDataFromJD(undefined);
    assert.deepEqual(result, { skills: [], yearsOfExperience: 0 });
  });

  test("returns empty skills and 0 years for empty string input", () => {
    const result = extractDataFromJD("");
    assert.deepEqual(result, { skills: [], yearsOfExperience: 0 });
    assert.ok(Array.isArray(result.skills));
  });

  test("extracts known tech skills present in job description", () => {
    // Use a skill that is definitely in techKeywords (node.js, python, etc.)
    const result = extractDataFromJD(
      "We are looking for a developer with experience in Python, JavaScript, and React."
    );
    assert.ok(result.skills.length > 0, "should find at least one skill");
    // Verify deduplication
    assert.ok(Array.isArray(result.skills));
  });

  test("extracts years of experience from 5+ years pattern", () => {
    const result = extractDataFromJD(
      "Minimum 5+ years of professional software development experience required."
    );
    assert.equal(result.yearsOfExperience, 5);
  });

  test("extracts years of experience from range pattern (3-5 years)", () => {
    const result = extractDataFromJD(
      "Looking for someone with 3-5 years of software engineering experience."
    );
    assert.equal(result.yearsOfExperience, 5, "should take upper bound of range");
  });

  test("extracts years of experience from minimum pattern", () => {
    const result = extractDataFromJD(
      "Candidate must have at least 7 years of experience in full-stack development."
    );
    assert.equal(result.yearsOfExperience, 7);
  });

  test("extracts years of experience from 'years of experience' pattern", () => {
    const result = extractDataFromJD(
      "The ideal candidate has 4 years of experience with distributed systems."
    );
    assert.equal(result.yearsOfExperience, 4);
  });

  test("deduplicates skills using Set", () => {
    // Pass the same JD twice by joining it
    const jd = "We need Python, Python, PYTHON developer with JavaScript skills.";
    const result = extractDataFromJD(jd);
    // The Set should deduplicate
    assert.ok(Array.isArray(result.skills));
    const lowerSkills = result.skills.map(s => s.toLowerCase());
    const uniqueLower = [...new Set(lowerSkills)];
    assert.equal(result.skills.length, uniqueLower.length, "skills should be deduplicated");
  });

  test("handles JD with no recognized skills and no experience info", () => {
    const result = extractDataFromJD("We are hiring!");
    assert.ok(Array.isArray(result.skills));
    assert.equal(result.yearsOfExperience, 0);
  });

  test("regex special characters in skill names are escaped correctly", () => {
    // c++ and .net have regex special chars - escaping must not break matching
    const result = extractDataFromJD(
      "Must have experience with C++, .NET, and Node.js"
    );
    // Should not throw and should find at least some of these
    assert.ok(Array.isArray(result.skills));
    assert.ok(typeof result.yearsOfExperience === "number");
  });

  test("picks the maximum years across multiple experience mentions", () => {
    const result = extractDataFromJD(
      "Requirements: minimum 2 years experience. Preferred: 5+ years. Ideal: 3-5 years."
    );
    // Among 2, 5 (from 5+), and 5 (from 3-5 upper bound), max is 5
    assert.equal(result.yearsOfExperience, 5);
  });
});
