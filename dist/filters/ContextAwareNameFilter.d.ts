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
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class ContextAwareNameFilter extends SpanBasedFilter {
    getType(): string;
    getPriority(): number;
    detect(text: string, config: any, context: RedactionContext): Span[];
    /**
     * Detect diverse first names that may not be in dictionaries
     * REQUIRES clinical context to avoid false positives
     */
    private detectDiverseFirstNames;
    /**
     * Detect hyphenated surnames
     * Moderate context sensitivity (hyphenation is a strong name signal)
     */
    private detectHyphenatedNames;
    /**
     * Detect names with generational suffixes (Jr., III, etc.)
     * These are strong name signals
     */
    private detectNamesWithSuffixes;
    /**
     * Detect single names after strong patient labels
     * Catches: "Patient: Jordan", "Client: Casey"
     */
    private detectLabeledSingleNames;
}
//# sourceMappingURL=ContextAwareNameFilter.d.ts.map