// Utility script to install all repository dependencies
import fs from "node:fs";
import path from "node:path";
import { npmCommand, printHeader, repoRoot, run } from "./_util.js";

function usage() {
  // eslint-disable-next-line no-console
  console.log("Usage: node scripts/install-all.js");
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  usage();
  process.exit(0);
}

const npm = npmCommand();

const clientDir = path.join(repoRoot, "client");
const serverDir = path.join(repoRoot, "server");
const aimlDir = path.join(repoRoot, "ai-ml");

async function main() {
  printHeader("Root: installing dependencies");
  await run(npm, ["install"], { cwd: repoRoot, label: "root" });

  if (fs.existsSync(clientDir)) {
    printHeader("Client: installing dependencies");
    await run(npm, ["install"], { cwd: clientDir, label: "client" });
  }

  if (fs.existsSync(serverDir)) {
    printHeader("Server: installing dependencies");
    await run(npm, ["install"], { cwd: serverDir, label: "server" });
  }

  if (fs.existsSync(aimlDir)) {
    printHeader("AI-ML: installing dependencies");
    await run(npm, ["install"], { cwd: aimlDir, label: "ai-ml" });
  }

  printHeader("Python: installing dependencies");
  await run("node", ["scripts/python-setup.js"], {
    cwd: repoRoot,
    label: "python",
  });

  printHeader("All dependencies installed");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err?.message || err);
  process.exit(1);
});
