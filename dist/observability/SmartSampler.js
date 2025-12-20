"use strict";
/**
 * Smart Sampling Strategies for VulpesTracer
 *
 * Provides intelligent sampling strategies to balance observability with performance:
 * - Rate-based sampling (uniform random)
 * - Error-biased sampling (always sample errors)
 * - Latency-based sampling (sample slow operations)
 * - Adaptive sampling (adjusts based on throughput)
 * - Head-based and tail-based sampling
 *
 * @module observability/SmartSampler
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PHIAwareSampler = exports.CompositeSampler = exports.RuleBasedSampler = exports.AdaptiveSampler = exports.LatencyBasedSampler = exports.ErrorBiasedSampler = exports.NeverSampler = exports.AlwaysSampler = exports.ParentBasedSampler = exports.RateSampler = void 0;
exports.createDefaultSampler = createDefaultSampler;
// ============================================================================
// Rate-Based Sampler
// ============================================================================
/**
 * Simple rate-based sampler (uniform random sampling)
 */
class RateSampler {
    rate;
    constructor(rate) {
        if (rate < 0 || rate > 1) {
            throw new Error("Sampling rate must be between 0 and 1");
        }
        this.rate = rate;
    }
    shouldSample(_context) {
        if (this.rate === 0) {
            return { shouldSample: false, reason: "never" };
        }
        if (this.rate === 1) {
            return { shouldSample: true, reason: "always" };
        }
        const shouldSample = Math.random() < this.rate;
        return {
            shouldSample,
            reason: "random",
            attributes: {
                "sampling.rate": this.rate,
            },
        };
    }
    getDescription() {
        return `RateSampler(${this.rate})`;
    }
}
exports.RateSampler = RateSampler;
// ============================================================================
// Parent-Based Sampler
// ============================================================================
/**
 * Parent-based sampler that respects parent's sampling decision
 */
class ParentBasedSampler {
    rootSampler;
    constructor(options) {
        this.rootSampler = options.root;
    }
    shouldSample(context) {
        if (!context.parentContext) {
            // No parent, use root sampler
            return this.rootSampler.shouldSample(context);
        }
        if (context.parentContext.sampled) {
            return {
                shouldSample: true,
                reason: "parent_sampled",
                attributes: {
                    "sampling.parent_sampled": true,
                },
            };
        }
        return { shouldSample: false, reason: "parent_sampled" };
    }
    getDescription() {
        return `ParentBasedSampler(${this.rootSampler.getDescription()})`;
    }
}
exports.ParentBasedSampler = ParentBasedSampler;
// ============================================================================
// Always/Never Samplers
// ============================================================================
/**
 * Always sample
 */
class AlwaysSampler {
    shouldSample(_context) {
        return { shouldSample: true, reason: "always" };
    }
    getDescription() {
        return "AlwaysSampler";
    }
}
exports.AlwaysSampler = AlwaysSampler;
/**
 * Never sample
 */
class NeverSampler {
    shouldSample(_context) {
        return { shouldSample: false, reason: "never" };
    }
    getDescription() {
        return "NeverSampler";
    }
}
exports.NeverSampler = NeverSampler;
// ============================================================================
// Error-Biased Sampler
// ============================================================================
/**
 * Samples all errors plus a percentage of successful operations
 */
class ErrorBiasedSampler {
    baseSampler;
    constructor(baseRate = 0.1) {
        this.baseSampler = new RateSampler(baseRate);
    }
    shouldSample(context) {
        // Check if this is an error span (based on attributes)
        const isError = context.attributes?.["error"] === true ||
            context.attributes?.["exception.type"] !== undefined ||
            context.spanName.includes("error");
        if (isError) {
            return {
                shouldSample: true,
                reason: "error",
                priority: 1.0,
                attributes: {
                    "sampling.reason": "error_biased",
                },
            };
        }
        // Use base sampler for non-errors
        return this.baseSampler.shouldSample(context);
    }
    getDescription() {
        return `ErrorBiasedSampler(${this.baseSampler.getDescription()})`;
    }
}
exports.ErrorBiasedSampler = ErrorBiasedSampler;
// ============================================================================
// Latency-Based Sampler
// ============================================================================
/**
 * Samples slow operations above a threshold
 */
class LatencyBasedSampler {
    thresholdMs;
    baseSampler;
    constructor(thresholdMs, baseRate = 0.01) {
        this.thresholdMs = thresholdMs;
        this.baseSampler = new RateSampler(baseRate);
    }
    shouldSample(context) {
        // For head-based sampling, we can't know latency yet
        // This sampler is more useful for tail-based sampling
        // At head, we sample at base rate but mark as "maybe slow"
        const baseDecision = this.baseSampler.shouldSample(context);
        return {
            ...baseDecision,
            attributes: {
                ...baseDecision.attributes,
                "sampling.latency_threshold_ms": this.thresholdMs,
            },
        };
    }
    /**
     * Re-evaluate sampling after span ends (tail-based)
     */
    shouldRetain(durationMs) {
        return durationMs > this.thresholdMs;
    }
    getDescription() {
        return `LatencyBasedSampler(>${this.thresholdMs}ms)`;
    }
}
exports.LatencyBasedSampler = LatencyBasedSampler;
// ============================================================================
// Adaptive Sampler
// ============================================================================
/**
 * Dynamically adjusts sampling rate based on throughput
 */
class AdaptiveSampler {
    targetSpansPerSecond;
    minRate;
    maxRate;
    windowMs;
    currentRate;
    spanCounts = [];
    lastAdjustment = 0;
    constructor(options = {}) {
        this.targetSpansPerSecond = options.targetSpansPerSecond ?? 100;
        this.minRate = options.minRate ?? 0.01;
        this.maxRate = options.maxRate ?? 1.0;
        this.windowMs = options.windowMs ?? 60000; // 1 minute window
        this.currentRate = this.maxRate;
    }
    shouldSample(_context) {
        // Record this sampling attempt
        this.recordSpan();
        // Periodically adjust rate
        this.maybeAdjustRate();
        const shouldSample = Math.random() < this.currentRate;
        return {
            shouldSample,
            reason: "adaptive",
            attributes: {
                "sampling.adaptive_rate": this.currentRate,
                "sampling.target_rps": this.targetSpansPerSecond,
            },
        };
    }
    recordSpan() {
        const now = Date.now();
        const currentSecond = Math.floor(now / 1000) * 1000;
        const existing = this.spanCounts.find(s => s.timestamp === currentSecond);
        if (existing) {
            existing.count++;
        }
        else {
            this.spanCounts.push({ timestamp: currentSecond, count: 1 });
        }
        // Clean old data
        const cutoff = now - this.windowMs;
        this.spanCounts = this.spanCounts.filter(s => s.timestamp > cutoff);
    }
    maybeAdjustRate() {
        const now = Date.now();
        if (now - this.lastAdjustment < 5000) {
            return; // Adjust at most every 5 seconds
        }
        this.lastAdjustment = now;
        // Calculate current throughput
        const windowSeconds = this.windowMs / 1000;
        const totalSpans = this.spanCounts.reduce((sum, s) => sum + s.count, 0);
        const currentRps = totalSpans / windowSeconds;
        if (currentRps === 0) {
            this.currentRate = this.maxRate;
            return;
        }
        // Adjust rate to meet target
        // If we're sampling 10% and getting 500 RPS when we want 100, new rate = 10% * (100/500) = 2%
        const desiredRate = this.currentRate * (this.targetSpansPerSecond / currentRps);
        this.currentRate = Math.max(this.minRate, Math.min(this.maxRate, desiredRate));
    }
    getCurrentRate() {
        return this.currentRate;
    }
    getDescription() {
        return `AdaptiveSampler(target=${this.targetSpansPerSecond}rps, current=${this.currentRate.toFixed(3)})`;
    }
}
exports.AdaptiveSampler = AdaptiveSampler;
/**
 * Rule-based sampler that applies different strategies based on span attributes
 */
class RuleBasedSampler {
    rules;
    defaultSampler;
    constructor(rules, defaultSampler = new RateSampler(0.1)) {
        this.rules = rules;
        this.defaultSampler = defaultSampler;
    }
    shouldSample(context) {
        for (const rule of this.rules) {
            if (this.matchesRule(context, rule)) {
                const decision = rule.sampler.shouldSample(context);
                return {
                    ...decision,
                    attributes: {
                        ...decision.attributes,
                        "sampling.rule": rule.name,
                    },
                };
            }
        }
        return this.defaultSampler.shouldSample(context);
    }
    matchesRule(context, rule) {
        // Check span name pattern
        if (rule.spanNamePattern) {
            const pattern = rule.spanNamePattern;
            if (typeof pattern === "string") {
                if (context.spanName !== pattern)
                    return false;
            }
            else if (!pattern.test(context.spanName)) {
                return false;
            }
        }
        // Check attributes
        if (rule.attributes && context.attributes) {
            for (const [key, expected] of Object.entries(rule.attributes)) {
                const actual = context.attributes[key];
                if (actual === undefined)
                    return false;
                if (expected instanceof RegExp) {
                    if (!expected.test(String(actual)))
                        return false;
                }
                else if (actual !== expected) {
                    return false;
                }
            }
        }
        return true;
    }
    getDescription() {
        return `RuleBasedSampler(${this.rules.length} rules)`;
    }
}
exports.RuleBasedSampler = RuleBasedSampler;
// ============================================================================
// Composite Sampler
// ============================================================================
/**
 * Combines multiple samplers (OR logic - sample if any sampler says yes)
 */
class CompositeSampler {
    samplers;
    mode;
    constructor(samplers, mode = "any") {
        this.samplers = samplers;
        this.mode = mode;
    }
    shouldSample(context) {
        const decisions = this.samplers.map(s => s.shouldSample(context));
        if (this.mode === "any") {
            const sampled = decisions.find(d => d.shouldSample);
            if (sampled) {
                return {
                    ...sampled,
                    attributes: {
                        ...sampled.attributes,
                        "sampling.composite_mode": "any",
                    },
                };
            }
            return { shouldSample: false, reason: "random" };
        }
        else {
            // All mode
            const allSampled = decisions.every(d => d.shouldSample);
            return {
                shouldSample: allSampled,
                reason: allSampled ? "always" : "random",
                attributes: {
                    "sampling.composite_mode": "all",
                },
            };
        }
    }
    getDescription() {
        return `CompositeSampler(${this.mode}, ${this.samplers.map(s => s.getDescription()).join(", ")})`;
    }
}
exports.CompositeSampler = CompositeSampler;
// ============================================================================
// PHI-Aware Sampler (Vulpes-specific)
// ============================================================================
/**
 * PHI-aware sampler that ensures important PHI detection spans are sampled
 */
class PHIAwareSampler {
    baseSampler;
    importantPHITypes;
    constructor(baseRate = 0.1, importantPHITypes = ["SSN", "CREDIT_CARD", "PASSPORT", "BIOMETRIC"]) {
        this.baseSampler = new RateSampler(baseRate);
        this.importantPHITypes = new Set(importantPHITypes.map(t => t.toUpperCase()));
    }
    shouldSample(context) {
        // Always sample important PHI types
        const phiType = context.attributes?.["vulpes.phi.type"];
        if (typeof phiType === "string" && this.importantPHITypes.has(phiType.toUpperCase())) {
            return {
                shouldSample: true,
                reason: "important",
                priority: 1.0,
                attributes: {
                    "sampling.reason": "important_phi_type",
                    "sampling.phi_type": phiType,
                },
            };
        }
        // Always sample if PHI was detected
        const phiDetected = context.attributes?.["vulpes.phi.detected"];
        if (phiDetected === true) {
            return {
                shouldSample: true,
                reason: "important",
                attributes: {
                    "sampling.reason": "phi_detected",
                },
            };
        }
        // Use base sampler for other cases
        return this.baseSampler.shouldSample(context);
    }
    getDescription() {
        return `PHIAwareSampler(important=[${Array.from(this.importantPHITypes).join(",")}])`;
    }
}
exports.PHIAwareSampler = PHIAwareSampler;
// ============================================================================
// Default Sampler Factory
// ============================================================================
/**
 * Create a default smart sampler for Vulpes
 */
function createDefaultSampler(options = {}) {
    const baseRate = options.baseRate ?? 0.1;
    const targetRps = options.targetRps ?? 100;
    const slowThresholdMs = options.slowThresholdMs ?? 100;
    return new RuleBasedSampler([
        // Always sample errors
        {
            name: "errors",
            attributes: { error: true },
            sampler: new AlwaysSampler(),
        },
        // Always sample important PHI
        {
            name: "important_phi",
            spanNamePattern: /^phi\.(filter|detection)\.(ssn|credit_card|passport)/i,
            sampler: new AlwaysSampler(),
        },
        // Sample slow operations
        {
            name: "slow_operations",
            spanNamePattern: /^phi\.redaction\.pipeline$/,
            sampler: new LatencyBasedSampler(slowThresholdMs),
        },
    ], 
    // Default: adaptive sampling
    new CompositeSampler([
        new PHIAwareSampler(baseRate),
        new AdaptiveSampler({ targetSpansPerSecond: targetRps }),
    ], "any"));
}
//# sourceMappingURL=SmartSampler.js.map