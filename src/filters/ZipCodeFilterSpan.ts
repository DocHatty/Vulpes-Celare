/**
 * ZipCodeFilterSpan - ZIP Code Detection (Span-Based)
 *
 * Detects 5-digit and 9-digit US ZIP codes and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */

import { Span, FilterType } from "../models/Span";
import {
  SpanBasedFilter,
  FilterPriority,
} from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";

export class ZipCodeFilterSpan extends SpanBasedFilter {
  /**
   * ZIP code regex pattern sources
   *
   * Pattern 1: 9-digit ZIP+4 (12345-6789) - must check first to avoid partial match
   * Pattern 2: Standard 5-digit ZIP (12345)
   */
  private static readonly ZIP_PATTERN_SOURCES = [
    /\b\d{5}-\d{4}\b/g, // ZIP+4 format (must check first to avoid partial match)
    /\b\d{5}\b/g, // Standard 5-digit ZIP
  ];

  /**
   * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
   */
  private static readonly COMPILED_PATTERNS = ZipCodeFilterSpan.compilePatterns(
    ZipCodeFilterSpan.ZIP_PATTERN_SOURCES,
  );

  getType(): string {
    return "ZIPCODE";
  }

  getPriority(): number {
    return FilterPriority.ZIPCODE;
  }

  detect(text: string, config: any, context: RedactionContext): Span[] {
    const spans: Span[] = [];

    // Apply patterns in order (ZIP+4 first to avoid partial matches)
    for (const pattern of ZipCodeFilterSpan.COMPILED_PATTERNS) {
      pattern.lastIndex = 0; // Reset regex
      let match;

      while ((match = pattern.exec(text)) !== null) {
        const span = this.createSpanFromMatch(
          text,
          match,
          FilterType.ZIPCODE,
          0.85, // Good confidence for ZIP codes
        );
        spans.push(span);
      }
    }

    return spans;
  }
}
