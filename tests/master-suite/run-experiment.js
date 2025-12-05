#!/usr/bin/env node

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  VULPES CORTEX - A/B EXPERIMENT RUNNER                                        ║
 * ║  Scientific Before/After Testing with Parameter Changes                       ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * USAGE:
 *   node tests/master-suite/run-experiment.js
 *
 * This script:
 *   1. Runs a BASELINE test (current parameters)
 *   2. Tweaks parameters based on Cortex insights
 *   3. Runs a TREATMENT test (with changes)
 *   4. Compares results and decides: KEEP or ROLLBACK
 */

const path = require("path");
const { RigorousAssessment } = require("./assessment/rigorous-assessment");
const { ExperimentRunner } = require("./cortex/experiments/experiment-runner");
const VulpesCortex = require("./cortex");
const { seedGlobal, resetGlobal } = require("./generators/seeded-random");

// Mock electron
process.env.NODE_ENV = "test";
global.require = (moduleName) => {
  if (moduleName === "electron") {
    return {
      ipcRenderer: {
        invoke: () => Promise.resolve({}),
        send: () => {},
        on: () => {},
      },
      app: {
        getPath: (type) =>
          type === "userData"
            ? path.join(__dirname, "..", "..", "userData")
            : __dirname,
        getName: () => "VulpesTest",
        getVersion: () => "1.0.0",
      },
    };
  }
  return require(moduleName);
};

// ============================================================================
// CONFIGURATION
// ============================================================================

const EXPERIMENT_CONFIG = {
  name: "OCR-Tolerant Pattern Matching",
  documentCount: 100, // Smaller for faster iteration
  runs: 1, // Single run for now (increase for statistical significance)
  profile: "DEVELOPMENT",
  seed: 12345, // Fixed seed for reproducible document generation
};

// ============================================================================
// MAIN EXPERIMENT
// ============================================================================

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   ██╗   ██╗██╗   ██╗██╗     ██████╗ ███████╗███████╗                        ║
║   ██║   ██║██║   ██║██║     ██╔══██╗██╔════╝██╔════╝                        ║
║   ██║   ██║██║   ██║██║     ██████╔╝█████╗  ███████╗                        ║
║   ╚██╗ ██╔╝██║   ██║██║     ██╔═══╝ ██╔══╝  ╚════██║                        ║
║    ╚████╔╝ ╚██████╔╝███████╗██║     ███████╗███████║                        ║
║     ╚═══╝   ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚══════╝                        ║
║                                                                              ║
║              A / B   E X P E R I M E N T   R U N N E R                      ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  // Initialize Cortex
  console.log("  Initializing Vulpes Cortex...");
  await VulpesCortex.initialize();
  console.log("  ✓ Cortex ready\n");

  // Get the experiment runner module
  const experimentRunner = VulpesCortex.getModule("experimentRunner");

  // ============================================================================
  // STEP 1: CREATE EXPERIMENT
  // ============================================================================

  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );
  console.log("  STEP 1: Creating Experiment");
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
  );

  // Create experiment - testing if our system can detect with different doc counts
  // (In a real experiment, you'd modify actual detection parameters)
  const experiment = experimentRunner.createExperiment({
    name: EXPERIMENT_CONFIG.name,
    type: "BEFORE_AFTER",
    treatment: {
      description: "Testing detection with consistent document set",
      type: "PARAMETER_CHANGE",
      parameters: {
        target: "assessment",
        change: "Same documents, measure consistency",
      },
    },
    runs: EXPERIMENT_CONFIG.runs,
  });

  console.log(`  Experiment ID: ${experiment.id}`);
  console.log(`  Name: ${experiment.name}`);
  console.log(`  Type: ${experiment.type}\n`);

  // ============================================================================
  // STEP 2: RUN EXPERIMENT
  // ============================================================================

  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );
  console.log("  STEP 2: Running Experiment (Baseline vs Treatment)");
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
  );

  // Set up event listeners for progress
  experimentRunner.on("runStarted", ({ phase, run, total }) => {
    console.log(`  [${phase.toUpperCase()}] Run ${run}/${total} starting...`);
  });

  experimentRunner.on("runCompleted", ({ phase, run, total, metrics }) => {
    console.log(
      `  [${phase.toUpperCase()}] Run ${run}/${total} complete - Sensitivity: ${(metrics.sensitivity * 100).toFixed(2)}%`,
    );
  });

  experimentRunner.on("baselineComplete", ({ metrics }) => {
    console.log(`\n  ✓ BASELINE COMPLETE`);
    console.log(
      `    Sensitivity: ${(metrics.sensitivity?.mean * 100).toFixed(2)}%`,
    );
    console.log(
      `    Specificity: ${(metrics.specificity?.mean * 100).toFixed(2)}%\n`,
    );
  });

  experimentRunner.on("treatmentComplete", ({ metrics }) => {
    console.log(`\n  ✓ TREATMENT COMPLETE`);
    console.log(
      `    Sensitivity: ${(metrics.sensitivity?.mean * 100).toFixed(2)}%`,
    );
    console.log(
      `    Specificity: ${(metrics.specificity?.mean * 100).toFixed(2)}%\n`,
    );
  });

  // Test runner function - runs the actual assessment
  const testRunner = async ({ phase, runNumber }) => {
    // CRITICAL: Seed the RNG before each run so baseline and treatment
    // test the EXACT SAME documents. This enables valid A/B comparison.
    seedGlobal(EXPERIMENT_CONFIG.seed);
    console.log(
      `    Running ${EXPERIMENT_CONFIG.documentCount} documents (seed: ${EXPERIMENT_CONFIG.seed})...`,
    );

    const assessment = new RigorousAssessment({
      documentCount: EXPERIMENT_CONFIG.documentCount,
      verbose: false,
    });

    await assessment.runFullSuite();
    assessment.calculateMetrics();

    return {
      metrics: {
        sensitivity: assessment.results.metrics.sensitivity / 100,
        specificity: assessment.results.metrics.specificity / 100,
        precision: assessment.results.metrics.precision / 100,
        f1Score: assessment.results.metrics.f1Score / 100,
        mcc: assessment.results.metrics.mcc,
        falseNegatives: assessment.results.failures.length,
        falsePositives: assessment.results.overRedactions.length,
      },
      details: {
        documentCount: EXPERIMENT_CONFIG.documentCount,
        profile: EXPERIMENT_CONFIG.profile,
      },
    };
  };

  // Run the experiment!
  const result = await experimentRunner.runExperiment(
    experiment.id,
    testRunner,
  );

  // ============================================================================
  // STEP 3: SHOW RESULTS
  // ============================================================================

  console.log(
    "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );
  console.log("  STEP 3: EXPERIMENT RESULTS");
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
  );

  console.log(`  Status: ${result.status}`);
  console.log(`  Overall Effect: ${result.analysis?.overallEffect || "N/A"}\n`);

  // Show metrics comparison
  if (result.analysis?.metricsComparison) {
    console.log("  METRICS COMPARISON:");
    console.log(
      "  ┌─────────────────┬─────────────┬─────────────┬─────────────┬──────────────┐",
    );
    console.log(
      "  │ Metric          │ Baseline    │ Treatment   │ Delta       │ Significant? │",
    );
    console.log(
      "  ├─────────────────┼─────────────┼─────────────┼─────────────┼──────────────┤",
    );

    for (const [metric, data] of Object.entries(
      result.analysis.metricsComparison,
    )) {
      const baselineStr = (data.baseline * 100).toFixed(2).padStart(9) + "%";
      const treatmentStr = (data.treatment * 100).toFixed(2).padStart(9) + "%";
      const deltaStr =
        (data.delta >= 0 ? "+" : "") + (data.delta * 100).toFixed(2) + "%";
      const sigStr = data.significant ? "YES" : "NO";

      console.log(
        `  │ ${metric.padEnd(15)} │ ${baselineStr} │ ${treatmentStr} │ ${deltaStr.padStart(11)} │ ${sigStr.padStart(12)} │`,
      );
    }

    console.log(
      "  └─────────────────┴─────────────┴─────────────┴─────────────┴──────────────┘",
    );
  }

  // Show conclusion
  if (result.conclusion) {
    console.log(`\n  CONCLUSION:`);
    console.log(`    Accepted: ${result.conclusion.accepted ? "YES" : "NO"}`);
    console.log(`    Reason: ${result.conclusion.reason}`);
    console.log(`    Recommendation: ${result.conclusion.recommendation}`);

    if (result.conclusion.autoRollback) {
      console.log(`    ⚠ Auto-rollback was triggered!`);
    }
  }

  // Show improvements/regressions
  if (result.analysis?.improvements?.length > 0) {
    console.log(`\n  IMPROVEMENTS:`);
    for (const imp of result.analysis.improvements) {
      console.log(
        `    ✓ ${imp.metric}: +${(imp.improvement * 100).toFixed(2)}% (${imp.percentChange.toFixed(1)}% relative)`,
      );
    }
  }

  if (result.analysis?.regressions?.length > 0) {
    console.log(`\n  REGRESSIONS:`);
    for (const reg of result.analysis.regressions) {
      console.log(
        `    ✗ ${reg.metric}: -${(reg.regression * 100).toFixed(2)}% (${Math.abs(reg.percentChange).toFixed(1)}% relative)`,
      );
    }
  }

  // ============================================================================
  // STEP 4: RECORD IN CORTEX
  // ============================================================================

  console.log(
    "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );
  console.log("  STEP 4: Recording in Cortex Knowledge Base");
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
  );

  // Get experiment stats
  const stats = experimentRunner.getStats();
  console.log(`  Total Experiments: ${stats.total}`);
  console.log(`  Completed: ${stats.completed}`);
  console.log(`  Success Rate: ${(stats.successRate * 100).toFixed(1)}%\n`);

  console.log("  ✓ Experiment recorded in Cortex knowledge base");
  console.log("  ✓ Results available for future history consultation\n");

  // Final summary
  console.log(
    "═══════════════════════════════════════════════════════════════════════════════",
  );
  if (result.conclusion?.accepted) {
    console.log("  ✓ EXPERIMENT SUCCESSFUL - Changes improved detection");
  } else {
    console.log("  ✗ NO SIGNIFICANT IMPROVEMENT - Try different parameters");
  }
  console.log(
    "═══════════════════════════════════════════════════════════════════════════════\n",
  );

  process.exit(result.conclusion?.accepted ? 0 : 1);
}

main().catch((err) => {
  console.error("Experiment failed:", err);
  process.exit(2);
});
