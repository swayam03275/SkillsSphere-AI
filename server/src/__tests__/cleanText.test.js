import test from "node:test";
import assert from "node:assert/strict";
import { cleanJDText } from "../utils/cleanText.js";

test("cleanJDText removes dash bullet points", () => {
  const result = cleanJDText("Experience with React - 3 years");
  assert.equal(result, "Experience with React 3 years");
});

test("cleanJDText removes asterisk bullet points", () => {
  const result = cleanJDText("Strong communication * team player * leader");
  assert.equal(result, "Strong communication team player leader");
});

test("cleanJDText removes bullet point characters", () => {
  const result = cleanJDText("Required skills: JavaScript, Python, SQL");
  assert.equal(result, "Required skills: JavaScript, Python, SQL");
});

test("cleanJDText replaces newlines with spaces", () => {
  const result = cleanJDText("Line one\nLine two\rLine three");
  assert.equal(result, "Line one Line two Line three");
});

test("cleanJDText collapses multiple spaces to single space", () => {
  const result = cleanJDText("Hello    world   foo   bar");
  assert.equal(result, "Hello world foo bar");
});

test("cleanJDText trims leading and trailing whitespace", () => {
  const result = cleanJDText("  Hello world  ");
  assert.equal(result, "Hello world");
});

test("cleanJDText returns empty string for null input", () => {
  assert.equal(cleanJDText(null), "");
});

test("cleanJDText returns empty string for undefined input", () => {
  assert.equal(cleanJDText(undefined), "");
});

test("cleanJDText returns empty string for non-string input", () => {
  assert.equal(cleanJDText(123), "");
  assert.equal(cleanJDText({}), "");
  assert.equal(cleanJDText([]), "");
});

test("cleanJDText returns empty string for empty string input", () => {
  assert.equal(cleanJDText(""), "");
});

test("cleanJDText handles combined bullets, newlines, and spaces", () => {
  const input = "  Required:\n- JavaScript\n- Node.js   * React  ";
  const result = cleanJDText(input);
  assert.equal(result, "Required: JavaScript Node.js React");
});

test("cleanJDText handles JD with multiple paragraphs", () => {
  const input = "About the role\n\nWe are looking for\n\nA great developer";
  const result = cleanJDText(input);
  assert.equal(result, "About the role We are looking for A great developer");
});

test("cleanJDText preserves punctuation other than bullets", () => {
  const input = "Skills: Python, Java; Frameworks: React.js. Tools: Git!";
  const result = cleanJDText(input);
  assert.equal(result, "Skills: Python, Java; Frameworks: React.js. Tools: Git!");
});