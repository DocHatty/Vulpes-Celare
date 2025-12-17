"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCalibratedConfidence = exports.initializeCalibration = exports.autoCalibrator = exports.AutoCalibrator = exports.calibrationPersistence = exports.CalibrationPersistence = exports.calibrationDataExtractor = exports.CalibrationDataExtractor = void 0;
var CalibrationDataExtractor_1 = require("./CalibrationDataExtractor");
Object.defineProperty(exports, "CalibrationDataExtractor", { enumerable: true, get: function () { return CalibrationDataExtractor_1.CalibrationDataExtractor; } });
Object.defineProperty(exports, "calibrationDataExtractor", { enumerable: true, get: function () { return CalibrationDataExtractor_1.calibrationDataExtractor; } });
var CalibrationPersistence_1 = require("./CalibrationPersistence");
Object.defineProperty(exports, "CalibrationPersistence", { enumerable: true, get: function () { return CalibrationPersistence_1.CalibrationPersistence; } });
Object.defineProperty(exports, "calibrationPersistence", { enumerable: true, get: function () { return CalibrationPersistence_1.calibrationPersistence; } });
var AutoCalibrator_1 = require("./AutoCalibrator");
Object.defineProperty(exports, "AutoCalibrator", { enumerable: true, get: function () { return AutoCalibrator_1.AutoCalibrator; } });
Object.defineProperty(exports, "autoCalibrator", { enumerable: true, get: function () { return AutoCalibrator_1.autoCalibrator; } });
Object.defineProperty(exports, "initializeCalibration", { enumerable: true, get: function () { return AutoCalibrator_1.initializeCalibration; } });
Object.defineProperty(exports, "getCalibratedConfidence", { enumerable: true, get: function () { return AutoCalibrator_1.getCalibratedConfidence; } });
//# sourceMappingURL=index.js.map