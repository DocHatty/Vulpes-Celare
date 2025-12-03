#!/usr/bin/env node

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  VULPES CELARE - MASTER TEST RUNNER                                          ║
 * ║  Complete Assessment Suite with Multi-Pass Analysis                           ║
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
 * 
 * WORKFLOW:
 *   1. Generate test documents with comprehensive PHI
 *   2. Process ALL documents through the engine
 *   3. Calculate sensitivity, specificity, and other metrics
 *   4. Apply strict grading schema
 *   5. Deep investigation of failures
 *   6. Generate recommendations
 * 
 * EXIT CODES:
 *   0 = Grade A- or better (sensitivity >= 95%)
 *   1 = Grade below A- (needs improvement)
 */

const path = require("path");
const { RigorousAssessment } = require("./assessment/rigorous-assessment");

// ============================================================================
// PARSE COMMAND LINE ARGUMENTS
// ============================================================================
const args = process.argv.slice(2);
const options = {
  documentCount: 200,
  verbose: false,
  jsonOnly: false
};

for (const arg of args) {
  if (arg.startsWith("--count=")) {
    options.documentCount = parseInt(arg.split("=")[1]) || 200;
  }
  if (arg === "--verbose") options.verbose = true;
  if (arg === "--json-only") options.jsonOnly = true;
  if (arg === "--quick") options.documentCount = 50;
  if (arg === "--thorough") options.documentCount = 500;
}

// ============================================================================
// MOCK ELECTRON FOR TESTING
// ============================================================================
process.env.NODE_ENV = "test";
global.require = (moduleName) => {
  if (moduleName === "electron") {
    return {
      ipcRenderer: { invoke: () => Promise.resolve({}), send: () => {}, on: () => {} },
      app: { 
        getPath: (type) => type === "userData" ? path.join(__dirname, "..", "..", "userData") : __dirname, 
        getName: () => "VulpesTest", 
        getVersion: () => "1.0.0" 
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
║              C E L A R E   -   R I G O R O U S   T E S T                    ║
║                                                                              ║
║   Comprehensive PHI Redaction Assessment Suite                               ║
║   Unbiased • Strict Grading • Multi-Pass Analysis                            ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  try {
    // Create assessment instance
    const assessment = new RigorousAssessment({
      documentCount: options.documentCount,
      verbose: options.verbose
    });
    
    // PHASE 1: Run the complete test suite
    // LET THE ENTIRE SUITE RUN - no interruptions
    console.log("PHASE 1: Running complete test suite...\n");
    await assessment.runFullSuite();
    
    // PHASE 2: Calculate metrics with strict grading
    console.log("\nPHASE 2: Calculating metrics with strict grading...\n");
    assessment.calculateMetrics();
    
    // PHASE 3: Deep investigation of failures
    console.log("\nPHASE 3: Deep investigation of failures...\n");
    assessment.investigateFailures();
    
    // Generate and display report
    if (!options.jsonOnly) {
      console.log(assessment.generateReport());
    }
    
    // Save results
    const { jsonPath, reportPath } = assessment.saveResults();
    
    // Output JSON for CI/CD if requested
    if (options.jsonOnly) {
      console.log(JSON.stringify({
        metrics: assessment.results.metrics,
        failures: assessment.results.failures.length,
        overRedactions: assessment.results.overRedactions.length
      }, null, 2));
    }
    
    // Exit with appropriate code
    const sensitivity = assessment.results.metrics.sensitivity;
    const grade = assessment.results.metrics.grade;
    
    // A- or better is passing (sensitivity >= 95%)
    if (sensitivity >= 95 && ["A+", "A", "A-"].includes(grade)) {
      process.exit(0);
    } else {
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`\n❌ Assessment failed: ${error.message}`);
    console.error(error.stack);
    process.exit(2);
  }
}

main();
