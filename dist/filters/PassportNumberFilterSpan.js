"use strict";
/**
 * PassportNumberFilterSpan - Passport Number Detection (Span-Based)
 *
 * Detects passport numbers from various countries and returns Spans.
 * Supports multiple passport number formats including:
 * - Canada: 1-2 letters + 6-8 digits (e.g., C47829385, AB1234567)
 * - US: 9 alphanumeric (letter + 8 digits or 9 digits)
 * - UK: 9 alphanumeric
 * - European formats: various patterns
 *
 * Parallel-execution ready.
 *
 * @module filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PassportNumberFilterSpan = void 0;
const SpanBasedFilter_1 = require("../core/SpanBasedFilter");
const SpanFactory_1 = require("../core/SpanFactory");
const RustScanKernel_1 = require("../utils/RustScanKernel");
class PassportNumberFilterSpan extends SpanBasedFilter_1.SpanBasedFilter {
    /**
     * Context keywords that indicate a passport number
     */
    static PASSPORT_KEYWORDS = [
        "passport",
        "travel document",
        "document number",
        "passport no",
        "passport #",
        "passport number",
        "passport num",
    ];
    /**
     * Passport regex pattern sources
     */
    static PASSPORT_PATTERN_SOURCES = [
        // Contextual passport pattern
        /\b(?:passport|travel\s*document)(?:\s*(?:no|#|number|num))?[\s:]+([A-Z]{1,2}\d{6,8}|\d{9}|[A-Z0-9]{9})\b/gi,
        // Canadian passport (1-2 letters + 6-8 digits)
        /\b([A-Z]{1,2}\d{6,8})\b/g,
        // US passport (9 alphanumeric)
        /\b([A-Z]\d{8}|\d{9})\b/g,
        // UK/EU passport (9 alphanumeric)
        /\b([A-Z]{2}\d{7}|[A-Z]\d{8})\b/g,
    ];
    /**
     * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
     */
    static COMPILED_PATTERNS = PassportNumberFilterSpan.compilePatterns(PassportNumberFilterSpan.PASSPORT_PATTERN_SOURCES);
    getType() {
        return "PASSPORT";
    }
    getPriority() {
        // Same priority as LICENSE since it's an identifying document
        return SpanBasedFilter_1.FilterPriority.LICENSE;
    }
    detect(text, _config, context) {
        const accelerated = RustScanKernel_1.RustScanKernel.getDetections(context, text, "PASSPORT");
        if (accelerated && accelerated.length > 0) {
            return accelerated.map((d) => {
                return SpanFactory_1.SpanFactory.fromPosition(text, d.characterStart, d.characterEnd, "PASSPORT", {
                    confidence: d.confidence,
                    priority: this.getPriority(),
                    pattern: d.pattern,
                });
            });
        }
        const spans = [];
        const seenPositions = new Set();
        // Pattern 1: Contextual passport numbers (highest confidence)
        this.detectContextualPassports(text, spans, seenPositions);
        // Pattern 2: Canadian format with context check
        this.detectCanadianPassports(text, spans, seenPositions);
        // Pattern 3: US format with context check
        this.detectUSPassports(text, spans, seenPositions);
        // Pattern 4: UK/EU format with context check
        this.detectUKEUPassports(text, spans, seenPositions);
        return spans;
    }
    /**
     * Detect passport numbers with explicit context (Passport Number: XXX)
     */
    detectContextualPassports(text, spans, seenPositions) {
        const pattern = PassportNumberFilterSpan.COMPILED_PATTERNS[0];
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const passportNum = match[1];
            const fullMatch = match[0];
            const numStart = match.index + fullMatch.indexOf(passportNum);
            const numEnd = numStart + passportNum.length;
            const posKey = `${numStart}-${numEnd}`;
            if (!seenPositions.has(posKey)) {
                seenPositions.add(posKey);
                spans.push(this.createPassportSpan(text, passportNum, numStart, numEnd, 0.95, "Contextual passport"));
            }
        }
    }
    /**
     * Detect Canadian passport numbers (1-2 letters + 6-8 digits)
     * Only matches if near passport context keywords
     */
    detectCanadianPassports(text, spans, seenPositions) {
        const pattern = PassportNumberFilterSpan.COMPILED_PATTERNS[1];
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const passportNum = match[1];
            const posKey = `${match.index}-${match.index + passportNum.length}`;
            if (seenPositions.has(posKey))
                continue;
            // Require context for standalone matches to avoid false positives
            if (this.hasPassportContext(text, match.index, passportNum.length)) {
                seenPositions.add(posKey);
                spans.push(this.createPassportSpan(text, passportNum, match.index, match.index + passportNum.length, 0.88, "Canadian passport"));
            }
        }
    }
    /**
     * Detect US passport numbers (9 digits or letter + 8 digits)
     * Only matches if near passport context keywords
     */
    detectUSPassports(text, spans, seenPositions) {
        const pattern = PassportNumberFilterSpan.COMPILED_PATTERNS[2];
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const passportNum = match[1];
            const posKey = `${match.index}-${match.index + passportNum.length}`;
            if (seenPositions.has(posKey))
                continue;
            // US passports are 9 digits - could be SSN, phone, etc. Require strong context
            if (this.hasPassportContext(text, match.index, passportNum.length)) {
                // Additional check: make sure it's not already detected as SSN or phone
                if (!this.looksLikeOtherIdentifier(text, match.index, passportNum)) {
                    seenPositions.add(posKey);
                    spans.push(this.createPassportSpan(text, passportNum, match.index, match.index + passportNum.length, 0.85, "US passport"));
                }
            }
        }
    }
    /**
     * Detect UK/EU passport numbers
     * Only matches if near passport context keywords
     */
    detectUKEUPassports(text, spans, seenPositions) {
        const pattern = PassportNumberFilterSpan.COMPILED_PATTERNS[3];
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const passportNum = match[1];
            const posKey = `${match.index}-${match.index + passportNum.length}`;
            if (seenPositions.has(posKey))
                continue;
            if (this.hasPassportContext(text, match.index, passportNum.length)) {
                seenPositions.add(posKey);
                spans.push(this.createPassportSpan(text, passportNum, match.index, match.index + passportNum.length, 0.87, "UK/EU passport"));
            }
        }
    }
    /**
     * Check if there's passport-related context near the match
     */
    hasPassportContext(text, matchIndex, matchLength) {
        // Look for context in surrounding 200 characters
        const contextStart = Math.max(0, matchIndex - 100);
        const contextEnd = Math.min(text.length, matchIndex + matchLength + 100);
        const context = text.substring(contextStart, contextEnd).toLowerCase();
        for (const keyword of PassportNumberFilterSpan.PASSPORT_KEYWORDS) {
            if (context.includes(keyword)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Check if the number looks like another type of identifier (SSN, phone, etc.)
     */
    looksLikeOtherIdentifier(text, matchIndex, value) {
        const contextStart = Math.max(0, matchIndex - 50);
        const contextEnd = Math.min(text.length, matchIndex + value.length + 50);
        const context = text.substring(contextStart, contextEnd).toLowerCase();
        // Check for SSN context
        const ssnKeywords = ["ssn", "social security", "ss#", "ss #"];
        for (const keyword of ssnKeywords) {
            if (context.includes(keyword)) {
                return true;
            }
        }
        // Check for phone context
        const phoneKeywords = ["phone", "tel", "fax", "cell", "mobile", "call"];
        for (const keyword of phoneKeywords) {
            if (context.includes(keyword)) {
                return true;
            }
        }
        // Check if it has dashes typical of SSN (XXX-XX-XXXX format nearby)
        if (/\d{3}-\d{2}-\d{4}/.test(context)) {
            return true;
        }
        return false;
    }
    /**
     * Create a passport span
     */
    createPassportSpan(text, _value, start, end, confidence, patternName) {
        return SpanFactory_1.SpanFactory.fromPosition(text, start, end, "PASSPORT", {
            confidence: confidence,
            priority: this.getPriority(),
            pattern: patternName,
        });
    }
}
exports.PassportNumberFilterSpan = PassportNumberFilterSpan;
//# sourceMappingURL=PassportNumberFilterSpan.js.map