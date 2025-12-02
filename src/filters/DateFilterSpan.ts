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
import {
  SpanBasedFilter,
  FilterPriority,
} from "../core/SpanBasedFilter";
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
    // OCR often substitutes: l for 1, O for 0, I for 1
    // MM/DD/YYYY with OCR errors (l→1, O→0, I→1)
    /\b([O0]?[1-9lI]|[1lI][O0-2])[-/]([O0]?[1-9lI]|[1-2lI][O0-9lI]|3[O01lI])[-/]([1lI]9|2[O0])[O0-9lI]{2}\b/g,
    // MM/DD/YY with OCR errors
    /\b([O0]?[1-9lI]|[1lI][O0-2])[-/]([O0]?[1-9lI]|[1-2lI][O0-9lI]|3[O01lI])[-/][O0-9lI]{2}\b/g,

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
