/**
 * FormattedNameFilterSpan - Formatted Name Detection (Span-Based)
 *
 * Detects standard formatted names in various patterns and returns Spans.
 * This is the most complex name filter with extensive validation.
 * Parallel-execution ready.
 *
 * @module filters
 */

import { Span, FilterType } from "../models/Span";
import {
  SpanBasedFilter,
  FilterPriority,
} from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
import { NameDictionary } from "../dictionaries/NameDictionary";
import {
  NAME_PREFIXES,
  NAME_SUFFIXES,
  DOCUMENT_TERMS,
  NON_NAME_ENDINGS,
  GEOGRAPHIC_TERMS,
  isWhitelisted as baseIsWhitelisted,
  isExcludedAllCaps,
} from "./constants/NameFilterConstants";
import { DocumentVocabulary } from "../vocabulary/DocumentVocabulary";

export class FormattedNameFilterSpan extends SpanBasedFilter {
  getType(): string {
    return "NAME";
  }

  getPriority(): number {
    return FilterPriority.NAME;
  }

  detect(text: string, config: any, context: RedactionContext): Span[] {
    const spans: Span[] = [];

    // Pattern 0: Last, First format (medical records format)
    this.detectLastFirstNames(text, spans);

    // Pattern 0.5: Titled names (Dr. Smith, Mr. Jones)
    this.detectTitledNames(text, spans);

    // Pattern 0.6: Family relationship names (Daughter: Emma, Wife: Mary)
    this.detectFamilyRelationshipNames(text, spans);

    // Pattern 1: Patient + Mixed Case Name
    this.detectPatientNames(text, spans);

    // Pattern 2: Patient + ALL CAPS NAME
    this.detectPatientAllCapsNames(text, spans);

    // Pattern 3: Standalone ALL CAPS names
    this.detectStandaloneAllCapsNames(text, spans);

    // Pattern 4: Name with suffix
    this.detectNamesWithSuffix(text, spans);

    // Pattern 5: First Initial + Last Name
    this.detectInitialLastNames(text, spans);

    // Pattern 6: Possessive names
    this.detectPossessiveNames(text, spans);

    // Pattern 7: Names after age/gender descriptors
    this.detectAgeGenderNames(text, spans);

    // Pattern 8: General full names (most permissive, run last)
    this.detectGeneralFullNames(text, spans);

    // Pattern 9: Names with credential suffixes (RN, NP, MD, etc.)
    this.detectNamesWithCredentials(text, spans);

    return spans;
  }

  /**
   * Pattern 0: Last, First format (both mixed case and ALL CAPS)
   */
  private detectLastFirstNames(text: string, spans: Span[]): void {
    // Mixed case: Smith, John
    const mixedCasePattern =
      /\b([A-Z][a-z]{2,},[ \t]+[A-Z][a-z]{2,}(?:[ \t]+[A-Z][a-z]{2,})?)\b/g;
    mixedCasePattern.lastIndex = 0;
    let match;

    while ((match = mixedCasePattern.exec(text)) !== null) {
      const fullName = match[1];

      if (!this.isWhitelisted(fullName) && this.validateLastFirst(fullName)) {
        const span = new Span({
          text: fullName,
          originalValue: fullName,
          characterStart: match.index,
          characterEnd: match.index + fullName.length,
          filterType: FilterType.NAME,
          confidence: 0.93,
          priority: this.getPriority(),
          context: this.extractContext(
            text,
            match.index,
            match.index + fullName.length,
          ),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Last, First format",
          applied: false,
          ignored: false,
          ambiguousWith: [],
          disambiguationScore: null,
        });
        spans.push(span);
      }
    }

    // ALL CAPS: SMITH, JOHN or NAKAMURA, YUKI
    const allCapsPattern =
      /\b([A-Z]{2,},[ \t]+[A-Z]{2,}(?:[ \t]+[A-Z]{2,})?)\b/g;
    allCapsPattern.lastIndex = 0;

    while ((match = allCapsPattern.exec(text)) !== null) {
      const fullName = match[1];
      const parts = fullName.split(",");

      // Validate it looks like a name, not an acronym or heading
      if (parts.length === 2) {
        const lastName = parts[0].trim();
        const firstName = parts[1].trim();

        // Each part should be 2+ chars and not be excluded
        if (
          lastName.length >= 2 &&
          firstName.length >= 2 &&
          !isExcludedAllCaps(lastName) &&
          !isExcludedAllCaps(firstName) &&
          !this.isWhitelisted(fullName, true) // STREET-SMART: use ALL CAPS mode
        ) {
          const span = new Span({
            text: fullName,
            originalValue: fullName,
            characterStart: match.index,
            characterEnd: match.index + fullName.length,
            filterType: FilterType.NAME,
            confidence: 0.91,
            // STREET-SMART: High priority for ALL CAPS LAST, FIRST format
            // This format is almost always a patient name in medical documents
            priority: 150,
            context: this.extractContext(
              text,
              match.index,
              match.index + fullName.length,
            ),
            window: [],
            replacement: null,
            salt: null,
            pattern: "Last, First ALL CAPS format",
            applied: false,
            ignored: false,
            ambiguousWith: [],
            disambiguationScore: null,
          });
          spans.push(span);
        }
      }
    }

    // Case-insensitive: lowercase/mixed case variations like "smith, john" or "SMITH, john"
    const caseInsensitivePattern =
      /\b([a-zA-Z]{2,},[ \t]+[a-zA-Z]{2,}(?:[ \t]+[a-zA-Z]{2,})?)\b/g;
    caseInsensitivePattern.lastIndex = 0;

    // Track positions already covered
    const coveredPositions = new Set(
      spans.map((s) => `${s.characterStart}-${s.characterEnd}`),
    );

    while ((match = caseInsensitivePattern.exec(text)) !== null) {
      const fullName = match[1];
      const posKey = `${match.index}-${match.index + fullName.length}`;

      // Skip if already detected
      if (coveredPositions.has(posKey)) {
        continue;
      }

      const parts = fullName.split(",");
      if (parts.length !== 2) continue;

      const lastName = parts[0].trim();
      const firstName = parts[1].trim();

      // Validate: each part 2+ chars, looks like a name
      if (
        lastName.length >= 2 &&
        firstName.length >= 2 &&
        !this.isWhitelisted(fullName) &&
        this.validateLastFirst(fullName)
      ) {
        const span = new Span({
          text: fullName,
          originalValue: fullName,
          characterStart: match.index,
          characterEnd: match.index + fullName.length,
          filterType: FilterType.NAME,
          confidence: 0.85, // Lower confidence for non-standard case
          priority: 140, // High priority for Last, First format
          context: this.extractContext(
            text,
            match.index,
            match.index + fullName.length,
          ),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Last, First case-insensitive",
          applied: false,
          ignored: false,
          ambiguousWith: [],
          disambiguationScore: null,
        });
        spans.push(span);
        coveredPositions.add(posKey);
      }
    }
  }

  /**
   * Pattern 0.5: Titled names (Dr. Smith, Mr. Jones)
   */
  private detectTitledNames(text: string, spans: Span[]): void {
    const pattern = new RegExp(
      `\\b(?:${NAME_PREFIXES.join("|")})\\.?[ \\t]+[A-Z][a-z]+(?:[ \\t]+[A-Z][a-z]+)*\\b`,
      "g",
    );
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const matchedText = match[0];

      if (!this.isWhitelisted(matchedText)) {
        const span = new Span({
          text: matchedText,
          originalValue: matchedText,
          characterStart: match.index,
          characterEnd: match.index + matchedText.length,
          filterType: FilterType.NAME,
          confidence: 0.92,
          priority: this.getPriority(),
          context: this.extractContext(
            text,
            match.index,
            match.index + matchedText.length,
          ),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Titled name",
          applied: false,
          ignored: false,
          ambiguousWith: [],
          disambiguationScore: null,
        });
        spans.push(span);
      }
    }
  }

  /**
   * Pattern 0.6: Family relationship names (Daughter: Emma, Wife: Mary)
   */
  private detectFamilyRelationshipNames(text: string, spans: Span[]): void {
    const relationshipPattern =
      /\b(?:Spouse|Wife|Husband|Father|Mother|Dad|Mom|Brother|Sister|Son|Daughter|Child|Children|Parent|Sibling|Partner|Guardian|Emergency[ \t]+Contact|Next[ \t]+of[ \t]+Kin|NOK)[ \t:]+([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+)?)/gi;

    let match;
    while ((match = relationshipPattern.exec(text)) !== null) {
      const name = match[1];
      const fullMatch = match[0];

      if (!this.isWhitelisted(name)) {
        // Find position of name within full match
        const matchPos = match.index;
        const nameStart = matchPos + fullMatch.indexOf(name);
        const nameEnd = nameStart + name.length;

        const span = new Span({
          text: name.trim(),
          originalValue: name.trim(),
          characterStart: nameStart,
          characterEnd: nameEnd,
          filterType: FilterType.NAME,
          confidence: 0.9,
          priority: this.getPriority(),
          context: this.extractContext(text, nameStart, nameEnd),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Family relationship name",
          applied: false,
          ignored: false,
          ambiguousWith: [],
          disambiguationScore: null,
        });
        spans.push(span);
      }
    }
  }

  /**
   * Pattern 1: Patient + Mixed Case Name
   */
  private detectPatientNames(text: string, spans: Span[]): void {
    const pattern =
      /\b(?:Patient|Pt|Subject|Individual|Client)[ \t:]+([A-Z][a-z]+(?:[ \t]+[A-Z]\.?[ \t]*)?(?:[ \t]+[A-Z][a-z]+){1,2})\b/gi;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const name = match[1];
      const fullMatch = match[0];
      const matchPos = match.index!;

      // Find position of name within full match
      const nameStart = matchPos + fullMatch.indexOf(name);
      const nameEnd = nameStart + name.length;

      const span = new Span({
        text: name,
        originalValue: name,
        characterStart: nameStart,
        characterEnd: nameEnd,
        filterType: FilterType.NAME,
        confidence: 0.92,
        priority: this.getPriority(),
        context: this.extractContext(text, nameStart, nameEnd),
        window: [],
        replacement: null,
        salt: null,
        pattern: "Patient name",
        applied: false,
        ignored: false,
        ambiguousWith: [],
        disambiguationScore: null,
      });
      spans.push(span);
    }
  }

  /**
   * Pattern 2: Patient + ALL CAPS NAME
   */
  private detectPatientAllCapsNames(text: string, spans: Span[]): void {
    const pattern =
      /\b(?:Patient|Pt|Subject|Individual|Client|PATIENT|PT|SUBJECT|INDIVIDUAL|CLIENT)[ \t:]+([A-Z]{2,}(?:[ \t]+[A-Z]{2,}){1,2})\b/g;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const name = match[1];
      const words = name.trim().split(/\s+/);

      if (
        words.length >= 2 &&
        words.length <= 3 &&
        words.every((w: string) => w.length >= 2) &&
        !isExcludedAllCaps(name.trim())
      ) {
        const fullMatch = match[0];
        const matchPos = match.index!;
        const nameStart = matchPos + fullMatch.indexOf(name);
        const nameEnd = nameStart + name.length;

        const span = new Span({
          text: name,
          originalValue: name,
          characterStart: nameStart,
          characterEnd: nameEnd,
          filterType: FilterType.NAME,
          confidence: 0.88,
          priority: this.getPriority(),
          context: this.extractContext(text, nameStart, nameEnd),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Patient all caps name",
          applied: false,
          ignored: false,
          ambiguousWith: [],
          disambiguationScore: null,
        });
        spans.push(span);
      }
    }
  }

  /**
   * Pattern 3: Standalone ALL CAPS names
   */
  private detectStandaloneAllCapsNames(text: string, spans: Span[]): void {
    const pattern = /\b([A-Z]{2,}[ \t]+[A-Z]{2,}(?:[ \t]+[A-Z]{2,})?)\b/g;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const name = match[1];
      const words = name.trim().split(/\s+/);

      if (
        words.length >= 2 &&
        words.length <= 3 &&
        words.every((w: string) => w.length >= 2 && /^[A-Z]+$/.test(w)) &&
        !isExcludedAllCaps(name.trim())
      ) {
        const span = this.createSpanFromMatch(
          text,
          match,
          FilterType.NAME,
          0.75,
        );
        spans.push(span);
      }
    }
  }

  /**
   * Pattern 4: Name with suffix
   */
  private detectNamesWithSuffix(text: string, spans: Span[]): void {
    const pattern = new RegExp(
      `\\b([A-Z][a-z]+(?:[ \\t]+[A-Z]\\.?[ \\t]*)?[ \\t]+[A-Z][a-z]+)[ \\t]*,?[ \\t]*(?:${NAME_SUFFIXES.join("|")})\\.?\\b`,
      "gi",
    );
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const name = match[1];

      // Skip if whitelisted (medications, medical terms, etc.)
      if (this.isWhitelisted(name)) {
        continue;
      }

      // Skip if name is too short (likely a false positive like "QHS P")
      const nameParts = name.trim().split(/\s+/);
      if (nameParts.some((part) => part.length < 2)) {
        continue;
      }

      const fullMatch = match[0];
      const matchPos = match.index!;
      const nameStart = matchPos + fullMatch.indexOf(name);
      const nameEnd = nameStart + name.length;

      const span = new Span({
        text: name,
        originalValue: name,
        characterStart: nameStart,
        characterEnd: nameEnd,
        filterType: FilterType.NAME,
        confidence: 0.9,
        priority: this.getPriority(),
        context: this.extractContext(text, nameStart, nameEnd),
        window: [],
        replacement: null,
        salt: null,
        pattern: "Name with suffix",
        applied: false,
        ignored: false,
        ambiguousWith: [],
        disambiguationScore: null,
      });
      spans.push(span);
    }
  }

  /**
   * Pattern 5: First Initial + Last Name
   */
  private detectInitialLastNames(text: string, spans: Span[]): void {
    const pattern = /\b([A-Z]\.[ \t]+[A-Z][a-z]{2,})\b/g;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const name = match[1];
      if (this.isLikelyName(name)) {
        const span = this.createSpanFromMatch(
          text,
          match,
          FilterType.NAME,
          0.85,
        );
        spans.push(span);
      }
    }
  }

  /**
   * Pattern 6: Possessive names
   */
  private detectPossessiveNames(text: string, spans: Span[]): void {
    const pattern = /\b([A-Z][a-z]+[ \t]+[A-Z][a-z]+)'s\b/g;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const name = match[1];
      if (this.isLikelyName(name)) {
        const matchPos = match.index!;
        const span = new Span({
          text: name,
          originalValue: name,
          characterStart: matchPos,
          characterEnd: matchPos + name.length,
          filterType: FilterType.NAME,
          confidence: 0.87,
          priority: this.getPriority(),
          context: this.extractContext(text, matchPos, matchPos + name.length),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Possessive name",
          applied: false,
          ignored: false,
          ambiguousWith: [],
          disambiguationScore: null,
        });
        spans.push(span);
      }
    }
  }

  /**
   * Pattern 7: Names after age/gender descriptors
   */
  private detectAgeGenderNames(text: string, spans: Span[]): void {
    const pattern =
      /\b\d+[ \t]+year[ \t]+old[ \t]+(?:woman|man|male|female|patient|person|individual)[ \t]+([A-Z][a-zA-Z]+(?:[ \t]+[A-Z][a-zA-Z]+){1,2})\b/gi;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim();
      const fullMatch = match[0];
      const matchPos = match.index!;
      const nameStart = matchPos + fullMatch.indexOf(name);
      const nameEnd = nameStart + name.length;

      const span = new Span({
        text: name,
        originalValue: name,
        characterStart: nameStart,
        characterEnd: nameEnd,
        filterType: FilterType.NAME,
        confidence: 0.91,
        priority: this.getPriority(),
        context: this.extractContext(text, nameStart, nameEnd),
        window: [],
        replacement: null,
        salt: null,
        pattern: "Age/gender descriptor",
        applied: false,
        ignored: false,
        ambiguousWith: [],
        disambiguationScore: null,
      });
      spans.push(span);
    }
  }

  /**
   * Pattern 8: General full names (most permissive)
   */
  private detectGeneralFullNames(text: string, spans: Span[]): void {
    const pattern =
      /\b([A-Z][a-z]{2,}[ \t]+[A-Z][a-z]{2,}(?:[ \t]+(?:Jr\.?|Sr\.?|II|III|IV))?)\b/g;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const name = match[1];

      if (!this.isWhitelisted(name) && this.isLikelyPersonName(name)) {
        const span = this.createSpanFromMatch(
          text,
          match,
          FilterType.NAME,
          0.8,
        );
        spans.push(span);
      }
    }
  }

  /**
   * Validation helpers
   */
  private validateLastFirst(name: string): boolean {
    const parts = name.split(",");
    if (parts.length === 2) {
      const lastName = parts[0].trim();
      const firstName = parts[1].trim();
      return (
        /^[A-Z][a-z]{2,}/.test(lastName) && /^[A-Z][a-z]{2,}/.test(firstName)
      );
    }
    return false;
  }

  private isLikelyName(text: string): boolean {
    if (this.isWhitelisted(text)) return false;
    const nonNames = ["U.S.", "P.O.", "A.M.", "P.M.", "E.R.", "I.V."];
    if (nonNames.includes(text)) return false;
    if (!/[a-z]/.test(text)) return false;
    if (!/^[A-Z]/.test(text)) return false;
    return true;
  }

  private isLikelyPersonName(text: string): boolean {
    if (this.isWhitelisted(text)) return false;

    const trimmed = text.trim();
    const isAllCaps =
      /^[A-Z0-9\s]+$/.test(trimmed) &&
      /[A-Z]/.test(trimmed) &&
      trimmed.length > 6;
    if (isAllCaps && trimmed.split(/\s+/).length >= 2) return false;
    if (trimmed.endsWith(":")) return false;

    const words = trimmed.split(/\s+/);
    if (words.length < 2 || words.length > 3) return false;

    // PRIMARY CHECK: Use dictionary validation
    // If the first word is NOT a known first name, this is likely not a person name
    // This eliminates false positives like "Timeline Narrative", "Physical Therapy"
    const nameConfidence = NameDictionary.getNameConfidence(trimmed);
    if (nameConfidence < 0.5) {
      // Not a recognized name pattern - reject it
      return false;
    }

    const firstWord = words[0];
    const lastWord = words[words.length - 1];

    // Use shared constants for validation
    if (DOCUMENT_TERMS.has(firstWord)) return false;
    if (NON_NAME_ENDINGS.has(lastWord)) return false;

    // Check geographic terms
    for (const word of words) {
      if (GEOGRAPHIC_TERMS.has(word)) return false;
    }

    if (!words.every((w) => w.length >= 2)) return false;

    for (const word of words) {
      if (
        !["Jr", "Jr.", "Sr", "Sr.", "II", "III", "IV"].includes(word) &&
        !/^[A-Z][a-z]+$/.test(word)
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * STREET-SMART: Check if text is a non-person structure term.
   * This is a MINIMAL whitelist - only obvious document structure terms.
   * Does NOT include medical eponyms (Bell, Wilson, Stokes, etc.)
   * because in context (credential suffix, title, etc.) these are person names.
   */
  private isNonPersonStructureTerm(text: string): boolean {
    const structureTerms = [
      "protected health",
      "social security",
      "medical record",
      "health plan",
      "emergency department",
      "intensive care",
      "emergency contact",
      "next of kin",
      "not applicable",
      "n/a",
      "unknown",
      "none",
    ];
    const lower = text.toLowerCase().trim();
    return structureTerms.some(
      (term) => lower === term || lower.includes(term),
    );
  }

  /**
   * Enhanced whitelist check that includes medical terms and word-by-word checking
   * STREET-SMART: For ALL CAPS LAST, FIRST format, be more permissive -
   * these are almost always patient names in medical documents
   */
  private isWhitelisted(
    text: string,
    isAllCapsLastFirst: boolean = false,
  ): boolean {
    const normalized = text.trim();

    // Check base whitelist
    if (baseIsWhitelisted(normalized)) {
      return true;
    }

    // STREET-SMART: For ALL CAPS "LAST, FIRST" format names, don't whitelist
    // based on individual word medical term matching. These are patient names.
    if (isAllCapsLastFirst) {
      // Only whitelist if the ENTIRE name is a known non-person structure term
      const structureTerms = [
        "emergency department",
        "intensive care",
        "medical record",
        "health plan",
      ];
      const lower = normalized.toLowerCase();
      return structureTerms.some((term) => lower.includes(term));
    }

    // Check if it's a medical term
    if (DocumentVocabulary.isMedicalTerm(normalized)) {
      return true;
    }

    // Check individual words - if ANY word is a medical term, skip entire match
    const words = normalized.split(/[\s,]+/).filter((w) => w.length > 2);
    for (const word of words) {
      if (baseIsWhitelisted(word) || DocumentVocabulary.isMedicalTerm(word)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Pattern 9: Names with credential suffixes (RN, NP, MD, etc.)
   * Matches: "Kenneth Stokes, RN", "Tyler Weber NP", "Pedro Turner, MD"
   *
   * STREET-SMART: Credential suffix is STRONG evidence this is a person name.
   * Do NOT whitelist based on medical eponyms (Stokes, Bell, etc.) because
   * "Sarah Stokes, RN" is clearly a nurse named Stokes, not Cheyne-Stokes respiration.
   */
  private detectNamesWithCredentials(text: string, spans: Span[]): void {
    const credentials = [
      "RN",
      "NP",
      "PA",
      "MD",
      "DO",
      "DDS",
      "DPT",
      "PhD",
      "RDMS",
      "RDCS",
      "RT",
      "RDH",
      "LCSW",
      "LPN",
      "CNA",
      "CRNA",
      "CNM",
      "APRN",
      "FACS",
      "FACC",
      "FACG",
    ];
    const credentialPattern = new RegExp(
      `\\b([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)\\s*,?\\s*(${credentials.join("|")})\\b`,
      "g",
    );

    let match;
    while ((match = credentialPattern.exec(text)) !== null) {
      const name = match[1].trim();
      const credential = match[2];
      const fullMatch = match[0];

      // STREET-SMART: Only skip obvious non-person structure terms
      // Do NOT skip based on medical eponyms - credential suffix confirms person
      if (this.isNonPersonStructureTerm(name)) {
        continue;
      }

      const span = new Span({
        text: fullMatch,
        originalValue: fullMatch,
        characterStart: match.index,
        characterEnd: match.index + fullMatch.length,
        filterType: FilterType.NAME,
        confidence: 0.93,
        // High priority - credential suffix confirms this is a person
        priority: 150,
        context: this.extractContext(
          text,
          match.index,
          match.index + fullMatch.length,
        ),
        window: [],
        replacement: null,
        salt: null,
        pattern: "Name with credential",
        applied: false,
        ignored: false,
        ambiguousWith: [],
        disambiguationScore: null,
      });
      spans.push(span);
    }
  }
}
