import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const venvPath = path.join(__dirname, "..", "interview-ai-service", "venv");

if (!fs.existsSync(venvPath)) {
  console.error(
    `${RED}❌ Error: Python virtual environment not found!${RESET}\n`,
  );
  console.warn(
    `${YELLOW}The interview-ai-service requires manual setup before running the dev server.`,
  );
  console.warn(`Please run the following commands to initialize it:${RESET}\n`);
  console.log("  cd interview-ai-service");
  console.log("  python -m venv venv");
  console.log("  (Activate the venv based on your OS)");
  console.log("  pip install -r requirements.txt");
  console.log("  python -m spacy download en_core_web_sm\n");
  console.warn(
    `${YELLOW}Alternatively, use Docker: 'docker-compose up --build'${RESET}\n`,
  );
  process.exit(1);
}
console.log("✅ Python virtual environment detected. Starting services...");
