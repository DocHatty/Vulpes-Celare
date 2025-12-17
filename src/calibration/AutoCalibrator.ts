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

import { ConfidenceCalibrator, CalibrationDataPoint } from "../core/ConfidenceCalibrator";
import { CalibrationDataExtractor } from "./CalibrationDataExtractor";
import { CalibrationPersistence, CalibrationMetadata } from "./CalibrationPersistence";
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
 * Default auto-calibration options
 */
const DEFAULT_OPTIONS: AutoCalibrationOptions = {
  minDataPoints: 50,
  preferredMethod: "isotonic",
  createBackup: true,
  maxStaleAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  verbose: false,
};

/**
 * AutoCalibrator - Main auto-calibration class
 */
export class AutoCalibrator {
  private options: AutoCalibrationOptions;
  private extractor: CalibrationDataExtractor;
  private persistence: CalibrationPersistence;
  private calibrator: ConfidenceCalibrator;
  private liveData: CalibrationDataPoint[] = [];

  constructor(options: Partial<AutoCalibrationOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.extractor = new CalibrationDataExtractor(this.options.cortexPath);
    this.persistence = new CalibrationPersistence(this.options.calibrationDir);
    this.calibrator = new ConfidenceCalibrator(this.options.preferredMethod);
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
  async runAutoCalibration(): Promise<CalibrationResult> {
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
      this.persistence.save(
        this.calibrator,
        allData.length,
        [this.extractor.getPatternsPath()]
      );

      // Compute filter type stats
      const filterTypeStats = new Map<string, number>();
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
    } catch (error) {
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
  addLiveTestResult(result: LiveTestResult): void {
    // Convert test result to calibration data point
    // For calibration, we need:
    // - confidence: The confidence score assigned by the filter
    // - isActualPHI: Whether it should have been detected (ground truth)
    const dataPoint: CalibrationDataPoint = {
      confidence: result.confidence,
      isActualPHI: result.shouldBeDetected,
      filterType: result.filterType || this.mapPhiType(result.phiType),
    };

    this.liveData.push(dataPoint);
  }

  /**
   * Add batch of live test results
   */
  addLiveTestResults(results: LiveTestResult[]): void {
    for (const result of results) {
      this.addLiveTestResult(result);
    }
  }

  /**
   * Clear live test data
   */
  clearLiveData(): void {
    this.liveData = [];
  }

  /**
   * Load existing calibration without re-fitting
   *
   * Returns the calibrator with loaded parameters
   */
  loadCalibration(): ConfidenceCalibrator | null {
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
  async forceRecalibration(): Promise<CalibrationResult> {
    // Clear existing and force recalibration
    this.calibrator = new ConfidenceCalibrator(this.options.preferredMethod);
    return this.runAutoCalibration();
  }

  /**
   * Get the current calibrator instance
   */
  getCalibrator(): ConfidenceCalibrator {
    return this.calibrator;
  }

  /**
   * Get calibration status information
   */
  getStatus(): {
    hasCalibration: boolean;
    isStale: boolean;
    metadata: CalibrationMetadata | null;
    liveDataCount: number;
  } {
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
  calibrate(confidence: number, filterType?: FilterType): number {
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
  getReport(): string {
    const status = this.getStatus();
    const lines: string[] = [];

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
    } else {
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
  private mapPhiType(phiType: string): FilterType | undefined {
    const mapping: Record<string, FilterType> = {
      NAME: FilterType.NAME,
      SSN: FilterType.SSN,
      DATE: FilterType.DATE,
      PHONE: FilterType.PHONE,
      EMAIL: FilterType.EMAIL,
      ADDRESS: FilterType.ADDRESS,
      MRN: FilterType.MRN,
      ZIPCODE: FilterType.ZIPCODE,
      CITY: FilterType.CITY,
      STATE: FilterType.STATE,
      IP: FilterType.IP,
      URL: FilterType.URL,
      CREDIT_CARD: FilterType.CREDIT_CARD,
      ACCOUNT: FilterType.ACCOUNT,
      NPI: FilterType.NPI,
      DEA: FilterType.DEA,
      LICENSE: FilterType.LICENSE,
      PASSPORT: FilterType.PASSPORT,
      FAX: FilterType.FAX,
      VEHICLE: FilterType.VEHICLE,
      AGE: FilterType.AGE,
    };

    return mapping[phiType] || undefined;
  }

  /**
   * Log message if verbose mode is enabled
   */
  private log(message: string): void {
    if (this.options.verbose) {
      console.log(`[AutoCalibrator] ${message}`);
    }
  }
}

/**
 * Initialize and run auto-calibration
 *
 * This is the main entry point for automatic calibration.
 * It can be called at startup or after test runs.
 */
export async function initializeCalibration(
  options: Partial<AutoCalibrationOptions> = {}
): Promise<CalibrationResult> {
  const autoCalibrator = new AutoCalibrator(options);
  return autoCalibrator.runAutoCalibration();
}

/**
 * Get a calibrated confidence score
 *
 * Quick utility for calibrating a single value
 */
export function getCalibratedConfidence(
  confidence: number,
  filterType?: FilterType
): number {
  const autoCalibrator = new AutoCalibrator();
  return autoCalibrator.calibrate(confidence, filterType);
}

// Export singleton for convenience
export const autoCalibrator = new AutoCalibrator({ verbose: false });
