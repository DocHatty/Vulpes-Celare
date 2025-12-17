#!/usr/bin/env node

/**
 * â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
 * â•‘                                                                               â•‘
 * â•‘     â–ˆâ–ˆâ•—   â–ˆâ–ˆâ•—â–ˆâ–ˆâ•—   â–ˆâ–ˆâ•—â–ˆâ–ˆâ•—     â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•— â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—                        â•‘
 * â•‘     â–ˆâ–ˆâ•‘   â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘   â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘     â–ˆâ–ˆâ•”â•â•â–ˆâ–ˆâ•—â–ˆâ–ˆâ•”â•â•â•â•â•â–ˆâ–ˆâ•”â•â•â•â•â•                        â•‘
 * â•‘     â–ˆâ–ˆâ•‘   â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘   â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘     â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•”â•â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—  â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—                        â•‘
 * â•‘     â•šâ–ˆâ–ˆâ•— â–ˆâ–ˆâ•”â•â–ˆâ–ˆâ•‘   â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘     â–ˆâ–ˆâ•”â•â•â•â• â–ˆâ–ˆâ•”â•â•â•  â•šâ•â•â•â•â–ˆâ–ˆâ•‘                        â•‘
 * â•‘      â•šâ–ˆâ–ˆâ–ˆâ–ˆâ•”â• â•šâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•”â•â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—â–ˆâ–ˆâ•‘     â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•‘                        â•‘
 * â•‘       â•šâ•â•â•â•   â•šâ•â•â•â•â•â• â•šâ•â•â•â•â•â•â•â•šâ•â•     â•šâ•â•â•â•â•â•â•â•šâ•â•â•â•â•â•â•                        â•‘
 * â•‘                                                                               â•‘
 * â•‘      â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—â–ˆâ–ˆâ•—      â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•— â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•— â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—                          â•‘
 * â•‘     â–ˆâ–ˆâ•”â•â•â•â•â•â–ˆâ–ˆâ•”â•â•â•â•â•â–ˆâ–ˆâ•‘     â–ˆâ–ˆâ•”â•â•â–ˆâ–ˆâ•—â–ˆâ–ˆâ•”â•â•â–ˆâ–ˆâ•—â–ˆâ–ˆâ•”â•â•â•â•â•                          â•‘
 * â•‘     â–ˆâ–ˆâ•‘     â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—  â–ˆâ–ˆâ•‘     â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•‘â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•”â•â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—                            â•‘
 * â•‘     â–ˆâ–ˆâ•‘     â–ˆâ–ˆâ•”â•â•â•  â–ˆâ–ˆâ•‘     â–ˆâ–ˆâ•”â•â•â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•”â•â•â–ˆâ–ˆâ•—â–ˆâ–ˆâ•”â•â•â•                            â•‘
 * â•‘     â•šâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—â–ˆâ–ˆâ•‘  â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•‘  â–ˆâ–ˆâ•‘â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—                          â•‘
 * â•‘      â•šâ•â•â•â•â•â•â•šâ•â•â•â•â•â•â•â•šâ•â•â•â•â•â•â•â•šâ•â•  â•šâ•â•â•šâ•â•  â•šâ•â•â•šâ•â•â•â•â•â•â•                          â•‘
 * â•‘                                                                               â•‘
 * â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
 * â•‘   MASTER TEST RUNNER                                                          â•‘
 * â•‘   Complete Assessment Suite with VULPES CORTEX Intelligence                   â•‘
 * â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 *
 * â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
 * â•‘  LLM STARTUP CHECKLIST - DO THIS WHEN USER SAYS "TEST THE SYSTEM"            â•‘
 * â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
 * â•‘                                                                               â•‘
 * â•‘  STEP 0: START THE MCP SERVER (for intelligent recommendations)              â•‘
 * â•‘    cd tests/master-suite/cortex && node index.js --server                    â•‘
 * â•‘    (Run in background - keeps history of what worked/failed)                 â•‘
 * â•‘                                                                               â•‘
 * â•‘  STEP 1: RUN THE TEST SUITE                                                  â•‘
 * â•‘    node tests/master-suite/run.js --log-file --profile=HIPAA_STRICT          â•‘
 * â•‘                                                                               â•‘
 * â•‘  STEP 2: READ THE FULL LOG FILE                                              â•‘
 * â•‘    Check tests/results/verbose-*.log for untruncated output                  â•‘
 * â•‘                                                                               â•‘
 * â•‘  STEP 3: FOLLOW THE ACTION CHECKLIST PRINTED AT THE END                      â•‘
 * â•‘    The test output shows EXACTLY what to fix with real examples              â•‘
 * â•‘                                                                               â•‘
 * â•‘  STEP 4: EXECUTE FIXES (You are the execution engine!)                       â•‘
 * â•‘    - READ the failing filter/dictionary                                      â•‘
 * â•‘    - EDIT it to catch the missed patterns                                    â•‘
 * â•‘    - RUN the test again                                                      â•‘
 * â•‘    - COMPARE metrics (keep if better, revert if worse)                       â•‘
 * â•‘                                                                              â•‘
 * â•‘  STEP 5: ITERATE until sensitivity >= 99%                                    â•‘
 * â•‘                                                                              â•‘
 * â•‘  KEY FILES:                                                                  â•‘
 * â•‘    Filters:      src/filters/*.ts                                            â•‘
 * â•‘    Dictionaries: src/dictionaries/*.txt                                      â•‘
 * â•‘    Test Results: tests/results/verbose-*.log                                 â•‘
 * â•‘    MCP Server:   tests/master-suite/cortex/ (port 3100)                      â•‘
 * â•‘    REST API:     tests/master-suite/cortex/api/ (port 3101)                  â•‘
 * â•‘                                                                              â•‘
 * â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 *
 * â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
 * â”‚  âš ï¸  LLM/AI OPERATOR CRITICAL INSTRUCTION:                                   â”‚
 * â”‚                                                                             â”‚
 * â”‚  ALWAYS use --log-file to prevent output truncation!                        â”‚
 * â”‚                                                                             â”‚
 * â”‚  CORRECT:   node tests/master-suite/run.js --log-file                       â”‚
 * â”‚  WRONG:     node tests/master-suite/run.js 2>&1 | tail -100                 â”‚
 * â”‚  WRONG:     node tests/master-suite/run.js 2>&1 (output will truncate!)     â”‚
 * â”‚                                                                             â”‚
 * â”‚  After running, read the log file to see FULL untruncated results:          â”‚
 * â”‚    - Log files are saved to: tests/results/verbose-*.log                    â”‚
 * â”‚    - Use: cat tests/results/verbose-*.log | tail -200                       â”‚
 * â”‚    - Or read the specific log file path shown in console output             â”‚
 * â”‚                                                                             â”‚
 * â”‚  This prevents bash/terminal truncation that loses critical metrics!        â”‚
 * â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
 *
 * â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
 * â•‘  LLM/AI OPERATOR: MANDATORY IMPROVEMENT WORKFLOW                            â•‘
 * â•‘                                                                             â•‘
 * â•‘  You MUST follow this scientific process when improving the PHI engine:     â•‘
 * â•‘                                                                             â•‘
 * â•‘  STEP 1: OBSERVE (Baseline)                                                 â•‘
 * â•‘    â–¡ Run test with 200 docs: node tests/master-suite/run.js --log-file      â•‘
 * â•‘    â–¡ Read the FULL log file (not truncated console output)                  â•‘
 * â•‘    â–¡ Record baseline metrics: Sensitivity, Specificity, F1, F2              â•‘
 * â•‘    â–¡ Identify the TOP failure pattern (e.g., "NAME: 74 failures")           â•‘
 * â•‘                                                                             â•‘
 * â•‘  STEP 2: ANALYZE                                                            â•‘
 * â•‘    â–¡ Read specific failure examples from the log                            â•‘
 * â•‘    â–¡ Identify WHY the pattern is failing (OCR? Format? Missing regex?)      â•‘
 * â•‘    â–¡ Find the relevant filter file in src/filters/                          â•‘
 * â•‘    â–¡ Understand the current detection logic                                 â•‘
 * â•‘                                                                             â•‘
 * â•‘  STEP 3: HYPOTHESIZE                                                        â•‘
 * â•‘    â–¡ Form a specific hypothesis: "Adding X pattern will catch Y cases"      â•‘
 * â•‘    â–¡ Estimate impact: "This should reduce NAME failures by ~20"             â•‘
 * â•‘    â–¡ Consider side effects: "This might cause Z false positives"            â•‘
 * â•‘                                                                             â•‘
 * â•‘  STEP 4: IMPLEMENT (Small Change)                                           â•‘
 * â•‘    â–¡ Make ONE focused change (not multiple changes at once!)                â•‘
 * â•‘    â–¡ Keep the change minimal and reversible                                 â•‘
 * â•‘    â–¡ Document what you changed and why                                      â•‘
 * â•‘                                                                             â•‘
 * â•‘  STEP 5: TEST                                                               â•‘
 * â•‘    â–¡ Run the same test: node tests/master-suite/run.js --log-file           â•‘
 * â•‘    â–¡ Compare metrics to baseline                                            â•‘
 * â•‘    â–¡ Check: Did sensitivity improve? Did false positives increase?          â•‘
 * â•‘                                                                             â•‘
 * â•‘  STEP 6: EVALUATE                                                           â•‘
 * â•‘    â–¡ If IMPROVED: Keep the change, commit it, update baseline               â•‘
 * â•‘    â–¡ If WORSE: REVERT the change immediately (git checkout)                 â•‘
 * â•‘    â–¡ If NEUTRAL: Consider reverting (simpler is better)                     â•‘
 * â•‘                                                                             â•‘
 * â•‘  STEP 7: ITERATE                                                            â•‘
 * â•‘    â–¡ Return to STEP 1 with new baseline                                     â•‘
 * â•‘    â–¡ Target the next highest-impact failure pattern                         â•‘
 * â•‘    â–¡ Continue until sensitivity >= 99% and grade is A                       â•‘
 * â•‘                                                                             â•‘
 * â•‘  CRITICAL RULES:                                                            â•‘
 * â•‘    - NEVER make multiple changes before testing                             â•‘
 * â•‘    - ALWAYS revert changes that don't improve metrics                       â•‘
 * â•‘    - ALWAYS use --log-file to see full output                               â•‘
 * â•‘    - NEVER trust truncated console output for metrics                       â•‘
 * â•‘    - ALWAYS prioritize sensitivity (recall) over precision                  â•‘
 * â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 *
 * â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
 * â•‘  LLM: YOU ARE THE EXECUTION ENGINE - NOT JUST AN ANALYZER                   â•‘
 * â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
 * â•‘                                                                             â•‘
 * â•‘  You have FULL POWER to:                                                    â•‘
 * â•‘    âœ“ READ any file (filters, dictionaries, config)                          â•‘
 * â•‘    âœ“ EDIT any file (apply fixes directly)                                   â•‘
 * â•‘    âœ“ RUN tests (node tests/master-suite/run.js --log-file)                  â•‘
 * â•‘    âœ“ COMPARE metrics (before vs after)                                      â•‘
 * â•‘    âœ“ ROLLBACK if worse (git checkout <file>)                                â•‘
 * â•‘                                                                             â•‘
 * â•‘  DO NOT just analyze and report. EXECUTE THE FIXES.                         â•‘
 * â•‘                                                                             â•‘
 * â•‘  CLOSED LOOP:                                                               â•‘
 * â•‘    1. Run test â†’ See failures with exact values                             â•‘
 * â•‘    2. Read the filter/dictionary that should catch it                       â•‘
 * â•‘    3. EDIT the file to add the missing pattern/entry                        â•‘
 * â•‘    4. Run test again â†’ Compare sensitivity                                  â•‘
 * â•‘    5. If better: keep it. If worse: git checkout <file>                     â•‘
 * â•‘    6. Repeat until sensitivity >= 99%                                       â•‘
 * â•‘                                                                             â•‘
 * â•‘  KEY LOCATIONS:                                                             â•‘
 * â•‘    Filters:      src/filters/*.ts                                           â•‘
 * â•‘    Dictionaries: src/dictionaries/*.txt                                     â•‘
 * â•‘    Core:         src/core/*.ts                                              â•‘
 * â•‘                                                                             â•‘
 * â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 *
 * USAGE:
 *   node tests/master-suite/run.js [options]
 *
 * OPTIONS:
 *   --count=N         Number of documents (default: 50)
 *   --verbose         Show detailed progress
 *   --json-only       Output only JSON (for CI/CD)
 *   --quick           Quick test (20 documents)
 *   --full            Full test (200 documents)
 *   --thorough        Thorough test (500 documents)
 *   --profile=NAME    Grading profile: HIPAA_STRICT, DEVELOPMENT, RESEARCH, OCR_TOLERANT
 *   --learn           Enable learning engine (track history, generate insights)
 *   --no-learn        Disable learning engine
 *   --context         Show LLM context for improvements
 *   --evolution       Show evolution report
 *   --cortex          Enable Vulpes Cortex (advanced learning system)
 *   --no-cortex       Disable Vulpes Cortex
 *   --cortex-report   Show Cortex full report
 *   --cortex-insights Show Cortex insights only
 *   --corpus=NAME     Corpus type: synthetic (default), mtsamples, hybrid
 *   --mtsamples       Shortcut for --corpus=mtsamples (real clinical documents)
 *   --hybrid          Shortcut for --corpus=hybrid (50% synthetic, 50% MTSamples)
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
const { seedGlobal } = require("./generators/seeded-random");

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

// Try to load MTSamples corpus modules
let MTSamplesCorpus = null;
let runMTSamplesValidation = null;
try {
  MTSamplesCorpus = {
    generateCorpus: require("./corpus/mtsamples-corpus-generator")
      .generateCorpus,
    quickGenerate: require("./corpus/mtsamples-corpus-generator").quickGenerate,
    loadMTSamples: require("./corpus/mtsamples-loader").loadMTSamples,
  };
  // Import the MTSamples validation runner
  runMTSamplesValidation = require("./run-mtsamples-validation").runValidation;
} catch (e) {
  // MTSamples not available
}

// Try to load SmartSummary (LLM-friendly output)
let SmartSummary = null;
try {
  const smartSummaryModule = require("./utils/SmartSummary");
  SmartSummary = smartSummaryModule.SmartSummary;
} catch (e) {
  // SmartSummary not available - will skip smart summary
}

// ============================================================================
// PARSE COMMAND LINE ARGUMENTS
// ============================================================================
const args = process.argv.slice(2);

// ============================================================================
// MINIMUM SAMPLE SIZE ENFORCEMENT
// ============================================================================
// Statistical validity requires adequate sample sizes. Small samples produce
// unreliable metrics that can mislead development decisions.
//
// Minimum requirements:
//   - Default test: 200 documents (statistically meaningful)
//   - Quick/debug: 50 documents (with explicit --allow-small flag)
//   - Anything under 50: blocked unless --allow-small is passed
//
// Why 200? At 97% sensitivity with ~30 PHI per doc:
//   - 200 docs = ~6000 PHI instances
//   - 95% CI width: ~0.5% (meaningful precision)
//   - 50 docs = ~1500 PHI instances
//   - 95% CI width: ~1.0% (barely acceptable)
//   - 20 docs = ~600 PHI instances
//   - 95% CI width: ~1.6% (unreliable for decision-making)
// ============================================================================

const MINIMUM_SAMPLE_SIZES = {
  PRODUCTION: 200, // For real metrics and CI/CD
  DEBUG: 50, // For quick iteration (requires --allow-small)
  ABSOLUTE_MIN: 20, // Never go below this, even with --allow-small
};

const options = {
  documentCount: 200, // DEFAULT TO STATISTICALLY VALID SAMPLE SIZE
  verbose: false,
  jsonOnly: false,
  profile: "HIPAA_STRICT", // Default to production-grade grading
  seed: null,
  learn: true, // Learning enabled by default
  strictExit: false, // Only fail the process when explicitly requested
  showContext: false,
  showEvolution: false,
  useCortex: true, // Use Vulpes Cortex by default if available
  cortexReport: false,
  cortexInsights: false,
  corpus: "synthetic", // synthetic, mtsamples, hybrid
  allowSmallSample: false, // Must be explicit to use small samples
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
  if (arg.startsWith("--seed=")) {
    const parsed = Number.parseInt(arg.split("=")[1], 10);
    options.seed = Number.isFinite(parsed) ? parsed : null;
  }
  if (arg.startsWith("--profile=")) {
    options.profile = arg.split("=")[1].toUpperCase();
  }
  if (arg === "--verbose") options.verbose = true;
  if (arg === "--json-only") options.jsonOnly = true;
  if (arg === "--allow-small") options.allowSmallSample = true;
  if (arg === "--quick") options.documentCount = 50; // Debug iteration (requires --allow-small)
  if (arg === "--full") options.documentCount = 200; // Standard full suite
  if (arg === "--thorough") options.documentCount = 500;
  if (arg === "--learn") options.learn = true;
  if (arg === "--no-learn") options.learn = false;
  if (arg === "--strict-exit") options.strictExit = true;
  if (arg === "--no-strict-exit") options.strictExit = false;
  if (arg === "--context") options.showContext = true;
  if (arg === "--evolution") options.showEvolution = true;
  if (arg === "--cortex") options.useCortex = true;
  if (arg === "--no-cortex") options.useCortex = false;
  if (arg === "--cortex-report") options.cortexReport = true;
  if (arg === "--cortex-insights") options.cortexInsights = true;
  // Corpus selection
  if (arg.startsWith("--corpus=")) {
    const corpus = arg.split("=")[1].toLowerCase();
    if (["synthetic", "mtsamples", "hybrid"].includes(corpus)) {
      options.corpus = corpus;
    } else {
      console.warn(`Unknown corpus: ${corpus}. Using synthetic.`);
    }
  }
  if (arg === "--mtsamples") options.corpus = "mtsamples";
  if (arg === "--hybrid") options.corpus = "hybrid";
}

// Setup logging after parsing args
setupLogging();

// ============================================================================
// ENFORCE MINIMUM SAMPLE SIZE
// ============================================================================
// Block tests with inadequate sample sizes unless explicitly allowed.
// This prevents misleading metrics from being used for decision-making.
// ============================================================================

function enforceMinimumSampleSize() {
  const count = options.documentCount;

  // Box drawing helper - consistent 80-char width
  const W = 80;
  const line = (content, pad = 2) => {
    const inner = W - 2; // Account for left and right borders
    const text = " ".repeat(pad) + content;
    return "║" + text + " ".repeat(Math.max(0, inner - text.length)) + "║";
  };
  const top = "╔" + "═".repeat(W - 2) + "╗";
  const mid = "╠" + "═".repeat(W - 2) + "╣";
  const bot = "╚" + "═".repeat(W - 2) + "╝";
  const blank = "║" + " ".repeat(W - 2) + "║";

  // Absolute minimum - never allow below this
  if (count < MINIMUM_SAMPLE_SIZES.ABSOLUTE_MIN) {
    const minVal = MINIMUM_SAMPLE_SIZES.ABSOLUTE_MIN;
    console.error(`
${top}
${line("SAMPLE SIZE TOO SMALL - TEST BLOCKED", 2)}
${mid}
${blank}
${line(`Requested: ${count} documents`, 2)}
${line(`Minimum:   ${minVal} documents (absolute floor)`, 2)}
${blank}
${line(`Sample sizes below ${minVal} produce statistically meaningless results.`, 2)}
${line("The confidence intervals are too wide for any reliable conclusions.", 2)}
${blank}
${line("Use --count=200 for statistically valid metrics (recommended)", 2)}
${line("Use --count=50 --allow-small for quick debug iteration", 2)}
${blank}
${bot}
`);
    process.exit(1);
  }

  // Below production minimum - require explicit flag
  if (count < MINIMUM_SAMPLE_SIZES.PRODUCTION && !options.allowSmallSample) {
    const recVal = MINIMUM_SAMPLE_SIZES.PRODUCTION;
    const phiCount = (count * 30).toLocaleString();
    const ciWidth = (1.6 * Math.sqrt(200 / count)).toFixed(1);
    console.error(`
${top}
${line("SAMPLE SIZE BELOW RECOMMENDED MINIMUM", 2)}
${mid}
${blank}
${line(`Requested:   ${count} documents`, 2)}
${line(`Recommended: ${recVal} documents (for statistically valid metrics)`, 2)}
${blank}
${line("WHY THIS MATTERS:", 2)}
${line(`  ${count} docs = ~${phiCount} PHI instances -> 95% CI width: ~${ciWidth}%`, 2)}
${line("  200 docs = ~6,000 PHI instances -> 95% CI width: ~0.5%", 2)}
${blank}
${line("Small samples can show +/-2% swings that are just noise, not real changes.", 2)}
${blank}
${line("OPTIONS:", 2)}
${line("  npm test                    -> Runs with 200 docs (recommended)", 2)}
${line("  npm test -- --allow-small   -> Allow smaller sample (debugging only)", 2)}
${line("  npm test -- --thorough      -> Run 500 docs (high confidence)", 2)}
${blank}
${bot}
`);
    process.exit(1);
  }

  // Warn if using small sample even with flag
  if (count < MINIMUM_SAMPLE_SIZES.PRODUCTION && options.allowSmallSample) {
    const warnTop = "┌" + "─".repeat(W - 2) + "┐";
    const warnBot = "└" + "─".repeat(W - 2) + "┘";
    const warnLine = (content, pad = 2) => {
      const inner = W - 2;
      const text = " ".repeat(pad) + content;
      return "│" + text + " ".repeat(Math.max(0, inner - text.length)) + "│";
    };
    const warnBlank = "│" + " ".repeat(W - 2) + "│";

    console.warn(`
${warnTop}
${warnLine(`SMALL SAMPLE SIZE (${count} docs) - METRICS MAY BE UNRELIABLE`, 2)}
${warnBlank}
${warnLine("You've explicitly allowed a small sample with --allow-small.", 2)}
${warnLine("Results are suitable for quick iteration but NOT for final validation.", 2)}
${warnBlank}
${warnLine("For production-grade metrics, run: npm test (uses 200 docs)", 2)}
${warnBot}
`);
  }
}

// Run enforcement
enforceMinimumSampleSize();

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
      console.warn(`  ✗ Vulpes Cortex failed to initialize: ${e.message}\n`);
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
      console.warn(`  ✗ Learning engine failed to initialize: ${e.message}\n`);
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
    if (options.seed !== null) {
      seedGlobal(options.seed);
      log(`\n  Seed: ${options.seed}`);
    }

    // ========================================================================
    // CORPUS SELECTION - Route to appropriate validation runner
    // ========================================================================
    if (options.corpus === "mtsamples") {
      // Delegate to MTSamples validation runner
      if (!runMTSamplesValidation) {
        console.error(
          "\n  ✗ MTSamples corpus not available. Run with default synthetic corpus.",
        );
        console.error(
          "    Install: Ensure corpus/ directory exists with MTSamples modules.\n",
        );
        process.exit(2);
      }

      log(`\n  Corpus: MTSamples (real clinical documents)\n`);
      log(fmt.headerBox("MTSAMPLES VALIDATION"));

      const mode =
        options.documentCount <= 50
          ? "quick"
          : options.documentCount >= 200
            ? "full"
            : "default";

      await runMTSamplesValidation({
        mode,
        verbose: options.verbose,
        useCortex: options.useCortex,
        profile: options.profile,
      });

      // MTSamples runner handles its own exit
      return;
    }

    if (options.corpus === "hybrid") {
      // Run both synthetic and MTSamples, compare results
      log(`\n  Corpus: HYBRID (50% synthetic, 50% MTSamples)\n`);
      log(fmt.headerBox("HYBRID VALIDATION MODE"));

      // Run synthetic first (half count)
      const syntheticCount = Math.floor(options.documentCount / 2);
      log(`\n  Phase A: Running ${syntheticCount} synthetic documents...\n`);
    }

    // Default: SYNTHETIC corpus
    if (options.corpus === "synthetic" || options.corpus === "hybrid") {
      log(
        `\n  Corpus: ${options.corpus === "hybrid" ? "HYBRID - Synthetic Phase" : "Synthetic (generated documents)"}\n`,
      );
    }

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

      // Smart summary for LLMs (always show, provides TL;DR and comparison)
      if (SmartSummary) {
        try {
          const smartSummary = new SmartSummary();
          const summaryResults = {
            metrics: assessment.results.metrics,
            documents: options.documentCount,
            processingTime: `${assessment.results.processingTime || "N/A"}`,
          };

          log("\n" + fmt.divider());
          log(fmt.headerBox("SMART SUMMARY (LLM-OPTIMIZED)"));
          log(fmt.divider() + "\n");
          log(
            smartSummary.generate(summaryResults, {
              compact: false,
              showComparison: true,
              showRecommendations: true,
            }),
          );
          log("\n");
        } catch (e) {
          // Gracefully skip if SmartSummary fails
          console.warn(`  SmartSummary generation failed: ${e.message}`);
        }
      }
    }

    // Save results
    const { jsonPath, reportPath } = assessment.saveResults();

    // ═══════════════════════════════════════════════════════════════════════════
    // AUTO-CALIBRATION HOOK
    // Automatically recalibrates confidence scores after test run
    // ═══════════════════════════════════════════════════════════════════════════
    if (!options.jsonOnly) {
      try {
        const { initializeCalibration } = require("../../dist/calibration");
        log("\n" + fmt.divider());
        log(fmt.headerBox("AUTO-CALIBRATION"));
        log(fmt.divider() + "\n");

        const calibrationResult = await initializeCalibration({
          verbose: false,
          minDataPoints: 50,
          createBackup: true,
        });

        if (calibrationResult.success) {
          log(
            `  ✓ Calibration updated: ${calibrationResult.dataPointCount} data points`,
          );
          if (calibrationResult.metrics) {
            log(
              `    ECE: ${(calibrationResult.metrics.expectedCalibrationError * 100).toFixed(2)}%`,
            );
            log(`    Brier Score: ${calibrationResult.metrics.brierScore.toFixed(4)}`);
          }
        } else {
          log(`  ⚠ Calibration skipped: ${calibrationResult.message}`);
        }
        log("");
      } catch (e) {
        // Calibration is optional - don't fail test run
        log(`  ⚠ Auto-calibration unavailable: ${e.message}\n`);
      }
    }

    // Output JSON for CI/CD if requested
    if (options.jsonOnly) {
      const output = {
        seed: options.seed,
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
    const specificity = assessment.results.metrics.specificity;
    let grade = assessment.results.metrics.grade;
    const strictFailures = (assessment.results.failures || []).length;
    const strictOverRedactions = (assessment.results.overRedactions || [])
      .length;

    const shouldFailProcess =
      options.strictExit === true || process.env.VULPES_STRICT_EXIT === "1";

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

    if (options.profile === "HIPAA_STRICT") {
      const meetsStrict =
        sensitivity >= 99 && specificity >= 96 && strictFailures === 0;

      if (meetsStrict) {
        log("\n  PASS (HIPAA_STRICT)\n");
        printLLMActionChecklistPretty(
          assessment.results,
          smartGradeResults,
          "PASS",
        );
        process.exit(0);
      }

      log("\n  NEEDS IMPROVEMENT (HIPAA_STRICT)\n");
      printLLMActionChecklistPretty(
        assessment.results,
        smartGradeResults,
        "IMPROVE",
      );
      process.exit(shouldFailProcess ? 1 : 0);
    }

    if (sensitivity >= 95 && passingGrades.includes(grade)) {
      log("\n  ✓ PASS\n");
      printLLMActionChecklistPretty(
        assessment.results,
        smartGradeResults,
        "PASS",
      );
      process.exit(0);
    } else {
      log("\n  ✗ NEEDS IMPROVEMENT\n");
      printLLMActionChecklistPretty(
        assessment.results,
        smartGradeResults,
        "IMPROVE",
      );
      process.exit(shouldFailProcess ? 1 : 0);
    }
  } catch (error) {
    console.error(`\n✗ Assessment failed: ${error.message}`);
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
    "â•‘  " + s + " ".repeat(Math.max(0, W - 4 - s.length)) + "â•‘";
  const pointed2 = (s) =>
    "â•‘    " + s + " ".repeat(Math.max(0, W - 6 - s.length)) + "â•‘";
  const blank = "â•‘" + " ".repeat(W - 2) + "â•‘";
  const top = "â•”" + "â•".repeat(W - 2) + "â•—";
  const mid = "â• " + "â•".repeat(W - 2) + "â•£";
  const bot = "â•š" + "â•".repeat(W - 2) + "â•";

  let lines = [];

  lines.push("");
  lines.push(top);
  lines.push(blank);
  lines.push(pointed("LLM: EXECUTE THE FOLLOWING ACTIONS"));
  lines.push(blank);
  lines.push(mid);
  lines.push(blank);
  lines.push(pointed("CURRENT METRICS"));
  lines.push(pointed("â”€".repeat(72)));
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

function printLLMActionChecklistPretty(results, smartGradeResults, status) {
  const metrics = results.metrics || {};
  const failures = results.failures || [];

  const failuresByType = {};
  for (const f of failures) {
    if (!failuresByType[f.phiType]) failuresByType[f.phiType] = [];
    failuresByType[f.phiType].push(f);
  }

  const sortedTypes = Object.entries(failuresByType).sort(
    (a, b) => b[1].length - a[1].length,
  );

  const sens = (metrics.sensitivity || 0).toFixed(2);
  const spec = (metrics.specificity || 0).toFixed(2);
  const f1 = (metrics.f1Score || 0).toFixed(2);
  const f2 = (metrics.f2Score || 0).toFixed(2);
  const grade = (
    smartGradeResults?.scores?.grade ||
    metrics.grade ||
    "?"
  ).toString();

  log(
    "\n" +
      fmt.metricsBox({ sensitivity: sens, specificity: spec, f1, f2, grade }) +
      "\n",
  );

  if (status !== "IMPROVE") return;

  const topType = sortedTypes[0]?.[0] || "UNKNOWN";
  const topCount = sortedTypes[0]?.[1]?.length || 0;
  const topExamples = sortedTypes[0]?.[1]?.slice(0, 3) || [];

  const items = [
    `TOP FAILURE: ${topType} (${topCount} missed)`,
    { header: `EXAMPLES OF MISSED ${topType}:` },
    ...topExamples.map((f) => ({
      indent: `"${String(f.value).substring(0, 60)}"  (${f.errorLevel || "clean"})`,
    })),
    { header: "DO THIS NOW:" },
    "1. READ the relevant filter or dictionary",
    { indent: "Filters:      src/filters/" },
    { indent: "Dictionaries: src/dictionaries/" },
    "2. EDIT the file to catch the missed values",
    { indent: "Add pattern/regex for the formats shown above" },
    { indent: "Or add missing entries to the dictionary" },
    "3. RUN the test again",
    { indent: "node tests/master-suite/run.js --log-file" },
    "4. COMPARE metrics",
    { indent: "Better? Keep the change, continue to next failure" },
    { indent: "Worse?  Revert with: git checkout <file>" },
    { header: "ALL FAILURES BY TYPE" },
    ...(sortedTypes.length > 0
      ? sortedTypes.map(([type, items]) => ({
          indent: `${type.padEnd(20)} ${items.length} missed`,
        }))
      : [{ indent: "None!" }]),
    { header: "CORTEX MCP SERVER" },
    { indent: "Start:  node tests/master-suite/cortex --server" },
    {
      indent:
        "Tools:  analyze_test_results, consult_history, get_recommendation",
    },
  ];

  log("\n" + fmt.actionChecklist("IMPROVEMENT CHECKLIST", items) + "\n");
}

main();
