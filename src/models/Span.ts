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

import { IntervalTreeSpanIndex } from "./IntervalTreeSpanIndex";
import { loadNativeBinding } from "../native/binding";
import { TYPE_SPECIFICITY } from "./FilterPriority";
import { RustAccelConfig } from "../config/RustAccelConfig";

let cachedSpanBinding: ReturnType<typeof loadNativeBinding> | null | undefined =
  undefined;

function isSpanAccelEnabled(): boolean {
  return RustAccelConfig.isSpanOpsEnabled();
}

function getSpanBinding(): ReturnType<typeof loadNativeBinding> | null {
  if (cachedSpanBinding !== undefined) return cachedSpanBinding;
  try {
    cachedSpanBinding = loadNativeBinding({ configureOrt: false });
  } catch {
    cachedSpanBinding = null;
  }
  return cachedSpanBinding;
}

export enum FilterType {
  // Identity
  NAME = "NAME",
  PROVIDER_NAME = "PROVIDER_NAME", // Healthcare provider names (Dr., Prof., etc.) - redacted but labeled differently
  EMAIL = "EMAIL",
  SSN = "SSN",
  PHONE = "PHONE",
  FAX = "FAX",

  // Geographic
  ADDRESS = "ADDRESS",
  ZIPCODE = "ZIPCODE",
  CITY = "CITY",
  STATE = "STATE",
  COUNTY = "COUNTY",

  // Temporal
  DATE = "DATE",
  RELATIVE_DATE = "RELATIVE_DATE",
  AGE = "AGE",

  // Financial
  CREDIT_CARD = "CREDIT_CARD",
  ACCOUNT = "ACCOUNT",
  BITCOIN = "BITCOIN",
  IBAN = "IBAN",

  // Medical
  MRN = "MRN",
  HEALTH_PLAN = "HEALTH_PLAN",
  DEVICE = "DEVICE",
  LICENSE = "LICENSE",
  PASSPORT = "PASSPORT",

  // Technical
  IP = "IP",
  URL = "URL",
  MAC_ADDRESS = "MAC_ADDRESS",

  // Contextual
  BIOMETRIC = "BIOMETRIC",
  VEHICLE = "VEHICLE",
  OCCUPATION = "OCCUPATION",

  // Custom
  CUSTOM = "CUSTOM",
}

export interface SpanMetadata {
  // Original text information
  text: string;
  originalValue: string;

  // Position information
  characterStart: number;
  characterEnd: number;

  // Classification
  filterType: FilterType;
  confidence: number; // 0.0 to 1.0
  priority: number; // Higher = more important in disambiguation

  // Context
  context: string; // Document/session context
  window: string[]; // Surrounding tokens (e.g., ±5 words)

  // Replacement
  replacement: string | null;
  salt: string | null; // For hashing strategies

  // Pattern information
  pattern: string | null; // Regex pattern that matched (for validation)

  // Status flags
  applied: boolean; // Has replacement been applied?
  ignored: boolean; // Should this span be ignored?

  // Disambiguation
  ambiguousWith: FilterType[]; // Other possible interpretations
  disambiguationScore: number | null; // Score from disambiguation service
}

/**
 * Span - Represents a detected entity in text
 */
export class Span {
  // Core properties
  public characterStart: number;
  public characterEnd: number;
  public text: string;
  public filterType: FilterType;
  public confidence: number;
  public priority: number;

  // Context
  public context: string;
  public window: string[];

  // Replacement
  public replacement: string | null;
  public salt: string | null;

  // Pattern
  public pattern: string | null;

  // Flags
  public applied: boolean;
  public ignored: boolean;

  // Disambiguation
  public ambiguousWith: FilterType[];
  public disambiguationScore: number | null;

  constructor(metadata: SpanMetadata) {
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
  get length(): number {
    return this.characterEnd - this.characterStart;
  }

  /**
   * Check if this span overlaps with another
   */
  overlapsWith(other: Span): boolean {
    return !(
      this.characterEnd <= other.characterStart ||
      this.characterStart >= other.characterEnd
    );
  }

  /**
   * Check if this span is identical to another (same position and length)
   */
  isIdenticalTo(other: Span): boolean {
    return (
      this.characterStart === other.characterStart &&
      this.characterEnd === other.characterEnd
    );
  }

  /**
   * Check if this span fully contains another span
   */
  contains(other: Span): boolean {
    return (
      this.characterStart <= other.characterStart &&
      this.characterEnd >= other.characterEnd
    );
  }

  /**
   * Create a copy of this span
   */
  clone(): Span {
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
  toToken(sessionId: string, count: number): string {
    return `{{${this.filterType}_${sessionId}_${count}}}`;
  }

  /**
   * Shift span positions (used after text manipulation)
   */
  shift(offset: number): void {
    this.characterStart += offset;
    this.characterEnd += offset;
  }
}

/**
 * Span Utilities - Operations on collections of spans
 *
 * PERFORMANCE: Now uses IntervalTree for O(n log n) overlap detection
 * instead of O(n²) nested loops.
 */
export class SpanUtils {
  // Performance flag - can be disabled for debugging
  private static USE_INTERVAL_TREE = true;

  /**
   * Enable or disable interval tree optimization (for debugging)
   */
  static setUseIntervalTree(enabled: boolean): void {
    SpanUtils.USE_INTERVAL_TREE = enabled;
  }

  /**
   * Calculate composite score for a span
   * Used for tie-breaking when spans have similar characteristics
   *
   * @param span - The span to score
   * @returns A composite score (higher = better)
   */
  static calculateSpanScore(span: Span): number {
    const typeSpecificity = TYPE_SPECIFICITY[span.filterType as string] || 25;

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
  static dropOverlappingSpans(spans: Span[]): Span[] {
    if (spans.length === 0) return [];
    if (spans.length === 1) return spans;

    // Optional Rust accelerator (kept behind a feature flag).
    // Falls back to the existing IntervalTree implementation for safety.
    if (isSpanAccelEnabled()) {
      const binding = getSpanBinding();
      if (binding?.dropOverlappingSpans) {
        try {
          const indices = binding.dropOverlappingSpans(
            spans.map((s) => ({
              characterStart: s.characterStart,
              characterEnd: s.characterEnd,
              filterType: String(s.filterType),
              confidence: s.confidence,
              priority: s.priority,
              text: s.text, // Pass text for structure word detection
            })),
          );

          const kept = indices
            .map((i) => spans[i])
            .filter((s): s is Span => Boolean(s));
          return kept.sort((a, b) => a.characterStart - b.characterStart);
        } catch {
          // Fall back below.
        }
      }
    }

    // Use optimized IntervalTree implementation when enabled
    if (SpanUtils.USE_INTERVAL_TREE) {
      return IntervalTreeSpanIndex.dropOverlappingSpans(spans);
    }

    // Fallback to legacy implementation (for debugging/comparison)
    return SpanUtils.dropOverlappingSpansLegacy(spans);
  }

  /**
   * Legacy O(n²) implementation - kept for backward compatibility and debugging
   */
  private static dropOverlappingSpansLegacy(spans: Span[]): Span[] {
    // Calculate scores for all spans
    const scoredSpans = spans.map((span) => ({
      span,
      score: this.calculateSpanScore(span),
    }));

    // Sort by score (descending), then by position (ascending) for stability
    scoredSpans.sort((a, b) => {
      if (Math.abs(a.score - b.score) > 0.001) return b.score - a.score;
      // Secondary: prefer earlier spans for stability
      if (a.span.characterStart !== b.span.characterStart) {
        return a.span.characterStart - b.span.characterStart;
      }
      // Tertiary: prefer longer spans
      return b.span.length - a.span.length;
    });

    const nonOverlapping: Span[] = [];

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
          const spanSpec = TYPE_SPECIFICITY[span.filterType as string] || 25;
          const existSpec =
            TYPE_SPECIFICITY[existing.filterType as string] || 25;

          // If existing is more specific type and high confidence, keep it
          if (existSpec > spanSpec && existing.confidence >= 0.9) {
            shouldKeep = false;
            break;
          }
        }

        // Special case: existing fully contains new span
        if (existing.contains(span)) {
          const spanSpec = TYPE_SPECIFICITY[span.filterType as string] || 25;
          const existSpec =
            TYPE_SPECIFICITY[existing.filterType as string] || 25;

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
      } else if (shouldKeep) {
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
  static getIdenticalSpanGroups(spans: Span[]): Span[][] {
    return IntervalTreeSpanIndex.getIdenticalSpanGroups(spans);
  }

  /**
   * Merge spans from multiple sources (e.g., regex + NER)
   * Removes duplicates and resolves overlaps
   *
   * PERFORMANCE: O(n log n) using IntervalTree
   */
  static mergeSpans(spanArrays: Span[][]): Span[] {
    if (SpanUtils.USE_INTERVAL_TREE) {
      return IntervalTreeSpanIndex.mergeSpans(spanArrays);
    }

    // Legacy implementation
    const allSpans = spanArrays.flat();

    // Remove exact duplicates (same position, same type)
    const uniqueSpans = new Map<string, Span>();
    for (const span of allSpans) {
      const key = `${span.characterStart}-${span.characterEnd}-${span.filterType}`;

      if (
        !uniqueSpans.has(key) ||
        uniqueSpans.get(key)!.confidence < span.confidence
      ) {
        uniqueSpans.set(key, span);
      }
    }

    // Drop overlapping spans
    return SpanUtils.dropOverlappingSpans(Array.from(uniqueSpans.values()));
  }

  /**
   * Shift all spans by offset (used after text manipulation)
   */
  static shiftSpans(spans: Span[], offset: number): void {
    for (const span of spans) {
      span.shift(offset);
    }
  }

  /**
   * Filter spans by confidence threshold
   */
  static filterByConfidence(spans: Span[], minConfidence: number): Span[] {
    return spans.filter((span) => span.confidence >= minConfidence);
  }

  /**
   * Filter spans by filter type
   */
  static filterByType(spans: Span[], filterTypes: FilterType[]): Span[] {
    const typeSet = new Set(filterTypes);
    return spans.filter((span) => typeSet.has(span.filterType));
  }

  /**
   * Sort spans by position (ascending)
   */
  static sortByPosition(spans: Span[]): Span[] {
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
  static getTypeSpecificity(filterType: FilterType | string): number {
    return TYPE_SPECIFICITY[filterType as string] || 25;
  }
}
