"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.calibrationDataExtractor = exports.CalibrationDataExtractor = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const Span_1 = require("../models/Span");
/**
 * CalibrationDataExtractor - Main extraction class
 */
class CalibrationDataExtractor {
    cortexStoragePath;
    patternsPath;
    constructor(cortexBasePath) {
        // Default to the test suite Cortex storage location
        this.cortexStoragePath =
            cortexBasePath ||
                path.join(process.cwd(), "tests", "master-suite", "cortex", "storage", "knowledge");
        this.patternsPath = path.join(this.cortexStoragePath, "patterns.json");
    }
    /**
     * Extract calibration data from all available sources
     */
    extractCalibrationData() {
        const dataPoints = [];
        // 1. Extract from patterns (false positives and false negatives)
        const patternData = this.extractFromPatterns();
        dataPoints.push(...patternData);
        // 2. Generate synthetic true positive data based on patterns
        // For each false negative, we assume similar patterns that WERE caught
        // are true positives with slightly higher confidence
        const syntheticTruePositives = this.generateSyntheticTruePositives(patternData);
        dataPoints.push(...syntheticTruePositives);
        return dataPoints;
    }
    /**
     * Extract calibration data from Cortex patterns.json
     *
     * FALSE_POSITIVE patterns -> isActualPHI = false (detected but shouldn't have been)
     * FALSE_NEGATIVE patterns -> isActualPHI = true (missed but should have been caught)
     */
    extractFromPatterns() {
        if (!fs.existsSync(this.patternsPath)) {
            console.warn(`[CalibrationDataExtractor] Patterns file not found: ${this.patternsPath}`);
            return [];
        }
        try {
            const patternsJson = fs.readFileSync(this.patternsPath, "utf-8");
            const patternsData = JSON.parse(patternsJson);
            const patterns = patternsData.failures || [];
            const dataPoints = [];
            for (const pattern of patterns) {
                const filterType = this.mapPhiTypeToFilterType(pattern.phiType);
                if (pattern.type === "FALSE_POSITIVE") {
                    // Something was detected but shouldn't have been
                    // The confidence is what the filter assigned to a non-PHI item
                    dataPoints.push({
                        confidence: pattern.confidence,
                        isActualPHI: false,
                        filterType,
                    });
                }
                else if (pattern.type === "FALSE_NEGATIVE") {
                    // Something was missed that should have been caught
                    // The confidence is estimated based on category
                    const estimatedConfidence = this.estimateConfidenceFromCategory(pattern.category, pattern.confidence);
                    dataPoints.push({
                        confidence: estimatedConfidence,
                        isActualPHI: true,
                        filterType,
                    });
                }
            }
            return dataPoints;
        }
        catch (error) {
            console.error(`[CalibrationDataExtractor] Error reading patterns: ${error}`);
            return [];
        }
    }
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
    generateSyntheticTruePositives(patternData) {
        const syntheticData = [];
        const MAX_SYNTHETIC_PER_TYPE = 100; // Limit per type to keep calibration fast
        // Group by filter type
        const byType = new Map();
        for (const dp of patternData) {
            const existing = byType.get(dp.filterType) || [];
            existing.push(dp);
            byType.set(dp.filterType, existing);
        }
        // For each type, generate synthetic true positives
        for (const [filterType, typeData] of byType.entries()) {
            // Count false negatives and false positives for this type
            const falseNegatives = typeData.filter((d) => d.isActualPHI).length;
            const falsePositives = typeData.filter((d) => !d.isActualPHI).length;
            // Estimate true positive ratio based on typical test metrics
            // Assuming ~97% sensitivity, for every 3 FN there are ~97 TP
            // But limit to MAX_SYNTHETIC_PER_TYPE for performance
            const estimatedTruePositives = Math.min(MAX_SYNTHETIC_PER_TYPE, Math.max(20, Math.round((falseNegatives * 97) / 3)));
            // Generate TP data points with higher confidence distribution
            for (let i = 0; i < estimatedTruePositives; i++) {
                // True positives tend to have higher confidence (0.75-0.99)
                const confidence = 0.75 + Math.random() * 0.24;
                syntheticData.push({
                    confidence,
                    isActualPHI: true,
                    filterType,
                });
            }
            // Estimate true negatives based on false positives
            // Assuming ~96% specificity, for every 4 FP there are ~96 TN
            // But limit to MAX_SYNTHETIC_PER_TYPE for performance
            const estimatedTrueNegatives = Math.min(MAX_SYNTHETIC_PER_TYPE, Math.max(20, Math.round((falsePositives * 96) / 4)));
            // Generate TN data points with lower confidence distribution
            for (let i = 0; i < estimatedTrueNegatives; i++) {
                // True negatives (correctly not detected) have varying confidence
                // when considering near-misses and ambiguous cases
                const confidence = Math.random() * 0.6;
                syntheticData.push({
                    confidence,
                    isActualPHI: false,
                    filterType,
                });
            }
        }
        return syntheticData;
    }
    /**
     * Map PHI type string from Cortex to FilterType enum
     */
    mapPhiTypeToFilterType(phiType) {
        // Direct mapping for common types
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
            DEVICE: Span_1.FilterType.DEVICE,
            BIOMETRIC: Span_1.FilterType.BIOMETRIC,
        };
        // Handle special cases
        if (phiType.includes("AGE_90") || phiType.includes("AGE_UNDER")) {
            return Span_1.FilterType.AGE;
        }
        if (phiType.includes("LICENSE_PLATE")) {
            return Span_1.FilterType.VEHICLE;
        }
        return mapping[phiType] || undefined;
    }
    /**
     * Estimate confidence for missed detections based on failure category
     */
    estimateConfidenceFromCategory(category, baseConfidence) {
        // Different categories suggest different confidence levels
        switch (category) {
            case "PATTERN_EDGE_CASE":
                // Edge cases likely had partial matches with medium confidence
                return Math.max(0.3, Math.min(0.6, baseConfidence));
            case "DICTIONARY_MISS":
                // Dictionary misses might have had some contextual signal
                return Math.max(0.4, Math.min(0.7, baseConfidence));
            case "OCR_CORRUPTION":
                // OCR errors likely confused the pattern matching
                return Math.max(0.2, Math.min(0.5, baseConfidence));
            case "AMBIGUOUS":
                // Ambiguous cases had competing interpretations
                return Math.max(0.4, Math.min(0.6, baseConfidence));
            default:
                return baseConfidence;
        }
    }
    /**
     * Extract data from live test results
     *
     * @param testResults - Array of test result entries with ground truth
     */
    extractFromTestResults(testResults) {
        return testResults.map((result) => ({
            confidence: result.confidence,
            isActualPHI: result.isCorrect,
            filterType: result.filterType || this.mapPhiTypeToFilterType(result.phiType),
        }));
    }
    /**
     * Get calibration statistics per filter type
     */
    getCalibrationStatsByType() {
        const allData = this.extractCalibrationData();
        const statsByType = new Map();
        // Group by filter type
        for (const dp of allData) {
            const typeKey = dp.filterType?.toString() || "UNKNOWN";
            if (!statsByType.has(typeKey)) {
                statsByType.set(typeKey, {
                    filterType: dp.filterType || "UNKNOWN",
                    totalSamples: 0,
                    truePositives: 0,
                    falsePositives: 0,
                    trueNegatives: 0,
                    falseNegatives: 0,
                    meanConfidence: 0,
                    calibrationData: [],
                });
            }
            const stats = statsByType.get(typeKey);
            stats.totalSamples++;
            stats.calibrationData.push(dp);
            // Categorize based on confidence threshold and ground truth
            // Using 0.5 as the decision threshold
            const predicted = dp.confidence >= 0.5;
            if (dp.isActualPHI && predicted) {
                stats.truePositives++;
            }
            else if (dp.isActualPHI && !predicted) {
                stats.falseNegatives++;
            }
            else if (!dp.isActualPHI && predicted) {
                stats.falsePositives++;
            }
            else {
                stats.trueNegatives++;
            }
            // Update running mean
            stats.meanConfidence =
                (stats.meanConfidence * (stats.totalSamples - 1) + dp.confidence) /
                    stats.totalSamples;
        }
        return statsByType;
    }
    /**
     * Check if sufficient data exists for calibration
     */
    hasSufficientData(minSamples = 20) {
        const data = this.extractCalibrationData();
        return data.length >= minSamples;
    }
    /**
     * Get the path to patterns file (for diagnostics)
     */
    getPatternsPath() {
        return this.patternsPath;
    }
}
exports.CalibrationDataExtractor = CalibrationDataExtractor;
// Export singleton for convenience
exports.calibrationDataExtractor = new CalibrationDataExtractor();
//# sourceMappingURL=CalibrationDataExtractor.js.map