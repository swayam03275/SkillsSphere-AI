import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeSkill, normalizeSkillArray } from "../../utils/skillNormalizer.js";

// --- Helpers ---
function assertNormalized(input, expected) {
  assert.equal(
    normalizeSkill(input),
    expected,
    `normalizeSkill("${input}") expected "${expected}"`
  );
}

// =============================================
// 1. SYNONYM NORMALIZATION
// =============================================
await describe("synonym normalization", async () => {

  await it("normalizes JS aliases", () => {
    assertNormalized("JS", "javascript");
    assertNormalized("JavaScript", "javascript");
    assertNormalized("java script", "javascript");
    assertNormalized("JAVASCRIPT", "javascript");
  });

  await it("normalizes Node.js aliases", () => {
    assertNormalized("Node JS", "nodejs");
    assertNormalized("Node.js", "nodejs");
    assertNormalized("node-js", "nodejs");
    assertNormalized("node   js", "nodejs");
    assertNormalized("NodeJS", "nodejs");
  });

  await it("normalizes React aliases", () => {
    assertNormalized("ReactJS", "react");
    assertNormalized("React JS", "react");
    assertNormalized("React---JS", "react");
    assertNormalized(" ReactJS ", "react");
  });

  await it("normalizes special character languages", () => {
    assertNormalized("C#", "csharp");
    assertNormalized("c#", "csharp");
    assertNormalized(".NET", "dotnet");
    assertNormalized(".net", "dotnet");
    assertNormalized("C++", "c++");
    assertNormalized("c++", "c++");
  });

  await it("normalizes database aliases", () => {
    assertNormalized("MongoDB", "mongodb");
    assertNormalized("Mongo", "mongodb");
    assertNormalized("mongo db", "mongodb");
    assertNormalized("Postgres", "postgresql");
    assertNormalized("PostgreSQL", "postgresql");
    assertNormalized("pg", "postgresql");
  });

  await it("normalizes cloud/devops aliases", () => {
    assertNormalized("Amazon Web Services", "aws");
    assertNormalized("AWS", "aws");
    assertNormalized("GCP", "gcp");
    assertNormalized("Google Cloud", "gcp");
    assertNormalized("K8s", "kubernetes");
    assertNormalized("Kubernetes", "kubernetes");
  });
});

// =============================================
// 2. CASE & SPACING NORMALIZATION
// =============================================
await describe("case and spacing normalization", async () => {

  await it("strips leading and trailing whitespace", () => {
    assertNormalized("  python  ", "python");
    assertNormalized("\tJava\t", "java");
  });

  await it("collapses multiple internal spaces", () => {
    assertNormalized("node   js", "nodejs");
    assertNormalized("machine  learning", "machinelearning");
  });

  await it("strips hyphens and underscores", () => {
    assertNormalized("node-js", "nodejs");
    assertNormalized("node_js", "nodejs");
    assertNormalized("React---JS", "react");
  });

  await it("lowercases all output", () => {
    assertNormalized("PYTHON", "python");
    assertNormalized("DOCKER", "docker");
    assertNormalized("TypeScript", "typescript");
  });
});

// =============================================
// 3. FALLBACK BEHAVIOR
// =============================================
await describe("fallback normalization for unknown skills", async () => {

  await it("strips spaces from unknown skills", () => {
    assertNormalized("Super Skill", "superskill");
    assertNormalized("Super-Skill", "superskill");
  });

  await it("lowercases unknown skills", () => {
    assertNormalized("UNKNOWNSKILL", "unknownskill");
    assertNormalized("CustomFramework", "customframework");
  });

  await it("handles empty string without throwing", () => {
    assert.doesNotThrow(() => normalizeSkill(""));
  });

  await it("handles whitespace-only string without throwing", () => {
    assert.doesNotThrow(() => normalizeSkill("   "));
  });

  await it("handles null-like input gracefully", () => {
    assert.doesNotThrow(() => normalizeSkill(null ?? ""));
    assert.doesNotThrow(() => normalizeSkill(undefined ?? ""));
  });
});

// =============================================
// 4. normalizeSkillArray BEHAVIOR
// =============================================
await describe("normalizeSkillArray", async () => {

  await it("deduplicates skills that normalize to the same value", () => {
    const result = normalizeSkillArray(["JS", "JavaScript", "java script"]);
    assert.deepEqual(result, ["javascript"]);
  });

  await it("deduplicates Node.js aliases", () => {
    const result = normalizeSkillArray(["Node", "Node.js", "NodeJS", "node-js"]);
    assert.deepEqual(result, ["nodejs"]);
  });

  await it("preserves order of first occurrence after dedup", () => {
    const result = normalizeSkillArray(["Python", "JS", "JavaScript"]);
    assert.deepEqual(result, ["python", "javascript"]);
  });

  await it("returns empty array for empty input", () => {
    const result = normalizeSkillArray([]);
    assert.deepEqual(result, []);
  });

  await it("handles array with empty strings without throwing", () => {
    assert.doesNotThrow(() => normalizeSkillArray(["", "  ", "python"]));
  });

  await it("filters out empty/whitespace entries after normalization", () => {
    const result = normalizeSkillArray(["", "  ", "python"]);
    assert.ok(result.includes("python"));
    assert.ok(!result.includes(""));
  });
});

// =============================================
// 5. CROSS-ARRAY MATCHING (resume vs JD)
// =============================================
await describe("resume vs job description skill matching", async () => {

  await it("matches all 3 skills across alias variants", () => {
    const resume = normalizeSkillArray(["JS", "Node", "Mongo"]);
    const jd = normalizeSkillArray(["JavaScript", "Node.js", "MongoDB"]);
    const matched = resume.filter((s) => jd.includes(s));
    assert.equal(matched.length, 3);
  });

  await it("matches C# and .NET across case variants", () => {
    const resume = normalizeSkillArray(["c#", ".net", "C++"]);
    const jd = normalizeSkillArray(["CSharp", ".NET", "cpp"]);
    const matched = resume.filter((s) => jd.includes(s));
    assert.equal(matched.length, 3);
  });

  await it("returns zero matches for completely unrelated skill sets", () => {
    const resume = normalizeSkillArray(["Python", "Django", "PostgreSQL"]);
    const jd = normalizeSkillArray(["React", "Node.js", "MongoDB"]);
    const matched = resume.filter((s) => jd.includes(s));
    assert.equal(matched.length, 0);
  });

  await it("handles partial overlap correctly", () => {
    const resume = normalizeSkillArray(["Python", "React", "Docker"]);
    const jd = normalizeSkillArray(["Python", "Node.js", "Docker"]);
    const matched = resume.filter((s) => jd.includes(s));
    assert.equal(matched.length, 2);
  });

  await it("handles empty resume against populated JD", () => {
    const resume = normalizeSkillArray([]);
    const jd = normalizeSkillArray(["Python", "React"]);
    const matched = resume.filter((s) => jd.includes(s));
    assert.equal(matched.length, 0);
  });
});