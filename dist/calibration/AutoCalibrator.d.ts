/**
 * AutoCalibrator - Automated calibration fitting and management
 *
 * Orchestrates the calibration process:
 * 1. Extracts calibration data from test results and Cortex patterns
 * 2. Fits the ConfidenceCalibrator with the extracted data
 * 3. Persists the fitted calibration for future use
 * 4. Provides hooks for integration with test runners
 *
 * @module calibration
 */
import { ConfidenceCalibrator } from "../core/ConfidenceCalibrator";
import { CalibrationMetadata } from "./CalibrationPersistence";
import { FilterType } from "../models/Span";
/**
 * Auto-calibration options
 */
export interface AutoCalibrationOptions {
    /** Minimum data points required for calibration */
    minDataPoints: number;
    /** Preferred calibration method */
    preferredMethod: "platt" | "isotonic" | "beta" | "temperature";
    /** Whether to create backup before recalibration */
    createBackup: boolean;
    /** Maximum age of calibration before considered stale (ms) */
    maxStaleAge: number;
    /** Path to Cortex storage (optional) */
    cortexPath?: string;
    /** Path to calibration storage (optional) */
    calibrationDir?: string;
    /** Verbose logging */
    verbose: boolean;
}
/**
 * Calibration result
 */
export interface CalibrationResult {
    success: boolean;
    message: string;
    dataPointCount: number;
    metrics?: {
        expectedCalibrationError: number;
        maxCalibrationError: number;
        brierScore: number;
    };
    filterTypeStats?: Map<string, number>;
}
/**
 * Test result format for live calibration
 */
export interface LiveTestResult {
    phiType: string;
    value: string;
    confidence: number;
    wasDetected: boolean;
    shouldBeDetected: boolean;
    filterType?: FilterType;
}
/**
 * AutoCalibrator - Main auto-calibration class
 */
export declare class AutoCalibrator {
    private options;
    private extractor;
    private persistence;
    private calibrator;
    private liveData;
    constructor(options?: Partial<AutoCalibrationOptions>);
    /**
     * Run automatic calibration from stored test data
     *
     * This is the main entry point for calibration. It:
     * 1. Loads existing calibration if available
     * 2. Extracts new calibration data from Cortex
     * 3. Fits the calibrator if enough data is available
     * 4. Saves the new calibration
     */
    runAutoCalibration(): Promise<CalibrationResult>;
    /**
     * Add live test result data for calibration
     *
     * Call this during test runs to collect real-time calibration data
     */
    addLiveTestResult(result: LiveTestResult): void;
    /**
     * Add batch of live test results
     */
    addLiveTestResults(results: LiveTestResult[]): void;
    /**
     * Clear live test data
     */
    clearLiveData(): void;
    /**
     * Load existing calibration without re-fitting
     *
     * Returns the calibrator with loaded parameters
     */
    loadCalibration(): ConfidenceCalibrator | null;
    /**
     * Force recalibration regardless of existing data
     */
    forceRecalibration(): Promise<CalibrationResult>;
    /**
     * Get the current calibrator instance
     */
    getCalibrator(): ConfidenceCalibrator;
    /**
     * Get calibration status information
     */
    getStatus(): {
        hasCalibration: boolean;
        isStale: boolean;
        metadata: CalibrationMetadata | null;
        liveDataCount: number;
    };
    /**
     * Calibrate a single confidence value
     *
     * This is a convenience method for quick calibration
     */
    calibrate(confidence: number, filterType?: FilterType): number;
    /**
     * Get calibration report
     */
    getReport(): string;
    /**
     * Map PHI type string to FilterType enum
     */
    private mapPhiType;
    /**
     * Log message if verbose mode is enabled
     */
    private log;
}
/**
 * Initialize and run auto-calibration
 *
 * This is the main entry point for automatic calibration.
 * It can be called at startup or after test runs.
 */
export declare function initializeCalibration(options?: Partial<AutoCalibrationOptions>): Promise<CalibrationResult>;
/**
 * Get a calibrated confidence score
 *
 * Quick utility for calibrating a single value
 */
export declare function getCalibratedConfidence(confidence: number, filterType?: FilterType): number;
export declare const autoCalibrator: AutoCalibrator;
//# sourceMappingURL=AutoCalibrator.d.ts.map