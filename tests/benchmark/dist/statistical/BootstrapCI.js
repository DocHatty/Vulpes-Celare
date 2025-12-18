"use strict";
/**
 * ============================================================================
 * BOOTSTRAP CONFIDENCE INTERVALS
 * ============================================================================
 *
 * Non-parametric confidence interval estimation using bootstrap resampling.
 *
 * Methods implemented:
 * - Percentile bootstrap (basic)
 * - BCa (bias-corrected and accelerated) - recommended
 * - Stratified bootstrap (for small samples)
 *
 * Reference: Efron & Tibshirani (1993) "An Introduction to the Bootstrap"
 *
 * @module benchmark/statistical/BootstrapCI
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BootstrapCI = void 0;
exports.createBootstrapCI = createBootstrapCI;
/**
 * BootstrapCI - Confidence interval estimation
 */
class BootstrapCI {
    iterations;
    confidenceLevel;
    seed;
    rng;
    constructor(options = {}) {
        this.iterations = options.iterations ?? 10000;
        this.confidenceLevel = options.confidenceLevel ?? 0.95;
        this.seed = options.seed ?? null;
        this.rng = this.seed !== null ? this.createSeededRNG(this.seed) : Math.random;
    }
    /**
     * Calculate confidence interval using percentile method
     */
    percentileCI(data, statistic) {
        const estimate = statistic(data);
        const bootstrapStats = [];
        for (let i = 0; i < this.iterations; i++) {
            const resample = this.resample(data);
            bootstrapStats.push(statistic(resample));
        }
        bootstrapStats.sort((a, b) => a - b);
        const alpha = 1 - this.confidenceLevel;
        const lowerIdx = Math.floor((alpha / 2) * this.iterations);
        const upperIdx = Math.floor((1 - alpha / 2) * this.iterations);
        const standardError = this.calculateStdDev(bootstrapStats);
        return {
            estimate,
            lower: bootstrapStats[lowerIdx],
            upper: bootstrapStats[upperIdx],
            confidenceLevel: this.confidenceLevel,
            method: 'percentile',
            iterations: this.iterations,
            standardError,
        };
    }
    /**
     * Calculate BCa (bias-corrected and accelerated) confidence interval
     *
     * This is the recommended method for most applications.
     */
    bcaCI(data, statistic) {
        const n = data.length;
        const estimate = statistic(data);
        const bootstrapStats = [];
        // Generate bootstrap distribution
        for (let i = 0; i < this.iterations; i++) {
            const resample = this.resample(data);
            bootstrapStats.push(statistic(resample));
        }
        bootstrapStats.sort((a, b) => a - b);
        // Calculate bias correction (z0)
        const countBelow = bootstrapStats.filter(s => s < estimate).length;
        const p0 = countBelow / this.iterations;
        const z0 = this.normalQuantile(p0);
        // Calculate acceleration using jackknife
        const jackknife = [];
        for (let i = 0; i < n; i++) {
            const jackSample = [...data.slice(0, i), ...data.slice(i + 1)];
            jackknife.push(statistic(jackSample));
        }
        const jackMean = jackknife.reduce((a, b) => a + b, 0) / n;
        let numerator = 0;
        let denominator = 0;
        for (const j of jackknife) {
            numerator += Math.pow(jackMean - j, 3);
            denominator += Math.pow(jackMean - j, 2);
        }
        const acceleration = denominator > 0 ? numerator / (6 * Math.pow(denominator, 1.5)) : 0;
        // Adjust percentiles
        const alpha = 1 - this.confidenceLevel;
        const zAlphaLower = this.normalQuantile(alpha / 2);
        const zAlphaUpper = this.normalQuantile(1 - alpha / 2);
        const adjustedLower = this.normalCDF(z0 + (z0 + zAlphaLower) / (1 - acceleration * (z0 + zAlphaLower)));
        const adjustedUpper = this.normalCDF(z0 + (z0 + zAlphaUpper) / (1 - acceleration * (z0 + zAlphaUpper)));
        const lowerIdx = Math.max(0, Math.floor(adjustedLower * this.iterations));
        const upperIdx = Math.min(this.iterations - 1, Math.floor(adjustedUpper * this.iterations));
        const standardError = this.calculateStdDev(bootstrapStats);
        const bias = this.calculateMean(bootstrapStats) - estimate;
        return {
            estimate,
            lower: bootstrapStats[lowerIdx],
            upper: bootstrapStats[upperIdx],
            confidenceLevel: this.confidenceLevel,
            method: 'bca',
            iterations: this.iterations,
            standardError,
            bias,
            acceleration,
        };
    }
    /**
     * Calculate stratified bootstrap CI
     *
     * Use when samples come from different populations (e.g., different document types).
     */
    stratifiedCI(data, strata, statistic) {
        if (data.length !== strata.length) {
            throw new Error('Data and strata must have equal length');
        }
        const estimate = statistic(data);
        const bootstrapStats = [];
        // Group by strata
        const groups = new Map();
        for (let i = 0; i < data.length; i++) {
            const stratum = strata[i];
            if (!groups.has(stratum)) {
                groups.set(stratum, []);
            }
            groups.get(stratum).push(data[i]);
        }
        // Stratified resampling
        for (let i = 0; i < this.iterations; i++) {
            const resample = [];
            for (const [, stratumData] of groups) {
                resample.push(...this.resample(stratumData));
            }
            bootstrapStats.push(statistic(resample));
        }
        bootstrapStats.sort((a, b) => a - b);
        const alpha = 1 - this.confidenceLevel;
        const lowerIdx = Math.floor((alpha / 2) * this.iterations);
        const upperIdx = Math.floor((1 - alpha / 2) * this.iterations);
        const standardError = this.calculateStdDev(bootstrapStats);
        return {
            estimate,
            lower: bootstrapStats[lowerIdx],
            upper: bootstrapStats[upperIdx],
            confidenceLevel: this.confidenceLevel,
            method: 'stratified',
            iterations: this.iterations,
            standardError,
        };
    }
    /**
     * Calculate CIs for all standard metrics from classification data
     */
    calculateMetricCIs(sample) {
        const { predictions, groundTruth } = sample;
        // Convert to indices for resampling
        const indices = Array.from({ length: predictions.length }, (_, i) => i);
        // Sensitivity CI
        const sensitivity = this.bcaCI(indices, (idxs) => {
            let tp = 0, fn = 0;
            for (const i of idxs) {
                if (groundTruth[i]) {
                    if (predictions[i])
                        tp++;
                    else
                        fn++;
                }
            }
            return tp + fn > 0 ? tp / (tp + fn) : 0;
        });
        // Precision CI
        const precision = this.bcaCI(indices, (idxs) => {
            let tp = 0, fp = 0;
            for (const i of idxs) {
                if (predictions[i]) {
                    if (groundTruth[i])
                        tp++;
                    else
                        fp++;
                }
            }
            return tp + fp > 0 ? tp / (tp + fp) : 0;
        });
        // F1 Score CI
        const f1Score = this.bcaCI(indices, (idxs) => {
            let tp = 0, fp = 0, fn = 0;
            for (const i of idxs) {
                if (predictions[i] && groundTruth[i])
                    tp++;
                else if (predictions[i] && !groundTruth[i])
                    fp++;
                else if (!predictions[i] && groundTruth[i])
                    fn++;
            }
            const p = tp + fp > 0 ? tp / (tp + fp) : 0;
            const r = tp + fn > 0 ? tp / (tp + fn) : 0;
            return p + r > 0 ? 2 * p * r / (p + r) : 0;
        });
        // F2 Score CI
        const f2Score = this.bcaCI(indices, (idxs) => {
            let tp = 0, fp = 0, fn = 0;
            for (const i of idxs) {
                if (predictions[i] && groundTruth[i])
                    tp++;
                else if (predictions[i] && !groundTruth[i])
                    fp++;
                else if (!predictions[i] && groundTruth[i])
                    fn++;
            }
            const p = tp + fp > 0 ? tp / (tp + fp) : 0;
            const r = tp + fn > 0 ? tp / (tp + fn) : 0;
            return 4 * p + r > 0 ? 5 * p * r / (4 * p + r) : 0;
        });
        return { sensitivity, precision, f1Score, f2Score };
    }
    /**
     * Compare two systems and calculate CI for the difference
     */
    compareSystems(predictionsA, predictionsB, groundTruth, metric) {
        const indices = Array.from({ length: groundTruth.length }, (_, i) => i);
        const metricFn = (preds, gt, idxs) => {
            let tp = 0, fp = 0, fn = 0;
            for (const i of idxs) {
                if (preds[i] && gt[i])
                    tp++;
                else if (preds[i] && !gt[i])
                    fp++;
                else if (!preds[i] && gt[i])
                    fn++;
            }
            switch (metric) {
                case 'sensitivity':
                    return tp + fn > 0 ? tp / (tp + fn) : 0;
                case 'precision':
                    return tp + fp > 0 ? tp / (tp + fp) : 0;
                case 'f1': {
                    const p = tp + fp > 0 ? tp / (tp + fp) : 0;
                    const r = tp + fn > 0 ? tp / (tp + fn) : 0;
                    return p + r > 0 ? 2 * p * r / (p + r) : 0;
                }
            }
        };
        return this.bcaCI(indices, (idxs) => {
            const scoreA = metricFn(predictionsA, groundTruth, idxs);
            const scoreB = metricFn(predictionsB, groundTruth, idxs);
            return scoreA - scoreB;
        });
    }
    // ============================================================================
    // Helper functions
    // ============================================================================
    resample(data) {
        const n = data.length;
        const result = [];
        for (let i = 0; i < n; i++) {
            const idx = Math.floor(this.rng() * n);
            result.push(data[idx]);
        }
        return result;
    }
    calculateMean(arr) {
        if (arr.length === 0)
            return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
    calculateStdDev(arr) {
        if (arr.length < 2)
            return 0;
        const mean = this.calculateMean(arr);
        const variance = arr.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (arr.length - 1);
        return Math.sqrt(variance);
    }
    normalQuantile(p) {
        // Approximation using Acklam's algorithm
        if (p <= 0)
            return -Infinity;
        if (p >= 1)
            return Infinity;
        const a = [
            -3.969683028665376e+01,
            2.209460984245205e+02,
            -2.759285104469687e+02,
            1.383577518672690e+02,
            -3.066479806614716e+01,
            2.506628277459239e+00,
        ];
        const b = [
            -5.447609879822406e+01,
            1.615858368580409e+02,
            -1.556989798598866e+02,
            6.680131188771972e+01,
            -1.328068155288572e+01,
        ];
        const c = [
            -7.784894002430293e-03,
            -3.223964580411365e-01,
            -2.400758277161838e+00,
            -2.549732539343734e+00,
            4.374664141464968e+00,
            2.938163982698783e+00,
        ];
        const d = [
            7.784695709041462e-03,
            3.224671290700398e-01,
            2.445134137142996e+00,
            3.754408661907416e+00,
        ];
        const pLow = 0.02425;
        const pHigh = 1 - pLow;
        let q;
        if (p < pLow) {
            q = Math.sqrt(-2 * Math.log(p));
            return ((((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
                ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1));
        }
        else if (p <= pHigh) {
            q = p - 0.5;
            const r = q * q;
            return (((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
                (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1));
        }
        else {
            q = Math.sqrt(-2 * Math.log(1 - p));
            return (-(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
                ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1));
        }
    }
    normalCDF(x) {
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;
        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x) / Math.sqrt(2);
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 -
            ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        return 0.5 * (1.0 + sign * y);
    }
    createSeededRNG(seed) {
        let state = seed;
        return () => {
            state = (state * 1103515245 + 12345) & 0x7fffffff;
            return state / 0x7fffffff;
        };
    }
    /**
     * Generate summary report
     */
    static summarize(cis) {
        const lines = [];
        lines.push('╔══════════════════════════════════════════════════════════════╗');
        lines.push('║           BOOTSTRAP CONFIDENCE INTERVALS                      ║');
        lines.push('╚══════════════════════════════════════════════════════════════╝');
        lines.push('');
        lines.push('┌─────────────────┬───────────┬───────────────────────┬────────┐');
        lines.push('│ Metric          │ Estimate  │ 95% CI                │ SE     │');
        lines.push('├─────────────────┼───────────┼───────────────────────┼────────┤');
        for (const [name, ci] of Object.entries(cis)) {
            if (!ci)
                continue;
            const metricName = name.padEnd(15);
            const estimate = (ci.estimate * 100).toFixed(2).padStart(8) + '%';
            const ciRange = `[${(ci.lower * 100).toFixed(1)}%, ${(ci.upper * 100).toFixed(1)}%]`.padEnd(21);
            const se = (ci.standardError * 100).toFixed(2).padStart(6) + '%';
            lines.push(`│ ${metricName} │${estimate} │ ${ciRange} │${se} │`);
        }
        lines.push('└─────────────────┴───────────┴───────────────────────┴────────┘');
        return lines.join('\n');
    }
}
exports.BootstrapCI = BootstrapCI;
/**
 * Create bootstrap CI calculator
 */
function createBootstrapCI(options) {
    return new BootstrapCI(options);
}
//# sourceMappingURL=BootstrapCI.js.map