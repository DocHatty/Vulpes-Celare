#!/usr/bin/env node

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  VULPES CELARE - MASTER TEST RUNNER                                          ║
 * ║  Complete Assessment Suite with VULPES CORTEX Intelligence                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * USAGE:
 *   node tests/master-suite/run.js [options]
 *
 * OPTIONS:
 *   --count=N         Number of documents (default: 200)
 *   --verbose         Show detailed progress
 *   --json-only       Output only JSON (for CI/CD)
 *   --quick           Quick test (50 documents)
 *   --thorough        Thorough test (500 documents)
 *   --profile=NAME    Grading profile: HIPAA_STRICT, DEVELOPMENT, RESEARCH, OCR_TOLERANT
 *   --learn           Enable learning engine (track history, generate insights)
 *   --no-learn        Disable learning engine
 *   --context         Show LLM context for improvements
 *   --evolution       Show evolution report
 *   --cortex          Enable Vulpes Cortex (advanced learning system)
 *   --cortex-report   Show Cortex full report
 *   --cortex-insights Show Cortex insights only
 *
 * WORKFLOW:
 *   1. Generate test documents with comprehensive PHI
 *   2. Process ALL documents through the engine
 *   3. Calculate sensitivity, specificity, and other metrics
 *   4. Apply smart grading with configurable profiles
 *   5. Deep investigation of failures with pattern recognition
 *   6. Learn from results via Vulpes Cortex (consults history!)
 *   7. Generate recommendations based on history
 *
 * EXIT CODES:
 *   0 = Grade A- or better (sensitivity >= 95%)
 *   1 = Grade below A- (needs improvement)
 *   2 = Assessment crashed
 */

const path = require("path");
const { RigorousAssessment } = require("./assessment/rigorous-assessment");

// Try to load learning engine (graceful failure if not available)
let LearningEngine, SmartGrader, generateGradingReport;
try {
  const learning = require("./evolution/learning-engine");
  LearningEngine = learning.LearningEngine;
  const grading = require("./evolution/smart-grading");
  SmartGrader = grading.SmartGrader;
  generateGradingReport = grading.generateGradingReport;
} catch (e) {
  console.warn(
    "  Note: Evolution system not available. Running in basic mode.",
  );
}

// Try to load Vulpes Cortex (advanced learning system)
let VulpesCortex = null;
try {
  VulpesCortex = require("./cortex");
} catch (e) {
  // Cortex not available - will fall back to basic learning
}

// ============================================================================
// PARSE COMMAND LINE ARGUMENTS
// ============================================================================
const args = process.argv.slice(2);
const options = {
  documentCount: 200,
  verbose: false,
  jsonOnly: false,
  profile: "DEVELOPMENT", // Default to development-friendly grading
  learn: true, // Learning enabled by default
  showContext: false,
  showEvolution: false,
  useCortex: true, // Use Vulpes Cortex by default if available
  cortexReport: false,
  cortexInsights: false,
};

for (const arg of args) {
  if (arg.startsWith("--count=")) {
    options.documentCount = parseInt(arg.split("=")[1]) || 200;
  }
  if (arg.startsWith("--profile=")) {
    options.profile = arg.split("=")[1].toUpperCase();
  }
  if (arg === "--verbose") options.verbose = true;
  if (arg === "--json-only") options.jsonOnly = true;
  if (arg === "--quick") options.documentCount = 50;
  if (arg === "--thorough") options.documentCount = 500;
  if (arg === "--learn") options.learn = true;
  if (arg === "--no-learn") options.learn = false;
  if (arg === "--context") options.showContext = true;
  if (arg === "--evolution") options.showEvolution = true;
  if (arg === "--cortex") options.useCortex = true;
  if (arg === "--no-cortex") options.useCortex = false;
  if (arg === "--cortex-report") options.cortexReport = true;
  if (arg === "--cortex-insights") options.cortexInsights = true;
}

// ============================================================================
// MOCK ELECTRON FOR TESTING
// ============================================================================
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
// RUN ASSESSMENT
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
║              C E L A R E   -   E V O L U T I O N A R Y   T E S T            ║
║                                                                              ║
║   Comprehensive PHI Redaction Assessment Suite                               ║
║   Self-Learning • Pattern Recognition • Smart Grading                        ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  // Initialize Vulpes Cortex (advanced learning system)
  let cortex = null;
  if (options.useCortex && VulpesCortex) {
    try {
      await VulpesCortex.initialize();
      cortex = VulpesCortex;
      console.log(
        "  ✓ Vulpes Cortex initialized (advanced learning + history consultation)\n",
      );
    } catch (e) {
      console.warn(`  ⚠ Vulpes Cortex failed to initialize: ${e.message}\n`);
    }
  }

  // Initialize legacy learning engine if Cortex not available
  let learningEngine = null;
  if (!cortex && options.learn && LearningEngine) {
    try {
      learningEngine = new LearningEngine(
        path.join(__dirname, "..", "results"),
      );
      console.log("  ✓ Learning engine initialized (legacy mode)\n");
    } catch (e) {
      console.warn(`  ⚠ Learning engine failed to initialize: ${e.message}\n`);
    }
  }

  // Show Cortex report if requested
  if (options.cortexReport && cortex) {
    console.log(await cortex.generateReport("FULL"));
    if (!options.documentCount) {
      process.exit(0);
    }
  }

  // Show Cortex insights if requested
  if (options.cortexInsights && cortex) {
    const insights = await cortex.getInsights();
    console.log(
      "\n╔═══════════════════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║  VULPES CORTEX - ACTIVE INSIGHTS                                          ║",
    );
    console.log(
      "╚═══════════════════════════════════════════════════════════════════════════╝\n",
    );
    console.log(JSON.stringify(insights, null, 2));
    if (!options.documentCount) {
      process.exit(0);
    }
  }

  // Show evolution report if requested
  if (options.showEvolution && learningEngine) {
    console.log(learningEngine.generateReport());
    if (!options.documentCount) {
      process.exit(0);
    }
  }

  // Show LLM context if requested
  if (options.showContext && learningEngine) {
    console.log(
      "\n╔═══════════════════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║  LLM CONTEXT FOR IMPROVEMENT                                              ║",
    );
    console.log(
      "╚═══════════════════════════════════════════════════════════════════════════╝\n",
    );
    console.log(JSON.stringify(learningEngine.getLLMContext(), null, 2));
    if (!options.documentCount) {
      process.exit(0);
    }
  }

  try {
    // Create assessment instance
    const assessment = new RigorousAssessment({
      documentCount: options.documentCount,
      verbose: options.verbose,
    });

    // PHASE 1: Run the complete test suite
    console.log("PHASE 1: Running complete test suite...\n");
    await assessment.runFullSuite();

    // PHASE 2: Calculate metrics with strict grading (original method)
    console.log("\nPHASE 2: Calculating metrics...\n");
    assessment.calculateMetrics();

    // PHASE 3: Deep investigation of failures
    console.log("\nPHASE 3: Deep investigation of failures...\n");
    assessment.investigateFailures();

    // PHASE 4: Smart grading with multiple perspectives
    let smartGradeResults = null;
    if (SmartGrader) {
      console.log("\nPHASE 4: Smart grading analysis...\n");

      // Get previous run for comparison if available
      let previousRun = null;
      let evolutionContext = null;
      if (learningEngine) {
        const history = learningEngine.kb.history;
        if (history.runs && history.runs.length > 0) {
          previousRun = history.runs[history.runs.length - 1].metrics;
          evolutionContext = history.summary;
        }
      }

      const grader = new SmartGrader({
        profile: options.profile,
        previousRun,
        evolutionContext,
      });

      smartGradeResults = grader.grade(
        assessment.results.metrics,
        assessment.results.failures,
        { errorDistribution: assessment.options.errorDistribution },
      );
    }

    // PHASE 5: Learning and evolution tracking
    let learningResults = null;
    let cortexAnalysis = null;

    if (cortex) {
      console.log(
        "\nPHASE 5: Vulpes Cortex analysis (with history consultation)...\n",
      );

      // Analyze with Cortex - this automatically consults history
      cortexAnalysis = await cortex.analyzeResults(
        {
          metrics: assessment.results.metrics,
          documents: assessment.results.documentResults || [],
          falseNegatives: assessment.results.failures,
          falsePositives: assessment.results.overRedactions,
          truePositives: assessment.results.truePositives || [],
        },
        {
          analyzePatterns: true,
          generateInsights: true,
          profile: options.profile,
        },
      );

      // Get recommendation for what to do next
      const recommendation = await cortex.getRecommendation("WHAT_TO_IMPROVE", {
        currentMetrics: assessment.results.metrics,
        phiType: cortexAnalysis.patterns?.failurePatterns?.[0]?.phiType,
      });

      cortexAnalysis.recommendation = recommendation;

      console.log("  ✓ Pattern analysis complete");
      console.log("  ✓ History consulted");
      console.log("  ✓ Insights generated");
      console.log(
        `  ✓ Top recommendation: ${recommendation.recommendation?.summary || "Review results"}`,
      );
    } else if (learningEngine) {
      console.log("\nPHASE 5: Learning from results (legacy mode)...\n");

      learningResults = learningEngine.processRun({
        metrics: assessment.results.metrics,
        failures: assessment.results.failures,
        overRedactions: assessment.results.overRedactions,
        failureCount: assessment.results.failures.length,
        documentCount: options.documentCount,
        smartGrade: smartGradeResults?.scores,
      });
    }

    // Generate and display reports
    if (!options.jsonOnly) {
      // Original assessment report
      console.log(assessment.generateReport());

      // Smart grading report
      if (smartGradeResults) {
        console.log(generateGradingReport(smartGradeResults));
      }

      // Cortex analysis report
      if (cortex && cortexAnalysis) {
        console.log(
          "\n╔═══════════════════════════════════════════════════════════════════════════╗",
        );
        console.log(
          "║  VULPES CORTEX - ANALYSIS SUMMARY                                         ║",
        );
        console.log(
          "╚═══════════════════════════════════════════════════════════════════════════╝\n",
        );

        // Show grade
        console.log(
          `  Grade: ${cortexAnalysis.grade?.grade || "N/A"} (Score: ${cortexAnalysis.grade?.score?.toFixed(1) || "N/A"})`,
        );

        // Show top patterns
        if (cortexAnalysis.patterns?.failurePatterns?.length > 0) {
          console.log("\n  TOP FAILURE PATTERNS:");
          for (const pattern of cortexAnalysis.patterns.failurePatterns.slice(
            0,
            5,
          )) {
            console.log(
              `    • ${pattern.category} (${pattern.phiType}): ${pattern.remediation || "Review"}`,
            );
          }
        }

        // Show recommendation
        if (cortexAnalysis.recommendation?.recommendation) {
          console.log("\n  RECOMMENDATION:");
          console.log(
            `    ${cortexAnalysis.recommendation.recommendation.summary || "Review results"}`,
          );
          if (cortexAnalysis.recommendation.historyConsulted) {
            console.log("    (Based on history consultation)");
          }
        }

        // Show insights summary
        if (cortexAnalysis.insights) {
          const summary = cortex.getModule("insightGenerator")?.getSummary();
          if (summary) {
            console.log(
              `\n  INSIGHTS: ${summary.total} active (${summary.byCriticality?.critical || 0} critical, ${summary.byCriticality?.high || 0} high)`,
            );
          }
        }

        console.log("\n  Run with --cortex-report for full Cortex report");
        console.log("  Run with --cortex-insights for detailed insights\n");
      }

      // Legacy learning/evolution report
      if (learningEngine && !cortex) {
        console.log(learningEngine.generateReport());
      }
    }

    // Save results
    const { jsonPath, reportPath } = assessment.saveResults();

    // Output JSON for CI/CD if requested
    if (options.jsonOnly) {
      const output = {
        metrics: assessment.results.metrics,
        failures: assessment.results.failures.length,
        overRedactions: assessment.results.overRedactions.length,
      };

      if (smartGradeResults) {
        output.smartGrade = {
          profile: smartGradeResults.profile,
          grade: smartGradeResults.scores.grade,
          score: smartGradeResults.scores.finalScore,
          allProfiles: Object.fromEntries(
            Object.entries(smartGradeResults.allProfiles).map(([k, v]) => [
              k,
              { grade: v.grade, score: v.finalScore },
            ]),
          ),
        };
      }

      if (cortexAnalysis) {
        output.cortex = {
          grade: cortexAnalysis.grade,
          patternsAnalyzed:
            cortexAnalysis.patterns?.failurePatterns?.length || 0,
          insightsGenerated: cortexAnalysis.insights?.length || 0,
          recommendation:
            cortexAnalysis.recommendation?.recommendation?.summary,
          historyConsulted:
            cortexAnalysis.recommendation?.historyConsulted || false,
        };
      } else if (learningResults) {
        output.evolution = {
          trend: learningResults.evolution.summary?.recentTrend,
          totalProgress:
            learningResults.evolution.summary?.totalSensitivityGain,
          topRecommendations: learningResults.recommendations
            .slice(0, 3)
            .map((r) => r.action),
        };
      }

      console.log(JSON.stringify(output, null, 2));
    }

    // Determine exit code
    // Use smart grade if available, otherwise fall back to original
    const sensitivity = assessment.results.metrics.sensitivity;
    let grade = assessment.results.metrics.grade;

    if (smartGradeResults) {
      // Use the selected profile's grade for exit code decision
      grade = smartGradeResults.scores.grade;

      // For CI/CD, we might want to use HIPAA_STRICT regardless of selected profile
      const hipaaGrade =
        smartGradeResults.allProfiles.HIPAA_STRICT?.grade || grade;

      console.log(
        `\n  Exit decision based on ${options.profile} profile: ${grade}`,
      );
      console.log(`  (HIPAA_STRICT would be: ${hipaaGrade})`);
    }

    // A- or better is passing (based on selected profile)
    // For development profile, B+ and above is also acceptable
    const passingGrades =
      options.profile === "DEVELOPMENT"
        ? ["A+", "A", "A-", "B+", "B"]
        : ["A+", "A", "A-"];

    if (sensitivity >= 95 && passingGrades.includes(grade)) {
      console.log("\n  ✓ PASS\n");
      process.exit(0);
    } else {
      console.log("\n  ✗ NEEDS IMPROVEMENT\n");
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Assessment failed: ${error.message}`);
    console.error(error.stack);
    process.exit(2);
  }
}

main();
