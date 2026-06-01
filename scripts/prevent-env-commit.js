#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import path from "node:path";

const blockedEnvFilePattern = /(^|[/\\])\.env(\..*)?$/i;
const allowedExamples = new Set([".env.example", ".env.sample", ".env.template"]);

function normalize(filePath) {
  return filePath.split(path.sep).join("/");
}

function isBlockedEnvFile(filePath) {
  const normalized = normalize(filePath);
  const basename = path.basename(normalized).toLowerCase();

  if (allowedExamples.has(basename)) {
    return false;
  }

  return blockedEnvFilePattern.test(normalized);
}

function stagedFiles() {
  const output = execFileSync("git", ["diff", "--cached", "--name-only"], {
    encoding: "utf8",
  });

  return output
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean);
}

const blockedFiles = stagedFiles().filter(isBlockedEnvFile);

if (blockedFiles.length > 0) {
  console.error("Refusing to commit environment secret files:");
  for (const file of blockedFiles) {
    console.error(`  - ${file}`);
  }
  console.error("");
  console.error("Commit placeholders such as .env.example only. Keep real secrets local.");
  process.exit(1);
}
