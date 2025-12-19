"use strict";
/**
 * MRNFilterSpan - Medical Record Number Detection (Span-Based)
 *
 * Detects medical record numbers in various formats and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MRNFilterSpan = void 0;
const Span_1 = require("../models/Span");
const SpanBasedFilter_1 = require("../core/SpanBasedFilter");
const RustScanKernel_1 = require("../utils/RustScanKernel");
class MRNFilterSpan extends SpanBasedFilter_1.SpanBasedFilter {
    /**
     * Medical Record Number pattern definitions
     */
    static MRN_PATTERN_DEFS = [
        {
            // Pattern 1: MRN/MR with various separators
            regex: /\b(?:MRN?|Medical\s+Record(?:\s+Number)?)(?:\s*\([^)]+\))?\s*(?:[:#]\s*)?#?\s*([A-Z0-9][A-Z0-9-]{4,14})\b/gi,
            description: "MRN or Medical Record Number",
        },
        {
            // Pattern 2: Chart Number
            regex: /\b(?:Chart)(?:\s+(?:Number|No|#))?\s*(?:[:#]\s*)?#?\s*([A-Z0-9][A-Z0-9-]{4,11})\b/gi,
            description: "Chart number",
        },
        {
            // Pattern 3: Record Number (generic)
            regex: /\b(?:Record)(?:\s+(?:Number|No|#))?\s*(?:[:#]\s*)?#?\s*([A-Z0-9][A-Z0-9-]{4,11})\b/gi,
            description: "Generic record number",
        },
        {
            // Pattern 4: Patient ID / Patient Number
            regex: /\b(?:Patient)(?:\s+(?:ID|Number|#))?\s*(?:[:#]\s*)?#?\s*([A-Z0-9][A-Z0-9-]{4,14})\b/gi,
            description: "Patient ID or number",
        },
        {
            // Pattern 5: FILE # (common in radiology/medical records)
            regex: /\b(?:FILE|File)\s*(?:[:#]\s*)?#?\s*(\d{4,14})\b/gi,
            description: "File number",
        },
        {
            // Pattern 6: Case Number / Case #
            regex: /\b(?:Case)(?:\s+(?:Number|No|#))?\s*(?:[:#]\s*)?#?\s*([A-Z0-9][A-Z0-9-]{4,14})\b/gi,
            description: "Case number",
        },
        {
            // Pattern 7: Accession Number (radiology/lab)
            regex: /\b(?:Accession)(?:\s+(?:Number|No|#))?\s*(?:[:#]\s*)?#?\s*([A-Z0-9][A-Z0-9-]{4,14})\b/gi,
            description: "Accession number",
        },
        {
            // Pattern 8: Underscore-separated patient IDs (PAT_2024_00123, PT_12345, etc.)
            // Common in some EMR systems that use prefix_year_sequence format
            regex: /\b((?:PAT|PT|MRN|PATIENT|MR|REC|CHART|CASE|ACC)_[A-Z0-9_]{4,20})\b/gi,
            description: "Underscore-formatted patient ID",
        },
        {
            // Pattern 9: Standalone Hash ID (e.g. #1234567)
            // Very common in medical notes for MRN or Account Number
            // Must be 6-12 digits to avoid matching list items (#1, #2) or years (#2024)
            // Use (?:^|[\s:;,\(\[]) instead of \b because # is not a word char
            regex: /(?:^|[\s:;,\(\[])#(\d{6,12})\b/g,
            description: "Standalone Hash ID",
        },
        {
            // Pattern 10: Space-separated prefix + number (OCR common errors)
            // Matches: "PAT 5361182", "MED 6936859", "REC 4281116", "ID 4952807"
            // Also handles colons: "ID: 4952807", "ACC: 8819217"
            regex: /\b((?:PAT|PT|MRN|MED|REC|REEC|ID|ACC|AACC|CAC|CHART|CASE)[:\s]+\d{5,14})\b/gi,
            description: "Space-separated MRN prefix",
        },
        {
            // Pattern 11: Hyphenated year-based MRN (common in EMR systems)
            // Matches: "MRN2018-16416004", "pt2023-805069", "ID-2019-8078118"
            regex: /\b((?:MRN|PT|PAT|ID|REC|MED)[\s:-]?(?:19|20)\d{2}[-]?\d{5,10})\b/gi,
            description: "Year-based MRN format",
        },
        {
            // Pattern 12: Colon-prefixed with OCR errors
            // Matches: "MRN: 2024-!q66ob2", "ME0: 23bq735", "adc: 3557592"
            regex: /\b((?:MRN|MED|ME0|REC|PAT|PT|ID|ACC|ADC)[:\s]+[A-Z0-9!@#$%^&*()_+=\-]{5,20})\b/gi,
            description: "OCR-tolerant MRN with special chars",
        },
        {
            // Pattern 13: Double colon or space in prefix (OCR artifact)
            // Matches: "MRN:: 1831486", "ID:: 123456"
            regex: /\b((?:MRN|MED|REC|PAT|PT|ID|ACC)[:]{1,2}\s*\d{5,14})\b/gi,
            description: "Double colon MRN",
        },
        {
            // Pattern 14: OCR-corrupted prefixes (JED→MED, MDE→MED, MEO→MED, M0E→MED)
            // Matches: "JED: 6164296", "MDE 7825498", "meo: 241767q", "M0E: 736B399"
            regex: /\b((?:JED|MDE|MEO|M0E|MFD|NED|MEP|MRE|MR0|MKN)[:\s]+[A-Z0-9]{5,14})\b/gi,
            description: "OCR-corrupted MRN prefix",
        },
        {
            // Pattern 15: Numbers with spaces or pipes (OCR artifacts)
            // Matches: "id:2 656000", "464 3791", "834|971"
            // Context: must be near MRN-like labels
            regex: /\b((?:MRN|MED|REC|PAT|PT|ID|ACC)[:\s]*\d{1,3}[\s|]+\d{3,10})\b/gi,
            description: "MRN with space/pipe in digits",
        },
        {
            // Pattern 16: Standalone number with pipe (OCR for digit)
            // Matches: "834|971" when preceded by MRN context
            regex: /(?:MRN|MED|Record|Patient|ID|#)[:\s#]*(\d{2,6}[|]\d{2,6})\b/gi,
            description: "MRN with pipe character",
        },
        {
            // Pattern 17: RFC prefix (Reference/Record File Code)
            // Matches: "RFC 3083333"
            regex: /\b(RFC[:\s]+\d{5,14})\b/gi,
            description: "RFC record number",
        },
        {
            // Pattern 18: PT: prefix with colon (ensure capture)
            // Matches: "PT: 5538852"
            regex: /\b(PT[:\s]+\d{5,14})\b/gi,
            description: "PT prefix MRN",
        },
        {
            // Pattern 19: PZT prefix (OCR for PAT or PT)
            // Matches: "PZT: 2475331", "PZT 4901345"
            regex: /\b(PZT[:\s]+\d{5,14})\b/gi,
            description: "PZT prefix MRN (OCR)",
        },
        {
            // Pattern 20: PR prefix (OCR for PT)
            // Matches: "PR: 5598419"
            regex: /\b(PR[:\s]+\d{5,14})\b/gi,
            description: "PR prefix MRN (OCR)",
        },
        {
            // Pattern 21: Digits with space in middle (near MRN context)
            // Matches: "327 2869", "313 932", "531 65B0"
            regex: /(?:Medical\s+Record|MRN|Record\s*#)[:\s#]*(\d{2,4}\s+\d{3,6}[A-Z0-9]*)\b/gi,
            description: "MRN with space in digits",
        },
        {
            // Pattern 22: 8D/BD prefix (OCR for ID)
            // Matches: "8D 9064636", "BD 1234567"
            regex: /\b([8B]D[:\s]+\d{5,14})\b/gi,
            description: "8D/BD prefix MRN (OCR for ID)",
        },
        {
            // Pattern 23: rec: prefix with space in year
            // Matches: "rec: 2020- 638238"
            regex: /\b(rec[:\s]+(?:19|20)\d{2}[-\s]+\d{4,10})\b/gi,
            description: "REC prefix with space in year",
        },
    ];
    /**
     * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
     */
    static COMPILED_PATTERNS = MRNFilterSpan.compilePatterns(MRNFilterSpan.MRN_PATTERN_DEFS.map((p) => p.regex));
    getType() {
        return "MRN";
    }
    getPriority() {
        return SpanBasedFilter_1.FilterPriority.MRN;
    }
    detect(text, _config, context) {
        const accelerated = RustScanKernel_1.RustScanKernel.getDetections(context, text, "MRN");
        if (accelerated && accelerated.length > 0) {
            return accelerated.map((d) => {
                return new Span_1.Span({
                    text: d.text,
                    originalValue: d.text,
                    characterStart: d.characterStart,
                    characterEnd: d.characterEnd,
                    filterType: Span_1.FilterType.MRN,
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
        for (let i = 0; i < MRNFilterSpan.COMPILED_PATTERNS.length; i++) {
            const pattern = MRNFilterSpan.COMPILED_PATTERNS[i];
            const patternDef = MRNFilterSpan.MRN_PATTERN_DEFS[i];
            pattern.lastIndex = 0; // Reset regex
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const fullMatch = match[0];
                const value = match[1] || match[0];
                // Validate: must contain at least one digit and not be a token
                if (this.validateMRN(value, fullMatch)) {
                    // Find the position of the value within the full match
                    const valueStart = match.index + fullMatch.indexOf(value);
                    const valueEnd = valueStart + value.length;
                    const span = new Span_1.Span({
                        text: value,
                        originalValue: value,
                        characterStart: valueStart,
                        characterEnd: valueEnd,
                        filterType: Span_1.FilterType.MRN,
                        confidence: 0.9,
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
     * Validate medical record number
     */
    validateMRN(value, fullMatch) {
        // Don't re-redact already tokenized values
        if (fullMatch.includes("{{")) {
            return false;
        }
        // Must contain at least one digit
        return /\d/.test(value);
    }
}
exports.MRNFilterSpan = MRNFilterSpan;
//# sourceMappingURL=MRNFilterSpan.js.map