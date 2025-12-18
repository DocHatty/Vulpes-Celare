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

import * as crypto from "crypto";

/**
 * Privacy budget presets for common use cases
 *
 * Epsilon values based on industry standards:
 * - Apple: 1-8 (local DP)
 * - Google: 0.5-14 (Chrome RAPPOR)
 * - US Census: 0.5-2.0 (strict demographic data)
 */
export type PrivacyPreset =
  | "strict"       // ε = 0.1  - Maximum privacy, significant noise
  | "balanced"     // ε = 1.0  - Balanced privacy/utility
  | "research"     // ε = 3.0  - Research-grade, moderate noise
  | "analytics"    // ε = 8.0  - Analytics-grade, low noise
  | "custom";      // User-defined epsilon

/**
 * Privacy preset configurations
 */
export const PRIVACY_PRESETS: Record<Exclude<PrivacyPreset, "custom">, DifferentialPrivacyConfig> = {
  strict: {
    epsilon: 0.1,
    delta: 1e-7,
    description: "Maximum privacy - Strong theoretical guarantees, significant utility loss",
  },
  balanced: {
    epsilon: 1.0,
    delta: 1e-6,
    description: "Balanced - Standard DP guarantee with reasonable utility",
  },
  research: {
    epsilon: 3.0,
    delta: 1e-5,
    description: "Research-grade - Suitable for academic publications",
  },
  analytics: {
    epsilon: 8.0,
    delta: 1e-4,
    description: "Analytics - Minimal noise for internal metrics, weaker guarantees",
  },
};

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
export class DifferentialPrivacy {
  private config: Required<DifferentialPrivacyConfig>;
  private budgetSpent: number = 0;
  private rng: () => number;

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
  constructor(config: DifferentialPrivacyConfig) {
    this.config = {
      epsilon: config.epsilon,
      delta: config.delta ?? 1e-6,
      description: config.description ?? `ε=${config.epsilon} differential privacy`,
      seed: config.seed ?? undefined as any,
    };

    // Initialize RNG (seeded for testing, crypto-secure for production)
    if (config.seed !== undefined) {
      this.rng = this.createSeededRNG(config.seed);
    } else {
      this.rng = this.createSecureRNG();
    }

    this.validateConfig();
  }

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
  static fromPreset(preset: Exclude<PrivacyPreset, "custom">): DifferentialPrivacy {
    return new DifferentialPrivacy(PRIVACY_PRESETS[preset]);
  }

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
  addLaplaceNoise(value: number, sensitivity: number): NoisyStatistic {
    const scale = sensitivity / this.config.epsilon;
    const noise = this.sampleLaplace(scale);
    const noisy = value + noise;

    this.budgetSpent += this.config.epsilon;

    return {
      original: value,
      noisy,
      noiseAdded: noise,
      sensitivity,
      epsilon: this.config.epsilon,
      scale,
      guarantee: `ε=${this.config.epsilon}-differentially private`,
    };
  }

  /**
   * Add Gaussian noise (for (ε,δ)-DP with δ > 0)
   *
   * The Gaussian mechanism provides (ε,δ)-DP with σ = Δf * √(2ln(1.25/δ)) / ε
   *
   * @param value - The true value to protect
   * @param sensitivity - Maximum change from one individual (Δf)
   * @returns Noisy value with privacy metadata
   */
  addGaussianNoise(value: number, sensitivity: number): NoisyStatistic {
    const sigma =
      (sensitivity * Math.sqrt(2 * Math.log(1.25 / this.config.delta))) /
      this.config.epsilon;

    const noise = this.sampleGaussian(sigma);
    const noisy = value + noise;

    this.budgetSpent += this.config.epsilon;

    return {
      original: value,
      noisy,
      noiseAdded: noise,
      sensitivity,
      epsilon: this.config.epsilon,
      scale: sigma,
      guarantee: `(ε=${this.config.epsilon}, δ=${this.config.delta})-differentially private`,
    };
  }

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
  privatizeRedactionStats(
    stats: {
      documentsProcessed: number;
      totalRedactions: number;
      byType: Record<string, number>;
    },
    totalBudget?: number
  ): DPRedactionStats {
    const budget = totalBudget ?? this.config.epsilon * 10;
    const numQueries = 2 + Object.keys(stats.byType).length;
    const perQueryEpsilon = budget / numQueries;

    // Temporarily adjust epsilon for budget distribution
    const originalEpsilon = this.config.epsilon;
    this.config.epsilon = perQueryEpsilon;

    const result: DPRedactionStats = {
      documentsProcessed: this.addLaplaceNoise(stats.documentsProcessed, 1),
      totalRedactions: this.addLaplaceNoise(stats.totalRedactions, 1),
      redactionsByType: {},
      budgetSpent: budget,
      budgetRemaining: Math.max(0, totalBudget ? totalBudget - budget : 0),
      timestamp: new Date().toISOString(),
    };

    for (const [type, count] of Object.entries(stats.byType)) {
      result.redactionsByType[type] = this.addLaplaceNoise(count, 1);
    }

    // Restore original epsilon
    this.config.epsilon = originalEpsilon;

    return result;
  }

  /**
   * Compute confidence interval for noisy statistic
   *
   * @param stat - Noisy statistic
   * @param confidence - Confidence level (0.95 = 95%)
   * @returns [lower, upper] bounds
   */
  computeConfidenceInterval(
    stat: NoisyStatistic,
    confidence: number = 0.95
  ): [number, number] {
    // For Laplace distribution, the quantile function is:
    // Q(p) = μ - b * sign(p - 0.5) * ln(1 - 2|p - 0.5|)
    const alpha = 1 - confidence;
    const quantile = -stat.scale * Math.log(alpha);

    return [stat.noisy - quantile, stat.noisy + quantile];
  }

  /**
   * Get current privacy budget status
   */
  getBudgetStatus(): {
    spent: number;
    epsilon: number;
    delta: number;
    queriesPerformed: number;
  } {
    return {
      spent: this.budgetSpent,
      epsilon: this.config.epsilon,
      delta: this.config.delta,
      queriesPerformed: Math.floor(this.budgetSpent / this.config.epsilon),
    };
  }

  /**
   * Reset privacy budget (use with caution - may violate privacy guarantees)
   */
  resetBudget(): void {
    this.budgetSpent = 0;
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<Required<DifferentialPrivacyConfig>> {
    return { ...this.config };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Validate configuration parameters
   */
  private validateConfig(): void {
    if (this.config.epsilon <= 0) {
      throw new Error("Epsilon must be positive");
    }
    if (this.config.delta < 0 || this.config.delta >= 1) {
      throw new Error("Delta must be in [0, 1)");
    }
  }

  /**
   * Sample from Laplace distribution with scale b
   *
   * Lap(0, b) = -b * sign(u - 0.5) * ln(1 - 2|u - 0.5|)
   * where u ~ Uniform(0, 1)
   */
  private sampleLaplace(scale: number): number {
    const u = this.rng() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  /**
   * Sample from Gaussian distribution with mean 0 and std sigma
   * Using Box-Muller transform
   */
  private sampleGaussian(sigma: number): number {
    const u1 = this.rng();
    const u2 = this.rng();

    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * sigma;
  }

  /**
   * Create seeded RNG for reproducibility (testing)
   */
  private createSeededRNG(seed: number): () => number {
    // Simple xorshift32 PRNG
    let state = seed;
    return () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }

  /**
   * Create cryptographically secure RNG (production)
   */
  private createSecureRNG(): () => number {
    return () => {
      const bytes = crypto.randomBytes(4);
      return bytes.readUInt32BE(0) / 4294967296;
    };
  }
}

/**
 * Privacy-preserving histogram for categorical data
 *
 * Uses randomized response for local differential privacy on categorical queries.
 */
export class DPHistogram {
  private counts: Map<string, number> = new Map();
  private epsilon: number;
  private rng: () => number;

  constructor(epsilon: number = 1.0, seed?: number) {
    this.epsilon = epsilon;

    // Use seeded RNG for testing, crypto-secure for production
    if (seed !== undefined) {
      let state = seed;
      this.rng = () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 4294967296;
      };
    } else {
      this.rng = () => {
        const bytes = crypto.randomBytes(4);
        return bytes.readUInt32BE(0) / 4294967296;
      };
    }
  }

  /**
   * Add an item with randomized response
   *
   * With probability p = e^ε / (e^ε + k - 1), report true value
   * Otherwise, report a random category uniformly
   */
  add(item: string, categories: string[]): void {
    const k = categories.length;
    const p = Math.exp(this.epsilon) / (Math.exp(this.epsilon) + k - 1);

    const reportedItem =
      this.rng() < p
        ? item
        : categories[Math.floor(this.rng() * k)];

    this.counts.set(reportedItem, (this.counts.get(reportedItem) ?? 0) + 1);
  }

  /**
   * Get estimated counts (corrected for noise)
   */
  getEstimatedCounts(categories: string[], totalItems: number): Map<string, number> {
    const k = categories.length;
    const p = Math.exp(this.epsilon) / (Math.exp(this.epsilon) + k - 1);
    const q = 1 / k;

    const estimated = new Map<string, number>();

    for (const cat of categories) {
      const observed = this.counts.get(cat) ?? 0;
      // Unbiased estimator: n_est = (n_obs - n*q) / (p - q)
      const est = Math.max(0, (observed - totalItems * q) / (p - q));
      estimated.set(cat, Math.round(est));
    }

    return estimated;
  }

  /**
   * Get raw (noisy) counts
   */
  getRawCounts(): Map<string, number> {
    return new Map(this.counts);
  }
}

/**
 * Privacy accountant for tracking cumulative privacy loss
 *
 * Implements basic composition theorems for tracking epsilon across queries.
 */
export class PrivacyAccountant {
  private queries: Array<{ epsilon: number; delta: number; timestamp: Date }> =
    [];
  private maxBudget: number;

  constructor(maxBudget: number = 10) {
    this.maxBudget = maxBudget;
  }

  /**
   * Record a query and its privacy cost
   */
  recordQuery(epsilon: number, delta: number = 0): boolean {
    const newTotal = this.getTotalEpsilon() + epsilon;

    if (newTotal > this.maxBudget) {
      return false; // Budget exceeded
    }

    this.queries.push({
      epsilon,
      delta,
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Get total epsilon spent (basic composition)
   */
  getTotalEpsilon(): number {
    return this.queries.reduce((sum, q) => sum + q.epsilon, 0);
  }

  /**
   * Get advanced composition bound (tighter for many queries)
   *
   * ε_total ≤ √(2k ln(1/δ)) * ε + k * ε * (e^ε - 1)
   */
  getAdvancedComposition(delta: number): number {
    const k = this.queries.length;
    if (k === 0) return 0;

    const avgEpsilon = this.getTotalEpsilon() / k;

    const term1 = Math.sqrt(2 * k * Math.log(1 / delta)) * avgEpsilon;
    const term2 = k * avgEpsilon * (Math.exp(avgEpsilon) - 1);

    return term1 + term2;
  }

  /**
   * Get remaining budget
   */
  getRemainingBudget(): number {
    return Math.max(0, this.maxBudget - this.getTotalEpsilon());
  }

  /**
   * Get query history
   */
  getHistory(): ReadonlyArray<{ epsilon: number; delta: number; timestamp: Date }> {
    return [...this.queries];
  }

  /**
   * Reset accountant (use with caution)
   */
  reset(): void {
    this.queries = [];
  }
}

/**
 * Convenience function to create DP instance from preset
 */
export function createDifferentialPrivacy(
  presetOrConfig: Exclude<PrivacyPreset, "custom"> | DifferentialPrivacyConfig
): DifferentialPrivacy {
  if (typeof presetOrConfig === "string") {
    return DifferentialPrivacy.fromPreset(presetOrConfig);
  }
  return new DifferentialPrivacy(presetOrConfig);
}
