/**
 * MRNFilterSpan - Medical Record Number Detection (Span-Based)
 *
 * Detects medical record numbers in various formats and returns Spans.
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

export class MRNFilterSpan extends SpanBasedFilter {
  /**
   * Medical Record Number pattern definitions
   */
  private static readonly MRN_PATTERN_DEFS = [
    {
      // Pattern 1: MRN/MR with various separators
      regex:
        /\b(?:MRN?|Medical\s+Record(?:\s+Number)?)(?:\s*\([^)]+\))?\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{4,14})\b/gi,
      description: "MRN or Medical Record Number",
    },
    {
      // Pattern 2: Chart Number
      regex:
        /\b(?:Chart)(?:\s+(?:Number|No|#))?\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{4,11})\b/gi,
      description: "Chart number",
    },
    {
      // Pattern 3: Record Number (generic)
      regex:
        /\b(?:Record)(?:\s+(?:Number|No|#))?\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{4,11})\b/gi,
      description: "Generic record number",
    },
    {
      // Pattern 4: Patient ID / Patient Number
      regex:
        /\b(?:Patient)(?:\s+(?:ID|Number|#))?\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{4,14})\b/gi,
      description: "Patient ID or number",
    },
    {
      // Pattern 5: FILE # (common in radiology/medical records)
      regex: /\b(?:FILE|File)\s*[#:]\s*(\d{4,14})\b/gi,
      description: "File number",
    },
    {
      // Pattern 6: Case Number / Case #
      regex:
        /\b(?:Case)(?:\s+(?:Number|No|#))?\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{4,14})\b/gi,
      description: "Case number",
    },
    {
      // Pattern 7: Accession Number (radiology/lab)
      regex:
        /\b(?:Accession)(?:\s+(?:Number|No|#))?\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{4,14})\b/gi,
      description: "Accession number",
    },
    {
      // Pattern 8: Underscore-separated patient IDs (PAT_2024_00123, PT_12345, etc.)
      // Common in some EMR systems that use prefix_year_sequence format
      regex:
        /\b((?:PAT|PT|MRN|PATIENT|MR|REC|CHART|CASE|ACC)_[A-Z0-9_]{4,20})\b/gi,
      description: "Underscore-formatted patient ID",
    },
  ];

  /**
   * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
   */
  private static readonly COMPILED_PATTERNS = MRNFilterSpan.compilePatterns(
    MRNFilterSpan.MRN_PATTERN_DEFS.map((p) => p.regex),
  );

  getType(): string {
    return "MRN";
  }

  getPriority(): number {
    return FilterPriority.MRN;
  }

  detect(text: string, config: any, context: RedactionContext): Span[] {
    const spans: Span[] = [];

    for (let i = 0; i < MRNFilterSpan.COMPILED_PATTERNS.length; i++) {
      const pattern = MRNFilterSpan.COMPILED_PATTERNS[i];
      const patternDef = MRNFilterSpan.MRN_PATTERN_DEFS[i];
      pattern.lastIndex = 0; // Reset regex
      let match;

      while ((match = pattern.exec(text)) !== null) {
        const fullMatch = match[0];
        const value = match[1] || match[0];

        // Validate: must contain at least one digit and not be a token
        if (this.validateMRN(value, fullMatch)) {
          // Find the position of the value within the full match
          const valueStart = match.index! + fullMatch.indexOf(value);
          const valueEnd = valueStart + value.length;

          const span = new Span({
            text: value,
            originalValue: value,
            characterStart: valueStart,
            characterEnd: valueEnd,
            filterType: FilterType.MRN,
            confidence: 0.9,
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
   * Validate medical record number
   */
  private validateMRN(value: string, fullMatch: string): boolean {
    // Don't re-redact already tokenized values
    if (fullMatch.includes("{{")) {
      return false;
    }

    // Must contain at least one digit
    return /\d/.test(value);
  }
}
