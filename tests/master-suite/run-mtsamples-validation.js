/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                    MTSAMPLES VALIDATION RUNNER                                ║
 * ║                                                                               ║
 * ║   Runs Vulpes Celare against the MTSamples validation corpus and             ║
 * ║   generates comprehensive accuracy metrics.                                   ║
 * ║                                                                               ║
 * ║   Usage:                                                                      ║
 * ║     node run-mtsamples-validation.js                                          ║
 * ║     node run-mtsamples-validation.js --quick                                  ║
 * ║     node run-mtsamples-validation.js --full                                   ║
 * ║     node run-mtsamples-validation.js --corpus path/to/corpus.json             ║
 * ║                                                                               ║
 * ║   Reference: "The Validation Void" - Composite Validation Schema             ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const path = require("path");
const fs = require("fs");

// Import corpus generator
const { generateCorpus, quickGenerate, fullGenerate, loadCorpus } = require("./corpus/mtsamples-corpus-generator");

// Try to load Vulpes Cortex for intelligence integration
let VulpesCortex = null;
try {
  VulpesCortex = require("./cortex");
} catch (e) {
  // Cortex not available - will run without learning
}

// Try to load console formatter
let fmt = null;
try {
  fmt = require("./cortex/core/console-formatter");
} catch (e) {
  // Formatter not available - will use plain output
}

// Import the Vulpes Celare engine
let VulpesCelare, detectPHI, redactPHI;
try {
  const vulpes = require("../dist/index");
  VulpesCelare = vulpes.VulpesCelare;
  detectPHI = vulpes.detectPHI;
  redactPHI = vulpes.redactPHI;
} catch (e) {
  console.error("Error loading Vulpes Celare. Make sure the project is built:");
  console.error("  npm run build");
  console.error("\nError details:", e.message);
  process.exit(1);
}

/**
 * Validation metrics structure
 */
class ValidationMetrics {
  constructor() {
    this.truePositives = 0;
    this.falsePositives = 0;
    this.falseNegatives = 0;
    this.trueNegatives = 0; // Conceptually: correctly identified non-PHI
    
    // Per-type tracking
    this.byType = {};
    
    // Error level tracking
    this.byErrorLevel = {
      none: { tp: 0, fp: 0, fn: 0 },
      low: { tp: 0, fp: 0, fn: 0 },
      medium: { tp: 0, fp: 0, fn: 0 },
      high: { tp: 0, fp: 0, fn: 0 },
      extreme: { tp: 0, fp: 0, fn: 0 },
    };
    
    // Specialty tracking
    this.bySpecialty = {};
    
    // Timing metrics
    this.processingTimes = [];
    
    // Detailed results for analysis
    this.detailedResults = [];
  }
  
  recordResult(groundTruth, detected, docMeta) {
    const result = this.compareAnnotations(groundTruth, detected);
    
    this.truePositives += result.tp;
    this.falsePositives += result.fp;
    this.falseNegatives += result.fn;
    
    // Track by type
    for (const gt of groundTruth) {
      const type = gt.type;
      if (!this.byType[type]) {
        this.byType[type] = { tp: 0, fp: 0, fn: 0, total: 0 };
      }
      this.byType[type].total++;
      
      // Check if this annotation was detected
      const wasDetected = result.matched.some(m => 
        m.gt.start === gt.start && m.gt.end === gt.end
      );
      
      if (wasDetected) {
        this.byType[type].tp++;
      } else {
        this.byType[type].fn++;
      }
      
      // Track by error level
      const errorLevel = gt.errorLevel || "none";
      if (this.byErrorLevel[errorLevel]) {
        if (wasDetected) {
          this.byErrorLevel[errorLevel].tp++;
        } else {
          this.byErrorLevel[errorLevel].fn++;
        }
      }
    }
    
    // Track false positives by type
    for (const d of result.falsePositives) {
      const type = d.type || "UNKNOWN";
      if (!this.byType[type]) {
        this.byType[type] = { tp: 0, fp: 0, fn: 0, total: 0 };
      }
      this.byType[type].fp++;
    }
    
    // Track by specialty
    const specialty = docMeta.specialty || "Unknown";
    if (!this.bySpecialty[specialty]) {
      this.bySpecialty[specialty] = { tp: 0, fp: 0, fn: 0, docs: 0 };
    }
    this.bySpecialty[specialty].tp += result.tp;
    this.bySpecialty[specialty].fp += result.fp;
    this.bySpecialty[specialty].fn += result.fn;
    this.bySpecialty[specialty].docs++;
    
    // Store detailed result
    this.detailedResults.push({
      docId: docMeta.id,
      specialty: docMeta.specialty,
      groundTruth: groundTruth.length,
      detected: detected.length,
      tp: result.tp,
      fp: result.fp,
      fn: result.fn,
      precision: result.tp / (result.tp + result.fp) || 0,
      recall: result.tp / (result.tp + result.fn) || 0,
    });
    
    return result;
  }
  
  /**
   * Compare ground truth annotations with detected annotations
   * Uses span-based matching with configurable overlap threshold
   */
  compareAnnotations(groundTruth, detected, overlapThreshold = 0.5) {
    const matched = [];
    const falsePositives = [];
    const falseNegatives = [];
    
    const usedDetected = new Set();
    
    // For each ground truth annotation, find best matching detection
    for (const gt of groundTruth) {
      let bestMatch = null;
      let bestOverlap = 0;
      
      for (let i = 0; i < detected.length; i++) {
        if (usedDetected.has(i)) continue;
        
        const d = detected[i];
        const overlap = this.calculateOverlap(gt, d);
        
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestMatch = { index: i, detection: d };
        }
      }
      
      if (bestMatch && bestOverlap >= overlapThreshold) {
        matched.push({ gt, detected: bestMatch.detection, overlap: bestOverlap });
        usedDetected.add(bestMatch.index);
      } else {
        falseNegatives.push(gt);
      }
    }
    
    // Any unmatched detections are false positives
    for (let i = 0; i < detected.length; i++) {
      if (!usedDetected.has(i)) {
        falsePositives.push(detected[i]);
      }
    }
    
    return {
      tp: matched.length,
      fp: falsePositives.length,
      fn: falseNegatives.length,
      matched,
      falsePositives,
      falseNegatives,
    };
  }
  
  /**
   * Calculate overlap between two span annotations
   */
  calculateOverlap(a, b) {
    const start = Math.max(a.start, b.start);
    const end = Math.min(a.end, b.end);
    
    if (start >= end) return 0;
    
    const intersection = end - start;
    const union = Math.max(a.end, b.end) - Math.min(a.start, b.start);
    
    return intersection / union; // IoU
  }
  
  /**
   * Calculate aggregate metrics
   */
  getMetrics() {
    const precision = this.truePositives / (this.truePositives + this.falsePositives) || 0;
    const recall = this.truePositives / (this.truePositives + this.falseNegatives) || 0;
    const f1 = 2 * (precision * recall) / (precision + recall) || 0;
    const f2 = 5 * (precision * recall) / (4 * precision + recall) || 0; // F2 weights recall higher
    
    // Per-type metrics
    const typeMetrics = {};
    for (const [type, counts] of Object.entries(this.byType)) {
      const p = counts.tp / (counts.tp + counts.fp) || 0;
      const r = counts.tp / (counts.tp + counts.fn) || 0;
      typeMetrics[type] = {
        precision: p,
        recall: r,
        f1: 2 * (p * r) / (p + r) || 0,
        total: counts.total,
        tp: counts.tp,
        fp: counts.fp,
        fn: counts.fn,
      };
    }
    
    // Error level metrics
    const errorLevelMetrics = {};
    for (const [level, counts] of Object.entries(this.byErrorLevel)) {
      const p = counts.tp / (counts.tp + counts.fp) || 0;
      const r = counts.tp / (counts.tp + counts.fn) || 0;
      errorLevelMetrics[level] = {
        precision: p,
        recall: r,
        f1: 2 * (p * r) / (p + r) || 0,
      };
    }
    
    // Timing metrics
    const avgTime = this.processingTimes.length > 0
      ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length
      : 0;
    
    return {
      aggregate: {
        precision,
        recall,
        f1,
        f2,
        truePositives: this.truePositives,
        falsePositives: this.falsePositives,
        falseNegatives: this.falseNegatives,
      },
      byType: typeMetrics,
      byErrorLevel: errorLevelMetrics,
      bySpecialty: this.bySpecialty,
      timing: {
        avgProcessingTimeMs: avgTime,
        totalDocuments: this.processingTimes.length,
        documentsPerSecond: avgTime > 0 ? 1000 / avgTime : 0,
      },
    };
  }
}

/**
 * Run validation on a single document
 */
async function validateDocument(doc, metrics) {
  const startTime = Date.now();
  
  // Run Vulpes Celare detection
  let detected;
  try {
    if (typeof detectPHI === "function") {
      // Direct function API
      detected = detectPHI(doc.injectedText);
    } else if (VulpesCelare) {
      // Class-based API
      const instance = new VulpesCelare();
      const result = instance.process(doc.injectedText);
      detected = result.detections || result.annotations || [];
    } else {
      throw new Error("No valid Vulpes Celare API found");
    }
  } catch (e) {
    console.error(`  Error processing ${doc.id}: ${e.message}`);
    detected = [];
  }
  
  const endTime = Date.now();
  metrics.processingTimes.push(endTime - startTime);
  
  // Normalize detected annotations to have start/end/type/text
  const normalizedDetected = detected.map(d => ({
    start: d.start ?? d.startOffset ?? d.index,
    end: d.end ?? d.endOffset ?? (d.index + (d.text?.length || 0)),
    type: d.type ?? d.label ?? d.category,
    text: d.text ?? d.value ?? d.match,
  }));
  
  // Record results
  metrics.recordResult(doc.annotations, normalizedDetected, {
    id: doc.id,
    specialty: doc.specialty,
  });
  
  return {
    docId: doc.id,
    groundTruth: doc.annotations.length,
    detected: normalizedDetected.length,
    processingTime: endTime - startTime,
  };
}

/**
 * Run full validation suite
 */
async function runValidation(config = {}) {
  const {
    mode = "quick", // quick, full, custom
    corpusPath = null,
    outputDir = null,
    verbose = false,
    progressCallback = null,
  } = config;
  
  console.log("╔═══════════════════════════════════════════════════════════════════════╗");
  console.log("║               VULPES CELARE VALIDATION RUNNER                         ║");
  console.log("╚═══════════════════════════════════════════════════════════════════════╝");
  console.log();
  
  // Get or generate corpus
  let corpus;
  
  if (corpusPath) {
    console.log(`[1/3] Loading corpus from ${corpusPath}...`);
    corpus = loadCorpus(corpusPath);
    console.log(`      Loaded ${corpus.documents.length} documents`);
  } else if (mode === "quick") {
    console.log("[1/3] Generating quick validation corpus (50 documents)...");
    corpus = quickGenerate(50);
  } else if (mode === "full") {
    console.log("[1/3] Generating full validation corpus (500 documents)...");
    corpus = fullGenerate();
  } else {
    console.log("[1/3] Generating default validation corpus (200 documents)...");
    corpus = generateCorpus();
  }
  
  console.log();
  console.log("[2/3] Running validation...");
  
  const metrics = new ValidationMetrics();
  const total = corpus.documents.length;
  
  for (let i = 0; i < total; i++) {
    const doc = corpus.documents[i];
    
    if (verbose) {
      console.log(`  Processing ${i + 1}/${total}: ${doc.id}`);
    } else if (i % 10 === 0 || i === total - 1) {
      process.stdout.write(`\r  Progress: ${i + 1}/${total} (${((i + 1) / total * 100).toFixed(1)}%)`);
    }
    
    if (progressCallback) {
      progressCallback({ current: i + 1, total, docId: doc.id });
    }
    
    await validateDocument(doc, metrics);
  }
  
  console.log("\n");
  console.log("[3/3] Calculating metrics...");
  console.log();
  
  const results = metrics.getMetrics();
  
  // Print summary
  printResultsSummary(results);
  
  // =========================================================================
  // CORTEX INTEGRATION - Feed results to learning system
  // =========================================================================
  let cortexAnalysis = null;
  if (VulpesCortex && config.useCortex !== false) {
    try {
      console.log("[Cortex] Initializing intelligence system...");
      await VulpesCortex.initialize();
      
      // Prepare false negatives/positives for analysis
      const falseNegatives = metrics.detailedResults
        .flatMap(d => d.fn > 0 ? [{ docId: d.docId, count: d.fn }] : []);
      const falsePositives = metrics.detailedResults
        .flatMap(d => d.fp > 0 ? [{ docId: d.docId, count: d.fp }] : []);
      
      // Analyze with Cortex
      cortexAnalysis = await VulpesCortex.analyzeResults({
        metrics: {
          sensitivity: results.aggregate.recall * 100,
          specificity: 100 - (results.aggregate.falsePositives / (results.aggregate.truePositives + results.aggregate.falsePositives) * 100),
          precision: results.aggregate.precision * 100,
          f1Score: results.aggregate.f1 * 100,
          f2Score: results.aggregate.f2 * 100,
          confusionMatrix: {
            truePositives: results.aggregate.truePositives,
            falsePositives: results.aggregate.falsePositives,
            falseNegatives: results.aggregate.falseNegatives,
            trueNegatives: 0, // Not tracked in this runner
          }
        },
        falseNegatives,
        falsePositives,
        corpus: "mtsamples",
      }, {
        analyzePatterns: true,
        generateInsights: true,
        profile: config.profile || "HIPAA_STRICT",
      });
      
      console.log("[Cortex] ✓ Analysis complete");
      
      // Get recommendation
      const recommendation = await VulpesCortex.getRecommendation("WHAT_TO_IMPROVE", {
        corpus: "mtsamples",
        currentMetrics: results.aggregate,
      });
      
      // Print Cortex summary
      console.log();
      console.log("CORTEX INTELLIGENCE SUMMARY");
      console.log("─────────────────────────────────────────────────────────────────────────");
      console.log(`  Grade: ${cortexAnalysis.grade?.grade || "N/A"}`);
      if (recommendation?.recommendation?.summary) {
        console.log(`  Recommendation: ${recommendation.recommendation.summary}`);
      }
      if (cortexAnalysis.patterns?.failurePatterns?.length > 0) {
        console.log("  Top Patterns:");
        for (const p of cortexAnalysis.patterns.failurePatterns.slice(0, 3)) {
          console.log(`    • ${p.category}: ${p.remediation || "Review"}`);
        }
      }
      console.log();
      
    } catch (e) {
      console.warn(`[Cortex] Warning: ${e.message}`);
    }
  }
  
  // Save detailed results if output directory specified
  if (outputDir) {
    saveResults(results, metrics.detailedResults, outputDir, corpus.meta);
  }
  
  return {
    metrics: results,
    detailed: metrics.detailedResults,
    corpus: corpus.meta,
    cortex: cortexAnalysis, // Include Cortex analysis if available
  };
}

/**
 * Print human-readable results summary
 */
function printResultsSummary(results) {
  const { aggregate, byType, byErrorLevel, timing } = results;
  
  console.log("╔═══════════════════════════════════════════════════════════════════════╗");
  console.log("║                        VALIDATION RESULTS                             ║");
  console.log("╚═══════════════════════════════════════════════════════════════════════╝");
  console.log();
  
  console.log("AGGREGATE METRICS");
  console.log("─────────────────────────────────────────────────────────────────────────");
  console.log(`  Precision:       ${(aggregate.precision * 100).toFixed(2)}%`);
  console.log(`  Recall:          ${(aggregate.recall * 100).toFixed(2)}%`);
  console.log(`  F1 Score:        ${(aggregate.f1 * 100).toFixed(2)}%`);
  console.log(`  F2 Score:        ${(aggregate.f2 * 100).toFixed(2)}%`);
  console.log();
  console.log(`  True Positives:  ${aggregate.truePositives}`);
  console.log(`  False Positives: ${aggregate.falsePositives}`);
  console.log(`  False Negatives: ${aggregate.falseNegatives}`);
  console.log();
  
  console.log("PERFORMANCE BY PHI TYPE");
  console.log("─────────────────────────────────────────────────────────────────────────");
  
  // Sort by total count descending
  const sortedTypes = Object.entries(byType)
    .sort((a, b) => b[1].total - a[1].total);
  
  console.log("  Type                 | Precision | Recall  | F1      | Count");
  console.log("  ─────────────────────|───────────|─────────|─────────|──────");
  
  for (const [type, data] of sortedTypes) {
    const typeStr = type.padEnd(20);
    const precStr = (data.precision * 100).toFixed(1).padStart(8) + "%";
    const recStr = (data.recall * 100).toFixed(1).padStart(6) + "%";
    const f1Str = (data.f1 * 100).toFixed(1).padStart(6) + "%";
    const countStr = String(data.total).padStart(5);
    console.log(`  ${typeStr} | ${precStr} | ${recStr} | ${f1Str} | ${countStr}`);
  }
  console.log();
  
  console.log("PERFORMANCE BY ERROR LEVEL");
  console.log("─────────────────────────────────────────────────────────────────────────");
  console.log("  Level    | Precision | Recall  | F1");
  console.log("  ─────────|───────────|─────────|─────────");
  
  for (const [level, data] of Object.entries(byErrorLevel)) {
    const levelStr = level.padEnd(8);
    const precStr = (data.precision * 100).toFixed(1).padStart(8) + "%";
    const recStr = (data.recall * 100).toFixed(1).padStart(6) + "%";
    const f1Str = (data.f1 * 100).toFixed(1).padStart(6) + "%";
    console.log(`  ${levelStr} | ${precStr} | ${recStr} | ${f1Str}`);
  }
  console.log();
  
  console.log("TIMING");
  console.log("─────────────────────────────────────────────────────────────────────────");
  console.log(`  Avg Processing Time: ${timing.avgProcessingTimeMs.toFixed(2)} ms/doc`);
  console.log(`  Throughput:          ${timing.documentsPerSecond.toFixed(1)} docs/sec`);
  console.log(`  Total Documents:     ${timing.totalDocuments}`);
  console.log();
  
  // Quality assessment
  console.log("QUALITY ASSESSMENT");
  console.log("─────────────────────────────────────────────────────────────────────────");
  
  if (aggregate.f1 >= 0.95) {
    console.log("  ✅ EXCELLENT: F1 ≥ 95% - Production ready");
  } else if (aggregate.f1 >= 0.90) {
    console.log("  ✅ GOOD: F1 ≥ 90% - Ready for most use cases");
  } else if (aggregate.f1 >= 0.80) {
    console.log("  ⚠️  FAIR: F1 ≥ 80% - May need improvement for production");
  } else {
    console.log("  ❌ NEEDS WORK: F1 < 80% - Requires significant improvement");
  }
  
  if (aggregate.recall < 0.95) {
    console.log("  ⚠️  Recall below 95% - Some PHI may be missed");
  }
  
  if (aggregate.precision < 0.90) {
    console.log("  ⚠️  Precision below 90% - High false positive rate");
  }
  
  console.log();
}

/**
 * Save detailed results to disk
 */
function saveResults(results, detailed, outputDir, corpusMeta) {
  const resolvedDir = path.resolve(outputDir);
  
  if (!fs.existsSync(resolvedDir)) {
    fs.mkdirSync(resolvedDir, { recursive: true });
  }
  
  // Save JSON results
  const jsonPath = path.join(resolvedDir, "validation-results.json");
  fs.writeFileSync(jsonPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    corpus: corpusMeta,
    metrics: results,
  }, null, 2));
  console.log(`Results saved to: ${jsonPath}`);
  
  // Save detailed CSV for analysis
  const csvPath = path.join(resolvedDir, "detailed-results.csv");
  const csvLines = [
    "docId,specialty,groundTruth,detected,tp,fp,fn,precision,recall",
  ];
  for (const d of detailed) {
    csvLines.push(
      `${d.docId},${d.specialty},${d.groundTruth},${d.detected},${d.tp},${d.fp},${d.fn},${d.precision.toFixed(4)},${d.recall.toFixed(4)}`
    );
  }
  fs.writeFileSync(csvPath, csvLines.join("\n"));
  console.log(`Detailed CSV saved to: ${csvPath}`);
  
  // Save markdown report
  const mdPath = path.join(resolvedDir, "VALIDATION-REPORT.md");
  fs.writeFileSync(mdPath, generateMarkdownReport(results, corpusMeta));
  console.log(`Markdown report saved to: ${mdPath}`);
}

/**
 * Generate markdown validation report
 */
function generateMarkdownReport(results, corpusMeta) {
  const { aggregate, byType, byErrorLevel, timing } = results;
  
  let md = `# Vulpes Celare Validation Report

Generated: ${new Date().toISOString()}
Corpus: ${corpusMeta?.name || "Unknown"}
Methodology: ${corpusMeta?.methodology || "Unknown"}

## Executive Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Precision | ${(aggregate.precision * 100).toFixed(2)}% | ≥90% | ${aggregate.precision >= 0.9 ? "✅" : "⚠️"} |
| Recall | ${(aggregate.recall * 100).toFixed(2)}% | ≥95% | ${aggregate.recall >= 0.95 ? "✅" : "⚠️"} |
| F1 Score | ${(aggregate.f1 * 100).toFixed(2)}% | ≥92% | ${aggregate.f1 >= 0.92 ? "✅" : "⚠️"} |

## Confusion Matrix

|  | Detected | Not Detected |
|--|----------|--------------|
| **Is PHI** | ${aggregate.truePositives} (TP) | ${aggregate.falseNegatives} (FN) |
| **Not PHI** | ${aggregate.falsePositives} (FP) | - |

## Performance by PHI Type

| Type | Precision | Recall | F1 | Count |
|------|-----------|--------|-----|-------|
`;

  for (const [type, data] of Object.entries(byType).sort((a, b) => b[1].total - a[1].total)) {
    md += `| ${type} | ${(data.precision * 100).toFixed(1)}% | ${(data.recall * 100).toFixed(1)}% | ${(data.f1 * 100).toFixed(1)}% | ${data.total} |\n`;
  }

  md += `
## Performance by Error Level

| Level | Precision | Recall | F1 |
|-------|-----------|--------|-----|
`;

  for (const [level, data] of Object.entries(byErrorLevel)) {
    md += `| ${level} | ${(data.precision * 100).toFixed(1)}% | ${(data.recall * 100).toFixed(1)}% | ${(data.f1 * 100).toFixed(1)}% |\n`;
  }

  md += `
## Throughput

- **Average Processing Time:** ${timing.avgProcessingTimeMs.toFixed(2)} ms/document
- **Documents Per Second:** ${timing.documentsPerSecond.toFixed(1)}
- **Total Documents Processed:** ${timing.totalDocuments}

## Recommendations

`;

  if (aggregate.recall < 0.95) {
    md += `- **Improve Recall:** Current recall (${(aggregate.recall * 100).toFixed(1)}%) is below the 95% target. Focus on reducing false negatives.\n`;
  }
  
  if (aggregate.precision < 0.90) {
    md += `- **Improve Precision:** Current precision (${(aggregate.precision * 100).toFixed(1)}%) is below the 90% target. Focus on reducing false positives.\n`;
  }
  
  // Find worst performing types
  const worstTypes = Object.entries(byType)
    .filter(([_, d]) => d.f1 < 0.85)
    .sort((a, b) => a[1].f1 - b[1].f1)
    .slice(0, 3);
  
  if (worstTypes.length > 0) {
    md += `- **Focus Areas:** The following PHI types need the most improvement:\n`;
    for (const [type, data] of worstTypes) {
      md += `  - ${type}: F1 = ${(data.f1 * 100).toFixed(1)}%\n`;
    }
  }

  md += `
---
*Report generated by Vulpes Celare Validation Runner*
`;

  return md;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Vulpes Celare Validation Runner (MTSamples)

Usage:
  node run-mtsamples-validation.js [options]

Options:
  --quick             Run quick validation (50 documents)
  --full              Run full validation (500 documents)
  --corpus PATH       Use existing corpus JSON file
  --output DIR        Save results to directory
  --verbose           Show per-document progress
  --profile=NAME      Grading profile: HIPAA_STRICT, DEVELOPMENT, RESEARCH
  --no-cortex         Disable Cortex intelligence integration
  --help, -h          Show this help

Cortex Integration:
  By default, results are fed to Vulpes Cortex for pattern analysis,
  history tracking, and intelligent recommendations. Use --no-cortex
  to run in standalone mode.

Examples:
  node run-mtsamples-validation.js --quick
  node run-mtsamples-validation.js --full --output ./results
  node run-mtsamples-validation.js --corpus ./my-corpus.json
  node run-mtsamples-validation.js --quick --profile=HIPAA_STRICT
`);
    process.exit(0);
  }
  
  const config = {
    mode: "default",
    verbose: args.includes("--verbose") || args.includes("-v"),
    useCortex: !args.includes("--no-cortex"), // Enable by default
  };
  
  if (args.includes("--quick")) {
    config.mode = "quick";
  } else if (args.includes("--full")) {
    config.mode = "full";
  }
  
  // Profile selection
  const profileArg = args.find(a => a.startsWith("--profile="));
  if (profileArg) {
    config.profile = profileArg.split("=")[1].toUpperCase();
  }
  
  const corpusIdx = args.indexOf("--corpus");
  if (corpusIdx !== -1 && args[corpusIdx + 1]) {
    config.corpusPath = args[corpusIdx + 1];
  }
  
  const outputIdx = args.indexOf("--output");
  if (outputIdx !== -1 && args[outputIdx + 1]) {
    config.outputDir = args[outputIdx + 1];
  }
  
  runValidation(config)
    .then(() => {
      console.log("Validation complete!");
      process.exit(0);
    })
    .catch(err => {
      console.error("Validation failed:", err);
      process.exit(1);
    });
}

module.exports = {
  runValidation,
  validateDocument,
  ValidationMetrics,
};
