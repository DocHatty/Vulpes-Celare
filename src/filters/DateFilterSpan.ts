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
import { PatternStrings } from "../patterns/SharedPatterns";
import { ValidationUtils } from "../utils/ValidationUtils";
import { RustScanKernel } from "../utils/RustScanKernel";

export class DateFilterSpan extends SpanBasedFilter {
  /**
   * Month names for pattern building - using centralized SharedPatterns
   */
  private static readonly MONTHS_FULL = PatternStrings.monthsFull;
  private static readonly MONTHS_ABBR = PatternStrings.monthsAbbr;
  private static readonly MONTHS_ALL = PatternStrings.monthsAll;

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
    // ===== LABELED DOB PATTERNS =====
    // DOB: 10/24/1961, D.O.B. - 7-3-60 (short year), Date of Birth 12.01.1980
    /\b(?:dob|d\.o\.b\.|date\s+of\s+birth)[:\s#-]*((?:0?[1-9]|1[0-2])[\s./-](?:0?[1-9]|[12]\d|3[01])[\s./-](?:\d{2}|(?:19|20)\d{2}))\b/gi,

    // ===== US FORMATS =====
    // MM/DD/YYYY or MM-DD-YYYY
    /\b(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])[-/](19|20)\d{2}\b/g,
    // MM/DD/YY or MM-DD-YY (short year format like 1/15/60)
    /\b(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])[-/]\d{2}\b/g,
    // En dash or dot separators: 10–24–1961, 10.24.61
    /\b(0?[1-9]|1[0-2])[.\u2013-](0?[1-9]|[12]\d|3[01])[.\u2013-](?:\d{2}|(19|20)\d{2})\b/g,

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
    // Common OCR mistakes: O→0, l→1, |→1, I→1, B→8, S→5, b→6, s→5, o→0, G→6, g→9
    // Pattern: Any date-like structure with these substitutions
    // Matches: "O9/l1/|9B6" for "09/11/1986", "o7/|B/|96B" for "07/18/1968"
    /\b[O0o][0-9lI|SsBbGg][-/][O0olI|][0-9lI|SsBbGg][-/][|lI1][9][O0oSsBbGg][0-9lI|SsBbGg]\b/gi,
    /\b[O0o]?[0-9lI|Gg][-/][O0o]?[0-9lI|Gg][-/][|lI1][9][0-9SsBbO0oGg]{2}\b/gi,
    // More permissive: any mix of digits and OCR-confusable chars in date positions
    // Added G→6 and g→9 substitutions
    /\b[0-9OoIlSsBbGg|]{1,2}[-/][0-9OoIlSsBbGg|]{1,2}[-/][0-9OoIlSsBbGg|]{4}\b/gi,
    // Specific G substitution patterns: 1G for 16, 2G for 26, etc.
    /\b\d{1,2}[-/]\d{1,2}[-/](?:19|20)\d[Gg]\b/gi,
    /\b\d{1,2}[-/][Gg]\d[-/](?:19|20)\d{2}\b/gi,
    /\b[Gg]\d[-/]\d{1,2}[-/](?:19|20)\d{2}\b/gi,

    // ===== ADDITIONAL SPECIFIC OCR PATTERNS (from test failures) =====
    // "o7/09/2o200" - lowercase o, extra 0 in year
    /\b[Oo0][0-9][-/][Oo0][0-9][-/]2[Oo0]20[Oo0]\b/gi,
    // "07/0 4/21" - space in middle of day
    /\b[Oo0]?[0-9][-/][Oo0]\s+[0-9][-/]\d{2,4}\b/gi,
    // "73/ 2023" - missing digit + space before year
    /\b[0-9]{1,2}[-/]\s*\d{4}\b/g,
    // "G/6/58" - G instead of digit at start
    /\b[Gg][-/][0-9Gg][-/]\d{2,4}\b/gi,
    // "10/26/S5" - S instead of 5 in year
    /\b\d{1,2}[-/]\d{1,2}[-/][SsGg0-9]{2}\b/gi,
    // "1051--1986" - typo in year part + double dash
    /\b\d{2,4}--\d{2,4}\b/g,

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

    // ===== EXTREME OCR ERROR PATTERNS =====
    // Missing first digit: "/93/2021", "/15/1985", "/1/50"
    /\/\d{1,2}\/(?:19|20)?\d{2}\b/g,
    // Missing first digit with short year: "/12/24", "/1/50"
    /\/\d{1,2}\/\d{2}\b/g,
    // Short date with double slash: "4//23"
    /\b\d{1,2}\/\/\d{2}\b/g,
    // Month merged with year: "03/0224" should be "03/02/24"
    /\b\d{1,2}[-/]\d{4}\b/g,
    // Missing middle component with double separators: "2//1970", "24//99"
    /\b\d{1,2}[-/]{2}\d{2,4}\b/g,
    // Space inside a date component from OCR: "01/2 2/24", "05/0 7/0"
    /\b\d{1,2}[-/]\d\s+\d[-/]\d{1,4}\b/g,
    // Space inserted before the final separator group: "4/2 65/2"
    /\b\d{1,2}[-/]\d{1,2}\s+\d{1,2}[-/]\d{1,2}\b/g,
    // Z for 2 in year: "10/26/Z020", "o9/07/20Z3", "8/9/20Z4"
    /\b\d{1,2}[-/]\d{1,2}[-/](?:[Z2][O0]\d{2}|20[Z2]\d|20\d[Z2])\b/gi,
    // Truncated year: "08/21/6", "3/2/05" (single or double digit year)
    /\b\d{1,2}[-/]\d{1,2}[-/]\d{1,2}\b/g,
    // Extra digits in date components: "1217/1933", "12/208/7", "1/224/41"
    /\b\d{3,4}[-/]\d{1,4}[-/]?\d{0,4}\b/g,
    // Space before separator: "07/27 /2204", "1971- 04-19", "2024- 02-O1"
    /\b\d{1,2}[-/]?\d{1,2}\s+[-/]\s*\d{2,4}\b/g,
    /\b\d{4}-\s*\d{2}-\d{2}\b/g,
    // Year with OCR letter in any position: "l988-05-25", "1g68-04-17", "12/14/1q93"
    /\b[1lI|][9gq][0-9OoIlBbSsGg]{2}[-/]\d{1,2}[-/]\d{1,2}\b/gi,
    /\b\d{1,2}[-/]\d{1,2}[-/][1lI|][9gq][0-9OoIlBbSsGg]{2}\b/gi,
    // Double separator or extra char: "2o21--o2-20", "03-15 -202", "01/15//55"
    /\b\d{1,4}[-/]{1,2}\s*\d{1,2}[-/]{1,2}\s*\d{1,4}\b/g,
    // Missing separator: "0608/23", "07/0320"
    /\b\d{4}[-/]\d{2}\b/g,
    /\b\d{2}[-/]\d{4}\b/g,
    // OCR o/O for 0 throughout: "o9/07/20Z3", "1973-OO8-08"
    /\b[oO0]\d[-/][oO0]\d[-/]\d{2,4}\b/gi,
    /\b\d{4}-[oO0]{1,2}\d[-/]\d{1,2}\b/gi,
    // Very corrupted but date-like: any 3 groups of digits with separators
    /\b\d{1,4}[-/]\d{1,4}[-/]\d{1,4}\b/g,
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
    const accelerated = RustScanKernel.getDetections(context, text, "DATE");
    // Only use Rust results if we got actual detections (empty array is truthy!)
    if (accelerated && accelerated.length > 0) {
      return accelerated.map((d) => {
        return new Span({
          text: d.text,
          originalValue: d.text,
          characterStart: d.characterStart,
          characterEnd: d.characterEnd,
          filterType: FilterType.DATE,
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
    const seen = new Set<string>();

    const processText = (
      source: string,
      originalText: string,
      isNormalized: boolean = false,
    ) => {
      for (const pattern of DateFilterSpan.COMPILED_PATTERNS) {
        pattern.lastIndex = 0; // Reset regex
        let match;

        while ((match = pattern.exec(source)) !== null) {
          // For normalized text, find the corrupted version in original
          let originalMatch = match[0];
          let startIndex = match.index;
          let endIndex = match.index + match[0].length;

          if (isNormalized && source !== originalText) {
            // Find the approximate location in original text
            // Use the matched value to search for a corrupted version nearby
            const found = this.findCorruptedDateInOriginal(
              originalText,
              match[0],
              match.index,
            );
            if (found) {
              originalMatch = found.text;
              startIndex = found.start;
              endIndex = found.end;
            } else {
              // CRITICAL: If we can't map back to original, skip this span
              // Using normalized positions with original text causes mismatches
              continue;
            }
          }

          const key = `${startIndex}-${endIndex}`;
          if (seen.has(key)) continue;

          const span = new Span({
            text: originalMatch,
            originalValue: originalMatch,
            characterStart: startIndex,
            characterEnd: endIndex,
            filterType: FilterType.DATE,
            confidence: isNormalized ? 0.85 : 0.95,
            priority: this.getPriority(),
            context: this.extractContext(originalText, startIndex, endIndex),
            window: [],
            replacement: null,
            salt: null,
            pattern: isNormalized
              ? "OCR-normalized date"
              : pattern.source.substring(0, 30),
            applied: false,
            ignored: false,
            ambiguousWith: [],
            disambiguationScore: null,
          });
          spans.push(span);
          seen.add(key);
        }
      }
    };

    processText(text, text, false);

    // OCR-normalized pass to catch O/0, l/1, S/5 swaps that dodge regexes
    const normalized = ValidationUtils.normalizeOCR(text);
    if (normalized !== text) {
      processText(normalized, text, true);
    }

    // Structural OCR normalization pass - handles double punctuation, misplaced spaces
    const structuralNormalized = this.normalizeOCRStructure(text);
    if (structuralNormalized !== text && structuralNormalized !== normalized) {
      processText(structuralNormalized, text, true);
    }

    return spans;
  }

  /**
   * Find a corrupted date in the original text that corresponds to a normalized match
   * Uses fuzzy matching to locate the original corrupted version
   */
  private findCorruptedDateInOriginal(
    originalText: string,
    normalizedMatch: string,
    approxIndex: number,
  ): { text: string; start: number; end: number } | null {
    // Search in a window around the approximate index
    // The window needs to be larger because normalization can change string length
    const windowSize = Math.max(50, normalizedMatch.length * 3);
    const searchStart = Math.max(0, approxIndex - windowSize);
    const searchEnd = Math.min(
      originalText.length,
      approxIndex + normalizedMatch.length + windowSize,
    );
    const searchWindow = originalText.substring(searchStart, searchEnd);

    // Look for date-like patterns in the original that could normalize to our match
    // Pattern: digits and date separators with possible OCR corruption AND space corruption
    // Must handle: "6/2/ 2021", "01/1 6/23", "4/2 2/24" (spaces within digit sequences)
    const corruptedPattern =
      /[\dOoIlSsBbGg|]{1,4}[\s]*[\/\-]+[\s]*[\dOoIlSsBbGg|\s]{1,5}[\s]*[\/\-]+[\s]*[\dOoIlSsBbGg|\s]{2,6}/gi;

    let bestMatch: { text: string; start: number; end: number } | null = null;
    let bestScore = 0;

    let m;
    while ((m = corruptedPattern.exec(searchWindow)) !== null) {
      const candidate = m[0];
      const candidateNormalized = this.normalizeOCRStructure(candidate);

      // Check if normalizing this candidate gives us something close to our match
      if (this.datesMatch(candidateNormalized, normalizedMatch)) {
        const score = candidate.length; // Prefer longer matches
        if (score > bestScore) {
          bestScore = score;
          bestMatch = {
            text: candidate,
            start: searchStart + m.index,
            end: searchStart + m.index + candidate.length,
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Check if two date strings match (allowing for minor variations)
   */
  private datesMatch(a: string, b: string): boolean {
    // Normalize both and compare
    const cleanA = a.replace(/\s+/g, "").toLowerCase();
    const cleanB = b.replace(/\s+/g, "").toLowerCase();
    return cleanA === cleanB;
  }

  /**
   * Normalize structural OCR errors in date-like patterns
   * Handles issues that character substitution alone can't fix:
   * - Double punctuation: "9//2" → "9/2", "07--16" → "07-16"
   * - Misplaced spaces: "9//2 2/54" → "9/22/54", "2023- 0-08" → "2023-10-08"
   * - Leading/trailing spaces around separators: "05/14 //2024" → "05/14/2024"
   * - Space-corrupted digit sequences: "05/1 7/73" → "05/17/73"
   * - Pipe characters: "12-|7-2024" → "12-17-2024"
   * - Mixed OCR errors: "05/S B/22" → "05/58/22"
   */
  private normalizeOCRStructure(text: string): string {
    let result = text;

    // Step 0: Handle pipe character → 1 (common OCR error)
    result = result.replace(/\|/g, "1");

    // Step 1: Character substitutions (OCR letter→digit)
    result = ValidationUtils.normalizeOCR(result);

    // Step 2: Fix double separators: // → /, -- → -, - - → -
    result = result.replace(/[-]{2,}/g, "-");
    result = result.replace(/[/]{2,}/g, "/");
    result = result.replace(/-\s+-/g, "-");
    result = result.replace(/\/\s+\//g, "/");

    // Step 3: Remove spaces around date separators
    // "05/14 //2024" → "05/14/2024", "2023- 0-08" → "2023-0-08"
    result = result.replace(/\s*([/-])\s*/g, "$1");

    // Step 4: Aggressive space removal within date-like patterns
    // Pattern: digit(s) separator digit space digit separator...
    // "05/1 7/73" → "05/17/73", "12/2 0/2020" → "12/20/2020"
    // This regex finds date-like sequences and removes internal spaces
    result = result.replace(
      /(\d{1,2}[-/])(\d)\s+(\d)([-/]\d{2,4})/g,
      "$1$2$3$4",
    );

    // Step 5: Handle space in year portion: "05/17/7 3" → "05/17/73"
    result = result.replace(
      /(\d{1,2}[-/]\d{1,2}[-/])(\d)\s+(\d{1,3})\b/g,
      "$1$2$3",
    );

    // Step 6: Handle space in month portion: "0 5/17/73" → "05/17/73"
    result = result.replace(/\b(\d)\s+(\d)([-/]\d{1,2}[-/]\d{2,4})/g, "$1$2$3");

    // Step 7: Handle ISO dates with spaces: "2023- 10-22" → "2023-10-22", "1985- 03-09" → "1985-03-09"
    // Already covered by step 3, but also handle "2023 -10-22"
    result = result.replace(/(\d{4})\s+([-/])(\d)/g, "$1$2$3");

    // Step 8: Handle multiple consecutive spaces that might remain
    result = result.replace(/\s{2,}/g, " ");

    // Step 9: Handle day/month space corruption: "21/2 1/24" → "21/21/24"
    result = result.replace(/(\d)([-/])(\d)\s+(\d)([-/])/g, "$1$2$3$4$5");

    // Step 10: Handle corrupted short dates: "2/1342" might be "2/13/42"
    // Insert separator if we see pattern like digit/4digits
    result = result.replace(/(\d{1,2}[-/])(\d{2})(\d{2})\b/g, "$1$2/$3");

    return result;
  }
}
