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
/**
 * Confidence interval result
 */
export interface ConfidenceInterval {
    /** Point estimate */
    estimate: number;
    /** Lower bound */
    lower: number;
    /** Upper bound */
    upper: number;
    /** Confidence level (e.g., 0.95 for 95%) */
    confidenceLevel: number;
    /** Method used */
    method: 'percentile' | 'bca' | 'stratified';
    /** Number of bootstrap iterations */
    iterations: number;
    /** Standard error estimate */
    standardError: number;
    /** Bias estimate (for BCa) */
    bias?: number;
    /** Acceleration (for BCa) */
    acceleration?: number;
}
/**
 * Multiple confidence intervals for different metrics
 */
export interface MetricCIs {
    sensitivity: ConfidenceInterval;
    precision: ConfidenceInterval;
    f1Score: ConfidenceInterval;
    f2Score: ConfidenceInterval;
    mcc?: ConfidenceInterval;
}
/**
 * Sample for bootstrap
 */
export interface BootstrapSample {
    /** Predictions (true = detected, false = missed) */
    predictions: boolean[];
    /** Ground truth labels */
    groundTruth: boolean[];
    /** Optional: strata for stratified sampling */
    strata?: string[];
}
/**
 * BootstrapCI - Confidence interval estimation
 */
export declare class BootstrapCI {
    private readonly iterations;
    private readonly confidenceLevel;
    private readonly seed;
    private rng;
    constructor(options?: {
        iterations?: number;
        confidenceLevel?: number;
        seed?: number;
    });
    /**
     * Calculate confidence interval using percentile method
     */
    percentileCI(data: number[], statistic: (sample: number[]) => number): ConfidenceInterval;
    /**
     * Calculate BCa (bias-corrected and accelerated) confidence interval
     *
     * This is the recommended method for most applications.
     */
    bcaCI(data: number[], statistic: (sample: number[]) => number): ConfidenceInterval;
    /**
     * Calculate stratified bootstrap CI
     *
     * Use when samples come from different populations (e.g., different document types).
     */
    stratifiedCI(data: number[], strata: string[], statistic: (sample: number[]) => number): ConfidenceInterval;
    /**
     * Calculate CIs for all standard metrics from classification data
     */
    calculateMetricCIs(sample: BootstrapSample): MetricCIs;
    /**
     * Compare two systems and calculate CI for the difference
     */
    compareSystems(predictionsA: boolean[], predictionsB: boolean[], groundTruth: boolean[], metric: 'sensitivity' | 'precision' | 'f1'): ConfidenceInterval;
    private resample;
    private calculateMean;
    private calculateStdDev;
    private normalQuantile;
    private normalCDF;
    private createSeededRNG;
    /**
     * Generate summary report
     */
    static summarize(cis: MetricCIs): string;
}
/**
 * Create bootstrap CI calculator
 */
export declare function createBootstrapCI(options?: {
    iterations?: number;
    confidenceLevel?: number;
    seed?: number;
}): BootstrapCI;
