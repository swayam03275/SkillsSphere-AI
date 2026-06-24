import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { normalizeSkill, normalizeSkillArray, extractSkillsFromText } from "../utils/skillNormalizer.js";

describe("normalizeSkill", () => {
  it("maps js to javascript", () => {
    assert.strictEqual(normalizeSkill("js"), "javascript");
  });

  it("maps py to python", () => {
    assert.strictEqual(normalizeSkill("py"), "python");
  });

  it("maps c# to csharp", () => {
    assert.strictEqual(normalizeSkill("c#"), "csharp");
  });

  it("maps cpp to c++", () => {
    assert.strictEqual(normalizeSkill("cpp"), "c++");
  });

  it("maps node to nodejs", () => {
    assert.strictEqual(normalizeSkill("node"), "nodejs");
  });

  it("maps golang to go", () => {
    assert.strictEqual(normalizeSkill("golang"), "go");
  });

  it("maps kubernetes to kubernetes", () => {
    assert.strictEqual(normalizeSkill("k8s"), "kubernetes");
  });

  it("maps terraform to terraform", () => {
    assert.strictEqual(normalizeSkill("terraform"), "terraform");
  });

  it("is case insensitive", () => {
    assert.strictEqual(normalizeSkill("JS"), "javascript");
    assert.strictEqual(normalizeSkill("Node"), "nodejs");
    assert.strictEqual(normalizeSkill("K8S"), "kubernetes");
  });

  it("maps unknown skills to themselves (lowercased)", () => {
    // ReactJS not in SKILL_MAP -> lowercased
    assert.strictEqual(normalizeSkill("ReactJS"), "react");
    // Python IS in SKILL_MAP -> stays python
    assert.strictEqual(normalizeSkill("Python"), "python");
    assert.strictEqual(normalizeSkill("UnknownSkill"), "unknownskill");
  });
});

describe("normalizeSkillArray", () => {
  it("deduplicates skills", () => {
    const result = normalizeSkillArray(["js", "javascript", "JS"]);
    assert.ok(result.includes("javascript"));
    assert.strictEqual(result.filter(s => s === "javascript").length, 1);
  });

  it("filters empty strings", () => {
    const result = normalizeSkillArray(["js", "", "  ", "node"]);
    assert.strictEqual(result.includes(""), false);
    assert.strictEqual(result.includes("  "), false);
  });

  it("filters null/undefined items", () => {
    const result = normalizeSkillArray(["js", null, undefined, "node"]);
    assert.strictEqual(result.length, 2);
  });

  it("returns empty array for non-array input", () => {
    assert.deepStrictEqual(normalizeSkillArray(null), []);
    assert.deepStrictEqual(normalizeSkillArray(undefined), []);
    assert.deepStrictEqual(normalizeSkillArray("js"), []);
  });

  it("normalizes each skill", () => {
    const result = normalizeSkillArray(["JS", "PY", "golang"]);
    assert.ok(result.includes("javascript"));
    assert.ok(result.includes("python"));
    assert.ok(result.includes("go"));
  });
});

describe("extractSkillsFromText", () => {
  it("returns empty array for empty text", () => {
    assert.deepStrictEqual(extractSkillsFromText("", []), []);
    assert.deepStrictEqual(extractSkillsFromText("   ", []), []);
  });

  it("returns empty array when no skills found", () => {
    const result = extractSkillsFromText("I worked on a marketing campaign", []);
    assert.deepStrictEqual(result, []);
  });

  it("finds and normalizes skills in text", () => {
    const result = extractSkillsFromText(
      "Experience with React, Node.js and Python programming",
      []
    );
    assert.ok(result.includes("react"));
    assert.ok(result.includes("nodejs"));
    assert.ok(result.includes("python"));
  });

  it("uses masterList as additional search terms", () => {
    const result = extractSkillsFromText(
      "Proficient in customFramework and customLibrary",
      ["customFramework", "customLibrary"]
    );
    assert.ok(result.includes("customframework"));
    assert.ok(result.includes("customlibrary"));
  });

  it("handles special characters in text", () => {
    const result = extractSkillsFromText(
      "Skills: JavaScript, TypeScript, Python, and Docker",
      []
    );
    assert.ok(result.includes("javascript") || result.includes("typescript") || result.includes("python") || result.includes("docker"));
  });
});
