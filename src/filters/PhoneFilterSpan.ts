/**
 * PhoneFilterSpan - Phone Number Detection (Span-Based)
 *
 * Detects phone numbers in various formats (US and International) and returns Spans.
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

export class PhoneFilterSpan extends SpanBasedFilter {
  /**
   * Phone number pattern sources
   *
   * US Formats:
   * - (123) 456-7890, 123-456-7890, 123.456.7890
   * - +1 (123) 456-7890, 1-800-555-1234
   *
   * International Formats:
   * - +44 20 7946 0958 (UK)
   * - +33 1 23 45 67 89 (France)
   * - +49 30 12345678 (Germany)
   * - +61 2 9876 5432 (Australia)
   * - +1 416-555-1234 (Canada)
   *
   * With Extensions (numeric and vanity):
   * - 123-456-7890 ext. 123
   * - 123-456-7890 x123
   * - 123-456-7890, ext 456
   * - 415-555-HELP (vanity extension)
   * - 415-555-ortho (vanity extension)
   */
  private static readonly PHONE_PATTERN_SOURCES = [
    // ===== US/CANADA FORMAT (10 digits) =====
    // Standard US: (123) 456-7890, 123-456-7890, 123.456.7890
    // Includes optional numeric or vanity (alphanumeric) extensions
    /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?:\s*(?:ext\.?|x|extension)\s*[A-Z0-9]{1,6})?\b/gi,

    // ===== VANITY NUMBER FORMATS =====
    // Vanity numbers where last segment is letters: 415-555-HELP, 800-FLOWERS, 415-555-ortho
    // Use [-.] instead of [-.\s] to avoid matching across newlines
    /(\+?1[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-][A-Z]{4,7}\b/gi,
    // Partial vanity: 1-800-GO-FEDEX style
    // Use [-.] instead of [-.\s] to avoid matching "80012\nPhone" as vanity
    /(\+?1[-.]?)?\(?\d{3}\)?[-.]?[A-Z0-9]{2,3}[-][A-Z]{4,7}\b/gi,

    // ===== UK FORMATS =====
    // +44 with area code: +44 20 7946 0958, +44 (0)20 7946 0958
    /\+44\s*\(?0?\)?\s*\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}(?:\s*(?:ext\.?|x)\s*[A-Z0-9]{1,6})?\b/gi,
    // UK mobile: +44 7XXX XXXXXX
    /\+44\s*7\d{3}[\s.-]?\d{3}[\s.-]?\d{3}(?:\s*(?:ext\.?|x)\s*[A-Z0-9]{1,6})?\b/gi,
    // UK landline without +44: 020 7946 0958, 0121 496 0123
    /\b0\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}(?:\s*(?:ext\.?|x)\s*[A-Z0-9]{1,6})?\b/g,

    // ===== FRENCH FORMATS =====
    // +33 format: +33 1 23 45 67 89
    /\+33\s*\(?0?\)?\s*[1-9](?:[\s.-]?\d{2}){4}(?:\s*(?:ext\.?|x)\s*[A-Z0-9]{1,6})?\b/gi,
    // French format without +33: 01 23 45 67 89
    /\b0[1-9](?:[\s.-]?\d{2}){4}(?:\s*(?:ext\.?|x)\s*[A-Z0-9]{1,6})?\b/g,

    // ===== GERMAN FORMATS =====
    // +49 format: +49 30 12345678
    /\+49\s*\(?0?\)?\s*\d{2,5}[\s.-]?\d{3,8}(?:\s*(?:ext\.?|x)\s*[A-Z0-9]{1,6})?\b/gi,

    // ===== AUSTRALIAN FORMATS =====
    // +61 format: +61 2 9876 5432
    /\+61\s*\(?0?\)?\s*[2-9][\s.-]?\d{4}[\s.-]?\d{4}(?:\s*(?:ext\.?|x)\s*[A-Z0-9]{1,6})?\b/gi,
    // Australian without +61: (02) 9876 5432
    /\b\(?0[2-9]\)?[\s.-]?\d{4}[\s.-]?\d{4}(?:\s*(?:ext\.?|x)\s*[A-Z0-9]{1,6})?\b/g,

    // ===== GENERIC INTERNATIONAL =====
    // Generic +XX format (catches other country codes)
    /\+[1-9]\d{0,2}[\s.-]?\(?\d{1,4}\)?(?:[\s.-]?\d{1,4}){2,4}(?:\s*(?:ext\.?|x|extension)\s*[A-Z0-9]{1,6})?\b/gi,

    // ===== OCR/FORMATTING VARIATIONS =====
    // Dot-prefix format with dot separators: .509. 988.8586
    // This catches OCR-corrupted or unconventionally formatted phones
    /\.?\d{3}\.?\s*\d{3}\.\d{4}\b/g,
  ];

  /**
   * PERFORMANCE OPTIMIZATION: Pre-compiled regex patterns (compiled once at class load)
   * Avoids recompiling 13 patterns on every detect() call
   */
  private static readonly COMPILED_PATTERNS = PhoneFilterSpan.compilePatterns(
    PhoneFilterSpan.PHONE_PATTERN_SOURCES,
  );

  getType(): string {
    return "PHONE";
  }

  getPriority(): number {
    return FilterPriority.PHONE;
  }

  detect(text: string, config: any, context: RedactionContext): Span[] {
    const spans: Span[] = [];

    // Apply all phone patterns (using pre-compiled patterns)
    for (const pattern of PhoneFilterSpan.COMPILED_PATTERNS) {
      pattern.lastIndex = 0; // Reset regex

      let match;
      while ((match = pattern.exec(text)) !== null) {
        const phone = match[0];
        const offset = match.index!;

        // Skip if preceding label indicates this is an NPI
        const windowStart = Math.max(0, offset - 20);
        const labelWindow = text.substring(windowStart, offset).toLowerCase();
        if (labelWindow.includes("npi")) {
          continue;
        }

        // Validate minimum digit count (7 digits minimum for most formats)
        // For vanity numbers, letters count as digits (e.g., 555-TEETH = 7 chars)
        const digitCount = (phone.match(/\d/g) || []).length;
        const letterCount = (phone.match(/[A-Za-z]/g) || []).length;
        const totalAlphanumeric = digitCount + letterCount;

        // Vanity numbers: if there are letters, use combined count
        // Regular numbers: must have at least 7 digits
        if (letterCount > 0) {
          // Vanity number - need at least 10 alphanumeric (area code + exchange + suffix)
          if (totalAlphanumeric < 10) {
            continue;
          }
        } else {
          // Regular number - need at least 7 digits
          if (digitCount < 7) {
            continue;
          }
        }

        // Determine confidence based on pattern specificity
        let confidence = 0.9;
        if (phone.startsWith("+")) {
          confidence = 0.95; // International format is more specific
        }
        if (/ext|extension/i.test(phone)) {
          confidence = 0.95; // Extensions increase confidence
        }

        const span = this.createSpanFromMatch(
          text,
          match,
          FilterType.PHONE,
          confidence,
        );
        spans.push(span);
      }
    }

    return spans;
  }
}
