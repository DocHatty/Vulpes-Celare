"use strict";
/**
 * AgeFilterSpan - Age 90+ Detection (Span-Based)
 *
 * Detects ages 90 and above per HIPAA Safe Harbor requirements.
 * HIPAA requires that ages 90+ be aggregated to prevent re-identification
 * of elderly individuals who may be uniquely identifiable by extreme age.
 *
 * NOTE: Ages 89 and below are NOT PHI under HIPAA Safe Harbor.
 * Only ages 90+ require redaction/aggregation.
 *
 * Parallel-execution ready.
 *
 * @module filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgeFilterSpan = void 0;
const Span_1 = require("../models/Span");
const SpanBasedFilter_1 = require("../core/SpanBasedFilter");
const RustScanKernel_1 = require("../utils/RustScanKernel");
class AgeFilterSpan extends SpanBasedFilter_1.SpanBasedFilter {
    getType() {
        return "AGE";
    }
    getPriority() {
        return SpanBasedFilter_1.FilterPriority.DATE; // Same priority as dates (age-related)
    }
    detect(text, config, context) {
        // Try Rust acceleration first
        const accelerated = RustScanKernel_1.RustScanKernel.getDetections(context, text, "AGE");
        if (accelerated && accelerated.length > 0) {
            return accelerated.map((d) => {
                return new Span_1.Span({
                    text: d.text,
                    originalValue: d.text,
                    characterStart: d.characterStart,
                    characterEnd: d.characterEnd,
                    filterType: Span_1.FilterType.AGE,
                    confidence: d.confidence,
                    priority: this.getPriority(),
                    context: this.extractContext(text, d.characterStart, d.characterEnd),
                    window: [],
                    replacement: "90+",
                    salt: null,
                    pattern: d.pattern,
                    applied: false,
                    ignored: false,
                    ambiguousWith: [],
                    disambiguationScore: null,
                });
            });
        }
        // TypeScript fallback
        const spans = [];
        // Pattern 1: Explicit age statements (e.g., "92 years old", "age 95")
        this.detectExplicitAgeStatements(text, spans);
        // Pattern 2: Age with context labels (e.g., "Age: 91", "Patient age: 94")
        this.detectLabeledAges(text, spans);
        // Pattern 3: Age ranges involving 90+ (e.g., "90-95 years", "aged 92-98")
        this.detectAgeRanges(text, spans);
        // Pattern 4: Ordinal ages (e.g., "in her 90s", "early 90s")
        this.detectOrdinalAges(text, spans);
        // Pattern 5: Contextual age mentions (e.g., "the 93-year-old patient")
        this.detectContextualAges(text, spans);
        // Pattern 6: Standalone 90+ numbers with nearby age context
        this.detectStandaloneAgesWithContext(text, spans);
        // Pattern 7: Ages in demographic lines (92 M, 98 F, etc.)
        this.detectDemographicAges(text, spans);
        return spans;
    }
    /**
     * Pattern 1: Explicit age statements
     * Matches: "92 years old", "age 95", "94 y/o", "91 yo", "aged 96"
     */
    detectExplicitAgeStatements(text, spans) {
        // Pattern for "X years old", "X year old", "X y/o", "X yo"
        const patternA = /\b(\d{2,3})\s*(?:years?\s+old|y\.?o\.?|yr\.?s?\s+old|years?\s+of\s+age)\b/gi;
        patternA.lastIndex = 0;
        let match;
        while ((match = patternA.exec(text)) !== null) {
            const age = parseInt(match[1], 10);
            if (age >= 90) {
                const fullMatch = match[0];
                const span = new Span_1.Span({
                    text: fullMatch,
                    originalValue: fullMatch,
                    characterStart: match.index,
                    characterEnd: match.index + fullMatch.length,
                    filterType: Span_1.FilterType.AGE,
                    confidence: 0.96,
                    priority: this.getPriority(),
                    context: this.extractContext(text, match.index, match.index + fullMatch.length),
                    window: [],
                    replacement: "90+ years old",
                    salt: null,
                    pattern: "Age 90+ explicit statement",
                    applied: false,
                    ignored: false,
                    ambiguousWith: [],
                    disambiguationScore: null,
                });
                spans.push(span);
            }
        }
        // Pattern for "age X", "aged X"
        const patternB = /\b(?:age|aged)\s*[:#]?\s*(\d{2,3})\b/gi;
        patternB.lastIndex = 0;
        while ((match = patternB.exec(text)) !== null) {
            const age = parseInt(match[1], 10);
            if (age >= 90) {
                const fullMatch = match[0];
                const span = new Span_1.Span({
                    text: fullMatch,
                    originalValue: fullMatch,
                    characterStart: match.index,
                    characterEnd: match.index + fullMatch.length,
                    filterType: Span_1.FilterType.AGE,
                    confidence: 0.95,
                    priority: this.getPriority(),
                    context: this.extractContext(text, match.index, match.index + fullMatch.length),
                    window: [],
                    replacement: "age 90+",
                    salt: null,
                    pattern: "Age 90+ with label",
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
     * Pattern 2: Labeled ages in medical records
     * Matches: "Age: 91", "Patient Age: 94", "DOB/Age: 92"
     * Also handles large whitespace gaps common in form-style documents:
     *   "Age:            90 years"
     *   "Age:                    99 years old"
     */
    detectLabeledAges(text, spans) {
        // Updated pattern to handle large whitespace gaps (common in medical forms)
        // Uses \s* to allow any amount of whitespace between label and value
        const pattern = /\b(?:patient\s+)?age\s*[:\-=]\s*(\d{2,3})(?:\s*(?:years?\s*(?:old)?|y\.?o\.?|yo))?\b/gi;
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const age = parseInt(match[1], 10);
            if (age >= 90) {
                const fullMatch = match[0];
                const span = new Span_1.Span({
                    text: fullMatch,
                    originalValue: fullMatch,
                    characterStart: match.index,
                    characterEnd: match.index + fullMatch.length,
                    filterType: Span_1.FilterType.AGE,
                    confidence: 0.97,
                    priority: this.getPriority(),
                    context: this.extractContext(text, match.index, match.index + fullMatch.length),
                    window: [],
                    replacement: "Age: 90+",
                    salt: null,
                    pattern: "Labeled age 90+",
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
     * Pattern 3: Age ranges involving 90+
     * Matches: "90-95 years", "aged 92-98", "between 91 and 95"
     */
    detectAgeRanges(text, spans) {
        // Pattern: X-Y years
        const patternA = /\b(\d{2,3})\s*[-–—to]+\s*(\d{2,3})\s*(?:years?\s+old|years?|y\.?o\.?)\b/gi;
        patternA.lastIndex = 0;
        let match;
        while ((match = patternA.exec(text)) !== null) {
            const age1 = parseInt(match[1], 10);
            const age2 = parseInt(match[2], 10);
            // If either end of range is 90+, redact the entire range
            if (age1 >= 90 || age2 >= 90) {
                const fullMatch = match[0];
                const span = new Span_1.Span({
                    text: fullMatch,
                    originalValue: fullMatch,
                    characterStart: match.index,
                    characterEnd: match.index + fullMatch.length,
                    filterType: Span_1.FilterType.AGE,
                    confidence: 0.94,
                    priority: this.getPriority(),
                    context: this.extractContext(text, match.index, match.index + fullMatch.length),
                    window: [],
                    replacement: "90+ years",
                    salt: null,
                    pattern: "Age range involving 90+",
                    applied: false,
                    ignored: false,
                    ambiguousWith: [],
                    disambiguationScore: null,
                });
                spans.push(span);
            }
        }
        // Pattern: "between X and Y years"
        const patternB = /\b(?:between|from)\s+(\d{2,3})\s+(?:and|to)\s+(\d{2,3})\s*(?:years?\s+old|years?|y\.?o\.?)?\b/gi;
        patternB.lastIndex = 0;
        while ((match = patternB.exec(text)) !== null) {
            const age1 = parseInt(match[1], 10);
            const age2 = parseInt(match[2], 10);
            if (age1 >= 90 || age2 >= 90) {
                const fullMatch = match[0];
                const span = new Span_1.Span({
                    text: fullMatch,
                    originalValue: fullMatch,
                    characterStart: match.index,
                    characterEnd: match.index + fullMatch.length,
                    filterType: Span_1.FilterType.AGE,
                    confidence: 0.93,
                    priority: this.getPriority(),
                    context: this.extractContext(text, match.index, match.index + fullMatch.length),
                    window: [],
                    replacement: "90+ years",
                    salt: null,
                    pattern: "Age range (between) involving 90+",
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
     * Pattern 4: Ordinal ages (decades)
     * Matches: "in her 90s", "early 90s", "mid-90s", "late 90s", "100s"
     */
    detectOrdinalAges(text, spans) {
        // Pattern for "in his/her 90s", "in their 90s"
        const patternA = /\b(?:in\s+)?(?:his|her|their|the)\s+(?:early\s+|mid[- ]?|late\s+)?(90|100|110)s\b/gi;
        patternA.lastIndex = 0;
        let match;
        while ((match = patternA.exec(text)) !== null) {
            const fullMatch = match[0];
            const span = new Span_1.Span({
                text: fullMatch,
                originalValue: fullMatch,
                characterStart: match.index,
                characterEnd: match.index + fullMatch.length,
                filterType: Span_1.FilterType.AGE,
                confidence: 0.92,
                priority: this.getPriority(),
                context: this.extractContext(text, match.index, match.index + fullMatch.length),
                window: [],
                replacement: "90+",
                salt: null,
                pattern: "Ordinal age 90s+",
                applied: false,
                ignored: false,
                ambiguousWith: [],
                disambiguationScore: null,
            });
            spans.push(span);
        }
        // Pattern for standalone "early/mid/late 90s" with age context
        const patternB = /\b(?:early|mid[- ]?|late)\s*(90|100|110)s\s*(?:years?\s+old|y\.?o\.?|of\s+age)?\b/gi;
        patternB.lastIndex = 0;
        while ((match = patternB.exec(text)) !== null) {
            const fullMatch = match[0];
            // Check for age context nearby
            if (this.hasAgeContext(text, match.index, fullMatch.length)) {
                const span = new Span_1.Span({
                    text: fullMatch,
                    originalValue: fullMatch,
                    characterStart: match.index,
                    characterEnd: match.index + fullMatch.length,
                    filterType: Span_1.FilterType.AGE,
                    confidence: 0.88,
                    priority: this.getPriority(),
                    context: this.extractContext(text, match.index, match.index + fullMatch.length),
                    window: [],
                    replacement: "90+",
                    salt: null,
                    pattern: "Ordinal age 90s+ with context",
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
     * Pattern 5: Contextual age mentions
     * Matches: "the 93-year-old patient", "a 91-year-old male/female"
     */
    detectContextualAges(text, spans) {
        // Pattern: "X-year-old" compound adjective
        const pattern = /\b(\d{2,3})[-–]year[-–]old\b/gi;
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const age = parseInt(match[1], 10);
            if (age >= 90) {
                const fullMatch = match[0];
                const span = new Span_1.Span({
                    text: fullMatch,
                    originalValue: fullMatch,
                    characterStart: match.index,
                    characterEnd: match.index + fullMatch.length,
                    filterType: Span_1.FilterType.AGE,
                    confidence: 0.96,
                    priority: this.getPriority(),
                    context: this.extractContext(text, match.index, match.index + fullMatch.length),
                    window: [],
                    replacement: "90+-year-old",
                    salt: null,
                    pattern: "Contextual age 90+ (compound)",
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
     * Check if there's age-related context nearby
     */
    hasAgeContext(text, matchIndex, matchLength) {
        const contextWindow = 50;
        const start = Math.max(0, matchIndex - contextWindow);
        const end = Math.min(text.length, matchIndex + matchLength + contextWindow);
        const surroundingText = text.substring(start, end).toLowerCase();
        const ageContextTerms = [
            "age",
            "aged",
            "years old",
            "y/o",
            "yo",
            "year old",
            "patient",
            "male",
            "female",
            "man",
            "woman",
            "elderly",
            "geriatric",
            "senior",
            "birthday",
            "born",
            "dob",
        ];
        return ageContextTerms.some((term) => surroundingText.includes(term));
    }
    /**
     * Pattern 6: Standalone 90+ numbers with age context nearby
     * Catches standalone ages like "90", "91", "97" when they appear
     * in medical documents with age-related context (Age:, years, patient, etc.)
     */
    detectStandaloneAgesWithContext(text, spans) {
        // Pattern for standalone 2-3 digit numbers that could be ages 90+
        const pattern = /\b(9\d|1[0-2]\d)\b/g;
        pattern.lastIndex = 0;
        let match;
        // Track already detected positions to avoid duplicates
        const detectedPositions = new Set(spans.map((s) => `${s.characterStart}-${s.characterEnd}`));
        while ((match = pattern.exec(text)) !== null) {
            const ageStr = match[1];
            const age = parseInt(ageStr, 10);
            // Must be 90 or above, but cap at reasonable human age (125)
            if (age < 90 || age > 125)
                continue;
            const posKey = `${match.index}-${match.index + ageStr.length}`;
            if (detectedPositions.has(posKey))
                continue;
            // Check for strong age context nearby
            if (this.hasStrongAgeContext(text, match.index, ageStr.length)) {
                const span = new Span_1.Span({
                    text: ageStr,
                    originalValue: ageStr,
                    characterStart: match.index,
                    characterEnd: match.index + ageStr.length,
                    filterType: Span_1.FilterType.AGE,
                    confidence: 0.85, // Slightly lower confidence for standalone numbers
                    priority: this.getPriority(),
                    context: this.extractContext(text, match.index, match.index + ageStr.length),
                    window: [],
                    replacement: "90+",
                    salt: null,
                    pattern: "Standalone age 90+ with context",
                    applied: false,
                    ignored: false,
                    ambiguousWith: [],
                    disambiguationScore: null,
                });
                spans.push(span);
                detectedPositions.add(posKey);
            }
        }
    }
    /**
     * Check for strong age-related context that makes a standalone number likely an age
     */
    hasStrongAgeContext(text, matchIndex, matchLength) {
        const contextWindow = 50; // Increased window for better context detection
        const start = Math.max(0, matchIndex - contextWindow);
        const end = Math.min(text.length, matchIndex + matchLength + contextWindow);
        const surroundingText = text.substring(start, end).toLowerCase();
        // Text immediately before and after the number
        const textBefore = text
            .substring(Math.max(0, matchIndex - 20), matchIndex)
            .toLowerCase();
        const textAfter = text
            .substring(matchIndex + matchLength, Math.min(text.length, matchIndex + matchLength + 20))
            .toLowerCase();
        // Strong context indicators that this number is an age
        const strongContextPatterns = [
            /\bage\s*[:=-]?\s*$/i, // "Age: " before
            /\baged?\s*$/i, // "aged " or "age " before
            /\byears?\s+old/i, // "years old" after
            /\by\.?o\.?\b/i, // "y/o" or "yo" nearby
            /\bpatient.*\bage\b/i, // "patient" and "age" nearby
            /\b(male|female|man|woman)\s*,?\s*$/i, // gender before age
            /^\s*(male|female|man|woman)\b/i, // gender after age
            /\belderly\b/i, // elderly context
            /\bgeriatric\b/i, // geriatric context
            /\bdob\b/i, // DOB context (often near age)
            /\bborn\b/i, // birth context
            /\bbirthday\b/i, // birthday context
        ];
        if (strongContextPatterns.some((pattern) => pattern.test(surroundingText))) {
            return true;
        }
        // Check for medical document structure patterns
        // In medical documents, standalone numbers after field labels are often ages
        const fieldLabelPattern = /(?:age|patient\s+age|pt\s+age)\s*[:=-]?\s*$/i;
        if (fieldLabelPattern.test(textBefore)) {
            return true;
        }
        // Check for "X years" pattern after the number (common OCR corruption of "years old")
        if (/^\s*(?:years?|yrs?|y)\b/i.test(textAfter)) {
            return true;
        }
        // Check for demographic context: "92 M" or "98 F" (age followed by gender abbreviation)
        if (/^\s*[MF]\b/i.test(textAfter)) {
            return true;
        }
        // Check for age in parenthetical context: "(98)" after patient name
        const parenBefore = text.substring(Math.max(0, matchIndex - 1), matchIndex);
        const parenAfter = text.substring(matchIndex + matchLength, matchIndex + matchLength + 1);
        if (parenBefore === "(" && parenAfter === ")") {
            // Check if this looks like a patient age context
            const beforeParen = text
                .substring(Math.max(0, matchIndex - 50), matchIndex - 1)
                .toLowerCase();
            if (/\b(?:patient|pt|name|mr\.|mrs\.|ms\.|dr\.)\b/.test(beforeParen)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Pattern 7: Ages in demographic lines
     * Matches standalone ages in demographic context: "92 M", "98 F", "103 Male"
     */
    detectDemographicAges(text, spans) {
        // Pattern: 2-3 digit number followed by M/F or Male/Female
        const pattern = /\b(9\d|1[0-2]\d)\s*([MF]|Male|Female)\b/gi;
        pattern.lastIndex = 0;
        let match;
        // Track already detected positions
        const detectedPositions = new Set(spans.map((s) => `${s.characterStart}-${s.characterEnd}`));
        while ((match = pattern.exec(text)) !== null) {
            const ageStr = match[1];
            const age = parseInt(ageStr, 10);
            if (age < 90 || age > 125)
                continue;
            const fullMatch = match[0];
            const posKey = `${match.index}-${match.index + fullMatch.length}`;
            if (detectedPositions.has(posKey))
                continue;
            const span = new Span_1.Span({
                text: fullMatch,
                originalValue: fullMatch,
                characterStart: match.index,
                characterEnd: match.index + fullMatch.length,
                filterType: Span_1.FilterType.AGE,
                confidence: 0.92,
                priority: this.getPriority(),
                context: this.extractContext(text, match.index, match.index + fullMatch.length),
                window: [],
                replacement: "90+ " + match[2],
                salt: null,
                pattern: "Demographic age 90+",
                applied: false,
                ignored: false,
                ambiguousWith: [],
                disambiguationScore: null,
            });
            spans.push(span);
            detectedPositions.add(posKey);
        }
    }
}
exports.AgeFilterSpan = AgeFilterSpan;
//# sourceMappingURL=AgeFilterSpan.js.map