/**
 * HospitalFilterSpan - Healthcare Facility Name Detection (Span-Based)
 *
 * Detects healthcare facility names using a dictionary of 7,389 known facilities.
 * These are redacted because they can identify patient location and care settings.
 *
 * Covered facility types:
 * - Hospitals (general, regional, community)
 * - Medical centers
 * - Health systems
 * - Clinics
 * - Indian Health Service facilities
 * - Specialty care centers
 *
 * Parallel-execution ready.
 *
 * @module filters
 */

import { Span, FilterType } from "../models/Span";
import { SpanBasedFilter, FilterPriority } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
import { HospitalDictionary } from "../dictionaries/HospitalDictionary";
import { RustScanKernel } from "../utils/RustScanKernel";

export class HospitalFilterSpan extends SpanBasedFilter {
  getType(): string {
    return "ADDRESS"; // Using ADDRESS as facility location is geographic PHI
  }

  getPriority(): number {
    return FilterPriority.ADDRESS;
  }

  detect(text: string, config: any, context: RedactionContext): Span[] {
    // Try Rust acceleration first for pattern-based hospital detection
    const accelerated = RustScanKernel.getDetections(context, text, "HOSPITAL");
    if (accelerated && accelerated.length > 0) {
      return accelerated.map((d) => {
        return new Span({
          text: d.text,
          originalValue: d.text,
          characterStart: d.characterStart,
          characterEnd: d.characterEnd,
          filterType: FilterType.ADDRESS, // Facility names are location PHI
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

    // TypeScript fallback with dictionary lookup
    const spans: Span[] = [];

    // Quick check: does text contain hospital-related keywords?
    if (!HospitalDictionary.hasHospitalKeywords(text)) {
      return spans;
    }

    // Find all hospital names in the text
    const matches = HospitalDictionary.findHospitalsInText(text);

    for (const match of matches) {
      const span = new Span({
        text: match.text,
        originalValue: match.text,
        characterStart: match.start,
        characterEnd: match.end,
        filterType: FilterType.ADDRESS, // Facility names are location PHI
        confidence: 0.92,
        priority: this.getPriority(),
        context: this.extractContext(text, match.start, match.end),
        window: [],
        replacement: null,
        salt: null,
        pattern: "Hospital/Facility name (dictionary)",
        applied: false,
        ignored: false,
        ambiguousWith: [],
        disambiguationScore: null,
      });
      spans.push(span);
    }

    return spans;
  }
}
