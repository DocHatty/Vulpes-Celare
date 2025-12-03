/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  VULPES CELARE - RIGOROUS ASSESSMENT ENGINE                                  ║
 * ║  Unbiased, Multi-Pass Evaluation with Deep Investigation                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
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

// ============================================================================
// STRICT GRADING SCHEMA
// ============================================================================
const GRADING_SCHEMA = {
  // Clinical-grade thresholds
  thresholds: {
    // SENSITIVITY is the MOST CRITICAL metric for PHI protection
    // In clinical settings, missing PHI = HIPAA violation = potential lawsuit
    sensitivity: {
      excellent: 99.5,    // A+ grade - production ready
      good: 98.0,         // A grade - acceptable for most uses
      acceptable: 95.0,   // B grade - needs improvement
      poor: 90.0,         // C grade - significant issues
      failing: 85.0       // D/F grade - not safe for use
    },
    
    // SPECIFICITY matters for usability (over-redaction frustrates users)
    // But it's less critical than sensitivity for safety
    specificity: {
      excellent: 99.0,
      good: 95.0,
      acceptable: 90.0,
      poor: 85.0,
      failing: 80.0
    },
    
    // PRECISION measures redaction accuracy
    precision: {
      excellent: 98.0,
      good: 95.0,
      acceptable: 90.0,
      poor: 85.0,
      failing: 80.0
    }
  },
  
  // Overall score calculation
  // Heavily weighted toward sensitivity because missing PHI is DANGEROUS
  weights: {
    sensitivity: 0.70,    // 70% weight - catching PHI is paramount
    specificity: 0.20,    // 20% weight - preserving non-PHI matters
    precision: 0.10       // 10% weight - redaction accuracy
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
    perfectDates: +2
  },
  
  // Grade boundaries (after all calculations and penalties)
  grades: {
    "A+": 97,
    "A": 93,
    "A-": 90,
    "B+": 87,
    "B": 83,
    "B-": 80,
    "C+": 77,
    "C": 73,
    "C-": 70,
    "D": 60,
    "F": 0
  },
  
  // Grade descriptions
  descriptions: {
    "A+": "EXCELLENT - Production ready, clinical-grade PHI protection",
    "A": "VERY GOOD - Suitable for most production uses with monitoring",
    "A-": "GOOD - Acceptable with regular auditing",
    "B+": "ABOVE AVERAGE - Requires improvement before production",
    "B": "AVERAGE - Significant improvements needed",
    "B-": "BELOW AVERAGE - Major issues requiring attention",
    "C+": "MARGINAL - Not recommended for production",
    "C": "POOR - Substantial PHI leakage risk",
    "C-": "VERY POOR - High PHI leakage risk",
    "D": "FAILING - Unsafe for any PHI handling",
    "F": "CRITICAL FAILURE - Do not use"
  }
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
        medium: 0.40,
        high: 0.25,
        extreme: 0.05
      },
      verbose: options.verbose || false,
      outputDir: options.outputDir || path.join(__dirname, "..", "..", "results"),
      ...options
    };
    
    // Results storage
    this.results = {
      documents: [],
      metrics: {},
      failures: [],
      overRedactions: [],
      timing: {}
    };
  }
  
  /**
   * PHASE 1: Run the complete test suite
   * Let the ENTIRE suite run before any analysis
   */
  async runFullSuite() {
    const startTime = Date.now();
    
    // Import required modules
    const { generateCompletePHIDataset } = require("../documents/phi-generator");
    const { TEMPLATES } = require("../documents/templates");
    
    // Load the engine (test as integrated system)
    let VulpesCelare;
    try {
      const module = require("../../../dist/VulpesCelare.js");
      VulpesCelare = module.VulpesCelare;
    } catch (err) {
      throw new Error(`Failed to load engine: ${err.message}. Run 'npm run build' first.`);
    }
    
    const engine = new VulpesCelare();
    this.results.engineInfo = {
      name: VulpesCelare.NAME,
      version: VulpesCelare.VERSION,
      variant: VulpesCelare.VARIANT,
      activeFilters: engine.getActiveFilters().length
    };
    
    // Generate and process documents
    console.log(`\n╔═══════════════════════════════════════════════════════════════════════════╗`);
    console.log(`║  VULPES CELARE - RIGOROUS ASSESSMENT (${this.options.documentCount} Documents)             ║`);
    console.log(`╚═══════════════════════════════════════════════════════════════════════════╝\n`);
    console.log(`Engine: ${VulpesCelare.NAME} v${VulpesCelare.VERSION}`);
    console.log(`Processing ${this.options.documentCount} documents...\n`);
    
    const errorLevels = this.selectErrorLevels(this.options.documentCount);
    
    for (let i = 0; i < this.options.documentCount; i++) {
      // Progress update every 25 documents
      if ((i + 1) % 25 === 0 || i === 0) {
        process.stdout.write(`  Progress: ${i + 1}/${this.options.documentCount} documents\r`);
      }
      
      const errorLevel = errorLevels[i];
      const template = TEMPLATES[i % TEMPLATES.length];
      
      // Generate PHI data
      const phiData = generateCompletePHIDataset(errorLevel);
      
      // Generate document
      const documentContent = template.generator(phiData);
      
      // Process through engine (test as real use case)
      const processStart = Date.now();
      const result = await engine.process(documentContent);
      const processTime = Date.now() - processStart;
      
      // Store result with ground truth
      this.results.documents.push({
        id: i + 1,
        templateName: template.name,
        errorLevel,
        processTimeMs: processTime,
        originalContent: documentContent,
        redactedContent: result.text,
        expectedPHI: phiData._groundTruthPHI,
        expectedNonPHI: phiData._groundTruthNonPHI,
        engineReport: result.report
      });
    }
    
    this.results.timing.processingMs = Date.now() - startTime;
    console.log(`\n  Processing complete in ${(this.results.timing.processingMs / 1000).toFixed(2)}s\n`);
    
    return this;
  }
  
  /**
   * PHASE 2: Comprehensive sensitivity/specificity grading
   * Multi-pass analysis with strict evaluation
   */
  calculateMetrics() {
    console.log(`╔═══════════════════════════════════════════════════════════════════════════╗`);
    console.log(`║  PHASE 2: CALCULATING METRICS                                             ║`);
    console.log(`╚═══════════════════════════════════════════════════════════════════════════╝\n`);
    
    // Initialize counters
    let totalTruePositives = 0;
    let totalFalseNegatives = 0;
    let totalTrueNegatives = 0;
    let totalFalsePositives = 0;
    
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
            context: this.extractContext(doc.originalContent, phi.value)
          });
        }
      }
      
      // Check non-PHI preservation
      for (const nonPhi of doc.expectedNonPHI) {
        const wasPreserved = doc.redactedContent.includes(nonPhi.value);
        
        if (wasPreserved) {
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
            source: nonPhi.source
          });
        }
      }
    }
    
    // Calculate primary metrics
    const totalPHI = totalTruePositives + totalFalseNegatives;
    const totalNonPHI = totalTrueNegatives + totalFalsePositives;
    
    const sensitivity = totalPHI > 0 ? (totalTruePositives / totalPHI) * 100 : 0;
    const specificity = totalNonPHI > 0 ? (totalTrueNegatives / totalNonPHI) * 100 : 100;
    const precision = (totalTruePositives + totalFalsePositives) > 0
      ? (totalTruePositives / (totalTruePositives + totalFalsePositives)) * 100
      : 0;
    const recall = sensitivity;
    const f1Score = (precision + recall) > 0
      ? 2 * (precision * recall) / (precision + recall)
      : 0;
    
    // Calculate overall score with weights
    let rawScore = 
      sensitivity * GRADING_SCHEMA.weights.sensitivity +
      specificity * GRADING_SCHEMA.weights.specificity +
      precision * GRADING_SCHEMA.weights.precision;
    
    // Apply penalties for critical failures
    let penalties = 0;
    const missedSSNs = this.results.failures.filter(f => f.phiType === "SSN").length;
    const missedNames = this.results.failures.filter(f => f.phiType === "NAME").length;
    const missedDOBs = this.results.failures.filter(f => f.phiType === "DATE" && f.source === "dob").length;
    
    penalties += missedSSNs * GRADING_SCHEMA.penalties.missedSSN;
    penalties += missedNames * GRADING_SCHEMA.penalties.missedPatientName;
    penalties += missedDOBs * GRADING_SCHEMA.penalties.missedDOB;
    
    // Apply bonuses for perfect categories
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
      finalScore = Math.min(finalScore, 30);  // Cap at F
    } else if (sensitivity < GRADING_SCHEMA.thresholds.sensitivity.poor) {
      finalScore = Math.min(finalScore, 50);  // Cap at D
    } else if (sensitivity < GRADING_SCHEMA.thresholds.sensitivity.acceptable) {
      finalScore = Math.min(finalScore, 70);  // Cap at C
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
    this.results.metrics = {
      // Confusion matrix
      confusionMatrix: {
        truePositives: totalTruePositives,
        falseNegatives: totalFalseNegatives,
        trueNegatives: totalTrueNegatives,
        falsePositives: totalFalsePositives,
        totalPHI,
        totalNonPHI
      },
      
      // Primary metrics
      sensitivity: parseFloat(sensitivity.toFixed(4)),
      specificity: parseFloat(specificity.toFixed(4)),
      precision: parseFloat(precision.toFixed(4)),
      recall: parseFloat(recall.toFixed(4)),
      f1Score: parseFloat(f1Score.toFixed(4)),
      
      // Scoring
      rawScore: parseFloat(rawScore.toFixed(2)),
      penalties,
      finalScore,
      grade,
      gradeDescription: GRADING_SCHEMA.descriptions[grade],
      
      // Breakdowns
      byPHIType,
      byErrorLevel,
      byTemplate
    };
    
    return this;
  }
  
  /**
   * PHASE 3: Deep investigation of failures
   * Analyze patterns, root causes, and remediation strategies
   */
  investigateFailures() {
    console.log(`╔═══════════════════════════════════════════════════════════════════════════╗`);
    console.log(`║  PHASE 3: DEEP INVESTIGATION OF FAILURES                                  ║`);
    console.log(`╚═══════════════════════════════════════════════════════════════════════════╝\n`);
    
    if (this.results.failures.length === 0) {
      console.log("  ✓ No failures to investigate! Perfect PHI detection.\n");
      this.results.investigation = {
        summary: "No failures detected",
        patterns: [],
        recommendations: []
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
      criticalFindings: this.identifyCriticalFindings()
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
      characteristics: []
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
    const ocrPatterns = this.results.failures.filter(f => 
      /[0OIl1|5SB8Gg6]/.test(f.value)
    );
    if (ocrPatterns.length > 0) {
      patterns.characteristics.push({
        type: "OCR_CONFUSION",
        count: ocrPatterns.length,
        description: "PHI with OCR-confusable characters (0/O, 1/l/I, etc.)",
        samples: ocrPatterns.slice(0, 5).map(f => f.value)
      });
    }
    
    // Check for case variation patterns
    const casePatterns = this.results.failures.filter(f =>
      f.value !== f.value.toLowerCase() && f.value !== f.value.toUpperCase()
    );
    if (casePatterns.length > 0) {
      patterns.characteristics.push({
        type: "CASE_VARIATION",
        count: casePatterns.length,
        description: "PHI with mixed case that may not be recognized",
        samples: casePatterns.slice(0, 5).map(f => f.value)
      });
    }
    
    // Check for format variations
    const formatPatterns = {
      phones: this.results.failures.filter(f => f.phiType === "PHONE"),
      dates: this.results.failures.filter(f => f.phiType === "DATE"),
      ssns: this.results.failures.filter(f => f.phiType === "SSN")
    };
    
    if (formatPatterns.phones.length > 0) {
      patterns.characteristics.push({
        type: "PHONE_FORMAT",
        count: formatPatterns.phones.length,
        description: "Phone numbers in unrecognized formats",
        samples: formatPatterns.phones.slice(0, 5).map(f => f.value)
      });
    }
    
    if (formatPatterns.dates.length > 0) {
      patterns.characteristics.push({
        type: "DATE_FORMAT",
        count: formatPatterns.dates.length,
        description: "Dates in unrecognized formats",
        samples: formatPatterns.dates.slice(0, 5).map(f => f.value)
      });
    }
    
    // High error level correlation
    const highErrorFailures = (patterns.byErrorLevel["high"] || []).length +
                              (patterns.byErrorLevel["extreme"] || []).length;
    const totalHighError = this.results.documents.filter(d => 
      d.errorLevel === "high" || d.errorLevel === "extreme"
    ).length;
    
    if (highErrorFailures > 0 && totalHighError > 0) {
      const failureRate = (highErrorFailures / this.results.failures.length * 100).toFixed(1);
      patterns.characteristics.push({
        type: "ERROR_CORRELATION",
        count: highErrorFailures,
        description: `${failureRate}% of failures occur in high/extreme error documents`,
        severity: failureRate > 50 ? "HIGH" : "MEDIUM"
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
        samples: failures.slice(0, 3).map(f => f.value),
        suggestions: []
      };
      
      // Type-specific recommendations
      switch (type) {
        case "NAME":
          rec.suggestions = [
            "Review name pattern regex for edge cases",
            "Add support for additional name formats (hyphenated, apostrophes)",
            "Consider fuzzy matching for OCR-corrupted names",
            "Check name tokenization logic"
          ];
          break;
        case "SSN":
          rec.suggestions = [
            "CRITICAL: SSN detection must be 100%",
            "Add OCR-tolerant patterns (O→0, l→1, etc.)",
            "Support all SSN formats (dashes, spaces, continuous)",
            "Consider partial SSN detection (last 4 digits)"
          ];
          break;
        case "DATE":
          rec.suggestions = [
            "Add more date format patterns",
            "Support international date formats",
            "Add OCR-tolerant date patterns",
            "Consider context-aware date detection"
          ];
          break;
        case "PHONE":
          rec.suggestions = [
            "Expand phone number format support",
            "Add international phone number patterns",
            "Support extensions and additional notations",
            "Add OCR-tolerant phone patterns"
          ];
          break;
        case "ADDRESS":
          rec.suggestions = [
            "Review address detection regex",
            "Add support for apartment/unit variations",
            "Consider multi-line address detection",
            "Add street type abbreviation handling"
          ];
          break;
        default:
          rec.suggestions = [
            `Review ${type} detection patterns`,
            `Add OCR-tolerant variations`,
            `Check for format variations in real documents`
          ];
      }
      
      recommendations.push(rec);
    }
    
    // Recommendations for OCR issues
    if (patterns.characteristics.some(c => c.type === "OCR_CONFUSION")) {
      recommendations.push({
        category: "OCR Tolerance",
        priority: "HIGH",
        issue: "OCR-corrupted values not being detected",
        suggestions: [
          "Add character substitution patterns to all filters",
          "Implement fuzzy matching with edit distance",
          "Create OCR normalization preprocessing step",
          "Test with more aggressive OCR error simulation"
        ]
      });
    }
    
    // Sort by priority
    const priorityOrder = { "CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3 };
    recommendations.sort((a, b) => 
      (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99)
    );
    
    return recommendations;
  }
  
  /**
   * Identify critical findings
   */
  identifyCriticalFindings() {
    const findings = [];
    
    // Any missed SSN is critical
    const missedSSNs = this.results.failures.filter(f => f.phiType === "SSN");
    if (missedSSNs.length > 0) {
      findings.push({
        severity: "CRITICAL",
        finding: `${missedSSNs.length} Social Security Numbers were NOT redacted`,
        impact: "HIPAA violation - SSN is a direct identifier",
        samples: missedSSNs.slice(0, 3).map(f => f.value)
      });
    }
    
    // Missed patient names
    const missedNames = this.results.failures.filter(f => f.phiType === "NAME");
    if (missedNames.length > 0) {
      findings.push({
        severity: "CRITICAL",
        finding: `${missedNames.length} patient names were NOT redacted`,
        impact: "HIPAA violation - Names are direct identifiers",
        samples: missedNames.slice(0, 3).map(f => f.value)
      });
    }
    
    // Missed dates of birth
    const missedDOBs = this.results.failures.filter(f => 
      f.phiType === "DATE" && f.source === "dob"
    );
    if (missedDOBs.length > 0) {
      findings.push({
        severity: "HIGH",
        finding: `${missedDOBs.length} dates of birth were NOT redacted`,
        impact: "HIPAA violation - DOB is a key identifier",
        samples: missedDOBs.slice(0, 3).map(f => f.value)
      });
    }
    
    // High failure rate in any category
    const metrics = this.results.metrics;
    if (metrics.sensitivity < 95) {
      findings.push({
        severity: "CRITICAL",
        finding: `Overall sensitivity is only ${metrics.sensitivity.toFixed(1)}%`,
        impact: `${metrics.confusionMatrix.falseNegatives} PHI items leaked`
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
      const rand = Math.random();
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
   */
  generateReport() {
    const m = this.results.metrics;
    const cm = m.confusionMatrix;
    
    let report = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                    VULPES CELARE - ASSESSMENT REPORT                          ║
╚══════════════════════════════════════════════════════════════════════════════╝

ENGINE INFORMATION
────────────────────────────────────────────────────────────────────────────────
  Name:            ${this.results.engineInfo.name}
  Version:         ${this.results.engineInfo.version}
  Variant:         ${this.results.engineInfo.variant}
  Active Filters:  ${this.results.engineInfo.activeFilters}

TEST CONFIGURATION
────────────────────────────────────────────────────────────────────────────────
  Documents:       ${this.results.documents.length}
  Processing Time: ${(this.results.timing.processingMs / 1000).toFixed(2)}s
  Avg per Doc:     ${(this.results.timing.processingMs / this.results.documents.length).toFixed(1)}ms

══════════════════════════════════════════════════════════════════════════════
                              FINAL GRADE
══════════════════════════════════════════════════════════════════════════════

                         ╔═══════════════╗
                         ║    ${m.grade.padStart(3)}        ║
                         ║   ${m.finalScore}/100     ║
                         ╚═══════════════╝

  ${m.gradeDescription}

══════════════════════════════════════════════════════════════════════════════

CONFUSION MATRIX
────────────────────────────────────────────────────────────────────────────────
                          │ Actual PHI │ Actual Non-PHI │
  ────────────────────────┼────────────┼────────────────┤
  Predicted PHI (Redacted)│    ${String(cm.truePositives).padStart(5)}   │      ${String(cm.falsePositives).padStart(5)}     │
  Predicted Non-PHI       │    ${String(cm.falseNegatives).padStart(5)}   │      ${String(cm.trueNegatives).padStart(5)}     │
  ────────────────────────┼────────────┼────────────────┤
  Total                   │    ${String(cm.totalPHI).padStart(5)}   │      ${String(cm.totalNonPHI).padStart(5)}     │

PRIMARY METRICS
────────────────────────────────────────────────────────────────────────────────
  SENSITIVITY (Recall):   ${m.sensitivity.toFixed(2)}%  ← PHI correctly redacted
  SPECIFICITY:            ${m.specificity.toFixed(2)}%  ← Non-PHI correctly preserved
  PRECISION (PPV):        ${m.precision.toFixed(2)}%  ← Redaction accuracy
  F1 SCORE:               ${m.f1Score.toFixed(2)}

SCORE BREAKDOWN
────────────────────────────────────────────────────────────────────────────────
  Raw Score:              ${m.rawScore.toFixed(2)}
  Penalties/Bonuses:      ${m.penalties >= 0 ? '+' : ''}${m.penalties}
  Final Score:            ${m.finalScore}

PERFORMANCE BY PHI TYPE
────────────────────────────────────────────────────────────────────────────────
`;

    const sortedTypes = Object.entries(m.byPHIType)
      .sort((a, b) => b[1].total - a[1].total);
    
    for (const [type, stats] of sortedTypes) {
      const rate = stats.total > 0 ? (stats.tp / stats.total * 100).toFixed(1) : "N/A";
      const status = stats.fn === 0 ? "✓" : "✗";
      report += `  ${status} ${type.padEnd(18)} ${stats.tp}/${stats.total} (${rate}%)`;
      if (stats.fn > 0) report += ` - ${stats.fn} MISSED`;
      report += "\n";
    }

    report += `
PERFORMANCE BY ERROR LEVEL
────────────────────────────────────────────────────────────────────────────────
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
────────────────────────────────────────────────────────────────────────────────
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
────────────────────────────────────────────────────────────────────────────────
`;
      for (const over of this.results.overRedactions.slice(0, 10)) {
        report += `  Doc ${over.docId}: ${over.type} = "${over.value}"\n`;
      }
    }

    // Add critical findings
    if (this.results.investigation?.criticalFindings?.length > 0) {
      report += `
═══════════════════════════════════════════════════════════════════════════════
                           CRITICAL FINDINGS
═══════════════════════════════════════════════════════════════════════════════
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
═══════════════════════════════════════════════════════════════════════════════
                           RECOMMENDATIONS
═══════════════════════════════════════════════════════════════════════════════
`;
      for (const rec of this.results.investigation.recommendations.slice(0, 10)) {
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
══════════════════════════════════════════════════════════════════════════════
                              END OF REPORT
══════════════════════════════════════════════════════════════════════════════
`;

    return report;
  }
  
  /**
   * Save results to file
   */
  saveResults() {
    // Ensure output directory exists
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    
    // Save JSON results
    const jsonPath = path.join(this.options.outputDir, `rigorous-assessment-${timestamp}.json`);
    const jsonData = {
      meta: {
        timestamp: new Date().toISOString(),
        testSuite: "rigorous-assessment",
        version: "3.0.0"
      },
      engine: this.results.engineInfo,
      metrics: this.results.metrics,
      timing: this.results.timing,
      failures: this.results.failures,
      overRedactions: this.results.overRedactions,
      investigation: this.results.investigation
    };
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
    
    // Save text report
    const reportPath = path.join(this.options.outputDir, `rigorous-assessment-${timestamp}.txt`);
    fs.writeFileSync(reportPath, this.generateReport());
    
    console.log(`\nResults saved:`);
    console.log(`  JSON: ${jsonPath}`);
    console.log(`  Report: ${reportPath}`);
    
    return { jsonPath, reportPath };
  }
}

module.exports = {
  RigorousAssessment,
  GRADING_SCHEMA
};
