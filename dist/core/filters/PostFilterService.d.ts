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
import { type AdaptiveContext } from "../../calibration/AdaptiveThresholdService";
export type PostFilterShadowReport = {
    enabled: boolean;
    rustAvailable: boolean;
    rustEnabled: boolean;
    inputSpans: number;
    tsKept: number;
    rustKept: number;
    missingInRust: number;
    extraInRust: number;
};
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
    shouldKeep(span: Span, _text: string): boolean;
}
/**
 * Filter for ALL CAPS section headings
 * Uses externalized config from config/post-filter/
 */
declare class SectionHeadingFilter implements IPostFilterStrategy {
    readonly name = "SectionHeading";
    shouldKeep(span: Span, _text: string): boolean;
}
/**
 * Filter for document structure words
 * Uses externalized config from config/post-filter/
 */
declare class StructureWordFilter implements IPostFilterStrategy {
    readonly name = "StructureWord";
    shouldKeep(span: Span, _text: string): boolean;
}
/**
 * Filter for short names (less than 5 chars without comma)
 */
declare class ShortNameFilter implements IPostFilterStrategy {
    readonly name = "ShortName";
    shouldKeep(span: Span, _text: string): boolean;
}
/**
 * Filter for invalid prefix words
 */
declare class InvalidPrefixFilter implements IPostFilterStrategy {
    readonly name = "InvalidPrefix";
    private static readonly INVALID_STARTS;
    shouldKeep(span: Span, _text: string): boolean;
}
/**
 * Filter for invalid suffix words
 */
declare class InvalidSuffixFilter implements IPostFilterStrategy {
    readonly name = "InvalidSuffix";
    private static readonly INVALID_ENDINGS;
    shouldKeep(span: Span, _text: string): boolean;
}
/**
 * Filter for common medical/clinical phrases
 * Uses externalized config from config/post-filter/
 */
declare class MedicalPhraseFilter implements IPostFilterStrategy {
    readonly name = "MedicalPhrase";
    shouldKeep(span: Span, _text: string): boolean;
}
/**
 * Filter for medical condition suffixes
 */
declare class MedicalSuffixFilter implements IPostFilterStrategy {
    readonly name = "MedicalSuffix";
    private static readonly MEDICAL_SUFFIXES;
    shouldKeep(span: Span, _text: string): boolean;
}
/**
 * Filter for geographic terms that aren't names
 * Uses externalized config from config/post-filter/
 */
declare class GeographicTermFilter implements IPostFilterStrategy {
    readonly name = "GeographicTerm";
    shouldKeep(span: Span, _text: string): boolean;
}
/**
 * Filter for common field labels
 * Uses externalized config from config/post-filter/
 */
declare class FieldLabelFilter implements IPostFilterStrategy {
    readonly name = "FieldLabel";
    shouldKeep(span: Span, _text: string): boolean;
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
     * Set document context for adaptive threshold calculation
     * Call before filtering spans from a document
     */
    static setAdaptiveContext(context: AdaptiveContext): void;
    /**
     * Clear adaptive context after processing
     */
    static clearAdaptiveContext(): void;
    private static filterTs;
    /**
     * Apply all post-filter strategies to remove false positives
     *
     * @param spans - Detected spans to filter
     * @param text - Full document text for context
     * @returns Filtered spans with false positives removed
     */
    static filter(spans: Span[], text: string, options?: {
        shadowReport?: PostFilterShadowReport;
    }): Span[];
    /**
     * Get list of active strategy names
     */
    static getStrategyNames(): string[];
    /**
     * Apply post-filter with ML-based false positive detection (async version)
     *
     * This method runs:
     * 1. All rule-based strategies (sync)
     * 2. ML false positive classifier (async, if enabled)
     *
     * @param spans - Detected spans to filter
     * @param text - Full document text for context
     * @returns Filtered spans with false positives removed
     */
    static filterAsync(spans: Span[], text: string, options?: {
        shadowReport?: PostFilterShadowReport;
    }): Promise<Span[]>;
}
export { DevicePhoneFalsePositiveFilter, SectionHeadingFilter, StructureWordFilter, ShortNameFilter, InvalidPrefixFilter, InvalidSuffixFilter, MedicalPhraseFilter, MedicalSuffixFilter, GeographicTermFilter, FieldLabelFilter, };
//# sourceMappingURL=PostFilterService.d.ts.map