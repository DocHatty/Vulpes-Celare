/**
 * CreditCardFilterSpan - Credit Card Number Detection (Span-Based)
 *
 * Detects credit card numbers with Luhn algorithm validation and returns Spans.
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

export class CreditCardFilterSpan extends SpanBasedFilter {
  /**
   * Credit card regex pattern sources
   *
   * Matches:
   * - Labeled format: "Card: 1234-5678-9012-3456"
   * - Standalone: "1234567890123456"
   * - Various separators: dashes, spaces, none
   * - 13-19 digits (industry standard)
   */
  private static readonly CC_PATTERN_SOURCES = [
    // Labeled format: "Card:" or "CC:" followed by number
    /\b(?:card|cc|credit\s*card)\s*[:#]?\s*([\d\s-]{13,23})\b/gi,
    // Standalone card numbers (13-19 digits with optional separators)
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{1,7}\b/g,
  ];

  /**
   * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
   */
  private static readonly COMPILED_PATTERNS =
    CreditCardFilterSpan.compilePatterns(
      CreditCardFilterSpan.CC_PATTERN_SOURCES,
    );

  getType(): string {
    return "CREDITCARD";
  }

  getPriority(): number {
    return FilterPriority.CREDITCARD;
  }

  detect(text: string, config: any, context: RedactionContext): Span[] {
    const spans: Span[] = [];

    for (const pattern of CreditCardFilterSpan.COMPILED_PATTERNS) {
      pattern.lastIndex = 0; // Reset regex
      let match;

      while ((match = pattern.exec(text)) !== null) {
        // For labeled format, use captured group; otherwise use full match
        const cardNumber = match[1] || match[0];

        // Validate with Luhn algorithm
        if (this.passesLuhnCheck(cardNumber)) {
          // For labeled matches, we need to find the actual card number position
          if (match[1]) {
            // Labeled format - create span for the card number only
            const cardStart = match.index! + match[0].indexOf(cardNumber);
            const cardEnd = cardStart + cardNumber.length;

            const span = new Span({
              text: cardNumber.trim(),
              originalValue: cardNumber.trim(),
              characterStart: cardStart,
              characterEnd: cardEnd,
              filterType: FilterType.CREDIT_CARD,
              confidence: 0.95,
              priority: this.getPriority(),
              context: this.extractContext(text, cardStart, cardEnd),
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
          } else {
            // Standalone format
            const span = this.createSpanFromMatch(
              text,
              match,
              FilterType.CREDIT_CARD,
              0.95,
            );
            spans.push(span);
          }
        }
      }
    }

    return spans;
  }

  /**
   * Luhn algorithm validation
   *
   * The Luhn algorithm (mod 10 algorithm) validates credit card numbers.
   * NOTE: We accept invalid/example cards for HIPAA compliance -
   * must redact even fake examples in documents.
   */
  private passesLuhnCheck(cardNumber: string): boolean {
    // Remove all non-digits
    const digits = cardNumber.replace(/\D/g, "");

    // Must be 13-19 digits (standard card length)
    if (digits.length < 13 || digits.length > 19) {
      return false;
    }

    // For HIPAA: Accept cards that LOOK like credit cards
    // even if they fail Luhn (e.g., example numbers in documentation)
    // This prevents data leakage of fake/test card numbers

    let sum = 0;
    let isEven = false;

    // Loop through values starting from the rightmost digit
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    const luhnValid = sum % 10 === 0;

    // Accept if Luhn valid OR if it matches common test card patterns
    const isTestCard = /^(4532|4556|5425|2221|3782|6011)/.test(digits);

    return luhnValid || isTestCard;
  }
}
