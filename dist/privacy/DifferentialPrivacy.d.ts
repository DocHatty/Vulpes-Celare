/**
 * VULPES CELARE - DIFFERENTIAL PRIVACY
 *
 * Mathematical privacy guarantees using the Laplace mechanism.
 * Enables epsilon-differential privacy for aggregate statistics and
 * privacy-preserving redaction analytics.
 *
 * @module privacy/DifferentialPrivacy
 *
 * @example
 * ```typescript
 * import { DifferentialPrivacy, PrivacyPreset } from 'vulpes-celare';
 *
 * // Create privacy-preserving statistics
 * const dp = new DifferentialPrivacy({ epsilon: 1.0 });
 *
 * // Add noise to redaction count (sensitivity = 1 for counts)
 * const noisyCount = dp.addLaplaceNoise(actualCount, 1);
 *
 * // Use presets for common scenarios
 * const strictDP = DifferentialPrivacy.fromPreset('strict');
 * const researchDP = DifferentialPrivacy.fromPreset('research');
 * ```
 *
 * @see https://en.wikipedia.org/wiki/Differential_privacy
 * @see https://journalprivacyconfidentiality.org/index.php/jpc/article/view/405
 */
/**
 * Privacy budget presets for common use cases
 *
 * Epsilon values based on industry standards:
 * - Apple: 1-8 (local DP)
 * - Google: 0.5-14 (Chrome RAPPOR)
 * - US Census: 0.5-2.0 (strict demographic data)
 */
export type PrivacyPreset = "strict" | "balanced" | "research" | "analytics" | "custom";
/**
 * Privacy preset configurations
 */
export declare const PRIVACY_PRESETS: Record<Exclude<PrivacyPreset, "custom">, DifferentialPrivacyConfig>;
/**
 * Configuration for differential privacy
 */
export interface DifferentialPrivacyConfig {
    /** Privacy budget (smaller = more private) */
    epsilon: number;
    /** Failure probability for (ε,δ)-DP (default: 1e-6) */
    delta?: number;
    /** Human-readable description */
    description?: string;
    /** Seed for reproducible noise (for testing) */
    seed?: number;
}
/**
 * Noisy statistic result with privacy metadata
 */
export interface NoisyStatistic {
    /** Original value (not exposed in production) */
    original: number;
    /** Value with noise added */
    noisy: number;
    /** Noise that was added */
    noiseAdded: number;
    /** Sensitivity used */
    sensitivity: number;
    /** Epsilon used */
    epsilon: number;
    /** Scale parameter (b = sensitivity/epsilon) */
    scale: number;
    /** Privacy guarantee description */
    guarantee: string;
}
/**
 * Aggregate statistics with differential privacy
 */
export interface DPRedactionStats {
    /** Total documents processed (noisy) */
    documentsProcessed: NoisyStatistic;
    /** Total PHI elements redacted (noisy) */
    totalRedactions: NoisyStatistic;
    /** Redactions by PHI type (noisy) */
    redactionsByType: Record<string, NoisyStatistic>;
    /** Privacy budget spent */
    budgetSpent: number;
    /** Privacy budget remaining */
    budgetRemaining: number;
    /** Timestamp */
    timestamp: string;
}
/**
 * DifferentialPrivacy - Laplace mechanism for privacy-preserving analytics
 *
 * Provides mathematically-grounded privacy guarantees for aggregate statistics.
 * The Laplace mechanism adds calibrated noise to query results, ensuring
 * (ε, δ)-differential privacy.
 */
export declare class DifferentialPrivacy {
    private config;
    private budgetSpent;
    private rng;
    /**
     * Create a new DifferentialPrivacy instance
     *
     * @param config - Privacy configuration
     *
     * @example
     * ```typescript
     * const dp = new DifferentialPrivacy({ epsilon: 1.0 });
     * ```
     */
    constructor(config: DifferentialPrivacyConfig);
    /**
     * Create instance from preset
     *
     * @param preset - Privacy preset name
     * @returns DifferentialPrivacy instance
     *
     * @example
     * ```typescript
     * const dp = DifferentialPrivacy.fromPreset('balanced');
     * ```
     */
    static fromPreset(preset: Exclude<PrivacyPreset, "custom">): DifferentialPrivacy;
    /**
     * Add Laplace noise to a numeric value
     *
     * The Laplace mechanism adds noise drawn from Lap(0, Δf/ε) where:
     * - Δf is the sensitivity (max change from one individual)
     * - ε is the privacy parameter
     *
     * @param value - The true value to protect
     * @param sensitivity - Maximum change from one individual (Δf)
     * @returns Noisy value with privacy metadata
     *
     * @example
     * ```typescript
     * // For count queries, sensitivity is 1
     * const noisyCount = dp.addLaplaceNoise(100, 1);
     *
     * // For sum queries on bounded data [0, max], sensitivity is max
     * const noisySum = dp.addLaplaceNoise(totalAge, 120);
     * ```
     */
    addLaplaceNoise(value: number, sensitivity: number): NoisyStatistic;
    /**
     * Add Gaussian noise (for (ε,δ)-DP with δ > 0)
     *
     * The Gaussian mechanism provides (ε,δ)-DP with σ = Δf * √(2ln(1.25/δ)) / ε
     *
     * @param value - The true value to protect
     * @param sensitivity - Maximum change from one individual (Δf)
     * @returns Noisy value with privacy metadata
     */
    addGaussianNoise(value: number, sensitivity: number): NoisyStatistic;
    /**
     * Generate private redaction statistics
     *
     * @param stats - Raw statistics to privatize
     * @returns Differentially private statistics
     *
     * @example
     * ```typescript
     * const rawStats = {
     *   documentsProcessed: 1000,
     *   totalRedactions: 5000,
     *   byType: { NAME: 2000, SSN: 500, ... }
     * };
     *
     * const privateStats = dp.privatizeRedactionStats(rawStats, 10);
     * ```
     */
    privatizeRedactionStats(stats: {
        documentsProcessed: number;
        totalRedactions: number;
        byType: Record<string, number>;
    }, totalBudget?: number): DPRedactionStats;
    /**
     * Compute confidence interval for noisy statistic
     *
     * @param stat - Noisy statistic
     * @param confidence - Confidence level (0.95 = 95%)
     * @returns [lower, upper] bounds
     */
    computeConfidenceInterval(stat: NoisyStatistic, confidence?: number): [number, number];
    /**
     * Get current privacy budget status
     */
    getBudgetStatus(): {
        spent: number;
        epsilon: number;
        delta: number;
        queriesPerformed: number;
    };
    /**
     * Reset privacy budget (use with caution - may violate privacy guarantees)
     */
    resetBudget(): void;
    /**
     * Get configuration
     */
    getConfig(): Readonly<Required<DifferentialPrivacyConfig>>;
    /**
     * Validate configuration parameters
     */
    private validateConfig;
    /**
     * Sample from Laplace distribution with scale b
     *
     * Lap(0, b) = -b * sign(u - 0.5) * ln(1 - 2|u - 0.5|)
     * where u ~ Uniform(0, 1)
     */
    private sampleLaplace;
    /**
     * Sample from Gaussian distribution with mean 0 and std sigma
     * Using Box-Muller transform
     */
    private sampleGaussian;
    /**
     * Create seeded RNG for reproducibility (testing)
     */
    private createSeededRNG;
    /**
     * Create cryptographically secure RNG (production)
     */
    private createSecureRNG;
}
/**
 * Privacy-preserving histogram for categorical data
 *
 * Uses randomized response for local differential privacy on categorical queries.
 */
export declare class DPHistogram {
    private counts;
    private epsilon;
    private rng;
    constructor(epsilon?: number, seed?: number);
    /**
     * Add an item with randomized response
     *
     * With probability p = e^ε / (e^ε + k - 1), report true value
     * Otherwise, report a random category uniformly
     */
    add(item: string, categories: string[]): void;
    /**
     * Get estimated counts (corrected for noise)
     */
    getEstimatedCounts(categories: string[], totalItems: number): Map<string, number>;
    /**
     * Get raw (noisy) counts
     */
    getRawCounts(): Map<string, number>;
}
/**
 * Privacy accountant for tracking cumulative privacy loss
 *
 * Implements basic composition theorems for tracking epsilon across queries.
 */
export declare class PrivacyAccountant {
    private queries;
    private maxBudget;
    constructor(maxBudget?: number);
    /**
     * Record a query and its privacy cost
     */
    recordQuery(epsilon: number, delta?: number): boolean;
    /**
     * Get total epsilon spent (basic composition)
     */
    getTotalEpsilon(): number;
    /**
     * Get advanced composition bound (tighter for many queries)
     *
     * ε_total ≤ √(2k ln(1/δ)) * ε + k * ε * (e^ε - 1)
     */
    getAdvancedComposition(delta: number): number;
    /**
     * Get remaining budget
     */
    getRemainingBudget(): number;
    /**
     * Get query history
     */
    getHistory(): ReadonlyArray<{
        epsilon: number;
        delta: number;
        timestamp: Date;
    }>;
    /**
     * Reset accountant (use with caution)
     */
    reset(): void;
}
/**
 * Convenience function to create DP instance from preset
 */
export declare function createDifferentialPrivacy(presetOrConfig: Exclude<PrivacyPreset, "custom"> | DifferentialPrivacyConfig): DifferentialPrivacy;
//# sourceMappingURL=DifferentialPrivacy.d.ts.map