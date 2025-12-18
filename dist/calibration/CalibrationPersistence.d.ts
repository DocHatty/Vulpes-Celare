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
import { ConfidenceCalibrator, CalibrationMetrics } from "../core/ConfidenceCalibrator";
/**
 * Calibration persistence metadata
 */
export interface CalibrationMetadata {
    version: string;
    fittedAt: string;
    dataPointCount: number;
    preferredMethod: string;
    metrics: CalibrationMetrics | null;
    sourceFiles: string[];
}
/**
 * Full persisted calibration state
 */
export interface PersistedCalibration {
    metadata: CalibrationMetadata;
    parameters: string;
}
/**
 * CalibrationPersistence - Main persistence class
 */
export declare class CalibrationPersistence {
    private calibrationDir;
    private calibrationFile;
    constructor(calibrationDir?: string, calibrationFile?: string);
    /**
     * Get full path to calibration file
     */
    getCalibrationPath(): string;
    /**
     * Ensure calibration directory exists
     */
    private ensureDirectory;
    /**
     * Save calibrator state to disk
     *
     * @param calibrator - The fitted ConfidenceCalibrator to save
     * @param dataPointCount - Number of data points used for fitting
     * @param sourceFiles - List of source files used for calibration data
     */
    save(calibrator: ConfidenceCalibrator, dataPointCount: number, sourceFiles?: string[]): void;
    /**
     * Load calibrator state from disk
     *
     * @param calibrator - The ConfidenceCalibrator to load into
     * @returns True if loaded successfully, false otherwise
     */
    load(calibrator: ConfidenceCalibrator): boolean;
    /**
     * Check if a persisted calibration file exists
     */
    exists(): boolean;
    /**
     * Get metadata from persisted calibration without loading parameters
     */
    getMetadata(): CalibrationMetadata | null;
    /**
     * Check if persisted calibration is stale (older than maxAge)
     *
     * @param maxAgeMs - Maximum age in milliseconds (default: 7 days)
     */
    isStale(maxAgeMs?: number): boolean;
    /**
     * Delete persisted calibration file
     */
    clear(): void;
    /**
     * Create a backup of the current calibration file
     */
    backup(): string | null;
    /**
     * List all calibration backups
     */
    listBackups(): string[];
    /**
     * Restore from a backup file
     *
     * @param backupPath - Path to backup file
     * @param calibrator - The ConfidenceCalibrator to load into
     */
    restoreFromBackup(backupPath: string, calibrator: ConfidenceCalibrator): boolean;
    /**
     * Check version compatibility
     */
    private isVersionCompatible;
    /**
     * Get calibration statistics summary
     */
    getStatsSummary(): string;
}
export declare const calibrationPersistence: CalibrationPersistence;
//# sourceMappingURL=CalibrationPersistence.d.ts.map