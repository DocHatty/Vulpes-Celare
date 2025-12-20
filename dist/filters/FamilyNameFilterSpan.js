"use strict";
/**
 * FamilyNameFilterSpan - Family Member Name Detection (Span-Based)
 *
 * Detects family member names and relationships and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FamilyNameFilterSpan = void 0;
const Span_1 = require("../models/Span");
const SpanFactory_1 = require("../core/SpanFactory");
const SpanBasedFilter_1 = require("../core/SpanBasedFilter");
const NameDetectionCoordinator_1 = require("./name-patterns/NameDetectionCoordinator");
class FamilyNameFilterSpan extends SpanBasedFilter_1.SpanBasedFilter {
    getType() {
        return "NAME";
    }
    getPriority() {
        return SpanBasedFilter_1.FilterPriority.NAME;
    }
    detect(text, _config, _context) {
        // Try Rust acceleration first - detectSmart includes family member patterns
        // Uses coordinator for cached results to avoid duplicate FFI calls
        const rustDetections = NameDetectionCoordinator_1.nameDetectionCoordinator.getRustSmart(text);
        if (rustDetections.length > 0) {
            // Filter for family-related patterns
            const familyPatterns = rustDetections.filter((d) => d.pattern.includes("Family") || d.pattern.includes("Possessive"));
            if (familyPatterns.length > 0) {
                return familyPatterns.map((d) => {
                    return SpanFactory_1.SpanFactory.fromPosition(text, d.characterStart, d.characterEnd, Span_1.FilterType.NAME, {
                        confidence: d.confidence,
                        priority: this.getPriority(),
                        pattern: d.pattern,
                    });
                });
            }
        }
        // TypeScript fallback
        const spans = [];
        // PRIMARY PATTERNS: Family relationships (specialized focus)
        // Pattern 1: RELATIONSHIP LABELS + NAMES
        const relationshipPattern = /\b(?:Spouse|Wife|Husband|Father|Mother|Dad|Mom|Brother|Sister|Son|Daughter|Child|Children|Parent|Sibling|Partner|Guardian|Emergency[ \t]+Contact|Next[ \t]+of[ \t]+Kin|NOK)[ \t:]+([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+(?:[ \t]+(?:Jr\.?|Sr\.?|II|III|IV))?)?)\b/gi;
        relationshipPattern.lastIndex = 0;
        let match;
        while ((match = relationshipPattern.exec(text)) !== null) {
            const name = match[1];
            const fullMatch = match[0];
            // Skip if followed by "(age" - child patterns handle that
            const matchPos = match.index;
            const contextCheck = text.substring(matchPos, matchPos + fullMatch.length + 20);
            if (contextCheck.includes("(age")) {
                continue;
            }
            // Validate it looks like a name
            if (name && name.length >= 2 && /^[A-Z][a-z]/.test(name)) {
                // Find position of name within full match
                const nameStart = matchPos + fullMatch.indexOf(name);
                const nameEnd = nameStart + name.length;
                spans.push(SpanFactory_1.SpanFactory.fromPosition(text, nameStart, nameEnd, Span_1.FilterType.NAME, {
                    confidence: 0.9,
                    priority: this.getPriority(),
                    pattern: "Family relationship",
                }));
            }
        }
        // Pattern 2: MAIDEN NAMES
        const maidenNamePattern = /\b(?:nee|née|n\.e\.e\.|born)[ \t]+([A-Z][a-z]{2,})\b/gi;
        maidenNamePattern.lastIndex = 0;
        while ((match = maidenNamePattern.exec(text)) !== null) {
            const maidenName = match[1];
            const span = this.createSpanFromMatch(text, match, Span_1.FilterType.NAME, 0.92);
            // Adjust to capture only the maiden name
            span.characterStart = match.index + match[0].indexOf(maidenName);
            span.characterEnd = span.characterStart + maidenName.length;
            span.text = maidenName;
            spans.push(span);
        }
        // Pattern 3: NICKNAMES and AKA
        const akaPattern = /\b(?:Also[ \t]+known[ \t]+as|AKA|a\.k\.a\.|Nickname|Known[ \t]+as)[ \t:]+([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+)?(?:[ \t]*,[ \t]*[A-Z][a-z]+)*)/gi;
        akaPattern.lastIndex = 0;
        while ((match = akaPattern.exec(text)) !== null) {
            const names = match[1];
            const nameList = names.split(/\s*,\s*/);
            for (const name of nameList) {
                if (name.trim().length >= 2) {
                    // Find position of each name in the original text
                    const namePos = text.indexOf(name, match.index);
                    if (namePos !== -1) {
                        spans.push(SpanFactory_1.SpanFactory.fromPosition(text, namePos, namePos + name.length, Span_1.FilterType.NAME, {
                            confidence: 0.88,
                            priority: this.getPriority(),
                            pattern: "Nickname/AKA",
                        }));
                    }
                }
            }
        }
        // Pattern 4: MULTIPLE CHILDREN NAMES
        const multipleChildrenPattern = /\b(?:Children|Kids)[ \t:]+([A-Z][a-z]{2,})[ \t]+(\(age[ \t]+\d+\))[ \t]+and[ \t]+([A-Z][a-z]{2,})[ \t]+(\(age[ \t]+\d+\))/gi;
        multipleChildrenPattern.lastIndex = 0;
        while ((match = multipleChildrenPattern.exec(text)) !== null) {
            const name1 = match[1];
            const name2 = match[3];
            const fullMatch = match[0];
            const matchPos = match.index;
            // Create span for first name
            const name1Start = matchPos + fullMatch.indexOf(name1);
            spans.push(SpanFactory_1.SpanFactory.fromPosition(text, name1Start, name1Start + name1.length, Span_1.FilterType.NAME, {
                confidence: 0.9,
                priority: this.getPriority(),
                pattern: "Child with age",
            }));
            // Create span for second name
            const name2Start = matchPos +
                fullMatch.indexOf(name2, name1Start - matchPos + name1.length);
            spans.push(SpanFactory_1.SpanFactory.fromPosition(text, name2Start, name2Start + name2.length, Span_1.FilterType.NAME, {
                confidence: 0.9,
                priority: this.getPriority(),
                pattern: "Child with age",
            }));
        }
        // Pattern 5: SINGLE CHILD NAMES with age
        const childNameWithAgePattern = /\b(?:Children|Daughter|Son|Child)[ \t:]+([A-Z][a-z]+)(?:[ \t]*[\(,][ \t]*age|[ \t]+\(age)/gi;
        childNameWithAgePattern.lastIndex = 0;
        while ((match = childNameWithAgePattern.exec(text)) !== null) {
            const firstName = match[1];
            const fullMatch = match[0];
            // Skip if already matched by other patterns
            if (fullMatch.includes("{{") || fullMatch.includes("}}")) {
                continue;
            }
            if (firstName && firstName.length >= 2) {
                const matchPos = match.index;
                const firstNameStart = matchPos + fullMatch.indexOf(firstName);
                spans.push(SpanFactory_1.SpanFactory.fromPosition(text, firstNameStart, firstNameStart + firstName.length, Span_1.FilterType.NAME, {
                    confidence: 0.9,
                    priority: this.getPriority(),
                    pattern: "Child with age",
                }));
            }
        }
        // FALLBACK PATTERNS: General name detection for redundancy
        // These ensure FamilyNameFilterSpan can also catch generic names as backup
        // Pattern 6: Titled names (Dr. Smith, Mr. John Doe, etc.)
        this.detectTitledNames(text, spans);
        // Pattern 7: Last, First format (Smith, John)
        this.detectLastFirstNames(text, spans);
        // Pattern 8: General full names (John Smith, Jane Mary Doe)
        this.detectGeneralFullNames(text, spans);
        return spans;
    }
    /**
     * Fallback: Detect titled names (Dr. Smith, Mr. John Doe, etc.)
     *
     * IMPORTANT: Titled names are PROVIDER names under HIPAA Safe Harbor
     * and should NOT be redacted. Patients don't have formal titles.
     * This pattern is DISABLED to prevent provider name over-redaction.
     */
    detectTitledNames(_text, _spans) {
        // CRITICAL: ALL titled names are provider names - skip detection entirely
        // Titled names (Dr., Prof., Mr., Mrs., etc.) are NOT patient PHI
        return;
    }
    /**
     * Fallback: Detect Last, First format (Smith, John)
     */
    detectLastFirstNames(text, spans) {
        const lastFirstPattern = /\b([A-Z][a-z]{1,20}),\s+([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20})?)\b/g;
        let match;
        while ((match = lastFirstPattern.exec(text)) !== null) {
            const fullMatch = match[0];
            spans.push(SpanFactory_1.SpanFactory.fromPosition(text, match.index, match.index + fullMatch.length, Span_1.FilterType.NAME, {
                confidence: 0.82,
                priority: this.getPriority(),
                pattern: "Last, First format (fallback)",
            }));
        }
    }
    /**
     * Fallback: Detect general full names (John Smith, Jane Mary Doe)
     *
     * DISABLED: Too aggressive - matches medical diagnoses like "Trigeminal Neuralgia".
     * SmartNameFilterSpan handles general name detection with proper dictionary validation.
     */
    detectGeneralFullNames(_text, _spans) {
        // Intentionally empty - SmartNameFilterSpan handles this with proper validation
    }
}
exports.FamilyNameFilterSpan = FamilyNameFilterSpan;
//# sourceMappingURL=FamilyNameFilterSpan.js.map