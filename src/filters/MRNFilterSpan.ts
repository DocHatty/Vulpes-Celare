/**
 * MRNFilterSpan - Medical Record Number Detection (Span-Based)
 *
 * Detects medical record numbers in various formats and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */

import { Span, FilterType } from "../models/Span";
import { SpanBasedFilter, FilterPriority } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
import { RustScanKernel } from "../utils/RustScanKernel";

export class MRNFilterSpan extends SpanBasedFilter {
  /**
   * Medical Record Number pattern definitions
   */
  private static readonly MRN_PATTERN_DEFS = [
    {
      // Pattern 1: MRN/MR with various separators
      regex:
        /\b(?:MRN?|Medical\s+Record(?:\s+Number)?)(?:\s*\([^)]+\))?\s*(?:[:#]\s*)?#?\s*([A-Z0-9][A-Z0-9-]{4,14})\b/gi,
      description: "MRN or Medical Record Number",
    },
    {
      // Pattern 2: Chart Number
      regex:
        /\b(?:Chart)(?:\s+(?:Number|No|#))?\s*(?:[:#]\s*)?#?\s*([A-Z0-9][A-Z0-9-]{4,11})\b/gi,
      description: "Chart number",
    },
    {
      // Pattern 3: Record Number (generic)
      regex:
        /\b(?:Record)(?:\s+(?:Number|No|#))?\s*(?:[:#]\s*)?#?\s*([A-Z0-9][A-Z0-9-]{4,11})\b/gi,
      description: "Generic record number",
    },
    {
      // Pattern 4: Patient ID / Patient Number
      regex:
        /\b(?:Patient)(?:\s+(?:ID|Number|#))?\s*(?:[:#]\s*)?#?\s*([A-Z0-9][A-Z0-9-]{4,14})\b/gi,
      description: "Patient ID or number",
    },
    {
      // Pattern 5: FILE # (common in radiology/medical records)
      regex: /\b(?:FILE|File)\s*(?:[:#]\s*)?#?\s*(\d{4,14})\b/gi,
      description: "File number",
    },
    {
      // Pattern 6: Case Number / Case #
      regex:
        /\b(?:Case)(?:\s+(?:Number|No|#))?\s*(?:[:#]\s*)?#?\s*([A-Z0-9][A-Z0-9-]{4,14})\b/gi,
      description: "Case number",
    },
    {
      // Pattern 7: Accession Number (radiology/lab)
      regex:
        /\b(?:Accession)(?:\s+(?:Number|No|#))?\s*(?:[:#]\s*)?#?\s*([A-Z0-9][A-Z0-9-]{4,14})\b/gi,
      description: "Accession number",
    },
    {
      // Pattern 8: Underscore-separated patient IDs (PAT_2024_00123, PT_12345, etc.)
      // Common in some EMR systems that use prefix_year_sequence format
      regex:
        /\b((?:PAT|PT|MRN|PATIENT|MR|REC|CHART|CASE|ACC)_[A-Z0-9_]{4,20})\b/gi,
      description: "Underscore-formatted patient ID",
    },
    {
      // Pattern 9: Standalone Hash ID (e.g. #1234567)
      // Very common in medical notes for MRN or Account Number
      // Must be 6-12 digits to avoid matching list items (#1, #2) or years (#2024)
      // Use (?:^|[\s:;,\(\[]) instead of \b because # is not a word char
      regex: /(?:^|[\s:;,\(\[])#(\d{6,12})\b/g,
      description: "Standalone Hash ID",
    },
    {
      // Pattern 10: Space-separated prefix + number (OCR common errors)
      // Matches: "PAT 5361182", "MED 6936859", "REC 4281116", "ID 4952807"
      // Also handles colons: "ID: 4952807", "ACC: 8819217"
      regex:
        /\b((?:PAT|PT|MRN|MED|REC|REEC|ID|ACC|AACC|CAC|CHART|CASE)[:\s]+\d{5,14})\b/gi,
      description: "Space-separated MRN prefix",
    },
    {
      // Pattern 11: Hyphenated year-based MRN (common in EMR systems)
      // Matches: "MRN2018-16416004", "pt2023-805069", "ID-2019-8078118"
      regex:
        /\b((?:MRN|PT|PAT|ID|REC|MED)[\s:-]?(?:19|20)\d{2}[-]?\d{5,10})\b/gi,
      description: "Year-based MRN format",
    },
    {
      // Pattern 12: Colon-prefixed with OCR errors
      // Matches: "MRN: 2024-!q66ob2", "ME0: 23bq735", "adc: 3557592"
      regex:
        /\b((?:MRN|MED|ME0|REC|PAT|PT|ID|ACC|ADC)[:\s]+[A-Z0-9!@#$%^&*()_+=\-]{5,20})\b/gi,
      description: "OCR-tolerant MRN with special chars",
    },
    {
      // Pattern 13: Double colon or space in prefix (OCR artifact)
      // Matches: "MRN:: 1831486", "ID:: 123456"
      regex: /\b((?:MRN|MED|REC|PAT|PT|ID|ACC)[:]{1,2}\s*\d{5,14})\b/gi,
      description: "Double colon MRN",
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
    const accelerated = RustScanKernel.getDetections(context, text, "MRN");
    if (accelerated && accelerated.length > 0) {
      return accelerated.map((d) => {
        return new Span({
          text: d.text,
          originalValue: d.text,
          characterStart: d.characterStart,
          characterEnd: d.characterEnd,
          filterType: FilterType.MRN,
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
