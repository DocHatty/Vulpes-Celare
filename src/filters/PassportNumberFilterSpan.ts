/**
 * PassportNumberFilterSpan - Passport Number Detection (Span-Based)
 *
 * Detects passport numbers from various countries and returns Spans.
 * Supports multiple passport number formats including:
 * - Canada: 1-2 letters + 6-8 digits (e.g., C47829385, AB1234567)
 * - US: 9 alphanumeric (letter + 8 digits or 9 digits)
 * - UK: 9 alphanumeric
 * - European formats: various patterns
 *
 * Parallel-execution ready.
 *
 * @module filters
 */

import { Span, FilterType } from "../models/Span";
import { SpanBasedFilter, FilterPriority } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
import { RustScanKernel } from "../utils/RustScanKernel";

export class PassportNumberFilterSpan extends SpanBasedFilter {
  /**
   * Context keywords that indicate a passport number
   */
  private static readonly PASSPORT_KEYWORDS = [
    "passport",
    "travel document",
    "document number",
    "passport no",
    "passport #",
    "passport number",
    "passport num",
  ];

  /**
   * Passport regex pattern sources
   */
  private static readonly PASSPORT_PATTERN_SOURCES = [
    // Contextual passport pattern
    /\b(?:passport|travel\s*document)(?:\s*(?:no|#|number|num))?[\s:]+([A-Z]{1,2}\d{6,8}|\d{9}|[A-Z0-9]{9})\b/gi,
    // Canadian passport (1-2 letters + 6-8 digits)
    /\b([A-Z]{1,2}\d{6,8})\b/g,
    // US passport (9 alphanumeric)
    /\b([A-Z]\d{8}|\d{9})\b/g,
    // UK/EU passport (9 alphanumeric)
    /\b([A-Z]{2}\d{7}|[A-Z]\d{8})\b/g,
  ];

  /**
   * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
   */
  private static readonly COMPILED_PATTERNS =
    PassportNumberFilterSpan.compilePatterns(
      PassportNumberFilterSpan.PASSPORT_PATTERN_SOURCES,
    );

  getType(): string {
    return "PASSPORT";
  }

  getPriority(): number {
    // Same priority as LICENSE since it's an identifying document
    return FilterPriority.LICENSE;
  }

  detect(text: string, config: any, context: RedactionContext): Span[] {
    const accelerated = RustScanKernel.getDetections(context, text, "PASSPORT");
    if (accelerated) {
      return accelerated.map((d) => {
        return new Span({
          text: d.text,
          originalValue: d.text,
          characterStart: d.characterStart,
          characterEnd: d.characterEnd,
          filterType: "PASSPORT" as FilterType,
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
    const seenPositions = new Set<string>();

    // Pattern 1: Contextual passport numbers (highest confidence)
    this.detectContextualPassports(text, spans, seenPositions);

    // Pattern 2: Canadian format with context check
    this.detectCanadianPassports(text, spans, seenPositions);

    // Pattern 3: US format with context check
    this.detectUSPassports(text, spans, seenPositions);

    // Pattern 4: UK/EU format with context check
    this.detectUKEUPassports(text, spans, seenPositions);

    return spans;
  }

  /**
   * Detect passport numbers with explicit context (Passport Number: XXX)
   */
  private detectContextualPassports(
    text: string,
    spans: Span[],
    seenPositions: Set<string>,
  ): void {
    const pattern = PassportNumberFilterSpan.COMPILED_PATTERNS[0];
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const passportNum = match[1];
      const fullMatch = match[0];
      const numStart = match.index + fullMatch.indexOf(passportNum);
      const numEnd = numStart + passportNum.length;
      const posKey = `${numStart}-${numEnd}`;

      if (!seenPositions.has(posKey)) {
        seenPositions.add(posKey);
        spans.push(
          this.createPassportSpan(
            text,
            passportNum,
            numStart,
            numEnd,
            0.95,
            "Contextual passport",
          ),
        );
      }
    }
  }

  /**
   * Detect Canadian passport numbers (1-2 letters + 6-8 digits)
   * Only matches if near passport context keywords
   */
  private detectCanadianPassports(
    text: string,
    spans: Span[],
    seenPositions: Set<string>,
  ): void {
    const pattern = PassportNumberFilterSpan.COMPILED_PATTERNS[1];
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const passportNum = match[1];
      const posKey = `${match.index}-${match.index + passportNum.length}`;

      if (seenPositions.has(posKey)) continue;

      // Require context for standalone matches to avoid false positives
      if (this.hasPassportContext(text, match.index, passportNum.length)) {
        seenPositions.add(posKey);
        spans.push(
          this.createPassportSpan(
            text,
            passportNum,
            match.index,
            match.index + passportNum.length,
            0.88,
            "Canadian passport",
          ),
        );
      }
    }
  }

  /**
   * Detect US passport numbers (9 digits or letter + 8 digits)
   * Only matches if near passport context keywords
   */
  private detectUSPassports(
    text: string,
    spans: Span[],
    seenPositions: Set<string>,
  ): void {
    const pattern = PassportNumberFilterSpan.COMPILED_PATTERNS[2];
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const passportNum = match[1];
      const posKey = `${match.index}-${match.index + passportNum.length}`;

      if (seenPositions.has(posKey)) continue;

      // US passports are 9 digits - could be SSN, phone, etc. Require strong context
      if (this.hasPassportContext(text, match.index, passportNum.length)) {
        // Additional check: make sure it's not already detected as SSN or phone
        if (!this.looksLikeOtherIdentifier(text, match.index, passportNum)) {
          seenPositions.add(posKey);
          spans.push(
            this.createPassportSpan(
              text,
              passportNum,
              match.index,
              match.index + passportNum.length,
              0.85,
              "US passport",
            ),
          );
        }
      }
    }
  }

  /**
   * Detect UK/EU passport numbers
   * Only matches if near passport context keywords
   */
  private detectUKEUPassports(
    text: string,
    spans: Span[],
    seenPositions: Set<string>,
  ): void {
    const pattern = PassportNumberFilterSpan.COMPILED_PATTERNS[3];
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const passportNum = match[1];
      const posKey = `${match.index}-${match.index + passportNum.length}`;

      if (seenPositions.has(posKey)) continue;

      if (this.hasPassportContext(text, match.index, passportNum.length)) {
        seenPositions.add(posKey);
        spans.push(
          this.createPassportSpan(
            text,
            passportNum,
            match.index,
            match.index + passportNum.length,
            0.87,
            "UK/EU passport",
          ),
        );
      }
    }
  }

  /**
   * Check if there's passport-related context near the match
   */
  private hasPassportContext(
    text: string,
    matchIndex: number,
    matchLength: number,
  ): boolean {
    // Look for context in surrounding 200 characters
    const contextStart = Math.max(0, matchIndex - 100);
    const contextEnd = Math.min(text.length, matchIndex + matchLength + 100);
    const context = text.substring(contextStart, contextEnd).toLowerCase();

    for (const keyword of PassportNumberFilterSpan.PASSPORT_KEYWORDS) {
      if (context.includes(keyword)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if the number looks like another type of identifier (SSN, phone, etc.)
   */
  private looksLikeOtherIdentifier(
    text: string,
    matchIndex: number,
    value: string,
  ): boolean {
    const contextStart = Math.max(0, matchIndex - 50);
    const contextEnd = Math.min(text.length, matchIndex + value.length + 50);
    const context = text.substring(contextStart, contextEnd).toLowerCase();

    // Check for SSN context
    const ssnKeywords = ["ssn", "social security", "ss#", "ss #"];
    for (const keyword of ssnKeywords) {
      if (context.includes(keyword)) {
        return true;
      }
    }

    // Check for phone context
    const phoneKeywords = ["phone", "tel", "fax", "cell", "mobile", "call"];
    for (const keyword of phoneKeywords) {
      if (context.includes(keyword)) {
        return true;
      }
    }

    // Check if it has dashes typical of SSN (XXX-XX-XXXX format nearby)
    if (/\d{3}-\d{2}-\d{4}/.test(context)) {
      return true;
    }

    return false;
  }

  /**
   * Create a passport span
   */
  private createPassportSpan(
    text: string,
    value: string,
    start: number,
    end: number,
    confidence: number,
    patternName: string,
  ): Span {
    return new Span({
      text: value,
      originalValue: value,
      characterStart: start,
      characterEnd: end,
      filterType: "PASSPORT" as FilterType,
      confidence: confidence,
      priority: this.getPriority(),
      context: this.extractContext(text, start, end),
      window: [],
      replacement: null,
      salt: null,
      pattern: patternName,
      applied: false,
      ignored: false,
      ambiguousWith: [],
      disambiguationScore: null,
    });
  }
}
