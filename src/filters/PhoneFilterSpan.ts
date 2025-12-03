/**
 * PhoneFilterSpan - Phone Number Detection (Span-Based)
 *
 * Detects phone numbers in various formats (US and International) and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */

import { Span, FilterType } from "../models/Span";
import { SpanBasedFilter, FilterPriority } from "../core/SpanBasedFilter";
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
    /(\+?1[-. \t]?)?\(?\d{3}\)?[-. \t]?\d{3}[-. \t]?\d{4}(?:[ \t]*(?:ext\.?|x|extension)[ \t]*[A-Z0-9]{1,6})?\b/gi,

    // ===== VANITY NUMBER FORMATS =====
    // Vanity numbers where last segment is letters: 415-555-HELP, 800-FLOWERS, 415-555-ortho
    // Use [-.] instead of [-. \t] to avoid matching across newlines
    /(\+?1[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-][A-Z]{4,7}\b/gi,
    // Partial vanity: 1-800-GO-FEDEX style
    // Use [-.] instead of [-. \t] to avoid matching "80012\nPhone" as vanity
    /(\+?1[-.]?)?\(?\d{3}\)?[-.]?[A-Z0-9]{2,3}[-][A-Z]{4,7}\b/gi,

    // ===== UK FORMATS =====
    // +44 with area code: +44 20 7946 0958, +44 (0)20 7946 0958
    /\+44[ \t]*\(?0?\)?[ \t]*\d{2,4}[ \t.-]?\d{3,4}[ \t.-]?\d{3,4}(?:[ \t]*(?:ext\.?|x)[ \t]*[A-Z0-9]{1,6})?\b/gi,
    // UK mobile: +44 7XXX XXXXXX
    /\+44[ \t]*7\d{3}[ \t.-]?\d{3}[ \t.-]?\d{3}(?:[ \t]*(?:ext\.?|x)[ \t]*[A-Z0-9]{1,6})?\b/gi,
    // UK landline without +44: 020 7946 0958, 0121 496 0123
    /\b0\d{2,4}[ \t.-]?\d{3,4}[ \t.-]?\d{3,4}(?:[ \t]*(?:ext\.?|x)[ \t]*[A-Z0-9]{1,6})?\b/g,

    // ===== FRENCH FORMATS =====
    // +33 format: +33 1 23 45 67 89
    /\+33[ \t]*\(?0?\)?[ \t]*[1-9](?:[ \t.-]?\d{2}){4}(?:[ \t]*(?:ext\.?|x)[ \t]*[A-Z0-9]{1,6})?\b/gi,
    // French format without +33: 01 23 45 67 89
    /\b0[1-9](?:[ \t.-]?\d{2}){4}(?:[ \t]*(?:ext\.?|x)[ \t]*[A-Z0-9]{1,6})?\b/g,

    // ===== GERMAN FORMATS =====
    // +49 format: +49 30 12345678
    /\+49[ \t]*\(?0?\)?[ \t]*\d{2,5}[ \t.-]?\d{3,8}(?:[ \t]*(?:ext\.?|x)[ \t]*[A-Z0-9]{1,6})?\b/gi,

    // ===== AUSTRALIAN FORMATS =====
    // +61 format: +61 2 9876 5432
    /\+61[ \t]*\(?0?\)?[ \t]*[2-9][ \t.-]?\d{4}[ \t.-]?\d{4}(?:[ \t]*(?:ext\.?|x)[ \t]*[A-Z0-9]{1,6})?\b/gi,
    // Australian without +61: (02) 9876 5432
    /\b\(?0[2-9]\)?[ \t.-]?\d{4}[ \t.-]?\d{4}(?:[ \t]*(?:ext\.?|x)[ \t]*[A-Z0-9]{1,6})?\b/g,

    // ===== GENERIC INTERNATIONAL =====
    // Generic +XX format (catches other country codes)
    /\+[1-9]\d{0,2}[ \t.-]?\(?\d{1,4}\)?(?:[ \t.-]?\d{1,4}){2,4}(?:[ \t]*(?:ext\.?|x|extension)[ \t]*[A-Z0-9]{1,6})?\b/gi,

    // ===== OCR/FORMATTING VARIATIONS =====
    // Dot-prefix format with dot separators: .509. 988.8586
    // This catches OCR-corrupted or unconventionally formatted phones
    /\.?\d{3}\.?[ \t]*\d{3}\.\d{4}\b/g,

    // ===== OCR LETTER SUBSTITUTION =====
    // S/s→5, O→0, l→1 in phone numbers: "+1 S06 367 1377", "S98-921-8771"
    // Pattern with S/s for 5: (S##) ###-####, S##-###-####, 8s0-2s2-9494
    /\(?[Ss5]\d{2}\)?[ \t.-]?\d{3}[ \t.-]?\d{4}\b/g,
    // Pattern with l or I for 1: "534 385 50l1"
    /\d{3}[ \t.-]?\d{3}[ \t.-]?\d{2}[lI1]\d\b/gi,
    // Missing area code digit: "(50) 480-1986" should still be caught
    /\(\d{2}\)[ \t]*\d{3}[ \t.-]?\d{4}\b/g,
    // Space in middle of exchange: "433-88 0-6865", "380.7 29.5107"
    /\d{3}[ \t.-]?\d{1,2}[ \t]+\d{1,2}[ \t.-]?\d{4}\b/g,
    // S/s in middle position: "588 S76 3513", "949 34B 67S2"
    /\d{3}[ \t.-]?[Ss5]\d{2}[ \t.-]?\d{4}\b/g,
    // B→8 in middle position: "682-3B0-6989"
    /\d{3}[ \t.-]?\d?[B8]\d[ \t.-]?\d{4}\b/gi,
    // Space after dash: "926- 151-4377"
    /\d{3}-[ \t]+\d{3}[ \t.-]?\d{4}\b/g,
    // Double space in middle: "+1 644  510 6562"
    /\d{3}[ \t]{2,}\d{3}[ \t.-]?\d{4}\b/g,
    // Mixed lowercase s substitution throughout: "8s0-2s2-9494"
    /[0-9s]{3}[ \t.-]?[0-9s]{3}[ \t.-]?[0-9s]{4}\b/g,

    // ===== COMPREHENSIVE OCR CHARACTER SUBSTITUTION =====
    // Common OCR mistakes: O→0, l→1, |→1, I→1, B→8, S→5, b→6, s→5, o→0
    // Matches: "5B3 798 6I77" for "583 798 6177", "931 9|7 7367" for "931 917 7367"
    // Phone with | for 1: "931 9|7 7367", "299.S65.|7B7"
    /[0-9OoIlSsBb|]{3}[ \t.-]?[0-9OoIlSsBb|]{3}[ \t.-]?[0-9OoIlSsBb|]{4}\b/gi,
    // With area code variations
    /\(?[0-9OoSsBb]{3}\)?[ \t.-]?[0-9OoIlSsBb|]{3}[ \t.-]?[0-9OoIlSsBb|]{4}\b/gi,

    // ===== EXTREME OCR/SPACING ERRORS =====
    // Missing digit in area code: "(50) 480-1986", "(4 51) 981-6861"
    /\(?\d{1,2}\s*\d?\)?[ \t.-]?\d{3}[ \t.-]?\d{4}\b/g,
    // Extra spaces in area code: "+1 (7 86) 350-5940", "(4 51) 981-6861"
    /\+?1?[ \t.-]?\(?\d\s+\d{2}\)?[ \t.-]?\d{3}[ \t.-]?\d{4}\b/g,
    // Double dash: "72--1959-3902"
    /\d{2,3}--\d{3,4}-\d{4}\b/g,
    // Dot format with extra digits: "6218.56.3750", "57.9239.3616"
    /\d{2,4}\.\d{2,4}\.\d{4}\b/g,
    // Unusual spacing: "48 303 8234", "305 267 52z7"
    /\b\d{2,3}\s+\d{3}\s+\d{4}[A-Za-z]?\b/g,
    // Extra digit in segment: "710-55584468", "324-22 66-253"
    /\d{3}[-.]?\d{4,5}[-.]?\d{3,4}\b/g,
    // OCR letters throughout: "+1 g5I-953-35B0", "(Q31) 4816-186"
    /\+?1?[ \t.-]?\(?[0-9gGqQOoIlSsBb|]{2,3}\)?[ \t.-]?[0-9gGqQOoIlSsBb|]{3,4}[-.]?[0-9gGqQOoIlSsBb|]{3,4}\b/gi,
    // Phone with fax prefix corrupted: "Fa x426 414 9q69"
    /\bFa?\s*x?\s*\d{3}[ \t.-]?\d{3}[ \t.-]?\d{3,4}[A-Za-z]?\d?\b/gi,
    // Space in extension format: "536 635 919" (9 digits with spaces)
    /\b\d{3}\s+\d{3}\s+\d{3}\b/g,
    // International with OCR: "Z316712479" (10 chars starting with letter)
    /\b[A-Za-z]\d{9}\b/g,
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
