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
export interface ContextWindow {
    text: string;
    start: number;
    end: number;
    indicators: ContextIndicator[];
    strength: ContextStrength;
}
export interface ContextIndicator {
    type: ContextType;
    text: string;
    position: number;
    weight: number;
}
export type ContextType = "PATIENT_LABEL" | "CLINICAL_SETTING" | "MEDICAL_ACTION" | "TEMPORAL_CLINICAL" | "RELATIONSHIP" | "DEMOGRAPHIC" | "LOCATION_CLINICAL" | "DOCUMENT_STRUCTURE";
export type ContextStrength = "STRONG" | "MODERATE" | "WEAK" | "NONE";
/**
 * ClinicalContextDetector analyzes text to determine if clinical context
 * is present, enabling context-aware PHI detection.
 */
export declare class ClinicalContextDetector {
    private static readonly CONTEXT_WINDOW_SIZE;
    /**
     * Analyze the context around a position in the text
     * Returns context strength and indicators found
     */
    static analyzeContext(text: string, position: number, length?: number): ContextWindow;
    /**
     * Quick check: Is this position in clinical context?
     * Returns true if context strength is MODERATE or STRONG
     */
    static isInClinicalContext(text: string, position: number, length?: number): boolean;
    /**
     * Get a confidence boost based on clinical context
     * Use this to adjust detection confidence when context is present
     *
     * @returns Value between 0.0 and 0.15 to add to base confidence
     */
    static getContextConfidenceBoost(text: string, position: number, length?: number): number;
    /**
     * Calculate aggregate strength from multiple indicators
     */
    private static calculateStrength;
    /**
     * Find all clinical context windows in a document
     * Useful for batch processing or pre-analysis
     */
    static findAllContextWindows(text: string): ContextWindow[];
}
/**
 * Relative temporal expressions that are PHI in clinical context
 * These should ONLY be detected when clinical context is present
 */
export declare const RELATIVE_DATE_PATTERNS: {
    pattern: RegExp;
    baseConfidence: number;
    requiresContext: boolean;
}[];
/**
 * Export singleton for convenience
 */
export declare const contextDetector: typeof ClinicalContextDetector;
//# sourceMappingURL=ClinicalContextDetector.d.ts.map