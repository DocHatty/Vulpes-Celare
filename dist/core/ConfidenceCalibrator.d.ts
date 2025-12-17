/**
 * ConfidenceCalibrator - Confidence Score Calibration System
 *
 * Transforms raw confidence scores into calibrated probabilities that
 * accurately reflect the true likelihood of PHI presence.
 *
 * ALGORITHMS:
 * 1. Platt Scaling - Logistic regression on scores (Platt, 1999)
 * 2. Isotonic Regression - Monotonic calibration (Zadrozny & Elkan, 2002)
 * 3. Beta Calibration - Flexible parametric approach (Kull et al., 2017)
 * 4. Temperature Scaling - Simple neural network approach (Guo et al., 2017)
 *
 * USAGE:
 * 1. Collect predictions with ground truth labels
 * 2. Fit calibrator using fit() method
 * 3. Apply calibration using calibrate() method
 *
 * @module redaction/core
 */
import { Span, FilterType } from "../models/Span";
/**
 * Calibration data point
 */
export interface CalibrationDataPoint {
    confidence: number;
    isActualPHI: boolean;
    filterType?: FilterType;
}
/**
 * Calibration bin for reliability diagram
 */
interface CalibrationBin {
    binStart: number;
    binEnd: number;
    meanConfidence: number;
    actualAccuracy: number;
    count: number;
}
/**
 * Calibration metrics
 */
export interface CalibrationMetrics {
    expectedCalibrationError: number;
    maxCalibrationError: number;
    brierScore: number;
    logLoss: number;
    reliability: CalibrationBin[];
}
/**
 * Calibration result
 */
export interface CalibrationResult {
    rawConfidence: number;
    calibratedConfidence: number;
    method: string;
}
/**
 * ConfidenceCalibrator - Main calibration class
 */
export declare class ConfidenceCalibrator {
    private plattParams;
    private isotonicModel;
    private betaParams;
    private temperature;
    private typeSpecificCalibrators;
    private calibrationData;
    private isFitted;
    private preferredMethod;
    private static readonly NUM_BINS;
    private static readonly MIN_BIN_COUNT;
    private static readonly PLATT_ITERATIONS;
    private static readonly PLATT_LEARNING_RATE;
    constructor(preferredMethod?: "platt" | "isotonic" | "beta" | "temperature");
    /**
     * Add calibration data
     */
    addData(data: CalibrationDataPoint[]): void;
    /**
     * Clear calibration data
     */
    clearData(): void;
    /**
     * Fit calibrator to data
     */
    fit(): void;
    /**
     * Fit Platt scaling (logistic regression)
     * Reference: Platt (1999)
     */
    private fitPlatt;
    /**
     * Fit isotonic regression
     * Reference: Zadrozny & Elkan (2002)
     */
    private fitIsotonic;
    /**
     * Fit beta calibration
     * Reference: Kull et al. (2017)
     */
    private fitBeta;
    /**
     * Fit temperature scaling
     * Reference: Guo et al. (2017)
     */
    private fitTemperature;
    /**
     * Fit type-specific calibrators
     */
    private fitTypeSpecific;
    /**
     * Calibrate a single confidence score
     */
    calibrate(confidence: number, filterType?: FilterType): CalibrationResult;
    /**
     * Calibrate a span's confidence
     */
    calibrateSpan(span: Span): CalibrationResult;
    /**
     * Calibrate multiple spans
     */
    calibrateSpans(spans: Span[]): CalibrationResult[];
    /**
     * Apply Platt scaling
     */
    private applyPlatt;
    /**
     * Apply isotonic regression
     */
    private applyIsotonic;
    /**
     * Apply beta calibration
     */
    private applyBeta;
    /**
     * Apply temperature scaling
     */
    private applyTemperature;
    /**
     * Compute calibration metrics
     */
    computeMetrics(): CalibrationMetrics;
    /**
     * Generate reliability diagram data for visualization
     */
    getReliabilityDiagram(): {
        confidence: number;
        accuracy: number;
        count: number;
    }[];
    /**
     * Sigmoid function
     */
    private sigmoid;
    /**
     * Logit function (inverse sigmoid)
     */
    private logit;
    /**
     * Check if calibrator is fitted
     */
    isFittedStatus(): boolean;
    /**
     * Get calibration parameters for export
     */
    exportParameters(): string;
    /**
     * Import calibration parameters
     */
    importParameters(json: string): void;
    /**
     * Create calibrator from labeled data
     */
    static fromLabeledData(predictions: Array<{
        confidence: number;
        filterType?: FilterType;
    }>, labels: boolean[], method?: "platt" | "isotonic" | "beta" | "temperature"): ConfidenceCalibrator;
    /**
     * Load calibration from persisted file
     *
     * Attempts to load calibration parameters from the default location.
     * Returns true if loaded successfully, false otherwise.
     */
    loadFromPersistence(): boolean;
    /**
     * Create a calibrator with auto-loaded persistence
     */
    static createWithPersistence(method?: "platt" | "isotonic" | "beta" | "temperature"): ConfidenceCalibrator;
}
export declare const confidenceCalibrator: ConfidenceCalibrator;
export {};
//# sourceMappingURL=ConfidenceCalibrator.d.ts.map