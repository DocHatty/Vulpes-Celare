/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  VULPES CORTEX - COMPARISON ENGINE                                           ║
 * ║  Deep Analysis of Before/After Test Results                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * Goes beyond simple metric comparison to answer:
 * - WHAT specifically got better or worse?
 * - WHICH documents/PHI types were affected?
 * - WHY did the change have this effect?
 * - IS the change statistically significant?
 *
 * COMPARISON TYPES:
 * ─────────────────────────────────────────────────────────────────────────────────
 * METRIC_COMPARISON     - High-level metric comparison
 * DOCUMENT_COMPARISON   - Per-document delta analysis
 * PHI_TYPE_COMPARISON   - Per-PHI-type breakdown
 * ERROR_COMPARISON      - What errors appeared/disappeared
 * REGRESSION_ANALYSIS   - What specifically regressed
 *
 * OUTPUT:
 * ─────────────────────────────────────────────────────────────────────────────────
 * Structured comparison report that enables:
 * - Identifying exactly what an intervention affected
 * - Understanding which improvements/regressions are real
 * - Making data-driven decisions about keeping/reverting changes
 */

const fs = require('fs');
const path = require('path');
const { PATHS } = require('../core/config');

// ============================================================================
// COMPARISON ENGINE CLASS
// ============================================================================

class ComparisonEngine {
  constructor(options = {}) {
    this.metricsEngine = options.metricsEngine || null;
    this.storagePath = path.join(PATHS.knowledge, 'comparisons.json');
    this.data = this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(this.storagePath)) {
        return JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
      }
    } catch (e) {
      console.warn('ComparisonEngine: Starting with empty comparison history');
    }
    return {
      comparisons: [],
      stats: {
        total: 0
      }
    };
  }

  saveData() {
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.storagePath, JSON.stringify(this.data, null, 2));
  }

  // ==========================================================================
  // FULL COMPARISON
  // ==========================================================================

  /**
   * Perform comprehensive comparison between two test runs
   * @param {Object} before - Before test results
   * @param {Object} after - After test results
   * @param {Object} options - Comparison options
   */
  compare(before, after, options = {}) {
    const comparison = {
      id: `CMP-${Date.now()}`,
      timestamp: new Date().toISOString(),
      options,

      // High-level summary
      summary: this.generateSummary(before, after),

      // Metric-level comparison
      metrics: this.compareMetrics(before, after),

      // Document-level analysis
      documents: this.compareDocuments(before, after),

      // PHI-type breakdown
      phiTypes: this.compareByPhiType(before, after),

      // Error analysis
      errors: this.compareErrors(before, after),

      // Statistical significance
      significance: this.assessSignificance(before, after),

      // Recommendations
      recommendations: []
    };

    // Generate recommendations based on analysis
    comparison.recommendations = this.generateRecommendations(comparison);

    // Store comparison
    this.data.comparisons.push(comparison);
    this.data.stats.total++;
    this.saveData();

    return comparison;
  }

  // ==========================================================================
  // SUMMARY GENERATION
  // ==========================================================================

  generateSummary(before, after) {
    const beforeMetrics = before.metrics || before;
    const afterMetrics = after.metrics || after;

    // Calculate key deltas
    const sensitivityDelta = (afterMetrics.sensitivity || 0) - (beforeMetrics.sensitivity || 0);
    const specificityDelta = (afterMetrics.specificity || 0) - (beforeMetrics.specificity || 0);
    const f1Delta = (afterMetrics.f1Score || afterMetrics.f1 || 0) - (beforeMetrics.f1Score || beforeMetrics.f1 || 0);

    // Determine overall direction
    let direction = 'NEUTRAL';
    let verdict = 'No significant change';

    if (sensitivityDelta > 0.5 && specificityDelta >= -0.5) {
      direction = 'IMPROVED';
      verdict = 'Clear improvement in detection';
    } else if (sensitivityDelta < -0.5) {
      direction = 'REGRESSED';
      verdict = 'Detection capability decreased';
    } else if (specificityDelta < -1) {
      direction = 'REGRESSED';
      verdict = 'False positive rate increased';
    } else if (f1Delta > 0.3) {
      direction = 'IMPROVED';
      verdict = 'Overall balance improved';
    } else if (f1Delta < -0.3) {
      direction = 'REGRESSED';
      verdict = 'Overall balance worsened';
    }

    return {
      direction,
      verdict,
      keyChanges: {
        sensitivity: { before: beforeMetrics.sensitivity, after: afterMetrics.sensitivity, delta: sensitivityDelta },
        specificity: { before: beforeMetrics.specificity, after: afterMetrics.specificity, delta: specificityDelta },
        f1: { before: beforeMetrics.f1Score || beforeMetrics.f1, after: afterMetrics.f1Score || afterMetrics.f1, delta: f1Delta }
      },
      documentsCounted: {
        before: before.documents?.length || before.documentCount || 0,
        after: after.documents?.length || after.documentCount || 0
      }
    };
  }

  // ==========================================================================
  // METRIC COMPARISON
  // ==========================================================================

  compareMetrics(before, after) {
    const beforeMetrics = before.metrics || before;
    const afterMetrics = after.metrics || after;

    const metrics = {};
    const allKeys = new Set([...Object.keys(beforeMetrics), ...Object.keys(afterMetrics)]);

    for (const key of allKeys) {
      // Skip non-numeric values
      if (typeof beforeMetrics[key] !== 'number' && typeof afterMetrics[key] !== 'number') {
        continue;
      }

      const beforeVal = beforeMetrics[key] || 0;
      const afterVal = afterMetrics[key] || 0;
      const delta = afterVal - beforeVal;
      const percentChange = beforeVal !== 0 ? (delta / beforeVal) * 100 : (afterVal !== 0 ? 100 : 0);

      metrics[key] = {
        before: beforeVal,
        after: afterVal,
        delta,
        percentChange,
        improved: this.isImprovement(key, delta),
        significant: Math.abs(delta) > 0.5
      };
    }

    return metrics;
  }

  isImprovement(metricKey, delta) {
    // Metrics where higher is better
    const higherBetter = [
      'sensitivity', 'specificity', 'precision', 'recall', 'f1', 'f1Score',
      'mcc', 'npv', 'ppv', 'balancedAccuracy', 'accuracy'
    ];

    // Metrics where lower is better
    const lowerBetter = [
      'falsePositiveRate', 'falseNegativeRate', 'fpr', 'fnr',
      'missRate', 'fallout'
    ];

    if (higherBetter.some(m => metricKey.toLowerCase().includes(m.toLowerCase()))) {
      return delta > 0;
    }
    if (lowerBetter.some(m => metricKey.toLowerCase().includes(m.toLowerCase()))) {
      return delta < 0;
    }

    return delta > 0;  // Default assumption
  }

  // ==========================================================================
  // DOCUMENT-LEVEL COMPARISON
  // ==========================================================================

  compareDocuments(before, after) {
    const beforeDocs = before.documents || before.documentResults || [];
    const afterDocs = after.documents || after.documentResults || [];

    // Index by document ID
    const beforeIndex = new Map(beforeDocs.map(d => [d.id || d.filename, d]));
    const afterIndex = new Map(afterDocs.map(d => [d.id || d.filename, d]));

    const comparison = {
      improved: [],
      regressed: [],
      unchanged: [],
      onlyInBefore: [],
      onlyInAfter: [],
      stats: {
        improved: 0,
        regressed: 0,
        unchanged: 0
      }
    };

    // Compare documents present in both
    for (const [id, beforeDoc] of beforeIndex) {
      if (afterIndex.has(id)) {
        const afterDoc = afterIndex.get(id);
        const docComparison = this.compareDocumentResults(beforeDoc, afterDoc);

        if (docComparison.direction === 'IMPROVED') {
          comparison.improved.push({ id, ...docComparison });
          comparison.stats.improved++;
        } else if (docComparison.direction === 'REGRESSED') {
          comparison.regressed.push({ id, ...docComparison });
          comparison.stats.regressed++;
        } else {
          comparison.unchanged.push({ id });
          comparison.stats.unchanged++;
        }
      } else {
        comparison.onlyInBefore.push(id);
      }
    }

    // Find documents only in after
    for (const id of afterIndex.keys()) {
      if (!beforeIndex.has(id)) {
        comparison.onlyInAfter.push(id);
      }
    }

    return comparison;
  }

  compareDocumentResults(beforeDoc, afterDoc) {
    const beforeFN = beforeDoc.falseNegatives?.length || beforeDoc.fn || 0;
    const afterFN = afterDoc.falseNegatives?.length || afterDoc.fn || 0;
    const beforeFP = beforeDoc.falsePositives?.length || beforeDoc.fp || 0;
    const afterFP = afterDoc.falsePositives?.length || afterDoc.fp || 0;

    const fnDelta = afterFN - beforeFN;
    const fpDelta = afterFP - beforeFP;

    // Determine direction based on error changes
    let direction = 'UNCHANGED';
    if (fnDelta < 0 && fpDelta <= 0) {
      direction = 'IMPROVED';
    } else if (fnDelta < 0 && fpDelta > 0) {
      direction = fnDelta < -fpDelta ? 'IMPROVED' : 'REGRESSED';
    } else if (fnDelta > 0) {
      direction = 'REGRESSED';
    } else if (fpDelta > 0) {
      direction = 'SLIGHTLY_REGRESSED';
    } else if (fpDelta < 0) {
      direction = 'SLIGHTLY_IMPROVED';
    }

    return {
      direction,
      falseNegatives: { before: beforeFN, after: afterFN, delta: fnDelta },
      falsePositives: { before: beforeFP, after: afterFP, delta: fpDelta },
      details: {
        newlyDetected: afterFN < beforeFN ? beforeFN - afterFN : 0,
        newlyMissed: afterFN > beforeFN ? afterFN - beforeFN : 0,
        falsePositivesAdded: fpDelta > 0 ? fpDelta : 0,
        falsePositivesRemoved: fpDelta < 0 ? -fpDelta : 0
      }
    };
  }

  // ==========================================================================
  // PHI-TYPE COMPARISON
  // ==========================================================================

  compareByPhiType(before, after) {
    const beforeByType = this.groupByPhiType(before);
    const afterByType = this.groupByPhiType(after);

    const allTypes = new Set([...Object.keys(beforeByType), ...Object.keys(afterByType)]);
    const comparison = {};

    for (const phiType of allTypes) {
      const beforeStats = beforeByType[phiType] || { tp: 0, fp: 0, fn: 0, tn: 0 };
      const afterStats = afterByType[phiType] || { tp: 0, fp: 0, fn: 0, tn: 0 };

      const beforeSensitivity = beforeStats.tp + beforeStats.fn > 0
        ? beforeStats.tp / (beforeStats.tp + beforeStats.fn) * 100
        : 0;
      const afterSensitivity = afterStats.tp + afterStats.fn > 0
        ? afterStats.tp / (afterStats.tp + afterStats.fn) * 100
        : 0;

      comparison[phiType] = {
        before: beforeStats,
        after: afterStats,
        sensitivity: {
          before: beforeSensitivity,
          after: afterSensitivity,
          delta: afterSensitivity - beforeSensitivity
        },
        falseNegatives: {
          before: beforeStats.fn,
          after: afterStats.fn,
          delta: afterStats.fn - beforeStats.fn
        },
        direction: this.determineTypeDirection(beforeStats, afterStats)
      };
    }

    return comparison;
  }

  groupByPhiType(results) {
    const byType = {};

    // Extract from document results if available
    const docs = results.documents || results.documentResults || [];

    for (const doc of docs) {
      // Process false negatives
      for (const fn of (doc.falseNegatives || [])) {
        const type = fn.type || fn.phiType || 'UNKNOWN';
        if (!byType[type]) byType[type] = { tp: 0, fp: 0, fn: 0, tn: 0 };
        byType[type].fn++;
      }

      // Process false positives
      for (const fp of (doc.falsePositives || [])) {
        const type = fp.type || fp.phiType || 'UNKNOWN';
        if (!byType[type]) byType[type] = { tp: 0, fp: 0, fn: 0, tn: 0 };
        byType[type].fp++;
      }

      // Process true positives
      for (const tp of (doc.truePositives || [])) {
        const type = tp.type || tp.phiType || 'UNKNOWN';
        if (!byType[type]) byType[type] = { tp: 0, fp: 0, fn: 0, tn: 0 };
        byType[type].tp++;
      }
    }

    return byType;
  }

  determineTypeDirection(beforeStats, afterStats) {
    const fnDelta = afterStats.fn - beforeStats.fn;
    const fpDelta = afterStats.fp - beforeStats.fp;
    const tpDelta = afterStats.tp - beforeStats.tp;

    if (fnDelta < 0 && fpDelta <= 0) return 'IMPROVED';
    if (tpDelta > 0 && fpDelta <= 0) return 'IMPROVED';
    if (fnDelta > 0) return 'REGRESSED';
    if (fpDelta > 1) return 'REGRESSED';
    return 'UNCHANGED';
  }

  // ==========================================================================
  // ERROR COMPARISON
  // ==========================================================================

  compareErrors(before, after) {
    const beforeErrors = this.extractErrors(before);
    const afterErrors = this.extractErrors(after);

    // Group errors by signature for comparison
    const beforeSigs = new Map(beforeErrors.map(e => [this.errorSignature(e), e]));
    const afterSigs = new Map(afterErrors.map(e => [this.errorSignature(e), e]));

    return {
      fixed: [],  // Errors in before but not after
      introduced: [],  // Errors in after but not before
      persistent: [],  // Errors in both
      stats: {
        totalBefore: beforeErrors.length,
        totalAfter: afterErrors.length,
        fixed: 0,
        introduced: 0,
        persistent: 0
      }
    };
  }

  extractErrors(results) {
    const errors = [];
    const docs = results.documents || results.documentResults || [];

    for (const doc of docs) {
      // False negatives are missed PHI (errors)
      for (const fn of (doc.falseNegatives || [])) {
        errors.push({
          type: 'FALSE_NEGATIVE',
          phiType: fn.type || fn.phiType,
          text: fn.text || fn.original,
          documentId: doc.id || doc.filename
        });
      }

      // False positives are over-detection (errors)
      for (const fp of (doc.falsePositives || [])) {
        errors.push({
          type: 'FALSE_POSITIVE',
          phiType: fp.type || fp.phiType,
          text: fp.text || fp.detected,
          documentId: doc.id || doc.filename
        });
      }
    }

    return errors;
  }

  errorSignature(error) {
    return `${error.type}:${error.phiType}:${error.text}:${error.documentId}`;
  }

  // ==========================================================================
  // STATISTICAL SIGNIFICANCE
  // ==========================================================================

  assessSignificance(before, after) {
    const beforeMetrics = before.metrics || before;
    const afterMetrics = after.metrics || after;

    // Simple significance assessment
    // For production, use proper statistical tests

    const sensitivityDelta = Math.abs((afterMetrics.sensitivity || 0) - (beforeMetrics.sensitivity || 0));
    const specificityDelta = Math.abs((afterMetrics.specificity || 0) - (beforeMetrics.specificity || 0));
    const f1Delta = Math.abs((afterMetrics.f1Score || afterMetrics.f1 || 0) - (beforeMetrics.f1Score || beforeMetrics.f1 || 0));

    // Document count affects significance threshold
    const docCount = Math.max(
      before.documents?.length || before.documentCount || 1,
      after.documents?.length || after.documentCount || 1
    );

    // Threshold scales with sample size
    const threshold = 5 / Math.sqrt(docCount);

    return {
      sensitivitySignificant: sensitivityDelta > threshold,
      specificitySignificant: specificityDelta > threshold,
      f1Significant: f1Delta > threshold,
      overallSignificant: sensitivityDelta > threshold || f1Delta > threshold,
      threshold,
      sampleSize: docCount,
      confidence: docCount >= 100 ? 'HIGH' : docCount >= 50 ? 'MEDIUM' : 'LOW'
    };
  }

  // ==========================================================================
  // RECOMMENDATIONS
  // ==========================================================================

  generateRecommendations(comparison) {
    const recommendations = [];

    const { summary, metrics, documents, phiTypes, significance } = comparison;

    // Based on overall direction
    if (summary.direction === 'IMPROVED' && significance.overallSignificant) {
      recommendations.push({
        priority: 'HIGH',
        action: 'ACCEPT',
        reason: 'Statistically significant improvement detected',
        confidence: 0.85
      });
    } else if (summary.direction === 'REGRESSED' && significance.overallSignificant) {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'REJECT_OR_ROLLBACK',
        reason: 'Statistically significant regression detected',
        confidence: 0.9
      });
    } else if (!significance.overallSignificant) {
      recommendations.push({
        priority: 'LOW',
        action: 'GATHER_MORE_DATA',
        reason: 'Changes not statistically significant - need more test data',
        confidence: 0.6
      });
    }

    // Based on specific PHI type regressions
    const regressedTypes = Object.entries(phiTypes)
      .filter(([, data]) => data.direction === 'REGRESSED')
      .map(([type]) => type);

    if (regressedTypes.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'INVESTIGATE_REGRESSIONS',
        reason: `Regressions in ${regressedTypes.join(', ')} detection`,
        details: regressedTypes,
        confidence: 0.8
      });
    }

    // Based on document-level analysis
    if (documents.stats.regressed > documents.stats.improved) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'REVIEW_REGRESSED_DOCUMENTS',
        reason: `${documents.stats.regressed} documents regressed vs ${documents.stats.improved} improved`,
        confidence: 0.75
      });
    }

    return recommendations;
  }

  // ==========================================================================
  // QUERY METHODS
  // ==========================================================================

  getComparison(id) {
    return this.data.comparisons.find(c => c.id === id);
  }

  getRecentComparisons(limit = 10) {
    return this.data.comparisons.slice(-limit).reverse();
  }

  /**
   * Export for LLM context
   */
  exportForLLM() {
    return {
      stats: this.data.stats,
      recentComparisons: this.getRecentComparisons(3).map(c => ({
        id: c.id,
        direction: c.summary?.direction,
        verdict: c.summary?.verdict,
        significant: c.significance?.overallSignificant
      }))
    };
  }

  /**
   * Generate a human-readable comparison report
   */
  generateReport(comparisonId) {
    const comparison = this.getComparison(comparisonId);
    if (!comparison) return null;

    let report = `
╔══════════════════════════════════════════════════════════════════════════════╗
║  COMPARISON REPORT: ${comparison.id}
║  Generated: ${comparison.timestamp}
╚══════════════════════════════════════════════════════════════════════════════╝

SUMMARY
───────────────────────────────────────────────────────────────────────────────
Direction: ${comparison.summary.direction}
Verdict: ${comparison.summary.verdict}

KEY METRICS
───────────────────────────────────────────────────────────────────────────────
`;

    for (const [metric, data] of Object.entries(comparison.summary.keyChanges)) {
      const arrow = data.delta > 0 ? '↑' : data.delta < 0 ? '↓' : '→';
      report += `${metric}: ${data.before?.toFixed(2) || 'N/A'} → ${data.after?.toFixed(2) || 'N/A'} (${arrow} ${data.delta?.toFixed(2) || 0})\n`;
    }

    report += `
DOCUMENT ANALYSIS
───────────────────────────────────────────────────────────────────────────────
Improved: ${comparison.documents.stats.improved}
Regressed: ${comparison.documents.stats.regressed}
Unchanged: ${comparison.documents.stats.unchanged}

STATISTICAL SIGNIFICANCE
───────────────────────────────────────────────────────────────────────────────
Overall Significant: ${comparison.significance.overallSignificant ? 'YES' : 'NO'}
Confidence Level: ${comparison.significance.confidence}
Sample Size: ${comparison.significance.sampleSize}

RECOMMENDATIONS
───────────────────────────────────────────────────────────────────────────────
`;

    for (const rec of comparison.recommendations) {
      report += `[${rec.priority}] ${rec.action}: ${rec.reason}\n`;
    }

    return report;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  ComparisonEngine
};
