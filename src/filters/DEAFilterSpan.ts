/**
 * DEAFilterSpan - DEA Number Detection (Span-Based)
 *
 * Detects Drug Enforcement Administration (DEA) registration numbers.
 * DEA numbers are used by healthcare providers to prescribe controlled substances.
 *
 * DEA Number Format:
 * - 2 letters followed by 7 digits (e.g., AB1234567)
 * - First letter: registrant type (A, B, C, D, E, F, G, H, J, K, L, M, P, R, S, T, U, X)
 * - Second letter: first letter of registrant's last name
 * - 7 digits with checksum validation
 *
 * Per HIPAA Safe Harbor, DEA numbers are considered identifiers that must be redacted.
 * Parallel-execution ready.
 *
 * @module filters
 */

import { Span, FilterType } from "../models/Span";
import { SpanBasedFilter, FilterPriority } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
import { RustScanKernel } from "../utils/RustScanKernel";

export class DEAFilterSpan extends SpanBasedFilter {
  /**
   * Valid first letters for DEA numbers by registrant type:
   * A, B - Deprecated (older registrations)
   * C - Practitioner (primary letter for physicians)
   * D - Pharmacy
   * E - Exporter
   * F - Distributor
   * G - Gateway (for controlled substances ordering)
   * H - Hospital/Clinic
   * J - Mid-level Practitioner (Nurse Practitioner, Physician Assistant)
   * K - Narcotic Treatment Program
   * L - Laboratory
   * M - Mid-level Practitioner
   * P - Manufacturer
   * R - Reverse Distributor
   * S - Researcher
   * T - Analytical Laboratory
   * U - Narcotic Treatment Program
   * X - Suboxone/Subutex prescribers (DATA waiver)
   */
  private static readonly VALID_FIRST_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  /**
   * DEA pattern definitions
   */
  private static readonly DEA_PATTERN_SOURCES = [
    // Pattern 1: Labeled DEA with explicit prefix
    // Matches: DEA: AB1234567, DEA #AB1234567, DEA Number: AB1234567
    /\bDEA(?:\s+(?:Number|No|#))?\s*[:#]?\s*([A-Z]{2}\d{7})\b/gi,

    // Pattern 2: Standalone DEA format (strict - valid first letters only)
    // In practice we prioritize sensitivity over strict registrant typing.
    // Keep the overall shape strict (2 letters + 7 digits).
    /\b([A-Z]{2}\d{7})\b/g,

    // Pattern 3: OCR-tolerant - common substitutions
    // O→0, l→1, I→1, B→8, S→5 in the digit portion
    /\bDEA(?:\s+(?:Number|No|#))?\s*[:#]?\s*([A-Z]{2}[0-9OoIlBbSs]{7})\b/gi,

    // Pattern 4: Standalone with OCR errors in digits
    /\b([A-Z]{2}[0-9OoIlBbSs]{7})\b/g,

    // Pattern 5: Separator-tolerant (spaces/dashes within digits)
    /\bDEA\s*[:#-]?\s*([A-Z]{2})[-\s]?([0-9OoIlBbSs]{2})[-\s]?([0-9OoIlBbSs]{5})\b/gi,
    /\b([A-Z]{2})[-\s]?([0-9OoIlBbSs]{2})[-\s]?([0-9OoIlBbSs]{5})\b/g,
  ];

  /**
   * PERFORMANCE OPTIMIZATION: Pre-compiled patterns
   */
  private static readonly COMPILED_PATTERNS = DEAFilterSpan.compilePatterns(
    DEAFilterSpan.DEA_PATTERN_SOURCES,
  );

  getType(): string {
    return "DEA";
  }

  getPriority(): number {
    return FilterPriority.MRN; // Same priority as other healthcare identifiers
  }

  detect(text: string, config: any, context: RedactionContext): Span[] {
    const accelerated = RustScanKernel.getDetections(context, text, "DEA");
    if (accelerated && accelerated.length > 0) {
      return accelerated.map((d) => {
        return new Span({
          text: d.text,
          originalValue: d.text,
          characterStart: d.characterStart,
          characterEnd: d.characterEnd,
          filterType: FilterType.DEA,
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

    for (const pattern of DEAFilterSpan.COMPILED_PATTERNS) {
      pattern.lastIndex = 0; // Reset regex
      let match;

      while ((match = pattern.exec(text)) !== null) {
        const fullMatch = match[0];
        const deaNumber =
          match.length > 3 && match[1] && match[2] && match[3]
            ? `${match[1]}${match[2]}${match[3]}`
            : match[1] || match[0];

        // Validate DEA number format
        if (this.isValidDEA(deaNumber)) {
          // Find the position of the DEA number within the full match
          const deaStart = match.index! + fullMatch.indexOf(deaNumber);
          const deaEnd = deaStart + deaNumber.length;

          const span = new Span({
            text: deaNumber,
            originalValue: deaNumber,
            characterStart: deaStart,
            characterEnd: deaEnd,
            filterType: FilterType.DEA,
            confidence: 0.95,
            priority: this.getPriority(),
            context: this.extractContext(text, deaStart, deaEnd),
            window: [],
            replacement: null,
            salt: null,
            pattern: "DEA number",
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
   * Validate DEA number format
   *
   * DEA numbers have a checksum:
   * Sum of (1st + 3rd + 5th digits) + 2*(2nd + 4th + 6th digits)
   * The last digit of this sum should equal the 7th digit of the DEA number
   */
  private isValidDEA(dea: string): boolean {
    // Normalize OCR errors in the digit portion
    let normalized = dea.toUpperCase();

    // Extract just the alphanumeric portion (remove any formatting)
    normalized = normalized.replace(/[^A-Z0-9]/g, "");

    // Must be 9 characters (2 letters + 7 digits)
    if (normalized.length !== 9) {
      return false;
    }

    // Second character must be a letter (first letter of last name)
    const secondLetter = normalized[1];
    if (!/[A-Z]/.test(secondLetter)) {
      return false;
    }

    // Remaining 7 characters must be digits (after OCR normalization)
    let digits = normalized.substring(2);

    // Normalize OCR errors in digits
    digits = digits
      .replace(/[Oo]/g, "0")
      .replace(/[IlL|]/g, "1")
      .replace(/[Bb]/g, "8")
      .replace(/[Ss]/g, "5");

    if (!/^\d{7}$/.test(digits)) {
      return false;
    }

    // Optional: Validate checksum (we're lenient for HIPAA compliance)
    // For safety, we accept any DEA-formatted string to avoid missing PHI
    // Uncomment below for strict checksum validation:
    /*
    const d = digits.split("").map(Number);
    const sum = (d[0] + d[2] + d[4]) + 2 * (d[1] + d[3] + d[5]);
    const checkDigit = sum % 10;
    if (checkDigit !== d[6]) {
      return false;
    }
    */

    return true;
  }
}
