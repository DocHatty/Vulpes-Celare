"use strict";
/**
 * CalibrationPersistence - Save and load calibration parameters
 *
 * Handles persistence of fitted calibration parameters to disk,
 * allowing the ConfidenceCalibrator to maintain state across sessions.
 *
 * Storage format:
 * - JSON file with calibration parameters
 * - Metadata including fit timestamp, data count, and metrics
 * - Version information for compatibility checking
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
exports.calibrationPersistence = exports.CalibrationPersistence = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Default calibration storage location
 */
const DEFAULT_CALIBRATION_DIR = path.join(process.cwd(), "data", "calibration");
const DEFAULT_CALIBRATION_FILE = "calibration.json";
const CALIBRATION_VERSION = "1.0.0";
/**
 * CalibrationPersistence - Main persistence class
 */
class CalibrationPersistence {
    calibrationDir;
    calibrationFile;
    constructor(calibrationDir, calibrationFile) {
        this.calibrationDir = calibrationDir || DEFAULT_CALIBRATION_DIR;
        this.calibrationFile = calibrationFile || DEFAULT_CALIBRATION_FILE;
    }
    /**
     * Get full path to calibration file
     */
    getCalibrationPath() {
        return path.join(this.calibrationDir, this.calibrationFile);
    }
    /**
     * Ensure calibration directory exists
     */
    ensureDirectory() {
        if (!fs.existsSync(this.calibrationDir)) {
            fs.mkdirSync(this.calibrationDir, { recursive: true });
        }
    }
    /**
     * Save calibrator state to disk
     *
     * @param calibrator - The fitted ConfidenceCalibrator to save
     * @param dataPointCount - Number of data points used for fitting
     * @param sourceFiles - List of source files used for calibration data
     */
    save(calibrator, dataPointCount, sourceFiles = []) {
        this.ensureDirectory();
        // Get calibration metrics if available
        let metrics = null;
        try {
            if (calibrator.isFittedStatus()) {
                metrics = calibrator.computeMetrics();
            }
        }
        catch {
            // Metrics computation might fail if not enough data
            metrics = null;
        }
        // Get the preferred method from the parameters
        const parametersJson = calibrator.exportParameters();
        const params = JSON.parse(parametersJson);
        const persisted = {
            metadata: {
                version: CALIBRATION_VERSION,
                fittedAt: new Date().toISOString(),
                dataPointCount,
                preferredMethod: params.preferredMethod || "isotonic",
                metrics,
                sourceFiles,
            },
            parameters: parametersJson,
        };
        const filePath = this.getCalibrationPath();
        fs.writeFileSync(filePath, JSON.stringify(persisted, null, 2), "utf-8");
        console.log(`[CalibrationPersistence] Saved calibration to ${filePath} (${dataPointCount} data points)`);
    }
    /**
     * Load calibrator state from disk
     *
     * @param calibrator - The ConfidenceCalibrator to load into
     * @returns True if loaded successfully, false otherwise
     */
    load(calibrator) {
        const filePath = this.getCalibrationPath();
        if (!fs.existsSync(filePath)) {
            console.log(`[CalibrationPersistence] No calibration file found at ${filePath}`);
            return false;
        }
        try {
            const content = fs.readFileSync(filePath, "utf-8");
            const persisted = JSON.parse(content);
            // Check version compatibility
            if (!this.isVersionCompatible(persisted.metadata.version)) {
                console.warn(`[CalibrationPersistence] Incompatible calibration version: ${persisted.metadata.version} (expected ${CALIBRATION_VERSION})`);
                return false;
            }
            // Import parameters into calibrator
            calibrator.importParameters(persisted.parameters);
            console.log(`[CalibrationPersistence] Loaded calibration from ${filePath} ` +
                `(fitted ${persisted.metadata.fittedAt}, ${persisted.metadata.dataPointCount} points)`);
            return true;
        }
        catch (error) {
            console.error(`[CalibrationPersistence] Error loading calibration: ${error}`);
            return false;
        }
    }
    /**
     * Check if a persisted calibration file exists
     */
    exists() {
        return fs.existsSync(this.getCalibrationPath());
    }
    /**
     * Get metadata from persisted calibration without loading parameters
     */
    getMetadata() {
        const filePath = this.getCalibrationPath();
        if (!fs.existsSync(filePath)) {
            return null;
        }
        try {
            const content = fs.readFileSync(filePath, "utf-8");
            const persisted = JSON.parse(content);
            return persisted.metadata;
        }
        catch {
            return null;
        }
    }
    /**
     * Check if persisted calibration is stale (older than maxAge)
     *
     * @param maxAgeMs - Maximum age in milliseconds (default: 7 days)
     */
    isStale(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
        const metadata = this.getMetadata();
        if (!metadata)
            return true;
        const fittedAt = new Date(metadata.fittedAt).getTime();
        const now = Date.now();
        return now - fittedAt > maxAgeMs;
    }
    /**
     * Delete persisted calibration file
     */
    clear() {
        const filePath = this.getCalibrationPath();
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[CalibrationPersistence] Deleted calibration file: ${filePath}`);
        }
    }
    /**
     * Create a backup of the current calibration file
     */
    backup() {
        const filePath = this.getCalibrationPath();
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupPath = path.join(this.calibrationDir, `calibration-backup-${timestamp}.json`);
        fs.copyFileSync(filePath, backupPath);
        console.log(`[CalibrationPersistence] Created backup: ${backupPath}`);
        return backupPath;
    }
    /**
     * List all calibration backups
     */
    listBackups() {
        if (!fs.existsSync(this.calibrationDir)) {
            return [];
        }
        return fs
            .readdirSync(this.calibrationDir)
            .filter((f) => f.startsWith("calibration-backup-") && f.endsWith(".json"))
            .map((f) => path.join(this.calibrationDir, f))
            .sort()
            .reverse(); // Most recent first
    }
    /**
     * Restore from a backup file
     *
     * @param backupPath - Path to backup file
     * @param calibrator - The ConfidenceCalibrator to load into
     */
    restoreFromBackup(backupPath, calibrator) {
        if (!fs.existsSync(backupPath)) {
            console.error(`[CalibrationPersistence] Backup file not found: ${backupPath}`);
            return false;
        }
        try {
            const content = fs.readFileSync(backupPath, "utf-8");
            const persisted = JSON.parse(content);
            calibrator.importParameters(persisted.parameters);
            console.log(`[CalibrationPersistence] Restored calibration from backup: ${backupPath}`);
            return true;
        }
        catch (error) {
            console.error(`[CalibrationPersistence] Error restoring backup: ${error}`);
            return false;
        }
    }
    /**
     * Check version compatibility
     */
    isVersionCompatible(version) {
        // Simple major version check
        const current = CALIBRATION_VERSION.split(".")[0];
        const target = version.split(".")[0];
        return current === target;
    }
    /**
     * Get calibration statistics summary
     */
    getStatsSummary() {
        const metadata = this.getMetadata();
        if (!metadata) {
            return "No calibration data available";
        }
        const lines = [
            `Calibration Statistics:`,
            `  Version: ${metadata.version}`,
            `  Fitted: ${metadata.fittedAt}`,
            `  Method: ${metadata.preferredMethod}`,
            `  Data Points: ${metadata.dataPointCount}`,
        ];
        if (metadata.metrics) {
            lines.push(`  ECE: ${(metadata.metrics.expectedCalibrationError * 100).toFixed(2)}%`);
            lines.push(`  MCE: ${(metadata.metrics.maxCalibrationError * 100).toFixed(2)}%`);
            lines.push(`  Brier Score: ${metadata.metrics.brierScore.toFixed(4)}`);
            lines.push(`  Log Loss: ${metadata.metrics.logLoss.toFixed(4)}`);
        }
        return lines.join("\n");
    }
}
exports.CalibrationPersistence = CalibrationPersistence;
// Export singleton for convenience
exports.calibrationPersistence = new CalibrationPersistence();
//# sourceMappingURL=CalibrationPersistence.js.map