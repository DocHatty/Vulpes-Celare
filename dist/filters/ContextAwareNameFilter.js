"use strict";
/**
 * ContextAwareNameFilter - Diverse Name Detection with Context Guards
 *
 * WIN-WIN STRATEGY:
 * - INCREASES SENSITIVITY: Detects names from underrepresented groups
 *   that may not be in standard dictionaries (African American, hyphenated,
 *   non-Western naming conventions)
 * - INCREASES SPECIFICITY: Only matches when clinical context is present,
 *   preventing false positives on ambiguous terms
 *
 * Based on:
 * - i2b2 2014 NLP Challenge findings on name detection gaps
 * - 2024-2025 DEI research on diverse naming patterns
 * - HIPAA Safe Harbor 18 identifier requirements
 *
 * @module filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextAwareNameFilter = void 0;
const Span_1 = require("../models/Span");
const SpanFactory_1 = require("../core/SpanFactory");
const SpanBasedFilter_1 = require("../core/SpanBasedFilter");
const ClinicalContextDetector_1 = require("../context/ClinicalContextDetector");
const NameDictionary_1 = require("../dictionaries/NameDictionary");
const UnifiedMedicalWhitelist_1 = require("../utils/UnifiedMedicalWhitelist");
/**
 * Diverse first name patterns - names that may be underrepresented in
 * standard dictionaries but are common in patient populations
 */
const DIVERSE_FIRST_NAME_PATTERNS = [
    // African American naming patterns
    // La-/Le-/De- prefixed names: LaShonda, LeRoy, DeAndre
    /\b(La[A-Z][a-z]{2,})\b/g,
    /\b(Le[A-Z][a-z]{2,})\b/g,
    /\b(De[A-Z][a-z]{2,})\b/g,
    // -isha/-esha/-asha endings: Tanisha, Lakeisha, Natasha
    /\b([A-Z][a-z]*(?:isha|esha|asha))\b/gi,
    // -ique/-ika/-ica endings: Monique, Tamika, Danica
    /\b([A-Z][a-z]*(?:ique|ika|ica))\b/gi,
    // -ondra/-andra/-endra: Kendra, Alondra, Chandra
    /\b([A-Z][a-z]*(?:ondra|andra|endra))\b/gi,
    // Ja-/Je-/Jo- prefixes: Jamal, Jerome, Jolene
    /\b(Ja[a-z]{3,})\b/g,
    /\b(Je[a-z]{3,})\b/g,
    // Unique/creative spellings with -lyn/-lynn/-line
    /\b([A-Z][a-z]*(?:lyn|lynn|line))\b/gi,
    // -qua/-qwan/-quan patterns: Daquan, Shaquan
    /\b([A-Z][a-z]*(?:qua|qwan|quan))\b/gi,
    // Ty-/Tra-/Tre- prefixes: Tyrone, Travon, Tremaine
    /\b(Ty[a-z]{2,})\b/g,
    /\b(Tra[a-z]{2,})\b/g,
    /\b(Tre[a-z]{2,})\b/g,
    // -arius/-arious/-rius: Darius, Marius
    /\b([A-Z][a-z]*(?:arius|arious|rius))\b/gi,
    // Hispanic/Latino patterns
    // María/Jose compound names: María Elena, José Luis
    /\b(Mar[íi]a\s+[A-Z][a-z]+)\b/gu,
    /\b(Jos[ée]\s+[A-Z][a-z]+)\b/gu,
    // -ito/-ita diminutives: Juanito, Rosita
    /\b([A-Z][a-z]+(?:ito|ita))\b/gi,
    // Asian naming patterns
    // Vietnamese: Nguyen, Tran prefixed with first name
    /\b([A-Z][a-z]+\s+(?:Nguyen|Tran|Le|Pham|Hoang|Phan|Vu|Vo|Dang|Bui|Do|Ho|Ngo|Duong|Ly))\b/g,
    // Chinese pinyin patterns (two-syllable)
    /\b((?:Xiao|Ming|Wei|Jian|Hong|Yong|Jun|Hui|Ying|Xin)[- ]?[A-Z][a-z]+)\b/g,
    // Korean: patterns with -young, -jin, -min
    /\b([A-Z][a-z]*(?:young|jin|min|hee|soo|hyun))\b/gi,
    // Middle Eastern/South Asian patterns
    // Mohammed variants: Mohammad, Muhammad, Muhammed
    /\b(Moha?m+[ae]d)\b/gi,
    /\b(Muha?m+[ae]d)\b/gi,
    // -ul-/-al- patterns: Abdullah, Abdulrahman
    /\b(Abd[u]?l[- ]?[A-Z][a-z]+)\b/gi,
    // -deep/-preet/-jit patterns: Mandeep, Gurpreet, Manjit
    /\b([A-Z][a-z]*(?:deep|preet|jit|inder|pal))\b/gi,
];
/**
 * Hyphenated surname patterns - increasingly common and often missed
 */
const HYPHENATED_NAME_PATTERNS = [
    // Standard hyphenated: Smith-Jones, Garcia-Lopez
    /\b([A-Z][a-z]+(?:-[A-Z][a-z]+)+)\b/g,
    // Hyphenated with apostrophe: O'Brien-Smith
    /\b([A-Z]'[A-Z][a-z]+-[A-Z][a-z]+)\b/g,
    // Compound surnames with particles: van der Berg-Smith
    /\b((?:van|von|de|du|la|le)\s+[A-Z][a-z]+-[A-Z][a-z]+)\b/gi,
];
/**
 * Name with generational/credential suffix patterns
 */
const SUFFIX_NAME_PATTERNS = [
    // Generational: III, IV, V
    /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(III|IV|V|2nd|3rd|4th)\b/g,
    // Junior/Senior with various formats
    /\b([A-Z][a-z]+\s+[A-Z][a-z]+),?\s+(Jr\.?|Sr\.?|Junior|Senior)\b/gi,
];
class ContextAwareNameFilter extends SpanBasedFilter_1.SpanBasedFilter {
    getType() {
        return "NAME";
    }
    getPriority() {
        // Run after main name filters to catch what they miss
        return SpanBasedFilter_1.FilterPriority.NAME + 10;
    }
    detect(text, _config, _context) {
        const spans = [];
        // Pattern 1: Diverse first names (context-required)
        this.detectDiverseFirstNames(text, spans);
        // Pattern 2: Hyphenated surnames (moderate context sensitivity)
        this.detectHyphenatedNames(text, spans);
        // Pattern 3: Names with suffixes (less context-dependent)
        this.detectNamesWithSuffixes(text, spans);
        // Pattern 4: Single capitalized words after strong patient labels
        this.detectLabeledSingleNames(text, spans);
        return spans;
    }
    /**
     * Detect diverse first names that may not be in dictionaries
     * REQUIRES clinical context to avoid false positives
     */
    detectDiverseFirstNames(text, spans) {
        for (const pattern of DIVERSE_FIRST_NAME_PATTERNS) {
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const name = match[1] || match[0];
                const start = match.index;
                const end = start + match[0].length;
                // Skip if already in dictionary (handled by main filter)
                if (NameDictionary_1.NameDictionary.isFirstName(name.split(/\s+/)[0])) {
                    continue;
                }
                // Skip medical terms and non-PHI
                if ((0, UnifiedMedicalWhitelist_1.isMedicalTerm)(name) || (0, UnifiedMedicalWhitelist_1.isNonPHI)(name)) {
                    continue;
                }
                // CRITICAL: Require clinical context for diverse names
                const contextResult = ClinicalContextDetector_1.ClinicalContextDetector.analyzeContext(text, start, name.length);
                if (contextResult.strength === "NONE" ||
                    contextResult.strength === "WEAK") {
                    continue; // No context = no detection (increases specificity)
                }
                // Calculate confidence based on context
                const baseConfidence = 0.75;
                const contextBoost = ClinicalContextDetector_1.ClinicalContextDetector.getContextConfidenceBoost(text, start, name.length);
                const confidence = Math.min(0.95, baseConfidence + contextBoost);
                const span = SpanFactory_1.SpanFactory.fromPosition(text, start, end, Span_1.FilterType.NAME, {
                    confidence,
                    priority: this.getPriority(),
                    pattern: `Diverse name (${contextResult.strength} context)`,
                });
                spans.push(span);
            }
        }
    }
    /**
     * Detect hyphenated surnames
     * Moderate context sensitivity (hyphenation is a strong name signal)
     */
    detectHyphenatedNames(text, spans) {
        for (const pattern of HYPHENATED_NAME_PATTERNS) {
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const name = match[1] || match[0];
                const start = match.index;
                const end = start + match[0].length;
                // Skip medical terms
                if ((0, UnifiedMedicalWhitelist_1.isMedicalTerm)(name) || (0, UnifiedMedicalWhitelist_1.isNonPHI)(name)) {
                    continue;
                }
                // Hyphenated names are strong signals, but still check for context
                const contextResult = ClinicalContextDetector_1.ClinicalContextDetector.analyzeContext(text, start, name.length);
                // Accept with weak context for hyphenated (strong structural signal)
                if (contextResult.strength === "NONE") {
                    // Check if preceded by name-indicating patterns
                    const before = text.substring(Math.max(0, start - 50), start);
                    if (!/\b(?:patient|pt|name|mr|mrs|ms|miss|dr)\b/i.test(before)) {
                        continue;
                    }
                }
                const baseConfidence = 0.85;
                const contextBoost = ClinicalContextDetector_1.ClinicalContextDetector.getContextConfidenceBoost(text, start, name.length);
                const confidence = Math.min(0.95, baseConfidence + contextBoost);
                const span = SpanFactory_1.SpanFactory.fromPosition(text, start, end, Span_1.FilterType.NAME, {
                    confidence,
                    priority: this.getPriority(),
                    pattern: "Hyphenated name",
                });
                spans.push(span);
            }
        }
    }
    /**
     * Detect names with generational suffixes (Jr., III, etc.)
     * These are strong name signals
     */
    detectNamesWithSuffixes(text, spans) {
        for (const pattern of SUFFIX_NAME_PATTERNS) {
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const name = match[1]; // Name portion without suffix
                const start = match.index;
                // Skip if medical term
                if ((0, UnifiedMedicalWhitelist_1.isMedicalTerm)(name) || (0, UnifiedMedicalWhitelist_1.isNonPHI)(name)) {
                    continue;
                }
                // Suffix is strong signal, minimal context needed
                const confidence = 0.9;
                const span = SpanFactory_1.SpanFactory.fromPosition(text, start, start + name.length, Span_1.FilterType.NAME, {
                    confidence,
                    priority: this.getPriority(),
                    pattern: "Name with suffix",
                });
                spans.push(span);
            }
        }
    }
    /**
     * Detect single names after strong patient labels
     * Catches: "Patient: Jordan", "Client: Casey"
     */
    detectLabeledSingleNames(text, spans) {
        // Strong labels that definitively indicate a name follows
        const labelPattern = /\b(?:Patient|Pt|Client|Subject|Resident|Member)\s*(?:Name)?[:\s]+([A-Z][a-z]+)\b/gi;
        labelPattern.lastIndex = 0;
        let match;
        while ((match = labelPattern.exec(text)) !== null) {
            const name = match[1];
            const fullMatch = match[0];
            const start = match.index + fullMatch.indexOf(name);
            const end = start + name.length;
            // Skip medical terms
            if ((0, UnifiedMedicalWhitelist_1.isMedicalTerm)(name) || (0, UnifiedMedicalWhitelist_1.isNonPHI)(name)) {
                continue;
            }
            // Skip common non-name words that might follow labels
            const nonNames = new Set([
                "was",
                "is",
                "has",
                "had",
                "will",
                "should",
                "may",
                "can",
                "could",
                "would",
                "presented",
                "presents",
                "reports",
                "states",
                "denies",
                "notes",
                "information",
                "data",
                "record",
                "chart",
            ]);
            if (nonNames.has(name.toLowerCase())) {
                continue;
            }
            // Label provides strong context
            const confidence = 0.88;
            const span = SpanFactory_1.SpanFactory.fromPosition(text, start, end, Span_1.FilterType.NAME, {
                confidence,
                priority: this.getPriority(),
                pattern: "Labeled single name",
            });
            spans.push(span);
        }
    }
}
exports.ContextAwareNameFilter = ContextAwareNameFilter;
//# sourceMappingURL=ContextAwareNameFilter.js.map