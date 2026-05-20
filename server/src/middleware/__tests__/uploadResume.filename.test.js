import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStoredFilename,
  sanitizeResumeFilenameStem,
} from "../uploadResume.js";

test("sanitizeResumeFilenameStem strips traversal and unsafe punctuation", () => {
  assert.equal(
    sanitizeResumeFilenameStem("../../../../Jane Doe Resume (Final)!?.PDF"),
    "Jane-Doe-Resume-Final"
  );
});

test("sanitizeResumeFilenameStem removes diacritics and control characters", () => {
  assert.equal(
    sanitizeResumeFilenameStem("Ren\u00e9e\n\tSenior Resume.docx"),
    "Renee-Senior-Resume"
  );
});

test("sanitizeResumeFilenameStem falls back when the stem is empty", () => {
  assert.equal(sanitizeResumeFilenameStem("....pdf"), "resume");
  assert.equal(sanitizeResumeFilenameStem(""), "resume");
});

test("sanitizeResumeFilenameStem caps long names for portable filenames", () => {
  const stem = sanitizeResumeFilenameStem(`${"a".repeat(120)}.pdf`);

  assert.equal(stem.length, 80);
  assert.match(stem, /^[a-zA-Z0-9._-]+$/);
});

test("buildStoredFilename preserves a safe stem and lowercases extension", () => {
  const originalNow = Date.now;
  Date.now = () => 1710000000000;

  try {
    assert.equal(
      buildStoredFilename("../../../My Resume.PDF"),
      "1710000000000-My-Resume.pdf"
    );
  } finally {
    Date.now = originalNow;
  }
});
