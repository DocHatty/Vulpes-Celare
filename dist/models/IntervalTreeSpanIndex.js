"use strict";
/**
 * IntervalTreeSpanIndex - O(log n) Span Overlap Detection
 *
 * PERFORMANCE: Reduces overlap detection from O(n²) to O(log n + k)
 * where k is the number of overlapping spans returned.
 *
 * RUST ACCELERATION:
 * When VULPES_INTERVAL_ACCEL is enabled (default), uses Rust native implementation
 * for ALL operations (insert, findOverlaps, remove, dropOverlappingSpans).
 * Set VULPES_INTERVAL_ACCEL=0 to disable and fall back to TypeScript.
 *
 * ALGORITHM:
 * Based on augmented interval trees (Cormen et al. 2009, Section 14.3).
 * Rust implementation provides full interval tree with O(log n) operations.
 *
 * KEY OPERATIONS:
 * - insert(span): O(log n)
 * - findOverlaps(span): O(log n + k)
 * - remove(span): O(log n)
 *
 * Reference: https://en.wikipedia.org/wiki/Interval_tree
 *
 * @module redaction/models
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TYPE_SPECIFICITY = exports.IntervalTreeSpanIndex = void 0;
const binding_1 = require("../native/binding");
const FilterPriority_1 = require("./FilterPriority");
Object.defineProperty(exports, "TYPE_SPECIFICITY", { enumerable: true, get: function () { return FilterPriority_1.TYPE_SPECIFICITY; } });
const RustAccelConfig_1 = require("../config/RustAccelConfig");
// Cache the native binding
let cachedBinding = undefined;
function getBinding() {
    if (cachedBinding !== undefined)
        return cachedBinding;
    try {
        cachedBinding = (0, binding_1.loadNativeBinding)({ configureOrt: false });
    }
    catch {
        cachedBinding = null;
    }
    return cachedBinding;
}
function isIntervalAccelEnabled() {
    return RustAccelConfig_1.RustAccelConfig.isIntervalTreeEnabled();
}
/**
 * IntervalTreeSpanIndex - High-performance span overlap management
 *
 * Uses Rust VulpesIntervalTree when available (default), falls back to TypeScript.
 */
class IntervalTreeSpanIndex {
    // Rust implementation (preferred)
    rustTree = null;
    // TypeScript fallback implementation
    spanMap = new Map();
    tsIntervals = [];
    useRust;
    constructor() {
        // Try to use Rust implementation
        if (isIntervalAccelEnabled()) {
            const binding = getBinding();
            if (binding?.VulpesIntervalTree) {
                try {
                    this.rustTree = new binding.VulpesIntervalTree();
                    this.useRust = true;
                    return;
                }
                catch {
                    // Fall through to TS implementation
                }
            }
        }
        this.useRust = false;
    }
    /**
     * Generate unique key for a span
     */
    getSpanKey(span) {
        return `${span.characterStart}-${span.characterEnd}-${span.filterType}-${span.text}`;
    }
    /**
     * Convert Span to Rust format
     */
    toRustSpan(span) {
        return {
            characterStart: span.characterStart,
            characterEnd: span.characterEnd,
            filterType: String(span.filterType),
            confidence: span.confidence,
            priority: span.priority,
            text: span.text,
        };
    }
    /**
     * Convert Rust span back to Span type
     */
    fromRustSpan(rustSpan) {
        // Create a minimal Span-like object
        // The caller will need to handle full Span reconstruction if needed
        return {
            characterStart: rustSpan.characterStart,
            characterEnd: rustSpan.characterEnd,
            filterType: rustSpan.filterType,
            confidence: rustSpan.confidence,
            priority: rustSpan.priority,
            text: rustSpan.text,
            length: rustSpan.characterEnd - rustSpan.characterStart,
        };
    }
    /**
     * Insert a span into the index
     * O(log n)
     */
    insert(span) {
        if (this.useRust && this.rustTree) {
            this.rustTree.insert(this.toRustSpan(span));
            return;
        }
        // TypeScript fallback
        const key = this.getSpanKey(span);
        this.spanMap.set(key, span);
        this.tsIntervals.push({
            start: span.characterStart,
            end: span.characterEnd,
            key,
        });
    }
    /**
     * Insert multiple spans
     */
    insertAll(spans) {
        if (this.useRust && this.rustTree) {
            this.rustTree.insertAll(spans.map((s) => this.toRustSpan(s)));
            return;
        }
        for (const span of spans) {
            this.insert(span);
        }
    }
    /**
     * Find all spans that overlap with the given range
     * O(log n + k) where k = number of overlaps
     */
    findOverlaps(start, end) {
        if (this.useRust && this.rustTree) {
            const rustResults = this.rustTree.findOverlaps(start, end);
            return rustResults.map((r) => this.fromRustSpan(r));
        }
        // TypeScript fallback: linear scan
        const results = [];
        for (const interval of this.tsIntervals) {
            // Check for overlap: not (end1 <= start2 || start1 >= end2)
            if (!(end <= interval.start || start >= interval.end)) {
                const span = this.spanMap.get(interval.key);
                if (span)
                    results.push(span);
            }
        }
        return results;
    }
    /**
     * Find all spans that overlap with a given span
     */
    findOverlappingSpans(span) {
        return this.findOverlaps(span.characterStart, span.characterEnd);
    }
    /**
     * Check if a span overlaps with any existing span
     * O(log n)
     */
    hasOverlap(span) {
        if (this.useRust && this.rustTree) {
            return this.rustTree.hasOverlap(this.toRustSpan(span));
        }
        // TypeScript fallback
        const overlaps = this.findOverlaps(span.characterStart, span.characterEnd);
        return overlaps.length > 0;
    }
    /**
     * Remove a span from the index
     * O(log n)
     */
    remove(span) {
        if (this.useRust && this.rustTree) {
            return this.rustTree.remove(this.toRustSpan(span));
        }
        // TypeScript fallback
        const key = this.getSpanKey(span);
        if (this.spanMap.has(key)) {
            this.spanMap.delete(key);
            this.tsIntervals = this.tsIntervals.filter((i) => i.key !== key);
            return true;
        }
        return false;
    }
    /**
     * Clear the index
     */
    clear() {
        if (this.useRust && this.rustTree) {
            this.rustTree.clear();
            return;
        }
        this.spanMap.clear();
        this.tsIntervals = [];
    }
    /**
     * Get all spans in the index
     */
    getAllSpans() {
        if (this.useRust && this.rustTree) {
            return this.rustTree.getAllSpans().map((r) => this.fromRustSpan(r));
        }
        return Array.from(this.spanMap.values());
    }
    /**
     * Get count of spans
     */
    get size() {
        if (this.useRust && this.rustTree) {
            return this.rustTree.size;
        }
        return this.spanMap.size;
    }
    // ============ Static Utility Methods ============
    /**
     * Calculate composite score for a span (same algorithm as original SpanUtils)
     */
    static calculateSpanScore(span) {
        const typeSpecificity = FilterPriority_1.TYPE_SPECIFICITY[span.filterType] || 25;
        // Weighted scoring:
        // - Length: 40% weight (longer spans capture more context)
        // - Confidence: 30% weight (detection confidence)
        // - Type specificity: 20% weight (structured patterns > fuzzy matches)
        // - Priority: 10% weight (filter-level priority)
        const lengthScore = Math.min(span.length / 50, 1) * 40;
        const confidenceScore = span.confidence * 30;
        const typeScore = (typeSpecificity / 100) * 20;
        const priorityScore = Math.min(span.priority / 100, 1) * 10;
        return lengthScore + confidenceScore + typeScore + priorityScore;
    }
    /**
     * Drop overlapping spans using interval tree - O(n log n) instead of O(n²)
     *
     * This is the high-performance replacement for SpanUtils.dropOverlappingSpans
     */
    static dropOverlappingSpans(spans) {
        if (spans.length === 0)
            return [];
        if (spans.length === 1)
            return spans;
        // Try Rust accelerator first
        if (isIntervalAccelEnabled()) {
            const binding = getBinding();
            if (binding?.dropOverlappingSpansFast) {
                try {
                    // Convert spans to Rust input format
                    const rustSpans = spans.map((s) => ({
                        characterStart: s.characterStart,
                        characterEnd: s.characterEnd,
                        filterType: String(s.filterType),
                        confidence: s.confidence,
                        priority: s.priority,
                        text: s.text,
                    }));
                    const keptIndices = binding.dropOverlappingSpansFast(rustSpans);
                    // Map back to original spans and sort by position
                    const kept = keptIndices
                        .map((i) => spans[i])
                        .filter((s) => Boolean(s));
                    return kept.sort((a, b) => a.characterStart - b.characterStart);
                }
                catch {
                    // Fall back to TS implementation
                }
            }
        }
        // STEP 1: Remove exact duplicates (same position + type)
        // This handles filters that generate multiple matches for the same text
        const uniqueMap = new Map();
        for (const span of spans) {
            const key = `${span.characterStart}-${span.characterEnd}-${span.filterType}`;
            const existing = uniqueMap.get(key);
            if (!existing || existing.confidence < span.confidence) {
                uniqueMap.set(key, span);
            }
        }
        const uniqueSpans = Array.from(uniqueMap.values());
        if (uniqueSpans.length === 1)
            return uniqueSpans;
        // STEP 2: Score all spans
        const scoredSpans = uniqueSpans.map((span) => ({
            span,
            score: IntervalTreeSpanIndex.calculateSpanScore(span),
        }));
        // Sort by score (descending), then position (ascending)
        scoredSpans.sort((a, b) => {
            if (Math.abs(a.score - b.score) > 0.001)
                return b.score - a.score;
            if (a.span.characterStart !== b.span.characterStart) {
                return a.span.characterStart - b.span.characterStart;
            }
            return b.span.length - a.span.length;
        });
        // STEP 3: Greedy overlap removal with containment logic
        const kept = [];
        for (const { span } of scoredSpans) {
            let shouldKeep = true;
            let indexToReplace = -1;
            for (let i = 0; i < kept.length; i++) {
                const existing = kept[i];
                // Check for overlap
                const noOverlap = span.characterEnd <= existing.characterStart ||
                    span.characterStart >= existing.characterEnd;
                if (noOverlap)
                    continue;
                // There IS an overlap - determine what to do
                const spanContainsExisting = span.characterStart <= existing.characterStart &&
                    span.characterEnd >= existing.characterEnd;
                const existingContainsSpan = existing.characterStart <= span.characterStart &&
                    existing.characterEnd >= span.characterEnd;
                const spanSpec = FilterPriority_1.TYPE_SPECIFICITY[span.filterType] || 25;
                const existSpec = FilterPriority_1.TYPE_SPECIFICITY[existing.filterType] || 25;
                if (spanContainsExisting) {
                    // New span contains existing
                    // If same type or existing is more specific with high confidence, reject new span
                    if (spanSpec <= existSpec) {
                        // Same or more specific type in existing - keep existing, reject new
                        shouldKeep = false;
                        break;
                    }
                    // New span is more specific - this is rare but could happen with different types
                }
                else if (existingContainsSpan) {
                    // Existing contains new span
                    if (spanSpec > existSpec && span.confidence >= 0.9) {
                        // New span is more specific with high confidence - replace existing
                        indexToReplace = i;
                        break;
                    }
                    // Same type or existing is more specific - reject new span
                    shouldKeep = false;
                    break;
                }
                else {
                    // Partial overlap - existing wins (already sorted by score)
                    shouldKeep = false;
                    break;
                }
            }
            if (indexToReplace >= 0) {
                kept[indexToReplace] = span;
            }
            else if (shouldKeep) {
                kept.push(span);
            }
        }
        // Sort by position for consistent output
        return kept.sort((a, b) => a.characterStart - b.characterStart);
    }
    /**
     * Merge spans from multiple sources using interval tree
     */
    static mergeSpans(spanArrays) {
        const allSpans = spanArrays.flat();
        // Remove exact duplicates
        const uniqueMap = new Map();
        for (const span of allSpans) {
            const key = `${span.characterStart}-${span.characterEnd}-${span.filterType}`;
            const existing = uniqueMap.get(key);
            if (!existing || existing.confidence < span.confidence) {
                uniqueMap.set(key, span);
            }
        }
        return IntervalTreeSpanIndex.dropOverlappingSpans(Array.from(uniqueMap.values()));
    }
    /**
     * Find groups of spans at identical positions (for disambiguation)
     */
    static getIdenticalSpanGroups(spans) {
        const groups = new Map();
        for (const span of spans) {
            const key = `${span.characterStart}-${span.characterEnd}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(span);
        }
        return Array.from(groups.values()).filter((group) => group.length > 1);
    }
}
exports.IntervalTreeSpanIndex = IntervalTreeSpanIndex;
//# sourceMappingURL=IntervalTreeSpanIndex.js.map