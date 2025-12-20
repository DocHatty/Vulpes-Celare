"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.driftDetector = exports.DriftDetector = void 0;
const DEFAULT_CONFIG = {
    windowSize: 60 * 60 * 1000, // 1 hour
    windowHistory: 24, // 24 hours of history
    hellingerThreshold: 0.1,
    volumeThreshold: 0.3,
    confidenceThreshold: 0.15,
    minSamples: 100,
};
class DriftDetector {
    static instance;
    enabled;
    config;
    // Historical windows
    windows = [];
    baseline = null;
    // Current window accumulator
    currentWindow;
    // Known PHI types for distribution tracking
    static PHI_TYPES = [
        'NAME', 'DATE', 'SSN', 'PHONE', 'ADDRESS', 'MRN',
        'EMAIL', 'ACCOUNT_NUMBER', 'LICENSE', 'VIN',
        'IP_ADDRESS', 'DIAGNOSIS', 'PROVIDER_NAME', 'FAX'
    ];
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.enabled = this.isEnabled();
        this.currentWindow = this.createEmptyWindow();
    }
    static getInstance(config) {
        if (!DriftDetector.instance) {
            DriftDetector.instance = new DriftDetector(config);
        }
        return DriftDetector.instance;
    }
    /**
     * Reset instance (for testing)
     */
    static resetInstance() {
        DriftDetector.instance = undefined;
    }
    isEnabled() {
        const envValue = process.env.VULPES_DRIFT_DETECTION;
        // Default to disabled in production, enabled if explicitly set
        return envValue === '1' || envValue === 'true';
    }
    /**
     * Force enable/disable (useful for testing)
     */
    setEnabled(value) {
        this.enabled = value;
    }
    /**
     * Record a detection event
     */
    recordDetection(phiType, confidence, _documentId) {
        if (!this.enabled)
            return;
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
    recordDocument() {
        if (!this.enabled)
            return;
        const now = Date.now();
        if (now >= this.currentWindow.endTime) {
            this.rotateWindow();
        }
        this.currentWindow.documentCount++;
    }
    /**
     * Get current drift metrics
     */
    getMetrics() {
        if (!this.enabled || !this.baseline) {
            return {
                hellingerDistance: 0,
                volumeChange: 0,
                confidenceDrift: 0,
                isDrifting: false,
                alerts: [],
            };
        }
        const alerts = [];
        // Calculate Hellinger distance for PHI type distribution
        const hellingerDistance = this.calculateHellingerDistance(this.baseline, this.currentWindow);
        // Calculate volume change
        const volumeChange = this.calculateVolumeChange(this.baseline, this.currentWindow);
        // Calculate confidence drift
        const confidenceDrift = this.calculateConfidenceDrift(this.baseline, this.currentWindow);
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
    setBaseline() {
        if (this.windows.length > 0) {
            // Use average of recent windows as baseline
            this.baseline = this.calculateAverageWindow(this.windows);
        }
        else if (this.currentWindow.documentCount >= this.config.minSamples) {
            // Use current window as baseline
            this.baseline = { ...this.currentWindow };
            this.baseline.phiTypeCounts = new Map(this.currentWindow.phiTypeCounts);
            this.baseline.confidenceBuckets = [...this.currentWindow.confidenceBuckets];
        }
    }
    /**
     * Get baseline for inspection
     */
    getBaseline() {
        return this.baseline;
    }
    /**
     * Get current window for inspection
     */
    getCurrentWindow() {
        return this.currentWindow;
    }
    /**
     * Get historical windows
     */
    getHistory() {
        return [...this.windows];
    }
    // ============ Private Methods ============
    createEmptyWindow() {
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
    rotateWindow() {
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
    calculateHellingerDistance(baseline, current) {
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
    calculateVolumeChange(baseline, current) {
        if (baseline.detectionRate === 0)
            return 0;
        return (current.detectionRate - baseline.detectionRate) / baseline.detectionRate;
    }
    calculateConfidenceDrift(baseline, current) {
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
    findAffectedTypes(baseline, current) {
        const affected = [];
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
    findNewPhiTypes(baseline, current) {
        const newTypes = [];
        for (const type of current.phiTypeCounts.keys()) {
            if (!baseline.phiTypeCounts.has(type) && current.phiTypeCounts.get(type) > 0) {
                newTypes.push(type);
            }
        }
        return newTypes;
    }
    calculateAverageWindow(windows) {
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
    exportMetrics() {
        const metrics = this.getMetrics();
        const window = this.currentWindow;
        const exported = {
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
exports.DriftDetector = DriftDetector;
// Singleton export
exports.driftDetector = DriftDetector.getInstance();
//# sourceMappingURL=DriftDetector.js.map