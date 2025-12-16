"use strict";
/**
 * AddressFilterSpan - Street Address and Geographic Location Detection (Span-Based)
 *
 * Detects addresses in various formats (US, Canadian, UK, Australian) and returns Spans.
 * Also detects geographic subdivisions smaller than a state (cities, highways) which are PHI under HIPAA.
 * Parallel-execution ready.
 *
 * @module filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressFilterSpan = void 0;
const Span_1 = require("../models/Span");
const SpanBasedFilter_1 = require("../core/SpanBasedFilter");
const RustScanKernel_1 = require("../utils/RustScanKernel");
class AddressFilterSpan extends SpanBasedFilter_1.SpanBasedFilter {
    /**
     * Common street suffixes (US/UK/Canada/Australia)
     */
    static STREET_SUFFIXES = [
        // US/General
        "street",
        "st",
        "avenue",
        "ave",
        "road",
        "rd",
        "drive",
        "dr",
        "boulevard",
        "blvd",
        "lane",
        "ln",
        "way",
        "court",
        "ct",
        "circle",
        "cir",
        "place",
        "pl",
        "terrace",
        "ter",
        "parkway",
        "pkwy",
        "highway",
        "hwy",
        "trail",
        "path",
        "alley",
        "plaza",
        // Additional US suffixes
        "pass",
        "crossing",
        "xing",
        "heights",
        "hts",
        "commons",
        "meadows",
        "point",
        "pt",
        "pointe",
        "loop",
        "run",
        "ridge",
        "bend",
        "cove",
        "landing",
        "village",
        "vlg",
        "hill",
        "hills",
        "hollow",
        "estates",
        "est",
        "springs",
        "fork",
        "forks",
        "creek",
        "view",
        "views",
        "park",
        "center",
        "centre",
        // UK additions
        "close",
        "crescent",
        "cres",
        "gardens",
        "gdns",
        "grove",
        "gr",
        "mews",
        "rise",
        "row",
        "square",
        "sq",
        "walk",
        // Australian additions
        "parade",
        "pde",
        "esplanade",
        "esp",
        "promenade",
    ];
    /**
     * US state abbreviations (2-letter codes)
     */
    static STATE_ABBR = [
        "AL",
        "AK",
        "AZ",
        "AR",
        "CA",
        "CO",
        "CT",
        "DE",
        "FL",
        "GA",
        "HI",
        "ID",
        "IL",
        "IN",
        "IA",
        "KS",
        "KY",
        "LA",
        "ME",
        "MD",
        "MA",
        "MI",
        "MN",
        "MS",
        "MO",
        "MT",
        "NE",
        "NV",
        "NH",
        "NJ",
        "NM",
        "NY",
        "NC",
        "ND",
        "OH",
        "OK",
        "OR",
        "PA",
        "RI",
        "SC",
        "SD",
        "TN",
        "TX",
        "UT",
        "VT",
        "VA",
        "WA",
        "WV",
        "WI",
        "WY",
        "DC",
    ];
    /**
     * Canadian province abbreviations
     */
    static PROVINCE_ABBR = [
        "AB",
        "BC",
        "MB",
        "NB",
        "NL",
        "NS",
        "NT",
        "NU",
        "ON",
        "PE",
        "QC",
        "SK",
        "YT",
    ];
    /**
     * Australian state abbreviations
     */
    static AU_STATE_ABBR = [
        "NSW",
        "VIC",
        "QLD",
        "WA",
        "SA",
        "TAS",
        "ACT",
        "NT",
    ];
    /**
     * Context words that indicate a geographic location reference (for city detection)
     * These help identify when a capitalized word is a location rather than a name
     */
    static LOCATION_CONTEXT_WORDS = [
        "near",
        "in",
        "at",
        "from",
        "to",
        "around",
        "outside",
        "downtown",
        "north",
        "south",
        "east",
        "west",
        "suburb",
        "city",
        "town",
        "area",
        "region",
        "resident",
        "lives",
        "living",
        "moved",
        "relocated",
    ];
    /**
     * Facility/location suffixes that indicate following word may be a city
     * E.g., "Sunrise Senior Living, Arvada"
     */
    static FACILITY_SUFFIXES = [
        "Living",
        "Center",
        "Hospital",
        "Clinic",
        "Medical",
        "Health",
        "Care",
        "Rehabilitation",
        "Nursing",
        "Assisted",
        "Memory",
        "Hospice",
        "Facility",
        "Institute",
        "Associates",
    ];
    /**
     * Highway/road reference patterns - these are geographic identifiers under HIPAA
     */
    static HIGHWAY_PATTERNS = [
        // US Highways: Highway 101, Hwy 1, US-50, US 66
        /\b(?:Highway|Hwy|US[-\s]?)\s*\d{1,3}[A-Z]?\b/gi,
        // Interstate: I-95, Interstate 10, I95
        /\b(?:Interstate|I[-\s]?)\s*\d{1,3}\b/gi,
        // State Routes: State Route 1, SR-99, Route 66
        /\b(?:State\s+)?(?:Route|SR)[-\s]?\d{1,4}\b/gi,
        // County Roads: County Road 12, CR-5
        /\b(?:County\s+Road|CR)[-\s]?\d{1,4}\b/gi,
        // Farm/Ranch Roads (Texas): FM 1960, RM 620
        /\b(?:FM|RM)[-\s]?\d{1,4}\b/gi,
    ];
    /**
     * PERFORMANCE OPTIMIZATION: Pre-compiled address regex patterns (compiled once at class load)
     */
    static COMPILED_PATTERNS = (() => {
        const suffixPattern = AddressFilterSpan.STREET_SUFFIXES.join("|");
        const usStatePattern = AddressFilterSpan.STATE_ABBR.join("|");
        const caProvincePattern = AddressFilterSpan.PROVINCE_ABBR.join("|");
        const auStatePattern = AddressFilterSpan.AU_STATE_ABBR.join("|");
        return [
            // ===== UNIVERSAL PATTERNS =====
            // PO Box patterns: "PO Box 123", "P.O. Box 456", "POB 789"
            /\b(?:P\.?O\.?\s*Box|POB)\s+\d+/gi,
            // Street address: "123 Main Street", "456 Oak Ave", "789 Women's Center Blvd"
            // Also handles apartment numbers: "555 Elm Street, Apt 8C"
            // Supports apostrophes in names (Women's, St. Mary's, etc.)
            new RegExp(`\\b\\d+\\s+[A-Z][a-z']+(?:\\s+[A-Z][a-z']+)*\\s+(?:${suffixPattern})(?:\\s*,?\\s*(?:Apt|Suite|Unit|#|Ste|Bldg|Building|Floor|Fl)?\\s*[A-Z0-9]+)?\\b`, "gi"),
            // Street address with "Home Address:" or "Address:" prefix
            new RegExp(`(?:Home\\s+)?Address:\\s*(\\d+\\s+[A-Z][a-z']+(?:\\s+[A-Z][a-z']+)*\\s+(?:${suffixPattern}))`, "gi"),
            // ===== US FORMATS =====
            // City, State ZIP: "Boston, MA 02101"
            new RegExp(`\\b[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*,\\s*(?:${usStatePattern})\\s+\\d{5}(?:-\\d{4})?\\b`, "g"),
            // Multi-line US address block
            new RegExp(`\\b\\d+\\s+[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*\\s+(?:${suffixPattern})\\s*[\\r\\n]+\\s*[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*,\\s*(?:${usStatePattern})\\s+\\d{5}(?:-\\d{4})?\\b`, "gi"),
            // Full US address on one line: "789 Pine Street, Austin, TX 78701"
            new RegExp(`\\b\\d+\\s+[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*\\s+(?:${suffixPattern}),\\s*[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*,\\s*(?:${usStatePattern})\\s+\\d{5}(?:-\\d{4})?\\b`, "gi"),
            // ===== CANADIAN FORMATS =====
            // Canadian postal code: A1A 1A1 format
            // City, Province Postal: "Toronto, ON M5V 1A1"
            new RegExp(`\\b[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*,\\s*(?:${caProvincePattern})\\s+[A-Z]\\d[A-Z]\\s*\\d[A-Z]\\d\\b`, "gi"),
            // Full Canadian address: "123 Maple Street, Toronto, ON M5V 1A1"
            new RegExp(`\\b\\d+\\s+[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*\\s+(?:${suffixPattern}),\\s*[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*,\\s*(?:${caProvincePattern})\\s+[A-Z]\\d[A-Z]\\s*\\d[A-Z]\\d\\b`, "gi"),
            // Standalone Canadian postal code
            /\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b/g,
            // ===== UK FORMATS =====
            // UK postcode: "SW1A 1AA", "EC1A 1BB", "M1 1AE", "B33 8TH"
            /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi,
            // UK address with postcode: "10 Downing Street, London SW1A 2AA"
            new RegExp(`\\b\\d+[A-Za-z]?\\s+[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*\\s+(?:${suffixPattern})(?:,\\s*[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)*,?\\s+[A-Z]{1,2}\\d[A-Z\\d]?\\s*\\d[A-Z]{2}\\b`, "gi"),
            // UK house with name (e.g., "Rose Cottage, 12 High Street")
            /\b[A-Z][a-z]+\s+(?:Cottage|House|Lodge|Manor|Farm),?\s*\d*\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Street|Road|Lane|Avenue|Close|Drive|Way|Crescent)\b/gi,
            // ===== AUSTRALIAN FORMATS =====
            // Australian address: "42 Wallaby Way, Sydney NSW 2000"
            new RegExp(`\\b\\d+\\s+[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*\\s+(?:${suffixPattern}),\\s*[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*\\s+(?:${auStatePattern})\\s+\\d{4}\\b`, "gi"),
            // City, State Postcode (Australian): "Sydney, NSW 2000"
            new RegExp(`\\b[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*,?\\s+(?:${auStatePattern})\\s+\\d{4}\\b`, "gi"),
        ];
    })();
    getType() {
        return "ADDRESS";
    }
    getPriority() {
        return SpanBasedFilter_1.FilterPriority.ADDRESS;
    }
    detect(text, config, context) {
        const accelerated = RustScanKernel_1.RustScanKernel.getDetections(context, text, "ADDRESS");
        if (accelerated && accelerated.length > 0) {
            return accelerated.map((d) => {
                return new Span_1.Span({
                    text: d.text,
                    originalValue: d.text,
                    characterStart: d.characterStart,
                    characterEnd: d.characterEnd,
                    filterType: Span_1.FilterType.ADDRESS,
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
        // Apply all address patterns
        for (const pattern of AddressFilterSpan.COMPILED_PATTERNS) {
            pattern.lastIndex = 0; // Reset regex
            let match;
            while ((match = pattern.exec(text)) !== null) {
                // For patterns with capture groups, use the captured portion only
                // This handles cases like "Home Address: 789 Pine Street" where we only want the address
                const hasCapture = match.length > 1 && match[1];
                if (hasCapture) {
                    // Find the position of the captured group within the full match
                    const captureText = match[1];
                    const captureOffset = match[0].indexOf(captureText);
                    const captureStart = match.index + captureOffset;
                    const captureEnd = captureStart + captureText.length;
                    const span = new Span_1.Span({
                        text: captureText,
                        originalValue: captureText,
                        characterStart: captureStart,
                        characterEnd: captureEnd,
                        filterType: Span_1.FilterType.ADDRESS,
                        confidence: 0.85,
                        priority: this.getPriority(),
                        context: this.extractContext(text, captureStart, captureEnd),
                        window: [],
                        replacement: null,
                        salt: null,
                        pattern: "Address with prefix",
                        applied: false,
                        ignored: false,
                        ambiguousWith: [],
                        disambiguationScore: null,
                    });
                    spans.push(span);
                }
                else {
                    // No capture group - use full match
                    const span = this.createSpanFromMatch(text, match, Span_1.FilterType.ADDRESS, 0.85);
                    spans.push(span);
                }
            }
        }
        // Detect highway/road references (geographic identifiers under HIPAA)
        this.detectHighways(text, spans);
        // Detect contextual city names (cities mentioned with location context words)
        this.detectContextualCities(text, spans);
        // Detect city names after facility names (e.g., "Sunrise Senior Living, Arvada")
        this.detectFacilityCities(text, spans);
        // Detect case-insensitive/OCR-corrupted addresses
        this.detectCaseInsensitiveAddresses(text, spans);
        return spans;
    }
    /**
     * Detect addresses with lowercase, mixed case, or OCR corruption
     * Examples: "8007 marketneadows", "1493 front crossing, bldg 372", "7416 ceNTER OpiNT"
     */
    detectCaseInsensitiveAddresses(text, spans) {
        const suffixPattern = AddressFilterSpan.STREET_SUFFIXES.join("|");
        // Case-insensitive street address pattern
        // Matches: "8007 market meadows", "1493 front crossing", "760 poplar pass"
        const pattern = new RegExp(`\\b(\\d+[A-Za-z]?)\\s+([A-Za-z][A-Za-z']+(?:\\s+[A-Za-z][A-Za-z']+)*)\\s+(${suffixPattern})(?:\\s*,?\\s*(?:apt|suite|unit|#|ste|bldg|building|floor|fl)?\\s*[A-Za-z0-9]+)?\\b`, "gi");
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const fullMatch = match[0];
            const streetNumber = match[1];
            const streetName = match[2];
            const suffix = match[3];
            // Skip if already detected (check for overlap)
            const start = match.index;
            const end = start + fullMatch.length;
            const alreadyDetected = spans.some((s) => (start >= s.characterStart && start < s.characterEnd) ||
                (end > s.characterStart && end <= s.characterEnd));
            if (alreadyDetected)
                continue;
            // Validate: street number should be numeric (with optional letter suffix)
            if (!/^\d+[A-Za-z]?$/.test(streetNumber))
                continue;
            // Skip very short street names (likely false positives)
            if (streetName.length < 3)
                continue;
            const span = new Span_1.Span({
                text: fullMatch,
                originalValue: fullMatch,
                characterStart: start,
                characterEnd: end,
                filterType: Span_1.FilterType.ADDRESS,
                confidence: 0.8, // Slightly lower confidence for case-insensitive matches
                priority: this.getPriority(),
                context: this.extractContext(text, start, end),
                window: [],
                replacement: null,
                salt: null,
                pattern: "Case-insensitive address",
                applied: false,
                ignored: false,
                ambiguousWith: [],
                disambiguationScore: null,
            });
            spans.push(span);
        }
        // OCR-corrupted addresses (letters for digits): "l9S4 First Street"
        // Pattern: OCR-like number + street name + suffix
        const ocrPattern = new RegExp(`\\b([lIO0-9][lIO0-9SsBb]{2,4})\\s+([A-Za-z][A-Za-z']+(?:\\s+[A-Za-z][A-Za-z']+)*)\\s+(${suffixPattern})\\b`, "gi");
        while ((match = ocrPattern.exec(text)) !== null) {
            const fullMatch = match[0];
            const start = match.index;
            const end = start + fullMatch.length;
            // Skip if already detected
            const alreadyDetected = spans.some((s) => (start >= s.characterStart && start < s.characterEnd) ||
                (end > s.characterStart && end <= s.characterEnd));
            if (alreadyDetected)
                continue;
            const span = new Span_1.Span({
                text: fullMatch,
                originalValue: fullMatch,
                characterStart: start,
                characterEnd: end,
                filterType: Span_1.FilterType.ADDRESS,
                confidence: 0.75,
                priority: this.getPriority(),
                context: this.extractContext(text, start, end),
                window: [],
                replacement: null,
                salt: null,
                pattern: "OCR-corrupted address",
                applied: false,
                ignored: false,
                ambiguousWith: [],
                disambiguationScore: null,
            });
            spans.push(span);
        }
    }
    /**
     * Detect highway and road references
     */
    detectHighways(text, spans) {
        for (const pattern of AddressFilterSpan.HIGHWAY_PATTERNS) {
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const span = new Span_1.Span({
                    text: match[0],
                    originalValue: match[0],
                    characterStart: match.index,
                    characterEnd: match.index + match[0].length,
                    filterType: Span_1.FilterType.ADDRESS,
                    confidence: 0.9,
                    priority: this.getPriority(),
                    context: this.extractContext(text, match.index, match.index + match[0].length),
                    window: [],
                    replacement: null,
                    salt: null,
                    pattern: "Highway/Road reference",
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
     * Detect city names when they appear in geographic context
     * E.g., "near Boulder", "in Aurora", "from Lakewood"
     */
    detectContextualCities(text, spans) {
        // Build pattern for location context detection
        const contextWords = AddressFilterSpan.LOCATION_CONTEXT_WORDS.join("|");
        // Pattern: context word followed by capitalized word(s) that could be a city
        // E.g., "near Boulder", "in Aurora", "from Lakewood", "outside Denver"
        // Note: Case-sensitive to avoid matching acronyms like "CBT"
        const pattern = new RegExp(`\\b(${contextWords})\\s+([A-Z][a-z]{2,}(?:\\s+[A-Z][a-z]+)?)\\b`, "g");
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const cityName = match[2];
            const cityStart = match.index + match[0].indexOf(cityName);
            // Skip if it looks like a person name (has multiple parts that look like first/last)
            // Cities are usually single words or compound names like "New York"
            if (this.looksLikePersonName(cityName, text, cityStart)) {
                continue;
            }
            // Skip acronyms (all caps or too short)
            if (cityName.length <= 3 || /^[A-Z]+$/.test(cityName)) {
                continue;
            }
            const span = new Span_1.Span({
                text: cityName,
                originalValue: cityName,
                characterStart: cityStart,
                characterEnd: cityStart + cityName.length,
                filterType: Span_1.FilterType.ADDRESS,
                confidence: 0.75, // Lower confidence since it's contextual
                priority: this.getPriority(),
                context: this.extractContext(text, cityStart, cityStart + cityName.length),
                window: [],
                replacement: null,
                salt: null,
                pattern: "Contextual city name",
                applied: false,
                ignored: false,
                ambiguousWith: [],
                disambiguationScore: null,
            });
            spans.push(span);
        }
    }
    /**
     * Detect city names that appear after facility names
     * E.g., "Sunrise Senior Living, Arvada" or "Mountain View Hospital, Boulder"
     */
    detectFacilityCities(text, spans) {
        const facilitySuffixes = AddressFilterSpan.FACILITY_SUFFIXES.join("|");
        // Pattern: Facility name ending with suffix, comma, then city name
        // Captures the city name after the comma
        const pattern = new RegExp(`\\b(?:[A-Z][a-z]+\\s+)*(?:${facilitySuffixes}),\\s*([A-Z][a-z]+)\\b`, "g");
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const cityName = match[1];
            const cityStart = match.index + match[0].lastIndexOf(cityName);
            // Skip if followed by state abbreviation (already handled by address patterns)
            const afterCity = text.substring(cityStart + cityName.length, cityStart + cityName.length + 10);
            if (/^,?\s*[A-Z]{2}\s+\d{5}/.test(afterCity)) {
                continue; // This is part of a full address, skip
            }
            const span = new Span_1.Span({
                text: cityName,
                originalValue: cityName,
                characterStart: cityStart,
                characterEnd: cityStart + cityName.length,
                filterType: Span_1.FilterType.ADDRESS,
                confidence: 0.8,
                priority: this.getPriority(),
                context: this.extractContext(text, cityStart, cityStart + cityName.length),
                window: [],
                replacement: null,
                salt: null,
                pattern: "City after facility name",
                applied: false,
                ignored: false,
                ambiguousWith: [],
                disambiguationScore: null,
            });
            spans.push(span);
        }
    }
    /**
     * Check if a potential city name looks more like a person name
     */
    looksLikePersonName(name, text, position) {
        // Check for name suffixes that indicate a person
        const nameSuffixes = ["Jr", "Sr", "II", "III", "MD", "PhD", "RN"];
        const afterText = text.substring(position + name.length, position + name.length + 10);
        for (const suffix of nameSuffixes) {
            if (afterText.trim().startsWith(suffix)) {
                return true;
            }
        }
        // Check for patterns like "Dr. Boulder" or "Mr. Aurora" which would indicate a name
        const beforeText = text.substring(Math.max(0, position - 10), position);
        if (/\b(?:Dr|Mr|Mrs|Ms|Miss)\.?\s*$/i.test(beforeText)) {
            return true;
        }
        return false;
    }
}
exports.AddressFilterSpan = AddressFilterSpan;
//# sourceMappingURL=AddressFilterSpan.js.map