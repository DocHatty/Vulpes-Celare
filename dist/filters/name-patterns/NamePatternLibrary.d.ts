/**
 * NamePatternLibrary - Centralized Name Detection Pattern Definitions
 *
 * This library consolidates all name detection patterns used across the 4 name filters:
 * - FormattedNameFilterSpan
 * - SmartNameFilterSpan
 * - TitledNameFilterSpan
 * - FamilyNameFilterSpan
 *
 * BENEFITS:
 * - Single source of truth for pattern definitions
 * - Eliminates pattern duplication across filters
 * - Easier maintenance and tuning
 * - Consistent confidence/priority values
 *
 * @module filters/name-patterns
 */
import { FilterType } from "../../models/Span";
/**
 * Pattern definition with metadata
 */
export interface NamePatternDef {
    /** Unique identifier for this pattern */
    id: string;
    /** Compiled regex pattern */
    regex: RegExp;
    /** Base confidence score (0.0 - 1.0) */
    confidence: number;
    /** Base priority value */
    priority: number;
    /** Human-readable description */
    description: string;
    /** Which capture group contains the name (0 = full match) */
    nameGroup: number;
    /** Filter type for the resulting span */
    filterType: FilterType;
    /** Category for deduplication */
    category: NamePatternCategory;
}
/**
 * Pattern categories for deduplication
 * Patterns in the same category won't be run multiple times
 */
export declare enum NamePatternCategory {
    LABELED_FIELD = "LABELED_FIELD",
    LAST_FIRST = "LAST_FIRST",
    FIRST_LAST = "FIRST_LAST",
    TITLED = "TITLED",
    FAMILY = "FAMILY",
    POSSESSIVE = "POSSESSIVE",
    AGE_GENDER = "AGE_GENDER",
    INITIAL_LAST = "INITIAL_LAST",
    OCR_TOLERANT = "OCR_TOLERANT",
    PROVIDER_ROLE = "PROVIDER_ROLE"
}
/**
 * Patterns for explicit name field labels (Name:, Patient:, etc.)
 * These are HIGH CONFIDENCE contexts
 */
export declare const LABELED_FIELD_PATTERNS: NamePatternDef[];
/**
 * Patterns for "Last, First" format names
 */
export declare const LAST_FIRST_PATTERNS: NamePatternDef[];
/**
 * Patterns for "First Last" format names
 */
export declare const FIRST_LAST_PATTERNS: NamePatternDef[];
/**
 * Patterns for titled names (Dr. Smith, Mr. Jones)
 * These are typically PROVIDER names
 */
export declare const TITLED_NAME_PATTERNS: NamePatternDef[];
/**
 * Patterns for family member names
 */
export declare const FAMILY_RELATIONSHIP_PATTERNS: NamePatternDef[];
/**
 * Patterns for possessive names (John Smith's)
 */
export declare const POSSESSIVE_PATTERNS: NamePatternDef[];
/**
 * Patterns for names with age/gender descriptors
 */
export declare const AGE_GENDER_PATTERNS: NamePatternDef[];
/**
 * Patterns for Initial + Last Name (J. Smith)
 */
export declare const INITIAL_LAST_PATTERNS: NamePatternDef[];
/**
 * Patterns for provider role labels
 */
export declare const PROVIDER_ROLE_PATTERNS: NamePatternDef[];
/**
 * Get all patterns for a specific category
 */
export declare function getPatternsByCategory(category: NamePatternCategory): NamePatternDef[];
/**
 * Get all patterns
 */
export declare function getAllPatterns(): NamePatternDef[];
/**
 * Get pattern by ID
 */
export declare function getPatternById(id: string): NamePatternDef | undefined;
/**
 * Reset all regex lastIndex values (for re-execution)
 */
export declare function resetPatterns(patterns: NamePatternDef[]): void;
//# sourceMappingURL=NamePatternLibrary.d.ts.map