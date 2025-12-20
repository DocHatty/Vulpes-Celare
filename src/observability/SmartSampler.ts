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

// ============================================================================
// Types
// ============================================================================

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
export type SamplingReason =
  | "rate_limit"
  | "random"
  | "error"
  | "slow"
  | "important"
  | "parent_sampled"
  | "always"
  | "never"
  | "adaptive"
  | "debug";

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
  links?: Array<{ traceId: string; spanId: string }>;
}

// ============================================================================
// Rate-Based Sampler
// ============================================================================

/**
 * Simple rate-based sampler (uniform random sampling)
 */
export class RateSampler implements Sampler {
  private readonly rate: number;

  constructor(rate: number) {
    if (rate < 0 || rate > 1) {
      throw new Error("Sampling rate must be between 0 and 1");
    }
    this.rate = rate;
  }

  shouldSample(_context: SamplingContext): SamplingDecision {
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

  getDescription(): string {
    return `RateSampler(${this.rate})`;
  }
}

// ============================================================================
// Parent-Based Sampler
// ============================================================================

/**
 * Parent-based sampler that respects parent's sampling decision
 */
export class ParentBasedSampler implements Sampler {
  private readonly rootSampler: Sampler;

  constructor(options: {
    root: Sampler;
  }) {
    this.rootSampler = options.root;
  }

  shouldSample(context: SamplingContext): SamplingDecision {
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

  getDescription(): string {
    return `ParentBasedSampler(${this.rootSampler.getDescription()})`;
  }
}

// ============================================================================
// Always/Never Samplers
// ============================================================================

/**
 * Always sample
 */
export class AlwaysSampler implements Sampler {
  shouldSample(_context: SamplingContext): SamplingDecision {
    return { shouldSample: true, reason: "always" };
  }

  getDescription(): string {
    return "AlwaysSampler";
  }
}

/**
 * Never sample
 */
export class NeverSampler implements Sampler {
  shouldSample(_context: SamplingContext): SamplingDecision {
    return { shouldSample: false, reason: "never" };
  }

  getDescription(): string {
    return "NeverSampler";
  }
}

// ============================================================================
// Error-Biased Sampler
// ============================================================================

/**
 * Samples all errors plus a percentage of successful operations
 */
export class ErrorBiasedSampler implements Sampler {
  private readonly baseSampler: Sampler;

  constructor(baseRate: number = 0.1) {
    this.baseSampler = new RateSampler(baseRate);
  }

  shouldSample(context: SamplingContext): SamplingDecision {
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

  getDescription(): string {
    return `ErrorBiasedSampler(${this.baseSampler.getDescription()})`;
  }
}

// ============================================================================
// Latency-Based Sampler
// ============================================================================

/**
 * Samples slow operations above a threshold
 */
export class LatencyBasedSampler implements Sampler {
  private readonly thresholdMs: number;
  private readonly baseSampler: Sampler;

  constructor(thresholdMs: number, baseRate: number = 0.01) {
    this.thresholdMs = thresholdMs;
    this.baseSampler = new RateSampler(baseRate);
  }

  shouldSample(context: SamplingContext): SamplingDecision {
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
  shouldRetain(durationMs: number): boolean {
    return durationMs > this.thresholdMs;
  }

  getDescription(): string {
    return `LatencyBasedSampler(>${this.thresholdMs}ms)`;
  }
}

// ============================================================================
// Adaptive Sampler
// ============================================================================

/**
 * Dynamically adjusts sampling rate based on throughput
 */
export class AdaptiveSampler implements Sampler {
  private readonly targetSpansPerSecond: number;
  private readonly minRate: number;
  private readonly maxRate: number;
  private readonly windowMs: number;

  private currentRate: number;
  private spanCounts: Array<{ timestamp: number; count: number }> = [];
  private lastAdjustment: number = 0;

  constructor(options: {
    targetSpansPerSecond?: number;
    minRate?: number;
    maxRate?: number;
    windowMs?: number;
  } = {}) {
    this.targetSpansPerSecond = options.targetSpansPerSecond ?? 100;
    this.minRate = options.minRate ?? 0.01;
    this.maxRate = options.maxRate ?? 1.0;
    this.windowMs = options.windowMs ?? 60000; // 1 minute window
    this.currentRate = this.maxRate;
  }

  shouldSample(_context: SamplingContext): SamplingDecision {
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

  private recordSpan(): void {
    const now = Date.now();
    const currentSecond = Math.floor(now / 1000) * 1000;

    const existing = this.spanCounts.find(s => s.timestamp === currentSecond);
    if (existing) {
      existing.count++;
    } else {
      this.spanCounts.push({ timestamp: currentSecond, count: 1 });
    }

    // Clean old data
    const cutoff = now - this.windowMs;
    this.spanCounts = this.spanCounts.filter(s => s.timestamp > cutoff);
  }

  private maybeAdjustRate(): void {
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

  getCurrentRate(): number {
    return this.currentRate;
  }

  getDescription(): string {
    return `AdaptiveSampler(target=${this.targetSpansPerSecond}rps, current=${this.currentRate.toFixed(3)})`;
  }
}

// ============================================================================
// Rule-Based Sampler
// ============================================================================

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
export class RuleBasedSampler implements Sampler {
  private readonly rules: SamplingRule[];
  private readonly defaultSampler: Sampler;

  constructor(rules: SamplingRule[], defaultSampler: Sampler = new RateSampler(0.1)) {
    this.rules = rules;
    this.defaultSampler = defaultSampler;
  }

  shouldSample(context: SamplingContext): SamplingDecision {
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

  private matchesRule(context: SamplingContext, rule: SamplingRule): boolean {
    // Check span name pattern
    if (rule.spanNamePattern) {
      const pattern = rule.spanNamePattern;
      if (typeof pattern === "string") {
        if (context.spanName !== pattern) return false;
      } else if (!pattern.test(context.spanName)) {
        return false;
      }
    }

    // Check attributes
    if (rule.attributes && context.attributes) {
      for (const [key, expected] of Object.entries(rule.attributes)) {
        const actual = context.attributes[key];
        if (actual === undefined) return false;

        if (expected instanceof RegExp) {
          if (!expected.test(String(actual))) return false;
        } else if (actual !== expected) {
          return false;
        }
      }
    }

    return true;
  }

  getDescription(): string {
    return `RuleBasedSampler(${this.rules.length} rules)`;
  }
}

// ============================================================================
// Composite Sampler
// ============================================================================

/**
 * Combines multiple samplers (OR logic - sample if any sampler says yes)
 */
export class CompositeSampler implements Sampler {
  private readonly samplers: Sampler[];
  private readonly mode: "any" | "all";

  constructor(samplers: Sampler[], mode: "any" | "all" = "any") {
    this.samplers = samplers;
    this.mode = mode;
  }

  shouldSample(context: SamplingContext): SamplingDecision {
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
    } else {
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

  getDescription(): string {
    return `CompositeSampler(${this.mode}, ${this.samplers.map(s => s.getDescription()).join(", ")})`;
  }
}

// ============================================================================
// PHI-Aware Sampler (Vulpes-specific)
// ============================================================================

/**
 * PHI-aware sampler that ensures important PHI detection spans are sampled
 */
export class PHIAwareSampler implements Sampler {
  private readonly baseSampler: Sampler;
  private readonly importantPHITypes: Set<string>;

  constructor(
    baseRate: number = 0.1,
    importantPHITypes: string[] = ["SSN", "CREDIT_CARD", "PASSPORT", "BIOMETRIC"]
  ) {
    this.baseSampler = new RateSampler(baseRate);
    this.importantPHITypes = new Set(importantPHITypes.map(t => t.toUpperCase()));
  }

  shouldSample(context: SamplingContext): SamplingDecision {
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

  getDescription(): string {
    return `PHIAwareSampler(important=[${Array.from(this.importantPHITypes).join(",")}])`;
  }
}

// ============================================================================
// Default Sampler Factory
// ============================================================================

/**
 * Create a default smart sampler for Vulpes
 */
export function createDefaultSampler(options: {
  baseRate?: number;
  targetRps?: number;
  slowThresholdMs?: number;
} = {}): Sampler {
  const baseRate = options.baseRate ?? 0.1;
  const targetRps = options.targetRps ?? 100;
  const slowThresholdMs = options.slowThresholdMs ?? 100;

  return new RuleBasedSampler(
    [
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
    ], "any")
  );
}


