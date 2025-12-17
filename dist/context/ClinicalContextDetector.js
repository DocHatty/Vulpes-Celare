"use strict";
/**
 * ClinicalContextDetector - Context-Aware PHI Detection Booster
 *
 * WIN-WIN STRATEGY: This module enables detection of ambiguous PHI patterns
 * ONLY when clinical context indicators are present. This simultaneously:
 *
 * 1. INCREASES SENSITIVITY: Catches PHI that would otherwise be missed
 *    - Diverse/uncommon names that aren't in dictionaries
 *    - Relative dates ("yesterday", "last week")
 *    - Partial addresses
 *
 * 2. INCREASES SPECIFICITY: By ONLY matching in clinical contexts
 *    - "Yesterday" in a news article = NOT PHI
 *    - "Yesterday patient was admitted" = PHI (temporal reference)
 *    - "Jordan" alone = ambiguous
 *    - "Patient Jordan was seen" = PHI (clinical context)
 *
 * Based on i2b2 2014 research and 2024-2025 NLP best practices.
 *
 * @module context
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextDetector = exports.RELATIVE_DATE_PATTERNS = exports.ClinicalContextDetector = void 0;
/**
 * Clinical context indicators with associated weights
 * Higher weight = stronger indication of clinical context
 */
const CONTEXT_PATTERNS = [
    // STRONG: Direct patient identification context
    {
        type: "PATIENT_LABEL",
        patterns: [
            /\b(?:patient|pt|subject|individual|client|resident|member)\s*(?:name)?[:\s]/gi,
            /\b(?:name|full\s+name)\s*[:\s]/gi,
            /\bMRN\s*[:#]/gi,
            /\b(?:DOB|date\s+of\s+birth)\s*[:\s]/gi,
            /\b(?:admitted|discharged|seen|evaluated|examined|treated)\b/gi,
        ],
        weight: 1.0,
    },
    // STRONG: Clinical setting indicators
    {
        type: "CLINICAL_SETTING",
        patterns: [
            /\b(?:hospital|clinic|emergency\s+room|ER|ICU|ward|unit|floor)\b/gi,
            /\b(?:admission|discharge|transfer|consult)\b/gi,
            /\b(?:inpatient|outpatient|ambulatory)\b/gi,
            /\b(?:surgery|procedure|operation|exam|examination)\b/gi,
            /\b(?:diagnosis|prognosis|treatment|therapy)\b/gi,
        ],
        weight: 0.9,
    },
    // MODERATE: Medical actions and observations
    {
        type: "MEDICAL_ACTION",
        patterns: [
            /\b(?:presented|presents|presenting)\s+(?:with|to)\b/gi,
            /\b(?:complains|complained|reports|reported|states|stated)\b/gi,
            /\b(?:denies|denied|endorses|endorsed)\b/gi,
            /\b(?:prescribed|ordered|administered|given)\b/gi,
            /\b(?:vital\s+signs|blood\s+pressure|temperature|pulse|respirations)\b/gi,
            /\b(?:symptoms?|signs?|findings?)\b/gi,
        ],
        weight: 0.8,
    },
    // MODERATE: Temporal expressions in clinical context
    {
        type: "TEMPORAL_CLINICAL",
        patterns: [
            /\b(?:onset|started|began|developed|occurred)\s+(?:on|at|around)?\b/gi,
            /\b(?:since|for\s+the\s+past|over\s+the\s+past|within\s+the\s+last)\b/gi,
            /\b(?:follow[- ]?up|return\s+visit|next\s+appointment)\b/gi,
            /\b(?:pre[- ]?op|post[- ]?op|day\s+\d+|POD\s*#?\d+)\b/gi,
        ],
        weight: 0.75,
    },
    // MODERATE: Relationship indicators (family members are PHI)
    {
        type: "RELATIONSHIP",
        patterns: [
            /\b(?:spouse|wife|husband|partner)\b/gi,
            /\b(?:mother|father|parent|guardian)\b/gi,
            /\b(?:son|daughter|child|children|sibling|brother|sister)\b/gi,
            /\b(?:caregiver|emergency\s+contact|next\s+of\s+kin|NOK)\b/gi,
        ],
        weight: 0.85,
    },
    // WEAK: Demographic descriptors
    {
        type: "DEMOGRAPHIC",
        patterns: [
            /\b\d+[- ]?(?:year|yr|y\.?o\.?)[- ]?old\b/gi,
            /\b(?:male|female|man|woman|boy|girl)\b/gi,
            /\b(?:caucasian|african[- ]?american|hispanic|asian|latino|latina)\b/gi,
        ],
        weight: 0.6,
    },
    // WEAK: Location in clinical context
    {
        type: "LOCATION_CLINICAL",
        patterns: [
            /\b(?:resides?|lives?|living)\s+(?:in|at|near)\b/gi,
            /\b(?:transferred\s+from|referred\s+from|came\s+from)\b/gi,
            /\b(?:home\s+address|mailing\s+address)\b/gi,
        ],
        weight: 0.65,
    },
    // WEAK: Document structure (headers often precede PHI)
    {
        type: "DOCUMENT_STRUCTURE",
        patterns: [
            /^(?:Patient|Subject|Client)\s*(?:Information|Demographics)?[:\s]*$/gim,
            /^(?:Emergency\s+)?Contact[:\s]*$/gim,
            /^(?:Family|Social)\s+History[:\s]*$/gim,
        ],
        weight: 0.5,
    },
];
/**
 * ClinicalContextDetector analyzes text to determine if clinical context
 * is present, enabling context-aware PHI detection.
 */
class ClinicalContextDetector {
    static CONTEXT_WINDOW_SIZE = 150; // chars before/after
    /**
     * Analyze the context around a position in the text
     * Returns context strength and indicators found
     */
    static analyzeContext(text, position, length = 0) {
        const windowStart = Math.max(0, position - this.CONTEXT_WINDOW_SIZE);
        const windowEnd = Math.min(text.length, position + length + this.CONTEXT_WINDOW_SIZE);
        const windowText = text.substring(windowStart, windowEnd);
        const indicators = [];
        // Search for all context patterns in the window
        for (const contextDef of CONTEXT_PATTERNS) {
            for (const pattern of contextDef.patterns) {
                pattern.lastIndex = 0;
                let match;
                while ((match = pattern.exec(windowText)) !== null) {
                    indicators.push({
                        type: contextDef.type,
                        text: match[0],
                        position: windowStart + match.index,
                        weight: contextDef.weight,
                    });
                }
            }
        }
        // Calculate aggregate context strength
        const strength = this.calculateStrength(indicators);
        return {
            text: windowText,
            start: windowStart,
            end: windowEnd,
            indicators,
            strength,
        };
    }
    /**
     * Quick check: Is this position in clinical context?
     * Returns true if context strength is MODERATE or STRONG
     */
    static isInClinicalContext(text, position, length = 0) {
        const context = this.analyzeContext(text, position, length);
        return context.strength === "STRONG" || context.strength === "MODERATE";
    }
    /**
     * Get a confidence boost based on clinical context
     * Use this to adjust detection confidence when context is present
     *
     * @returns Value between 0.0 and 0.15 to add to base confidence
     */
    static getContextConfidenceBoost(text, position, length = 0) {
        const context = this.analyzeContext(text, position, length);
        switch (context.strength) {
            case "STRONG":
                return 0.15;
            case "MODERATE":
                return 0.10;
            case "WEAK":
                return 0.05;
            default:
                return 0.0;
        }
    }
    /**
     * Calculate aggregate strength from multiple indicators
     */
    static calculateStrength(indicators) {
        if (indicators.length === 0) {
            return "NONE";
        }
        // Calculate weighted sum
        const totalWeight = indicators.reduce((sum, ind) => sum + ind.weight, 0);
        // Count unique types
        const uniqueTypes = new Set(indicators.map((ind) => ind.type)).size;
        // Strong: High weight OR multiple indicator types
        if (totalWeight >= 1.5 || (totalWeight >= 0.8 && uniqueTypes >= 2)) {
            return "STRONG";
        }
        // Moderate: Medium weight or single strong indicator
        if (totalWeight >= 0.7 || uniqueTypes >= 2) {
            return "MODERATE";
        }
        // Weak: Some indicators present
        if (totalWeight > 0) {
            return "WEAK";
        }
        return "NONE";
    }
    /**
     * Find all clinical context windows in a document
     * Useful for batch processing or pre-analysis
     */
    static findAllContextWindows(text) {
        const windows = [];
        const windowSize = this.CONTEXT_WINDOW_SIZE * 2;
        const step = this.CONTEXT_WINDOW_SIZE;
        for (let i = 0; i < text.length; i += step) {
            const context = this.analyzeContext(text, i, windowSize);
            if (context.strength !== "NONE") {
                // Merge overlapping windows
                const lastWindow = windows[windows.length - 1];
                if (lastWindow && lastWindow.end >= context.start) {
                    // Extend the previous window
                    lastWindow.end = Math.max(lastWindow.end, context.end);
                    lastWindow.indicators.push(...context.indicators);
                    lastWindow.strength = this.calculateStrength(lastWindow.indicators);
                }
                else {
                    windows.push(context);
                }
            }
        }
        return windows;
    }
}
exports.ClinicalContextDetector = ClinicalContextDetector;
/**
 * Relative temporal expressions that are PHI in clinical context
 * These should ONLY be detected when clinical context is present
 */
exports.RELATIVE_DATE_PATTERNS = [
    // Days
    {
        pattern: /\b(?:yesterday|today|tomorrow)\b/gi,
        baseConfidence: 0.7,
        requiresContext: true,
    },
    {
        pattern: /\b(?:the\s+)?day\s+before\s+yesterday\b/gi,
        baseConfidence: 0.75,
        requiresContext: true,
    },
    {
        pattern: /\b(?:the\s+)?day\s+after\s+tomorrow\b/gi,
        baseConfidence: 0.75,
        requiresContext: true,
    },
    // Weeks
    {
        pattern: /\b(?:last|this|next)\s+week\b/gi,
        baseConfidence: 0.7,
        requiresContext: true,
    },
    {
        pattern: /\b(?:a|one|two|three|four)\s+weeks?\s+ago\b/gi,
        baseConfidence: 0.8,
        requiresContext: true,
    },
    {
        pattern: /\bin\s+(?:a|one|two|three|four)\s+weeks?\b/gi,
        baseConfidence: 0.75,
        requiresContext: true,
    },
    // Months
    {
        pattern: /\b(?:last|this|next)\s+month\b/gi,
        baseConfidence: 0.7,
        requiresContext: true,
    },
    {
        pattern: /\b(?:a|one|two|three|four|five|six)\s+months?\s+ago\b/gi,
        baseConfidence: 0.8,
        requiresContext: true,
    },
    {
        pattern: /\bin\s+(?:a|one|two|three|four|five|six)\s+months?\b/gi,
        baseConfidence: 0.75,
        requiresContext: true,
    },
    // Years
    {
        pattern: /\b(?:last|this|next)\s+year\b/gi,
        baseConfidence: 0.65,
        requiresContext: true,
    },
    {
        pattern: /\b(?:a|one|two|three|four|five)\s+years?\s+ago\b/gi,
        baseConfidence: 0.8,
        requiresContext: true,
    },
    // Seasons (PHI when narrowing to specific timeframes)
    {
        pattern: /\b(?:last|this|next)\s+(?:spring|summer|fall|autumn|winter)\b/gi,
        baseConfidence: 0.6,
        requiresContext: true,
    },
    {
        pattern: /\b(?:spring|summer|fall|autumn|winter)\s+(?:of\s+)?\d{4}\b/gi,
        baseConfidence: 0.85,
        requiresContext: false, // Year makes it specific enough
    },
    // Holidays (PHI when identifying specific dates)
    {
        pattern: /\b(?:last|this|next)\s+(?:Christmas|Thanksgiving|Easter|New\s+Year'?s?)\b/gi,
        baseConfidence: 0.7,
        requiresContext: true,
    },
    // Relative with specific reference
    {
        pattern: /\b(?:earlier|later)\s+(?:that|this)\s+(?:day|week|month)\b/gi,
        baseConfidence: 0.75,
        requiresContext: true,
    },
    {
        pattern: /\b(?:the\s+)?(?:following|previous|prior)\s+(?:day|week|month)\b/gi,
        baseConfidence: 0.75,
        requiresContext: true,
    },
    // Clinical-specific temporal
    {
        pattern: /\bpost[- ]?(?:op|operative)\s+day\s+\d+\b/gi,
        baseConfidence: 0.9,
        requiresContext: false, // Already clinical
    },
    {
        pattern: /\bPOD\s*#?\s*\d+\b/gi,
        baseConfidence: 0.9,
        requiresContext: false,
    },
    {
        pattern: /\bday\s+\d+\s+(?:of|post)\b/gi,
        baseConfidence: 0.85,
        requiresContext: false,
    },
    // Age-at-event patterns (narrowing birth date)
    {
        pattern: /\bat\s+(?:age|the\s+age\s+of)\s+\d+\b/gi,
        baseConfidence: 0.7,
        requiresContext: true,
    },
    {
        pattern: /\bwhen\s+(?:he|she|they|patient)\s+was\s+\d+\b/gi,
        baseConfidence: 0.75,
        requiresContext: true,
    },
];
/**
 * Export singleton for convenience
 */
exports.contextDetector = ClinicalContextDetector;
//# sourceMappingURL=ClinicalContextDetector.js.map