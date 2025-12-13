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
import type { Span } from "./Span";
/**
 * Type specificity ranking for span disambiguation
 * Higher values = more specific/trustworthy
 */
declare const TYPE_SPECIFICITY: Record<string, number>;
/**
 * IntervalTreeSpanIndex - High-performance span overlap management
 *
 * Uses Rust VulpesIntervalTree when available (default), falls back to TypeScript.
 */
export declare class IntervalTreeSpanIndex {
    private rustTree;
    private spanMap;
    private tsIntervals;
    private readonly useRust;
    constructor();
    /**
     * Generate unique key for a span
     */
    private getSpanKey;
    /**
     * Convert Span to Rust format
     */
    private toRustSpan;
    /**
     * Convert Rust span back to Span type
     */
    private fromRustSpan;
    /**
     * Insert a span into the index
     * O(log n)
     */
    insert(span: Span): void;
    /**
     * Insert multiple spans
     */
    insertAll(spans: Span[]): void;
    /**
     * Find all spans that overlap with the given range
     * O(log n + k) where k = number of overlaps
     */
    findOverlaps(start: number, end: number): Span[];
    /**
     * Find all spans that overlap with a given span
     */
    findOverlappingSpans(span: Span): Span[];
    /**
     * Check if a span overlaps with any existing span
     * O(log n)
     */
    hasOverlap(span: Span): boolean;
    /**
     * Remove a span from the index
     * O(log n)
     */
    remove(span: Span): boolean;
    /**
     * Clear the index
     */
    clear(): void;
    /**
     * Get all spans in the index
     */
    getAllSpans(): Span[];
    /**
     * Get count of spans
     */
    get size(): number;
    /**
     * Calculate composite score for a span (same algorithm as original SpanUtils)
     */
    static calculateSpanScore(span: Span): number;
    /**
     * Drop overlapping spans using interval tree - O(n log n) instead of O(n²)
     *
     * This is the high-performance replacement for SpanUtils.dropOverlappingSpans
     */
    static dropOverlappingSpans(spans: Span[]): Span[];
    /**
     * Merge spans from multiple sources using interval tree
     */
    static mergeSpans(spanArrays: Span[][]): Span[];
    /**
     * Find groups of spans at identical positions (for disambiguation)
     */
    static getIdenticalSpanGroups(spans: Span[]): Span[][];
}
export { TYPE_SPECIFICITY };
//# sourceMappingURL=IntervalTreeSpanIndex.d.ts.map