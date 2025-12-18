#!/usr/bin/env node

/**
 * Unit Test Runner (legacy convenience script)
 *
 * The unit tests are now first-class Vitest suites under `tests/unit/*.test.ts`.
 * This script runs them via Vitest so it works cross-platform.
 */

const { spawn } = require("child_process");
const path = require("path");

function runVitestUnitSuite() {
  const cwd = path.join(__dirname, "../..");
  const node = process.execPath;
  const vitestCli = path.join(cwd, "node_modules", "vitest", "vitest.mjs");

  const child = spawn(node, [vitestCli, "run", "tests/unit"], {
    stdio: "inherit",
    cwd,
  });

  child.on("close", (code) => process.exit(code ?? 1));
  child.on("error", (error) => {
    console.error("Unit test runner error:", error);
    process.exit(1);
  });
}

runVitestUnitSuite();
