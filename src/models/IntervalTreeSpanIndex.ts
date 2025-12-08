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

import IntervalTree from "@flatten-js/interval-tree";
import type { Span } from "./Span";

/**
 * Scored span for overlap resolution
 */
interface ScoredSpan {
  span: Span;
  score: number;
}

/**
 * Type specificity ranking for span disambiguation
 * Higher values = more specific/trustworthy
 */
const TYPE_SPECIFICITY: Record<string, number> = {
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

/**
 * IntervalTreeSpanIndex - High-performance span overlap management
 */
export class IntervalTreeSpanIndex {
  private tree: IntervalTree;
  private spanMap: Map<string, Span>;

  constructor() {
    this.tree = new IntervalTree();
    this.spanMap = new Map();
  }

  /**
   * Generate unique key for a span
   */
  private getSpanKey(span: Span): string {
    return `${span.characterStart}-${span.characterEnd}-${span.filterType}-${span.text}`;
  }

  /**
   * Insert a span into the index
   * O(log n)
   */
  insert(span: Span): void {
    const key = this.getSpanKey(span);
    this.spanMap.set(key, span);
    this.tree.insert([span.characterStart, span.characterEnd], key);
  }

  /**
   * Insert multiple spans
   */
  insertAll(spans: Span[]): void {
    for (const span of spans) {
      this.insert(span);
    }
  }

  /**
   * Find all spans that overlap with the given range
   * O(log n + k) where k = number of overlaps
   */
  findOverlaps(start: number, end: number): Span[] {
    const results = this.tree.search([start, end]) as string[];
    return results
      .map((key) => this.spanMap.get(key))
      .filter((span): span is Span => span !== undefined);
  }

  /**
   * Find all spans that overlap with a given span
   */
  findOverlappingSpans(span: Span): Span[] {
    return this.findOverlaps(span.characterStart, span.characterEnd);
  }

  /**
   * Check if a span overlaps with any existing span
   * O(log n)
   */
  hasOverlap(span: Span): boolean {
    const results = this.tree.search([span.characterStart, span.characterEnd]);
    return results.length > 0;
  }

  /**
   * Remove a span from the index
   * O(log n)
   */
  remove(span: Span): boolean {
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
  clear(): void {
    this.tree = new IntervalTree();
    this.spanMap.clear();
  }

  /**
   * Get all spans in the index
   */
  getAllSpans(): Span[] {
    return Array.from(this.spanMap.values());
  }

  /**
   * Get count of spans
   */
  get size(): number {
    return this.spanMap.size;
  }

  // ============ Static Utility Methods ============

  /**
   * Calculate composite score for a span (same algorithm as original SpanUtils)
   */
  static calculateSpanScore(span: Span): number {
    const typeSpecificity = TYPE_SPECIFICITY[span.filterType as string] || 25;

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
  static dropOverlappingSpans(spans: Span[]): Span[] {
    if (spans.length === 0) return [];
    if (spans.length === 1) return spans;

    // Score all spans
    const scoredSpans: ScoredSpan[] = spans.map((span) => ({
      span,
      score: IntervalTreeSpanIndex.calculateSpanScore(span),
    }));

    // Sort by score (descending), then position (ascending)
    scoredSpans.sort((a, b) => {
      if (Math.abs(a.score - b.score) > 0.001) return b.score - a.score;
      if (a.span.characterStart !== b.span.characterStart) {
        return a.span.characterStart - b.span.characterStart;
      }
      return b.span.length - a.span.length;
    });

    // Use interval tree for efficient overlap checking
    const resultTree = new IntervalTreeSpanIndex();
    const kept: Span[] = [];

    for (const { span } of scoredSpans) {
      const overlaps = resultTree.findOverlaps(
        span.characterStart,
        span.characterEnd,
      );

      if (overlaps.length === 0) {
        // No overlaps - keep this span
        resultTree.insert(span);
        kept.push(span);
        continue;
      }

      // Check overlap resolution rules
      let shouldKeep = true;
      let spanToReplace: Span | null = null;

      for (const existing of overlaps) {
        // Check containment relationships
        const spanContainsExisting =
          span.characterStart <= existing.characterStart &&
          span.characterEnd >= existing.characterEnd;

        const existingContainsSpan =
          existing.characterStart <= span.characterStart &&
          existing.characterEnd >= span.characterEnd;

        const spanSpec = TYPE_SPECIFICITY[span.filterType as string] || 25;
        const existSpec = TYPE_SPECIFICITY[existing.filterType as string] || 25;

        if (spanContainsExisting) {
          // New span contains existing - check if existing is more specific
          if (existSpec > spanSpec && existing.confidence >= 0.9) {
            shouldKeep = false;
            break;
          }
        } else if (existingContainsSpan) {
          // Existing contains new span - check if new is more specific
          if (spanSpec > existSpec && span.confidence >= 0.9) {
            spanToReplace = existing;
            break;
          }
          shouldKeep = false;
          break;
        } else {
          // Partial overlap - existing wins (already sorted by score)
          shouldKeep = false;
          break;
        }
      }

      if (spanToReplace) {
        // Replace existing with new more specific span
        resultTree.remove(spanToReplace);
        const idx = kept.indexOf(spanToReplace);
        if (idx >= 0) kept.splice(idx, 1);

        resultTree.insert(span);
        kept.push(span);
      } else if (shouldKeep) {
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
  static mergeSpans(spanArrays: Span[][]): Span[] {
    const allSpans = spanArrays.flat();

    // Remove exact duplicates
    const uniqueMap = new Map<string, Span>();
    for (const span of allSpans) {
      const key = `${span.characterStart}-${span.characterEnd}-${span.filterType}`;
      const existing = uniqueMap.get(key);
      if (!existing || existing.confidence < span.confidence) {
        uniqueMap.set(key, span);
      }
    }

    return IntervalTreeSpanIndex.dropOverlappingSpans(
      Array.from(uniqueMap.values()),
    );
  }

  /**
   * Find groups of spans at identical positions (for disambiguation)
   */
  static getIdenticalSpanGroups(spans: Span[]): Span[][] {
    const groups = new Map<string, Span[]>();

    for (const span of spans) {
      const key = `${span.characterStart}-${span.characterEnd}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(span);
    }

    return Array.from(groups.values()).filter((group) => group.length > 1);
  }
}

// Export the type specificity for external use
export { TYPE_SPECIFICITY };
