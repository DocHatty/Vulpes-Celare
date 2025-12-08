"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HospitalFilterSpan = void 0;
const Span_1 = require("../models/Span");
const SpanBasedFilter_1 = require("../core/SpanBasedFilter");
const HospitalDictionary_1 = require("../dictionaries/HospitalDictionary");
class HospitalFilterSpan extends SpanBasedFilter_1.SpanBasedFilter {
    getType() {
        return "ADDRESS"; // Using ADDRESS as facility location is geographic PHI
    }
    getPriority() {
        return SpanBasedFilter_1.FilterPriority.ADDRESS;
    }
    detect(text, config, context) {
        const spans = [];
        // Quick check: does text contain hospital-related keywords?
        if (!HospitalDictionary_1.HospitalDictionary.hasHospitalKeywords(text)) {
            return spans;
        }
        // Find all hospital names in the text
        const matches = HospitalDictionary_1.HospitalDictionary.findHospitalsInText(text);
        for (const match of matches) {
            const span = new Span_1.Span({
                text: match.text,
                originalValue: match.text,
                characterStart: match.start,
                characterEnd: match.end,
                filterType: Span_1.FilterType.ADDRESS, // Facility names are location PHI
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
exports.HospitalFilterSpan = HospitalFilterSpan;
//# sourceMappingURL=HospitalFilterSpan.js.map