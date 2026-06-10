import fs from "node:fs";
import path from "node:path";
import {
  printHeader,
  pythonBootstrapCommand,
  repoRoot,
  run,
  venvPythonPath,
} from "./_util.js";

const serviceDir = path.join(repoRoot, "interview-ai-service");
const requirementsPath = path.join(serviceDir, "requirements.txt");
const venvPython = venvPythonPath(serviceDir);

function usage() {
  // eslint-disable-next-line no-console
  console.log("Usage: node scripts/python-setup.js");
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  usage();
  process.exit(0);
}

if (!fs.existsSync(serviceDir)) {
  // eslint-disable-next-line no-console
  console.error("Missing interview-ai-service/ directory.");
  process.exit(1);
}

if (!fs.existsSync(requirementsPath)) {
  // eslint-disable-next-line no-console
  console.error("Missing interview-ai-service/requirements.txt.");
  process.exit(1);
}

async function main() {
  printHeader("Python: interview-ai-service setup");

  if (!fs.existsSync(venvPython)) {
    printHeader("Creating virtual environment (interview-ai-service/venv)");
    const py = pythonBootstrapCommand();
    await run(py, ["-m", "venv", "venv"], {
      cwd: serviceDir,
      label: "python-venv",
    });
  }

  printHeader("Installing Python dependencies");
  await run(venvPython, ["-m", "pip", "install", "--upgrade", "pip"], {
    cwd: serviceDir,
    label: "pip-upgrade",
  });
  await run(venvPython, ["-m", "pip", "install", "-r", "requirements.txt"], {
    cwd: serviceDir,
    label: "pip",
  });

  printHeader("Downloading spaCy model (en_core_web_sm)");
  await run(venvPython, ["-m", "spacy", "download", "en_core_web_sm"], {
    cwd: serviceDir,
    label: "spacy",
  });

  printHeader("Python setup complete");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err?.message || err);
  process.exit(1);
});
