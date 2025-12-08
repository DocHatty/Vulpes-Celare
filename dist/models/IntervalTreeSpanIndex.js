"use strict";
/**
 * IntervalTreeSpanIndex - O(log n) Span Overlap Detection
 *
 * PERFORMANCE: Reduces overlap detection from O(n²) to O(log n + k)
 * where k is the number of overlapping spans returned.
 *
 * ALGORITHM:
 * Based on augmented interval trees (Cormen et al. 2009, Section 14.3).
 * Uses @flatten-js/interval-tree for production-ready implementation.
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TYPE_SPECIFICITY = exports.IntervalTreeSpanIndex = void 0;
const interval_tree_1 = __importDefault(require("@flatten-js/interval-tree"));
/**
 * Type specificity ranking for span disambiguation
 * Higher values = more specific/trustworthy
 */
const TYPE_SPECIFICITY = {
    // High specificity - structured patterns
    SSN: 100,
    MRN: 95,
    NPI: 95,
    DEA: 95,
    CREDIT_CARD: 90,
    ACCOUNT: 85,
    LICENSE: 85,
    PASSPORT: 85,
    IBAN: 85,
    HEALTH_PLAN: 85,
    EMAIL: 80,
    PHONE: 75,
    FAX: 75,
    IP: 75,
    URL: 75,
    MAC_ADDRESS: 75,
    BITCOIN: 75,
    VEHICLE: 70,
    DEVICE: 70,
    BIOMETRIC: 70,
    // Medium specificity
    DATE: 60,
    ZIPCODE: 55,
    ADDRESS: 50,
    CITY: 45,
    STATE: 45,
    COUNTY: 45,
    // Lower specificity - context-dependent
    AGE: 40,
    RELATIVE_DATE: 40,
    PROVIDER_NAME: 36,
    NAME: 35,
    OCCUPATION: 30,
    CUSTOM: 20,
};
exports.TYPE_SPECIFICITY = TYPE_SPECIFICITY;
/**
 * IntervalTreeSpanIndex - High-performance span overlap management
 */
class IntervalTreeSpanIndex {
    constructor() {
        this.tree = new interval_tree_1.default();
        this.spanMap = new Map();
    }
    /**
     * Generate unique key for a span
     */
    getSpanKey(span) {
        return `${span.characterStart}-${span.characterEnd}-${span.filterType}-${span.text}`;
    }
    /**
     * Insert a span into the index
     * O(log n)
     */
    insert(span) {
        const key = this.getSpanKey(span);
        this.spanMap.set(key, span);
        this.tree.insert([span.characterStart, span.characterEnd], key);
    }
    /**
     * Insert multiple spans
     */
    insertAll(spans) {
        for (const span of spans) {
            this.insert(span);
        }
    }
    /**
     * Find all spans that overlap with the given range
     * O(log n + k) where k = number of overlaps
     */
    findOverlaps(start, end) {
        const results = this.tree.search([start, end]);
        return results
            .map((key) => this.spanMap.get(key))
            .filter((span) => span !== undefined);
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
        const results = this.tree.search([span.characterStart, span.characterEnd]);
        return results.length > 0;
    }
    /**
     * Remove a span from the index
     * O(log n)
     */
    remove(span) {
        const key = this.getSpanKey(span);
        if (this.spanMap.has(key)) {
            this.spanMap.delete(key);
            this.tree.remove([span.characterStart, span.characterEnd], key);
            return true;
        }
        return false;
    }
    /**
     * Clear the index
     */
    clear() {
        this.tree = new interval_tree_1.default();
        this.spanMap.clear();
    }
    /**
     * Get all spans in the index
     */
    getAllSpans() {
        return Array.from(this.spanMap.values());
    }
    /**
     * Get count of spans
     */
    get size() {
        return this.spanMap.size;
    }
    // ============ Static Utility Methods ============
    /**
     * Calculate composite score for a span (same algorithm as original SpanUtils)
     */
    static calculateSpanScore(span) {
        const typeSpecificity = TYPE_SPECIFICITY[span.filterType] || 25;
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
        // Score all spans
        const scoredSpans = spans.map((span) => ({
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
        // Use interval tree for efficient overlap checking
        const resultTree = new IntervalTreeSpanIndex();
        const kept = [];
        for (const { span } of scoredSpans) {
            const overlaps = resultTree.findOverlaps(span.characterStart, span.characterEnd);
            if (overlaps.length === 0) {
                // No overlaps - keep this span
                resultTree.insert(span);
                kept.push(span);
                continue;
            }
            // Check overlap resolution rules
            let shouldKeep = true;
            let spanToReplace = null;
            for (const existing of overlaps) {
                // Check containment relationships
                const spanContainsExisting = span.characterStart <= existing.characterStart &&
                    span.characterEnd >= existing.characterEnd;
                const existingContainsSpan = existing.characterStart <= span.characterStart &&
                    existing.characterEnd >= span.characterEnd;
                const spanSpec = TYPE_SPECIFICITY[span.filterType] || 25;
                const existSpec = TYPE_SPECIFICITY[existing.filterType] || 25;
                if (spanContainsExisting) {
                    // New span contains existing - check if existing is more specific
                    if (existSpec > spanSpec && existing.confidence >= 0.9) {
                        shouldKeep = false;
                        break;
                    }
                }
                else if (existingContainsSpan) {
                    // Existing contains new span - check if new is more specific
                    if (spanSpec > existSpec && span.confidence >= 0.9) {
                        spanToReplace = existing;
                        break;
                    }
                    shouldKeep = false;
                    break;
                }
                else {
                    // Partial overlap - existing wins (already sorted by score)
                    shouldKeep = false;
                    break;
                }
            }
            if (spanToReplace) {
                // Replace existing with new more specific span
                resultTree.remove(spanToReplace);
                const idx = kept.indexOf(spanToReplace);
                if (idx >= 0)
                    kept.splice(idx, 1);
                resultTree.insert(span);
                kept.push(span);
            }
            else if (shouldKeep) {
                resultTree.insert(span);
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