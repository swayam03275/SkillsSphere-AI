import assert from "node:assert/strict";
import test from "node:test";
import fs from "fs/promises";
import path from "path";
import { parseResume } from "../parseResume.js";

const TEMP_RESUME_PATH = path.join(process.cwd(), "temp-test-resume.txt");

test("parseResume - rejects unsupported extension", async () => {
  await assert.rejects(
    parseResume("resume.png"),
    /Only PDF, DOCX, and TXT parsing is supported on \/analyze right now/
  );
});

test("parseResume - parses valid txt resume correctly", async () => {
  const resumeContent = `Jane Doe
jane.doe@example.com
1234567890
https://linkedin.com/in/janedoe
https://github.com/janedoe
https://janedoe.dev

Education
B.S. in Computer Science, Stanford University

Experience
Senior React Developer at Acme Corp
Designed and built features using React, Vue, Next.js, and Node.js

Projects
Interactive Chat System
Developed real-time communication platform using Docker and Git

Certifications
AWS Certified Solutions Architect
`;

  // Write temporary test file
  await fs.writeFile(TEMP_RESUME_PATH, resumeContent, "utf-8");

  try {
    const result = await parseResume(TEMP_RESUME_PATH);

    // Assert standard metadata
    assert.equal(result.name, "Jane Doe");
    assert.equal(result.email, "jane.doe@example.com");
    assert.equal(result.phone, "1234567890");
    assert.equal(result.linkedin, "https://linkedin.com/in/janedoe");
    assert.equal(result.github, "https://github.com/janedoe");
    assert.equal(result.portfolio, "https://janedoe.dev");

    // Assert skills extraction (case-insensitive keywords from techKeywords.json)
    assert.ok(result.skills.includes("react"));
    assert.ok(result.skills.includes("vue"));
    assert.ok(result.skills.includes("node.js"));
    assert.ok(result.skills.includes("next.js"));
    assert.ok(result.skills.includes("docker"));
    assert.ok(result.skills.includes("git"));

    // Assert section lines extraction
    assert.deepEqual(result.education, ["B.S. in Computer Science, Stanford University"]);
    assert.deepEqual(result.experience, [
      "Senior React Developer at Acme Corp",
      "Designed and built features using React, Vue, Next.js, and Node.js"
    ]);
    assert.deepEqual(result.projects, [
      "Interactive Chat System",
      "Developed real-time communication platform using Docker and Git"
    ]);
    assert.deepEqual(result.certifications, ["AWS Certified Solutions Architect"]);
    
    assert.ok(result.resumeText.includes("Jane Doe"));
    assert.ok(result.extractedTextLength > 0);
  } finally {
    // Cleanup temporary test file
    await fs.unlink(TEMP_RESUME_PATH).catch(() => {});
  }
});
