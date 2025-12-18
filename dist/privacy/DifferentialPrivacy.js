"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivacyAccountant = exports.DPHistogram = exports.DifferentialPrivacy = exports.PRIVACY_PRESETS = void 0;
exports.createDifferentialPrivacy = createDifferentialPrivacy;
const crypto = __importStar(require("crypto"));
/**
 * Privacy preset configurations
 */
exports.PRIVACY_PRESETS = {
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
 * DifferentialPrivacy - Laplace mechanism for privacy-preserving analytics
 *
 * Provides mathematically-grounded privacy guarantees for aggregate statistics.
 * The Laplace mechanism adds calibrated noise to query results, ensuring
 * (ε, δ)-differential privacy.
 */
class DifferentialPrivacy {
    config;
    budgetSpent = 0;
    rng;
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
    constructor(config) {
        this.config = {
            epsilon: config.epsilon,
            delta: config.delta ?? 1e-6,
            description: config.description ?? `ε=${config.epsilon} differential privacy`,
            seed: config.seed ?? undefined,
        };
        // Initialize RNG (seeded for testing, crypto-secure for production)
        if (config.seed !== undefined) {
            this.rng = this.createSeededRNG(config.seed);
        }
        else {
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
    static fromPreset(preset) {
        return new DifferentialPrivacy(exports.PRIVACY_PRESETS[preset]);
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
    addLaplaceNoise(value, sensitivity) {
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
    addGaussianNoise(value, sensitivity) {
        const sigma = (sensitivity * Math.sqrt(2 * Math.log(1.25 / this.config.delta))) /
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
    privatizeRedactionStats(stats, totalBudget) {
        const budget = totalBudget ?? this.config.epsilon * 10;
        const numQueries = 2 + Object.keys(stats.byType).length;
        const perQueryEpsilon = budget / numQueries;
        // Temporarily adjust epsilon for budget distribution
        const originalEpsilon = this.config.epsilon;
        this.config.epsilon = perQueryEpsilon;
        const result = {
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
    computeConfidenceInterval(stat, confidence = 0.95) {
        // For Laplace distribution, the quantile function is:
        // Q(p) = μ - b * sign(p - 0.5) * ln(1 - 2|p - 0.5|)
        const alpha = 1 - confidence;
        const quantile = -stat.scale * Math.log(alpha);
        return [stat.noisy - quantile, stat.noisy + quantile];
    }
    /**
     * Get current privacy budget status
     */
    getBudgetStatus() {
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
    resetBudget() {
        this.budgetSpent = 0;
    }
    /**
     * Get configuration
     */
    getConfig() {
        return { ...this.config };
    }
    // ============================================================================
    // PRIVATE METHODS
    // ============================================================================
    /**
     * Validate configuration parameters
     */
    validateConfig() {
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
    sampleLaplace(scale) {
        const u = this.rng() - 0.5;
        return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    }
    /**
     * Sample from Gaussian distribution with mean 0 and std sigma
     * Using Box-Muller transform
     */
    sampleGaussian(sigma) {
        const u1 = this.rng();
        const u2 = this.rng();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return z0 * sigma;
    }
    /**
     * Create seeded RNG for reproducibility (testing)
     */
    createSeededRNG(seed) {
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
    createSecureRNG() {
        return () => {
            const bytes = crypto.randomBytes(4);
            return bytes.readUInt32BE(0) / 4294967296;
        };
    }
}
exports.DifferentialPrivacy = DifferentialPrivacy;
/**
 * Privacy-preserving histogram for categorical data
 *
 * Uses randomized response for local differential privacy on categorical queries.
 */
class DPHistogram {
    counts = new Map();
    epsilon;
    rng;
    constructor(epsilon = 1.0, seed) {
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
        }
        else {
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
    add(item, categories) {
        const k = categories.length;
        const p = Math.exp(this.epsilon) / (Math.exp(this.epsilon) + k - 1);
        const reportedItem = this.rng() < p
            ? item
            : categories[Math.floor(this.rng() * k)];
        this.counts.set(reportedItem, (this.counts.get(reportedItem) ?? 0) + 1);
    }
    /**
     * Get estimated counts (corrected for noise)
     */
    getEstimatedCounts(categories, totalItems) {
        const k = categories.length;
        const p = Math.exp(this.epsilon) / (Math.exp(this.epsilon) + k - 1);
        const q = 1 / k;
        const estimated = new Map();
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
    getRawCounts() {
        return new Map(this.counts);
    }
}
exports.DPHistogram = DPHistogram;
/**
 * Privacy accountant for tracking cumulative privacy loss
 *
 * Implements basic composition theorems for tracking epsilon across queries.
 */
class PrivacyAccountant {
    queries = [];
    maxBudget;
    constructor(maxBudget = 10) {
        this.maxBudget = maxBudget;
    }
    /**
     * Record a query and its privacy cost
     */
    recordQuery(epsilon, delta = 0) {
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
    getTotalEpsilon() {
        return this.queries.reduce((sum, q) => sum + q.epsilon, 0);
    }
    /**
     * Get advanced composition bound (tighter for many queries)
     *
     * ε_total ≤ √(2k ln(1/δ)) * ε + k * ε * (e^ε - 1)
     */
    getAdvancedComposition(delta) {
        const k = this.queries.length;
        if (k === 0)
            return 0;
        const avgEpsilon = this.getTotalEpsilon() / k;
        const term1 = Math.sqrt(2 * k * Math.log(1 / delta)) * avgEpsilon;
        const term2 = k * avgEpsilon * (Math.exp(avgEpsilon) - 1);
        return term1 + term2;
    }
    /**
     * Get remaining budget
     */
    getRemainingBudget() {
        return Math.max(0, this.maxBudget - this.getTotalEpsilon());
    }
    /**
     * Get query history
     */
    getHistory() {
        return [...this.queries];
    }
    /**
     * Reset accountant (use with caution)
     */
    reset() {
        this.queries = [];
    }
}
exports.PrivacyAccountant = PrivacyAccountant;
/**
 * Convenience function to create DP instance from preset
 */
function createDifferentialPrivacy(presetOrConfig) {
    if (typeof presetOrConfig === "string") {
        return DifferentialPrivacy.fromPreset(presetOrConfig);
    }
    return new DifferentialPrivacy(presetOrConfig);
}
//# sourceMappingURL=DifferentialPrivacy.js.map