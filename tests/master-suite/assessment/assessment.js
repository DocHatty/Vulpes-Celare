/**
 * ============================================================================
 *
 *    ██╗   ██╗██╗   ██╗██╗     ██████╗ ███████╗███████╗
 *    ██║   ██║██║   ██║██║     ██╔══██╗██╔════╝██╔════╝
 *    ██║   ██║██║   ██║██║     ██████╔╝█████╗  ███████╗
 *    ╚██╗ ██╔╝██║   ██║██║     ██╔═══╝ ██╔══╝  ╚════██║
 *     ╚████╔╝ ╚██████╔╝███████╗██║     ███████╗███████║
 *      ╚═══╝   ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚══════╝
 *
 *     ██████╗███████╗██╗      █████╗ ██████╗ ███████╗
 *    ██╔════╝██╔════╝██║     ██╔══██╗██╔══██╗██╔════╝
 *    ██║     █████╗  ██║     ███████║██████╔╝█████╗
 *    ██║     ██╔══╝  ██║     ██╔══██║██╔══██╗██╔══╝
 *    ╚██████╗███████╗███████╗██║  ██║██║  ██║███████╗
 *     ╚═════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
 *
 *           A S S E S S M E N T   E N G I N E
 *
 *    Unbiased, Multi-Pass Evaluation with Deep Investigation
 *
 * ============================================================================
 *
 * DESIGN PRINCIPLES:
 * 1. UNBIASED: Tests PHI detection without favoring specific implementations
 * 2. COMPREHENSIVE: All 18 HIPAA Safe Harbor identifiers tested
 * 3. REALISTIC: Tests engine as integrated system, not individual components
 * 4. STRICT GRADING: Clinical-grade thresholds (safety-critical application)
 * 5. MULTI-PASS: Detection → Grading → Investigation workflow
 * 6. TRANSPARENT: Every decision documented and traceable
 *
 * GRADING PHILOSOPHY:
 * - PHI redaction is a SAFETY-CRITICAL application
 * - A single missed PHI item is a HIPAA violation
 * - False negatives (missed PHI) are FAR worse than false positives
 * - Medical context matters for accurate evaluation
 */

const path = require("path");
const fs = require("fs");
const { random } = require("../generators/seeded-random");

// Import console formatter for beautiful, glitch-free output
const fmt = require("../cortex/core/console-formatter");

// ============================================================================
// STRICT GRADING SCHEMA
// ============================================================================
const GRADING_SCHEMA = {
  // Clinical-grade thresholds
  thresholds: {
    // SENSITIVITY is the MOST CRITICAL metric for PHI protection
    // In clinical settings, missing PHI = HIPAA violation = potential lawsuit
    sensitivity: {
      excellent: 99.5, // A+ grade - production ready
      good: 98.0, // A grade - acceptable for most uses
      acceptable: 95.0, // B grade - needs improvement
      poor: 90.0, // C grade - significant issues
      failing: 85.0, // D/F grade - not safe for use
    },

    // SPECIFICITY matters for usability (over-redaction frustrates users)
    // But it's less critical than sensitivity for safety
    specificity: {
      excellent: 99.0,
      good: 95.0,
      acceptable: 90.0,
      poor: 85.0,
      failing: 80.0,
    },

    // PRECISION measures redaction accuracy
    precision: {
      excellent: 98.0,
      good: 95.0,
      acceptable: 90.0,
      poor: 85.0,
      failing: 80.0,
    },
  },

  // Overall score calculation
  // Heavily weighted toward sensitivity because missing PHI is DANGEROUS
  weights: {
    sensitivity: 0.7, // 70% weight - catching PHI is paramount
    specificity: 0.2, // 20% weight - preserving non-PHI matters
    precision: 0.1, // 10% weight - redaction accuracy
  },

  // Penalty system for critical failures
  penalties: {
    // Any missed SSN is a critical failure
    missedSSN: -10,
    // Any missed name in patient context is critical
    missedPatientName: -8,
    // Missed DOB is critical
    missedDOB: -5,
    // Missed address is serious
    missedAddress: -3,
    // Missed phone is serious
    missedPhone: -2,
    // Other missed PHI
    missedOther: -1,

    // Bonuses for perfect categories
    perfectSSN: +3,
    perfectNames: +3,
    perfectDates: +2,
  },

  // Grade boundaries (after all calculations and penalties)
  grades: {
    "A+": 97,
    A: 93,
    "A-": 90,
    "B+": 87,
    B: 83,
    "B-": 80,
    "C+": 77,
    C: 73,
    "C-": 70,
    D: 60,
    F: 0,
  },

  // Grade descriptions
  descriptions: {
    "A+": "EXCELLENT - Production ready, clinical-grade PHI protection",
    A: "VERY GOOD - Suitable for most production uses with monitoring",
    "A-": "GOOD - Acceptable with regular auditing",
    "B+": "ABOVE AVERAGE - Requires improvement before production",
    B: "AVERAGE - Significant improvements needed",
    "B-": "BELOW AVERAGE - Major issues requiring attention",
    "C+": "MARGINAL - Not recommended for production",
    C: "POOR - Substantial PHI leakage risk",
    "C-": "VERY POOR - High PHI leakage risk",
    D: "FAILING - Unsafe for any PHI handling",
    F: "CRITICAL FAILURE - Do not use",
  },
};

// ============================================================================
// CORE ASSESSMENT CLASS
// ============================================================================
class RigorousAssessment {
  constructor(options = {}) {
    this.options = {
      documentCount: options.documentCount || 200,
      errorDistribution: options.errorDistribution || {
        none: 0.05,
        low: 0.25,
        medium: 0.4,
        high: 0.25,
        extreme: 0.05,
      },
      verbose: options.verbose || false,
      outputDir:
        options.outputDir || path.join(__dirname, "..", "..", "results"),
      // Grading profile: HIPAA_STRICT (default), DEVELOPMENT, RESEARCH, OCR_TOLERANT
      profile: options.profile || "HIPAA_STRICT",
      ...options,
    };

    // Results storage
    this.results = {
      documents: [],
      metrics: {},
      failures: [],
      overRedactions: [],
      timing: {},
    };
  }

  /**
   * PHASE 1: Run the complete test suite
   * Let the ENTIRE suite run before any analysis
   */
  async runFullSuite() {
    console.error('[DEBUG] runFullSuite() called');
    const startTime = Date.now();

    console.error('[DEBUG] Clearing require cache...');
    // Clear require cache for test documents to pick up any changes
    const phiGenPath = require.resolve("../documents/phi-generator");
    const templatesPath = require.resolve("../documents/templates");
    delete require.cache[phiGenPath];
    delete require.cache[templatesPath];

    console.error('[DEBUG] Importing modules...');
    // Import required modules (fresh after cache clear)
    const {
      generateCompletePHIDataset,
    } = require("../documents/phi-generator");
    const { TEMPLATES } = require("../documents/templates");

    console.error('[DEBUG] Loading engine...');
    // Load the engine (test as integrated system)
    let VulpesCelare;
    try {
      const module = require("../../../dist/VulpesCelare.js");
      VulpesCelare = module.VulpesCelare;
    } catch (err) {
      throw new Error(
        `Failed to load engine: ${err.message}. Run 'npm run build' first.`,
      );
    }

    console.error('[DEBUG] Creating engine instance...');
    const engine = new VulpesCelare();
    console.error('[DEBUG] Getting engine info...');
    this.results.engineInfo = {
      name: VulpesCelare.NAME,
      version: VulpesCelare.VERSION,
      variant: VulpesCelare.VARIANT,
      activeFilters: engine.getActiveFilters().length,
    };

    console.error('[DEBUG] Showing banner...');
    // Generate and process documents - show full ASCII art banner
    console.error(
      fmt.assessmentBannerFull(
        this.options.documentCount,
        VulpesCelare.NAME,
        VulpesCelare.VERSION,
      ),
    );

    console.error('[DEBUG] Selecting error levels...');
    const errorLevels = this.selectErrorLevels(this.options.documentCount);

    console.error('[DEBUG] Setting up parallel processing...');
    // ========================================================================
    // PARALLEL DOCUMENT PROCESSING
    // Process documents concurrently for significant speed improvement
    // ========================================================================
    const CONCURRENCY = this.options.concurrency || 8; // Default 8 parallel workers
    const totalDocs = this.options.documentCount;
    let completed = 0;

    console.error('[DEBUG] Preparing document tasks...');
    // Prepare all document tasks
    const documentTasks = [];
    for (let i = 0; i < totalDocs; i++) {
      documentTasks.push({
        index: i,
        errorLevel: errorLevels[i],
        template: TEMPLATES[i % TEMPLATES.length],
      });
    }

    console.error(`[DEBUG] Created ${documentTasks.length} tasks`);

    // Process a single document
    const processDocument = async (task) => {
      const { index, errorLevel, template } = task;

      // Generate PHI data
      const phiData = generateCompletePHIDataset(errorLevel);

      // Generate document
      const documentContent = template.generator(phiData);

      // Process through engine
      const processStart = Date.now();
      const result = await engine.process(documentContent);
      const processTime = Date.now() - processStart;

      // Filter non-PHI ground truth based on what THIS template actually uses
      const templateUsesNonPHI = template.usesNonPHI || {};
      const groundTruthNonPHI = phiData._groundTruthNonPHI || {};

      const filteredNonPHI = Object.entries(groundTruthNonPHI)
        .filter(([fieldName]) => templateUsesNonPHI[fieldName] === true)
        .map(([fieldName, data]) => ({
          type: data.type,
          value: data.value,
          source: fieldName,
        }));

      // Update progress counter
      completed++;
      if (completed % 25 === 0 || completed === totalDocs) {
        // CRITICAL: Use stderr, not stdout! MCP uses stdout for JSON-RPC communication.
        // Writing to stdout corrupts the protocol and causes "Unexpected token" errors.
        process.stderr.write(
          `  Progress: ${completed}/${totalDocs} documents (${CONCURRENCY}x parallel)\r`,
        );
      }

      return {
        id: index + 1,
        templateName: template.name,
        errorLevel,
        processTimeMs: processTime,
        originalContent: documentContent,
        redactedContent: result.text,
        expectedPHI: phiData._groundTruthPHI,
        expectedNonPHI: filteredNonPHI,
        engineReport: result.report,
      };
    };

    // Execute with concurrency pool (batched Promise.all)
    const results = [];
    console.error(`  Starting ${Math.ceil(documentTasks.length / CONCURRENCY)} batches...`);
    for (let i = 0; i < documentTasks.length; i += CONCURRENCY) {
      console.error(`  Batch ${Math.floor(i/CONCURRENCY) + 1}: processing tasks ${i} to ${Math.min(i+CONCURRENCY-1, documentTasks.length-1)}`);
      const batch = documentTasks.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(batch.map(processDocument));
      results.push(...batchResults);
      console.error(`  Batch ${Math.floor(i/CONCURRENCY) + 1}: complete (${batchResults.length} results)`);
    }
    console.error(`  All batches complete, total results: ${results.length}`);

    // Sort by ID to maintain order and add to results
    console.error(`  Sorting results...`);
    results.sort((a, b) => a.id - b.id);
    console.error(`  Adding to this.results.documents...`);
    this.results.documents.push(...results);
    console.error(`  Documents added`);

    this.results.timing.processingMs = Date.now() - startTime;
    console.error(
      `\n  Processing complete in ${(this.results.timing.processingMs / 1000).toFixed(2)}s\n`,
    );

    return this;
  }

  /**
   * PHASE 2: Comprehensive sensitivity/specificity grading
   * Multi-pass analysis with strict evaluation
   */
  calculateMetrics() {
    console.error(fmt.phaseHeader(2, "CALCULATING METRICS"));
    console.error("");

    // Initialize counters
    let totalTruePositives = 0;
    let totalFalseNegatives = 0;
    let totalTrueNegatives = 0;
    let totalFalsePositives = 0;

    // ═══════════════════════════════════════════════════════════════════════════
    // TEST SUITE VALIDATION - Detect and report test bugs early
    // ═══════════════════════════════════════════════════════════════════════════
    let skippedNonPHI = { total: 0, byType: {} };
    let totalExpectedNonPHI = 0;

    // Detailed tracking by type
    const byPHIType = {};
    const byErrorLevel = {};
    const byTemplate = {};

    // Process each document
    for (const doc of this.results.documents) {
      // Check each expected PHI item
      for (const phi of doc.expectedPHI) {
        // Initialize type tracking
        if (!byPHIType[phi.type]) {
          byPHIType[phi.type] = { tp: 0, fn: 0, total: 0 };
        }
        byPHIType[phi.type].total++;

        // Initialize error level tracking
        if (!byErrorLevel[doc.errorLevel]) {
          byErrorLevel[doc.errorLevel] = { tp: 0, fn: 0, tn: 0, fp: 0 };
        }

        // Initialize template tracking
        if (!byTemplate[doc.templateName]) {
          byTemplate[doc.templateName] = { tp: 0, fn: 0, tn: 0, fp: 0 };
        }

        // Check if PHI was redacted (value no longer appears in clear text)
        const wasRedacted = !doc.redactedContent.includes(phi.value);

        if (wasRedacted) {
          totalTruePositives++;
          byPHIType[phi.type].tp++;
          byErrorLevel[doc.errorLevel].tp++;
          byTemplate[doc.templateName].tp++;
        } else {
          totalFalseNegatives++;
          byPHIType[phi.type].fn++;
          byErrorLevel[doc.errorLevel].fn++;
          byTemplate[doc.templateName].fn++;

          // Record failure for investigation
          this.results.failures.push({
            docId: doc.id,
            templateName: doc.templateName,
            errorLevel: doc.errorLevel,
            phiType: phi.type,
            value: phi.value,
            source: phi.source,
            context: this.extractContext(doc.originalContent, phi.value),
          });
        }
      }

      // Check non-PHI preservation
      for (const nonPhi of doc.expectedNonPHI) {
        totalExpectedNonPHI++;

        // VALIDATION: Check if ground truth item actually exists in the document
        // This catches test bugs where templates don't include all expected items
        const existsInOriginal = doc.originalContent.includes(nonPhi.value);
        if (!existsInOriginal) {
          // Track skipped items for validation report
          skippedNonPHI.total++;
          if (!skippedNonPHI.byType[nonPhi.type]) {
            skippedNonPHI.byType[nonPhi.type] = { count: 0, examples: [] };
          }
          skippedNonPHI.byType[nonPhi.type].count++;
          if (skippedNonPHI.byType[nonPhi.type].examples.length < 3) {
            skippedNonPHI.byType[nonPhi.type].examples.push({
              value: nonPhi.value,
              template: doc.templateName,
            });
          }
          continue;
        }

        const wasPreserved = doc.redactedContent.includes(nonPhi.value);

        // PROVIDER_NAME redactions are ACCEPTABLE - they're labeled differently for context
        // This supports the new approach: redact ALL names but use PROVIDER_NAME label
        const isAcceptableRedaction =
          nonPhi.type === "PROVIDER_NAME" && !wasPreserved;

        if (wasPreserved || isAcceptableRedaction) {
          totalTrueNegatives++;
          if (byErrorLevel[doc.errorLevel]) byErrorLevel[doc.errorLevel].tn++;
          if (byTemplate[doc.templateName]) byTemplate[doc.templateName].tn++;
        } else {
          totalFalsePositives++;
          if (byErrorLevel[doc.errorLevel]) byErrorLevel[doc.errorLevel].fp++;
          if (byTemplate[doc.templateName]) byTemplate[doc.templateName].fp++;

          // Record over-redaction
          this.results.overRedactions.push({
            docId: doc.id,
            templateName: doc.templateName,
            errorLevel: doc.errorLevel,
            type: nonPhi.type,
            value: nonPhi.value,
            source: nonPhi.source,
          });
        }
      }
    }

    // Calculate primary metrics
    const totalPHI = totalTruePositives + totalFalseNegatives;
    const totalNonPHI = totalTrueNegatives + totalFalsePositives;

    // ═══════════════════════════════════════════════════════════════════════════
    // METRIC INTEGRITY CHECKS - Guardrails against hallucination/false reporting
    // ═══════════════════════════════════════════════════════════════════════════
    const expectedTotalPHI = this.results.documents.reduce(
      (sum, doc) => sum + doc.expectedPHI.length,
      0,
    );

    if (totalPHI !== expectedTotalPHI) {
      console.error(
        `\n  ❌ INTEGRITY ERROR: Counted PHI (${totalPHI}) != Expected PHI (${expectedTotalPHI})`,
      );
      console.error(
        `     This indicates a bug in the test system, not the engine!`,
      );
    }

    // Verify confusion matrix integrity: TP + FN must equal total PHI items tested
    const confusionMatrixSum = totalTruePositives + totalFalseNegatives;
    if (confusionMatrixSum !== totalPHI) {
      console.error(
        `\n  ❌ INTEGRITY ERROR: TP + FN (${confusionMatrixSum}) != Total PHI (${totalPHI})`,
      );
      console.error(
        `     Confusion matrix is corrupted - results are unreliable!`,
      );
    }

    const sensitivity =
      totalPHI > 0 ? (totalTruePositives / totalPHI) * 100 : 0;
    const specificity =
      totalNonPHI > 0 ? (totalTrueNegatives / totalNonPHI) * 100 : 100;
    const precision =
      totalTruePositives + totalFalsePositives > 0
        ? (totalTruePositives / (totalTruePositives + totalFalsePositives)) *
          100
        : 0;
    const recall = sensitivity;
    const f1Score =
      precision + recall > 0
        ? (2 * (precision * recall)) / (precision + recall)
        : 0;

    // F2-Score: Recall-weighted metric (beta=2) - HIPAA gold standard for de-identification
    // F2 weights recall 4x more than precision because missing PHI is worse than over-redaction
    const f2Score =
      precision + recall > 0
        ? (5 * (precision * recall)) / (4 * precision + recall)
        : 0;

    // MCC (Matthews Correlation Coefficient): Best single metric for imbalanced binary classification
    // Range: -1 (total disagreement) to +1 (perfect prediction), 0 = random guessing
    // Formula: (TP*TN - FP*FN) / sqrt((TP+FP)(TP+FN)(TN+FP)(TN+FN))
    const mccNumerator =
      totalTruePositives * totalTrueNegatives -
      totalFalsePositives * totalFalseNegatives;
    const mccDenominator = Math.sqrt(
      (totalTruePositives + totalFalsePositives) *
        (totalTruePositives + totalFalseNegatives) *
        (totalTrueNegatives + totalFalsePositives) *
        (totalTrueNegatives + totalFalseNegatives),
    );
    const mcc = mccDenominator === 0 ? 0 : mccNumerator / mccDenominator;

    // Calculate overall score with weights
    let rawScore =
      sensitivity * GRADING_SCHEMA.weights.sensitivity +
      specificity * GRADING_SCHEMA.weights.specificity +
      precision * GRADING_SCHEMA.weights.precision;

    // Apply penalties for critical failures (profile-aware)
    let penalties = 0;
    const missedSSNs = this.results.failures.filter(
      (f) => f.phiType === "SSN",
    ).length;
    const missedNames = this.results.failures.filter(
      (f) => f.phiType === "NAME",
    ).length;
    const missedDOBs = this.results.failures.filter(
      (f) => f.phiType === "DATE" && f.source === "dob",
    ).length;

    // Penalty calculation based on profile
    const profile = this.options.profile || "HIPAA_STRICT";

    if (profile === "DEVELOPMENT") {
      // DEVELOPMENT: Diminishing penalties - useful for iterative improvement
      // Uses log scale so early fixes have more impact on score
      const diminishingPenalty = (count, basePenalty) => {
        if (count === 0) return 0;
        // First few misses hurt more, then diminishing returns
        return -Math.min(Math.log2(count + 1) * Math.abs(basePenalty), 30);
      };
      penalties += diminishingPenalty(
        missedSSNs,
        GRADING_SCHEMA.penalties.missedSSN,
      );
      penalties += diminishingPenalty(
        missedNames,
        GRADING_SCHEMA.penalties.missedPatientName,
      );
      penalties += diminishingPenalty(
        missedDOBs,
        GRADING_SCHEMA.penalties.missedDOB,
      );
      // Cap total penalties in development
      penalties = Math.max(penalties, -50);
    } else if (profile === "RESEARCH") {
      // RESEARCH: Minimal penalties - focus on understanding
      const capped = Math.min(
        missedSSNs * 2 + missedNames * 1 + missedDOBs * 1,
        20,
      );
      penalties = -capped;
    } else {
      // HIPAA_STRICT (default): Full linear penalties - production validation
      penalties += missedSSNs * GRADING_SCHEMA.penalties.missedSSN;
      penalties += missedNames * GRADING_SCHEMA.penalties.missedPatientName;
      penalties += missedDOBs * GRADING_SCHEMA.penalties.missedDOB;
    }

    // Apply bonuses for perfect categories (all profiles)
    if (byPHIType["SSN"] && byPHIType["SSN"].fn === 0) {
      penalties += GRADING_SCHEMA.penalties.perfectSSN;
    }
    if (byPHIType["NAME"] && byPHIType["NAME"].fn === 0) {
      penalties += GRADING_SCHEMA.penalties.perfectNames;
    }
    if (byPHIType["DATE"] && byPHIType["DATE"].fn === 0) {
      penalties += GRADING_SCHEMA.penalties.perfectDates;
    }

    // Calculate final score
    let finalScore = Math.round(rawScore + penalties);
    finalScore = Math.max(0, Math.min(100, finalScore));

    // Hard caps based on sensitivity (safety critical)
    if (sensitivity < GRADING_SCHEMA.thresholds.sensitivity.failing) {
      finalScore = Math.min(finalScore, 30); // Cap at F
    } else if (sensitivity < GRADING_SCHEMA.thresholds.sensitivity.poor) {
      finalScore = Math.min(finalScore, 50); // Cap at D
    } else if (sensitivity < GRADING_SCHEMA.thresholds.sensitivity.acceptable) {
      finalScore = Math.min(finalScore, 70); // Cap at C
    }

    // Determine grade
    let grade = "F";
    for (const [g, threshold] of Object.entries(GRADING_SCHEMA.grades)) {
      if (finalScore >= threshold) {
        grade = g;
        break;
      }
    }

    // Store metrics
    // ═══════════════════════════════════════════════════════════════════════════
    // TEST SUITE VALIDATION REPORT
    // ═══════════════════════════════════════════════════════════════════════════
    const skippedPercentage =
      totalExpectedNonPHI > 0
        ? ((skippedNonPHI.total / totalExpectedNonPHI) * 100).toFixed(1)
        : 0;

    if (skippedNonPHI.total > 0) {
      console.error("");
      console.error(fmt.headerBox("TEST SUITE VALIDATION WARNING"));
      console.error(`
  ${skippedNonPHI.total}/${totalExpectedNonPHI} (${skippedPercentage}%) expected non-PHI items were NOT FOUND in documents.
  These items are in ground truth but templates don't include them.
  This does NOT affect test accuracy - skipped items are excluded from metrics.
`);

      console.error(`  Skipped by type:`);
      for (const [type, data] of Object.entries(skippedNonPHI.byType)) {
        console.error(`    ${type}: ${data.count} items`);
        data.examples.forEach((ex) => {
          console.error(`      - "${ex.value}" (${ex.template})`);
        });
      }
      console.error(``);

      // CRITICAL WARNING: If more than 50% of non-PHI items are skipped, something is very wrong
      if (parseFloat(skippedPercentage) > 50) {
        console.error(
          `  ❌ CRITICAL: Over 50% of expected non-PHI items missing from documents!`,
        );
        console.error(
          `     This likely indicates a TEST BUG - templates may not match ground truth.`,
        );
        console.error(
          `     Review phi-generator.js and templates.js for mismatches.\n`,
        );
      }
    }

    this.results.metrics = {
      // Confusion matrix
      confusionMatrix: {
        truePositives: totalTruePositives,
        falseNegatives: totalFalseNegatives,
        trueNegatives: totalTrueNegatives,
        falsePositives: totalFalsePositives,
        totalPHI,
        totalNonPHI,
      },

      // Primary metrics
      sensitivity: parseFloat(sensitivity.toFixed(4)),
      specificity: parseFloat(specificity.toFixed(4)),
      precision: parseFloat(precision.toFixed(4)),
      recall: parseFloat(recall.toFixed(4)),
      f1Score: parseFloat(f1Score.toFixed(4)),
      f2Score: parseFloat(f2Score.toFixed(4)), // Recall-weighted (HIPAA gold standard)
      mcc: parseFloat(mcc.toFixed(4)), // Matthews Correlation Coefficient - gold standard for imbalanced data

      // Integrity verification
      integrityCheck: {
        expectedPHI: expectedTotalPHI,
        countedPHI: totalPHI,
        passed: totalPHI === expectedTotalPHI,
      },

      // Scoring
      rawScore: parseFloat(rawScore.toFixed(2)),
      penalties,
      finalScore,
      grade,
      gradeDescription: GRADING_SCHEMA.descriptions[grade],
      profile: profile, // Grading profile used (HIPAA_STRICT, DEVELOPMENT, etc.)

      // Breakdowns
      byPHIType,
      byErrorLevel,
      byTemplate,

      // Validation info
      testValidation: {
        totalExpectedNonPHI,
        skippedNonPHI: skippedNonPHI.total,
        skippedPercentage: parseFloat(skippedPercentage),
        skippedByType: skippedNonPHI.byType,
      },
    };

    return this;
  }

  /**
   * PHASE 3: Deep investigation of failures
   * Analyze patterns, root causes, and remediation strategies
   */
  investigateFailures() {
    console.error(fmt.phaseHeader(3, "DEEP INVESTIGATION OF FAILURES"));
    console.error("");

    if (this.results.failures.length === 0) {
      console.error("  ✓ No failures to investigate! Perfect PHI detection.\n");
      this.results.investigation = {
        summary: "No failures detected",
        patterns: [],
        recommendations: [],
      };
      return this;
    }

    // Analyze failure patterns
    const patterns = this.analyzeFailurePatterns();

    // Generate recommendations
    const recommendations = this.generateRecommendations(patterns);

    // Store investigation results
    this.results.investigation = {
      summary: `${this.results.failures.length} PHI items missed, ${this.results.overRedactions.length} over-redactions`,
      patterns,
      recommendations,
      criticalFindings: this.identifyCriticalFindings(),
    };

    return this;
  }

  /**
   * Analyze patterns in failures
   */
  analyzeFailurePatterns() {
    const patterns = {
      // By PHI type
      byType: {},
      // By error level
      byErrorLevel: {},
      // By template
      byTemplate: {},
      // Common characteristics
      characteristics: [],
    };

    // Group failures by type
    for (const failure of this.results.failures) {
      // By type
      if (!patterns.byType[failure.phiType]) {
        patterns.byType[failure.phiType] = [];
      }
      patterns.byType[failure.phiType].push(failure);

      // By error level
      if (!patterns.byErrorLevel[failure.errorLevel]) {
        patterns.byErrorLevel[failure.errorLevel] = [];
      }
      patterns.byErrorLevel[failure.errorLevel].push(failure);

      // By template
      if (!patterns.byTemplate[failure.templateName]) {
        patterns.byTemplate[failure.templateName] = [];
      }
      patterns.byTemplate[failure.templateName].push(failure);
    }

    // Identify common characteristics
    // Check for OCR error patterns
    const ocrPatterns = this.results.failures.filter((f) =>
      /[0OIl1|5SB8Gg6]/.test(f.value),
    );
    if (ocrPatterns.length > 0) {
      patterns.characteristics.push({
        type: "OCR_CONFUSION",
        count: ocrPatterns.length,
        description: "PHI with OCR-confusable characters (0/O, 1/l/I, etc.)",
        samples: ocrPatterns.slice(0, 5).map((f) => f.value),
      });
    }

    // Check for case variation patterns
    const casePatterns = this.results.failures.filter(
      (f) =>
        f.value !== f.value.toLowerCase() && f.value !== f.value.toUpperCase(),
    );
    if (casePatterns.length > 0) {
      patterns.characteristics.push({
        type: "CASE_VARIATION",
        count: casePatterns.length,
        description: "PHI with mixed case that may not be recognized",
        samples: casePatterns.slice(0, 5).map((f) => f.value),
      });
    }

    // Check for format variations
    const formatPatterns = {
      phones: this.results.failures.filter((f) => f.phiType === "PHONE"),
      dates: this.results.failures.filter((f) => f.phiType === "DATE"),
      ssns: this.results.failures.filter((f) => f.phiType === "SSN"),
    };

    if (formatPatterns.phones.length > 0) {
      patterns.characteristics.push({
        type: "PHONE_FORMAT",
        count: formatPatterns.phones.length,
        description: "Phone numbers in unrecognized formats",
        samples: formatPatterns.phones.slice(0, 5).map((f) => f.value),
      });
    }

    if (formatPatterns.dates.length > 0) {
      patterns.characteristics.push({
        type: "DATE_FORMAT",
        count: formatPatterns.dates.length,
        description: "Dates in unrecognized formats",
        samples: formatPatterns.dates.slice(0, 5).map((f) => f.value),
      });
    }

    // High error level correlation
    const highErrorFailures =
      (patterns.byErrorLevel["high"] || []).length +
      (patterns.byErrorLevel["extreme"] || []).length;
    const totalHighError = this.results.documents.filter(
      (d) => d.errorLevel === "high" || d.errorLevel === "extreme",
    ).length;

    if (highErrorFailures > 0 && totalHighError > 0) {
      const failureRate = (
        (highErrorFailures / this.results.failures.length) *
        100
      ).toFixed(1);
      patterns.characteristics.push({
        type: "ERROR_CORRELATION",
        count: highErrorFailures,
        description: `${failureRate}% of failures occur in high/extreme error documents`,
        severity: failureRate > 50 ? "HIGH" : "MEDIUM",
      });
    }

    return patterns;
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(patterns) {
    const recommendations = [];

    // Recommendations by PHI type
    for (const [type, failures] of Object.entries(patterns.byType)) {
      if (failures.length === 0) continue;

      const rec = {
        category: `${type} Detection`,
        priority: this.getPriority(type, failures.length),
        issue: `${failures.length} ${type} items missed`,
        samples: failures.slice(0, 3).map((f) => f.value),
        suggestions: [],
      };

      // Type-specific recommendations
      switch (type) {
        case "NAME":
          rec.suggestions = [
            "Review name pattern regex for edge cases",
            "Add support for additional name formats (hyphenated, apostrophes)",
            "Consider fuzzy matching for OCR-corrupted names",
            "Check name tokenization logic",
          ];
          break;
        case "SSN":
          rec.suggestions = [
            "CRITICAL: SSN detection must be 100%",
            "Add OCR-tolerant patterns (O→0, l→1, etc.)",
            "Support all SSN formats (dashes, spaces, continuous)",
            "Consider partial SSN detection (last 4 digits)",
          ];
          break;
        case "DATE":
          rec.suggestions = [
            "Add more date format patterns",
            "Support international date formats",
            "Add OCR-tolerant date patterns",
            "Consider context-aware date detection",
          ];
          break;
        case "PHONE":
          rec.suggestions = [
            "Expand phone number format support",
            "Add international phone number patterns",
            "Support extensions and additional notations",
            "Add OCR-tolerant phone patterns",
          ];
          break;
        case "ADDRESS":
          rec.suggestions = [
            "Review address detection regex",
            "Add support for apartment/unit variations",
            "Consider multi-line address detection",
            "Add street type abbreviation handling",
          ];
          break;
        default:
          rec.suggestions = [
            `Review ${type} detection patterns`,
            `Add OCR-tolerant variations`,
            `Check for format variations in real documents`,
          ];
      }

      recommendations.push(rec);
    }

    // Recommendations for OCR issues
    if (patterns.characteristics.some((c) => c.type === "OCR_CONFUSION")) {
      recommendations.push({
        category: "OCR Tolerance",
        priority: "HIGH",
        issue: "OCR-corrupted values not being detected",
        suggestions: [
          "Add character substitution patterns to all filters",
          "Implement fuzzy matching with edit distance",
          "Create OCR normalization preprocessing step",
          "Test with more aggressive OCR error simulation",
        ],
      });
    }

    // Sort by priority
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    recommendations.sort(
      (a, b) =>
        (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99),
    );

    return recommendations;
  }

  /**
   * Identify critical findings
   */
  identifyCriticalFindings() {
    const findings = [];

    // Any missed SSN is critical
    const missedSSNs = this.results.failures.filter((f) => f.phiType === "SSN");
    if (missedSSNs.length > 0) {
      findings.push({
        severity: "CRITICAL",
        finding: `${missedSSNs.length} Social Security Numbers were NOT redacted`,
        impact: "HIPAA violation - SSN is a direct identifier",
        samples: missedSSNs.slice(0, 3).map((f) => f.value),
      });
    }

    // Missed patient names
    const missedNames = this.results.failures.filter(
      (f) => f.phiType === "NAME",
    );
    if (missedNames.length > 0) {
      findings.push({
        severity: "CRITICAL",
        finding: `${missedNames.length} patient names were NOT redacted`,
        impact: "HIPAA violation - Names are direct identifiers",
        samples: missedNames.slice(0, 3).map((f) => f.value),
      });
    }

    // Missed dates of birth
    const missedDOBs = this.results.failures.filter(
      (f) => f.phiType === "DATE" && f.source === "dob",
    );
    if (missedDOBs.length > 0) {
      findings.push({
        severity: "HIGH",
        finding: `${missedDOBs.length} dates of birth were NOT redacted`,
        impact: "HIPAA violation - DOB is a key identifier",
        samples: missedDOBs.slice(0, 3).map((f) => f.value),
      });
    }

    // High failure rate in any category
    const metrics = this.results.metrics;
    if (metrics.sensitivity < 95) {
      findings.push({
        severity: "CRITICAL",
        finding: `Overall sensitivity is only ${metrics.sensitivity.toFixed(1)}%`,
        impact: `${metrics.confusionMatrix.falseNegatives} PHI items leaked`,
      });
    }

    return findings;
  }

  /**
   * Get priority for recommendation
   */
  getPriority(type, count) {
    const criticalTypes = ["SSN", "NAME", "DATE"];
    const highTypes = ["PHONE", "ADDRESS", "EMAIL", "MRN"];

    if (criticalTypes.includes(type) && count > 0) return "CRITICAL";
    if (highTypes.includes(type) && count > 3) return "HIGH";
    if (count > 10) return "HIGH";
    if (count > 5) return "MEDIUM";
    return "LOW";
  }

  /**
   * Extract context around a value in the document
   */
  extractContext(content, value, chars = 50) {
    const idx = content.indexOf(value);
    if (idx === -1) return "Value not found in original content";

    const start = Math.max(0, idx - chars);
    const end = Math.min(content.length, idx + value.length + chars);

    return content.substring(start, end).replace(/\n/g, " ").trim();
  }

  /**
   * Select error levels based on distribution
   */
  selectErrorLevels(count) {
    const levels = [];
    const dist = this.options.errorDistribution;

    for (let i = 0; i < count; i++) {
      const rand = random();
      let cumulative = 0;

      for (const [level, prob] of Object.entries(dist)) {
        cumulative += prob;
        if (rand <= cumulative) {
          levels.push(level);
          break;
        }
      }
    }

    return levels;
  }

  /**
   * Generate comprehensive report
   * @param {Object} options - Optional settings
   * @param {Object} options.smartGrade - Smart grading results to use instead of raw grade
   */
  generateReport(options = {}) {
    const m = this.results.metrics;
    const cm = m.confusionMatrix;

    // Use smart grade if provided, otherwise fall back to raw metrics
    const displayGrade = options.smartGrade?.grade || m.grade;
    const displayScore = options.smartGrade?.finalScore ?? m.finalScore;
    const displayDescription =
      options.smartGrade?.gradeDescription || m.gradeDescription;
    const displayProfile = options.smartGrade
      ? ` (${options.profile || "DEVELOPMENT"} profile)`
      : " (HIPAA_STRICT profile)";

    // Build report using formatter for consistent output
    const divider = fmt.divider(fmt.BOX.SH);

    let report = `
${fmt.headerBox("VULPES CELARE - ASSESSMENT REPORT")}

ENGINE INFORMATION
${divider}
  Name:            ${this.results.engineInfo.name}
  Version:         ${this.results.engineInfo.version}
  Variant:         ${this.results.engineInfo.variant}
  Active Filters:  ${this.results.engineInfo.activeFilters}

TEST CONFIGURATION
${divider}
  Documents:       ${this.results.documents.length}
  Processing Time: ${(this.results.timing.processingMs / 1000).toFixed(2)}s
  Avg per Doc:     ${(this.results.timing.processingMs / this.results.documents.length).toFixed(1)}ms

${fmt.divider(fmt.BOX.H)}
${fmt.padToWidth(`FINAL GRADE${displayProfile}`, fmt.BOX_WIDTH, "center")}
${fmt.divider(fmt.BOX.H)}

${fmt.gradeBox(displayGrade, displayScore)}

${fmt.padToWidth(displayDescription, fmt.BOX_WIDTH, "center")}

${fmt.divider(fmt.BOX.H)}

CONFUSION MATRIX
${divider}
                          | Actual PHI | Actual Non-PHI |
  ------------------------+------------+----------------+
  Predicted PHI (Redacted)|    ${String(cm.truePositives).padStart(5)}   |      ${String(cm.falsePositives).padStart(5)}     |
  Predicted Non-PHI       |    ${String(cm.falseNegatives).padStart(5)}   |      ${String(cm.trueNegatives).padStart(5)}     |
  ------------------------+------------+----------------+
  Total                   |    ${String(cm.totalPHI).padStart(5)}   |      ${String(cm.totalNonPHI).padStart(5)}     |

PRIMARY METRICS
${divider}
  SENSITIVITY (Recall):   ${m.sensitivity.toFixed(2)}%  <- PHI correctly redacted
  SPECIFICITY:            ${m.specificity.toFixed(2)}%  <- Non-PHI correctly preserved
  PRECISION (PPV):        ${m.precision.toFixed(2)}%  <- Redaction accuracy
  F1 SCORE:               ${m.f1Score.toFixed(2)}
  F2 SCORE:               ${m.f2Score.toFixed(2)}    <- Recall-weighted (HIPAA gold standard)
  MCC:                    ${(m.mcc || 0).toFixed(4)}  <- Gold standard for imbalanced data (-1 to +1)

INTEGRITY CHECK
${divider}
  Expected PHI Items:     ${m.integrityCheck.expectedPHI}
  Counted PHI Items:      ${m.integrityCheck.countedPHI}
  Integrity Status:       ${m.integrityCheck.passed ? "[OK] PASSED" : "[X] FAILED - Results may be unreliable!"}

SCORE BREAKDOWN
${divider}
  Raw Score:              ${m.rawScore.toFixed(2)}
  Penalties/Bonuses:      ${m.penalties >= 0 ? "+" : ""}${m.penalties}
  Final Score:            ${m.finalScore}

PERFORMANCE BY PHI TYPE
${divider}
`;

    const sortedTypes = Object.entries(m.byPHIType).sort(
      (a, b) => b[1].total - a[1].total,
    );

    for (const [type, stats] of sortedTypes) {
      const rate =
        stats.total > 0 ? ((stats.tp / stats.total) * 100).toFixed(1) : "N/A";
      const status = stats.fn === 0 ? "✓" : "✗";
      report += `  ${status} ${type.padEnd(18)} ${stats.tp}/${stats.total} (${rate}%)`;
      if (stats.fn > 0) report += ` - ${stats.fn} MISSED`;
      report += "\n";
    }

    report += `
PERFORMANCE BY ERROR LEVEL
${divider}
`;

    for (const level of ["none", "low", "medium", "high", "extreme"]) {
      const stats = m.byErrorLevel[level];
      if (!stats || stats.tp + stats.fn === 0) continue;
      const rate = ((stats.tp / (stats.tp + stats.fn)) * 100).toFixed(1);
      report += `  ${level.toUpperCase().padEnd(10)} ${stats.tp}/${stats.tp + stats.fn} (${rate}%)`;
      if (stats.fn > 0) report += ` - ${stats.fn} missed`;
      report += "\n";
    }

    // Add failure samples if any
    if (this.results.failures.length > 0) {
      report += `
MISSED PHI SAMPLES (${this.results.failures.length} total, showing first 20)
${divider}
`;
      for (const failure of this.results.failures.slice(0, 20)) {
        report += `  Doc ${failure.docId} (${failure.templateName}/${failure.errorLevel}):
    ${failure.phiType}: "${failure.value}"
    Source: ${failure.source}
`;
      }
    }

    // Add over-redaction samples if any
    if (this.results.overRedactions.length > 0) {
      report += `
OVER-REDACTIONS (${this.results.overRedactions.length} total, showing first 10)
${divider}
`;
      for (const over of this.results.overRedactions.slice(0, 10)) {
        report += `  Doc ${over.docId}: ${over.type} = "${over.value}"\n`;
      }
    }

    // Add critical findings
    if (this.results.investigation?.criticalFindings?.length > 0) {
      report += `
${fmt.divider(fmt.BOX.H)}
${fmt.padToWidth("CRITICAL FINDINGS", fmt.BOX_WIDTH, "center")}
${fmt.divider(fmt.BOX.H)}
`;
      for (const finding of this.results.investigation.criticalFindings) {
        report += `
  [${finding.severity}] ${finding.finding}
  Impact: ${finding.impact}
`;
        if (finding.samples) {
          report += `  Samples: ${finding.samples.join(", ")}\n`;
        }
      }
    }

    // Add recommendations
    if (this.results.investigation?.recommendations?.length > 0) {
      report += `
${fmt.divider(fmt.BOX.H)}
${fmt.padToWidth("RECOMMENDATIONS", fmt.BOX_WIDTH, "center")}
${fmt.divider(fmt.BOX.H)}
`;
      for (const rec of this.results.investigation.recommendations.slice(
        0,
        10,
      )) {
        report += `
  [${rec.priority}] ${rec.category}
  Issue: ${rec.issue}
  Suggestions:
`;
        for (const sug of rec.suggestions.slice(0, 3)) {
          report += `    • ${sug}\n`;
        }
      }
    }

    report += `
${fmt.divider(fmt.BOX.H)}
${fmt.padToWidth("END OF REPORT", fmt.BOX_WIDTH, "center")}
${fmt.divider(fmt.BOX.H)}
`;

    return report;
  }

  /**
   * Save results to file
   * @param {Object} reportOptions - Options to pass to generateReport (e.g., smartGrade)
   */
  saveResults(reportOptions = {}) {
    // Ensure output directory exists
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }

    const timestamp = Date.now();

    // Save JSON results
    const jsonPath = path.join(
      this.options.outputDir,
      `assessment-${timestamp}.json`,
    );
    const jsonData = {
      meta: {
        timestamp: new Date().toISOString(),
        testSuite: "assessment",
        version: "3.0.0",
      },
      engine: this.results.engineInfo,
      metrics: this.results.metrics,
      timing: this.results.timing,
      failures: this.results.failures,
      overRedactions: this.results.overRedactions,
      investigation: this.results.investigation,
      // Include smart grade info if provided
      smartGrade: reportOptions.smartGrade
        ? {
            profile: reportOptions.profile,
            grade: reportOptions.smartGrade.grade,
            score: reportOptions.smartGrade.finalScore,
          }
        : null,
    };
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));

    // Save text report (with smart grade if provided)
    const reportPath = path.join(
      this.options.outputDir,
      `assessment-${timestamp}.txt`,
    );
    fs.writeFileSync(reportPath, this.generateReport(reportOptions));

    console.error(`\nResults saved:`);
    console.error(`  JSON: ${jsonPath}`);
    console.error(`  Report: ${reportPath}`);

    return { jsonPath, reportPath };
  }
}

module.exports = {
  RigorousAssessment,
  GRADING_SCHEMA,
};
