/**
 * LicenseNumberFilterSpan - License Number Detection (Span-Based)
 *
 * Detects driver's licenses and professional licenses and returns Spans.
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

interface PatternDef {
  regex: RegExp;
  description: string;
}

export class LicenseNumberFilterSpan extends SpanBasedFilter {
  /**
   * Professional license prefixes commonly used in healthcare
   */
  private static readonly PROFESSIONAL_PREFIXES: string[] = [
    // Nursing
    "RN",
    "LPN",
    "LVN",
    "APRN",
    "NP",
    "CNS",
    "CNM",
    "CRNA",
    "CNA",
    // Medical
    "MD",
    "DO",
    "PA",
    "MBBS",
    // Pharmacy
    "RPH",
    "PHARMD",
    // Therapy
    "PT",
    "PTA",
    "OT",
    "OTA",
    "SLP",
    "RT",
    "RRT",
    // Mental Health
    "LCSW",
    "LMFT",
    "LPC",
    "LPCC",
    "LMHC",
    "PSYD",
    // Dental
    "DDS",
    "DMD",
    "RDH",
    // Other
    "DC",
    "DPM",
    "OD",
    "AUD",
  ];

  /**
   * License number pattern definitions
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
        /\b(?:Medical|Nursing|Professional|RN|MD|NP|PA|DEA)\s+(?:License|Lic|Number|#)\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{4,19})\b/gi,
      description: "Professional license",
    },
    {
      regex: /\b(?:NPI)(?:\s+(?:Number|No|#))?\s*[#:]?\s*([0-9]{10})\b/gi,
      description: "NPI number",
    },
    {
      regex:
        /\b(?:License|Lic)(?:\s+(?:Number|No))?\s*[#:]\s*([A-Z0-9][A-Z0-9-]{5,19})\b/gi,
      description: "Generic license",
    },
    {
      // DEA numbers: 2 letters + 7 digits (standard format)
      // First letter is registrant type (A,B,F,G,M,P,R,X), second is first letter of last name
      regex:
        /\bDEA(?:\s+(?:License|Lic|Number|No|#))?\s*[#:]?\s*([ABFGMPRX][A-Z][0-9]{7})\b/gi,
      description: "DEA number",
    },
    {
      // Standalone DEA number format without label (context-aware)
      regex: /\b([ABFGMPRX][A-Z][0-9]{7})\b/g,
      description: "Standalone DEA number",
    },
    {
      // Standalone professional license format: PREFIX-NUMBER (e.g., RN-1293847, MD-839274)
      // Matches: RN-1293847, LPN-938475, MD-8273645, PA-2938475, etc.
      regex:
        /\b((?:RN|LPN|LVN|APRN|NP|CNS|CNM|CRNA|CNA|MD|DO|PA|MBBS|RPH|PHARMD|PT|PTA|OT|OTA|SLP|RT|RRT|LCSW|LMFT|LPC|LPCC|LMHC|PSYD|DDS|DMD|RDH|DC|DPM|OD|AUD)[-#]?\d{5,10})\b/gi,
      description: "Standalone professional license",
    },
    {
      // Professional license with label: "RN License: 1293847", "MD #: 839274"
      regex:
        /\b((?:RN|LPN|LVN|APRN|NP|CNS|CNM|CRNA|CNA|MD|DO|PA|MBBS|RPH|PHARMD|PT|PTA|OT|OTA|SLP|RT|RRT|LCSW|LMFT|LPC|LPCC|LMHC|PSYD|DDS|DMD|RDH|DC|DPM|OD|AUD))(?:\s+(?:License|Lic|Number|No|#))?\s*[#:]?\s*(\d{5,10})\b/gi,
      description: "Labeled professional license",
    },
    {
      // State board license: "CA-RN-12345", "NY-MD-67890"
      regex: /\b([A-Z]{2}[-](?:RN|LPN|MD|DO|PA|NP|PT|OT)[-]\d{5,10})\b/gi,
      description: "State board professional license",
    },
    {
      // CLIA number: Clinical Laboratory Improvement Amendments identifier
      // Format: 2-digit state code + D (for lab) + 7 digits, e.g., 06D0123456
      // Also matches: CLIA #: 06D0123456, CLIA: 06D0123456
      regex: /\b(?:CLIA)(?:\s+(?:Number|No|#))?\s*[#:]?\s*(\d{2}D\d{7})\b/gi,
      description: "CLIA number with label",
    },
    {
      // Standalone CLIA number format (without label but in medical context)
      // Format: ##D####### where first 2 digits are state code
      regex: /\b(\d{2}D\d{7})\b/g,
      description: "Standalone CLIA number",
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
