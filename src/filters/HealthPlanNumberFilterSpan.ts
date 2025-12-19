/**
 * HealthPlanNumberFilterSpan - Health Insurance Identifier Detection (Span-Based)
 *
 * Detects health plan beneficiary numbers and returns Spans.
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
  requireContext?: boolean;
  description: string;
}

export class HealthPlanNumberFilterSpan extends SpanBasedFilter {
  /**
   * Insurance-related keywords for context checking
   */
  private readonly INSURANCE_KEYWORDS = [
    "insurance",
    "medicare",
    "medicaid",
    "health plan",
    "coverage",
    "benefits",
    "premium",
    "deductible",
    "copay",
    "hmo",
    "ppo",
    "subscriber",
    "beneficiary",
    "covered",
    "carrier",
    "payer",
  ];

  /**
   * Health plan number pattern definitions
   */
  private static readonly HEALTHPLAN_PATTERN_DEFS: PatternDef[] = [
    {
      regex:
        /\b(?:Medicare)(?:\s+(?:Number|No|ID|#))?\s*[#:]?\s*([A-Z0-9]{1}[A-Z0-9-]{9,14})\b/gi,
      description: "Medicare number",
    },
    {
      regex:
        /\b(?:Medicaid)(?:\s+(?:Number|No|ID|#))?\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{7,19})\b/gi,
      description: "Medicaid number",
    },
    {
      regex:
        /\b(?:Member|Subscriber|Insurance)(?:\s+(?:ID|Number|No|#))?\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{6,24})\b/gi,
      description: "Member/Subscriber ID",
    },
    {
      regex:
        /\b(?:Policy)(?:\s+(?:Number|No|#))?\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{4,24})\b/gi,
      description: "Policy number",
    },
    {
      regex:
        /\b(?:Group)(?:\s+(?:Number|No|#))?\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{4,24})\b/gi,
      requireContext: true,
      description: "Group number",
    },
    {
      regex:
        /\b(?:Plan)(?:\s+(?:ID|Number|No|#))?\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{4,24})\b/gi,
      requireContext: true,
      description: "Plan ID",
    },
    {
      regex: /\b((?:PLAN|GRP|POLICY|POL|PL)-[A-Z0-9-]{4,24})\b/gi,
      description: "Plan/Group code (standalone)",
    },
    {
      regex:
        /\b(?:Policy|POL|POLICY)\s*[#:]?\s*([A-Z0-9]{2,5}-[A-Z0-9-]{3,20})\b/gi,
      description: "Policy code",
    },
    // ID# pattern: "ID#: BC123456789" or "ID #: ABC12345"
    {
      regex: /\bID\s*[#:]?\s*:?\s*([A-Z]{1,3}[0-9]{5,15})\b/gi,
      description: "Insurance ID number",
    },
    // Member ID pattern with prefix: "DD-987654321"
    {
      regex: /\bMember\s+ID\s*:\s*([A-Z]{2}-[0-9]{6,12})\b/gi,
      description: "Member ID with prefix",
    },
  ];

  /**
   * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
   */
  private static readonly COMPILED_PATTERNS =
    HealthPlanNumberFilterSpan.compilePatterns(
      HealthPlanNumberFilterSpan.HEALTHPLAN_PATTERN_DEFS.map((p) => p.regex),
    );

  getType(): string {
    return "HEALTHPLAN";
  }

  getPriority(): number {
    return FilterPriority.MRN; // Same priority as MRN
  }

  detect(text: string, _config: any, context: RedactionContext): Span[] {
    const accelerated = RustScanKernel.getDetections(
      context,
      text,
      "HEALTHPLAN",
    );
    if (accelerated && accelerated.length > 0) {
      return accelerated.map((d) => {
        return new Span({
          text: d.text,
          originalValue: d.text,
          characterStart: d.characterStart,
          characterEnd: d.characterEnd,
          filterType: FilterType.HEALTH_PLAN,
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

    for (
      let i = 0;
      i < HealthPlanNumberFilterSpan.COMPILED_PATTERNS.length;
      i++
    ) {
      const pattern = HealthPlanNumberFilterSpan.COMPILED_PATTERNS[i];
      const patternDef = HealthPlanNumberFilterSpan.HEALTHPLAN_PATTERN_DEFS[i];
      pattern.lastIndex = 0; // Reset regex
      let match;

      while ((match = pattern.exec(text)) !== null) {
        const value = match[1];
        const fullMatch = match[0];

        // Check if insurance context is required
        if (patternDef.requireContext) {
          const matchPos = match.index!;
          if (!this.isInInsuranceContext(text, matchPos, fullMatch.length)) {
            continue;
          }
        }

        // Validate health plan number format
        if (this.validateHealthPlanNumber(value)) {
          // Find the position of the value within the full match
          const valueStart = match.index! + fullMatch.indexOf(value);
          const valueEnd = valueStart + value.length;

          const span = new Span({
            text: value,
            originalValue: value,
            characterStart: valueStart,
            characterEnd: valueEnd,
            filterType: FilterType.HEALTH_PLAN,
            confidence: 0.85,
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
   * Validate health plan number format
   */
  private validateHealthPlanNumber(number: string): boolean {
    const cleaned = number.replace(/[-\s.]/g, "");

    // Must be 7-20 characters
    if (cleaned.length < 7 || cleaned.length > 20) {
      return false;
    }

    // Must contain at least one digit
    if (!/\d/.test(cleaned)) {
      return false;
    }

    // Must be alphanumeric
    return /^[A-Z0-9]+$/i.test(cleaned);
  }

  /**
   * Check if match appears in insurance context
   */
  private isInInsuranceContext(
    text: string,
    matchPos: number,
    matchLen: number,
  ): boolean {
    const contextSize = 100;
    const start = Math.max(0, matchPos - contextSize);
    const end = Math.min(text.length, matchPos + matchLen + contextSize);
    const contextWindow = text.substring(start, end).toLowerCase();

    return this.INSURANCE_KEYWORDS.some((keyword) =>
      contextWindow.includes(keyword.toLowerCase()),
    );
  }
}
