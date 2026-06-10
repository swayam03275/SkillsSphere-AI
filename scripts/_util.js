import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, "..");
export const isWindows = process.platform === "win32";

export function npmCommand() {
  return isWindows ? "npm.cmd" : "npm";
}

export function pythonBootstrapCommand() {
  // Used only to CREATE the venv.
  // Prefer `python` when present; on Windows, `py` is often available.
  const candidates = isWindows
    ? process.env.PYTHON
      ? [process.env.PYTHON]
      : ["python", "py"]
    : process.env.PYTHON
      ? [process.env.PYTHON]
      : ["python3", "python"];

  for (const cmd of candidates) {
    const res = spawnSync(cmd, ["--version"], {
      stdio: "ignore",
      shell: isWindows && (cmd.endsWith(".cmd") || cmd.endsWith(".bat")),
    });
    if (res.status === 0) return cmd;
  }

  return candidates[0];
}

export function venvPythonPath(serviceDir) {
  return isWindows
    ? path.join(serviceDir, "venv", "Scripts", "python.exe")
    : path.join(serviceDir, "venv", "bin", "python");
}

export function run(cmd, args, options = {}) {
  const { cwd, env, label } = options;

  return new Promise((resolve, reject) => {
    const useShell = isWindows && (
      cmd.endsWith(".cmd") ||
      cmd.endsWith(".bat") ||
      cmd === "npm" ||
      cmd === "npm.cmd"
    );
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: "inherit",
      shell: useShell, // helps resolve npm shims on Windows
    });

    child.on("error", (err) => {
      reject(err);
    });

    child.on("exit", (code, signal) => {
      if (code === 0) return resolve();
      const prefix = label ? `[${label}] ` : "";
      reject(
        new Error(
          `${prefix}Command failed (${code ?? "no-code"}${signal ? `, ${signal}` : ""}): ${cmd} ${args.join(" ")}`,
        ),
      );
    });
  });
}

export function printHeader(text) {
  // eslint-disable-next-line no-console
  console.log(`\n=== ${text} ===`);
}
