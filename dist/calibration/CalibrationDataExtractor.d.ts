/**
 * CalibrationDataExtractor - Extracts calibration data from test results and Cortex storage
 *
 * This module reads test results and patterns from the Cortex knowledge base
 * to generate calibration data points for the ConfidenceCalibrator.
 *
 * Data sources:
 * 1. Cortex patterns.json - Contains false positive/negative patterns with confidence scores
 * 2. Test run results - Contains actual detection results with ground truth labels
 * 3. Metrics history - Contains aggregated metrics per filter type
 *
 * @module calibration
 */
import { FilterType } from "../models/Span";
import { CalibrationDataPoint } from "../core/ConfidenceCalibrator";
/**
 * Test result entry for calibration
 */
interface TestResultEntry {
    phiType: string;
    value: string;
    confidence: number;
    isCorrect: boolean;
    filterType?: FilterType;
}
/**
 * Aggregated calibration statistics per filter type
 */
export interface FilterCalibrationStats {
    filterType: FilterType | string;
    totalSamples: number;
    truePositives: number;
    falsePositives: number;
    trueNegatives: number;
    falseNegatives: number;
    meanConfidence: number;
    calibrationData: CalibrationDataPoint[];
}
/**
 * CalibrationDataExtractor - Main extraction class
 */
export declare class CalibrationDataExtractor {
    private cortexStoragePath;
    private patternsPath;
    constructor(cortexBasePath?: string);
    /**
     * Extract calibration data from all available sources
     */
    extractCalibrationData(): CalibrationDataPoint[];
    /**
     * Extract calibration data from Cortex patterns.json
     *
     * FALSE_POSITIVE patterns -> isActualPHI = false (detected but shouldn't have been)
     * FALSE_NEGATIVE patterns -> isActualPHI = true (missed but should have been caught)
     */
    private extractFromPatterns;
    /**
     * Generate synthetic true positive data points
     *
     * For calibration to work, we need both positive and negative examples.
     * Since patterns.json mainly captures failures, we synthetically generate
     * true positive data points based on the assumption that:
     * - High-confidence detections that weren't flagged as FP are likely TP
     * - For every FN at confidence X, there are likely N TPs at confidence X+delta
     *
     * Note: We limit synthetic data to prevent excessive calibration time.
     */
    private generateSyntheticTruePositives;
    /**
     * Map PHI type string from Cortex to FilterType enum
     */
    private mapPhiTypeToFilterType;
    /**
     * Estimate confidence for missed detections based on failure category
     */
    private estimateConfidenceFromCategory;
    /**
     * Extract data from live test results
     *
     * @param testResults - Array of test result entries with ground truth
     */
    extractFromTestResults(testResults: TestResultEntry[]): CalibrationDataPoint[];
    /**
     * Get calibration statistics per filter type
     */
    getCalibrationStatsByType(): Map<string, FilterCalibrationStats>;
    /**
     * Check if sufficient data exists for calibration
     */
    hasSufficientData(minSamples?: number): boolean;
    /**
     * Get the path to patterns file (for diagnostics)
     */
    getPatternsPath(): string;
}
export declare const calibrationDataExtractor: CalibrationDataExtractor;
export {};
//# sourceMappingURL=CalibrationDataExtractor.d.ts.map