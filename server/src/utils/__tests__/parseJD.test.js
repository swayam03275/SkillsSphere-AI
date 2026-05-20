import assert from "node:assert/strict";
import test from "node:test";
import { extractDataFromJD } from "../parseJD.js";

test("extractDataFromJD - returns safe defaults for invalid inputs", () => {
  const result = extractDataFromJD(null);
  assert.deepEqual(result.skills, []);
  assert.equal(result.yearsOfExperience, 0);

  const resultEmpty = extractDataFromJD("");
  assert.deepEqual(resultEmpty.skills, []);
  assert.equal(resultEmpty.yearsOfExperience, 0);
});

test("extractDataFromJD - extracts skills accurately ignoring case", () => {
  const jdText = "Looking for a Software Engineer proficient in React, Node.js, and Python.";
  const result = extractDataFromJD(jdText);

  // techKeywords includes react, node.js, python in lowercase
  assert.ok(result.skills.includes("react"));
  assert.ok(result.skills.includes("node.js"));
  assert.ok(result.skills.includes("python"));
});

test("extractDataFromJD - parses experience patterns correctly", () => {
  // Test case 1: 5+ years
  assert.equal(extractDataFromJD("Looking for someone with 5+ years of experience in JavaScript").yearsOfExperience, 5);

  // Test case 2: Range 3-5 years (take the lower bound or minimum required: match[1])
  assert.equal(extractDataFromJD("We require 3-5 years in Web Development").yearsOfExperience, 3);

  // Test case 3: min 2 years
  assert.equal(extractDataFromJD("minimum 2 years working with React").yearsOfExperience, 2);

  // Test case 4: 4 years of experience
  assert.equal(extractDataFromJD("Requires at least 4 years of experience").yearsOfExperience, 4);
});
