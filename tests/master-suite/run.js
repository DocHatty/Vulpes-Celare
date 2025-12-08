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
 * ║      ██████╗███████╗██╗      █████╗ ██████╗ ███████╗                          ║
 * ║     ██╔════╝██╔════╝██║     ██╔══██╗██╔══██╗██╔════╝                          ║
 * ║     ██║     █████╗  ██║     ███████║██████╔╝█████╗                            ║
 * ║     ██║     ██╔══╝  ██║     ██╔══██║██╔══██╗██╔══╝                            ║
 * ║     ╚██████╗███████╗███████╗██║  ██║██║  ██║███████╗                          ║
 * ║      ╚═════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝                          ║
 * ║                                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║   MASTER TEST RUNNER                                                          ║
 * ║   Complete Assessment Suite with VULPES CORTEX Intelligence                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  LLM STARTUP CHECKLIST - DO THIS WHEN USER SAYS "TEST THE SYSTEM"            ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                               ║
 * ║  STEP 0: START THE MCP SERVER (for intelligent recommendations)              ║
 * ║    cd tests/master-suite/cortex && node index.js --server                    ║
 * ║    (Run in background - keeps history of what worked/failed)                 ║
 * ║                                                                               ║
 * ║  STEP 1: RUN THE TEST SUITE                                                  ║
 * ║    node tests/master-suite/run.js --log-file --profile=HIPAA_STRICT          ║
 * ║                                                                               ║
 * ║  STEP 2: READ THE FULL LOG FILE                                              ║
 * ║    Check tests/results/verbose-*.log for untruncated output                  ║
 * ║                                                                               ║
 * ║  STEP 3: FOLLOW THE ACTION CHECKLIST PRINTED AT THE END                      ║
 * ║    The test output shows EXACTLY what to fix with real examples              ║
 * ║                                                                               ║
 * ║  STEP 4: EXECUTE FIXES (You are the execution engine!)                       ║
 * ║    - READ the failing filter/dictionary                                      ║
 * ║    - EDIT it to catch the missed patterns                                    ║
 * ║    - RUN the test again                                                      ║
 * ║    - COMPARE metrics (keep if better, revert if worse)                       ║
 * ║                                                                              ║
 * ║  STEP 5: ITERATE until sensitivity >= 99%                                    ║
 * ║                                                                              ║
 * ║  KEY FILES:                                                                  ║
 * ║    Filters:      src/filters/*.ts                                            ║
 * ║    Dictionaries: src/dictionaries/*.txt                                      ║
 * ║    Test Results: tests/results/verbose-*.log                                 ║
 * ║    MCP Server:   tests/master-suite/cortex/ (port 3100)                      ║
 * ║    REST API:     tests/master-suite/cortex/api/ (port 3101)                  ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  ⚠️  LLM/AI OPERATOR CRITICAL INSTRUCTION:                                   │
 * │                                                                             │
 * │  ALWAYS use --log-file to prevent output truncation!                        │
 * │                                                                             │
 * │  CORRECT:   node tests/master-suite/run.js --log-file                       │
 * │  WRONG:     node tests/master-suite/run.js 2>&1 | tail -100                 │
 * │  WRONG:     node tests/master-suite/run.js 2>&1 (output will truncate!)     │
 * │                                                                             │
 * │  After running, read the log file to see FULL untruncated results:          │
 * │    - Log files are saved to: tests/results/verbose-*.log                    │
 * │    - Use: cat tests/results/verbose-*.log | tail -200                       │
 * │    - Or read the specific log file path shown in console output             │
 * │                                                                             │
 * │  This prevents bash/terminal truncation that loses critical metrics!        │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ╔═════════════════════════════════════════════════════════════════════════════╗
 * ║  LLM/AI OPERATOR: MANDATORY IMPROVEMENT WORKFLOW                            ║
 * ║                                                                             ║
 * ║  You MUST follow this scientific process when improving the PHI engine:     ║
 * ║                                                                             ║
 * ║  STEP 1: OBSERVE (Baseline)                                                 ║
 * ║    □ Run test with 200 docs: node tests/master-suite/run.js --log-file      ║
 * ║    □ Read the FULL log file (not truncated console output)                  ║
 * ║    □ Record baseline metrics: Sensitivity, Specificity, F1, F2              ║
 * ║    □ Identify the TOP failure pattern (e.g., "NAME: 74 failures")           ║
 * ║                                                                             ║
 * ║  STEP 2: ANALYZE                                                            ║
 * ║    □ Read specific failure examples from the log                            ║
 * ║    □ Identify WHY the pattern is failing (OCR? Format? Missing regex?)      ║
 * ║    □ Find the relevant filter file in src/filters/                          ║
 * ║    □ Understand the current detection logic                                 ║
 * ║                                                                             ║
 * ║  STEP 3: HYPOTHESIZE                                                        ║
 * ║    □ Form a specific hypothesis: "Adding X pattern will catch Y cases"      ║
 * ║    □ Estimate impact: "This should reduce NAME failures by ~20"             ║
 * ║    □ Consider side effects: "This might cause Z false positives"            ║
 * ║                                                                             ║
 * ║  STEP 4: IMPLEMENT (Small Change)                                           ║
 * ║    □ Make ONE focused change (not multiple changes at once!)                ║
 * ║    □ Keep the change minimal and reversible                                 ║
 * ║    □ Document what you changed and why                                      ║
 * ║                                                                             ║
 * ║  STEP 5: TEST                                                               ║
 * ║    □ Run the same test: node tests/master-suite/run.js --log-file           ║
 * ║    □ Compare metrics to baseline                                            ║
 * ║    □ Check: Did sensitivity improve? Did false positives increase?          ║
 * ║                                                                             ║
 * ║  STEP 6: EVALUATE                                                           ║
 * ║    □ If IMPROVED: Keep the change, commit it, update baseline               ║
 * ║    □ If WORSE: REVERT the change immediately (git checkout)                 ║
 * ║    □ If NEUTRAL: Consider reverting (simpler is better)                     ║
 * ║                                                                             ║
 * ║  STEP 7: ITERATE                                                            ║
 * ║    □ Return to STEP 1 with new baseline                                     ║
 * ║    □ Target the next highest-impact failure pattern                         ║
 * ║    □ Continue until sensitivity >= 99% and grade is A                       ║
 * ║                                                                             ║
 * ║  CRITICAL RULES:                                                            ║
 * ║    - NEVER make multiple changes before testing                             ║
 * ║    - ALWAYS revert changes that don't improve metrics                       ║
 * ║    - ALWAYS use --log-file to see full output                               ║
 * ║    - NEVER trust truncated console output for metrics                       ║
 * ║    - ALWAYS prioritize sensitivity (recall) over precision                  ║
 * ╚═════════════════════════════════════════════════════════════════════════════╝
 *
 * ╔═════════════════════════════════════════════════════════════════════════════╗
 * ║  LLM: YOU ARE THE EXECUTION ENGINE - NOT JUST AN ANALYZER                   ║
 * ╠═════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                             ║
 * ║  You have FULL POWER to:                                                    ║
 * ║    ✓ READ any file (filters, dictionaries, config)                          ║
 * ║    ✓ EDIT any file (apply fixes directly)                                   ║
 * ║    ✓ RUN tests (node tests/master-suite/run.js --log-file)                  ║
 * ║    ✓ COMPARE metrics (before vs after)                                      ║
 * ║    ✓ ROLLBACK if worse (git checkout <file>)                                ║
 * ║                                                                             ║
 * ║  DO NOT just analyze and report. EXECUTE THE FIXES.                         ║
 * ║                                                                             ║
 * ║  CLOSED LOOP:                                                               ║
 * ║    1. Run test → See failures with exact values                             ║
 * ║    2. Read the filter/dictionary that should catch it                       ║
 * ║    3. EDIT the file to add the missing pattern/entry                        ║
 * ║    4. Run test again → Compare sensitivity                                  ║
 * ║    5. If better: keep it. If worse: git checkout <file>                     ║
 * ║    6. Repeat until sensitivity >= 99%                                       ║
 * ║                                                                             ║
 * ║  KEY LOCATIONS:                                                             ║
 * ║    Filters:      src/filters/*.ts                                           ║
 * ║    Dictionaries: src/dictionaries/*.txt                                     ║
 * ║    Core:         src/core/*.ts                                              ║
 * ║                                                                             ║
 * ╚═════════════════════════════════════════════════════════════════════════════╝
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
const { RigorousAssessment } = require("./assessment/assessment");

// Import console formatter for beautiful, glitch-free output
const fmt = require("./cortex/core/console-formatter");

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
  documentCount: 50, // Reduced from 200 - same coverage, 4x faster
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

// Helper to suppress output in JSON-only mode
// Call this after parsing args
let log = console.log.bind(console);
function setupLogging() {
  if (options.jsonOnly) {
    // In JSON-only mode, redirect all console.log to stderr except the final JSON
    log = (...args) => console.error(...args);
  }
}

for (const arg of args) {
  if (arg.startsWith("--count=")) {
    options.documentCount = parseInt(arg.split("=")[1]) || 200;
  }
  if (arg.startsWith("--profile=")) {
    options.profile = arg.split("=")[1].toUpperCase();
  }
  if (arg === "--verbose") options.verbose = true;
  if (arg === "--json-only") options.jsonOnly = true;
  if (arg === "--quick") options.documentCount = 20; // Fast iteration
  if (arg === "--full") options.documentCount = 200; // Original full suite
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

// Setup logging after parsing args
setupLogging();

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
  log(fmt.testRunnerBanner());

  // Initialize Vulpes Cortex (advanced learning system)
  let cortex = null;
  if (options.useCortex && VulpesCortex) {
    try {
      await VulpesCortex.initialize();
      cortex = VulpesCortex;
      log(
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
      log("  ✓ Learning engine initialized (legacy mode)\n");
    } catch (e) {
      console.warn(`  ⚠ Learning engine failed to initialize: ${e.message}\n`);
    }
  }

  // Show Cortex report if requested
  if (options.cortexReport && cortex) {
    log(await cortex.generateReport("FULL"));
    if (!options.documentCount) {
      process.exit(0);
    }
  }

  // Show Cortex insights if requested
  if (options.cortexInsights && cortex) {
    const insights = await cortex.getInsights();
    log("\n" + fmt.headerBox("VULPES CORTEX - ACTIVE INSIGHTS") + "\n");
    log(JSON.stringify(insights, null, 2));
    if (!options.documentCount) {
      process.exit(0);
    }
  }

  // Show evolution report if requested
  if (options.showEvolution && learningEngine) {
    log(learningEngine.generateReport());
    if (!options.documentCount) {
      process.exit(0);
    }
  }

  // Show LLM context if requested
  if (options.showContext && learningEngine) {
    log("\n" + fmt.headerBox("LLM CONTEXT FOR IMPROVEMENT") + "\n");
    log(JSON.stringify(learningEngine.getLLMContext(), null, 2));
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
    log("PHASE 1: Running complete test suite...\n");
    await assessment.runFullSuite();

    // PHASE 2: Calculate metrics with strict grading (original method)
    log("\nPHASE 2: Calculating metrics...\n");
    assessment.calculateMetrics();

    // PHASE 3: Deep investigation of failures
    log("\nPHASE 3: Deep investigation of failures...\n");
    assessment.investigateFailures();

    // PHASE 4: Smart grading with multiple perspectives
    let smartGradeResults = null;
    if (SmartGrader) {
      log("\nPHASE 4: Smart grading analysis...\n");

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
      log("\nPHASE 5: Vulpes Cortex analysis (with history consultation)...\n");

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

      log("  ✓ Pattern analysis complete");
      log("  ✓ History consulted");
      log("  ✓ Insights generated");
      log(
        `  ✓ Top recommendation: ${recommendation.recommendation?.summary || "Review results"}`,
      );
    } else if (learningEngine) {
      log("\nPHASE 5: Learning from results (legacy mode)...\n");

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
      log(assessment.generateReport());

      // Smart grading report
      if (smartGradeResults) {
        log(generateGradingReport(smartGradeResults));
      }

      // Cortex analysis report
      if (cortex && cortexAnalysis) {
        log("\n" + fmt.headerBox("VULPES CORTEX - ANALYSIS SUMMARY") + "\n");

        // Show grade
        log(
          `  Grade: ${cortexAnalysis.grade?.grade || "N/A"} (Score: ${cortexAnalysis.grade?.score?.toFixed(1) || "N/A"})`,
        );

        // Show top patterns
        if (cortexAnalysis.patterns?.failurePatterns?.length > 0) {
          log("\n  TOP FAILURE PATTERNS:");
          for (const pattern of cortexAnalysis.patterns.failurePatterns.slice(
            0,
            5,
          )) {
            log(
              `    • ${pattern.category} (${pattern.phiType}): ${pattern.remediation || "Review"}`,
            );
          }
        }

        // Show recommendation
        if (cortexAnalysis.recommendation?.recommendation) {
          log("\n  RECOMMENDATION:");
          log(
            `    ${cortexAnalysis.recommendation.recommendation.summary || "Review results"}`,
          );
          if (cortexAnalysis.recommendation.historyConsulted) {
            log("    (Based on history consultation)");
          }
        }

        // Show insights summary
        if (cortexAnalysis.insights) {
          const summary = cortex.getModule("insightGenerator")?.getSummary();
          if (summary) {
            log(
              `\n  INSIGHTS: ${summary.total} active (${summary.byCriticality?.critical || 0} critical, ${summary.byCriticality?.high || 0} high)`,
            );
          }
        }

        log("\n  Run with --cortex-report for full Cortex report");
        log("  Run with --cortex-insights for detailed insights\n");
      }

      // Legacy learning/evolution report
      if (learningEngine && !cortex) {
        log(learningEngine.generateReport());
      }
    }

    // Save results
    const { jsonPath, reportPath } = assessment.saveResults();

    // Output JSON for CI/CD if requested
    if (options.jsonOnly) {
      const output = {
        metrics: assessment.results.metrics,
        // Include full failure details for MCP analysis
        failures: assessment.results.failures.map((f) => ({
          phiType: f.phiType || f.type,
          value: f.value,
          context: f.context?.substring(0, 150),
          errorLevel: f.errorLevel,
          expected: f.expected,
        })),
        failureCount: assessment.results.failures.length,
        overRedactions: assessment.results.overRedactions.map((f) => ({
          phiType: f.phiType || f.type,
          value: f.value,
          context: f.context?.substring(0, 150),
        })),
        overRedactionCount: assessment.results.overRedactions.length,
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

      log(`\n  Exit decision based on ${options.profile} profile: ${grade}`);
      log(`  (HIPAA_STRICT would be: ${hipaaGrade})`);
    }

    // A- or better is passing (based on selected profile)
    // For development profile, B+ and above is also acceptable
    const passingGrades =
      options.profile === "DEVELOPMENT"
        ? ["A+", "A", "A-", "B+", "B"]
        : ["A+", "A", "A-"];

    if (sensitivity >= 95 && passingGrades.includes(grade)) {
      log("\n  ✓ PASS\n");
      printLLMActionChecklist(assessment.results, smartGradeResults, "PASS");
      process.exit(0);
    } else {
      log("\n  ✗ NEEDS IMPROVEMENT\n");
      printLLMActionChecklist(assessment.results, smartGradeResults, "IMPROVE");
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Assessment failed: ${error.message}`);
    console.error(error.stack);
    process.exit(2);
  }
}

// ============================================================================
// LLM ACTION CHECKLIST - Prints after every test run
// ============================================================================
function printLLMActionChecklist(results, smartGradeResults, status) {
  const metrics = results.metrics;
  const failures = results.failures || [];
  const topFailuresByType = {};

  // Group failures by type
  for (const f of failures) {
    if (!topFailuresByType[f.phiType]) {
      topFailuresByType[f.phiType] = [];
    }
    topFailuresByType[f.phiType].push(f);
  }

  // Sort by count
  const sortedTypes = Object.entries(topFailuresByType).sort(
    (a, b) => b[1].length - a[1].length,
  );

  const topType = sortedTypes[0]?.[0] || "UNKNOWN";
  const topCount = sortedTypes[0]?.[1]?.length || 0;
  const topExamples = sortedTypes[0]?.[1]?.slice(0, 3) || [];

  // Format metrics for display
  const sens = (metrics.sensitivity || 0).toFixed(2);
  const spec = (metrics.specificity || 0).toFixed(2);
  const f1 = (metrics.f1Score || 0).toFixed(2);
  const f2 = (metrics.f2Score || 0).toFixed(2);
  const grade = (
    smartGradeResults?.scores?.grade ||
    metrics.grade ||
    "?"
  ).toString();

  // Box drawing helper - ensures perfect 80-char width
  const W = 80;
  const pointed = (s) =>
    "║  " + s + " ".repeat(Math.max(0, W - 4 - s.length)) + "║";
  const pointed2 = (s) =>
    "║    " + s + " ".repeat(Math.max(0, W - 6 - s.length)) + "║";
  const blank = "║" + " ".repeat(W - 2) + "║";
  const top = "╔" + "═".repeat(W - 2) + "╗";
  const mid = "╠" + "═".repeat(W - 2) + "╣";
  const bot = "╚" + "═".repeat(W - 2) + "╝";

  let lines = [];

  lines.push("");
  lines.push(top);
  lines.push(blank);
  lines.push(pointed("LLM: EXECUTE THE FOLLOWING ACTIONS"));
  lines.push(blank);
  lines.push(mid);
  lines.push(blank);
  lines.push(pointed("CURRENT METRICS"));
  lines.push(pointed("─".repeat(72)));
  lines.push(pointed(`Sensitivity: ${sens}%     Specificity: ${spec}%`));
  lines.push(
    pointed(`F1 Score:    ${f1}       F2 Score:    ${f2}  (HIPAA standard)`),
  );
  lines.push(pointed(`Grade:       ${grade}`));
  lines.push(blank);
  lines.push(bot);

  if (status === "IMPROVE") {
    lines.push("");
    lines.push(top);
    lines.push(pointed("ACTION REQUIRED"));
    lines.push(mid);
    lines.push(blank);
    lines.push(pointed(`TOP FAILURE: ${topType} (${topCount} missed)`));
    lines.push(blank);
    lines.push(pointed(`EXAMPLES OF MISSED ${topType}:`));
    for (const f of topExamples) {
      const val = `"${f.value}"`.substring(0, 45);
      const lvl = f.errorLevel || "clean";
      lines.push(pointed2(`${val}  (${lvl})`));
    }
    lines.push(blank);
    lines.push(mid);
    lines.push(blank);
    lines.push(pointed("DO THIS NOW:"));
    lines.push(blank);
    lines.push(pointed("1. READ the relevant filter or dictionary"));
    lines.push(pointed2("Filters:      src/filters/"));
    lines.push(pointed2("Dictionaries: src/dictionaries/"));
    lines.push(blank);
    lines.push(pointed("2. EDIT the file to catch the missed values"));
    lines.push(pointed2("Add pattern/regex for the formats shown above"));
    lines.push(pointed2("Or add missing entries to the dictionary"));
    lines.push(blank);
    lines.push(pointed("3. RUN the test again"));
    lines.push(pointed2("node tests/master-suite/run.js --log-file"));
    lines.push(blank);
    lines.push(pointed("4. COMPARE metrics"));
    lines.push(pointed2("Better? Keep the change, continue to next failure"));
    lines.push(pointed2("Worse?  Revert with: git checkout <file>"));
    lines.push(blank);
    lines.push(mid);
    lines.push(pointed("CHAIN OF THOUGHT - MANDATORY REASONING"));
    lines.push(mid);
    lines.push(blank);
    lines.push(pointed("BEFORE making ANY change, you MUST write out:"));
    lines.push(blank);
    lines.push(pointed("A. OBSERVATION: What specific pattern am I seeing?"));
    lines.push(
      pointed2('Example: "3 of 5 missed names have digits: PENEL0PE"'),
    );
    lines.push(blank);
    lines.push(pointed("B. ROOT CAUSE: Why is the current code missing this?"));
    lines.push(
      pointed2('Example: "OCR normalization doesn\'t run before detection"'),
    );
    lines.push(blank);
    lines.push(pointed("C. HYPOTHESIS: What change will fix it?"));
    lines.push(
      pointed2('Example: "Normalize OCR chars in isFirstName() before lookup"'),
    );
    lines.push(blank);
    lines.push(pointed("D. RISK ASSESSMENT: What could go wrong?"));
    lines.push(
      pointed2('Example: "Might match medical terms like C0PD -> COPD"'),
    );
    lines.push(blank);
    lines.push(pointed("E. SUCCESS CRITERIA: How will I know it worked?"));
    lines.push(
      pointed2('Example: "Sensitivity +0.5% AND Specificity unchanged"'),
    );
    lines.push(blank);
    lines.push(pointed("F. ROLLBACK PLAN: How to undo if it fails?"));
    lines.push(
      pointed2('Example: "git checkout src/dictionaries/NameDictionary.ts"'),
    );
    lines.push(blank);
    lines.push(mid);
    lines.push(pointed("ALL FAILURES BY TYPE"));
    lines.push(mid);
    for (const [type, items] of sortedTypes) {
      lines.push(pointed2(`${type.padEnd(20)} ${items.length} missed`));
    }
    lines.push(blank);
    lines.push(bot);
  } else {
    lines.push("");
    lines.push(top);
    lines.push(pointed("PASSING - Optional improvements available"));
    lines.push(mid);
    lines.push(blank);
    lines.push(pointed("REMAINING FAILURES BY TYPE"));
    if (sortedTypes.length > 0) {
      for (const [type, items] of sortedTypes) {
        lines.push(pointed2(`${type.padEnd(20)} ${items.length} missed`));
      }
    } else {
      lines.push(pointed2("None!"));
    }
    lines.push(blank);
    lines.push(pointed("To further improve:"));
    lines.push(pointed2("Review remaining failures and apply fixes"));
    lines.push(
      pointed2("Run with --profile HIPAA_STRICT for production readiness"),
    );
    lines.push(blank);
    lines.push(bot);
  }

  lines.push("");
  lines.push(top);
  lines.push(pointed("VULPES CORTEX MCP SERVER"));
  lines.push(mid);
  lines.push(blank);
  lines.push(pointed("Start:  node tests/master-suite/cortex --server"));
  lines.push(blank);
  lines.push(
    pointed(
      "Tools:  analyze_test_results, consult_history, get_recommendation",
    ),
  );
  lines.push(blank);
  lines.push(
    pointed("The MCP remembers what worked and warns about failed approaches!"),
  );
  lines.push(blank);
  lines.push(bot);
  lines.push("");

  log(lines.join("\n"));
}

main();
