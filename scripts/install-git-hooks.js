#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const hooksDir = path.join(repoRoot, ".git", "hooks");
const hookPath = path.join(hooksDir, "pre-commit");
const markerStart = "# SkillsSphere secret protection start";
const markerEnd = "# SkillsSphere secret protection end";
const hookBlock = `${markerStart}
node scripts/prevent-env-commit.js
${markerEnd}`;

if (!fs.existsSync(path.join(repoRoot, ".git"))) {
  console.error("Cannot install git hook: .git directory was not found.");
  process.exit(1);
}

fs.mkdirSync(hooksDir, { recursive: true });

let currentHook = "";
if (fs.existsSync(hookPath)) {
  currentHook = fs.readFileSync(hookPath, "utf8");
}

if (currentHook.includes(markerStart)) {
  console.log("pre-commit hook is already installed.");
  process.exit(0);
}

const shebang = currentHook.startsWith("#!") ? "" : "#!/bin/sh\n";
const nextHook = `${shebang}${currentHook.trimEnd()}

${hookBlock}
`;

fs.writeFileSync(hookPath, nextHook, { mode: 0o755 });
console.log("Installed pre-commit hook for .env secret protection.");
