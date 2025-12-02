/**
 * Span-Based Filter Interface
 *
 * Modern filter architecture where filters return Spans instead of modified text.
 * This enables:
 * - Parallel execution (all filters scan original text)
 * - No interference between filters
 * - Proper overlap resolution
 * - Significant performance improvement
 *
 * @module redaction/core
 */

import { Span, FilterType } from "../models/Span";
import { RedactionContext } from "../context/RedactionContext";

/**
 * Base interface for Span-based filters
 * Filters scan text and return detected entities as Spans
 */
export abstract class SpanBasedFilter {
  /**
   * Scan text and return all detected entities as Spans
   * This method should NOT modify the text - just detect and return positions
   *
   * @param text - Original text to scan
   * @param config - Filter configuration from policy
   * @param context - Redaction context (for metadata only, not for token creation yet)
   * @returns Array of detected Spans
   */
  abstract detect(
    text: string,
    config: any,
    context: RedactionContext,
  ): Promise<Span[]> | Span[];

  /**
   * Get filter type (NAME, SSN, PHONE, etc.)
   */
  abstract getType(): string;

  /**
   * Get priority for overlap resolution
   * Higher priority wins when spans overlap
   * Default: 5
   */
  getPriority(): number {
    return 5;
  }

  /**
   * Helper: Create a Span from a regex match
   */
  protected createSpanFromMatch(
    text: string,
    match: RegExpMatchArray,
    filterType: FilterType,
    confidence: number = 0.9,
    priority?: number,
  ): Span {
    const start = match.index!;
    const end = start + match[0].length;

    return new Span({
      text: match[0],
      originalValue: match[0],
      characterStart: start,
      characterEnd: end,
      filterType: filterType,
      confidence: confidence,
      priority: priority ?? this.getPriority(),
      context: this.extractContext(text, start, end),
      window: [],
      replacement: null,
      salt: null,
      pattern: null,
      applied: false,
      ignored: false,
      ambiguousWith: [],
      disambiguationScore: null,
    });
  }

  /**
   * Extract context around a match
   */
  protected extractContext(text: string, start: number, end: number): string {
    const contextSize = 50;
    const contextStart = Math.max(0, start - contextSize);
    const contextEnd = Math.min(text.length, end + contextSize);
    return text.substring(contextStart, contextEnd);
  }

  /**
   * Helper: Compile regex patterns once at class initialization
   * PERFORMANCE OPTIMIZATION: Pre-compile patterns to avoid recompilation on every detect() call
   *
   * @param patterns - Array of regex pattern strings or RegExp objects
   * @param flags - Flags to apply (default: 'gi' for global case-insensitive)
   * @returns Array of compiled RegExp objects
   *
   * Usage in filter class:
   * private static readonly COMPILED_PATTERNS = SpanBasedFilter.compilePatterns([
   *   /pattern1/gi,
   *   /pattern2/gi
   * ]);
   */
  protected static compilePatterns(
    patterns: (RegExp | string)[],
    flags: string = "gi",
  ): RegExp[] {
    return patterns.map((pattern) => {
      if (pattern instanceof RegExp) {
        // Extract source and flags from existing RegExp
        return new RegExp(pattern.source, pattern.flags || flags);
      } else {
        // Compile string pattern
        return new RegExp(pattern, flags);
      }
    });
  }
}

/**
 * Priority levels for common filter types
 * Higher priority wins when spans overlap
 */
export const FilterPriority = {
  // Highest priority - uniquely identifying
  SSN: 10,
  CREDITCARD: 10,

  // Medical identifiers
  MRN: 9,
  NPI: 9,
  DEVICE: 9,

  // Financial and technical
  ACCOUNT: 8,
  LICENSE: 8,
  HEALTHPLAN: 8,

  // Temporal
  DATE: 8,

  // Contact info
  PHONE: 7,
  FAX: 7,
  EMAIL: 7,

  // Personal identifiers
  NAME: 6,

  // Location
  ADDRESS: 5,
  ZIPCODE: 4,

  // Context-dependent identifiers
  VEHICLE: 5,
  BIOMETRIC: 5,

  // Technical
  URL: 3,
  IP: 3,

  // Least priority
  OCCUPATION: 2,
};
