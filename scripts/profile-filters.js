// Lightweight profiling helper: aggregates per-filter execution time from the engine report.
// Uses synthetic master-suite generators (never real PHI).

const { seedGlobal, randomFrom } = require("../tests/master-suite/generators/seeded-random");
const { generateCompletePHIDataset } = require("../tests/master-suite/documents/phi-generator");
const { TEMPLATES } = require("../tests/master-suite/documents/templates");
const { VulpesCelare } = require("../dist/VulpesCelare");

function parseArg(name, def) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  if (!arg) return def;
  const value = Number.parseInt(arg.slice(prefix.length), 10);
  return Number.isFinite(value) ? value : def;
}

async function main() {
  const count = parseArg("count", 20);
  const seed = parseArg("seed", 1337);
  seedGlobal(seed);

  const engine = new VulpesCelare();
  const totals = new Map(); // filterType -> { ms, runs, spans }

  const errorLevels = ["low", "medium", "high", "extreme", "none"];

  for (let i = 0; i < count; i++) {
    const errorLevel = randomFrom(errorLevels) || "medium";
    const phi = generateCompletePHIDataset(errorLevel);
    const template = TEMPLATES[i % TEMPLATES.length];
    const doc = template.generator(phi);

    await engine.process(doc);
    const report = engine.getLastReport();
    if (!report) continue;

    for (const fr of report.filterResults) {
      const key = fr.filterType;
      const row = totals.get(key) || { ms: 0, runs: 0, spans: 0 };
      row.ms += fr.executionTimeMs || 0;
      row.runs += 1;
      row.spans += fr.spansDetected || 0;
      totals.set(key, row);
    }
  }

  const rows = Array.from(totals.entries())
    .map(([filterType, v]) => ({
      filterType,
      avgMs: v.ms / Math.max(1, v.runs),
      avgSpans: v.spans / Math.max(1, v.runs),
      runs: v.runs,
    }))
    .sort((a, b) => b.avgMs - a.avgMs);

  console.log(`Seed: ${seed}`);
  console.log(`Docs: ${count}`);
  console.log("Top filters by avg execution time:");
  for (const r of rows.slice(0, 12)) {
    console.log(
      `${r.filterType.padEnd(14)} ${r.avgMs.toFixed(1).padStart(7)}ms  spans~${r.avgSpans.toFixed(1).padStart(6)}  runs=${r.runs}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
