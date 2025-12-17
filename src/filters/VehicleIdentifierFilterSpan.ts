/**
 * VehicleIdentifierFilterSpan - Vehicle Identifier Detection (Span-Based)
 *
 * Detects and redacts vehicle identifiers per HIPAA requirement #12:
 * - Vehicle Identification Numbers (VINs): 17-character alphanumeric
 * - License plate numbers with context
 *
 * Simplified to focus on core HIPAA-required vehicle identifiers only.
 * GPS coordinates, IPv6, and workstation IDs are handled by other filters
 * or are not patient PHI under HIPAA Safe Harbor.
 *
 * @module filters
 */

import { Span, FilterType } from "../models/Span";
import { SpanBasedFilter, FilterPriority } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
import { RustScanKernel } from "../utils/RustScanKernel";

export class VehicleIdentifierFilterSpan extends SpanBasedFilter {
  getType(): string {
    return "VEHICLE";
  }

  getPriority(): number {
    return FilterPriority.VEHICLE;
  }

  detect(text: string, config: any, context: RedactionContext): Span[] {
    const accelerated = RustScanKernel.getDetections(context, text, "VEHICLE");
    if (accelerated && accelerated.length > 0) {
      return accelerated.map((d) => {
        return new Span({
          text: d.text,
          originalValue: d.text,
          characterStart: d.characterStart,
          characterEnd: d.characterEnd,
          filterType: FilterType.VEHICLE,
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

    // Pattern 1: VIN with context (explicit label)
    this.detectLabeledVINs(text, spans);

    // Pattern 2: Standalone VINs (17 characters, strict validation)
    this.detectStandaloneVINs(text, spans);

    // Pattern 3: License Plate with explicit context
    this.detectLabeledLicensePlates(text, spans);

    // Pattern 4: Standalone license plates with common US formats
    this.detectStandaloneLicensePlates(text, spans);

    return spans;
  }

  /**
   * Pattern 1: VIN with context (explicit label)
   */
  private detectLabeledVINs(text: string, spans: Span[]): void {
    const pattern =
      /\b(?:VIN|Vehicle\s+Identification\s+Number|Vehicle\s+ID)[\s:#]*([A-HJ-NPR-Z0-9]{17})\b/gi;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const vin = match[1];

      if (this.isValidVIN(vin)) {
        const fullMatch = match[0];
        const matchPos = match.index;
        const vinStart = matchPos + fullMatch.indexOf(vin);

        const span = new Span({
          text: vin,
          originalValue: vin,
          characterStart: vinStart,
          characterEnd: vinStart + vin.length,
          filterType: FilterType.VEHICLE,
          confidence: 0.98,
          priority: this.getPriority(),
          context: this.extractContext(text, vinStart, vinStart + vin.length),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Labeled VIN",
          applied: false,
          ignored: false,
          ambiguousWith: [],
          disambiguationScore: null,
        });
        spans.push(span);
      }
    }
  }

  /**
   * Pattern 2: Standalone VIN (17 characters, strict validation)
   */
  private detectStandaloneVINs(text: string, spans: Span[]): void {
    const pattern = /\b([A-HJ-NPR-Z0-9]{17})\b/g;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const vin = match[1];

      if (this.isValidVIN(vin)) {
        const span = this.createSpanFromMatch(
          text,
          match,
          FilterType.VEHICLE,
          0.85,
        );
        span.pattern = "Standalone VIN";
        spans.push(span);
      }
    }
  }

  /**
   * Pattern 3: License Plate with explicit context
   */
  private detectLabeledLicensePlates(text: string, spans: Span[]): void {
    const pattern =
      /\b(?:license\s+plate|plate\s+number|registration|plate)[\s:#]*([A-Z]{2}[-\s]?[A-Z0-9]{5,7}|[A-Z0-9]{2,3}[-\s]?[A-Z0-9]{3,4})\b/gi;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const plate = match[1];

      if (this.isValidLicensePlate(plate)) {
        const fullMatch = match[0];
        const matchPos = match.index;
        const plateStart = matchPos + fullMatch.indexOf(plate);

        const span = new Span({
          text: plate,
          originalValue: plate,
          characterStart: plateStart,
          characterEnd: plateStart + plate.length,
          filterType: FilterType.VEHICLE,
          confidence: 0.95,
          priority: this.getPriority(),
          context: this.extractContext(
            text,
            plateStart,
            plateStart + plate.length,
          ),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Labeled license plate",
          applied: false,
          ignored: false,
          ambiguousWith: [],
          disambiguationScore: null,
        });
        spans.push(span);
      }
    }
  }

  /**
   * Pattern 4: Standalone license plates with common US formats
   */
  private detectStandaloneLicensePlates(text: string, spans: Span[]): void {
    // Expanded patterns to catch more plate formats
    const patterns = [
      // Original patterns
      /\b([A-Z]{2}[-\s][A-Z0-9]{5,7})\b/gi,
      /\b([A-Z]{2,3}[-\s][0-9]{3,4})\b/gi,
      /\b([0-9][A-Z]{2,3}[0-9]{3,4})\b/gi,
      // Short 6-char plates (HABG81, YNJA52) - 4 letters + 2 digits or 3+3
      /\b([A-Z]{4}[0-9]{2})\b/g,
      /\b([A-Z]{3}[0-9]{3})\b/g,
      /\b([A-Z]{2}[0-9]{4})\b/g,
      // UK style plates (K25 PBE, AB12 CDE)
      /\b([A-Z]{1,2}[0-9]{2}\s+[A-Z]{3})\b/gi,
      /\b([A-Z]{2}[0-9]{2}\s+[A-Z]{3})\b/gi,
      // Reverse format (123 ABC)
      /\b([0-9]{3}\s+[A-Z]{3})\b/gi,
      // Mixed short formats
      /\b([A-Z][0-9]{2}\s+[A-Z]{3})\b/gi,
      // Continuous 6-7 char alphanumeric (letters first)
      /\b([A-Z]{2,4}[0-9]{2,4})\b/g,
      /\b([0-9]{2,4}[A-Z]{2,4})\b/g,
      // En-dash or hyphen separated alphanumerics (ABC–1234, AB-12-XYZ)
      /\b([A-Z0-9]{2,4}[\u2013-][A-Z0-9]{2,4})\b/gi,
      // Three-way split plates with separators or dots (AB-123-CD, A·123·BC)
      /\b([A-Z0-9]{1,3}[.\u2013-\s][A-Z0-9]{1,3}[.\u2013-\s][A-Z0-9]{1,4})\b/gi,
    ];

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(text)) !== null) {
        const plate = match[1];

        // Skip if this looks like a vital sign reading (BP, HR, RR, etc.)
        if (this.isVitalSignContext(text, match.index, plate)) {
          continue;
        }

        if (this.isValidLicensePlate(plate)) {
          const span = this.createSpanFromMatch(
            text,
            match,
            FilterType.VEHICLE,
            0.75,
          );
          span.pattern = "Standalone license plate";
          spans.push(span);
        }
      }
    }
  }

  /**
   * Check if the match appears to be a vital sign reading (e.g., BP 150, HR 98)
   * These should NOT be detected as license plates
   */
  private isVitalSignContext(
    text: string,
    matchIndex: number,
    matchedText: string,
  ): boolean {
    // Common vital sign abbreviations
    const vitalSignPrefixes =
      /\b(BP|HR|RR|PR|Temp|SpO2|O2|Sat|SBP|DBP|MAP)\s*$/i;

    // Check the text immediately before the match
    const prefix = text.substring(Math.max(0, matchIndex - 20), matchIndex);
    if (vitalSignPrefixes.test(prefix)) {
      return true;
    }

    // Check if the matched text itself starts with a vital sign abbreviation
    const vitalStarts = /^(BP|HR|RR|PR)\s/i;
    if (vitalStarts.test(matchedText)) {
      return true;
    }

    // Check for vital sign context patterns (e.g., "Blood Pressure: 150/90")
    const vitalContextPatterns = [
      /blood\s+pressure/i,
      /heart\s+rate/i,
      /respiratory\s+rate/i,
      /pulse\s+rate/i,
      /vital\s+signs/i,
      /mmHg/i,
      /bpm/i,
    ];

    const surroundingText = text.substring(
      Math.max(0, matchIndex - 50),
      Math.min(text.length, matchIndex + matchedText.length + 20),
    );

    for (const pattern of vitalContextPatterns) {
      if (pattern.test(surroundingText)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validation Methods
   */

  /**
   * Validate VIN format
   * - Must be exactly 17 characters
   * - Alphanumeric, excluding I, O, Q
   * - Reasonable mix of letters and numbers
   */
  private isValidVIN(vin: string): boolean {
    // Must be exactly 17 characters
    if (vin.length !== 17) {
      return false;
    }

    // Must be alphanumeric (excluding I, O, Q)
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      return false;
    }

    // Should not be all digits
    if (/^\d{17}$/.test(vin)) {
      return false;
    }

    // Should not be all letters
    if (/^[A-Z]{17}$/.test(vin)) {
      return false;
    }

    // Should have reasonable mix of letters and numbers
    const digitCount = (vin.match(/\d/g) || []).length;
    if (digitCount < 3 || digitCount > 14) {
      return false;
    }

    return true;
  }

  /**
   * Validate license plate format
   */
  private isValidLicensePlate(plate: string): boolean {
    // Clean the plate
    const cleaned = plate.replace(/[-\s.\u2013]/g, "");

    // Must be 5-8 characters
    if (cleaned.length < 5 || cleaned.length > 8) {
      return false;
    }

    // Must be alphanumeric
    if (!/^[A-Z0-9]+$/i.test(cleaned)) {
      return false;
    }

    // Must have at least one letter and one digit
    if (!/[A-Z]/i.test(cleaned) || !/\d/.test(cleaned)) {
      return false;
    }

    // Common formats - expanded to include more variations
    const commonFormats = [
      /^[A-Z]{2}[A-Z0-9]{5,6}$/i, // IL7XK920
      /^[A-Z]{2,3}\d{3,4}$/i, // ABC123 or AB1234
      /^\d[A-Z]{2,3}\d{3,4}$/i, // 1ABC234
      // Short 6-char formats
      /^[A-Z]{4}\d{2}$/i, // HABG81, YNJA52
      /^[A-Z]{3}\d{3}$/i, // ABC123
      /^[A-Z]{2}\d{4}$/i, // AB1234
      /^\d{4}[A-Z]{2}$/i, // 1234AB
      /^\d{3}[A-Z]{3}$/i, // 123ABC
      /^\d{2}[A-Z]{4}$/i, // 12ABCD
      // UK style (after space removal): K25PBE, AB12CDE
      /^[A-Z]{1,2}\d{2}[A-Z]{3}$/i, // K25PBE, AB12CDE
      /^\d{3}[A-Z]{3}$/i, // 123ABC (reverse UK)
      // 7 char formats
      /^[A-Z]{3}\d{4}$/i, // ABC1234
      /^[A-Z]{4}\d{3}$/i, // ABCD123
      /^\d{4}[A-Z]{3}$/i, // 1234ABC
    ];

    const matchesFormat = commonFormats.some((format) => format.test(cleaned));
    if (!matchesFormat) {
      return false;
    }

    return true;
  }
}
