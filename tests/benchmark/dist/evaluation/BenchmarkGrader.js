"use strict";
/**
 * ============================================================================
 * BENCHMARK GRADER
 * ============================================================================
 *
 * Extends the existing SmartGrader with new evaluation metrics:
 * - NervaluateAligner (SemEval'13 5-mode span alignment)
 * - MetricsCalculator (comprehensive performance metrics)
 * - HIPAA compliance assessment
 *
 * This is an adapter that integrates with existing SmartGrader while
 * providing benchmark-specific grading capabilities.
 *
 * @module benchmark/evaluation/BenchmarkGrader
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BenchmarkGrader = void 0;
exports.createBenchmarkGrader = createBenchmarkGrader;
const NervaluateAligner_1 = require("./NervaluateAligner");
const MetricsCalculator_1 = require("./MetricsCalculator");
/**
 * BenchmarkGrader - Comprehensive evaluation with SmartGrader integration
 */
class BenchmarkGrader {
    aligner;
    calculator;
    smartGrader = null;
    constructor(options = {}) {
        this.aligner = new NervaluateAligner_1.NervaluateAligner({
            overlapThreshold: options.overlapThreshold,
            typeMapping: options.typeMapping,
        });
        this.calculator = new MetricsCalculator_1.MetricsCalculator({
            hipaaThreshold: options.hipaaThreshold,
        });
        // Try to load SmartGrader
        this.loadSmartGrader(options.smartGraderProfile);
    }
    /**
     * Attempt to load existing SmartGrader
     */
    loadSmartGrader(profile) {
        try {
            const smartGradingPath = require.resolve('../../master-suite/evolution/smart-grading.js');
            const { SmartGrader } = require(smartGradingPath);
            this.smartGrader = new SmartGrader({ profile: profile || 'DEVELOPMENT' });
        }
        catch {
            // SmartGrader not available, continue without it
            this.smartGrader = null;
        }
    }
    /**
     * Grade a single document
     */
    gradeDocument(predictions, groundTruth) {
        // Run nervaluate alignment
        const nervaluate = this.aligner.align(predictions, groundTruth);
        const nervaluateByType = this.aligner.alignByType(predictions, groundTruth);
        // Calculate metrics
        const metrics = this.calculator.calculateAllModes(nervaluate);
        const metricsByType = this.calculator.calculatePerType(nervaluateByType);
        return {
            nervaluate,
            nervaluateByType,
            metrics,
            metricsByType,
        };
    }
    /**
     * Grade multiple detection results against ground truth
     */
    grade(detectionResults, groundTruthMap, experimentId, backendId) {
        // Collect all predictions and ground truth
        const allPredictions = [];
        const allGroundTruth = [];
        for (const result of detectionResults) {
            allPredictions.push(...result.spans);
            const gt = groundTruthMap.get(result.documentId);
            if (gt) {
                allGroundTruth.push(...gt);
            }
        }
        // Run evaluation
        const nervaluate = this.aligner.align(allPredictions, allGroundTruth);
        const nervaluateByType = this.aligner.alignByType(allPredictions, allGroundTruth);
        const metrics = this.calculator.calculateAllModes(nervaluate);
        const metricsByType = this.calculator.calculatePerType(nervaluateByType);
        const hipaaAssessment = this.calculator.assessHIPAACompliance(metrics);
        // Get SmartGrader grade if available
        let smartGraderGrade;
        if (this.smartGrader) {
            try {
                // Convert metrics to format SmartGrader expects
                const smartMetrics = {
                    sensitivity: metrics.strict.performance.sensitivity * 100,
                    specificity: metrics.strict.performance.specificity * 100,
                    precision: metrics.strict.performance.precision * 100,
                    f1Score: metrics.strict.performance.f1Score,
                };
                // Convert alignments to failures
                const failures = nervaluate.alignments
                    .filter(a => a.matchType === 'missing')
                    .map(a => ({
                    phiType: a.groundTruth?.type || 'UNKNOWN',
                    errorLevel: 'none',
                }));
                const gradeResult = this.smartGrader.grade(smartMetrics, failures);
                smartGraderGrade = {
                    profile: gradeResult.profile,
                    grade: gradeResult.scores.grade,
                    finalScore: gradeResult.scores.finalScore,
                    gradeDescription: gradeResult.scores.gradeDescription,
                };
            }
            catch {
                // SmartGrader failed, continue without it
            }
        }
        // Generate summary
        const summary = {
            sensitivity: metrics.strict.performance.sensitivity,
            precision: metrics.strict.performance.precision,
            f1Score: metrics.strict.performance.f1Score,
            f2Score: metrics.strict.performance.f2Score,
            mcc: metrics.strict.performance.mcc,
            hipaaCompliant: hipaaAssessment.meetsHIPAAStandard,
            riskLevel: hipaaAssessment.riskLevel,
            totalDocuments: detectionResults.length,
            totalSpansDetected: allPredictions.length,
            totalGroundTruth: allGroundTruth.length,
            totalMissed: nervaluate.strict.fn,
            totalSpurious: nervaluate.strict.fp,
        };
        return {
            experimentId,
            backendId,
            timestamp: new Date(),
            nervaluate,
            nervaluateByType,
            metrics,
            metricsByType,
            hipaaAssessment,
            smartGraderGrade,
            summary,
        };
    }
    /**
     * Compare two benchmark results
     */
    compare(resultA, resultB) {
        const comparison = {
            backendA: resultA.backendId,
            backendB: resultB.backendId,
            sensitivityDelta: resultB.summary.sensitivity - resultA.summary.sensitivity,
            precisionDelta: resultB.summary.precision - resultA.summary.precision,
            f1Delta: resultB.summary.f1Score - resultA.summary.f1Score,
            f2Delta: resultB.summary.f2Score - resultA.summary.f2Score,
            mccDelta: resultB.summary.mcc - resultA.summary.mcc,
            winner: 'TIE',
            winnerReason: '',
        };
        // Determine winner based on sensitivity (primary metric for HIPAA)
        if (comparison.sensitivityDelta > 0.01) {
            comparison.winner = resultB.backendId;
            comparison.winnerReason = `Higher sensitivity (${(comparison.sensitivityDelta * 100).toFixed(2)}%)`;
        }
        else if (comparison.sensitivityDelta < -0.01) {
            comparison.winner = resultA.backendId;
            comparison.winnerReason = `Higher sensitivity (${(-comparison.sensitivityDelta * 100).toFixed(2)}%)`;
        }
        else if (comparison.f2Delta > 0.01) {
            comparison.winner = resultB.backendId;
            comparison.winnerReason = `Higher F2 score (${comparison.f2Delta.toFixed(3)})`;
        }
        else if (comparison.f2Delta < -0.01) {
            comparison.winner = resultA.backendId;
            comparison.winnerReason = `Higher F2 score (${(-comparison.f2Delta).toFixed(3)})`;
        }
        return comparison;
    }
    /**
     * Generate a detailed report
     */
    static generateReport(result) {
        const lines = [];
        lines.push('╔══════════════════════════════════════════════════════════════╗');
        lines.push('║               BENCHMARK EVALUATION REPORT                     ║');
        lines.push('╠══════════════════════════════════════════════════════════════╣');
        lines.push(`║  Experiment: ${result.experimentId.padEnd(46)} ║`);
        lines.push(`║  Backend:    ${result.backendId.padEnd(46)} ║`);
        lines.push(`║  Time:       ${result.timestamp.toISOString().padEnd(46)} ║`);
        lines.push('╚══════════════════════════════════════════════════════════════╝');
        lines.push('');
        // Summary section
        lines.push('SUMMARY');
        lines.push('═'.repeat(60));
        lines.push(`  Documents:        ${result.summary.totalDocuments}`);
        lines.push(`  Ground Truth:     ${result.summary.totalGroundTruth} spans`);
        lines.push(`  Detected:         ${result.summary.totalSpansDetected} spans`);
        lines.push(`  Missed:           ${result.summary.totalMissed} spans`);
        lines.push(`  Spurious:         ${result.summary.totalSpurious} spans`);
        lines.push('');
        // Key metrics
        lines.push('KEY METRICS (Strict Mode)');
        lines.push('─'.repeat(60));
        const s = result.summary;
        lines.push(`  Sensitivity:      ${(s.sensitivity * 100).toFixed(2)}%`);
        lines.push(`  Precision:        ${(s.precision * 100).toFixed(2)}%`);
        lines.push(`  F1 Score:         ${s.f1Score.toFixed(4)}`);
        lines.push(`  F2 Score:         ${s.f2Score.toFixed(4)}`);
        lines.push(`  MCC:              ${s.mcc.toFixed(4)}`);
        lines.push('');
        // Nervaluate modes
        lines.push(NervaluateAligner_1.NervaluateAligner.summarize(result.nervaluate));
        lines.push('');
        // Metrics across modes
        lines.push(MetricsCalculator_1.MetricsCalculator.summarize(result.metrics));
        lines.push('');
        // HIPAA assessment
        lines.push(MetricsCalculator_1.MetricsCalculator.summarizeHIPAA(result.hipaaAssessment));
        lines.push('');
        // SmartGrader grade if available
        if (result.smartGraderGrade) {
            const g = result.smartGraderGrade;
            lines.push('SMART GRADER');
            lines.push('─'.repeat(60));
            lines.push(`  Profile:          ${g.profile}`);
            lines.push(`  Grade:            ${g.grade} (${g.finalScore}/100)`);
            lines.push(`  Description:      ${g.gradeDescription}`);
            lines.push('');
        }
        // Per-type breakdown
        if (Object.keys(result.metricsByType).length > 0) {
            lines.push('PER-TYPE METRICS (Strict Mode)');
            lines.push(MetricsCalculator_1.MetricsCalculator.summarizePerType(result.metricsByType, 'strict'));
        }
        return lines.join('\n');
    }
}
exports.BenchmarkGrader = BenchmarkGrader;
/**
 * Create a benchmark grader
 */
function createBenchmarkGrader(options) {
    return new BenchmarkGrader(options);
}
//# sourceMappingURL=BenchmarkGrader.js.map