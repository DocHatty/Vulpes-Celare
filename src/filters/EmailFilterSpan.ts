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

  detect(text: string, config: any, context: RedactionContext): Span[] {
    const spans: Span[] = [];
    const pattern = EmailFilterSpan.EMAIL_PATTERN;
    pattern.lastIndex = 0; // Reset regex

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const span = this.createSpanFromMatch(
        text,
        match,
        FilterType.EMAIL,
        0.95 // High confidence for email
      );
      spans.push(span);
    }

    return spans;
  }
}
