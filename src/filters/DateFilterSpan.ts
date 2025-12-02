/**
 * DateFilterSpan - Date Detection (Span-Based)
 *
 * Detects dates in various formats and returns Spans.
 * Note: Date shifting/chronological preservation will be handled at the redaction stage.
 * Parallel-execution ready.
 *
 * @module filters
 */

import { Span, FilterType } from "../models/Span";
import { SpanBasedFilter, FilterPriority } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";

export class DateFilterSpan extends SpanBasedFilter {
  /**
   * Month names for pattern building
   */
  private static readonly MONTHS_FULL =
    "January|February|March|April|May|June|July|August|September|October|November|December";
  private static readonly MONTHS_ABBR =
    "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec";
  private static readonly MONTHS_ALL = `${DateFilterSpan.MONTHS_FULL}|${DateFilterSpan.MONTHS_ABBR}`;

  /**
   * Date regex pattern sources
   *
   * US Formats:
   * - MM/DD/YYYY or MM-DD-YYYY
   * - MM/DD/YY or MM-DD-YY
   *
   * ISO Format:
   * - YYYY/MM/DD or YYYY-MM-DD
   *
   * European Format:
   * - DD/MM/YYYY (when day > 12, unambiguous)
   * - DD.MM.YYYY (common in EU)
   *
   * Named Month Formats:
   * - Month DD, YYYY
   * - DD Month YYYY
   *
   * Ordinal Formats:
   * - January 15th, 2024
   * - 15th of January 2024
   *
   * Military Format:
   * - 23JAN2024
   *
   * Abbreviated:
   * - Jan 15, 2024
   * - 15 Jan 2024
   */
  private static readonly DATE_PATTERN_SOURCES = [
    // ===== US FORMATS =====
    // MM/DD/YYYY or MM-DD-YYYY
    /\b(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])[-/](19|20)\d{2}\b/g,
    // MM/DD/YY or MM-DD-YY (short year format like 1/15/60)
    /\b(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])[-/]\d{2}\b/g,

    // ===== OCR ERROR TOLERANT FORMATS =====
    // OCR often substitutes: l for 1, O for 0, I for 1, | for 1, o for 0
    // MM/DD/YYYY with OCR errors (l→1, O→0, I→1, |→1, o→0)
    /\b([Oo0]?[1-9lI|]|[1lI|][Oo0-2])[-/]([Oo0]?[1-9lI|]|[1-2lI|][Oo0-9lI|]|3[Oo01lI|])[-/]([1lI|]9|2[Oo0])[Oo0-9lI|]{2}\b/g,
    // MM/DD/YY with OCR errors
    /\b([Oo0]?[1-9lI|]|[1lI|][Oo0-2])[-/]([Oo0]?[1-9lI|]|[1-2lI|][Oo0-9lI|]|3[Oo01lI|])[-/][Oo0-9lI|]{2}\b/g,

    // ===== SPACE-TOLERANT OCR FORMATS =====
    // Handles accidental spaces from OCR: "10/24 /1961", "03/2 5/1985", "07 /21/1956"
    /\b\d{1,2}\s*[-/]\s*\d{1,2}\s*[-/]\s*(?:19|20)\d{2}\b/g,
    // Extra digit from OCR scan errors: "055/13/1996", "011/20/1963", "033/25/1985"
    /\b0\d{2}[-/]\d{1,2}[-/](?:19|20)\d{2}\b/g,
    /\b\d{1,2}[-/]0\d{2}[-/](?:19|20)\d{2}\b/g,
    // Swapped digits at start: "60/25/1959" (should be 06/25), "70/14/1968" (should be 07/14)
    /\b[1-9]0[-/]\d{1,2}[-/](?:19|20)\d{2}\b/g,
    // Missing separator (digits run together): "05/122019", "07/162007"
    /\b\d{1,2}[-/]\d{2,3}[-/]?\d{4}\b/g,
    // Misplaced separator: "04/191/985"
    /\b\d{1,2}[-/]\d{2,3}[-/]\d{3}\b/g,
    // B→8, L→1 OCR errors: "0B/17/2013", "08/25/L970"
    /\b[0Oo][B8][-/]\d{1,2}[-/](?:19|20|[Ll]9|[Ll]0)\d{2}\b/gi,
    /\b\d{1,2}[-/]\d{1,2}[-/](?:[Ll]9|[Ll]0)\d{2}\b/g,
    // Double separator: "01/24//1988"
    /\b\d{1,2}[-/]{1,2}\d{1,2}[-/]{1,2}(?:19|20)\d{2}\b/g,
    // Extra digit in middle: "111/3/1960", "08/O33/1968"
    /\b\d{2,3}[-/]\d{1,3}[-/](?:19|20)\d{2}\b/g,
    // Combined OCR: space + letter sub like "O8/O6/196 4"
    /\b[Oo0][0-9B8][-/][Oo0][0-9][-/]\d{2,3}\s*\d{1,2}\b/g,
    // Space in year: "10/02/1 997", "03/03/1 961"
    /\b\d{1,2}[-/]\d{1,2}[-/]\d{1,2}\s+\d{2,3}\b/g,
    // BB for 88 in year: "01/06/19BB"
    /\b\d{1,2}[-/]\d{1,2}[-/]19[B8]{2}\b/gi,

    // ===== COMPREHENSIVE OCR CHARACTER SUBSTITUTION =====
    // Common OCR mistakes: O→0, l→1, |→1, I→1, B→8, S→5, b→6, s→5, o→0
    // Pattern: Any date-like structure with these substitutions
    // Matches: "O9/l1/|9B6" for "09/11/1986", "o7/|B/|96B" for "07/18/1968"
    /\b[O0o][0-9lI|SsBb][-/][O0olI|][0-9lI|SsBb][-/][|lI1][9][O0oSsBb][0-9lI|SsBb]\b/gi,
    /\b[O0o]?[0-9lI|][-/][O0o]?[0-9lI|][-/][|lI1][9][0-9SsBbO0o]{2}\b/gi,
    // More permissive: any mix of digits and OCR-confusable chars in date positions
    /\b[0-9OoIlSsBb|]{1,2}[-/][0-9OoIlSsBb|]{1,2}[-/][0-9OoIlSsBb|]{4}\b/gi,

    // ===== ISO FORMAT =====
    // YYYY/MM/DD or YYYY-MM-DD
    /\b(19|20)\d{2}[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/g,

    // ===== EUROPEAN FORMATS =====
    // DD/MM/YYYY or DD-MM-YYYY (unambiguous when day > 12)
    /\b(1[3-9]|2[0-9]|3[01])[-/](0?[1-9]|1[0-2])[-/](19|20)\d{2}\b/g,
    // DD.MM.YYYY (European dot separator)
    /\b(0?[1-9]|[12]\d|3[01])\.(0?[1-9]|1[0-2])\.(19|20)\d{2}\b/g,
    // DD.MM.YY (European short)
    /\b(0?[1-9]|[12]\d|3[01])\.(0?[1-9]|1[0-2])\.\d{2}\b/g,

    // ===== NAMED MONTH FORMATS =====
    // Month DD, YYYY (January 15, 2024)
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+(19|20)\d{2}\b/gi,
    // DD Month YYYY (15 January 2024)
    /\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(19|20)\d{2}\b/gi,

    // ===== ABBREVIATED MONTH FORMATS =====
    // Mon DD, YYYY or Mon. DD, YYYY (Jan 15, 2024)
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+(19|20)\d{2}\b/gi,
    // DD Mon YYYY (15 Jan 2024)
    /\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(19|20)\d{2}\b/gi,

    // ===== ORDINAL DATE FORMATS =====
    // Month DDth, YYYY (January 15th, 2024)
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th),?\s+(19|20)\d{2}\b/gi,
    // DDth of Month YYYY (15th of January 2024)
    /\b\d{1,2}(?:st|nd|rd|th)\s+(?:of\s+)?(January|February|March|April|May|June|July|August|September|October|November|December)\s+(19|20)\d{2}\b/gi,
    // Abbreviated: Jan 15th, 2024
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2}(?:st|nd|rd|th),?\s+(19|20)\d{2}\b/gi,

    // ===== MILITARY DATE FORMAT =====
    // DDMMMYYYY (23JAN2024)
    /\b([0-2]?[0-9]|3[01])(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(19|20)\d{2}\b/gi,
    // DD-MMM-YYYY or DD MMM YYYY (23-JAN-2024 or 23 JAN 2024)
    /\b([0-2]?[0-9]|3[01])[-\s](JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[-\s](19|20)\d{2}\b/gi,

    // ===== YEAR ONLY (when contextually relevant) =====
    // Born in 1985, admitted 2024, etc. - captured by context
    /\b(?:born|admitted|discharged|diagnosed|since|in|year)\s+(19|20)\d{2}\b/gi,
  ];

  /**
   * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
   */
  private static readonly COMPILED_PATTERNS = DateFilterSpan.compilePatterns(
    DateFilterSpan.DATE_PATTERN_SOURCES,
  );

  getType(): string {
    return "DATE";
  }

  getPriority(): number {
    return FilterPriority.DATE;
  }

  detect(text: string, config: any, context: RedactionContext): Span[] {
    const spans: Span[] = [];

    // Apply all date patterns
    for (const pattern of DateFilterSpan.COMPILED_PATTERNS) {
      pattern.lastIndex = 0; // Reset regex
      let match;

      while ((match = pattern.exec(text)) !== null) {
        const span = this.createSpanFromMatch(
          text,
          match,
          FilterType.DATE,
          0.95, // High confidence for dates
        );
        spans.push(span);
      }
    }

    return spans;
  }
}
