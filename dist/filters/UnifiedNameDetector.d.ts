/**
 * UnifiedNameDetector - Centralized Name Detection Patterns
 *
 * This module consolidates the DUPLICATE patterns that were spread across:
 * - SmartNameFilterSpan
 * - FormattedNameFilterSpan
 * - TitledNameFilterSpan
 * - FamilyNameFilterSpan
 *
 * Each filter should use these shared patterns instead of implementing their own.
 * This eliminates ~2000 lines of duplicate code while preserving functionality.
 *
 * PATTERN OWNERSHIP (after consolidation):
 * - UnifiedNameDetector: All shared patterns (patient, ALL CAPS, suffix, possessive, age/gender)
 * - SmartNameFilterSpan: OCR-specific patterns, chaos detection, special formats
 * - FormattedNameFilterSpan: Labeled fields (Name:), Last/First with priority
 * - TitledNameFilterSpan: Provider names (Dr., Mr.), provider roles
 * - FamilyNameFilterSpan: Relationships, maiden names, nicknames, children
 *
 * @module filters
 */
import { Span, FilterType } from "../models/Span";
/**
 * Name detection result with metadata
 */
export interface NameDetection {
    text: string;
    start: number;
    end: number;
    confidence: number;
    priority: number;
    pattern: string;
    filterType: FilterType;
}
/**
 * Patterns for family relationship prefixes
 * Used by: SmartNameFilter, FormattedNameFilter, TitledNameFilter, FamilyNameFilter
 */
export declare const FAMILY_RELATIONSHIP_PREFIXES: string[];
/**
 * Patterns for patient label prefixes
 * Used by: SmartNameFilter, FormattedNameFilter
 */
export declare const PATIENT_PREFIXES: string[];
/**
 * Name suffix patterns
 * Used by: SmartNameFilter, FormattedNameFilter
 */
export declare const NAME_SUFFIXES: string[];
/**
 * Age/gender descriptor patterns
 */
export declare const AGE_GENDER_PATTERNS: RegExp[];
/**
 * ALL CAPS name pattern (2-3 words, all uppercase)
 */
export declare const ALL_CAPS_NAME_PATTERN: RegExp;
/**
 * Possessive name pattern
 */
export declare const POSSESSIVE_NAME_PATTERN: RegExp;
/**
 * Unified name detector class
 */
export declare class UnifiedNameDetector {
    /**
     * Detect family relationship names
     * CONSOLIDATED: Was duplicated in 4 filters
     *
     * @param text - Text to search
     * @returns Array of name detections
     */
    static detectFamilyRelationshipNames(text: string): NameDetection[];
    /**
     * Detect patient-labeled names
     * CONSOLIDATED: Was duplicated in SmartNameFilter and FormattedNameFilter
     *
     * @param text - Text to search
     * @returns Array of name detections
     */
    static detectPatientNames(text: string): NameDetection[];
    /**
     * Detect ALL CAPS names
     * CONSOLIDATED: Was duplicated in SmartNameFilter and FormattedNameFilter
     *
     * @param text - Text to search
     * @returns Array of name detections
     */
    static detectAllCapsNames(text: string): NameDetection[];
    /**
     * Detect names with suffixes (Jr., Sr., III, etc.)
     * CONSOLIDATED: Was duplicated in SmartNameFilter and FormattedNameFilter
     *
     * @param text - Text to search
     * @returns Array of name detections
     */
    static detectNamesWithSuffix(text: string): NameDetection[];
    /**
     * Detect possessive names (John Smith's)
     * CONSOLIDATED: Was duplicated in SmartNameFilter and FormattedNameFilter
     *
     * @param text - Text to search
     * @returns Array of name detections
     */
    static detectPossessiveNames(text: string): NameDetection[];
    /**
     * Detect names with age/gender descriptors
     * CONSOLIDATED: Was duplicated in SmartNameFilter and FormattedNameFilter
     *
     * @param text - Text to search
     * @returns Array of name detections
     */
    static detectAgeGenderNames(text: string): NameDetection[];
    /**
     * Run all consolidated name detection patterns
     * Returns deduplicated results
     *
     * @param text - Text to search
     * @returns Array of unique name detections
     */
    static detectAll(text: string): NameDetection[];
    /**
     * Convert detections to Spans
     *
     * @param detections - Array of name detections
     * @param text - Original text (for context extraction)
     * @returns Array of Span objects
     */
    static toSpans(detections: NameDetection[], text: string): Span[];
}
/**
 * Convenience function to get all unified name spans
 */
export declare function detectUnifiedNames(text: string): Span[];
//# sourceMappingURL=UnifiedNameDetector.d.ts.map