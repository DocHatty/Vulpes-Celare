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
import {
  PROVIDER_TITLE_PREFIXES,
  PROVIDER_CREDENTIALS,
  FAMILY_RELATIONSHIP_KEYWORDS,
} from "../../utils/NameDetectionUtils";

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
export enum NamePatternCategory {
  LABELED_FIELD = "LABELED_FIELD",
  LAST_FIRST = "LAST_FIRST",
  FIRST_LAST = "FIRST_LAST",
  TITLED = "TITLED",
  FAMILY = "FAMILY",
  POSSESSIVE = "POSSESSIVE",
  AGE_GENDER = "AGE_GENDER",
  INITIAL_LAST = "INITIAL_LAST",
  OCR_TOLERANT = "OCR_TOLERANT",
  PROVIDER_ROLE = "PROVIDER_ROLE",
}

// ============================================================================
// LABELED FIELD PATTERNS
// ============================================================================

/**
 * Patterns for explicit name field labels (Name:, Patient:, etc.)
 * These are HIGH CONFIDENCE contexts
 */
export const LABELED_FIELD_PATTERNS: NamePatternDef[] = [
  {
    id: "labeled_name_field",
    regex:
      /\b(?:name|patient\s+name|member\s+name|legal\s+name(?:\s*\([^)]*\))?|patient)\s*:\s*([^\r\n]{2,120})/gim,
    confidence: 0.98,
    priority: 180,
    description: "Labeled name field (Name:, Patient:, etc.)",
    nameGroup: 1,
    filterType: FilterType.NAME,
    category: NamePatternCategory.LABELED_FIELD,
  },
];

// ============================================================================
// LAST, FIRST FORMAT PATTERNS
// ============================================================================

/**
 * Patterns for "Last, First" format names
 */
export const LAST_FIRST_PATTERNS: NamePatternDef[] = [
  {
    id: "last_first_mixed_case",
    regex:
      /\b([A-Z][a-z]{2,}(?:-[A-Z][a-z]{2,})?,[ \t]*[A-Z][a-z]{2,}(?:[ \t]+[A-Z][a-z]{2,})?)\b/g,
    confidence: 0.93,
    priority: 150,
    description: "Last, First mixed case (Smith, John)",
    nameGroup: 1,
    filterType: FilterType.NAME,
    category: NamePatternCategory.LAST_FIRST,
  },
  {
    id: "last_first_all_caps",
    regex: /\b([A-Z]{2,},[ \t]+[A-Z]{2,}(?:[ \t]+[A-Z]{2,})?)\b/g,
    confidence: 0.91,
    priority: 150,
    description: "Last, First ALL CAPS (SMITH, JOHN)",
    nameGroup: 1,
    filterType: FilterType.NAME,
    category: NamePatternCategory.LAST_FIRST,
  },
  {
    id: "last_first_space_before_comma",
    regex:
      /\b([A-Z][a-z]{2,})\s*,\s*([A-Z][a-z]{2,}(?:[ \t]+[A-Z][a-z]{2,})?)\b/g,
    confidence: 0.9,
    priority: 150,
    description: "Last, First with space before comma (OCR variant)",
    nameGroup: 0,
    filterType: FilterType.NAME,
    category: NamePatternCategory.LAST_FIRST,
  },
];

// ============================================================================
// FIRST LAST FORMAT PATTERNS
// ============================================================================

/**
 * Patterns for "First Last" format names
 */
export const FIRST_LAST_PATTERNS: NamePatternDef[] = [
  {
    id: "first_last_standard",
    regex:
      /\b([A-Z][a-z]{2,}[ \t]+[A-Z][a-z]{2,}(?:[ \t]+(?:Jr\.?|Sr\.?|II|III|IV))?)\b/g,
    confidence: 0.8,
    priority: 100,
    description: "First Last standard format",
    nameGroup: 1,
    filterType: FilterType.NAME,
    category: NamePatternCategory.FIRST_LAST,
  },
  {
    id: "first_middle_last",
    regex:
      /\b([A-Z][a-z]{2,}[ \t]+[A-Z]\.?[ \t]+[A-Z][a-z]{2,})\b/g,
    confidence: 0.85,
    priority: 110,
    description: "First Middle Last with initial",
    nameGroup: 1,
    filterType: FilterType.NAME,
    category: NamePatternCategory.FIRST_LAST,
  },
];

// ============================================================================
// TITLED NAME PATTERNS
// ============================================================================

const TITLE_PREFIX_ALTERNATION = Array.from(PROVIDER_TITLE_PREFIXES)
  .map((t) => t.replace(".", "\\."))
  .join("|");

/**
 * Patterns for titled names (Dr. Smith, Mr. Jones)
 * These are typically PROVIDER names
 */
export const TITLED_NAME_PATTERNS: NamePatternDef[] = [
  {
    id: "titled_name_standard",
    regex: new RegExp(
      `\\b(?:${TITLE_PREFIX_ALTERNATION})\\.?[ \\t]+[A-Z][a-z]+(?:[ \\t]+[A-Z][a-z]+)*\\b`,
      "gi"
    ),
    confidence: 0.92,
    priority: 150,
    description: "Titled name (Dr. Smith, Prof. Jones)",
    nameGroup: 0,
    filterType: FilterType.PROVIDER_NAME,
    category: NamePatternCategory.TITLED,
  },
];

// ============================================================================
// FAMILY RELATIONSHIP PATTERNS
// ============================================================================

const FAMILY_KEYWORDS_ALTERNATION = FAMILY_RELATIONSHIP_KEYWORDS.map(
  (k) => k.replace(/\s+/g, "[ \\t]+")
).join("|");

/**
 * Patterns for family member names
 */
export const FAMILY_RELATIONSHIP_PATTERNS: NamePatternDef[] = [
  {
    id: "family_member_name",
    regex: new RegExp(
      `\\b(?:${FAMILY_KEYWORDS_ALTERNATION})[ \\t:]+([A-Z][a-z]+(?:[ \\t]+[A-Z][a-z]+(?:[ \\t]+(?:Jr\\.?|Sr\\.?|II|III|IV))?)?)\\\b`,
      "gi"
    ),
    confidence: 0.9,
    priority: 150,
    description: "Family member name (Spouse: John Smith)",
    nameGroup: 1,
    filterType: FilterType.NAME,
    category: NamePatternCategory.FAMILY,
  },
  {
    id: "maiden_name",
    regex: /\b(?:nee|née|n\.e\.e\.|born)[ \t]+([A-Z][a-z]{2,})\b/gi,
    confidence: 0.92,
    priority: 140,
    description: "Maiden name (née Smith)",
    nameGroup: 1,
    filterType: FilterType.NAME,
    category: NamePatternCategory.FAMILY,
  },
  {
    id: "aka_nickname",
    regex:
      /\b(?:Also[ \t]+known[ \t]+as|AKA|a\.k\.a\.|Nickname|Known[ \t]+as|Goes[ \t]+By|Preferred[ \t]+Name)[ \t:]+([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+)?)\b/gi,
    confidence: 0.88,
    priority: 130,
    description: "Nickname/AKA name",
    nameGroup: 1,
    filterType: FilterType.NAME,
    category: NamePatternCategory.FAMILY,
  },
];

// ============================================================================
// POSSESSIVE NAME PATTERNS
// ============================================================================

/**
 * Patterns for possessive names (John Smith's)
 */
export const POSSESSIVE_PATTERNS: NamePatternDef[] = [
  {
    id: "possessive_name",
    regex: /\b([A-Z][a-z]+[ \t]+[A-Z][a-z]+)'s\b/g,
    confidence: 0.87,
    priority: 100,
    description: "Possessive name form",
    nameGroup: 1,
    filterType: FilterType.NAME,
    category: NamePatternCategory.POSSESSIVE,
  },
];

// ============================================================================
// AGE/GENDER CONTEXT PATTERNS
// ============================================================================

/**
 * Patterns for names with age/gender descriptors
 */
export const AGE_GENDER_PATTERNS: NamePatternDef[] = [
  {
    id: "age_gender_name",
    regex:
      /\b\d+[ \t]+year[ \t]+old[ \t]+(?:woman|man|male|female|patient|person|individual)[ \t]+([A-Z][a-zA-Z]+(?:[ \t]+[A-Z][a-zA-Z]+){1,2})\b/gi,
    confidence: 0.91,
    priority: 140,
    description: "Name with age/gender descriptor",
    nameGroup: 1,
    filterType: FilterType.NAME,
    category: NamePatternCategory.AGE_GENDER,
  },
];

// ============================================================================
// INITIAL + LAST NAME PATTERNS
// ============================================================================

/**
 * Patterns for Initial + Last Name (J. Smith)
 */
export const INITIAL_LAST_PATTERNS: NamePatternDef[] = [
  {
    id: "initial_last_name",
    regex: /\b([A-Z]\.[ \t]+[A-Z][a-z]{2,})\b/g,
    confidence: 0.85,
    priority: 110,
    description: "Initial + Last Name (J. Smith)",
    nameGroup: 1,
    filterType: FilterType.NAME,
    category: NamePatternCategory.INITIAL_LAST,
  },
];

// ============================================================================
// PROVIDER ROLE PATTERNS
// ============================================================================

const CREDENTIAL_ALTERNATION = Array.from(PROVIDER_CREDENTIALS).join("|");

/**
 * Patterns for provider role labels
 */
export const PROVIDER_ROLE_PATTERNS: NamePatternDef[] = [
  {
    id: "provider_role_name",
    regex: new RegExp(
      `\\b(?:Referring|Consulting|Ordering|Sonographer|Interpreting|Radiologist|Pathologist|Surgeon|Anesthesiologist|Attending|Resident|Nurse|Therapist|Technician|Technologist|Endoscopist|Assistant|Cardiologist|Neurologist|Oncologist|Provider|Physician|Psychiatrist|Psychologist|Dentist|Hygienist|Charge Nurse|Primary Nurse|Supervising|Laboratory Director)(?:[ \\t]+(?:Physician|Provider|Doctor|Nurse|Specialist))?[ \\t]*:[ \\t]*(?:Dr\\.?[ \\t]+)?([A-Z][a-z]+(?:[, \\t]+[A-Z][a-z]+)*(?:[, \\t]+(?:${CREDENTIAL_ALTERNATION}))?)`,
      "gi"
    ),
    confidence: 0.92,
    priority: 150,
    description: "Provider role name (Attending: Dr. Smith)",
    nameGroup: 1,
    filterType: FilterType.PROVIDER_NAME,
    category: NamePatternCategory.PROVIDER_ROLE,
  },
];

// ============================================================================
// PATTERN LIBRARY API
// ============================================================================

/**
 * Get all patterns for a specific category
 */
export function getPatternsByCategory(
  category: NamePatternCategory
): NamePatternDef[] {
  const allPatterns = [
    ...LABELED_FIELD_PATTERNS,
    ...LAST_FIRST_PATTERNS,
    ...FIRST_LAST_PATTERNS,
    ...TITLED_NAME_PATTERNS,
    ...FAMILY_RELATIONSHIP_PATTERNS,
    ...POSSESSIVE_PATTERNS,
    ...AGE_GENDER_PATTERNS,
    ...INITIAL_LAST_PATTERNS,
    ...PROVIDER_ROLE_PATTERNS,
  ];

  return allPatterns.filter((p) => p.category === category);
}

/**
 * Get all patterns
 */
export function getAllPatterns(): NamePatternDef[] {
  return [
    ...LABELED_FIELD_PATTERNS,
    ...LAST_FIRST_PATTERNS,
    ...FIRST_LAST_PATTERNS,
    ...TITLED_NAME_PATTERNS,
    ...FAMILY_RELATIONSHIP_PATTERNS,
    ...POSSESSIVE_PATTERNS,
    ...AGE_GENDER_PATTERNS,
    ...INITIAL_LAST_PATTERNS,
    ...PROVIDER_ROLE_PATTERNS,
  ];
}

/**
 * Get pattern by ID
 */
export function getPatternById(id: string): NamePatternDef | undefined {
  return getAllPatterns().find((p) => p.id === id);
}

/**
 * Reset all regex lastIndex values (for re-execution)
 */
export function resetPatterns(patterns: NamePatternDef[]): void {
  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;
  }
}
