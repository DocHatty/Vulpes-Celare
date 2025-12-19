/**
 * EmailFilterSpan - Email Address Detection (Span-Based)
 *
 * Detects email addresses using RFC 5322 compliant patterns and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */

import { Span, FilterType } from "../models/Span";
import { SpanBasedFilter, FilterPriority } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
import { RustScanKernel } from "../utils/RustScanKernel";

export class EmailFilterSpan extends SpanBasedFilter {
  /**
   * Pre-compiled email regex pattern for maximum performance
   *
   * Pattern breakdown:
   * - Local part: A-Z0-9._%+- (standard email characters)
   * - @ symbol
   * - Domain: A-Z0-9.- (standard domain characters)
   * - TLD: At least 2 characters (com, org, edu, etc.)
   */
  private static readonly EMAIL_PATTERN =
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

  getType(): string {
    return "EMAIL";
  }

  getPriority(): number {
    return FilterPriority.EMAIL;
  }

  detect(text: string, _config: any, context: RedactionContext): Span[] {
    const accelerated = RustScanKernel.getDetections(context, text, "EMAIL");
    if (accelerated && accelerated.length > 0) {
      return accelerated.map((d) => {
        return new Span({
          text: d.text,
          originalValue: d.text,
          characterStart: d.characterStart,
          characterEnd: d.characterEnd,
          filterType: FilterType.EMAIL,
          confidence: d.confidence,
          priority: this.getPriority(),
          context: this.extractContext(text, d.characterStart, d.characterEnd),
          window: [],
          replacement: null,
          salt: null,
          pattern: d.pattern,
          applied: false,
          ignored: false,
          ambiguousWith: [],
          disambiguationScore: null,
        });
      });
    }

    const spans: Span[] = [];
    const pattern = EmailFilterSpan.EMAIL_PATTERN;
    pattern.lastIndex = 0; // Reset regex

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const span = this.createSpanFromMatch(
        text,
        match,
        FilterType.EMAIL,
        0.95, // High confidence for email
      );
      spans.push(span);
    }

    return spans;
  }
}
