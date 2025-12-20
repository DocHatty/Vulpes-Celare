"use strict";
/**
 * URLFilterSpan - URL/Web Address Detection (Span-Based)
 *
 * Detects web URLs and domain names and returns Spans.
 * Includes detection of patient portal URLs and healthcare-related domains.
 * Parallel-execution ready.
 *
 * @module filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.URLFilterSpan = void 0;
const Span_1 = require("../models/Span");
const SpanBasedFilter_1 = require("../core/SpanBasedFilter");
const RustScanKernel_1 = require("../utils/RustScanKernel");
const SpanFactory_1 = require("../core/SpanFactory");
class URLFilterSpan extends SpanBasedFilter_1.SpanBasedFilter {
    /**
     * URL regex pattern sources
     *
     * Matches:
     * - http://, https://, ftp:// protocols
     * - www. prefixed domains
     * - Domain names with paths and query strings
     */
    static URL_PATTERN_SOURCES = [
        // Standard URLs with protocol or www
        /\b(?:https?:\/\/|ftp:\/\/|www\.)[^\s<>"{}|\\^`\[\]]+/gi,
        // Patient portal and healthcare URLs without protocol
        /\b(?:mychart|myhealth|patient(?:portal)?|epic|cerner|athena|meditech|allscripts|nextgen)[.\-]?[a-z0-9.\-]+\.(?:com|org|net|edu|health|healthcare|med|medical)[^\s<>"{}|\\^`\[\]]*(?:\?[^\s<>"{}|\\^`\[\]]*(?:patient|member|account|user|id|mrn)[^\s<>"{}|\\^`\[\]]*)?/gi,
        // URLs with patient/member ID query parameters
        /\b[a-z0-9][a-z0-9.\-]*\.[a-z]{2,}[^\s<>"{}|\\^`\[\]]*\?[^\s<>"{}|\\^`\[\]]*(?:patientid|patient_id|memberid|member_id|accountid|account_id|userid|user_id|mrnid|mrn)=[^\s<>"{}|\\^`\[\]]+/gi,
        // Healthcare/medical domain URLs without protocol
        /\b[a-z0-9][a-z0-9.\-]*(?:hospital|medical|health|clinic|care|med|healthcare|physician|doctor|patient)[a-z0-9.\-]*\.[a-z]{2,}[^\s<>"{}|\\^`\[\]]*/gi,
        // Social media profile URLs
        /\b(?:linkedin\.com\/in\/|facebook\.com\/|twitter\.com\/|instagram\.com\/|x\.com\/)[^\s<>"{}|\\^`\[\]]+/gi,
    ];
    /**
     * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
     */
    static COMPILED_PATTERNS = URLFilterSpan.compilePatterns(URLFilterSpan.URL_PATTERN_SOURCES);
    /**
     * Pattern names for debugging
     */
    static PATTERN_NAMES = [
        "Standard URL",
        "Patient portal URL",
        "Patient ID URL",
        "Healthcare domain",
        "Social media profile",
    ];
    getType() {
        return "URL";
    }
    getPriority() {
        return SpanBasedFilter_1.FilterPriority.URL;
    }
    detect(text, _config, context) {
        const accelerated = RustScanKernel_1.RustScanKernel.getDetections(context, text, "URL");
        if (accelerated && accelerated.length > 0) {
            return accelerated.map((d) => {
                return SpanFactory_1.SpanFactory.fromPosition(text, d.characterStart, d.characterEnd, Span_1.FilterType.URL, {
                    confidence: d.confidence,
                    priority: this.getPriority(),
                    pattern: d.pattern,
                });
            });
        }
        const spans = [];
        const seenPositions = new Set();
        const confidences = [0.95, 0.92, 0.93, 0.85, 0.9];
        for (let i = 0; i < URLFilterSpan.COMPILED_PATTERNS.length; i++) {
            this.detectPattern(text, URLFilterSpan.COMPILED_PATTERNS[i], spans, seenPositions, confidences[i], URLFilterSpan.PATTERN_NAMES[i]);
        }
        return spans;
    }
    /**
     * Helper to detect URLs using a specific pattern and avoid duplicates
     */
    detectPattern(text, pattern, spans, seenPositions, confidence, patternName) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const posKey = `${match.index}-${match.index + match[0].length}`;
            // Skip if we've already detected a URL at this position
            if (seenPositions.has(posKey)) {
                continue;
            }
            // Skip if this position overlaps with an existing span
            const matchStart = match.index;
            const matchEnd = match.index + match[0].length;
            const overlaps = Array.from(seenPositions).some((key) => {
                const [start, end] = key.split("-").map(Number);
                return ((matchStart >= start && matchStart < end) ||
                    (matchEnd > start && matchEnd <= end));
            });
            if (overlaps) {
                continue;
            }
            seenPositions.add(posKey);
            const span = SpanFactory_1.SpanFactory.fromPosition(text, match.index, match.index + match[0].length, Span_1.FilterType.URL, {
                confidence: confidence,
                priority: this.getPriority(),
                pattern: patternName,
            });
            spans.push(span);
        }
    }
}
exports.URLFilterSpan = URLFilterSpan;
//# sourceMappingURL=URLFilterSpan.js.map