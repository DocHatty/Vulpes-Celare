/**
 * SSN Filter (Span-Based)
 *
 * Detects Social Security Numbers and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */

import { Span, FilterType } from "../models/Span";
import { SpanBasedFilter, FilterPriority } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
import { ValidationUtils } from "../utils/ValidationUtils";

export class SSNFilterSpan extends SpanBasedFilter {
  /**
   * PERFORMANCE OPTIMIZATION: Pre-compiled static patterns
   * Changed from instance-level to class-level to avoid re-creating patterns for each filter instance
   */
  private static readonly COMPILED_PATTERNS = SSNFilterSpan.compilePatterns([
    /\b(\d{3})-(\d{2})-(\d{4})\b/g, // 123-45-6789
    /\b(\d{3})[ \t](\d{2})[ \t](\d{4})\b/g, // 123 45 6789
    /\b(\d{3})[\u2013.](\d{2})[\u2013.](\d{4})\b/g, // 123–45–6789 or 123.45.6789
    /\b\d{3}\s*[-.\u2013]\s*\d{2}\s*[-.\u2013]\s*\d{4}\b/g, // allow stray spaces around separators
    /\b\d{2}-\d{3}-\d{4}\b/g, // transposed group split 12-345-6789
    /\b(\d{9})\b/g, // 123456789 (9 consecutive digits)
    // Partially masked SSN patterns (last 4 visible)
    /[\*Xx]{3}-[\*Xx]{2}-(\d{4})\b/g, // ***-**-6789 or XXX-XX-6789
    /[\*Xx]{3}[\*Xx]{2}(\d{4})\b/g, // *****6789 or XXXXX6789
    // Partially masked (first 5 visible)
    /\b(\d{3})-(\d{2})-[\*Xx]{4}/g, // 123-45-XXXX or 123-45-****

    // ===== OCR/SPACING ERROR TOLERANT =====
    // Extra dash: "324--37-4725"
    /\b\d{3}--\d{2}-\d{4}\b/g,
    /\b\d{3}-\d{2}--\d{4}\b/g,
    // Space in middle of group: "855-9 4-6516", "674-6 7-7821"
    /\b\d{3}-\d\s+\d-\d{4}\b/g,
    // Space in last group: "197-69-3 156"
    /\b\d{3}-\d{2}-\d\s+\d{3}\b/g,
    // OCR Substitution Errors (B->8, S->5, O->0, Z->2, I->1, g->9, |->1, o->0)
    // e.g. "5B2-13-2951", "g70-l7-8981", "717-44-2|006", "6I2-12-118", "2o7-16-7B3l"
    /\b[0-9BOSZIlGg|o]{3}-[0-9BOSZIlGg|o]{2}-[0-9BOSZIlGg|o]{3,4}\b/g,
    // Multiple OCR O's: "32 06OO 8685" - double OO instead of 00
    /\b\d{2}\s*\d{2}[O0]{2}\s*\d{4}\b/gi,
    /\b\d{3}[-\s]*[O0]{2}[-\s]*\d{4}\b/gi,

    // ===== MASKED SSN WITH EXTRA SPACES (OCR artifacts) =====
    // "XXX-X X-1172" - space in middle group
    /[\*Xx]{3}-[\*Xx]\s+[\*Xx]-\d{4}\b/g,
    // "***-* *-8673" - space in middle of masked middle group
    /[\*Xx]{3}-[\*Xx]\s*[\*Xx]-\d{4}\b/g,
    // "***-***-3210" - three asterisks in middle group
    /[\*Xx]{3}-[\*Xx]{3}-\d{4}\b/g,
    // "***-**--6477" - double dash before last group
    /[\*Xx]{3}-[\*Xx]{2}--\d{4}\b/g,
    // "***-**-67b" - OCR error in last 4 (truncated)
    /[\*Xx]{3}-[\*Xx]{2}-\d{2,3}[A-Za-z]?\b/g,
    // Space in mask: "XXX- XX-1234"
    /[\*Xx]{3}-?\s*[\*Xx]{2}-\d{4}\b/g,
    // OCR corrupted masked: "581-8 0-853" (space in middle, truncated)
    /\b\d{3}-\d\s+\d-\d{3}\b/g,
    // Continuous digits with OCR: "22677Z5q8" (9 chars with letters)
    /\b[0-9BOSZIlGgqQ|o]{8,9}\b/g,
    // SSN format with OCR in last segment: "232-292-339" (extra digit from OCR)
    /\b\d{3}-\d{3}-\d{3}\b/g,
  ]);

  getType(): string {
    return FilterType.SSN;
  }

  getPriority(): number {
    return FilterPriority.SSN;
  }

  detect(text: string, config: any, context: RedactionContext): Span[] {
    const spans: Span[] = [];

    const seen = new Set<string>();

    const processText = (source: string) => {
      for (const pattern of SSNFilterSpan.COMPILED_PATTERNS) {
        pattern.lastIndex = 0; // Reset regex
        let match;

        while ((match = pattern.exec(source)) !== null) {
          const ssnText = match[0];
          const key = `${match.index}-${ssnText.length}`;
          if (seen.has(key)) continue;

          if (this.isValidSSN(ssnText)) {
            const span = this.createSpanFromMatch(
              text,
              match,
              FilterType.SSN,
              0.95, // High confidence for SSN
            );
            spans.push(span);
            seen.add(key);
          }
        }
      }
    };

    processText(text);

    // Run again on OCR-normalized text to catch O/0, l/1, S/5 swaps
    const normalized = ValidationUtils.normalizeOCR(text);
    if (normalized !== text) {
      processText(normalized);
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

    // Normalize OCR characters to digits
    const normalized = ssn
      .replace(/[B]/g, "8")
      .replace(/[O]/g, "0")
      .replace(/[S]/g, "5")
      .replace(/[Z]/g, "2")
      .replace(/[Il|]/g, "1")
      .replace(/[gG]/g, "9");

    // Extract just digits for standard SSN validation
    const digits = normalized.replace(/\D/g, "");

    // Allow 8-9 digits for OCR error tolerance (missing digit scenarios)
    if (digits.length < 8 || digits.length > 9) {
      return false;
    }

    // Check for obvious non-SSN patterns (e.g. all same digit)
    // But allow 000-00-0000 for testing if needed, though usually we'd filter it.
    // For now, we're permissive to catch PHI.

    // For HIPAA compliance, we MUST catch even fake/example SSNs
    // Real validation would reject these, but we need to redact them

    return true;
  }
}
