"use strict";
/**
 * ConfidenceCalibrator - Confidence Score Calibration System
 *
 * Transforms raw confidence scores into calibrated probabilities that
 * accurately reflect the true likelihood of PHI presence.
 *
 * ALGORITHMS:
 * 1. Platt Scaling - Logistic regression on scores (Platt, 1999)
 * 2. Isotonic Regression - Monotonic calibration (Zadrozny & Elkan, 2002)
 * 3. Beta Calibration - Flexible parametric approach (Kull et al., 2017)
 * 4. Temperature Scaling - Simple neural network approach (Guo et al., 2017)
 *
 * USAGE:
 * 1. Collect predictions with ground truth labels
 * 2. Fit calibrator using fit() method
 * 3. Apply calibration using calibrate() method
 *
 * @module redaction/core
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.confidenceCalibrator = exports.ConfidenceCalibrator = void 0;
/**
 * ConfidenceCalibrator - Main calibration class
 */
class ConfidenceCalibrator {
    plattParams = null;
    isotonicModel = null;
    betaParams = null;
    temperature = 1.0;
    typeSpecificCalibrators = new Map();
    calibrationData = [];
    isFitted = false;
    preferredMethod = "isotonic";
    // Calibration parameters
    static NUM_BINS = 10;
    static MIN_BIN_COUNT = 5;
    static PLATT_ITERATIONS = 100;
    static PLATT_LEARNING_RATE = 0.01;
    constructor(preferredMethod = "isotonic") {
        this.preferredMethod = preferredMethod;
    }
    /**
     * Add calibration data
     */
    addData(data) {
        this.calibrationData.push(...data);
        this.isFitted = false; // Require re-fitting
    }
    /**
     * Clear calibration data
     */
    clearData() {
        this.calibrationData = [];
        this.isFitted = false;
    }
    /**
     * Fit calibrator to data
     */
    fit() {
        if (this.calibrationData.length < 20) {
            throw new Error(`Insufficient calibration data. Need at least 20 points, have ${this.calibrationData.length}`);
        }
        // Fit all methods
        this.fitPlatt();
        this.fitIsotonic();
        this.fitBeta();
        this.fitTemperature();
        // Fit type-specific calibrators if we have enough type-specific data
        this.fitTypeSpecific();
        this.isFitted = true;
    }
    /**
     * Fit Platt scaling (logistic regression)
     * Reference: Platt (1999)
     */
    fitPlatt() {
        // Initialize parameters
        let a = 0;
        let b = 0;
        // Gradient descent to fit logistic regression
        const lr = ConfidenceCalibrator.PLATT_LEARNING_RATE;
        const iterations = ConfidenceCalibrator.PLATT_ITERATIONS;
        for (let iter = 0; iter < iterations; iter++) {
            let gradA = 0;
            let gradB = 0;
            for (const point of this.calibrationData) {
                const z = a * point.confidence + b;
                const p = this.sigmoid(z);
                const y = point.isActualPHI ? 1 : 0;
                const error = p - y;
                gradA += error * point.confidence;
                gradB += error;
            }
            // Update parameters
            a -= (lr * gradA) / this.calibrationData.length;
            b -= (lr * gradB) / this.calibrationData.length;
        }
        this.plattParams = { a, b };
    }
    /**
     * Fit isotonic regression
     * Reference: Zadrozny & Elkan (2002)
     */
    fitIsotonic() {
        // Sort data by confidence
        const sorted = [...this.calibrationData].sort((a, b) => a.confidence - b.confidence);
        // Pool Adjacent Violators (PAV) algorithm
        const n = sorted.length;
        const values = sorted.map((p) => (p.isActualPHI ? 1 : 0));
        const weights = new Array(n).fill(1);
        // PAV algorithm
        let i = 0;
        while (i < n - 1) {
            if (values[i] > values[i + 1]) {
                // Pool adjacent values
                const pooledValue = (values[i] * weights[i] + values[i + 1] * weights[i + 1]) /
                    (weights[i] + weights[i + 1]);
                const pooledWeight = weights[i] + weights[i + 1];
                values[i] = pooledValue;
                weights[i] = pooledWeight;
                values.splice(i + 1, 1);
                weights.splice(i + 1, 1);
                // Step back to check previous pair
                if (i > 0)
                    i--;
            }
            else {
                i++;
            }
        }
        // Build isotonic model
        const thresholds = [];
        const calibratedValues = [];
        let currentIdx = 0;
        for (let j = 0; j < values.length; j++) {
            const endIdx = currentIdx + weights[j];
            const midPoint = sorted[Math.floor((currentIdx + endIdx - 1) / 2)].confidence;
            thresholds.push(midPoint);
            calibratedValues.push(values[j]);
            currentIdx = endIdx;
        }
        this.isotonicModel = { thresholds, values: calibratedValues };
    }
    /**
     * Fit beta calibration
     * Reference: Kull et al. (2017)
     */
    fitBeta() {
        // Simplified beta calibration: fit a * s^b + c
        // Using least squares approximation
        let a = 1;
        let b = 1;
        let c = 0;
        const lr = 0.01;
        const iterations = 100;
        for (let iter = 0; iter < iterations; iter++) {
            let gradA = 0;
            let gradB = 0;
            let gradC = 0;
            for (const point of this.calibrationData) {
                const s = Math.max(0.001, Math.min(0.999, point.confidence));
                const pred = a * Math.pow(s, b) + c;
                const clampedPred = Math.max(0.001, Math.min(0.999, pred));
                const y = point.isActualPHI ? 1 : 0;
                const error = clampedPred - y;
                gradA += error * Math.pow(s, b);
                gradB += error * a * Math.pow(s, b) * Math.log(s);
                gradC += error;
            }
            a -= (lr * gradA) / this.calibrationData.length;
            b -= (lr * gradB) / this.calibrationData.length;
            c -= (lr * gradC) / this.calibrationData.length;
            // Clamp parameters
            a = Math.max(0.1, Math.min(10, a));
            b = Math.max(0.1, Math.min(10, b));
            c = Math.max(-0.5, Math.min(0.5, c));
        }
        this.betaParams = { a, b, c };
    }
    /**
     * Fit temperature scaling
     * Reference: Guo et al. (2017)
     */
    fitTemperature() {
        // Find optimal temperature using grid search
        let bestTemp = 1.0;
        let bestLoss = Infinity;
        for (let t = 0.1; t <= 5.0; t += 0.1) {
            let loss = 0;
            for (const point of this.calibrationData) {
                const logit = this.logit(point.confidence);
                const scaledLogit = logit / t;
                const calibrated = this.sigmoid(scaledLogit);
                const y = point.isActualPHI ? 1 : 0;
                // Cross-entropy loss
                const clampedCalibrated = Math.max(0.001, Math.min(0.999, calibrated));
                loss -=
                    y * Math.log(clampedCalibrated) +
                        (1 - y) * Math.log(1 - clampedCalibrated);
            }
            if (loss < bestLoss) {
                bestLoss = loss;
                bestTemp = t;
            }
        }
        this.temperature = bestTemp;
    }
    /**
     * Fit type-specific calibrators
     */
    fitTypeSpecific() {
        // Group data by type
        const typeGroups = new Map();
        for (const point of this.calibrationData) {
            if (!point.filterType)
                continue;
            if (!typeGroups.has(point.filterType)) {
                typeGroups.set(point.filterType, []);
            }
            typeGroups.get(point.filterType).push(point);
        }
        // Fit calibrator for types with sufficient data
        for (const [type, data] of typeGroups.entries()) {
            if (data.length >= 30) {
                // Need enough data for type-specific calibration
                const typeCalibrator = new ConfidenceCalibrator(this.preferredMethod);
                typeCalibrator.addData(data);
                try {
                    typeCalibrator.fit();
                    this.typeSpecificCalibrators.set(type, typeCalibrator);
                }
                catch {
                    // Not enough data, skip type-specific calibration
                }
            }
        }
    }
    /**
     * Calibrate a single confidence score
     */
    calibrate(confidence, filterType) {
        if (!this.isFitted) {
            // Return uncalibrated if not fitted
            return {
                rawConfidence: confidence,
                calibratedConfidence: confidence,
                method: "uncalibrated",
            };
        }
        // Try type-specific calibrator first
        if (filterType && this.typeSpecificCalibrators.has(filterType)) {
            return this.typeSpecificCalibrators
                .get(filterType)
                .calibrate(confidence);
        }
        // Use preferred method
        let calibrated;
        let method;
        switch (this.preferredMethod) {
            case "platt":
                calibrated = this.applyPlatt(confidence);
                method = "platt";
                break;
            case "isotonic":
                calibrated = this.applyIsotonic(confidence);
                method = "isotonic";
                break;
            case "beta":
                calibrated = this.applyBeta(confidence);
                method = "beta";
                break;
            case "temperature":
                calibrated = this.applyTemperature(confidence);
                method = "temperature";
                break;
            default:
                calibrated = confidence;
                method = "none";
        }
        return {
            rawConfidence: confidence,
            calibratedConfidence: Math.max(0, Math.min(1, calibrated)),
            method,
        };
    }
    /**
     * Calibrate a span's confidence
     */
    calibrateSpan(span) {
        const result = this.calibrate(span.confidence, span.filterType);
        span.confidence = result.calibratedConfidence;
        return result;
    }
    /**
     * Calibrate multiple spans
     */
    calibrateSpans(spans) {
        return spans.map((span) => this.calibrateSpan(span));
    }
    /**
     * Apply Platt scaling
     */
    applyPlatt(confidence) {
        if (!this.plattParams)
            return confidence;
        const z = this.plattParams.a * confidence + this.plattParams.b;
        return this.sigmoid(z);
    }
    /**
     * Apply isotonic regression
     */
    applyIsotonic(confidence) {
        if (!this.isotonicModel)
            return confidence;
        const { thresholds, values } = this.isotonicModel;
        // Find appropriate segment
        if (confidence <= thresholds[0]) {
            return values[0];
        }
        if (confidence >= thresholds[thresholds.length - 1]) {
            return values[values.length - 1];
        }
        // Linear interpolation between segments
        for (let i = 0; i < thresholds.length - 1; i++) {
            if (confidence >= thresholds[i] && confidence <= thresholds[i + 1]) {
                const t = (confidence - thresholds[i]) / (thresholds[i + 1] - thresholds[i]);
                return values[i] + t * (values[i + 1] - values[i]);
            }
        }
        return confidence;
    }
    /**
     * Apply beta calibration
     */
    applyBeta(confidence) {
        if (!this.betaParams)
            return confidence;
        const s = Math.max(0.001, Math.min(0.999, confidence));
        return (this.betaParams.a * Math.pow(s, this.betaParams.b) + this.betaParams.c);
    }
    /**
     * Apply temperature scaling
     */
    applyTemperature(confidence) {
        const logit = this.logit(confidence);
        const scaledLogit = logit / this.temperature;
        return this.sigmoid(scaledLogit);
    }
    /**
     * Compute calibration metrics
     */
    computeMetrics() {
        if (!this.isFitted || this.calibrationData.length === 0) {
            throw new Error("Calibrator must be fitted with data before computing metrics");
        }
        const numBins = ConfidenceCalibrator.NUM_BINS;
        const bins = [];
        // Create bins
        for (let i = 0; i < numBins; i++) {
            const binStart = i / numBins;
            const binEnd = (i + 1) / numBins;
            bins.push({
                binStart,
                binEnd,
                meanConfidence: 0,
                actualAccuracy: 0,
                count: 0,
            });
        }
        // Assign data points to bins
        let totalBrier = 0;
        let totalLogLoss = 0;
        for (const point of this.calibrationData) {
            const calibrated = this.calibrate(point.confidence).calibratedConfidence;
            const binIdx = Math.min(numBins - 1, Math.floor(calibrated * numBins));
            const y = point.isActualPHI ? 1 : 0;
            bins[binIdx].meanConfidence += calibrated;
            bins[binIdx].actualAccuracy += y;
            bins[binIdx].count++;
            // Brier score
            totalBrier += Math.pow(calibrated - y, 2);
            // Log loss
            const clampedCalibrated = Math.max(0.001, Math.min(0.999, calibrated));
            totalLogLoss -=
                y * Math.log(clampedCalibrated) +
                    (1 - y) * Math.log(1 - clampedCalibrated);
        }
        // Compute bin statistics
        let ece = 0; // Expected Calibration Error
        let mce = 0; // Maximum Calibration Error
        for (const bin of bins) {
            if (bin.count > 0) {
                bin.meanConfidence /= bin.count;
                bin.actualAccuracy /= bin.count;
                const calibrationError = Math.abs(bin.meanConfidence - bin.actualAccuracy);
                ece += (bin.count / this.calibrationData.length) * calibrationError;
                mce = Math.max(mce, calibrationError);
            }
        }
        return {
            expectedCalibrationError: ece,
            maxCalibrationError: mce,
            brierScore: totalBrier / this.calibrationData.length,
            logLoss: totalLogLoss / this.calibrationData.length,
            reliability: bins.filter((b) => b.count >= ConfidenceCalibrator.MIN_BIN_COUNT),
        };
    }
    /**
     * Generate reliability diagram data for visualization
     */
    getReliabilityDiagram() {
        const metrics = this.computeMetrics();
        return metrics.reliability.map((bin) => ({
            confidence: bin.meanConfidence,
            accuracy: bin.actualAccuracy,
            count: bin.count,
        }));
    }
    /**
     * Sigmoid function
     */
    sigmoid(x) {
        if (x >= 0) {
            return 1 / (1 + Math.exp(-x));
        }
        else {
            const expX = Math.exp(x);
            return expX / (1 + expX);
        }
    }
    /**
     * Logit function (inverse sigmoid)
     */
    logit(p) {
        const clampedP = Math.max(0.001, Math.min(0.999, p));
        return Math.log(clampedP / (1 - clampedP));
    }
    /**
     * Check if calibrator is fitted
     */
    isFittedStatus() {
        return this.isFitted;
    }
    /**
     * Get calibration parameters for export
     */
    exportParameters() {
        return JSON.stringify({
            plattParams: this.plattParams,
            isotonicModel: this.isotonicModel,
            betaParams: this.betaParams,
            temperature: this.temperature,
            preferredMethod: this.preferredMethod,
            isFitted: this.isFitted,
        }, null, 2);
    }
    /**
     * Import calibration parameters
     */
    importParameters(json) {
        const data = JSON.parse(json);
        this.plattParams = data.plattParams;
        this.isotonicModel = data.isotonicModel;
        this.betaParams = data.betaParams;
        this.temperature = data.temperature;
        this.preferredMethod = data.preferredMethod;
        this.isFitted = data.isFitted;
    }
    /**
     * Create calibrator from labeled data
     */
    static fromLabeledData(predictions, labels, method = "isotonic") {
        if (predictions.length !== labels.length) {
            throw new Error("Predictions and labels must have same length");
        }
        const calibrator = new ConfidenceCalibrator(method);
        const data = predictions.map((pred, i) => ({
            confidence: pred.confidence,
            isActualPHI: labels[i],
            filterType: pred.filterType,
        }));
        calibrator.addData(data);
        calibrator.fit();
        return calibrator;
    }
}
exports.ConfidenceCalibrator = ConfidenceCalibrator;
// Export singleton for convenience
exports.confidenceCalibrator = new ConfidenceCalibrator("isotonic");
//# sourceMappingURL=ConfidenceCalibrator.js.map