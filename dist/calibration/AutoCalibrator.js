"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoCalibrator = exports.AutoCalibrator = void 0;
exports.initializeCalibration = initializeCalibration;
exports.getCalibratedConfidence = getCalibratedConfidence;
const ConfidenceCalibrator_1 = require("../core/ConfidenceCalibrator");
const CalibrationDataExtractor_1 = require("./CalibrationDataExtractor");
const CalibrationPersistence_1 = require("./CalibrationPersistence");
const Span_1 = require("../models/Span");
const VulpesLogger_1 = require("../utils/VulpesLogger");
/**
 * Default auto-calibration options
 */
const DEFAULT_OPTIONS = {
    minDataPoints: 50,
    preferredMethod: "isotonic",
    createBackup: true,
    maxStaleAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    verbose: false,
};
/**
 * AutoCalibrator - Main auto-calibration class
 */
class AutoCalibrator {
    options;
    extractor;
    persistence;
    calibrator;
    liveData = [];
    constructor(options = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.extractor = new CalibrationDataExtractor_1.CalibrationDataExtractor(this.options.cortexPath);
        this.persistence = new CalibrationPersistence_1.CalibrationPersistence(this.options.calibrationDir);
        this.calibrator = new ConfidenceCalibrator_1.ConfidenceCalibrator(this.options.preferredMethod);
    }
    /**
     * Run automatic calibration from stored test data
     *
     * This is the main entry point for calibration. It:
     * 1. Loads existing calibration if available
     * 2. Extracts new calibration data from Cortex
     * 3. Fits the calibrator if enough data is available
     * 4. Saves the new calibration
     */
    async runAutoCalibration() {
        this.log("Starting auto-calibration...");
        // Check if we need to recalibrate
        if (this.persistence.exists() && !this.persistence.isStale(this.options.maxStaleAge)) {
            const metadata = this.persistence.getMetadata();
            if (metadata && metadata.dataPointCount >= this.options.minDataPoints) {
                this.log("Existing calibration is fresh and sufficient, skipping recalibration");
                // Load existing calibration
                this.persistence.load(this.calibrator);
                return {
                    success: true,
                    message: "Loaded existing calibration",
                    dataPointCount: metadata.dataPointCount,
                };
            }
        }
        // Extract calibration data
        const extractedData = this.extractor.extractCalibrationData();
        // Combine with any live data collected during test runs
        const allData = [...extractedData, ...this.liveData];
        this.log(`Extracted ${extractedData.length} data points from storage`);
        this.log(`Combined with ${this.liveData.length} live data points`);
        this.log(`Total: ${allData.length} data points`);
        // Check if we have enough data
        if (allData.length < this.options.minDataPoints) {
            return {
                success: false,
                message: `Insufficient data: ${allData.length} points (need ${this.options.minDataPoints})`,
                dataPointCount: allData.length,
            };
        }
        // Create backup if requested
        if (this.options.createBackup && this.persistence.exists()) {
            this.persistence.backup();
        }
        // Fit the calibrator
        try {
            this.calibrator.clearData();
            this.calibrator.addData(allData);
            this.calibrator.fit();
            this.log("Calibrator fitted successfully");
            // Compute metrics
            const metrics = this.calibrator.computeMetrics();
            // Save the calibration
            this.persistence.save(this.calibrator, allData.length, [this.extractor.getPatternsPath()]);
            // Compute filter type stats
            const filterTypeStats = new Map();
            for (const dp of allData) {
                const key = dp.filterType?.toString() || "UNKNOWN";
                filterTypeStats.set(key, (filterTypeStats.get(key) || 0) + 1);
            }
            return {
                success: true,
                message: `Calibration complete with ${allData.length} data points`,
                dataPointCount: allData.length,
                metrics: {
                    expectedCalibrationError: metrics.expectedCalibrationError,
                    maxCalibrationError: metrics.maxCalibrationError,
                    brierScore: metrics.brierScore,
                },
                filterTypeStats,
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Calibration failed: ${error}`,
                dataPointCount: allData.length,
            };
        }
    }
    /**
     * Add live test result data for calibration
     *
     * Call this during test runs to collect real-time calibration data
     */
    addLiveTestResult(result) {
        // Convert test result to calibration data point
        // For calibration, we need:
        // - confidence: The confidence score assigned by the filter
        // - isActualPHI: Whether it should have been detected (ground truth)
        const dataPoint = {
            confidence: result.confidence,
            isActualPHI: result.shouldBeDetected,
            filterType: result.filterType || this.mapPhiType(result.phiType),
        };
        this.liveData.push(dataPoint);
    }
    /**
     * Add batch of live test results
     */
    addLiveTestResults(results) {
        for (const result of results) {
            this.addLiveTestResult(result);
        }
    }
    /**
     * Clear live test data
     */
    clearLiveData() {
        this.liveData = [];
    }
    /**
     * Load existing calibration without re-fitting
     *
     * Returns the calibrator with loaded parameters
     */
    loadCalibration() {
        if (!this.persistence.exists()) {
            this.log("No existing calibration found");
            return null;
        }
        if (this.persistence.load(this.calibrator)) {
            return this.calibrator;
        }
        return null;
    }
    /**
     * Force recalibration regardless of existing data
     */
    async forceRecalibration() {
        // Clear existing and force recalibration
        this.calibrator = new ConfidenceCalibrator_1.ConfidenceCalibrator(this.options.preferredMethod);
        return this.runAutoCalibration();
    }
    /**
     * Get the current calibrator instance
     */
    getCalibrator() {
        return this.calibrator;
    }
    /**
     * Get calibration status information
     */
    getStatus() {
        return {
            hasCalibration: this.persistence.exists(),
            isStale: this.persistence.isStale(this.options.maxStaleAge),
            metadata: this.persistence.getMetadata(),
            liveDataCount: this.liveData.length,
        };
    }
    /**
     * Calibrate a single confidence value
     *
     * This is a convenience method for quick calibration
     */
    calibrate(confidence, filterType) {
        if (!this.calibrator.isFittedStatus()) {
            // Try to load existing calibration
            this.loadCalibration();
        }
        const result = this.calibrator.calibrate(confidence, filterType);
        return result.calibratedConfidence;
    }
    /**
     * Get calibration report
     */
    getReport() {
        const status = this.getStatus();
        const lines = [];
        lines.push("═══════════════════════════════════════════════════════════════");
        lines.push("  CONFIDENCE CALIBRATION REPORT");
        lines.push("═══════════════════════════════════════════════════════════════");
        if (status.hasCalibration && status.metadata) {
            lines.push(`  Status: CALIBRATED`);
            lines.push(`  Fitted: ${status.metadata.fittedAt}`);
            lines.push(`  Method: ${status.metadata.preferredMethod}`);
            lines.push(`  Data Points: ${status.metadata.dataPointCount}`);
            lines.push(`  Stale: ${status.isStale ? "YES (consider recalibration)" : "NO"}`);
            if (status.metadata.metrics) {
                lines.push("");
                lines.push("  Calibration Metrics:");
                lines.push(`    ECE (Expected Calibration Error): ${(status.metadata.metrics.expectedCalibrationError * 100).toFixed(2)}%`);
                lines.push(`    MCE (Maximum Calibration Error): ${(status.metadata.metrics.maxCalibrationError * 100).toFixed(2)}%`);
                lines.push(`    Brier Score: ${status.metadata.metrics.brierScore.toFixed(4)}`);
                lines.push(`    Log Loss: ${status.metadata.metrics.logLoss.toFixed(4)}`);
            }
        }
        else {
            lines.push(`  Status: NOT CALIBRATED`);
            lines.push("");
            lines.push("  To calibrate, run one of:");
            lines.push("    1. node scripts/fit-calibrator.js");
            lines.push("    2. npm test (auto-calibrates after test run)");
        }
        lines.push("");
        lines.push(`  Live Data Collected: ${status.liveDataCount} points`);
        lines.push("═══════════════════════════════════════════════════════════════");
        return lines.join("\n");
    }
    /**
     * Map PHI type string to FilterType enum
     */
    mapPhiType(phiType) {
        const mapping = {
            NAME: Span_1.FilterType.NAME,
            SSN: Span_1.FilterType.SSN,
            DATE: Span_1.FilterType.DATE,
            PHONE: Span_1.FilterType.PHONE,
            EMAIL: Span_1.FilterType.EMAIL,
            ADDRESS: Span_1.FilterType.ADDRESS,
            MRN: Span_1.FilterType.MRN,
            ZIPCODE: Span_1.FilterType.ZIPCODE,
            CITY: Span_1.FilterType.CITY,
            STATE: Span_1.FilterType.STATE,
            IP: Span_1.FilterType.IP,
            URL: Span_1.FilterType.URL,
            CREDIT_CARD: Span_1.FilterType.CREDIT_CARD,
            ACCOUNT: Span_1.FilterType.ACCOUNT,
            NPI: Span_1.FilterType.NPI,
            DEA: Span_1.FilterType.DEA,
            LICENSE: Span_1.FilterType.LICENSE,
            PASSPORT: Span_1.FilterType.PASSPORT,
            FAX: Span_1.FilterType.FAX,
            VEHICLE: Span_1.FilterType.VEHICLE,
            AGE: Span_1.FilterType.AGE,
        };
        return mapping[phiType] || undefined;
    }
    /**
     * Log message if verbose mode is enabled
     */
    log(message) {
        if (this.options.verbose) {
            VulpesLogger_1.vulpesLogger.debug(message, { component: "AutoCalibrator" });
        }
    }
}
exports.AutoCalibrator = AutoCalibrator;
/**
 * Initialize and run auto-calibration
 *
 * This is the main entry point for automatic calibration.
 * It can be called at startup or after test runs.
 */
async function initializeCalibration(options = {}) {
    const autoCalibrator = new AutoCalibrator(options);
    return autoCalibrator.runAutoCalibration();
}
/**
 * Get a calibrated confidence score
 *
 * Quick utility for calibrating a single value
 */
function getCalibratedConfidence(confidence, filterType) {
    const autoCalibrator = new AutoCalibrator();
    return autoCalibrator.calibrate(confidence, filterType);
}
// Export singleton for convenience
exports.autoCalibrator = new AutoCalibrator({ verbose: false });
//# sourceMappingURL=AutoCalibrator.js.map