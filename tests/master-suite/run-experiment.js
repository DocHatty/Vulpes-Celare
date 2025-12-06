#!/usr/bin/env node

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║     ██╗   ██╗██╗   ██╗██╗     ██████╗ ███████╗███████╗                        ║
 * ║     ██║   ██║██║   ██║██║     ██╔══██╗██╔════╝██╔════╝                        ║
 * ║     ██║   ██║██║   ██║██║     ██████╔╝█████╗  ███████╗                        ║
 * ║     ╚██╗ ██╔╝██║   ██║██║     ██╔═══╝ ██╔══╝  ╚════██║                        ║
 * ║      ╚████╔╝ ╚██████╔╝███████╗██║     ███████╗███████║                        ║
 * ║       ╚═══╝   ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚══════╝                        ║
 * ║                                                                               ║
 * ║      ██████╗ ██████╗ ██████╗ ████████╗███████╗██╗  ██╗                        ║
 * ║     ██╔════╝██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝╚██╗██╔╝                        ║
 * ║     ██║     ██║   ██║██████╔╝   ██║   █████╗   ╚███╔╝                         ║
 * ║     ██║     ██║   ██║██╔══██╗   ██║   ██╔══╝   ██╔██╗                         ║
 * ║     ╚██████╗╚██████╔╝██║  ██║   ██║   ███████╗██╔╝ ██╗                        ║
 * ║      ╚═════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝                        ║
 * ║                                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║   A/B EXPERIMENT RUNNER                                                       ║
 * ║   Scientific Before/After Testing with Parameter Changes                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
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
const { RigorousAssessment } = require("./assessment/assessment");
const { ExperimentRunner } = require("./cortex/experiments/experiment-runner");
const VulpesCortex = require("./cortex");
const { seedGlobal, resetGlobal } = require("./generators/seeded-random");

// Import console formatter for beautiful, glitch-free output
const fmt = require("./cortex/core/console-formatter");

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
  console.error(fmt.experimentBanner());

  // Initialize Cortex
  console.error("  Initializing Vulpes Cortex...");
  await VulpesCortex.initialize();
  console.error("  ✓ Cortex ready\n");

  // Get the experiment runner module
  const experimentRunner = VulpesCortex.getModule("experimentRunner");

  // ============================================================================
  // STEP 1: CREATE EXPERIMENT
  // ============================================================================

  console.error(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );
  console.error("  STEP 1: Creating Experiment");
  console.error(
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

  console.error(`  Experiment ID: ${experiment.id}`);
  console.error(`  Name: ${experiment.name}`);
  console.error(`  Type: ${experiment.type}\n`);

  // ============================================================================
  // STEP 2: RUN EXPERIMENT
  // ============================================================================

  console.error(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );
  console.error("  STEP 2: Running Experiment (Baseline vs Treatment)");
  console.error(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
  );

  // Set up event listeners for progress
  experimentRunner.on("runStarted", ({ phase, run, total }) => {
    console.error(`  [${phase.toUpperCase()}] Run ${run}/${total} starting...`);
  });

  experimentRunner.on("runCompleted", ({ phase, run, total, metrics }) => {
    console.error(
      `  [${phase.toUpperCase()}] Run ${run}/${total} complete - Sensitivity: ${(metrics.sensitivity * 100).toFixed(2)}%`,
    );
  });

  experimentRunner.on("baselineComplete", ({ metrics }) => {
    console.error(`\n  ✓ BASELINE COMPLETE`);
    console.error(
      `    Sensitivity: ${(metrics.sensitivity?.mean * 100).toFixed(2)}%`,
    );
    console.error(
      `    Specificity: ${(metrics.specificity?.mean * 100).toFixed(2)}%\n`,
    );
  });

  experimentRunner.on("treatmentComplete", ({ metrics }) => {
    console.error(`\n  ✓ TREATMENT COMPLETE`);
    console.error(
      `    Sensitivity: ${(metrics.sensitivity?.mean * 100).toFixed(2)}%`,
    );
    console.error(
      `    Specificity: ${(metrics.specificity?.mean * 100).toFixed(2)}%\n`,
    );
  });

  // Test runner function - runs the actual assessment
  const testRunner = async ({ phase, runNumber }) => {
    // CRITICAL: Seed the RNG before each run so baseline and treatment
    // test the EXACT SAME documents. This enables valid A/B comparison.
    seedGlobal(EXPERIMENT_CONFIG.seed);
    console.error(
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

  console.error(
    "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );
  console.error("  STEP 3: EXPERIMENT RESULTS");
  console.error(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
  );

  console.error(`  Status: ${result.status}`);
  console.error(
    `  Overall Effect: ${result.analysis?.overallEffect || "N/A"}\n`,
  );

  // Show metrics comparison
  if (result.analysis?.metricsComparison) {
    console.error("  METRICS COMPARISON:");
    console.error(
      "  ┌─────────────────┬─────────────┬─────────────┬─────────────┬──────────────┐",
    );
    console.error(
      "  │ Metric          │ Baseline    │ Treatment   │ Delta       │ Significant? │",
    );
    console.error(
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

      console.error(
        `  │ ${metric.padEnd(15)} │ ${baselineStr} │ ${treatmentStr} │ ${deltaStr.padStart(11)} │ ${sigStr.padStart(12)} │`,
      );
    }

    console.error(
      "  └─────────────────┴─────────────┴─────────────┴─────────────┴──────────────┘",
    );
  }

  // Show conclusion
  if (result.conclusion) {
    console.error(`\n  CONCLUSION:`);
    console.error(`    Accepted: ${result.conclusion.accepted ? "YES" : "NO"}`);
    console.error(`    Reason: ${result.conclusion.reason}`);
    console.error(`    Recommendation: ${result.conclusion.recommendation}`);

    if (result.conclusion.autoRollback) {
      console.error(`    ⚠ Auto-rollback was triggered!`);
    }
  }

  // Show improvements/regressions
  if (result.analysis?.improvements?.length > 0) {
    console.error(`\n  IMPROVEMENTS:`);
    for (const imp of result.analysis.improvements) {
      console.error(
        `    ✓ ${imp.metric}: +${(imp.improvement * 100).toFixed(2)}% (${imp.percentChange.toFixed(1)}% relative)`,
      );
    }
  }

  if (result.analysis?.regressions?.length > 0) {
    console.error(`\n  REGRESSIONS:`);
    for (const reg of result.analysis.regressions) {
      console.error(
        `    ✗ ${reg.metric}: -${(reg.regression * 100).toFixed(2)}% (${Math.abs(reg.percentChange).toFixed(1)}% relative)`,
      );
    }
  }

  // ============================================================================
  // STEP 4: RECORD IN CORTEX
  // ============================================================================

  console.error(
    "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );
  console.error("  STEP 4: Recording in Cortex Knowledge Base");
  console.error(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
  );

  // Get experiment stats
  const stats = experimentRunner.getStats();
  console.error(`  Total Experiments: ${stats.total}`);
  console.error(`  Completed: ${stats.completed}`);
  console.error(`  Success Rate: ${(stats.successRate * 100).toFixed(1)}%\n`);

  console.error("  ✓ Experiment recorded in Cortex knowledge base");
  console.error("  ✓ Results available for future history consultation\n");

  // Final summary
  console.error(
    "═══════════════════════════════════════════════════════════════════════════════",
  );
  if (result.conclusion?.accepted) {
    console.error("  ✓ EXPERIMENT SUCCESSFUL - Changes improved detection");
  } else {
    console.error("  ✗ NO SIGNIFICANT IMPROVEMENT - Try different parameters");
  }
  console.error(
    "═══════════════════════════════════════════════════════════════════════════════\n",
  );

  process.exit(result.conclusion?.accepted ? 0 : 1);
}

main().catch((err) => {
  console.error("Experiment failed:", err);
  process.exit(2);
});
