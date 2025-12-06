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
 * ║   MCP TOOLS                                                                   ║
 * ║   Executable Actions for LLM Integration                                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * Tools are actions the LLM can invoke to interact with Vulpes Cortex.
 *
 * TOOL CATEGORIES:
 * ─────────────────────────────────────────────────────────────────────────────────
 * ANALYSIS     - Analyze patterns, metrics, codebase
 * DECISION     - Get recommendations, consult history
 * EXPERIMENT   - Run experiments, compare results
 * MANAGEMENT   - Record interventions, track changes
 * REPORTING    - Generate reports, summaries
 */

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const { spawn } = require("child_process");
const path = require("path");

const TOOLS = [
  // ─────────────────────────────────────────────────────────────────────────
  // TEST EXECUTION - THE MAIN TOOL
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: "run_tests",
    description: `Execute the full PHI detection test suite and return comprehensive analyzed results. This is the PRIMARY tool for the improvement loop.

Returns:
- metrics: sensitivity, specificity, F1, F2, MCC, grade
- top_failure: type, count, examples, file to edit, historical context
- action: specific instruction for what to fix
- all_failures: grouped by type with counts
- insights: warnings and opportunities
- history_consulted: what worked/failed before for similar issues

After receiving results, the LLM should:
1. Read the recommended file
2. Make the fix
3. Call run_tests again to verify improvement`,
    inputSchema: {
      type: "object",
      properties: {
        profile: {
          type: "string",
          enum: ["HIPAA_STRICT", "DEVELOPMENT", "RESEARCH", "OCR_TOLERANT"],
          description: "Grading profile (default: HIPAA_STRICT)",
        },
        documentCount: {
          type: "number",
          description: "Number of test documents (default: 200)",
        },
        quick: {
          type: "boolean",
          description: "Quick test with 50 documents",
        },
        focusPhiType: {
          type: "string",
          description:
            "Focus analysis on specific PHI type (NAME, SSN, DATE, etc.)",
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ANALYSIS TOOLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: "analyze_test_results",
    description:
      "Analyze test results to identify patterns, calculate metrics, and generate insights. Returns comprehensive analysis including failure patterns, success rates, and recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        results: {
          type: "object",
          description:
            "Test results object containing documents, metrics, or raw counts (TP, FP, TN, FN)",
        },
        options: {
          type: "object",
          properties: {
            generateInsights: {
              type: "boolean",
              description: "Whether to generate insights from results",
            },
            analyzePatterns: {
              type: "boolean",
              description: "Whether to analyze failure patterns",
            },
            recordToHistory: {
              type: "boolean",
              description: "Whether to record this run to history",
            },
          },
        },
      },
      required: ["results"],
    },
  },
  {
    name: "get_codebase_state",
    description:
      "Get the current state of the PHI detection codebase including filters, dictionaries, capabilities, and gaps.",
    inputSchema: {
      type: "object",
      properties: {
        detailed: {
          type: "boolean",
          description: "Include detailed filter/dictionary information",
        },
      },
    },
  },
  {
    name: "analyze_patterns",
    description:
      "Get analysis of recurring failure and success patterns. Useful for understanding what types of PHI are being missed and why.",
    inputSchema: {
      type: "object",
      properties: {
        phiType: {
          type: "string",
          description:
            "Filter patterns by specific PHI type (e.g., NAME, SSN, DATE)",
        },
        limit: {
          type: "number",
          description: "Maximum number of patterns to return",
        },
      },
    },
  },
  {
    name: "get_metrics_trend",
    description:
      "Get the trend of a specific metric over time (improving, declining, stable).",
    inputSchema: {
      type: "object",
      properties: {
        metric: {
          type: "string",
          enum: ["sensitivity", "specificity", "f1Score", "mcc", "precision"],
          description: "Which metric to analyze",
        },
        days: { type: "number", description: "Number of days to analyze" },
      },
      required: ["metric"],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DECISION TOOLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: "get_recommendation",
    description:
      "Get comprehensive data to make a recommendation. Returns history, patterns, insights, and trends. YOU (the LLM) analyze this data and make the actual recommendation - the tool provides context, not decisions.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: [
            "WHAT_TO_IMPROVE",
            "HOW_TO_FIX",
            "SHOULD_WE_TRY",
            "VALIDATE_HYPOTHESIS",
            "INTERPRET_RESULTS",
          ],
          description: "Type of analysis context needed",
        },
        context: {
          type: "object",
          description:
            "Context for the recommendation (phiType, issueType, etc.)",
        },
      },
      required: ["type"],
    },
  },
  {
    name: "consult_history",
    description:
      "MANDATORY: Consult historical data before making any change. Returns what was tried before and what happened.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What are you planning to try?" },
        phiType: {
          type: "string",
          description: "PHI type involved (if applicable)",
        },
        interventionType: {
          type: "string",
          description: "Type of intervention being considered",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_active_insights",
    description:
      "Get current actionable insights including warnings, opportunities, and recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        priority: {
          type: "string",
          enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO", "ALL"],
          description: "Filter by priority level",
        },
        type: {
          type: "string",
          enum: ["OPPORTUNITY", "WARNING", "RECOMMENDATION", "SUCCESS", "ALL"],
          description: "Filter by insight type",
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // EXPERIMENT TOOLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: "create_experiment",
    description:
      "Create a new A/B experiment to test a change before committing it.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the experiment" },
        description: {
          type: "string",
          description: "What change is being tested",
        },
        hypothesisId: {
          type: "string",
          description: "ID of hypothesis being tested (if any)",
        },
        rollbackOnRegression: {
          type: "boolean",
          description: "Auto-rollback if regression detected",
        },
      },
      required: ["name", "description"],
    },
  },
  {
    name: "compare_results",
    description:
      "Compare two test results (before/after) to determine if a change improved or regressed performance.",
    inputSchema: {
      type: "object",
      properties: {
        before: { type: "object", description: "Results before the change" },
        after: { type: "object", description: "Results after the change" },
      },
      required: ["before", "after"],
    },
  },
  {
    name: "create_backup",
    description:
      "Create a backup before making changes (required for safe experimentation).",
    inputSchema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: { type: "string" },
          description: "Files to backup",
        },
        description: {
          type: "string",
          description: "Why this backup is being created",
        },
      },
      required: ["description"],
    },
  },
  {
    name: "rollback",
    description: "Rollback to a previous backup if changes caused regression.",
    inputSchema: {
      type: "object",
      properties: {
        backupId: { type: "string", description: "ID of backup to restore" },
        reason: { type: "string", description: "Reason for rollback" },
      },
      required: ["backupId", "reason"],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MANAGEMENT TOOLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: "record_intervention",
    description:
      "Record an intervention (change) being made. Required for tracking what was tried.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: [
            "FILTER_MODIFICATION",
            "DICTIONARY_UPDATE",
            "PATTERN_ADDITION",
            "CONFIG_CHANGE",
            "THRESHOLD_ADJUSTMENT",
            "FEATURE_TOGGLE",
          ],
          description: "Type of intervention",
        },
        description: { type: "string", description: "What is being changed" },
        target: {
          type: "object",
          properties: {
            file: { type: "string" },
            component: { type: "string" },
            parameter: { type: "string" },
          },
        },
        metricsBefore: {
          type: "object",
          description: "Metrics before the change",
        },
        reason: {
          type: "string",
          description: "Why this change is being made",
        },
      },
      required: ["type", "description"],
    },
  },
  {
    name: "record_effect",
    description: "Record the effect of an intervention after testing.",
    inputSchema: {
      type: "object",
      properties: {
        interventionId: {
          type: "string",
          description: "ID of the intervention",
        },
        metricsAfter: {
          type: "object",
          description: "Metrics after the change",
        },
      },
      required: ["interventionId", "metricsAfter"],
    },
  },
  {
    name: "create_hypothesis",
    description: "Create a hypothesis for an improvement that can be tested.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: [
            "ADD_PATTERN",
            "ADD_DICTIONARY_ENTRY",
            "ENABLE_FUZZY_DICTIONARY",
            "ADJUST_THRESHOLD",
            "ADD_CONTEXT_RULE",
            "ADD_OCR_SUBSTITUTION",
          ],
          description: "Type of hypothesis",
        },
        params: {
          type: "object",
          description: "Parameters for the hypothesis (varies by type)",
        },
        evidence: {
          type: "object",
          description: "Supporting evidence (patterns, metrics)",
        },
      },
      required: ["type", "params"],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // REPORTING TOOLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: "generate_report",
    description: "Generate a comprehensive report.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: [
            "INSIGHTS",
            "RECOMMENDATIONS",
            "CODEBASE_STATE",
            "COMPARISON",
            "FULL",
          ],
          description: "Type of report to generate",
        },
        format: {
          type: "string",
          enum: ["TEXT", "JSON"],
          description: "Output format",
        },
      },
      required: ["type"],
    },
  },
  {
    name: "get_summary",
    description:
      "Get a quick summary of current system state, suitable for context.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DIAGNOSTIC TOOLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: "diagnose",
    description: `Run diagnostics on the MCP server and test infrastructure.

Returns:
- server_status: health check information
- module_status: which Cortex modules are loaded
- recent_errors: last 10 errors with timestamps and stack traces
- environment: Node version, paths, memory usage
- recommendations: suggested fixes for any issues found

Use this when experiencing issues or before starting a testing session.`,
    inputSchema: {
      type: "object",
      properties: {
        verbose: {
          type: "boolean",
          description: "Include full stack traces and detailed module info",
        },
      },
    },
  },
];

// ============================================================================
// TOOL EXECUTION
// ============================================================================

async function executeTool(name, args, modules) {
  switch (name) {
    // TEST EXECUTION - PRIMARY TOOL
    case "run_tests":
      return runTests(args, modules);

    // ANALYSIS TOOLS
    case "analyze_test_results":
      return analyzeTestResults(args, modules);

    case "get_codebase_state":
      return getCodebaseState(args, modules);

    case "analyze_patterns":
      return analyzePatterns(args, modules);

    case "get_metrics_trend":
      return getMetricsTrend(args, modules);

    // DECISION TOOLS
    case "get_recommendation":
      return getRecommendation(args, modules);

    case "consult_history":
      return consultHistory(args, modules);

    case "get_active_insights":
      return getActiveInsights(args, modules);

    // EXPERIMENT TOOLS
    case "create_experiment":
      return createExperiment(args, modules);

    case "compare_results":
      return compareResults(args, modules);

    case "create_backup":
      return createBackup(args, modules);

    case "rollback":
      return rollback(args, modules);

    // MANAGEMENT TOOLS
    case "record_intervention":
      return recordIntervention(args, modules);

    case "record_effect":
      return recordEffect(args, modules);

    case "create_hypothesis":
      return createHypothesis(args, modules);

    // REPORTING TOOLS
    case "generate_report":
      return generateReport(args, modules);

    case "get_summary":
      return getSummary(modules);

    // DIAGNOSTIC TOOLS
    case "diagnose":
      return runDiagnostics(args, modules);

    default:
      throw new Error(
        `Unknown tool: ${name}. Available tools: ${TOOLS.map((t) => t.name).join(", ")}`,
      );
  }
}

// ============================================================================
// TOOL IMPLEMENTATIONS
// ============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// run_tests - THE PRIMARY TOOL
// Executes tests and returns fully analyzed, actionable results
// ─────────────────────────────────────────────────────────────────────────────

async function runTests(args, modules) {
  const {
    profile = "HIPAA_STRICT",
    documentCount = 200,
    quick = false,
    focusPhiType = null,
  } = args || {};

  const count = quick ? 50 : documentCount;

  console.error(`[Cortex] Running tests: ${count} docs, profile=${profile}`);

  // STEP 1: Execute the test suite
  const testResults = await executeTestSuite(count, profile);

  if (testResults.error) {
    return {
      success: false,
      error: testResults.error,
      action: "Fix the error and try again",
    };
  }

  console.error(`[Cortex] Tests complete. Analyzing results...`);

  // STEP 2: Use metrics from RigorousAssessment (already calculated)
  // testResults.metrics contains sensitivity, specificity, precision, etc.
  const metrics = testResults.metrics || {};

  // Get grade from the assessment results
  const gradeInfo = {
    grade: metrics.grade || testResults.grade || "?",
    score: metrics.finalScore || 0,
  };

  // STEP 3: Analyze failure patterns
  let patterns = { failurePatterns: [], stats: {} };
  if (modules.patternRecognizer) {
    patterns = modules.patternRecognizer.analyzeTestResult({
      falseNegatives: testResults.failures,
      falsePositives: testResults.overRedactions,
    });
  }

  // STEP 4: Group failures by type
  const failuresByType = groupFailuresByType(testResults.failures || []);
  const sortedFailures = Object.entries(failuresByType)
    .map(([type, items]) => ({ type, count: items.length, items }))
    .sort((a, b) => b.count - a.count);

  // STEP 5: Identify top failure and get historical context
  const topFailure = sortedFailures[0] || null;
  let historyContext = null;
  let fileToEdit = null;

  if (topFailure && modules.historyConsultant) {
    console.error(`[Cortex] Consulting history for ${topFailure.type}...`);
    historyContext = await modules.historyConsultant.consult("HOW_TO_FIX", {
      phiType: topFailure.type,
      issueType: "FALSE_NEGATIVE",
    });
  }

  // STEP 6: Determine which file to edit
  if (topFailure) {
    fileToEdit = getFileForPhiType(topFailure.type, modules);
  }

  // STEP 7: Generate insights
  let insights = { critical: [], high: [], opportunities: [] };
  if (modules.insightGenerator) {
    // Feed current data to insight generator
    modules.insightGenerator.generateInsights();
    const allInsights = modules.insightGenerator.getActiveInsights();
    insights = {
      critical: allInsights
        .filter((i) => i.priority === "CRITICAL")
        .slice(0, 3),
      high: allInsights.filter((i) => i.priority === "HIGH").slice(0, 3),
      opportunities: allInsights
        .filter((i) => i.type === "OPPORTUNITY")
        .slice(0, 3),
    };
  }

  // STEP 8: Record this test run to temporal index
  if (modules.temporalIndex) {
    modules.temporalIndex.recordMetrics({
      ...metrics,
      timestamp: new Date().toISOString(),
      documentCount: count,
      profile,
    });
  }

  // STEP 9: Build the action recommendation
  const action = buildActionRecommendation(
    topFailure,
    fileToEdit,
    historyContext,
    metrics,
  );

  // STEP 10: Assemble final response
  const response = {
    success: true,
    timestamp: new Date().toISOString(),

    // Core metrics
    metrics: {
      sensitivity: round(metrics.sensitivity, 2),
      specificity: round(metrics.specificity, 2),
      precision: round(metrics.precision, 2),
      f1Score: round(metrics.f1Score, 2),
      f2Score: round(metrics.f2Score, 2),
      mcc: round(metrics.mcc, 3),
      grade: gradeInfo.grade,
      score: round(gradeInfo.score, 1),
    },

    // Confusion matrix (use metrics source for consistency)
    confusionMatrix: {
      truePositives:
        metrics.confusionMatrix?.truePositives ??
        testResults.confusionMatrix?.tp ??
        0,
      trueNegatives:
        metrics.confusionMatrix?.trueNegatives ??
        testResults.confusionMatrix?.tn ??
        0,
      falsePositives:
        metrics.confusionMatrix?.falsePositives ??
        testResults.confusionMatrix?.fp ??
        0,
      falseNegatives:
        metrics.confusionMatrix?.falseNegatives ??
        testResults.confusionMatrix?.fn ??
        0,
      totalPHI: metrics.confusionMatrix?.totalPHI ?? 0,
      totalNonPHI: metrics.confusionMatrix?.totalNonPHI ?? 0,
      // Integrity check: TP + FN should equal totalPHI
      integrityPassed: metrics.integrityCheck?.passed ?? true,
    },

    // Top failure with full context
    topFailure: topFailure
      ? {
          type: topFailure.type,
          count: topFailure.count,
          examples: topFailure.items.slice(0, 5).map((f) => ({
            value: f.value,
            context: f.context?.substring(0, 100),
            errorLevel: f.errorLevel,
          })),
          fileToEdit: fileToEdit?.path || null,
          lineHint: fileToEdit?.lineHint || null,
          historicalContext: historyContext
            ? {
                summary: historyContext.summary,
                previousSuccesses: historyContext.relatedSuccesses?.length || 0,
                previousFailures: historyContext.relatedFailures?.length || 0,
                warnings: historyContext.warnings?.map((w) => w.message) || [],
                suggestedApproach: historyContext.suggestedApproach || null,
              }
            : null,
        }
      : null,

    // Action instruction for LLM
    action,

    // All failures grouped
    allFailures: sortedFailures.map((f) => ({
      type: f.type,
      count: f.count,
    })),

    // Insights
    insights: {
      critical: insights.critical.map((i) => i.title || i.content),
      high: insights.high.map((i) => i.title || i.content),
      opportunities: insights.opportunities.map((i) => i.title || i.content),
    },

    // Test metadata
    testInfo: {
      documentCount: count,
      profile,
      totalPhi: testResults.totalPhi || 0,
      totalNonPhi: testResults.totalNonPhi || 0,
    },

    // Test validation warnings (CRITICAL - indicates test bugs)
    testValidation: testResults.testValidation || null,
  };

  // Focus on specific PHI type if requested
  if (focusPhiType) {
    const focusedFailure = sortedFailures.find(
      (f) => f.type.toUpperCase() === focusPhiType.toUpperCase(),
    );
    if (focusedFailure) {
      response.focusedAnalysis = {
        type: focusedFailure.type,
        count: focusedFailure.count,
        examples: focusedFailure.items.slice(0, 10).map((f) => ({
          value: f.value,
          context: f.context,
          errorLevel: f.errorLevel,
        })),
        fileToEdit: getFileForPhiType(focusedFailure.type, modules),
      };
    }
  }

  console.error(
    `[Cortex] Analysis complete. Grade: ${gradeInfo.grade}, Sensitivity: ${round(metrics.sensitivity, 2)}%`,
  );

  return response;
}

// Execute the actual test suite INTERNALLY (no external process spawning)
// The MCP server runs tests directly using RigorousAssessment
async function executeTestSuite(documentCount, profile) {
  console.error(
    `[Cortex] ════════════════════════════════════════════════════`,
  );
  console.error(`[Cortex] RUNNING ASSESSMENT INTERNALLY`);
  console.error(`[Cortex]   Documents: ${documentCount}`);
  console.error(`[Cortex]   Profile: ${profile}`);
  console.error(
    `[Cortex] ════════════════════════════════════════════════════`,
  );

  try {
    // Import the RigorousAssessment class directly - NO external process!
    // Clear require cache for entire test suite to ensure fresh code
    const basePath = path.join(__dirname, "..", "..");
    Object.keys(require.cache).forEach((key) => {
      if (key.startsWith(basePath) && !key.includes("node_modules")) {
        delete require.cache[key];
      }
    });

    const { RigorousAssessment } = require("../../assessment/assessment");

    // Create assessment instance with grading profile
    const assessment = new RigorousAssessment({
      documentCount: documentCount,
      verbose: false,
      profile: profile, // Pass grading profile (HIPAA_STRICT, DEVELOPMENT, etc.)
    });

    console.error(`[Cortex] Phase 1: Running full test suite...`);
    await assessment.runFullSuite();

    console.error(`[Cortex] Phase 2: Calculating metrics...`);
    assessment.calculateMetrics();

    console.error(`[Cortex] Phase 3: Investigating failures...`);
    assessment.investigateFailures();

    // Extract results
    const results = assessment.results;
    const cm = results.metrics?.confusionMatrix || {};

    const confusionMatrix = {
      tp: cm.truePositives ?? 0,
      tn: cm.trueNegatives ?? 0,
      fp: cm.falsePositives ?? 0,
      fn: cm.falseNegatives ?? 0,
    };

    console.error(
      `[Cortex] ════════════════════════════════════════════════════`,
    );
    console.error(`[Cortex] ASSESSMENT COMPLETE`);
    console.error(`[Cortex]   Grade: ${results.metrics?.grade}`);
    console.error(
      `[Cortex]   Sensitivity: ${results.metrics?.sensitivity?.toFixed(2)}%`,
    );
    console.error(
      `[Cortex]   Specificity: ${results.metrics?.specificity?.toFixed(2)}%`,
    );
    console.error(`[Cortex]   Failures: ${results.failures?.length || 0}`);
    console.error(
      `[Cortex] ════════════════════════════════════════════════════`,
    );

    // Check for test validation warnings
    const validation = results.metrics?.testValidation || {};
    const hasValidationWarning = validation.skippedPercentage > 50;

    if (hasValidationWarning) {
      console.error(
        `[Cortex] ⚠️ TEST VALIDATION WARNING: ${validation.skippedPercentage}% of non-PHI items not found in documents!`,
      );
    }

    return {
      metrics: results.metrics,
      confusionMatrix,
      failures: results.failures || [],
      overRedactions: results.overRedactions || [],
      investigation: results.investigation || {},
      grade: results.metrics?.grade,
      totalPhi: confusionMatrix.tp + confusionMatrix.fn,
      totalNonPhi: confusionMatrix.tn + confusionMatrix.fp,
      // Include validation info so LLM knows about test issues
      testValidation: {
        skippedNonPHI: validation.skippedNonPHI || 0,
        skippedPercentage: validation.skippedPercentage || 0,
        skippedByType: validation.skippedByType || {},
        hasCriticalWarning: hasValidationWarning,
      },
    };
  } catch (err) {
    console.error(`[Cortex] ❌ ASSESSMENT FAILED: ${err.message}`);
    console.error(`[Cortex] Stack: ${err.stack}`);
    return {
      error: `Assessment failed: ${err.message}`,
      stack: err.stack,
    };
  }
}

// Group failures by PHI type
function groupFailuresByType(failures) {
  const groups = {};
  for (const failure of failures) {
    const type = failure.phiType || failure.type || "UNKNOWN";
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(failure);
  }
  return groups;
}

// Get the file that handles a specific PHI type
function getFileForPhiType(phiType, modules) {
  // Map PHI types to filter files
  const fileMap = {
    NAME: {
      path: "src/redaction/filters/NameFilter.ts",
      lineHint: null,
      description: "Name detection filter",
    },
    SSN: {
      path: "src/redaction/filters/SSNFilter.ts",
      lineHint: null,
      description: "Social Security Number filter",
    },
    DOB: {
      path: "src/redaction/filters/DateFilter.ts",
      lineHint: null,
      description: "Date of Birth filter",
    },
    DATE: {
      path: "src/redaction/filters/DateFilter.ts",
      lineHint: null,
      description: "Date filter",
    },
    PHONE: {
      path: "src/redaction/filters/PhoneFilter.ts",
      lineHint: null,
      description: "Phone number filter",
    },
    EMAIL: {
      path: "src/redaction/filters/EmailFilter.ts",
      lineHint: null,
      description: "Email filter",
    },
    ADDRESS: {
      path: "src/redaction/filters/AddressFilter.ts",
      lineHint: null,
      description: "Address filter",
    },
    MRN: {
      path: "src/redaction/filters/MRNFilter.ts",
      lineHint: null,
      description: "Medical Record Number filter",
    },
    MEDICATION: {
      path: "src/redaction/dictionaries/medications.json",
      lineHint: null,
      description: "Medications dictionary",
    },
    DIAGNOSIS: {
      path: "src/redaction/dictionaries/diagnoses.json",
      lineHint: null,
      description: "Diagnoses dictionary",
    },
  };

  const upperType = phiType?.toUpperCase() || "";

  // Direct match
  if (fileMap[upperType]) {
    return fileMap[upperType];
  }

  // Try to find via codebase analyzer
  if (modules.codebaseAnalyzer) {
    const state = modules.codebaseAnalyzer.exportForLLM();
    const filter = state.filterCapabilities?.find(
      (f) =>
        f.phiTypes?.includes(upperType) ||
        f.name?.toUpperCase().includes(upperType),
    );
    if (filter) {
      return {
        path: filter.file || `src/redaction/filters/${filter.name}.ts`,
        lineHint: null,
        description: `Filter for ${upperType}`,
      };
    }
  }

  // Default fallback
  return {
    path: "src/redaction/filters/",
    lineHint: null,
    description: `Look for filter handling ${phiType}`,
  };
}

// Build action recommendation
function buildActionRecommendation(
  topFailure,
  fileToEdit,
  historyContext,
  metrics,
) {
  if (!topFailure) {
    if (metrics.sensitivity >= 99) {
      return "Excellent! Sensitivity is at 99%+. Focus on reducing false positives if needed.";
    }
    return "No specific failures identified. Review test output for details.";
  }

  const parts = [];

  // What to do
  parts.push(`Fix ${topFailure.type} detection (${topFailure.count} missed).`);

  // Where to do it
  if (fileToEdit?.path) {
    parts.push(`Edit: ${fileToEdit.path}`);
  }

  // Examples
  const exampleValues = topFailure.items
    .slice(0, 3)
    .map((f) => `"${f.value}"`)
    .join(", ");
  parts.push(`Examples: ${exampleValues}`);

  // Historical guidance
  if (historyContext?.suggestedApproach) {
    parts.push(`Suggested: ${historyContext.suggestedApproach}`);
  } else if (historyContext?.relatedSuccesses?.length > 0) {
    parts.push(
      `Note: Similar fixes succeeded ${historyContext.relatedSuccesses.length} times before.`,
    );
  }

  // Warnings
  if (historyContext?.warnings?.length > 0) {
    parts.push(`Warning: ${historyContext.warnings[0].message}`);
  }

  return parts.join(" ");
}

// Round helper
function round(num, decimals) {
  if (typeof num !== "number" || isNaN(num)) return 0;
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

async function analyzeTestResults(args, modules) {
  const { results, options = {} } = args;

  const analysis = {
    timestamp: new Date().toISOString(),
    metrics: null,
    patterns: null,
    insights: null,
  };

  // Calculate metrics
  if (modules.metricsEngine) {
    analysis.metrics = modules.metricsEngine.calculateAll(results);
  }

  // Analyze patterns
  if (options.analyzePatterns !== false && modules.patternRecognizer) {
    analysis.patterns = modules.patternRecognizer.analyzeTestResult(results);
  }

  // Generate insights
  if (options.generateInsights && modules.insightGenerator) {
    analysis.insights = modules.insightGenerator.generateInsights();
  }

  // Record to history
  if (options.recordToHistory && modules.temporalIndex) {
    modules.temporalIndex.recordMetrics(analysis.metrics);
  }

  return analysis;
}

async function getCodebaseState(args, modules) {
  const { detailed = false } = args;

  if (modules.codebaseStateTracker) {
    return detailed
      ? modules.codebaseStateTracker.getCurrentState()
      : modules.codebaseStateTracker.exportForLLM();
  }

  if (modules.codebaseAnalyzer) {
    return detailed
      ? modules.codebaseAnalyzer.takeSnapshot()
      : modules.codebaseAnalyzer.exportForLLM();
  }

  throw new Error("No codebase analyzer available");
}

async function analyzePatterns(args, modules) {
  const { phiType, limit = 10 } = args;

  if (!modules.patternRecognizer) {
    throw new Error("Pattern recognizer not available");
  }

  if (phiType) {
    return modules.patternRecognizer.getPatternsByPhiType(phiType);
  }

  return {
    topFailures: modules.patternRecognizer.getTopFailurePatterns(limit),
    trending: modules.patternRecognizer.getTrendingPatterns(),
    stats: modules.patternRecognizer.getStats(),
  };
}

async function getMetricsTrend(args, modules) {
  const { metric, days = 30 } = args;

  if (!modules.temporalIndex) {
    throw new Error("Temporal index not available");
  }

  return modules.temporalIndex.analyzeTrend(metric, { days });
}

async function getRecommendation(args, modules) {
  const { type, context = {} } = args;

  // IMPORTANT: This tool gathers DATA for the LLM to analyze.
  // The LLM makes the actual recommendation based on this data.
  // We do NOT make decisions here - we provide context.

  const data = {
    requestType: type,
    context,
    timestamp: new Date().toISOString(),

    // Historical data - what was tried before?
    history: null,

    // Current state - what does the codebase look like?
    codebaseState: null,

    // Patterns - what's failing and why?
    patterns: null,

    // Insights - what has the system learned?
    insights: null,

    // Metrics trends - are things improving or declining?
    trends: null,
  };

  // Gather history
  if (modules.historyConsultant) {
    data.history = await modules.historyConsultant.consult(type, context);
  }

  // Gather codebase state
  if (modules.codebaseAnalyzer) {
    data.codebaseState = modules.codebaseAnalyzer.exportForLLM();
  }

  // Gather patterns
  if (modules.patternRecognizer) {
    data.patterns = {
      topFailures: modules.patternRecognizer.getTopFailurePatterns(10),
      byPhiType: context.phiType
        ? modules.patternRecognizer.getPatternsByPhiType(context.phiType)
        : null,
      stats: modules.patternRecognizer.getStats(),
    };
  }

  // Gather insights
  if (modules.insightGenerator) {
    const allInsights = modules.insightGenerator.getActiveInsights();
    data.insights = {
      critical: allInsights.filter((i) => i.priority === "CRITICAL"),
      high: allInsights.filter((i) => i.priority === "HIGH"),
      medium: allInsights.filter((i) => i.priority === "MEDIUM").slice(0, 5),
      total: allInsights.length,
    };
  }

  // Gather trends
  if (modules.temporalIndex) {
    data.trends = {
      sensitivity: modules.temporalIndex.analyzeTrend("sensitivity"),
      specificity: modules.temporalIndex.analyzeTrend("specificity"),
      mcc: modules.temporalIndex.analyzeTrend("mcc"),
    };
  }

  // Add guidance for LLM on what to consider
  data.analysisGuidance = getAnalysisGuidance(type);

  return data;
}

function getAnalysisGuidance(type) {
  const guidance = {
    WHAT_TO_IMPROVE: {
      task: "Determine what area needs the most attention",
      consider: [
        "Critical and high-priority insights first",
        "Patterns with highest failure counts",
        "Trends showing decline",
        "Historical success/failure rates for similar interventions",
      ],
      output: "Prioritized list of improvement areas with reasoning",
    },
    HOW_TO_FIX: {
      task: "Develop a specific fix strategy",
      consider: [
        "What worked before for similar issues (history)",
        "What failed before and why",
        "Current codebase capabilities",
        "Risk of regression",
      ],
      output: "Step-by-step fix plan with risk assessment",
    },
    SHOULD_WE_TRY: {
      task: "Decide whether to proceed with a proposed change",
      consider: [
        "Historical success rate for similar changes",
        "Current system stability (trends)",
        "Potential impact vs risk",
        "Whether proper testing is possible",
      ],
      output: "GO/NO-GO decision with clear reasoning",
    },
    VALIDATE_HYPOTHESIS: {
      task: "Assess if a hypothesis is worth testing",
      consider: [
        "Evidence supporting the hypothesis",
        "Similar hypotheses tested before",
        "Cost of testing vs potential benefit",
        "Current priorities",
      ],
      output: "Validation assessment with confidence level",
    },
    INTERPRET_RESULTS: {
      task: "Explain what test results mean",
      consider: [
        "Comparison to previous runs (trends)",
        "Statistical significance",
        "Which PHI types improved/regressed",
        "Whether changes achieved their goal",
      ],
      output: "Clear interpretation with next steps",
    },
  };

  return (
    guidance[type] || {
      task: "Analyze the provided data and make a recommendation",
      consider: ["All available context"],
      output: "Reasoned recommendation",
    }
  );
}

async function consultHistory(args, modules) {
  const { query, phiType, interventionType } = args;

  if (!modules.historyConsultant) {
    throw new Error("History consultant not available");
  }

  return await modules.historyConsultant.consult(
    interventionType || "GENERAL",
    {
      description: query,
      phiType,
      type: interventionType,
    },
  );
}

async function getActiveInsights(args, modules) {
  const { priority = "ALL", type = "ALL" } = args;

  if (!modules.insightGenerator) {
    throw new Error("Insight generator not available");
  }

  let insights = modules.insightGenerator.getActiveInsights();

  if (priority !== "ALL") {
    insights = insights.filter((i) => i.priority === priority);
  }

  if (type !== "ALL") {
    insights = insights.filter((i) => i.type === type);
  }

  return {
    count: insights.length,
    insights: insights.slice(0, 20),
    summary: modules.insightGenerator.getSummary(),
  };
}

async function createExperiment(args, modules) {
  const { name, description, hypothesisId, rollbackOnRegression = true } = args;

  if (!modules.experimentRunner) {
    throw new Error("Experiment runner not available");
  }

  return modules.experimentRunner.createExperiment({
    name,
    treatment: { description },
    hypothesisId,
    rollbackOnRegression,
  });
}

async function compareResults(args, modules) {
  const { before, after } = args;

  if (!modules.comparisonEngine) {
    throw new Error("Comparison engine not available");
  }

  return modules.comparisonEngine.compare(before, after);
}

async function createBackup(args, modules) {
  const { files = [], description } = args;

  if (!modules.rollbackManager) {
    throw new Error("Rollback manager not available");
  }

  return modules.rollbackManager.createBackup({
    files,
    description,
  });
}

async function rollback(args, modules) {
  const { backupId, reason } = args;

  if (!modules.rollbackManager) {
    throw new Error("Rollback manager not available");
  }

  return modules.rollbackManager.executeRollback(backupId, { reason });
}

async function recordIntervention(args, modules) {
  const { type, description, target, metricsBefore, reason } = args;

  if (!modules.interventionTracker) {
    throw new Error("Intervention tracker not available");
  }

  return modules.interventionTracker.recordIntervention({
    type,
    description,
    target,
    metricsBefore,
    reason,
    triggeredBy: "llm",
  });
}

async function recordEffect(args, modules) {
  const { interventionId, metricsAfter } = args;

  if (!modules.interventionTracker) {
    throw new Error("Intervention tracker not available");
  }

  return modules.interventionTracker.recordEffect(interventionId, metricsAfter);
}

async function createHypothesis(args, modules) {
  const { type, params, evidence = {} } = args;

  if (!modules.hypothesisEngine) {
    throw new Error("Hypothesis engine not available");
  }

  return modules.hypothesisEngine.createHypothesis(type, params, evidence);
}

async function generateReport(args, modules) {
  const { type, format = "TEXT" } = args;

  let report;

  switch (type) {
    case "INSIGHTS":
      report = modules.insightGenerator?.generateReport();
      break;
    case "RECOMMENDATIONS":
      report = modules.recommendationBuilder?.generateReport();
      break;
    case "CODEBASE_STATE":
      report = modules.codebaseStateTracker?.generateReport();
      break;
    case "COMPARISON":
      const recent = modules.comparisonEngine?.getRecentComparisons(1);
      report = recent?.[0]
        ? modules.comparisonEngine.generateReport(recent[0].id)
        : "No recent comparisons";
      break;
    case "FULL":
      report = generateFullReport(modules);
      break;
    default:
      throw new Error(`Unknown report type: ${type}`);
  }

  if (format === "JSON") {
    return { report, format: "JSON" };
  }

  return report || "Report generation failed";
}

function generateFullReport(modules) {
  return `
╔══════════════════════════════════════════════════════════════════════════════╗
║  VULPES CORTEX - FULL STATUS REPORT                                          ║
║  Generated: ${new Date().toISOString()}
╚══════════════════════════════════════════════════════════════════════════════╝

${modules.codebaseStateTracker?.generateReport() || "Codebase state unavailable"}

${modules.insightGenerator?.generateReport() || "Insights unavailable"}

${modules.recommendationBuilder?.generateReport() || "Recommendations unavailable"}
`;
}

async function getSummary(modules) {
  return {
    timestamp: new Date().toISOString(),
    codebase: modules.codebaseStateTracker?.exportForLLM() || null,
    patterns: modules.patternRecognizer?.exportForLLM() || null,
    insights: modules.insightGenerator?.getSummary() || null,
    interventions: modules.interventionTracker?.getStats() || null,
    experiments: modules.experimentRunner?.getStats() || null,
    decisions: modules.decisionEngine?.exportForLLM() || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// runDiagnostics - Comprehensive server diagnostics
// ─────────────────────────────────────────────────────────────────────────────

async function runDiagnostics(args, modules) {
  const { verbose = false } = args || {};
  const diagnostics = {
    timestamp: new Date().toISOString(),
    status: "OK",
    issues: [],
    recommendations: [],
  };

  // 1. Server Status
  diagnostics.server = {
    uptime: process.uptime(),
    pid: process.pid,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    memoryUsage: {
      heapUsed:
        Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
      heapTotal:
        Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + " MB",
    },
  };

  // 2. Module Status
  diagnostics.modules = {};
  const expectedModules = [
    "knowledgeBase",
    "metricsEngine",
    "codebaseAnalyzer",
    "temporalIndex",
    "patternRecognizer",
    "hypothesisEngine",
    "interventionTracker",
    "insightGenerator",
    "experimentRunner",
    "snapshotManager",
    "comparisonEngine",
    "rollbackManager",
    "decisionEngine",
    "historyConsultant",
    "recommendationBuilder",
    "codebaseStateTracker",
  ];

  let loadedCount = 0;
  for (const moduleName of expectedModules) {
    const isLoaded = modules[moduleName] != null;
    diagnostics.modules[moduleName] = isLoaded ? "✓ loaded" : "✗ NOT LOADED";
    if (isLoaded) loadedCount++;
    if (!isLoaded) {
      diagnostics.issues.push(`Module "${moduleName}" is not loaded`);
    }
  }
  diagnostics.modulesSummary = `${loadedCount}/${expectedModules.length} modules loaded`;

  // 3. Test Infrastructure Check
  diagnostics.testInfrastructure = {};
  try {
    const fs = require("fs");
    const assessmentPath = require.resolve("../../assessment/assessment");
    diagnostics.testInfrastructure.rigorousAssessment = fs.existsSync(
      assessmentPath,
    )
      ? "✓ available"
      : "✗ NOT FOUND";
  } catch (e) {
    diagnostics.testInfrastructure.rigorousAssessment = `✗ ERROR: ${e.message}`;
    diagnostics.issues.push(
      "RigorousAssessment module not found - tests will fail",
    );
  }

  try {
    const enginePath = require.resolve("../../../../dist/VulpesCelare.js");
    diagnostics.testInfrastructure.vulpesCelareEngine = "✓ built";
  } catch (e) {
    diagnostics.testInfrastructure.vulpesCelareEngine = "✗ NOT BUILT";
    diagnostics.issues.push(
      "VulpesCelare engine not built - run 'npm run build' first",
    );
    diagnostics.recommendations.push("Run: npm run build");
  }

  // 4. Environment Variables
  diagnostics.environment = {
    VULPES_DEBUG: process.env.VULPES_DEBUG || "not set",
    NODE_ENV: process.env.NODE_ENV || "not set",
    cwd: process.cwd(),
  };

  // 5. Generate Recommendations
  if (diagnostics.issues.length === 0) {
    diagnostics.recommendations.push(
      "All systems operational - ready for testing",
    );
  } else {
    diagnostics.status = "ISSUES_FOUND";
    diagnostics.recommendations.unshift(
      `Found ${diagnostics.issues.length} issue(s) that should be addressed`,
    );
  }

  // Verbose mode adds more detail
  if (verbose) {
    diagnostics.detailedModuleInfo = {};
    for (const [name, module] of Object.entries(modules)) {
      if (module && typeof module.exportForLLM === "function") {
        try {
          diagnostics.detailedModuleInfo[name] = module.exportForLLM();
        } catch (e) {
          diagnostics.detailedModuleInfo[name] = { error: e.message };
        }
      }
    }
  }

  return diagnostics;
}

// ============================================================================
// EXPORTS
// ============================================================================

function getTools() {
  return TOOLS;
}

module.exports = {
  getTools,
  executeTool,
};
