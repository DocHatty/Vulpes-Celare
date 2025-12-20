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
import { SpanAttributes } from "./VulpesTracer";
/**
 * Sampling decision result
 */
export interface SamplingDecision {
    /** Whether to sample this span */
    shouldSample: boolean;
    /** Reason for the decision */
    reason: SamplingReason;
    /** Priority boost (for tail-based sampling) */
    priority?: number;
    /** Additional attributes to add to sampled spans */
    attributes?: SpanAttributes;
}
/**
 * Reasons for sampling decisions
 */
export type SamplingReason = "rate_limit" | "random" | "error" | "slow" | "important" | "parent_sampled" | "always" | "never" | "adaptive" | "debug";
/**
 * Sampler interface
 */
export interface Sampler {
    /** Make a sampling decision */
    shouldSample(context: SamplingContext): SamplingDecision;
    /** Get sampler description */
    getDescription(): string;
}
/**
 * Context for sampling decisions
 */
export interface SamplingContext {
    /** Span name */
    spanName: string;
    /** Span attributes (if available) */
    attributes?: SpanAttributes;
    /** Parent trace context (if available) */
    parentContext?: {
        traceId: string;
        spanId: string;
        sampled: boolean;
    };
    /** Operation kind (server, client, internal, producer, consumer) */
    kind?: string;
    /** Links to other spans */
    links?: Array<{
        traceId: string;
        spanId: string;
    }>;
}
/**
 * Simple rate-based sampler (uniform random sampling)
 */
export declare class RateSampler implements Sampler {
    private readonly rate;
    constructor(rate: number);
    shouldSample(_context: SamplingContext): SamplingDecision;
    getDescription(): string;
}
/**
 * Parent-based sampler that respects parent's sampling decision
 */
export declare class ParentBasedSampler implements Sampler {
    private readonly rootSampler;
    constructor(options: {
        root: Sampler;
    });
    shouldSample(context: SamplingContext): SamplingDecision;
    getDescription(): string;
}
/**
 * Always sample
 */
export declare class AlwaysSampler implements Sampler {
    shouldSample(_context: SamplingContext): SamplingDecision;
    getDescription(): string;
}
/**
 * Never sample
 */
export declare class NeverSampler implements Sampler {
    shouldSample(_context: SamplingContext): SamplingDecision;
    getDescription(): string;
}
/**
 * Samples all errors plus a percentage of successful operations
 */
export declare class ErrorBiasedSampler implements Sampler {
    private readonly baseSampler;
    constructor(baseRate?: number);
    shouldSample(context: SamplingContext): SamplingDecision;
    getDescription(): string;
}
/**
 * Samples slow operations above a threshold
 */
export declare class LatencyBasedSampler implements Sampler {
    private readonly thresholdMs;
    private readonly baseSampler;
    constructor(thresholdMs: number, baseRate?: number);
    shouldSample(context: SamplingContext): SamplingDecision;
    /**
     * Re-evaluate sampling after span ends (tail-based)
     */
    shouldRetain(durationMs: number): boolean;
    getDescription(): string;
}
/**
 * Dynamically adjusts sampling rate based on throughput
 */
export declare class AdaptiveSampler implements Sampler {
    private readonly targetSpansPerSecond;
    private readonly minRate;
    private readonly maxRate;
    private readonly windowMs;
    private currentRate;
    private spanCounts;
    private lastAdjustment;
    constructor(options?: {
        targetSpansPerSecond?: number;
        minRate?: number;
        maxRate?: number;
        windowMs?: number;
    });
    shouldSample(_context: SamplingContext): SamplingDecision;
    private recordSpan;
    private maybeAdjustRate;
    getCurrentRate(): number;
    getDescription(): string;
}
/**
 * Rule for span matching
 */
export interface SamplingRule {
    /** Rule name for debugging */
    name: string;
    /** Span name pattern (regex or exact match) */
    spanNamePattern?: RegExp | string;
    /** Required attributes */
    attributes?: Record<string, string | number | boolean | RegExp>;
    /** Sampler to use if rule matches */
    sampler: Sampler;
}
/**
 * Rule-based sampler that applies different strategies based on span attributes
 */
export declare class RuleBasedSampler implements Sampler {
    private readonly rules;
    private readonly defaultSampler;
    constructor(rules: SamplingRule[], defaultSampler?: Sampler);
    shouldSample(context: SamplingContext): SamplingDecision;
    private matchesRule;
    getDescription(): string;
}
/**
 * Combines multiple samplers (OR logic - sample if any sampler says yes)
 */
export declare class CompositeSampler implements Sampler {
    private readonly samplers;
    private readonly mode;
    constructor(samplers: Sampler[], mode?: "any" | "all");
    shouldSample(context: SamplingContext): SamplingDecision;
    getDescription(): string;
}
/**
 * PHI-aware sampler that ensures important PHI detection spans are sampled
 */
export declare class PHIAwareSampler implements Sampler {
    private readonly baseSampler;
    private readonly importantPHITypes;
    constructor(baseRate?: number, importantPHITypes?: string[]);
    shouldSample(context: SamplingContext): SamplingDecision;
    getDescription(): string;
}
/**
 * Create a default smart sampler for Vulpes
 */
export declare function createDefaultSampler(options?: {
    baseRate?: number;
    targetRps?: number;
    slowThresholdMs?: number;
}): Sampler;
//# sourceMappingURL=SmartSampler.d.ts.map