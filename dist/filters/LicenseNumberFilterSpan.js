"use strict";
/**
 * LicenseNumberFilterSpan - License Number Detection (Span-Based)
 *
 * Detects driver's licenses and professional licenses and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LicenseNumberFilterSpan = void 0;
const Span_1 = require("../models/Span");
const SpanBasedFilter_1 = require("../core/SpanBasedFilter");
const RustScanKernel_1 = require("../utils/RustScanKernel");
class LicenseNumberFilterSpan extends SpanBasedFilter_1.SpanBasedFilter {
    getType() {
        return "LICENSE";
    }
    getPriority() {
        return SpanBasedFilter_1.FilterPriority.MRN; // Same priority as MRN
    }
    detect(text, config, context) {
        const accelerated = RustScanKernel_1.RustScanKernel.getDetections(context, text, "LICENSE");
        if (accelerated) {
            return accelerated.map((d) => {
                return new Span_1.Span({
                    text: d.text,
                    originalValue: d.text,
                    characterStart: d.characterStart,
                    characterEnd: d.characterEnd,
                    filterType: Span_1.FilterType.LICENSE,
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
        const spans = [];
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
                    const valueStart = match.index + fullMatch.indexOf(value);
                    const valueEnd = valueStart + value.length;
                    const span = new Span_1.Span({
                        text: value,
                        originalValue: value,
                        characterStart: valueStart,
                        characterEnd: valueEnd,
                        filterType: Span_1.FilterType.LICENSE,
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
    validate(value) {
        if (typeof value !== "string")
            return false;
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
exports.LicenseNumberFilterSpan = LicenseNumberFilterSpan;
/**
 * Professional license prefixes commonly used in healthcare
 */
LicenseNumberFilterSpan.PROFESSIONAL_PREFIXES = [
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
LicenseNumberFilterSpan.LICENSE_PATTERN_DEFS = [
    {
        regex: /\b(?:DL|Driver'?s?\s+License|Drivers?\s+Lic)(?:\s+(?:Number|No|#))?\s*[#:]?\s*([A-Z]{0,2}[A-Z0-9-]{6,20})\b/gi,
        description: "Driver's license",
    },
    {
        regex: /\b([A-Z]{2})\s+(?:DL|License|Lic)\s*[#:]?\s*([A-Z0-9-]{6,20})\b/gi,
        description: "State license format",
    },
    {
        regex: /\b(?:Medical|Nursing|Professional|RN|MD|NP|PA|DEA)\s+(?:License|Lic|Number|#)\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{4,19})\b/gi,
        description: "Professional license",
    },
    {
        regex: /\b(?:NPI)(?:\s+(?:Number|No|#))?\s*[#:]?\s*([0-9]{10})\b/gi,
        description: "NPI number",
    },
    {
        regex: /\b(?:License|Lic)(?:\s+(?:Number|No))?\s*[#:]\s*([A-Z0-9][A-Z0-9-]{5,19})\b/gi,
        description: "Generic license",
    },
    {
        // DEA numbers: 2 letters + 7 digits (standard format)
        // First letter is registrant type (A,B,F,G,M,P,R,X), second is first letter of last name
        regex: /\bDEA(?:\s+(?:License|Lic|Number|No|#))?\s*[#:]?\s*([ABFGMPRX][A-Z][0-9]{7})\b/gi,
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
        regex: /\b((?:RN|LPN|LVN|APRN|NP|CNS|CNM|CRNA|CNA|MD|DO|PA|MBBS|RPH|PHARMD|PT|PTA|OT|OTA|SLP|RT|RRT|LCSW|LMFT|LPC|LPCC|LMHC|PSYD|DDS|DMD|RDH|DC|DPM|OD|AUD)[-#]?\d{5,10})\b/gi,
        description: "Standalone professional license",
    },
    {
        // Professional license with label: "RN License: 1293847", "MD #: 839274"
        regex: /\b((?:RN|LPN|LVN|APRN|NP|CNS|CNM|CRNA|CNA|MD|DO|PA|MBBS|RPH|PHARMD|PT|PTA|OT|OTA|SLP|RT|RRT|LCSW|LMFT|LPC|LPCC|LMHC|PSYD|DDS|DMD|RDH|DC|DPM|OD|AUD))(?:\s+(?:License|Lic|Number|No|#))?\s*[#:]?\s*(\d{5,10})\b/gi,
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
LicenseNumberFilterSpan.COMPILED_PATTERNS = LicenseNumberFilterSpan.compilePatterns(LicenseNumberFilterSpan.LICENSE_PATTERN_DEFS.map((p) => p.regex));
//# sourceMappingURL=LicenseNumberFilterSpan.js.map