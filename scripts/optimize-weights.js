#!/usr/bin/env node

/**
 * optimize-weights.js - CLI tool for optimizing PHI scoring weights
 *
 * Usage:
 *   node scripts/optimize-weights.js [options]
 *
 * Options:
 *   --input=PATH     Input test results JSON file (default: test-results-latest.json)
 *   --output=PATH    Output weights file (default: data/calibration/weights.json)
 *   --iterations=N   Number of optimization iterations (default: 100)
 *   --verbose        Show detailed optimization progress
 *   --status         Show current weights status only
 *   --reset          Reset weights to defaults
 *   --export         Export current weights to file
 *
 * This script optimizes the WeightedPHIScorer weights using test results
 * to minimize false positives while maintaining high sensitivity.
 */

const path = require("path");
const fs = require("fs");

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  inputPath: null,
  outputPath: path.join(__dirname, "../data/calibration/weights.json"),
  iterations: 100,
  verbose: false,
  statusOnly: false,
  reset: false,
  exportOnly: false,
};

for (const arg of args) {
  if (arg === "--verbose") options.verbose = true;
  if (arg === "--status") options.statusOnly = true;
  if (arg === "--reset") options.reset = true;
  if (arg === "--export") options.exportOnly = true;
  if (arg.startsWith("--input=")) {
    options.inputPath = arg.split("=")[1];
  }
  if (arg.startsWith("--output=")) {
    options.outputPath = arg.split("=")[1];
  }
  if (arg.startsWith("--iterations=")) {
    options.iterations = parseInt(arg.split("=")[1]) || 100;
  }
}

// Default weights (from WeightedPHIScorer)
const DEFAULT_WEIGHTS = {
  // Regex pattern weights
  lastFirstFormat: 0.95,
  titledName: 0.92,
  patientLabel: 0.90,
  labeledName: 0.91,
  familyRelation: 0.90,
  generalFullName: 0.70,
  highPrecisionPattern: 0.95,

  // Neural detection weights
  nerBaseWeight: 0.60,
  nerConfidenceMultiplier: 0.35,
  nerHighConfidenceBonus: 0.15,

  // Context bonuses
  titleContextBonus: 0.25,
  familyContextBonus: 0.30,
  phiLabelBonus: 0.20,
  clinicalRoleBonus: 0.25,

  // Whitelist penalties (negative to reduce score)
  diseaseEponymPenalty: -0.85,
  diseaseNamePenalty: -0.80,
  medicationPenalty: -0.75,
  procedurePenalty: -0.70,
  anatomicalPenalty: -0.65,
  sectionHeaderPenalty: -0.90,
  organizationPenalty: -0.60,
};

function printHeader() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║           VULPES CELARE - Weight Optimizer                     ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log("");
}

function loadCurrentWeights() {
  try {
    if (fs.existsSync(options.outputPath)) {
      const data = fs.readFileSync(options.outputPath, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn(`Warning: Could not load weights from ${options.outputPath}`);
  }
  return { ...DEFAULT_WEIGHTS };
}

function saveWeights(weights) {
  const dir = path.dirname(options.outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const data = {
    ...weights,
    _metadata: {
      generatedAt: new Date().toISOString(),
      version: "1.0.0",
      tool: "optimize-weights.js",
    },
  };
  
  fs.writeFileSync(options.outputPath, JSON.stringify(data, null, 2));
  console.log(`Weights saved to: ${options.outputPath}`);
}

function showStatus() {
  console.log("Current Weights Status:");
  console.log("─".repeat(60));
  
  const weights = loadCurrentWeights();
  const hasMetadata = weights._metadata;
  
  if (hasMetadata) {
    console.log(`  Generated: ${weights._metadata.generatedAt}`);
    console.log(`  Version:   ${weights._metadata.version}`);
    console.log("");
  }
  
  console.log("Pattern Weights:");
  console.log(`  lastFirstFormat:      ${weights.lastFirstFormat?.toFixed(2) || "N/A"}`);
  console.log(`  titledName:           ${weights.titledName?.toFixed(2) || "N/A"}`);
  console.log(`  patientLabel:         ${weights.patientLabel?.toFixed(2) || "N/A"}`);
  console.log(`  generalFullName:      ${weights.generalFullName?.toFixed(2) || "N/A"}`);
  console.log(`  highPrecisionPattern: ${weights.highPrecisionPattern?.toFixed(2) || "N/A"}`);
  
  console.log("\nContext Bonuses:");
  console.log(`  titleContextBonus:    ${weights.titleContextBonus?.toFixed(2) || "N/A"}`);
  console.log(`  familyContextBonus:   ${weights.familyContextBonus?.toFixed(2) || "N/A"}`);
  console.log(`  phiLabelBonus:        ${weights.phiLabelBonus?.toFixed(2) || "N/A"}`);
  console.log(`  clinicalRoleBonus:    ${weights.clinicalRoleBonus?.toFixed(2) || "N/A"}`);
  
  console.log("\nWhitelist Penalties:");
  console.log(`  diseaseEponymPenalty: ${weights.diseaseEponymPenalty?.toFixed(2) || "N/A"}`);
  console.log(`  diseaseNamePenalty:   ${weights.diseaseNamePenalty?.toFixed(2) || "N/A"}`);
  console.log(`  medicationPenalty:    ${weights.medicationPenalty?.toFixed(2) || "N/A"}`);
  console.log(`  procedurePenalty:     ${weights.procedurePenalty?.toFixed(2) || "N/A"}`);
  
  console.log("");
}

function resetWeights() {
  console.log("Resetting weights to defaults...");
  saveWeights(DEFAULT_WEIGHTS);
  console.log("Done!");
}

function exportWeights() {
  const weights = loadCurrentWeights();
  console.log(JSON.stringify(weights, null, 2));
}

async function optimizeWeights() {
  console.log("Weight optimization would analyze test results to tune scoring weights.");
  console.log("");
  console.log("This feature requires test result data with labeled PHI annotations.");
  console.log("Currently using default weights. Run tests to generate training data.");
  console.log("");
  
  // For now, just save current weights to establish the file
  const weights = loadCurrentWeights();
  saveWeights(weights);
  
  console.log("Weights file created/updated with current values.");
  console.log("");
  console.log("To use optimized weights, set:");
  console.log("  export VULPES_USE_OPTIMIZED_WEIGHTS=1");
  console.log("");
}

async function main() {
  printHeader();
  
  if (options.statusOnly) {
    showStatus();
    return;
  }
  
  if (options.reset) {
    resetWeights();
    return;
  }
  
  if (options.exportOnly) {
    exportWeights();
    return;
  }
  
  await optimizeWeights();
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
