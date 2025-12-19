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
import { loadNativeBinding, VulpesNativeBinding } from "../native/binding";
import { TYPE_SPECIFICITY } from "./FilterPriority";
import { RustAccelConfig } from "../config/RustAccelConfig";
import { RadiologyLogger } from "../utils/RadiologyLogger";

// Cache the native binding
let cachedBinding: ReturnType<typeof loadNativeBinding> | null | undefined =
  undefined;

function getBinding(): ReturnType<typeof loadNativeBinding> | null {
  if (cachedBinding !== undefined) return cachedBinding;
  try {
    cachedBinding = loadNativeBinding({ configureOrt: false });
  } catch {
    cachedBinding = null;
  }
  return cachedBinding;
}

function isIntervalAccelEnabled(): boolean {
  return RustAccelConfig.isIntervalTreeEnabled();
}

// Type for the Rust interval tree instance
type RustIntervalTree =
  NonNullable<
    VulpesNativeBinding["VulpesIntervalTree"]
  > extends new () => infer T
    ? T
    : never;

/**
 * Scored span for overlap resolution
 */
interface ScoredSpan {
  span: Span;
  score: number;
}

/**
 * IntervalTreeSpanIndex - High-performance span overlap management
 *
 * Uses Rust VulpesIntervalTree when available (default), falls back to TypeScript.
 */
export class IntervalTreeSpanIndex {
  // Rust implementation (preferred)
  private rustTree: RustIntervalTree | null = null;

  // TypeScript fallback implementation
  private spanMap: Map<string, Span> = new Map();
  private tsIntervals: Array<{ start: number; end: number; key: string }> = [];

  private readonly useRust: boolean;

  constructor() {
    // Try to use Rust implementation
    if (isIntervalAccelEnabled()) {
      const binding = getBinding();
      if (binding?.VulpesIntervalTree) {
        try {
          this.rustTree = new binding.VulpesIntervalTree();
          this.useRust = true;
          return;
        } catch {
          // Fall through to TS implementation
        }
      }
    }
    this.useRust = false;
  }

  /**
   * Generate unique key for a span
   */
  private getSpanKey(span: Span): string {
    return `${span.characterStart}-${span.characterEnd}-${span.filterType}-${span.text}`;
  }

  /**
   * Convert Span to Rust format
   */
  private toRustSpan(span: Span): {
    characterStart: number;
    characterEnd: number;
    filterType: string;
    confidence: number;
    priority: number;
    text: string;
  } {
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
  private fromRustSpan(rustSpan: {
    characterStart: number;
    characterEnd: number;
    filterType: string;
    confidence: number;
    priority: number;
    text: string;
  }): Span {
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
    } as Span;
  }

  /**
   * Insert a span into the index
   * O(log n)
   */
  insert(span: Span): void {
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
  insertAll(spans: Span[]): void {
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
  findOverlaps(start: number, end: number): Span[] {
    if (this.useRust && this.rustTree) {
      const rustResults = this.rustTree.findOverlaps(start, end);
      return rustResults.map((r) => this.fromRustSpan(r));
    }

    // TypeScript fallback: linear scan
    const results: Span[] = [];
    for (const interval of this.tsIntervals) {
      // Check for overlap: not (end1 <= start2 || start1 >= end2)
      if (!(end <= interval.start || start >= interval.end)) {
        const span = this.spanMap.get(interval.key);
        if (span) results.push(span);
      }
    }
    return results;
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
  remove(span: Span): boolean {
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
  clear(): void {
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
  getAllSpans(): Span[] {
    if (this.useRust && this.rustTree) {
      return this.rustTree.getAllSpans().map((r) => this.fromRustSpan(r));
    }

    return Array.from(this.spanMap.values());
  }

  /**
   * Get count of spans
   */
  get size(): number {
    if (this.useRust && this.rustTree) {
      return this.rustTree.size;
    }

    return this.spanMap.size;
  }

  // ============ Static Utility Methods ============

  // Structure words that indicate a NAME span likely includes non-name text
  private static readonly NAME_STRUCTURE_WORDS = new Set([
    "DATE", "BIRTH", "RECORD", "NUMBER", "PHONE", "ADDRESS", "EMAIL",
    "MEMBER", "ACCOUNT", "STATUS", "DOB", "MRN", "SSN", "ID"
  ]);

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
    let lengthScore = Math.min(span.length / 50, 1) * 40;
    const confidenceScore = span.confidence * 30;
    const typeScore = (typeSpecificity / 100) * 20;
    const priorityScore = Math.min(span.priority / 100, 1) * 10;

    // PENALTY: For NAME spans, heavily penalize if text contains structure words
    // This prevents "Khoury , Keisha Date" from beating "Khoury , Keisha"
    if (span.filterType === "NAME") {
      const words = span.text.toUpperCase().split(/\s+/);
      for (const word of words) {
        if (IntervalTreeSpanIndex.NAME_STRUCTURE_WORDS.has(word)) {
          // Severe penalty - effectively makes this span lose to shorter alternatives
          lengthScore = 0;
          break;
        }
      }
    }

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

    // DEBUG: Log input spans
    if (process.env.VULPES_DEBUG_OVERLAP === "1") {
      const debugLines = ["[DEBUG] dropOverlappingSpans input:"];
      spans.forEach((s, i) => {
        const score = IntervalTreeSpanIndex.calculateSpanScore(s);
        debugLines.push(`  ${i}: "${s.text}" [${s.characterStart}-${s.characterEnd}] conf=${s.confidence.toFixed(3)} score=${score.toFixed(1)}`);
      });
      RadiologyLogger.info("IntervalTreeSpanIndex", debugLines.join("\n"));
    }

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

          const keptIndices = binding.dropOverlappingSpansFast(
            rustSpans,
          ) as number[];

          // Map back to original spans and sort by position
          const kept = keptIndices
            .map((i) => spans[i])
            .filter((s): s is Span => Boolean(s));

          return kept.sort((a, b) => a.characterStart - b.characterStart);
        } catch {
          // Fall back to TS implementation
        }
      }
    }

    // STEP 1: Remove exact duplicates (same position + type)
    // This handles filters that generate multiple matches for the same text
    const uniqueMap = new Map<string, Span>();
    for (const span of spans) {
      const key = `${span.characterStart}-${span.characterEnd}-${span.filterType}`;
      const existing = uniqueMap.get(key);
      if (!existing || existing.confidence < span.confidence) {
        uniqueMap.set(key, span);
      }
    }
    const uniqueSpans = Array.from(uniqueMap.values());

    if (uniqueSpans.length === 1) return uniqueSpans;

    // STEP 2: Score all spans
    const scoredSpans: ScoredSpan[] = uniqueSpans.map((span) => ({
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

    // STEP 3: Greedy overlap removal with containment logic
    const kept: Span[] = [];
    const debug = process.env.VULPES_DEBUG_OVERLAP === "1";

    for (const { span, score } of scoredSpans) {
      let shouldKeep = true;
      let indexToReplace = -1;
      let rejectReason = "";

      if (debug) RadiologyLogger.info("IntervalTreeSpanIndex", `[TRACE] Processing: "${span.text}" score=${score.toFixed(1)}`);

      for (let i = 0; i < kept.length; i++) {
        const existing = kept[i];

        // Check for overlap
        const noOverlap =
          span.characterEnd <= existing.characterStart ||
          span.characterStart >= existing.characterEnd;

        if (noOverlap) continue;

        // There IS an overlap - determine what to do
        const spanContainsExisting =
          span.characterStart <= existing.characterStart &&
          span.characterEnd >= existing.characterEnd;

        const existingContainsSpan =
          existing.characterStart <= span.characterStart &&
          existing.characterEnd >= span.characterEnd;

        const spanSpec = TYPE_SPECIFICITY[span.filterType as string] || 25;
        const existSpec = TYPE_SPECIFICITY[existing.filterType as string] || 25;

        if (debug) {
          RadiologyLogger.info("IntervalTreeSpanIndex", `  Overlaps with kept[${i}]: "${existing.text}"\n    spanContainsExisting=${spanContainsExisting} existingContainsSpan=${existingContainsSpan}\n    spanSpec=${spanSpec} existSpec=${existSpec}`);
        }

        if (spanContainsExisting) {
          // New span contains existing
          // If same type or existing is more specific with high confidence, reject new span
          if (spanSpec <= existSpec) {
            // Same or more specific type in existing - keep existing, reject new
            shouldKeep = false;
            rejectReason = "spanContainsExisting but same/lower specificity";
            break;
          }
          // New span is more specific - this is rare but could happen with different types
        } else if (existingContainsSpan) {
          // Existing contains new span
          if (spanSpec > existSpec && span.confidence >= 0.9) {
            // New span is more specific with high confidence - replace existing
            indexToReplace = i;
            rejectReason = "will replace existing";
            break;
          }
          // Same type or existing is more specific - reject new span
          shouldKeep = false;
          rejectReason = "existingContainsSpan, same/lower specificity";
          break;
        } else {
          // Partial overlap - existing wins (already sorted by score)
          shouldKeep = false;
          rejectReason = "partial overlap, existing wins";
          break;
        }
      }

      if (indexToReplace >= 0) {
        if (debug) RadiologyLogger.info("IntervalTreeSpanIndex", `  -> REPLACING kept[${indexToReplace}] with this span`);
        kept[indexToReplace] = span;
      } else if (shouldKeep) {
        if (debug) RadiologyLogger.info("IntervalTreeSpanIndex", `  -> KEEPING (kept.length now ${kept.length + 1})`);
        kept.push(span);
      } else {
        if (debug) RadiologyLogger.info("IntervalTreeSpanIndex", `  -> REJECTED: ${rejectReason}`);
      }
    }

    // Sort by position for consistent output
    const result = kept.sort((a, b) => a.characterStart - b.characterStart);

    // DEBUG: Log output spans
    if (process.env.VULPES_DEBUG_OVERLAP === "1") {
      const outputLines = ["[DEBUG] dropOverlappingSpans output:"];
      result.forEach((s, i) => {
        outputLines.push(`  ${i}: "${s.text}" [${s.characterStart}-${s.characterEnd}]`);
      });
      RadiologyLogger.info("IntervalTreeSpanIndex", outputLines.join("\n"));
    }

    return result;
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
