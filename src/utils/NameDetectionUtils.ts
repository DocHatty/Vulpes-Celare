/**
 * NameDetectionUtils - Centralized Name Detection Utilities
 *
 * Provides shared constants, patterns, and validation methods used across
 * all name detection filters (SmartNameFilterSpan, FormattedNameFilterSpan,
 * TitledNameFilterSpan, FamilyNameFilterSpan).
 *
 * This consolidates ~500+ lines of duplicated code across the name filters.
 *
 * @module redaction/utils
 */

import { NameDictionary } from "../dictionaries/NameDictionary";
import { HospitalDictionary } from "../dictionaries/HospitalDictionary";
import { shouldWhitelist, isMedicalTerm, isNonPHI } from "./UnifiedMedicalWhitelist";

/**
 * Provider and professional title prefixes (Mr., Dr., Prof., etc.)
 * Used across all name filters for titled name detection
 */
export const PROVIDER_TITLE_PREFIXES = new Set([
  // Common honorifics
  "Mr",
  "Mrs",
  "Ms",
  "Miss",
  "Dr",
  "Prof",
  "Rev",
  "Hon",
  "Fr",
  "Sr",
  "Jr",
  // Military ranks
  "Capt",
  "Lt",
  "Sgt",
  "Col",
  "Gen",
  "Maj",
  "Cpl",
  "Pvt",
  "Adm",
  "Cmdr",
  // Nobility/formal
  "Dame",
  "Sir",
  "Lord",
  "Lady",
  "Baron",
  "Count",
  "Duke",
  "Earl",
  "Countess",
  "Duchess",
  // Academic
  "Professor",
  "Doctor",
  // With periods
  "Mr.",
  "Mrs.",
  "Ms.",
  "Dr.",
  "Prof.",
  "Rev.",
  "Hon.",
  "Fr.",
  "Sr.",
  "Jr.",
  "Capt.",
  "Lt.",
  "Sgt.",
  "Col.",
  "Gen.",
]);

/**
 * Professional credentials and suffixes (MD, PhD, RN, etc.)
 */
export const PROVIDER_CREDENTIALS = new Set([
  // Medical doctors
  "MD",
  "M.D.",
  "DO",
  "D.O.",
  "MBBS",
  "MBChB",
  // Doctoral
  "PhD",
  "Ph.D.",
  "EdD",
  "PsyD",
  "DrPH",
  "DBA",
  "JD",
  "J.D.",
  // Nursing
  "RN",
  "R.N.",
  "LPN",
  "L.P.N.",
  "NP",
  "N.P.",
  "APRN",
  "CNS",
  "CNM",
  "CRNA",
  "DNP",
  "BSN",
  "MSN",
  // Physician assistants
  "PA",
  "P.A.",
  "PA-C",
  // Therapy
  "PT",
  "P.T.",
  "DPT",
  "OT",
  "O.T.",
  "OTR",
  "SLP",
  "CCC-SLP",
  // Dental
  "DDS",
  "D.D.S.",
  "DMD",
  "D.M.D.",
  // Pharmacy
  "PharmD",
  "Pharm.D.",
  "RPh",
  // Other medical
  "DC",
  "D.C.",
  "OD",
  "O.D.",
  "DPM",
  "D.P.M.",
  "EMT",
  "Paramedic",
  // Social work/counseling
  "LCSW",
  "MSW",
  "LMFT",
  "LPC",
  "LCPC",
  // Certifications
  "CNA",
  "C.N.A.",
  "MA",
  "CMA",
  "RMA",
  "RHIA",
  "RHIT",
]);

/**
 * Non-person structure terms - phrases that indicate document structure, not names
 */
export const NON_PERSON_STRUCTURE_TERMS = [
  "protected health",
  "social security",
  "medical record",
  "health plan",
  "emergency department",
  "intensive care",
  "emergency contact",
  "next of kin",
  "primary care",
  "critical care",
  "patient care",
  "home health",
  "urgent care",
  "quality assurance",
  "clinical trial",
  "informed consent",
  "advance directive",
  "power of attorney",
  "living will",
  "health maintenance",
  "disease management",
  "case management",
  "care coordination",
  "discharge planning",
  "treatment plan",
  "care plan",
  "service plan",
  "safety plan",
  "nursing assessment",
  "physical assessment",
  "mental status",
  "vital signs",
  "chief complaint",
  "present illness",
  "past history",
  "family history",
  "social history",
  "review of systems",
  "physical exam",
  "diagnostic impression",
  "differential diagnosis",
  "working diagnosis",
  "final diagnosis",
  "discharge diagnosis",
  "admission diagnosis",
  "secondary diagnosis",
  "provisional diagnosis",
  "billing diagnosis",
];

/**
 * Family relationship keywords for name detection
 */
export const FAMILY_RELATIONSHIP_KEYWORDS = [
  "Spouse",
  "Wife",
  "Husband",
  "Father",
  "Mother",
  "Dad",
  "Mom",
  "Son",
  "Daughter",
  "Brother",
  "Sister",
  "Uncle",
  "Aunt",
  "Nephew",
  "Niece",
  "Cousin",
  "Grandfather",
  "Grandmother",
  "Grandpa",
  "Grandma",
  "Grandson",
  "Granddaughter",
  "Parent",
  "Guardian",
  "Caregiver",
  "Partner",
  "Fiancé",
  "Fiancee",
  "Boyfriend",
  "Girlfriend",
  "Significant Other",
  "Next of Kin",
  "Emergency Contact",
];

/**
 * NameDetectionUtils - Static utility class for name detection
 */
export class NameDetectionUtils {
  // =========================================================================
  // PATTERN HELPERS
  // =========================================================================

  /**
   * Get compiled regex for "Last, First" name format
   * Matches: "Smith, John", "O'Brien, Mary Jane"
   */
  static getLastFirstPattern(): RegExp {
    return /\b([A-Z][a-zA-Z'-]+),[ \t]+([A-Z][a-zA-Z'-]+(?:[ \t]+[A-Z][a-zA-Z'-]+)?)\b/g;
  }

  /**
   * Get compiled regex for "Last, First" ALL CAPS format
   * Matches: "SMITH, JOHN", "O'BRIEN, MARY JANE"
   */
  static getLastFirstAllCapsPattern(): RegExp {
    return /\b([A-Z][A-Z'-]+),[ \t]+([A-Z][A-Z'-]+(?:[ \t]+[A-Z][A-Z'-]+)?)\b/g;
  }

  /**
   * Get compiled regex for family relationship names
   * Matches: "Spouse: John Smith", "Mother Jane Doe"
   */
  static getFamilyRelationshipPattern(): RegExp {
    const keywords = FAMILY_RELATIONSHIP_KEYWORDS.join("|");
    return new RegExp(
      `\\b(?:${keywords})[ \\t:]+([A-Z][a-z]+(?:[ \\t]+[A-Z][a-z]+){0,2})\\b`,
      "gi",
    );
  }

  /**
   * Get compiled regex for age/gender descriptor names
   * Matches: "45 year old woman Jane Smith"
   */
  static getAgeGenderPattern(): RegExp {
    return /\b\d+[ \t]+year[ \t]+old[ \t]+(?:woman|man|male|female|patient|person|individual)[ \t]+([A-Z][a-zA-Z]+(?:[ \t]+[A-Z][a-zA-Z]+){1,2})\b/gi;
  }

  /**
   * Get compiled regex for possessive names
   * Matches: "John Smith's"
   */
  static getPossessiveNamePattern(): RegExp {
    return /\b([A-Z][a-z]+[ \t]+[A-Z][a-z]+)'s\b/g;
  }

  /**
   * Get compiled regex for initial + last name
   * Matches: "J. Smith", "J Smith", "JR Smith"
   */
  static getInitialLastNamePattern(): RegExp {
    return /\b([A-Z]\.?[ \t]*[A-Z][a-z]{2,})\b/g;
  }

  /**
   * Get compiled regex for titled names
   * Matches: "Dr. John Smith", "Mr. Jones"
   */
  static getTitledNamePattern(): RegExp {
    const titles = Array.from(PROVIDER_TITLE_PREFIXES)
      .map((t) => t.replace(".", "\\."))
      .join("|");
    return new RegExp(
      `\\b(?:${titles})\\.?[ \\t]+([A-Z][a-zA-Z'-]+(?:[ \\t]+[A-Z][a-zA-Z'-]+){0,2})\\b`,
      "gi",
    );
  }

  // =========================================================================
  // VALIDATION METHODS
  // =========================================================================

  /**
   * Validate "Last, First" name format (case-insensitive)
   *
   * @param name - Name in "Last, First" format
   * @returns true if valid format
   */
  static validateLastFirst(name: string): boolean {
    const parts = name.split(",");
    if (parts.length !== 2) return false;

    const lastName = parts[0].trim();
    const firstName = parts[1].trim();

    // Each part must start with a letter and have at least 3 letters
    return (
      /^[A-Za-z][a-zA-Z'-]{2,}$/.test(lastName) &&
      /^[A-Za-z][a-zA-Z'-]{1,}/.test(firstName)
    );
  }

  /**
   * Validate "Last, First" name format (strict capitalization)
   *
   * @param name - Name in "Last, First" format
   * @returns true if properly capitalized
   */
  static validateLastFirstStrict(name: string): boolean {
    const parts = name.split(",");
    if (parts.length !== 2) return false;

    const lastName = parts[0].trim();
    const firstName = parts[1].trim();

    // Each part must start with capital followed by lowercase
    return (
      /^[A-Z][a-z]{2,}$/.test(lastName) && /^[A-Z][a-z]{1,}/.test(firstName)
    );
  }

  /**
   * Check if text is a non-person structure term
   *
   * @param text - Text to check
   * @returns true if it's a structure term
   */
  static isNonPersonStructureTerm(text: string): boolean {
    const normalized = text.toLowerCase().trim();

    // Check exact match
    if (NON_PERSON_STRUCTURE_TERMS.includes(normalized)) {
      return true;
    }

    // Check if text contains any structure term
    for (const term of NON_PERSON_STRUCTURE_TERMS) {
      if (normalized.includes(term)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract context around a position in text
   *
   * @param text - Full text
   * @param offset - Start position
   * @param length - Length of match
   * @param contextSize - Characters before/after (default: 150)
   * @returns Context string
   */
  static extractContext(
    text: string,
    offset: number,
    length: number,
    contextSize: number = 150,
  ): string {
    const start = Math.max(0, offset - contextSize);
    const end = Math.min(text.length, offset + length + contextSize);
    return text.substring(start, end);
  }

  /**
   * Check if text starts with a provider/professional title
   *
   * @param text - Text to check
   * @returns true if starts with a title
   */
  static startsWithTitle(text: string): boolean {
    const words = text.trim().split(/\s+/);
    if (words.length === 0) return false;

    const firstWord = words[0].replace(/\.$/, "");
    return (
      PROVIDER_TITLE_PREFIXES.has(firstWord) ||
      PROVIDER_TITLE_PREFIXES.has(firstWord + ".")
    );
  }

  /**
   * Remove title prefix from name
   *
   * @param text - Name with potential title
   * @returns Name without title
   */
  static removeTitle(text: string): string {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/);
    if (words.length <= 1) return trimmed;

    const firstWord = words[0].replace(/\.$/, "");
    if (
      PROVIDER_TITLE_PREFIXES.has(firstWord) ||
      PROVIDER_TITLE_PREFIXES.has(firstWord + ".")
    ) {
      return words.slice(1).join(" ");
    }

    return trimmed;
  }

  /**
   * Check if text ends with professional credentials
   *
   * @param text - Text to check
   * @returns true if ends with credentials
   */
  static endsWithCredentials(text: string): boolean {
    const words = text.trim().split(/[\s,]+/);
    if (words.length === 0) return false;

    // Check last 1-3 words for credentials
    for (let i = Math.max(0, words.length - 3); i < words.length; i++) {
      const word = words[i].replace(/[.,]/g, "");
      if (PROVIDER_CREDENTIALS.has(word)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if text is in ALL CAPS (potential section heading)
   *
   * @param text - Text to check
   * @returns true if all uppercase
   */
  static isAllCaps(text: string): boolean {
    const trimmed = text.trim();
    return (
      /^[A-Z0-9\s,'-]+$/.test(trimmed) &&
      /[A-Z]/.test(trimmed) &&
      trimmed.length > 4
    );
  }

  // =========================================================================
  // NAME LIKELIHOOD CHECKS
  // =========================================================================

  /**
   * Check if text is likely a person name using dictionary validation
   *
   * @param text - Text to check
   * @param context - Optional surrounding context
   * @returns true if likely a person name
   */
  static isLikelyPersonName(text: string, context?: string): boolean {
    const trimmed = text.trim();

    // Skip if too short or too long
    if (trimmed.length < 3 || trimmed.length > 50) return false;

    // Skip if ALL CAPS and looks like heading
    if (this.isAllCaps(trimmed) && trimmed.split(/\s+/).length >= 2) {
      return false;
    }

    // Skip if ends with colon (field label)
    if (trimmed.endsWith(":")) return false;

    // Split into words
    const words = trimmed.split(/\s+/);
    if (words.length < 1 || words.length > 4) return false;

    // Get first and last words
    const firstWord = words[0];
    const lastWord = words[words.length - 1];

    // Check dictionary confidence for first and last words
    const firstConf = NameDictionary.getNameConfidence(firstWord);
    const lastConf = NameDictionary.getNameConfidence(lastWord);

    // High confidence if both are known names
    if (firstConf > 0.7 && lastConf > 0.7) return true;

    // Medium confidence if one is known
    if (firstConf > 0.5 || lastConf > 0.5) return true;

    // Check for title prefix
    if (this.startsWithTitle(trimmed)) return true;

    return false;
  }

  /**
   * Check if name appears in provider context (after Dr., Physician:, etc.)
   *
   * @param name - Name to check
   * @param index - Position in text
   * @param text - Full text
   * @returns true if in provider context
   */
  static isInProviderContext(
    name: string,
    index: number,
    text: string,
  ): boolean {
    // Check 100 characters before the name
    const contextBefore = text.substring(Math.max(0, index - 100), index);
    const contextLower = contextBefore.toLowerCase();

    const providerIndicators = [
      "physician",
      "doctor",
      "dr.",
      "dr ",
      "attending",
      "consultant",
      "specialist",
      "surgeon",
      "provider",
      "practitioner",
      "clinician",
      "referring",
      "ordering",
      "treating",
      "primary care",
      "pcp:",
      "seen by",
      "evaluated by",
      "examined by",
      "treated by",
      "managed by",
    ];

    for (const indicator of providerIndicators) {
      if (contextLower.includes(indicator)) {
        return true;
      }
    }

    return false;
  }

  // =========================================================================
  // WHITELIST CHECKS
  // =========================================================================

  /**
   * Comprehensive whitelist check for name candidates
   *
   * @param text - Name candidate to check
   * @param context - Optional surrounding context
   * @param isAllCapsMode - Whether to use ALL CAPS logic
   * @returns true if should be whitelisted (not a name)
   */
  static performWhitelistCheck(
    text: string,
    context?: string,
    isAllCapsMode: boolean = false,
  ): boolean {
    const normalized = text.trim().toLowerCase();

    // Check UnifiedMedicalWhitelist for medical terms, field labels, and non-PHI
    if (isMedicalTerm(text) || isNonPHI(text)) {
      return true;
    }

    // Check hospital names (requires context)
    if (context && HospitalDictionary.isPartOfHospitalName(text, context)) {
      return true;
    }

    // Check if it's a non-person structure term
    if (this.isNonPersonStructureTerm(text)) {
      return true;
    }

    // Check individual words
    const words = text.split(/[\s,]+/).filter((w) => w.length > 1);
    for (const word of words) {
      if (isMedicalTerm(word)) {
        return true;
      }
    }

    // ALL CAPS mode: check for document structure patterns
    if (isAllCapsMode) {
      // Common document headings
      const headingPatterns = [
        /^[A-Z\s]+:$/,
        /^SECTION\s/i,
        /^PART\s/i,
        /^CHAPTER\s/i,
        /^APPENDIX\s/i,
      ];

      for (const pattern of headingPatterns) {
        if (pattern.test(text)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get family relationship keywords as array
   */
  static getFamilyRelationshipKeywords(): string[] {
    return [...FAMILY_RELATIONSHIP_KEYWORDS];
  }

  /**
   * Get non-person structure terms as array
   */
  static getStructureTerms(): string[] {
    return [...NON_PERSON_STRUCTURE_TERMS];
  }

  /**
   * Check if a word is a provider title
   */
  static isProviderTitle(word: string): boolean {
    const normalized = word.replace(/\.$/, "");
    return (
      PROVIDER_TITLE_PREFIXES.has(normalized) ||
      PROVIDER_TITLE_PREFIXES.has(normalized + ".")
    );
  }

  /**
   * Check if a word is a professional credential
   */
  static isCredential(word: string): boolean {
    const normalized = word.replace(/[.,]/g, "");
    return PROVIDER_CREDENTIALS.has(normalized);
  }
}
