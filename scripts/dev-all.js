import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { npmCommand, repoRoot, venvPythonPath } from "./_util.js";

function usage() {
  // eslint-disable-next-line no-console
  console.log("Usage: node scripts/dev-all.js");
  // eslint-disable-next-line no-console
  console.log(
    "Starts: client (vite), server (node), and interview-ai-service (uvicorn).",
  );
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  usage();
  process.exit(0);
}

const npm = npmCommand();
const clientDir = path.join(repoRoot, "client");
const serverDir = path.join(repoRoot, "server");
const serviceDir = path.join(repoRoot, "interview-ai-service");
const venvPython = venvPythonPath(serviceDir);

function spawnProc(label, cmd, args, cwd) {
  // eslint-disable-next-line no-console
  console.log(`\n[${label}] ${cmd} ${args.join(" ")}`);

  const useShell = process.platform === "win32" && (
    cmd.endsWith(".cmd") ||
    cmd.endsWith(".bat") ||
    cmd === "npm" ||
    cmd === "npm.cmd"
  );
  const child = spawn(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: useShell,
    env: { ...process.env },
  });

  child.on("exit", (code) => {
    // eslint-disable-next-line no-console
    console.log(`\n[${label}] exited with code ${code}`);
  });

  return child;
}

const children = [];

if (fs.existsSync(clientDir)) {
  children.push(spawnProc("client", npm, ["run", "dev"], clientDir));
}

if (fs.existsSync(serverDir)) {
  children.push(spawnProc("server", npm, ["run", "dev"], serverDir));
}

if (!fs.existsSync(venvPython)) {
  // eslint-disable-next-line no-console
  console.error("\n[python] venv not found. Run: npm run install-all");
  process.exit(1);
}

children.push(
  spawnProc(
    "python",
    venvPython,
    ["-m", "uvicorn", "main:app", "--reload", "--port", "8000"],
    serviceDir,
  ),
);

function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`\nShutting down (${signal})...`);
  for (const child of children) {
    try {
      child.kill("SIGINT");
    } catch {
      // ignore
    }
  }

  // Give children a moment to handle SIGINT, then exit.
  setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
