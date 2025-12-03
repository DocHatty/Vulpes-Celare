/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║           VULPES CELARE - MASTER TEST SUITE                              ║
 * ║           Comprehensive PHI Redaction Assessment                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * 
 * This is the SINGLE authoritative test for the Vulpes Celare PHI redaction engine.
 * 
 * FEATURES:
 * - Generates 200+ unique medical documents with realistic PHI
 * - Applies OCR errors, typos, case variations, and spacing issues
 * - Tests all 18 HIPAA Safe Harbor identifier types
 * - Measures sensitivity (PHI detected) and specificity (non-PHI preserved)
 * - Provides detailed breakdowns by error level and PHI type
 * - Outputs machine-readable JSON results
 * 
 * USAGE:
 *   node master-test.js [options]
 * 
 * OPTIONS:
 *   --count=N        Number of documents to generate (default: 200)
 *   --verbose        Show detailed progress
 *   --json-only      Output only JSON (no console formatting)
 * 
 * HIPAA COMPLIANCE NOTES:
 * - Patient names, SSN, MRN, DOB, addresses, phones, emails = PHI (MUST redact)
 * - Ages 90+ = PHI (MUST redact), Ages under 90 = NOT PHI
 * - Hospital names, provider names, diagnoses, medications = NOT PHI
 */

const path = require("path");
const fs = require("fs");

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  count: 200,
  verbose: false,
  jsonOnly: false
};

for (const arg of args) {
  if (arg.startsWith("--count=")) options.count = parseInt(arg.split("=")[1]) || 200;
  if (arg === "--verbose") options.verbose = true;
  if (arg === "--json-only") options.jsonOnly = true;
}

// Mock Electron for testing environment
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

// Import document generators
const { generateDocuments } = require("./generators/documents");

// ============================================================================
// LOGGING UTILITIES
// ============================================================================
function log(message) {
  if (!options.jsonOnly) console.log(message);
}

function logVerbose(message) {
  if (options.verbose && !options.jsonOnly) console.log(message);
}

// ============================================================================
// MAIN ASSESSMENT FUNCTION
// ============================================================================
async function runMasterAssessment() {
  const startTimestamp = new Date().toISOString();
  
  log("╔══════════════════════════════════════════════════════════════════════════╗");
  log("║           VULPES CELARE - MASTER TEST SUITE                              ║");
  log("║           Comprehensive PHI Redaction Assessment                          ║");
  log("╚══════════════════════════════════════════════════════════════════════════╝");
  log("");

  // ============================================================================
  // STEP 1: Load the Engine
  // ============================================================================
  log("┌─────────────────────────────────────────────────────────────────────────┐");
  log("│ STEP 1: Loading Vulpes Celare Engine                                    │");
  log("└─────────────────────────────────────────────────────────────────────────┘");
  
  let VulpesCelare;
  let engineInfo = {};
  
  try {
    const module = require("../../dist/VulpesCelare.js");
    VulpesCelare = module.VulpesCelare;
    engineInfo = {
      name: VulpesCelare.NAME || "VulpesCelare",
      version: VulpesCelare.VERSION || "unknown",
      variant: VulpesCelare.VARIANT || "unknown"
    };
    log(`  ✓ Engine loaded: ${engineInfo.name} v${engineInfo.version}`);
    log(`    Variant: ${engineInfo.variant}`);
  } catch (err) {
    log(`  ✗ FAILED to load engine: ${err.message}`);
    log("    Make sure to run: npm run build");
    process.exit(1);
  }
  
  const engine = new VulpesCelare();
  const activeFilters = engine.getActiveFilters ? engine.getActiveFilters().length : "unknown";
  log(`    Active filters: ${activeFilters}`);
  log("");

  // ============================================================================
  // STEP 2: Generate Test Documents
  // ============================================================================
  log("┌─────────────────────────────────────────────────────────────────────────┐");
  log(`│ STEP 2: Generating ${options.count} Test Documents                              │`);
  log("└─────────────────────────────────────────────────────────────────────────┘");
  
  const documents = generateDocuments(options.count);
  
  // Analyze distribution
  const errorDistribution = { none: 0, low: 0, medium: 0, high: 0, extreme: 0 };
  const typeDistribution = {};
  let totalExpectedPHI = 0;
  let totalExpectedNonPHI = 0;
  
  for (const doc of documents) {
    errorDistribution[doc.errorLevel] = (errorDistribution[doc.errorLevel] || 0) + 1;
    typeDistribution[doc.type] = (typeDistribution[doc.type] || 0) + 1;
    totalExpectedPHI += doc.expectedPHI.length;
    totalExpectedNonPHI += (doc.shouldNotRedact || []).length;
  }
  
  log(`  ✓ Generated ${documents.length} documents`);
  log("");
  log("  Document Type Distribution:");
  for (const [type, count] of Object.entries(typeDistribution).sort((a, b) => b[1] - a[1])) {
    log(`    ${type.padEnd(25)} ${count}`);
  }
  log("");
  log("  Error Level Distribution:");
  for (const level of ["none", "low", "medium", "high", "extreme"]) {
    if (errorDistribution[level]) {
      log(`    ${level.toUpperCase().padEnd(10)} ${errorDistribution[level]}`);
    }
  }
  log("");
  log(`  Total PHI items to detect:     ${totalExpectedPHI}`);
  log(`  Total non-PHI items to preserve: ${totalExpectedNonPHI}`);
  log("");

  // ============================================================================
  // STEP 3: Process Documents
  // ============================================================================
  log("┌─────────────────────────────────────────────────────────────────────────┐");
  log("│ STEP 3: Processing Documents                                            │");
  log("└─────────────────────────────────────────────────────────────────────────┘");
  
  const processingStartTime = Date.now();
  
  // Metrics tracking
  let truePositives = 0;   // PHI correctly redacted
  let falseNegatives = 0;  // PHI missed
  let trueNegatives = 0;   // Non-PHI correctly preserved
  let falsePositives = 0;  // Non-PHI incorrectly redacted
  
  const byErrorLevel = {};
  const byPHIType = {};
  const missedPHI = [];
  const overRedactions = [];
  
  for (const level of ["none", "low", "medium", "high", "extreme"]) {
    byErrorLevel[level] = { tp: 0, fn: 0, total: 0 };
  }
  
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    
    // Progress indicator
    if ((i + 1) % 25 === 0 || i === documents.length - 1) {
      process.stdout.write(`  Processing: ${i + 1}/${documents.length} documents...\r`);
    }
    
    // Process document through engine
    const result = await engine.process(doc.content);
    const redactedText = result.text;
    
    // Check each expected PHI item
    for (const phi of doc.expectedPHI) {
      const actualValue = phi.actual || phi.value;
      
      // Initialize type tracking
      if (!byPHIType[phi.type]) {
        byPHIType[phi.type] = { tp: 0, fn: 0, total: 0 };
      }
      byPHIType[phi.type].total++;
      byErrorLevel[doc.errorLevel].total++;
      
      // Check if PHI was redacted (not appearing in clear text)
      const wasRedacted = !redactedText.includes(actualValue);
      
      if (wasRedacted) {
        truePositives++;
        byPHIType[phi.type].tp++;
        byErrorLevel[doc.errorLevel].tp++;
      } else {
        falseNegatives++;
        byPHIType[phi.type].fn++;
        byErrorLevel[doc.errorLevel].fn++;
        
        if (missedPHI.length < 100) {
          missedPHI.push({
            docId: doc.id,
            docType: doc.type,
            errorLevel: doc.errorLevel,
            phiType: phi.type,
            expected: phi.value,
            actual: actualValue,
            hasErrors: phi.hasErrors || false
          });
        }
      }
    }
    
    // Check non-PHI preservation
    for (const item of (doc.shouldNotRedact || [])) {
      const wasPreserved = redactedText.includes(item.value);
      if (wasPreserved) {
        trueNegatives++;
      } else {
        falsePositives++;
        if (overRedactions.length < 50) {
          overRedactions.push({
            docId: doc.id,
            docType: doc.type,
            type: item.type,
            value: item.value
          });
        }
      }
    }
  }
  
  const processingTime = Date.now() - processingStartTime;
  log(`  Processing: ${documents.length}/${documents.length} documents... Done!`);
  log(`  ✓ Processing completed in ${(processingTime / 1000).toFixed(2)}s`);
  log(`    Average: ${(processingTime / documents.length).toFixed(1)}ms per document`);
  log("");

  // ============================================================================
  // STEP 4: Calculate Metrics
  // ============================================================================
  const totalPHI = truePositives + falseNegatives;
  const totalNonPHI = trueNegatives + falsePositives;
  
  const sensitivity = totalPHI > 0 ? (truePositives / totalPHI) * 100 : 0;
  const specificity = totalNonPHI > 0 ? (trueNegatives / totalNonPHI) * 100 : 100;
  const precision = (truePositives + falsePositives) > 0 
    ? (truePositives / (truePositives + falsePositives)) * 100 
    : 0;
  const f1Score = (precision + sensitivity) > 0
    ? 2 * (precision * sensitivity) / (precision + sensitivity)
    : 0;
  
  // Calculate overall score (weighted: sensitivity 70%, specificity 30%)
  let overallScore = Math.round(sensitivity * 0.7 + specificity * 0.3);
  
  // Penalty for low sensitivity (critical for PHI protection)
  if (sensitivity < 95) overallScore = Math.min(overallScore, 70);
  if (sensitivity < 90) overallScore = Math.min(overallScore, 50);
  if (sensitivity < 85) overallScore = Math.min(overallScore, 30);
  
  // Determine grade
  const grade = overallScore >= 97 ? "A+" : overallScore >= 93 ? "A" : overallScore >= 90 ? "A-" :
                overallScore >= 87 ? "B+" : overallScore >= 83 ? "B" : overallScore >= 80 ? "B-" :
                overallScore >= 77 ? "C+" : overallScore >= 73 ? "C" : overallScore >= 70 ? "C-" :
                overallScore >= 60 ? "D" : "F";

  // ============================================================================
  // STEP 5: Output Results
  // ============================================================================
  log("╔══════════════════════════════════════════════════════════════════════════╗");
  log("║                         ASSESSMENT RESULTS                                ║");
  log("╚══════════════════════════════════════════════════════════════════════════╝");
  log("");
  
  log("┌─────────────────────────────────────────────────────────────────────────┐");
  log("│ SUMMARY                                                                  │");
  log("└─────────────────────────────────────────────────────────────────────────┘");
  log(`  Documents Processed:        ${documents.length}`);
  log(`  Total PHI Items Tested:     ${totalPHI}`);
  log(`  Total Non-PHI Items Tested: ${totalNonPHI}`);
  log(`  Processing Time:            ${(processingTime / 1000).toFixed(2)}s`);
  log("");
  
  log("┌─────────────────────────────────────────────────────────────────────────┐");
  log("│ CONFUSION MATRIX                                                         │");
  log("└─────────────────────────────────────────────────────────────────────────┘");
  log(`  True Positives  (PHI correctly redacted):        ${truePositives}`);
  log(`  False Negatives (PHI missed - DANGEROUS):        ${falseNegatives}`);
  log(`  True Negatives  (Non-PHI correctly preserved):   ${trueNegatives}`);
  log(`  False Positives (Non-PHI incorrectly redacted):  ${falsePositives}`);
  log("");
  
  log("┌─────────────────────────────────────────────────────────────────────────┐");
  log("│ PRIMARY METRICS                                                          │");
  log("└─────────────────────────────────────────────────────────────────────────┘");
  log(`  SENSITIVITY (Recall):    ${sensitivity.toFixed(2)}%  ← Most critical for PHI protection`);
  log(`  SPECIFICITY:             ${specificity.toFixed(2)}%`);
  log(`  PRECISION (PPV):         ${precision.toFixed(2)}%`);
  log(`  F1 SCORE:                ${f1Score.toFixed(2)}`);
  log("");
  
  log("══════════════════════════════════════════════════════════════════════════");
  log(`  OVERALL SCORE: ${overallScore}/100 (${grade})`);
  log("══════════════════════════════════════════════════════════════════════════");
  log("");
  
  log("┌─────────────────────────────────────────────────────────────────────────┐");
  log("│ PERFORMANCE BY ERROR LEVEL                                               │");
  log("└─────────────────────────────────────────────────────────────────────────┘");
  for (const level of ["none", "low", "medium", "high", "extreme"]) {
    const stats = byErrorLevel[level];
    if (stats.total > 0) {
      const rate = (stats.tp / stats.total * 100).toFixed(1);
      const missed = stats.fn;
      log(`  ${level.toUpperCase().padEnd(10)} ${stats.tp}/${stats.total} (${rate}%)${missed > 0 ? ` - ${missed} missed` : ""}`);
    }
  }
  log("");
  
  log("┌─────────────────────────────────────────────────────────────────────────┐");
  log("│ PERFORMANCE BY PHI TYPE                                                  │");
  log("└─────────────────────────────────────────────────────────────────────────┘");
  const sortedTypes = Object.entries(byPHIType).sort((a, b) => b[1].total - a[1].total);
  for (const [type, stats] of sortedTypes) {
    const rate = stats.total > 0 ? (stats.tp / stats.total * 100).toFixed(1) : "N/A";
    const missed = stats.fn;
    log(`  ${type.padEnd(20)} ${stats.tp}/${stats.total} (${rate}%)${missed > 0 ? ` - ${missed} missed` : ""}`);
  }
  log("");
  
  // Show missed PHI samples
  if (missedPHI.length > 0) {
    log("┌─────────────────────────────────────────────────────────────────────────┐");
    log(`│ MISSED PHI SAMPLES (${missedPHI.length} total, showing first 20)                      │`);
    log("└─────────────────────────────────────────────────────────────────────────┘");
    for (const m of missedPHI.slice(0, 20)) {
      const errorTag = m.hasErrors ? " [CORRUPTED]" : "";
      log(`  Doc ${m.docId} (${m.docType}/${m.errorLevel}):`);
      if (m.actual !== m.expected) {
        log(`    ${m.phiType}: "${m.expected}" → "${m.actual}"${errorTag}`);
      } else {
        log(`    ${m.phiType}: "${m.expected}"${errorTag}`);
      }
    }
    log("");
  }
  
  // Show over-redactions
  if (overRedactions.length > 0) {
    log("┌─────────────────────────────────────────────────────────────────────────┐");
    log(`│ OVER-REDACTIONS (${overRedactions.length} total, showing first 15)                       │`);
    log("└─────────────────────────────────────────────────────────────────────────┘");
    for (const o of overRedactions.slice(0, 15)) {
      log(`  Doc ${o.docId}: ${o.type} = "${o.value}"`);
    }
    log("");
  }

  // ============================================================================
  // STEP 6: Save Results
  // ============================================================================
  const resultsDir = path.join(__dirname, "..", "results");
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const resultsData = {
    meta: {
      timestamp: startTimestamp,
      testSuite: "master-test",
      version: "2.0.0"
    },
    engine: engineInfo,
    config: {
      documentCount: documents.length,
      errorDistribution,
      documentTypes: typeDistribution
    },
    metrics: {
      sensitivity: parseFloat(sensitivity.toFixed(2)),
      specificity: parseFloat(specificity.toFixed(2)),
      precision: parseFloat(precision.toFixed(2)),
      f1Score: parseFloat(f1Score.toFixed(2)),
      overallScore,
      grade
    },
    confusionMatrix: {
      truePositives,
      falseNegatives,
      trueNegatives,
      falsePositives,
      totalPHI,
      totalNonPHI
    },
    performanceByErrorLevel: byErrorLevel,
    performanceByPHIType: byPHIType,
    processing: {
      totalTimeMs: processingTime,
      avgTimePerDocMs: parseFloat((processingTime / documents.length).toFixed(1))
    },
    details: {
      missedPHI,
      overRedactions
    }
  };
  
  const resultsFile = path.join(resultsDir, `master-test-${Date.now()}.json`);
  fs.writeFileSync(resultsFile, JSON.stringify(resultsData, null, 2));
  
  log("┌─────────────────────────────────────────────────────────────────────────┐");
  log("│ RESULTS SAVED                                                            │");
  log("└─────────────────────────────────────────────────────────────────────────┘");
  log(`  File: ${resultsFile}`);
  log("");
  log("══════════════════════════════════════════════════════════════════════════");
  
  // Output JSON if requested
  if (options.jsonOnly) {
    console.log(JSON.stringify(resultsData, null, 2));
  }
  
  return resultsData;
}

// ============================================================================
// RUN
// ============================================================================
runMasterAssessment()
  .then(results => {
    process.exit(results.metrics.sensitivity >= 95 ? 0 : 1);
  })
  .catch(err => {
    console.error("Assessment failed:", err);
    process.exit(1);
  });
