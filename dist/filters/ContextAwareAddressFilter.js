"use strict";
/**
 * ContextAwareAddressFilter - Partial Address Detection with Context Guards
 *
 * WIN-WIN STRATEGY:
 * - INCREASES SENSITIVITY: Detects partial addresses and geographic references
 *   that narrow down location below state level (HIPAA PHI requirement)
 * - INCREASES SPECIFICITY: Only matches when clinical/address context is present,
 *   preventing false positives on standalone geographic terms
 *
 * HIPAA Note: Geographic subdivisions smaller than a state are PHI. This includes:
 * - Street addresses (partial or complete)
 * - City names
 * - County names
 * - Zip codes (first 3 digits if population <20k)
 * - Landmarks that identify location
 *
 * @module filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextAwareAddressFilter = void 0;
const Span_1 = require("../models/Span");
const SpanBasedFilter_1 = require("../core/SpanBasedFilter");
const ClinicalContextDetector_1 = require("../context/ClinicalContextDetector");
const UnifiedMedicalWhitelist_1 = require("../utils/UnifiedMedicalWhitelist");
/**
 * Address context indicators - phrases that suggest geographic info follows
 */
const ADDRESS_CONTEXT_PATTERNS = [
    // Direct address labels
    /\b(?:address|location|residence|home|lives?\s+(?:at|in|near))[:\s]+/gi,
    /\b(?:mailing|billing|shipping|physical)\s+address[:\s]+/gi,
    // Directional/location prefixes
    /\b(?:resides?|residing|located|situated)\s+(?:at|in|near)\b/gi,
    /\b(?:from|near|around|outside)\s+(?:the\s+)?(?:city|town|area)\s+of\b/gi,
    // Transfer/travel context
    /\b(?:transferred|referred|came|traveled)\s+from\b/gi,
    /\b(?:lives?|works?|employed)\s+in\b/gi,
    // Emergency/contact context
    /\b(?:emergency\s+)?contact\s+(?:address|location)\b/gi,
    /\b(?:pickup|delivery)\s+(?:address|location)\b/gi,
];
/**
 * Partial address patterns - components that may indicate PHI location
 */
const PARTIAL_ADDRESS_PATTERNS = [
    // Street number + name (no suffix) - "123 Main", "456 Oak"
    {
        pattern: /\b(\d{1,5})\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b(?!\s+(?:mg|ml|units?|tablets?|pills?|doses?|times?|days?|hours?|weeks?|months?|years?))/g,
        baseConfidence: 0.6,
        requiresContext: true,
        description: "Partial street address",
    },
    // Apartment/Unit without full address - "Apt 4B", "Unit 123"
    {
        pattern: /\b(?:Apt|Apartment|Unit|Suite|Ste|Bldg|Building|Floor|Fl)\.?\s*#?\s*[A-Z0-9]+\b/gi,
        baseConfidence: 0.65,
        requiresContext: true,
        description: "Unit/apartment reference",
    },
    // Intersection patterns - "Main and Oak", "5th & Broadway"
    {
        pattern: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:and|&)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
        baseConfidence: 0.55,
        requiresContext: true,
        description: "Street intersection",
    },
    // Neighborhood/district names - "in Midtown", "from Downtown"
    {
        pattern: /\b(?:in|from|near)\s+((?:North|South|East|West|Upper|Lower|Old|New)\s+[A-Z][a-z]+)\b/g,
        baseConfidence: 0.7,
        requiresContext: true,
        description: "Neighborhood reference",
    },
    // County references - "lives in Adams County", "from Boulder County"
    {
        pattern: /\b([A-Z][a-z]+)\s+County\b/g,
        baseConfidence: 0.85,
        requiresContext: false, // County is always PHI below state level
        description: "County reference",
    },
    // Township/borough - "in Springfield Township"
    {
        pattern: /\b([A-Z][a-z]+)\s+(?:Township|Borough|Parish|Village)\b/g,
        baseConfidence: 0.85,
        requiresContext: false,
        description: "Township/borough reference",
    },
    // Rural route/box patterns - "RR 2 Box 45"
    {
        pattern: /\b(?:RR|Rural\s+Route)\s+\d+(?:\s+Box\s+\d+)?\b/gi,
        baseConfidence: 0.9,
        requiresContext: false,
        description: "Rural route",
    },
    // Mile marker / highway exit - "Exit 42", "Mile 156"
    {
        pattern: /\b(?:Exit|Mile(?:\s+Marker)?)\s+\d+\b/gi,
        baseConfidence: 0.75,
        requiresContext: true,
        description: "Highway reference",
    },
    // Landmark references in address context
    {
        pattern: /\b(?:near|by|across\s+from|next\s+to)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g,
        baseConfidence: 0.6,
        requiresContext: true,
        description: "Landmark reference",
    },
    // School district (narrows location)
    {
        pattern: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:School\s+)?District\b/g,
        baseConfidence: 0.8,
        requiresContext: false,
        description: "School district",
    },
    // Facility with city - "Memorial Hospital in Denver"
    {
        pattern: /\b(?:Hospital|Medical\s+Center|Clinic|Nursing\s+Home)\s+(?:in|at|of)\s+([A-Z][a-z]+)\b/g,
        baseConfidence: 0.75,
        requiresContext: false,
        description: "Facility location",
    },
    // ZIP code first 3 digits (if standalone, may indicate location)
    {
        pattern: /\b(?:zip|postal)\s*(?:code)?[:\s]+(\d{3})\b/gi,
        baseConfidence: 0.7,
        requiresContext: true,
        description: "Partial ZIP code",
    },
];
/**
 * City name patterns with context requirements
 * Cities are PHI but highly ambiguous without context
 */
const CITY_CONTEXT_PATTERNS = [
    // Direct city labels
    {
        pattern: /\b(?:city|town)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/gi,
        baseConfidence: 0.9,
        description: "Labeled city",
    },
    // Lives/resides in city
    {
        pattern: /\b(?:lives?|resides?|residing|located)\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
        baseConfidence: 0.85,
        description: "Residence city",
    },
    // From city
    {
        pattern: /\b(?:from|of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*[A-Z]{2}\b/g,
        baseConfidence: 0.9,
        description: "City with state",
    },
    // Transferred/referred from city
    {
        pattern: /\b(?:transferred|referred|came)\s+from\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
        baseConfidence: 0.8,
        description: "Transfer origin city",
    },
];
class ContextAwareAddressFilter extends SpanBasedFilter_1.SpanBasedFilter {
    getType() {
        return "ADDRESS";
    }
    getPriority() {
        // Run after main address filter
        return SpanBasedFilter_1.FilterPriority.ADDRESS + 10;
    }
    detect(text, config, context) {
        const spans = [];
        const seen = new Set();
        // Detect partial addresses
        this.detectPartialAddresses(text, spans, seen);
        // Detect context-dependent city names
        this.detectCityNames(text, spans, seen);
        return spans;
    }
    /**
     * Detect partial address components
     */
    detectPartialAddresses(text, spans, seen) {
        for (const patternDef of PARTIAL_ADDRESS_PATTERNS) {
            const pattern = patternDef.pattern;
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(text)) !== null) {
                // Get the actual address component (may be in capture group)
                const matchText = match[1] || match[0];
                const start = match.index + (match[0].indexOf(matchText));
                const end = start + matchText.length;
                // Deduplication
                const key = `${start}-${end}`;
                if (seen.has(key))
                    continue;
                seen.add(key);
                // Skip medical terms and non-PHI
                if ((0, UnifiedMedicalWhitelist_1.isMedicalTerm)(matchText) || (0, UnifiedMedicalWhitelist_1.isNonPHI)(matchText)) {
                    continue;
                }
                // Skip if it looks like a medication dosage pattern
                if (/^\d+\s+(?:mg|ml|mcg|units?|tablets?)/i.test(match[0])) {
                    continue;
                }
                // Context check if required
                if (patternDef.requiresContext) {
                    // First check for address-specific context
                    const hasAddressContext = this.hasAddressContext(text, start);
                    // Then check clinical context
                    const contextResult = ClinicalContextDetector_1.ClinicalContextDetector.analyzeContext(text, start, matchText.length);
                    // Need either address context or moderate+ clinical context
                    if (!hasAddressContext &&
                        contextResult.strength !== "STRONG" &&
                        contextResult.strength !== "MODERATE") {
                        continue;
                    }
                }
                // Calculate confidence
                let confidence = patternDef.baseConfidence;
                if (this.hasAddressContext(text, start)) {
                    confidence += 0.15;
                }
                confidence += ClinicalContextDetector_1.ClinicalContextDetector.getContextConfidenceBoost(text, start, matchText.length) * 0.5;
                confidence = Math.min(0.95, confidence);
                const span = new Span_1.Span({
                    text: matchText,
                    originalValue: matchText,
                    characterStart: start,
                    characterEnd: end,
                    filterType: Span_1.FilterType.ADDRESS,
                    confidence,
                    priority: this.getPriority(),
                    context: this.extractContext(text, start, end),
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
    /**
     * Detect city names with context
     */
    detectCityNames(text, spans, seen) {
        for (const patternDef of CITY_CONTEXT_PATTERNS) {
            const pattern = patternDef.pattern;
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const cityName = match[1];
                if (!cityName)
                    continue;
                const fullMatch = match[0];
                const start = match.index + fullMatch.indexOf(cityName);
                const end = start + cityName.length;
                // Deduplication
                const key = `${start}-${end}`;
                if (seen.has(key))
                    continue;
                seen.add(key);
                // Skip non-PHI terms
                if ((0, UnifiedMedicalWhitelist_1.isMedicalTerm)(cityName) || (0, UnifiedMedicalWhitelist_1.isNonPHI)(cityName)) {
                    continue;
                }
                // Skip US state names (not PHI by themselves)
                if (this.isStateName(cityName)) {
                    continue;
                }
                const confidence = Math.min(0.95, patternDef.baseConfidence +
                    ClinicalContextDetector_1.ClinicalContextDetector.getContextConfidenceBoost(text, start, cityName.length));
                const span = new Span_1.Span({
                    text: cityName,
                    originalValue: cityName,
                    characterStart: start,
                    characterEnd: end,
                    filterType: Span_1.FilterType.ADDRESS,
                    confidence,
                    priority: this.getPriority(),
                    context: this.extractContext(text, start, end),
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
    /**
     * Check if address-specific context exists near position
     */
    hasAddressContext(text, position) {
        const windowStart = Math.max(0, position - 100);
        const windowEnd = Math.min(text.length, position + 50);
        const window = text.substring(windowStart, windowEnd);
        for (const pattern of ADDRESS_CONTEXT_PATTERNS) {
            pattern.lastIndex = 0;
            if (pattern.test(window)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Check if a name is a US state (not PHI)
     */
    isStateName(name) {
        const states = new Set([
            "alabama", "alaska", "arizona", "arkansas", "california",
            "colorado", "connecticut", "delaware", "florida", "georgia",
            "hawaii", "idaho", "illinois", "indiana", "iowa",
            "kansas", "kentucky", "louisiana", "maine", "maryland",
            "massachusetts", "michigan", "minnesota", "mississippi", "missouri",
            "montana", "nebraska", "nevada", "new hampshire", "new jersey",
            "new mexico", "new york", "north carolina", "north dakota", "ohio",
            "oklahoma", "oregon", "pennsylvania", "rhode island", "south carolina",
            "south dakota", "tennessee", "texas", "utah", "vermont",
            "virginia", "washington", "west virginia", "wisconsin", "wyoming"
        ]);
        return states.has(name.toLowerCase());
    }
}
exports.ContextAwareAddressFilter = ContextAwareAddressFilter;
//# sourceMappingURL=ContextAwareAddressFilter.js.map