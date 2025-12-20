/**
 * DriftDetector - Production Drift Detection for PHI Detection
 *
 * Monitors the statistical distribution of PHI detections over time
 * and alerts when significant drift is detected. Uses Hellinger distance
 * for robust drift quantification.
 *
 * Key metrics tracked:
 * - PHI type distribution (NAME, DATE, SSN, etc.)
 * - Confidence score distribution
 * - Detection volume over time
 * - False positive indicators
 *
 * Feature-flagged via VULPES_DRIFT_DETECTION environment variable.
 *
 * @module monitoring/DriftDetector
 */

export interface DriftWindow {
  /** Window start timestamp */
  startTime: number;
  /** Window end timestamp */
  endTime: number;
  /** Total documents processed */
  documentCount: number;
  /** Total detections */
  detectionCount: number;
  /** Detection counts by PHI type */
  phiTypeCounts: Map<string, number>;
  /** Confidence score buckets (0-0.2, 0.2-0.4, ..., 0.8-1.0) */
  confidenceBuckets: number[];
  /** Detection rate per document */
  detectionRate: number;
}

export interface DriftAlert {
  /** Alert severity */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Type of drift detected */
  driftType: 'DISTRIBUTION_SHIFT' | 'VOLUME_ANOMALY' | 'CONFIDENCE_DRIFT' | 'NEW_PHI_TYPE';
  /** Description of the drift */
  message: string;
  /** Hellinger distance (if applicable) */
  hellingerDistance?: number;
  /** Affected PHI types */
  affectedTypes: string[];
  /** Timestamp of detection */
  detectedAt: number;
  /** Recommended action */
  recommendation: string;
}

export interface DriftMetrics {
  /** Current Hellinger distance from baseline */
  hellingerDistance: number;
  /** Volume change percentage */
  volumeChange: number;
  /** Confidence score drift */
  confidenceDrift: number;
  /** Whether drift is detected */
  isDrifting: boolean;
  /** Active alerts */
  alerts: DriftAlert[];
}

export interface DriftConfig {
  /** Window size in milliseconds (default: 1 hour) */
  windowSize: number;
  /** Number of windows to keep for comparison (default: 24) */
  windowHistory: number;
  /** Hellinger distance threshold for alert (default: 0.1) */
  hellingerThreshold: number;
  /** Volume change threshold for alert (default: 0.3 = 30%) */
  volumeThreshold: number;
  /** Confidence drift threshold (default: 0.15) */
  confidenceThreshold: number;
  /** Minimum samples before drift detection activates */
  minSamples: number;
}

const DEFAULT_CONFIG: DriftConfig = {
  windowSize: 60 * 60 * 1000, // 1 hour
  windowHistory: 24, // 24 hours of history
  hellingerThreshold: 0.1,
  volumeThreshold: 0.3,
  confidenceThreshold: 0.15,
  minSamples: 100,
};

export class DriftDetector {
  private static instance: DriftDetector;
  private enabled: boolean;
  private config: DriftConfig;

  // Historical windows
  private windows: DriftWindow[] = [];
  private baseline: DriftWindow | null = null;

  // Current window accumulator
  private currentWindow: DriftWindow;

  // Known PHI types for distribution tracking
  static readonly PHI_TYPES = [
    'NAME', 'DATE', 'SSN', 'PHONE', 'ADDRESS', 'MRN',
    'EMAIL', 'ACCOUNT_NUMBER', 'LICENSE', 'VIN',
    'IP_ADDRESS', 'DIAGNOSIS', 'PROVIDER_NAME', 'FAX'
  ] as const;

  private constructor(config: Partial<DriftConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.enabled = this.isEnabled();
    this.currentWindow = this.createEmptyWindow();
  }

  static getInstance(config?: Partial<DriftConfig>): DriftDetector {
    if (!DriftDetector.instance) {
      DriftDetector.instance = new DriftDetector(config);
    }
    return DriftDetector.instance;
  }

  /**
   * Reset instance (for testing)
   */
  static resetInstance(): void {
    DriftDetector.instance = undefined as any;
  }

  private isEnabled(): boolean {
    const envValue = process.env.VULPES_DRIFT_DETECTION;
    // Default to disabled in production, enabled if explicitly set
    return envValue === '1' || envValue === 'true';
  }

  /**
   * Force enable/disable (useful for testing)
   */
  setEnabled(value: boolean): void {
    this.enabled = value;
  }

  /**
   * Record a detection event
   */
  recordDetection(phiType: string, confidence: number, _documentId?: string): void {
    if (!this.enabled) return;

    const now = Date.now();

    // Check if we need to rotate windows
    if (now >= this.currentWindow.endTime) {
      this.rotateWindow();
    }

    // Update current window
    this.currentWindow.detectionCount++;
    const currentCount = this.currentWindow.phiTypeCounts.get(phiType) || 0;
    this.currentWindow.phiTypeCounts.set(phiType, currentCount + 1);

    // Update confidence bucket
    const bucketIndex = Math.min(4, Math.floor(confidence * 5));
    this.currentWindow.confidenceBuckets[bucketIndex]++;
  }

  /**
   * Record document processing (for rate calculation)
   */
  recordDocument(): void {
    if (!this.enabled) return;

    const now = Date.now();
    if (now >= this.currentWindow.endTime) {
      this.rotateWindow();
    }

    this.currentWindow.documentCount++;
  }

  /**
   * Get current drift metrics
   */
  getMetrics(): DriftMetrics {
    if (!this.enabled || !this.baseline) {
      return {
        hellingerDistance: 0,
        volumeChange: 0,
        confidenceDrift: 0,
        isDrifting: false,
        alerts: [],
      };
    }

    const alerts: DriftAlert[] = [];

    // Calculate Hellinger distance for PHI type distribution
    const hellingerDistance = this.calculateHellingerDistance(
      this.baseline,
      this.currentWindow
    );

    // Calculate volume change
    const volumeChange = this.calculateVolumeChange(
      this.baseline,
      this.currentWindow
    );

    // Calculate confidence drift
    const confidenceDrift = this.calculateConfidenceDrift(
      this.baseline,
      this.currentWindow
    );

    // Check for distribution shift
    if (hellingerDistance > this.config.hellingerThreshold) {
      const affectedTypes = this.findAffectedTypes(this.baseline, this.currentWindow);
      alerts.push({
        severity: hellingerDistance > 0.3 ? 'CRITICAL' : hellingerDistance > 0.2 ? 'HIGH' : 'MEDIUM',
        driftType: 'DISTRIBUTION_SHIFT',
        message: `PHI type distribution has shifted (Hellinger distance: ${hellingerDistance.toFixed(3)})`,
        hellingerDistance,
        affectedTypes,
        detectedAt: Date.now(),
        recommendation: 'Review recent changes to filters or input data patterns',
      });
    }

    // Check for volume anomaly
    if (Math.abs(volumeChange) > this.config.volumeThreshold) {
      alerts.push({
        severity: Math.abs(volumeChange) > 0.5 ? 'HIGH' : 'MEDIUM',
        driftType: 'VOLUME_ANOMALY',
        message: `Detection volume ${volumeChange > 0 ? 'increased' : 'decreased'} by ${(Math.abs(volumeChange) * 100).toFixed(1)}%`,
        affectedTypes: [],
        detectedAt: Date.now(),
        recommendation: volumeChange > 0
          ? 'Check for false positive increase'
          : 'Check for sensitivity regression',
      });
    }

    // Check for confidence drift
    if (confidenceDrift > this.config.confidenceThreshold) {
      alerts.push({
        severity: confidenceDrift > 0.25 ? 'HIGH' : 'MEDIUM',
        driftType: 'CONFIDENCE_DRIFT',
        message: `Confidence score distribution has shifted (drift: ${confidenceDrift.toFixed(3)})`,
        affectedTypes: [],
        detectedAt: Date.now(),
        recommendation: 'Review threshold calibration',
      });
    }

    // Check for new PHI types
    const newTypes = this.findNewPhiTypes(this.baseline, this.currentWindow);
    if (newTypes.length > 0) {
      alerts.push({
        severity: 'LOW',
        driftType: 'NEW_PHI_TYPE',
        message: `New PHI types detected: ${newTypes.join(', ')}`,
        affectedTypes: newTypes,
        detectedAt: Date.now(),
        recommendation: 'Verify new PHI type detection is intentional',
      });
    }

    return {
      hellingerDistance,
      volumeChange,
      confidenceDrift,
      isDrifting: alerts.length > 0,
      alerts,
    };
  }

  /**
   * Set baseline from current state or historical average
   */
  setBaseline(): void {
    if (this.windows.length > 0) {
      // Use average of recent windows as baseline
      this.baseline = this.calculateAverageWindow(this.windows);
    } else if (this.currentWindow.documentCount >= this.config.minSamples) {
      // Use current window as baseline
      this.baseline = { ...this.currentWindow };
      this.baseline.phiTypeCounts = new Map(this.currentWindow.phiTypeCounts);
      this.baseline.confidenceBuckets = [...this.currentWindow.confidenceBuckets];
    }
  }

  /**
   * Get baseline for inspection
   */
  getBaseline(): DriftWindow | null {
    return this.baseline;
  }

  /**
   * Get current window for inspection
   */
  getCurrentWindow(): DriftWindow {
    return this.currentWindow;
  }

  /**
   * Get historical windows
   */
  getHistory(): DriftWindow[] {
    return [...this.windows];
  }

  // ============ Private Methods ============

  private createEmptyWindow(): DriftWindow {
    const now = Date.now();
    return {
      startTime: now,
      endTime: now + this.config.windowSize,
      documentCount: 0,
      detectionCount: 0,
      phiTypeCounts: new Map(),
      confidenceBuckets: [0, 0, 0, 0, 0],
      detectionRate: 0,
    };
  }

  private rotateWindow(): void {
    // Calculate detection rate
    if (this.currentWindow.documentCount > 0) {
      this.currentWindow.detectionRate =
        this.currentWindow.detectionCount / this.currentWindow.documentCount;
    }

    // Add to history
    this.windows.push(this.currentWindow);

    // Trim history
    while (this.windows.length > this.config.windowHistory) {
      this.windows.shift();
    }

    // Auto-set baseline if we have enough data
    if (!this.baseline && this.windows.length >= 3) {
      this.setBaseline();
    }

    // Create new window
    this.currentWindow = this.createEmptyWindow();
  }

  /**
   * Calculate Hellinger distance between two distributions
   * H(P,Q) = (1/sqrt(2)) * sqrt(sum((sqrt(p_i) - sqrt(q_i))^2))
   */
  private calculateHellingerDistance(
    baseline: DriftWindow,
    current: DriftWindow
  ): number {
    // Get total counts
    const baselineTotal = Array.from(baseline.phiTypeCounts.values())
      .reduce((a, b) => a + b, 0) || 1;
    const currentTotal = Array.from(current.phiTypeCounts.values())
      .reduce((a, b) => a + b, 0) || 1;

    let sum = 0;
    const allTypes = new Set([
      ...baseline.phiTypeCounts.keys(),
      ...current.phiTypeCounts.keys(),
    ]);

    for (const type of allTypes) {
      const baselineProb = (baseline.phiTypeCounts.get(type) || 0) / baselineTotal;
      const currentProb = (current.phiTypeCounts.get(type) || 0) / currentTotal;
      const diff = Math.sqrt(baselineProb) - Math.sqrt(currentProb);
      sum += diff * diff;
    }

    return Math.sqrt(sum) / Math.SQRT2;
  }

  private calculateVolumeChange(
    baseline: DriftWindow,
    current: DriftWindow
  ): number {
    if (baseline.detectionRate === 0) return 0;
    return (current.detectionRate - baseline.detectionRate) / baseline.detectionRate;
  }

  private calculateConfidenceDrift(
    baseline: DriftWindow,
    current: DriftWindow
  ): number {
    const baselineTotal = baseline.confidenceBuckets.reduce((a, b) => a + b, 0) || 1;
    const currentTotal = current.confidenceBuckets.reduce((a, b) => a + b, 0) || 1;

    let sum = 0;
    for (let i = 0; i < 5; i++) {
      const baselineProb = baseline.confidenceBuckets[i] / baselineTotal;
      const currentProb = current.confidenceBuckets[i] / currentTotal;
      const diff = Math.sqrt(baselineProb) - Math.sqrt(currentProb);
      sum += diff * diff;
    }

    return Math.sqrt(sum) / Math.SQRT2;
  }

  private findAffectedTypes(
    baseline: DriftWindow,
    current: DriftWindow
  ): string[] {
    const affected: string[] = [];
    const baselineTotal = Array.from(baseline.phiTypeCounts.values())
      .reduce((a, b) => a + b, 0) || 1;
    const currentTotal = Array.from(current.phiTypeCounts.values())
      .reduce((a, b) => a + b, 0) || 1;

    const allTypes = new Set([
      ...baseline.phiTypeCounts.keys(),
      ...current.phiTypeCounts.keys(),
    ]);

    for (const type of allTypes) {
      const baselineProb = (baseline.phiTypeCounts.get(type) || 0) / baselineTotal;
      const currentProb = (current.phiTypeCounts.get(type) || 0) / currentTotal;
      const change = Math.abs(currentProb - baselineProb);
      if (change > 0.05) { // 5% threshold
        affected.push(type);
      }
    }

    return affected;
  }

  private findNewPhiTypes(
    baseline: DriftWindow,
    current: DriftWindow
  ): string[] {
    const newTypes: string[] = [];
    for (const type of current.phiTypeCounts.keys()) {
      if (!baseline.phiTypeCounts.has(type) && current.phiTypeCounts.get(type)! > 0) {
        newTypes.push(type);
      }
    }
    return newTypes;
  }

  private calculateAverageWindow(windows: DriftWindow[]): DriftWindow {
    const avg = this.createEmptyWindow();
    const n = windows.length;

    for (const window of windows) {
      avg.documentCount += window.documentCount / n;
      avg.detectionCount += window.detectionCount / n;
      avg.detectionRate += window.detectionRate / n;

      for (const [type, count] of window.phiTypeCounts) {
        const current = avg.phiTypeCounts.get(type) || 0;
        avg.phiTypeCounts.set(type, current + count / n);
      }

      for (let i = 0; i < 5; i++) {
        avg.confidenceBuckets[i] += window.confidenceBuckets[i] / n;
      }
    }

    return avg;
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): Record<string, number | string> {
    const metrics = this.getMetrics();
    const window = this.currentWindow;

    const exported: Record<string, number | string> = {
      drift_hellinger_distance: metrics.hellingerDistance,
      drift_volume_change: metrics.volumeChange,
      drift_confidence_drift: metrics.confidenceDrift,
      drift_is_drifting: metrics.isDrifting ? 1 : 0,
      drift_alert_count: metrics.alerts.length,
      window_document_count: window.documentCount,
      window_detection_count: window.detectionCount,
      window_detection_rate: window.detectionRate,
    };

    // Add PHI type counts
    for (const [type, count] of window.phiTypeCounts) {
      exported[`phi_type_${type.toLowerCase()}_count`] = count;
    }

    return exported;
  }
}

// Singleton export
export const driftDetector = DriftDetector.getInstance();
