"use strict";
/**
 * Span Model - Represents a detected PII/PHI entity with rich metadata
 *
 * PERFORMANCE UPGRADE (v2.0):
 * - SpanUtils.dropOverlappingSpans now uses IntervalTree for O(n log n) instead of O(n²)
 * - Composite scoring optimized with cached calculations
 *
 * Based on Phileas's Span architecture with enhancements for VulpesHIPPA.
 * Tracks character positions, confidence, priority, context, and disambiguation info.
 *
 * @module redaction/models
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpanUtils = exports.Span = exports.FilterType = void 0;
const IntervalTreeSpanIndex_1 = require("./IntervalTreeSpanIndex");
const binding_1 = require("../native/binding");
const FilterPriority_1 = require("./FilterPriority");
const RustAccelConfig_1 = require("../config/RustAccelConfig");
let cachedSpanBinding = undefined;
function isSpanAccelEnabled() {
    return RustAccelConfig_1.RustAccelConfig.isSpanOpsEnabled();
}
function getSpanBinding() {
    if (cachedSpanBinding !== undefined)
        return cachedSpanBinding;
    try {
        cachedSpanBinding = (0, binding_1.loadNativeBinding)({ configureOrt: false });
    }
    catch {
        cachedSpanBinding = null;
    }
    return cachedSpanBinding;
}
var FilterType;
(function (FilterType) {
    // Identity
    FilterType["NAME"] = "NAME";
    FilterType["PROVIDER_NAME"] = "PROVIDER_NAME";
    FilterType["EMAIL"] = "EMAIL";
    FilterType["SSN"] = "SSN";
    FilterType["PHONE"] = "PHONE";
    FilterType["FAX"] = "FAX";
    // Geographic
    FilterType["ADDRESS"] = "ADDRESS";
    FilterType["ZIPCODE"] = "ZIPCODE";
    FilterType["CITY"] = "CITY";
    FilterType["STATE"] = "STATE";
    FilterType["COUNTY"] = "COUNTY";
    // Temporal
    FilterType["DATE"] = "DATE";
    FilterType["RELATIVE_DATE"] = "RELATIVE_DATE";
    FilterType["AGE"] = "AGE";
    // Financial
    FilterType["CREDIT_CARD"] = "CREDIT_CARD";
    FilterType["ACCOUNT"] = "ACCOUNT";
    FilterType["BITCOIN"] = "BITCOIN";
    FilterType["IBAN"] = "IBAN";
    // Medical
    FilterType["MRN"] = "MRN";
    FilterType["HEALTH_PLAN"] = "HEALTH_PLAN";
    FilterType["DEVICE"] = "DEVICE";
    FilterType["LICENSE"] = "LICENSE";
    FilterType["PASSPORT"] = "PASSPORT";
    // Technical
    FilterType["IP"] = "IP";
    FilterType["URL"] = "URL";
    FilterType["MAC_ADDRESS"] = "MAC_ADDRESS";
    // Contextual
    FilterType["BIOMETRIC"] = "BIOMETRIC";
    FilterType["VEHICLE"] = "VEHICLE";
    FilterType["OCCUPATION"] = "OCCUPATION";
    // Custom
    FilterType["CUSTOM"] = "CUSTOM";
})(FilterType || (exports.FilterType = FilterType = {}));
/**
 * Span - Represents a detected entity in text
 */
class Span {
    // Core properties
    characterStart;
    characterEnd;
    text;
    filterType;
    confidence;
    priority;
    // Context
    context;
    window;
    // Replacement
    replacement;
    salt;
    // Pattern
    pattern;
    // Flags
    applied;
    ignored;
    // Disambiguation
    ambiguousWith;
    disambiguationScore;
    constructor(metadata) {
        this.characterStart = metadata.characterStart;
        this.characterEnd = metadata.characterEnd;
        this.text = metadata.text;
        this.filterType = metadata.filterType;
        this.confidence = metadata.confidence;
        this.priority = metadata.priority;
        this.context = metadata.context;
        this.window = metadata.window;
        this.replacement = metadata.replacement;
        this.salt = metadata.salt;
        this.pattern = metadata.pattern;
        this.applied = metadata.applied;
        this.ignored = metadata.ignored;
        this.ambiguousWith = metadata.ambiguousWith;
        this.disambiguationScore = metadata.disambiguationScore;
    }
    /**
     * Get span length
     */
    get length() {
        return this.characterEnd - this.characterStart;
    }
    /**
     * Check if this span overlaps with another
     */
    overlapsWith(other) {
        return !(this.characterEnd <= other.characterStart ||
            this.characterStart >= other.characterEnd);
    }
    /**
     * Check if this span is identical to another (same position and length)
     */
    isIdenticalTo(other) {
        return (this.characterStart === other.characterStart &&
            this.characterEnd === other.characterEnd);
    }
    /**
     * Check if this span fully contains another span
     */
    contains(other) {
        return (this.characterStart <= other.characterStart &&
            this.characterEnd >= other.characterEnd);
    }
    /**
     * Create a copy of this span
     */
    clone() {
        return new Span({
            text: this.text,
            originalValue: this.text,
            characterStart: this.characterStart,
            characterEnd: this.characterEnd,
            filterType: this.filterType,
            confidence: this.confidence,
            priority: this.priority,
            context: this.context,
            window: [...this.window],
            replacement: this.replacement,
            salt: this.salt,
            pattern: this.pattern,
            applied: this.applied,
            ignored: this.ignored,
            ambiguousWith: [...this.ambiguousWith],
            disambiguationScore: this.disambiguationScore,
        });
    }
    /**
     * Convert to simple token format for backward compatibility
     */
    toToken(sessionId, count) {
        return `{{${this.filterType}_${sessionId}_${count}}}`;
    }
    /**
     * Shift span positions (used after text manipulation)
     */
    shift(offset) {
        this.characterStart += offset;
        this.characterEnd += offset;
    }
}
exports.Span = Span;
/**
 * Span Utilities - Operations on collections of spans
 *
 * PERFORMANCE: Now uses IntervalTree for O(n log n) overlap detection
 * instead of O(n²) nested loops.
 */
class SpanUtils {
    // Performance flag - can be disabled for debugging
    static USE_INTERVAL_TREE = true;
    /**
     * Enable or disable interval tree optimization (for debugging)
     */
    static setUseIntervalTree(enabled) {
        SpanUtils.USE_INTERVAL_TREE = enabled;
    }
    /**
     * Calculate composite score for a span
     * Used for tie-breaking when spans have similar characteristics
     *
     * @param span - The span to score
     * @returns A composite score (higher = better)
     */
    static calculateSpanScore(span) {
        const typeSpecificity = FilterPriority_1.TYPE_SPECIFICITY[span.filterType] || 25;
        // Weighted scoring:
        // - Length: 40% weight (longer spans capture more context)
        // - Confidence: 30% weight (detection confidence)
        // - Type specificity: 20% weight (structured patterns > fuzzy matches)
        // - Priority: 10% weight (filter-level priority)
        const lengthScore = Math.min(span.length / 50, 1) * 40; // Cap at 50 chars
        const confidenceScore = span.confidence * 30;
        const typeScore = (typeSpecificity / 100) * 20;
        const priorityScore = Math.min(span.priority / 100, 1) * 10; // Normalize
        return lengthScore + confidenceScore + typeScore + priorityScore;
    }
    /**
     * Drop overlapping spans, keeping the best ones based on:
     * 1. Composite score (length, confidence, type specificity, priority)
     * 2. Special handling for containment (parent vs child spans)
     * 3. Same-position disambiguation
     *
     * PERFORMANCE: O(n log n) using IntervalTree instead of O(n²) nested loops
     */
    static dropOverlappingSpans(spans) {
        if (spans.length === 0)
            return [];
        if (spans.length === 1)
            return spans;
        // Optional Rust accelerator (kept behind a feature flag).
        // Falls back to the existing IntervalTree implementation for safety.
        if (isSpanAccelEnabled()) {
            const binding = getSpanBinding();
            if (binding?.dropOverlappingSpans) {
                try {
                    const indices = binding.dropOverlappingSpans(spans.map((s) => ({
                        characterStart: s.characterStart,
                        characterEnd: s.characterEnd,
                        filterType: String(s.filterType),
                        confidence: s.confidence,
                        priority: s.priority,
                    })));
                    const kept = indices
                        .map((i) => spans[i])
                        .filter((s) => Boolean(s));
                    return kept.sort((a, b) => a.characterStart - b.characterStart);
                }
                catch {
                    // Fall back below.
                }
            }
        }
        // Use optimized IntervalTree implementation when enabled
        if (SpanUtils.USE_INTERVAL_TREE) {
            return IntervalTreeSpanIndex_1.IntervalTreeSpanIndex.dropOverlappingSpans(spans);
        }
        // Fallback to legacy implementation (for debugging/comparison)
        return SpanUtils.dropOverlappingSpansLegacy(spans);
    }
    /**
     * Legacy O(n²) implementation - kept for backward compatibility and debugging
     */
    static dropOverlappingSpansLegacy(spans) {
        // Calculate scores for all spans
        const scoredSpans = spans.map((span) => ({
            span,
            score: this.calculateSpanScore(span),
        }));
        // Sort by score (descending), then by position (ascending) for stability
        scoredSpans.sort((a, b) => {
            if (Math.abs(a.score - b.score) > 0.001)
                return b.score - a.score;
            // Secondary: prefer earlier spans for stability
            if (a.span.characterStart !== b.span.characterStart) {
                return a.span.characterStart - b.span.characterStart;
            }
            // Tertiary: prefer longer spans
            return b.span.length - a.span.length;
        });
        const nonOverlapping = [];
        for (const { span } of scoredSpans) {
            let shouldKeep = true;
            let indexToReplace = -1;
            for (let i = 0; i < nonOverlapping.length; i++) {
                const existing = nonOverlapping[i];
                if (!span.overlapsWith(existing)) {
                    continue;
                }
                // Special case: if new span fully contains existing, check if we
                // should prefer the more specific (smaller) span for certain types
                if (span.contains(existing)) {
                    const spanSpec = FilterPriority_1.TYPE_SPECIFICITY[span.filterType] || 25;
                    const existSpec = FilterPriority_1.TYPE_SPECIFICITY[existing.filterType] || 25;
                    // If existing is more specific type and high confidence, keep it
                    if (existSpec > spanSpec && existing.confidence >= 0.9) {
                        shouldKeep = false;
                        break;
                    }
                }
                // Special case: existing fully contains new span
                if (existing.contains(span)) {
                    const spanSpec = FilterPriority_1.TYPE_SPECIFICITY[span.filterType] || 25;
                    const existSpec = FilterPriority_1.TYPE_SPECIFICITY[existing.filterType] || 25;
                    // If new span is more specific type and high confidence,
                    // replace existing with new
                    if (spanSpec > existSpec && span.confidence >= 0.9) {
                        indexToReplace = i;
                        break;
                    }
                    shouldKeep = false;
                    break;
                }
                // Partial overlap - already sorted by score, keep existing
                shouldKeep = false;
                break;
            }
            if (indexToReplace >= 0) {
                nonOverlapping[indexToReplace] = span;
            }
            else if (shouldKeep) {
                nonOverlapping.push(span);
            }
        }
        // Sort by position for consistent output
        return nonOverlapping.sort((a, b) => a.characterStart - b.characterStart);
    }
    /**
     * Find spans that are identical in position
     * Returns groups of identical spans (for disambiguation)
     */
    static getIdenticalSpanGroups(spans) {
        return IntervalTreeSpanIndex_1.IntervalTreeSpanIndex.getIdenticalSpanGroups(spans);
    }
    /**
     * Merge spans from multiple sources (e.g., regex + NER)
     * Removes duplicates and resolves overlaps
     *
     * PERFORMANCE: O(n log n) using IntervalTree
     */
    static mergeSpans(spanArrays) {
        if (SpanUtils.USE_INTERVAL_TREE) {
            return IntervalTreeSpanIndex_1.IntervalTreeSpanIndex.mergeSpans(spanArrays);
        }
        // Legacy implementation
        const allSpans = spanArrays.flat();
        // Remove exact duplicates (same position, same type)
        const uniqueSpans = new Map();
        for (const span of allSpans) {
            const key = `${span.characterStart}-${span.characterEnd}-${span.filterType}`;
            if (!uniqueSpans.has(key) ||
                uniqueSpans.get(key).confidence < span.confidence) {
                uniqueSpans.set(key, span);
            }
        }
        // Drop overlapping spans
        return SpanUtils.dropOverlappingSpans(Array.from(uniqueSpans.values()));
    }
    /**
     * Shift all spans by offset (used after text manipulation)
     */
    static shiftSpans(spans, offset) {
        for (const span of spans) {
            span.shift(offset);
        }
    }
    /**
     * Filter spans by confidence threshold
     */
    static filterByConfidence(spans, minConfidence) {
        return spans.filter((span) => span.confidence >= minConfidence);
    }
    /**
     * Filter spans by filter type
     */
    static filterByType(spans, filterTypes) {
        const typeSet = new Set(filterTypes);
        return spans.filter((span) => typeSet.has(span.filterType));
    }
    /**
     * Sort spans by position (ascending)
     */
    static sortByPosition(spans) {
        return [...spans].sort((a, b) => {
            if (a.characterStart !== b.characterStart) {
                return a.characterStart - b.characterStart;
            }
            return a.characterEnd - b.characterEnd;
        });
    }
    /**
     * Get type specificity for a filter type
     */
    static getTypeSpecificity(filterType) {
        return FilterPriority_1.TYPE_SPECIFICITY[filterType] || 25;
    }
}
exports.SpanUtils = SpanUtils;
//# sourceMappingURL=Span.js.map