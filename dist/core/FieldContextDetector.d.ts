/**
 * Field Context Detector - Pre-Pass Document Analysis
 *
 * Parses document structure to identify field-label/value relationships
 * BEFORE filters run. This enables context-aware redaction:
 *
 * - "PATIENT: JOHN SMITH" → NAME expected after PATIENT label
 * - "FILE #: 12345" → MRN expected after FILE # label
 * - "DOB: 5/5/1955" → DATE expected after DOB label
 *
 * Handles multi-line field/value patterns common in medical forms.
 *
 * @module redaction/core
 */
/**
 * Detected field context with expected type
 */
export interface FieldContext {
    label: string;
    labelStart: number;
    labelEnd: number;
    expectedType: string;
    valueStart: number;
    valueEnd: number;
    value?: string;
    confidence: number;
    isMultiLine: boolean;
}
export declare class FieldContextDetector {
    /**
     * Field label patterns mapped to expected value types
     */
    private static readonly FIELD_DEFINITIONS;
    /**
     * Detect all field contexts in text
     *
     * @param text - Full document text
     * @returns Array of detected field contexts
     */
    static detect(text: string): FieldContext[];
    /**
     * Find the value region after a field label
     * Handles both same-line and multi-line values
     */
    private static findValueRegion;
    /**
     * Check if text starts with a field label pattern
     */
    private static isFieldLabel;
    /**
     * Get expected type for a position in text
     * Returns the expected PHI type if position falls within a field's value region
     */
    static getExpectedTypeAtPosition(contexts: FieldContext[], position: number): string | null;
    /**
     * Check if a span's position matches an expected field type
     * Used for boosting confidence when span type matches expected type
     */
    static matchesExpectedType(contexts: FieldContext[], spanStart: number, spanEnd: number, spanType: string): {
        matches: boolean;
        confidence: number;
    };
    /**
     * Create a context map for quick position lookups
     */
    static createContextMap(text: string): Map<number, {
        expectedType: string;
        confidence: number;
    }>;
    /**
     * Detect FILE # values in columnar layouts
     * Handles the pattern where FILE #: is on one line and the value is below
     */
    static detectMultiLineFileNumbers(text: string): Array<{
        value: string;
        start: number;
        end: number;
        confidence: number;
    }>;
    /**
     * Detect ALL CAPS names that appear after patient-like labels
     * Handles multiple patterns:
     *   1. PATIENT: JOHN SMITH (same line)
     *   2. PATIENT:\n JOHN SMITH (next line)
     *   3. Columnar layout where PATIENT: is followed by other labels, then values
     */
    static detectMultiLinePatientNames(text: string): Array<{
        name: string;
        start: number;
        end: number;
        confidence: number;
    }>;
}
//# sourceMappingURL=FieldContextDetector.d.ts.map