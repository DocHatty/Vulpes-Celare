/**
 * Calibration Module - Confidence Score Calibration System
 *
 * This module provides tools for calibrating confidence scores
 * from PHI detection filters to improve accuracy.
 *
 * Components:
 * - CalibrationDataExtractor: Extracts calibration data from test results
 * - CalibrationPersistence: Saves/loads fitted calibration parameters
 * - AutoCalibrator: Orchestrates automatic calibration
 *
 * Usage:
 * ```typescript
 * import { autoCalibrator, initializeCalibration } from './calibration';
 *
 * // Initialize at startup
 * const result = await initializeCalibration();
 *
 * // Or use the singleton
 * const calibrated = autoCalibrator.calibrate(0.75, FilterType.NAME);
 * ```
 *
 * @module calibration
 */
export { CalibrationDataExtractor, calibrationDataExtractor, FilterCalibrationStats, } from "./CalibrationDataExtractor";
export { CalibrationPersistence, calibrationPersistence, CalibrationMetadata, PersistedCalibration, } from "./CalibrationPersistence";
export { AutoCalibrator, autoCalibrator, initializeCalibration, getCalibratedConfidence, AutoCalibrationOptions, CalibrationResult, LiveTestResult, } from "./AutoCalibrator";
export { AdaptiveThresholdService, adaptiveThresholds, MedicalSpecialty, PurposeOfUse, type PHIType, type AdaptiveContext, type AdaptiveThresholds, type ThresholdAdjustment, type ThresholdFeedback, type ContextPerformance, type AdaptiveThresholdConfig, } from "./AdaptiveThresholdService";
//# sourceMappingURL=index.d.ts.map