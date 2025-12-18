/**
 * LicenseNumberFilterSpan - Driver's License Detection (Span-Based)
 *
 * Detects driver's licenses and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */

import { Span, FilterType } from "../models/Span";
import { SpanBasedFilter, FilterPriority } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
import { RustScanKernel } from "../utils/RustScanKernel";

interface PatternDef {
  regex: RegExp;
  description: string;
}

export class LicenseNumberFilterSpan extends SpanBasedFilter {
  /**
   * License number pattern definitions - Driver's licenses ONLY
   */
  private static readonly LICENSE_PATTERN_DEFS: PatternDef[] = [
    {
      regex:
        /\b(?:DL|Driver'?s?\s+License|Drivers?\s+Lic)(?:\s+(?:Number|No|#))?\s*[#:]?\s*([A-Z]{0,2}[A-Z0-9-]{6,20})\b/gi,
      description: "Driver's license",
    },
    {
      regex:
        /\b([A-Z]{2})\s+(?:DL|License|Lic)\s*[#:]?\s*([A-Z0-9-]{6,20})\b/gi,
      description: "State license format",
    },
    {
      regex:
        /\b(?:License|Lic)(?:\s+(?:Number|No))?\s*[#:]\s*([A-Z0-9][A-Z0-9-]{5,19})\b/gi,
      description: "Generic license",
    },
  ];

  /**
   * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
   */
  private static readonly COMPILED_PATTERNS =
    LicenseNumberFilterSpan.compilePatterns(
      LicenseNumberFilterSpan.LICENSE_PATTERN_DEFS.map((p) => p.regex),
    );

  getType(): string {
    return "LICENSE";
  }

  getPriority(): number {
    return FilterPriority.MRN; // Same priority as MRN
  }

  detect(text: string, config: any, context: RedactionContext): Span[] {
    const accelerated = RustScanKernel.getDetections(context, text, "LICENSE");
    if (accelerated && accelerated.length > 0) {
      return accelerated.map((d) => {
        return new Span({
          text: d.text,
          originalValue: d.text,
          characterStart: d.characterStart,
          characterEnd: d.characterEnd,
          filterType: FilterType.LICENSE,
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

    for (let i = 0; i < LicenseNumberFilterSpan.COMPILED_PATTERNS.length; i++) {
      const pattern = LicenseNumberFilterSpan.COMPILED_PATTERNS[i];
      const patternDef = LicenseNumberFilterSpan.LICENSE_PATTERN_DEFS[i];
      pattern.lastIndex = 0; // Reset regex
      let match;

      while ((match = pattern.exec(text)) !== null) {
        // For state license format (pattern index 1), we want the license number (match[2])
        // For all others, we want match[1]
        const value = match[2] || match[1];
        const fullMatch = match[0];

        if (value && this.validate(value)) {
          // Find the position of the value within the full match
          const valueStart = match.index! + fullMatch.indexOf(value);
          const valueEnd = valueStart + value.length;

          const span = new Span({
            text: value,
            originalValue: value,
            characterStart: valueStart,
            characterEnd: valueEnd,
            filterType: FilterType.LICENSE,
            confidence: 0.88,
            priority: this.getPriority(),
            context: this.extractContext(text, valueStart, valueEnd),
            window: [],
            replacement: null,
            salt: null,
            pattern: patternDef.description,
            applied: false,
            ignored: false,
            ambiguousWith: [],
            disambiguationScore: null,
          });
          spans.push(span);
        }
      }
    }

    return spans;
  }

  /**
   * Validate license number
   */
  private validate(value: string): boolean {
    if (typeof value !== "string") return false;
    const cleaned = value.replace(/[-\s.]/g, "");

    // Must be 6-20 characters
    if (cleaned.length < 6 || cleaned.length > 20) {
      return false;
    }

    // Must contain at least one digit
    if (!/\d/.test(cleaned)) {
      return false;
    }

    // Must be alphanumeric only
    return /^[A-Z0-9]+$/i.test(cleaned);
  }
}
