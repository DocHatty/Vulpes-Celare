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
class AgeFilterSpan extends SpanBasedFilter_1.SpanBasedFilter {
    getType() {
        return "AGE";
    }
    getPriority() {
        return SpanBasedFilter_1.FilterPriority.DATE; // Same priority as dates (age-related)
    }
    detect(text, config, context) {
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
     */
    detectLabeledAges(text, spans) {
        const pattern = /\b(?:patient\s+)?age\s*[:\-=]\s*(\d{2,3})(?:\s*(?:years?|y\.?o\.?|yo))?\b/gi;
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
}
exports.AgeFilterSpan = AgeFilterSpan;
//# sourceMappingURL=AgeFilterSpan.js.map