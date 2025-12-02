/**
 * NPIFilterSpan - National Provider Identifier Detection (Span-Based)
 *
 * Detects 10-digit NPI values when explicitly labeled and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */

import { Span, FilterType } from "../models/Span";
import { SpanBasedFilter, FilterPriority } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";

export class NPIFilterSpan extends SpanBasedFilter {
  /**
   * Explicit NPI label + 10 digits
   */
  private static readonly NPI_PATTERN =
    /\bNPI(?:\s+(?:Number|No|#))?\s*[#:]*\s*([0-9]{10})\b/gi;

  getType(): string {
    return "NPI";
  }

  getPriority(): number {
    return FilterPriority.MRN; // Same priority as MRN
  }

  detect(text: string, config: any, context: RedactionContext): Span[] {
    const spans: Span[] = [];
    const pattern = NPIFilterSpan.NPI_PATTERN;
    pattern.lastIndex = 0; // Reset regex

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const npi = match[1]; // Captured NPI number
      const fullMatch = match[0];

      // Ensure it's 10 digits
      if (/^\d{10}$/.test(npi)) {
        // Find the position of the NPI number within the full match
        const npiStart = match.index! + fullMatch.indexOf(npi);
        const npiEnd = npiStart + npi.length;

        const span = new Span({
          text: npi,
          originalValue: npi,
          characterStart: npiStart,
          characterEnd: npiEnd,
          filterType: FilterType.NPI,
          confidence: 0.95,
          priority: this.getPriority(),
          context: this.extractContext(text, npiStart, npiEnd),
          window: [],
          replacement: null,
          salt: null,
          pattern: null,
          applied: false,
          ignored: false,
          ambiguousWith: [],
          disambiguationScore: null,
        });
        spans.push(span);
      }
    }

    return spans;
  }
}
