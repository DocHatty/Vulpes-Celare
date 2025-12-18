"use strict";
/**
 * Span Disambiguation Service - Vector-based disambiguation of ambiguous spans
 *
 * Solves the problem: Is "123-45-6789" an SSN or a phone number?
 * Uses context windows and cosine similarity to determine the correct type.
 *
 * Based on Phileas's VectorBasedSpanDisambiguationService with VulpesHIPPA adaptations.
 *
 * Example:
 * - "SSN is 123-45-6789" → high confidence it's SSN
 * - "called 123-45-6789" → high confidence it's phone
 *
 * @module redaction/services
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpanDisambiguationService = void 0;
const Span_1 = require("../models/Span");
const string_similarity_1 = require("../utils/stubs/string-similarity");
const VulpesLogger_1 = require("../utils/VulpesLogger");
/**
 * Context keyword vectors for each filter type
 * These are learned patterns of words that commonly appear near each entity type
 */
const FILTER_TYPE_CONTEXT_VECTORS = new Map([
    // SSN context keywords
    [Span_1.FilterType.SSN, [
            "ssn", "social", "security", "number", "tax", "taxpayer", "tin",
            "identification", "ein", "employee", "federal", "issued"
        ]],
    // Phone context keywords
    [Span_1.FilterType.PHONE, [
            "phone", "call", "called", "telephone", "mobile", "cell",
            "contact", "reach", "dial", "number", "extension", "ext"
        ]],
    // Date context keywords
    [Span_1.FilterType.DATE, [
            "date", "born", "birthday", "admission", "discharge", "visit",
            "appointment", "scheduled", "on", "occurred", "happened"
        ]],
    // MRN context keywords
    [Span_1.FilterType.MRN, [
            "mrn", "medical", "record", "number", "patient", "chart",
            "file", "hospital", "clinic", "account"
        ]],
    // Credit card context keywords
    [Span_1.FilterType.CREDIT_CARD, [
            "card", "credit", "visa", "mastercard", "amex", "discover",
            "payment", "charged", "transaction", "billing", "account"
        ]],
    // Account number context keywords
    [Span_1.FilterType.ACCOUNT, [
            "account", "acct", "number", "banking", "checking", "savings",
            "financial", "bank", "routing", "deposit"
        ]],
    // Age context keywords
    [Span_1.FilterType.AGE, [
            "age", "years", "old", "yo", "aged", "patient",
            "born", "birthday", "child", "adult", "elderly"
        ]],
    // Address context keywords
    [Span_1.FilterType.ADDRESS, [
            "address", "street", "avenue", "road", "drive", "lane",
            "boulevard", "apt", "suite", "unit", "floor", "building"
        ]],
    // ZIP code context keywords
    [Span_1.FilterType.ZIPCODE, [
            "zip", "zipcode", "postal", "code", "mail", "mailing",
            "address", "location", "area"
        ]],
    // Email context keywords
    [Span_1.FilterType.EMAIL, [
            "email", "mail", "address", "contact", "send", "sent",
            "inbox", "message", "correspondence", "reply"
        ]],
    // IP address context keywords
    [Span_1.FilterType.IP, [
            "ip", "address", "server", "network", "connection", "host",
            "device", "computer", "router", "firewall"
        ]],
    // License context keywords
    [Span_1.FilterType.LICENSE, [
            "license", "permit", "certification", "credential", "registration",
            "issued", "expires", "state", "drivers", "professional"
        ]]
]);
/**
 * Ambiguous pattern groups - patterns that can be multiple types
 */
const AMBIGUOUS_PATTERNS = new Map([
    // 9 digits with dashes: SSN or phone
    ["\\d{3}-\\d{2}-\\d{4}", [Span_1.FilterType.SSN, Span_1.FilterType.PHONE]],
    // 9 consecutive digits: SSN, phone, or MRN
    ["\\d{9}", [Span_1.FilterType.SSN, Span_1.FilterType.PHONE, Span_1.FilterType.MRN]],
    // 10 consecutive digits: phone or MRN
    ["\\d{10}", [Span_1.FilterType.PHONE, Span_1.FilterType.MRN]],
    // Dates vs ages: "50" could be age or year
    ["\\d{1,3}", [Span_1.FilterType.AGE, Span_1.FilterType.DATE]],
    // Account numbers vs credit cards
    ["\\d{13,19}", [Span_1.FilterType.CREDIT_CARD, Span_1.FilterType.ACCOUNT]]
]);
/**
 * Span Disambiguation Service
 */
class SpanDisambiguationService {
    confidenceThreshold;
    windowSize;
    constructor(confidenceThreshold = 0.15, windowSize = 5) {
        this.confidenceThreshold = confidenceThreshold;
        this.windowSize = windowSize;
    }
    /**
     * Disambiguate a group of identical spans (same position, different types)
     * Returns the most likely FilterType based on context
     */
    disambiguate(spans) {
        if (spans.length === 0)
            return null;
        if (spans.length === 1)
            return spans[0];
        // All spans should be at same position
        const position = spans[0].characterStart;
        const text = spans[0].text;
        VulpesLogger_1.vulpesLogger.debug(`Disambiguating "${text}" at position ${position}`, {
            component: "Disambiguation",
            candidates: spans.map(s => s.filterType).join(", "),
        });
        // Calculate context similarity for each candidate
        const scores = new Map();
        for (const span of spans) {
            const score = this.calculateContextScore(span);
            scores.set(span.filterType, score);
            VulpesLogger_1.vulpesLogger.trace(`${span.filterType}: ${score.toFixed(3)}`, { component: "Disambiguation" });
        }
        // Find best match
        let bestSpan = null;
        let bestScore = -Infinity;
        for (const span of spans) {
            const score = scores.get(span.filterType) || 0;
            if (score > bestScore) {
                bestScore = score;
                bestSpan = span;
            }
        }
        // Check if best score meets threshold
        if (bestSpan && bestScore >= this.confidenceThreshold) {
            VulpesLogger_1.vulpesLogger.debug(`Selected: ${bestSpan.filterType} (score: ${bestScore.toFixed(3)})`, { component: "Disambiguation" });
            bestSpan.disambiguationScore = bestScore;
            bestSpan.ambiguousWith = spans
                .filter(s => s.filterType !== bestSpan.filterType)
                .map(s => s.filterType);
            return bestSpan;
        }
        // If no clear winner, fall back to highest confidence or priority
        VulpesLogger_1.vulpesLogger.debug("No clear winner, using fallback", { component: "Disambiguation" });
        return this.fallbackDisambiguation(spans);
    }
    /**
     * Calculate context similarity score for a span
     * Uses cosine similarity between window and filter type keywords
     */
    calculateContextScore(span) {
        const keywords = FILTER_TYPE_CONTEXT_VECTORS.get(span.filterType);
        if (!keywords || keywords.length === 0) {
            // No keywords defined, use base confidence
            return span.confidence * 0.5;
        }
        // Get context window
        const windowText = span.window.join(" ").toLowerCase();
        // Calculate similarity score
        let totalSimilarity = 0;
        let keywordMatches = 0;
        for (const keyword of keywords) {
            // Check for exact match (fast path)
            if (windowText.includes(keyword)) {
                totalSimilarity += 1.0;
                keywordMatches++;
            }
            else {
                // Check for fuzzy match using string similarity
                const words = windowText.split(/\s+/);
                for (const word of words) {
                    if (word.length >= 3) {
                        const similarity = (0, string_similarity_1.compareTwoStrings)(keyword, word);
                        if (similarity > 0.7) {
                            totalSimilarity += similarity;
                            keywordMatches++;
                            break; // Only count once per keyword
                        }
                    }
                }
            }
        }
        // Normalize by number of keywords
        const keywordScore = keywords.length > 0 ? totalSimilarity / keywords.length : 0;
        // Combine with span confidence (weighted average)
        const combinedScore = (keywordScore * 0.7) + (span.confidence * 0.3);
        return combinedScore;
    }
    /**
     * Fallback disambiguation when context isn't conclusive
     * Uses confidence and priority
     */
    fallbackDisambiguation(spans) {
        // Sort by confidence, then priority
        const sorted = [...spans].sort((a, b) => {
            if (a.confidence !== b.confidence) {
                return b.confidence - a.confidence;
            }
            return b.priority - a.priority;
        });
        const winner = sorted[0];
        winner.disambiguationScore = winner.confidence;
        winner.ambiguousWith = spans
            .filter(s => s.filterType !== winner.filterType)
            .map(s => s.filterType);
        return winner;
    }
    /**
     * Disambiguate all ambiguous span groups in a collection
     */
    disambiguateAll(spans) {
        // Group by position
        const positionGroups = new Map();
        for (const span of spans) {
            const key = `${span.characterStart}-${span.characterEnd}`;
            if (!positionGroups.has(key)) {
                positionGroups.set(key, []);
            }
            positionGroups.get(key).push(span);
        }
        // Disambiguate each group
        const disambiguated = [];
        for (const group of positionGroups.values()) {
            if (group.length === 1) {
                // No ambiguity
                disambiguated.push(group[0]);
            }
            else {
                // Ambiguous - disambiguate
                const winner = this.disambiguate(group);
                if (winner) {
                    disambiguated.push(winner);
                }
                else {
                    // Failed to disambiguate, keep highest confidence
                    disambiguated.push(group[0]);
                }
            }
        }
        return disambiguated;
    }
    /**
     * Check if a span text matches known ambiguous patterns
     */
    isAmbiguousPattern(text) {
        for (const [pattern, types] of AMBIGUOUS_PATTERNS) {
            const regex = new RegExp(`^${pattern}$`);
            if (regex.test(text)) {
                return types;
            }
        }
        return null;
    }
    /**
     * Add custom context keywords for a filter type
     */
    addContextKeywords(filterType, keywords) {
        const existing = FILTER_TYPE_CONTEXT_VECTORS.get(filterType) || [];
        FILTER_TYPE_CONTEXT_VECTORS.set(filterType, [...existing, ...keywords]);
    }
    /**
     * Add custom ambiguous pattern
     */
    addAmbiguousPattern(pattern, types) {
        AMBIGUOUS_PATTERNS.set(pattern, types);
    }
    /**
     * Get confidence threshold
     */
    getConfidenceThreshold() {
        return this.confidenceThreshold;
    }
    /**
     * Set confidence threshold
     */
    setConfidenceThreshold(threshold) {
        this.confidenceThreshold = threshold;
    }
}
exports.SpanDisambiguationService = SpanDisambiguationService;
//# sourceMappingURL=SpanDisambiguationService.js.map