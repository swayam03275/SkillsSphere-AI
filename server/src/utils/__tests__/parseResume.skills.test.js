import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { hasSkillToken, parseResume } from "../parseResume.js";

test("hasSkillToken matches standalone technical skills", () => {
  assert.equal(hasSkillToken("Built dashboards with React and Node.js.", "react"), true);
  assert.equal(hasSkillToken("Built dashboards with React and Node.js.", "node.js"), true);
});

test("hasSkillToken ignores embedded word false positives", () => {
  assert.equal(hasSkillToken("Built reactive user interfaces.", "react"), false);
  assert.equal(hasSkillToken("Experience with JavaScript applications.", "java"), false);
});

test("parseResume extracts standalone skills from TXT content without embedded false positives", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "resume-skills-"));
  const resumePath = path.join(tempDir, "resume.txt");

  await fs.writeFile(
    resumePath,
    [
      "Jane Candidate",
      "jane@example.com",
      "Skills",
      "React, Node.js, JavaScript",
      "Summary",
      "Builds reactive interfaces and JVM-adjacent tooling.",
    ].join("\n"),
    "utf8"
  );

  try {
    const parsed = await parseResume(resumePath);

    assert.ok(parsed.skills.includes("react"));
    assert.ok(parsed.skills.includes("node.js"));
    assert.ok(parsed.skills.includes("javascript"));
    assert.equal(parsed.skills.includes("java"), false);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
