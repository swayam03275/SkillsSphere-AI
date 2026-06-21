import assert from "node:assert/strict";
import test from "node:test";
import { cleanJDText } from "../cleanText.js";

test("cleanJDText removes bullet characters from input", () => {
  const result = cleanJDText("• First item\n- Second item\n* Third item");
  assert.equal(result.includes("First item"), true);
  assert.equal(result.includes("Second item"), true);
  assert.equal(result.includes("Third item"), true);
  assert.equal(result.includes("•"), false);
  assert.equal(result.includes("-"), false);
  assert.equal(result.includes("*"), false);
});

test("cleanJDText replaces newlines with spaces", () => {
  const result = cleanJDText("Line one\nLine two\nLine three");
  assert.equal(result.includes("\n"), false);
  assert.equal(result.includes("Line one Line two Line three"), true);
});

test("cleanJDText collapses multiple newlines to single space", () => {
  const result = cleanJDText("Start\r\n\r\n\r\nEnd");
  assert.equal(result, "Start End");
});

test("cleanJDText collapses multiple spaces to single space", () => {
  const result = cleanJDText("Word     multiple   spaces");
  assert.equal(result, "Word multiple spaces");
});

test("cleanJDText trims leading and trailing whitespace", () => {
  const result = cleanJDText("  \n  Hello World  \n  ");
  assert.equal(result, "Hello World");
});

test("cleanJDText returns empty string for empty input", () => {
  assert.equal(cleanJDText(""), "");
});

test("cleanJDText returns empty string for whitespace-only input", () => {
  assert.equal(cleanJDText("   \n\n   "), "");
});

test("cleanJDText returns empty string for non-string input", () => {
  assert.equal(cleanJDText(null), "");
  assert.equal(cleanJDText(undefined), "");
  assert.equal(cleanJDText(123), "");
  assert.equal(cleanJDText({}), "");
});

test("cleanJDText handles mixed bullet and whitespace content", () => {
  const result = cleanJDText("  •  Clean\n\n\n\n  -  This   \n\n  *  Up  ");
  assert.equal(result, "Clean This Up");
});
