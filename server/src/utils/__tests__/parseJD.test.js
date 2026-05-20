import assert from "node:assert/strict";
import test from "node:test";
import { extractDataFromJD } from "../parseJD.js";

test("extractDataFromJD - handles null, undefined, and empty string", () => {
  const emptyResult1 = extractDataFromJD(null);
  assert.deepEqual(emptyResult1, { skills: [], yearsOfExperience: 0 });

  const emptyResult2 = extractDataFromJD(undefined);
  assert.deepEqual(emptyResult2, { skills: [], yearsOfExperience: 0 });

  const emptyResult3 = extractDataFromJD("");
  assert.deepEqual(emptyResult3, { skills: [], yearsOfExperience: 0 });
});

test("extractDataFromJD - extracts skills accurately", () => {
  const text = "We need a strong React developer who also knows Node.js, Docker, and Kubernetes.";
  const result = extractDataFromJD(text);
  
  // React, node.js, docker, kubernetes should be present
  assert.ok(result.skills.includes("react"));
  assert.ok(result.skills.includes("node.js"));
  assert.ok(result.skills.includes("docker"));
  assert.ok(result.skills.includes("kubernetes"));
  
  // Vue should not be present
  assert.equal(result.skills.includes("vue"), false);
});

test("extractDataFromJD - handles special regex characters in skill names", () => {
  // Test node.js specifically, making sure '.' is escaped and doesn't match other characters
  const textMatches = "We need node.js skills.";
  const resultMatches = extractDataFromJD(textMatches);
  assert.ok(resultMatches.skills.includes("node.js"));

  const textNoMatch = "We need node-js skills but not the dot version.";
  const resultNoMatch = extractDataFromJD(textNoMatch);
  assert.equal(resultNoMatch.skills.includes("node.js"), false);
});

test("extractDataFromJD - parses different experience patterns", () => {
  // Pattern 1: 5+ years
  const res1 = extractDataFromJD("Requires 5+ years of experience");
  assert.equal(res1.yearsOfExperience, 5);

  // Pattern 2: 3-5 years (regex extracts 5 from second half matching pattern 4)
  const res2 = extractDataFromJD("3-5 years of experience");
  assert.equal(res2.yearsOfExperience, 5);

  // Pattern 3: minimum 2 years / min 2 years / at least 2 years
  const res3 = extractDataFromJD("minimum 2 years of frontend work");
  assert.equal(res3.yearsOfExperience, 2);

  // Pattern 4: 4 years of experience
  const res4 = extractDataFromJD("We want someone with 4 years of experience.");
  assert.equal(res4.yearsOfExperience, 4);
});

test("extractDataFromJD - takes the maximum of multiple experience requirements", () => {
  const text = "The ideal candidate has 3-5 years of frontend development and at least 6 years of general coding experience.";
  const result = extractDataFromJD(text);
  // Max of 3 (from 3-5) and 6 (from at least 6) is 6
  assert.equal(result.yearsOfExperience, 6);
});
