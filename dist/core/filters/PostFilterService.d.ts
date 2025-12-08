/**
 * PostFilterService - Post-Detection Filtering for False Positive Removal
 *
 * This module handles filtering of detected spans after initial detection
 * but before tokenization. It removes false positives using multiple
 * filtering strategies.
 *
 * Extracted from ParallelRedactionEngine for better maintainability.
 *
 * @module core/filters
 */
import { Span } from "../../models/Span";
/**
 * Interface for filter strategies
 */
export interface IPostFilterStrategy {
    /** Name of the filter for logging */
    readonly name: string;
    /**
     * Determine if span should be filtered out (return false to remove)
     * @param span - The span to check
     * @param text - Full document text for context
     * @returns true to keep span, false to remove
     */
    shouldKeep(span: Span, text: string): boolean;
}
/**
 * Filter for device/phone false positives like "Call Button: 555"
 */
declare class DevicePhoneFalsePositiveFilter implements IPostFilterStrategy {
    readonly name = "DevicePhoneFalsePositive";
    shouldKeep(span: Span, text: string): boolean;
}
/**
 * Filter for ALL CAPS section headings
 */
declare class SectionHeadingFilter implements IPostFilterStrategy {
    readonly name = "SectionHeading";
    private static readonly SECTION_HEADINGS;
    private static readonly SINGLE_WORD_HEADINGS;
    shouldKeep(span: Span, text: string): boolean;
}
/**
 * Filter for document structure words
 */
declare class StructureWordFilter implements IPostFilterStrategy {
    readonly name = "StructureWord";
    private static readonly STRUCTURE_WORDS;
    shouldKeep(span: Span, text: string): boolean;
}
/**
 * Filter for short names (less than 5 chars without comma)
 */
declare class ShortNameFilter implements IPostFilterStrategy {
    readonly name = "ShortName";
    shouldKeep(span: Span, text: string): boolean;
}
/**
 * Filter for invalid prefix words
 */
declare class InvalidPrefixFilter implements IPostFilterStrategy {
    readonly name = "InvalidPrefix";
    private static readonly INVALID_STARTS;
    shouldKeep(span: Span, text: string): boolean;
}
/**
 * Filter for invalid suffix words
 */
declare class InvalidSuffixFilter implements IPostFilterStrategy {
    readonly name = "InvalidSuffix";
    private static readonly INVALID_ENDINGS;
    shouldKeep(span: Span, text: string): boolean;
}
/**
 * Filter for common medical/clinical phrases
 */
declare class MedicalPhraseFilter implements IPostFilterStrategy {
    readonly name = "MedicalPhrase";
    private static readonly MEDICAL_PHRASES;
    shouldKeep(span: Span, text: string): boolean;
}
/**
 * Filter for medical condition suffixes
 */
declare class MedicalSuffixFilter implements IPostFilterStrategy {
    readonly name = "MedicalSuffix";
    private static readonly MEDICAL_SUFFIXES;
    shouldKeep(span: Span, text: string): boolean;
}
/**
 * Filter for geographic terms that aren't names
 */
declare class GeographicTermFilter implements IPostFilterStrategy {
    readonly name = "GeographicTerm";
    private static readonly GEO_TERMS;
    shouldKeep(span: Span, text: string): boolean;
}
/**
 * Filter for common field labels
 */
declare class FieldLabelFilter implements IPostFilterStrategy {
    readonly name = "FieldLabel";
    private static readonly FIELD_LABELS;
    shouldKeep(span: Span, text: string): boolean;
}
/**
 * PostFilterService - Orchestrates all post-detection filtering strategies
 *
 * This service applies multiple filtering strategies to remove false positives
 * from detected spans before they are tokenized.
 */
export declare class PostFilterService {
    private static readonly strategies;
    /**
     * Apply all post-filter strategies to remove false positives
     *
     * @param spans - Detected spans to filter
     * @param text - Full document text for context
     * @returns Filtered spans with false positives removed
     */
    static filter(spans: Span[], text: string): Span[];
    /**
     * Get list of active strategy names
     */
    static getStrategyNames(): string[];
}
export { DevicePhoneFalsePositiveFilter, SectionHeadingFilter, StructureWordFilter, ShortNameFilter, InvalidPrefixFilter, InvalidSuffixFilter, MedicalPhraseFilter, MedicalSuffixFilter, GeographicTermFilter, FieldLabelFilter, };
//# sourceMappingURL=PostFilterService.d.ts.map