import assert from "node:assert/strict";
import test from "node:test";
import { cleanJDText } from "../cleanText.js";

test("cleanJDText - handles empty or non-string inputs", () => {
  assert.equal(cleanJDText(), "");
  assert.equal(cleanJDText(null), "");
  assert.equal(cleanJDText(undefined), "");
  assert.equal(cleanJDText(123), "");
  assert.equal(cleanJDText({}), "");
});

test("cleanJDText - removes newlines and replaces with spaces", () => {
  assert.equal(cleanJDText("Hello\nWorld"), "Hello World");
  assert.equal(cleanJDText("Hello\r\nWorld"), "Hello World");
  assert.equal(cleanJDText("Line 1\nLine 2\r\nLine 3"), "Line 1 Line 2 Line 3");
});

test("cleanJDText - normalizes multiple whitespace to single space", () => {
  assert.equal(cleanJDText("Hello      World"), "Hello World");
  assert.equal(cleanJDText("   Hello   World   "), "Hello World");
});

test("cleanJDText - strips bullet points", () => {
  assert.equal(cleanJDText("• First Point"), "First Point");
  assert.equal(cleanJDText("- Second Point"), "Second Point");
  assert.equal(cleanJDText("* Third Point"), "Third Point");
  assert.equal(
    cleanJDText("• Bullet one\n- Bullet two\n* Bullet three"),
    "Bullet one Bullet two Bullet three"
  );
});

test("cleanJDText - trims final text properly", () => {
  assert.equal(cleanJDText("   Hello World\n\n  "), "Hello World");
});
