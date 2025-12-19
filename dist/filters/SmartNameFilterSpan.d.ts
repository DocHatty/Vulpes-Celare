/**
 * SmartNameFilterSpan - Context-Aware Name Detection (Span-Based)
 *
 * Detects names with role/demographic context and returns Spans with metadata.
 * This filter can attach additional context to spans for smart redaction.
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class SmartNameFilterSpan extends SpanBasedFilter {
    getType(): string;
    getPriority(): number;
    detect(text: string, _config: any, context: RedactionContext): Span[];
    /**
     * Check if a name (without title) appears in a provider context
     * This catches cases where "Sergei Hernandez" is detected but it's actually
     * part of "Prof. Sergei Hernandez" which is a provider name
     *
     * Also catches partial matches like "O'Neill" which is part of "Dame Ananya O'Neill"
     *
     * @param name - The matched name text (e.g., "Sergei Hernandez" or "O'Neill")
     * @param matchIndex - The position in the full text where this name was found
     * @param fullContext - The full document text
     * @returns true if this name appears to be part of a provider name
     */
    private isInProviderContext;
    /**
     * Pattern 1: Title + Name (handles both "Dr. Smith" and "Dr. John Smith")
     *
     * IMPORTANT: Names with professional titles (Dr., Prof., Hon., Dame, Sir, etc.)
     * are PROVIDER names under HIPAA Safe Harbor and should NOT be redacted.
     * Only patient names should be redacted.
     */
    private detectTitledNames;
    /**
     * Pattern 2: Patient + Name patterns
     *
     * CRITICAL: The name capture MUST require proper capitalization (First Last)
     * to avoid matching things like "patient was seen by" as a name.
     * We use case-insensitive for the prefix (Patient/Pt/etc.) but the name
     * itself must be properly capitalized.
     */
    private detectPatientNames;
    /**
     * Pattern 3: Patient + ALL CAPS NAME
     * Matches: PATIENT: JOHN SMITH, Patient: JOHN SMITH, etc.
     */
    private detectPatientAllCapsNames;
    /**
     * Pattern 4: Standalone ALL CAPS names
     *
     * IMPORTANT: Limit whitespace to 1-3 chars between words to avoid greedy matching
     * that captures field labels like "PEDRO LINDBERG       DOB" as a single name.
     */
    private detectStandaloneAllCapsNames;
    /**
     * Pattern 5: Family member names and nicknames/preferred names
     */
    private detectFamilyNames;
    /**
     * Pattern 6: Name with suffix (Jr., Sr., III, etc.)
     *
     * IMPORTANT: Names with PROFESSIONAL CREDENTIALS (MD, DDS, RN, etc.) are PROVIDERS
     * and should NOT be redacted. Names with GENERATIONAL suffixes (Jr., Sr., III)
     * ARE patient names and SHOULD be redacted.
     *
     * CRITICAL: Must use case-SENSITIVE matching for the name part to avoid
     * matching lowercase words like "seen by" as names.
     */
    private detectNamesWithSuffix;
    /**
     * Check if text is a non-person structure term (document sections, etc.)
     * Delegates to shared NameDetectionUtils
     */
    private isNonPersonStructureTerm;
    /**
     * Pattern 7: Age/gender descriptors with names
     */
    private detectAgeGenderNames;
    /**
     * Pattern 8: Possessive forms
     */
    private detectPossessiveNames;
    /**
     * Pattern 0a: OCR-Tolerant Last, First format
     *
     * Handles real-world OCR failures seen in testing:
     * - "Wals,h Ali V." (comma in wrong place)
     * - "elena sanchez" (all lowercase)
     * - "nilsson, elena ann" (lowercase Last, First)
     * - "Hajid,R aj" (comma + space issues)
     * - "Ronald J0nse" (0 instead of o)
     * - "Dborah Oe" (missing chars)
     * - "Alii KelIy" (double i, capital I instead of l)
     * - "ZHAN6, SUSAN" (digit instead of letter)
     */
    private detectOcrLastFirstNames;
    /**
     * Pattern 0b: Chaos-Case Last, First with OCR Substitutions
     *
     * Catches names that have:
     * - Chaotic capitalization (any case mix): "gOLdbeeRg", "marTinA"
     * - OCR character substitutions: "@" for "a", "0" for "o", "1" for "l"
     * - Comma placement issues: space before comma, space after
     *
     * Examples:
     * - "martinez, l@tonya a."
     * - "gOLdbeeRg ,marTinA"
     * - "5mith , j0hn"
     * - "NAKAMUR@ ,K3VIN"
     */
    private detectChaosLastFirstNames;
    /**
     * Validate a chaos-case name part (after OCR normalization)
     */
    private isValidChaosPart;
    /**
     * Normalize OCR errors in names (basic version for validation)
     */
    private normalizeNameOcr;
    /**
     * Comprehensive OCR character normalization for name detection
     * Based on research: common OCR confusions from scanning medical documents
     *
     * NOTE: Some digits map to multiple possible letters. We use the most common:
     * - 4 → a (but could also be e in some fonts)
     * - 1 → l (but could also be i)
     */
    private normalizeOcrChars;
    /**
     * Alternative OCR normalization treating 4 as 'e' instead of 'a'
     * Some OCR engines confuse 4 with e (especially in fonts where e has a horizontal bar)
     * Examples: "Charl4s" → "Charles", "H4nry" → "Henry"
     */
    private normalizeOcrCharsAlt;
    /**
     * Quick heuristic to check if a string is likely a person name
     */
    private isLikelyOcrName;
    /**
     * Pattern 9a: Labeled names with noisy/OCR spelling
     *
     * Captures names that follow common patient/contact labels even when
     * separators are distorted (extra spaces, colons, dashes) or characters are
     * OCR-substituted (0/O, 1/l, 5/S).
     *
     * Examples:
     * - "Patient: MAR1A G0NZ ALEZ"
     * - "Emergency Contact - RlCK   SANTOS"
     * - "Pt Name  LOPEZ  DE LA  CRUZ"
     */
    private detectLabeledOcrNames;
    /**
     * Normalize common OCR substitutions in names
     * Handles: digit-for-letter (1→l, 0→O, 7→u), case issues, extra spaces
     */
    private normalizeOcrName;
    /**
     * Validate whether an OCR-normalized candidate looks like a person name
     */
    private isNoisyNameCandidate;
    /**
     * Helper methods - Delegates to shared NameDetectionUtils
     */
    private validateLastFirst;
    private isLikelyPersonName;
    private getContext;
    private isHeading;
    private isLikelyName;
    /**
     * Pattern 10: Hyphenated names (Mary-Ann Johnson, Jean-Claude Dupont)
     */
    private detectHyphenatedNames;
    /**
     * Pattern 11: Apostrophe names (O'Brien, D'Angelo, O'Malley)
     */
    private detectApostropheNames;
    /**
     * Pattern 12: Accented/international names (José García, François Müller)
     */
    private detectAccentedNames;
    /**
     * Pattern 13: Names with particles (van Gogh, de Silva, von Neumann)
     */
    private detectParticleNames;
    /**
     * Pattern 14: Team member list names
     * Matches names in team member lists like:
     * - Jessica Weber, Oncology
     * - Dr. Samuel Green, Oncology (attending)
     * TEAM MEMBERS PRESENT:
     * - Kim Clark
     */
    private detectTeamMemberNames;
    /**
     * Pattern 15: Chaos-Aware Labeled Name Detection
     *
     * DESIGN: When we see a label like "Patient Name:", "Member Name:", etc.,
     * we can be much more aggressive about capturing whatever follows as a name,
     * even if it has chaotic capitalization like "pATriCIA L. jOHNsOn".
     *
     * The chaos detector analyzes the document quality and adjusts confidence
     * accordingly - if the doc is chaotic, we EXPECT weird patterns.
     *
     * Examples caught:
     * - "Patient Name:           5antiaqo U. oNwak"
     * - "Member Name:             Nguyen , 4icrdo"
     * - "Name:                   kevin louise liu"
     * - "Legal Name (Last, First Middle):     pATriCIA L. jOHNsOn"
     */
    private detectChaosAwareLabeledNames;
    /**
     * Quick check for obvious non-name patterns that should never be captured
     */
    private isObviousNonName;
    /**
     * Enhanced whitelist check using UnifiedMedicalWhitelist.
     *
     * WHITELIST PRIORITY (things that should NOT be redacted):
     * 1. Medical terms (diagnoses, procedures, medications)
     * 2. Field labels and document structure
     * 3. Hospital names (NOT patient PHI under HIPAA Safe Harbor)
     * 4. Insurance companies
     * 5. Geographic terms
     *
     * All consolidated in UnifiedMedicalWhitelist for single source of truth.
     */
    private isWhitelisted;
    /**
     * Detect concatenated names without spaces (OCR error: spaces removed)
     * Examples: "DeborahHarris", "JohnSmith", "MaryJohnson"
     *
     * Strategy:
     * 1. Find patterns with 2+ capitalized words concatenated
     * 2. Try splitting at capital letters
     * 3. Check if both parts are in name dictionaries
     * 4. If yes, mark as potential name with high confidence
     */
    private detectConcatenatedNames;
    /**
     * Check if a span overlaps with existing spans
     */
    private overlapsExisting;
    /**
     * Pattern 17: OCR-Corrupted Names with Digits/Symbols in Middle
     *
     * Catches names where OCR has substituted digits or symbols for letters:
     * - "Charl4s" → "Charles" (4 for e)
     * - "Muel1er" → "Mueller" (1 for l)
     * - "M@ria" → "Maria" (@ for a)
     * - "Jennif3r" → "Jennifer" (3 for e)
     * - "Hernandcz" → "Hernandez" (c for e - letter confusion)
     * - "Y0ussef" → "Youssef" (0 for o)
     *
     * Strategy:
     * 1. Find words that look like names but have OCR corruption (digit/symbol inside)
     * 2. Normalize using both OCR mappings (4→a and 4→e variants)
     * 3. Check if normalized version matches a known name
     * 4. If match, capture the original corrupted version
     */
    private detectOcrCorruptedNames;
}
//# sourceMappingURL=SmartNameFilterSpan.d.ts.map