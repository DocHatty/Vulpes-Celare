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
export declare class DriftDetector {
    private static instance;
    private enabled;
    private config;
    private windows;
    private baseline;
    private currentWindow;
    static readonly PHI_TYPES: readonly ["NAME", "DATE", "SSN", "PHONE", "ADDRESS", "MRN", "EMAIL", "ACCOUNT_NUMBER", "LICENSE", "VIN", "IP_ADDRESS", "DIAGNOSIS", "PROVIDER_NAME", "FAX"];
    private constructor();
    static getInstance(config?: Partial<DriftConfig>): DriftDetector;
    /**
     * Reset instance (for testing)
     */
    static resetInstance(): void;
    private isEnabled;
    /**
     * Force enable/disable (useful for testing)
     */
    setEnabled(value: boolean): void;
    /**
     * Record a detection event
     */
    recordDetection(phiType: string, confidence: number, _documentId?: string): void;
    /**
     * Record document processing (for rate calculation)
     */
    recordDocument(): void;
    /**
     * Get current drift metrics
     */
    getMetrics(): DriftMetrics;
    /**
     * Set baseline from current state or historical average
     */
    setBaseline(): void;
    /**
     * Get baseline for inspection
     */
    getBaseline(): DriftWindow | null;
    /**
     * Get current window for inspection
     */
    getCurrentWindow(): DriftWindow;
    /**
     * Get historical windows
     */
    getHistory(): DriftWindow[];
    private createEmptyWindow;
    private rotateWindow;
    /**
     * Calculate Hellinger distance between two distributions
     * H(P,Q) = (1/sqrt(2)) * sqrt(sum((sqrt(p_i) - sqrt(q_i))^2))
     */
    private calculateHellingerDistance;
    private calculateVolumeChange;
    private calculateConfidenceDrift;
    private findAffectedTypes;
    private findNewPhiTypes;
    private calculateAverageWindow;
    /**
     * Export metrics for external monitoring systems
     */
    exportMetrics(): Record<string, number | string>;
}
export declare const driftDetector: DriftDetector;
//# sourceMappingURL=DriftDetector.d.ts.map