import { printHeader, repoRoot, run } from "./_util.js";

function usage() {
  // eslint-disable-next-line no-console
  console.log("Usage: node scripts/quickstart.js");
  // eslint-disable-next-line no-console
  console.log(
    "Installs all dependencies and starts client + server + python service.",
  );
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  usage();
  process.exit(0);
}

async function main() {
  printHeader("Quickstart");
  await run(process.execPath, ["scripts/install-all.js"], {
    cwd: repoRoot,
    label: "install-all",
  });
  await run(process.execPath, ["scripts/dev-all.js"], {
    cwd: repoRoot,
    label: "dev-all",
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err?.message || err);
  process.exit(1);
});
