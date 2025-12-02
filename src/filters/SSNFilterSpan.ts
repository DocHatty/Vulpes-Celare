/**
 * SSN Filter (Span-Based)
 *
 * Detects Social Security Numbers and returns Spans.
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

export class SSNFilterSpan extends SpanBasedFilter {
  /**
   * PERFORMANCE OPTIMIZATION: Pre-compiled static patterns
   * Changed from instance-level to class-level to avoid re-creating patterns for each filter instance
   */
  private static readonly COMPILED_PATTERNS = SSNFilterSpan.compilePatterns([
    /\b(\d{3})-(\d{2})-(\d{4})\b/g, // 123-45-6789
    /\b(\d{3})[ \t](\d{2})[ \t](\d{4})\b/g, // 123 45 6789
    /\b(\d{9})\b/g, // 123456789 (9 consecutive digits)
    // Partially masked SSN patterns (last 4 visible)
    /[\*Xx]{3}-[\*Xx]{2}-(\d{4})\b/g, // ***-**-6789 or XXX-XX-6789
    /[\*Xx]{3}[\*Xx]{2}(\d{4})\b/g, // *****6789 or XXXXX6789
    // Partially masked (first 5 visible)
    /\b(\d{3})-(\d{2})-[\*Xx]{4}/g, // 123-45-XXXX or 123-45-****
  ]);

  getType(): string {
    return "SSN";
  }

  getPriority(): number {
    return FilterPriority.SSN;
  }

  detect(text: string, config: any, context: RedactionContext): Span[] {
    const spans: Span[] = [];

    for (const pattern of SSNFilterSpan.COMPILED_PATTERNS) {
      pattern.lastIndex = 0; // Reset regex
      let match;

      while ((match = pattern.exec(text)) !== null) {
        const ssnText = match[0];

        // Validate SSN
        if (this.isValidSSN(ssnText)) {
          const span = this.createSpanFromMatch(
            text,
            match,
            FilterType.SSN,
            0.95, // High confidence for SSN
          );
          spans.push(span);
        }
      }
    }

    return spans;
  }

  /**
   * Validate SSN format
   * NOTE: We allow obviously fake SSNs like 123-45-6789 for testing/examples
   * Also handles partially masked SSNs like ***-**-6789
   */
  private isValidSSN(ssn: string): boolean {
    // Check for partially masked SSN patterns first
    // These are valid PHI that must be redacted even if partially hidden
    if (/[\*Xx]{3}[-]?[\*Xx]{2}[-]?\d{4}/.test(ssn)) {
      return true; // Partially masked SSN (last 4 visible)
    }
    if (/\d{3}[-]?\d{2}[-]?[\*Xx]{4}/.test(ssn)) {
      return true; // Partially masked SSN (first 5 visible)
    }

    // Extract just digits for standard SSN validation
    const digits = ssn.replace(/\D/g, "");

    if (digits.length !== 9) return false;

    // Only reject clearly invalid patterns
    if (digits === "000000000") return false;
    if (/^(.)\1{8}$/.test(digits)) return false; // All same digit

    // For HIPAA compliance, we MUST catch even fake/example SSNs
    // Real validation would reject these, but we need to redact them

    return true;
  }
}
