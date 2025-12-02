/**
 * TitledNameFilterSpan - Titled Name Detection (Span-Based)
 *
 * Detects names with formal titles (Dr., Mr., Mrs., etc.) and returns Spans.
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
import { isWhitelisted as centralizedIsWhitelisted } from "./constants/NameFilterConstants";
import { DocumentVocabulary } from "../vocabulary/DocumentVocabulary";

export class TitledNameFilterSpan extends SpanBasedFilter {
  /**
   * Common formal name prefixes
   */
  private readonly PREFIXES = [
    "Mr",
    "Mrs",
    "Ms",
    "Miss",
    "Dr",
    "Prof",
    "Rev",
    "Hon",
    "Capt",
    "Lt",
    "Sgt",
    "Col",
    "Gen",
  ];

  /**
   * Name suffixes for complete name patterns
   */
  private readonly SUFFIXES = [
    "Jr",
    "Sr",
    "II",
    "III",
    "IV",
    "MD",
    "PhD",
    "DDS",
    "Esq",
    "RN",
    "NP",
    "PA",
  ];

  /**
   * Whitelist of terms that should NOT be redacted
   */
  private readonly WHITELIST = new Set([
    "Protected Health",
    "Social Security",
    "Medical record",
    "Health plan",
    "Emergency Department",
    "Intensive Care",
    "Emergency Contact",
    "Next of Kin",
  ]);

  getType(): string {
    return "NAME";
  }

  getPriority(): number {
    return FilterPriority.NAME;
  }

  detect(text: string, config: any, context: RedactionContext): Span[] {
    const spans: Span[] = [];

    // Use multiple detection strategies for comprehensive coverage
    this.detectTitledNames(text, spans);
    this.detectTitledNamesWithSuffix(text, spans);
    this.detectLastFirstNames(text, spans);
    this.detectGeneralFullNames(text, spans);
    this.detectFamilyRelationshipNames(text, spans);
    this.detectProviderRoleNames(text, spans);

    return spans;
  }

  /**
   * Pattern 6: Names after provider role labels
   * Matches: "Referring: Dr. John Smith", "Sonographer: Sarah Mitchell, RDMS"
   *
   * STREET-SMART: Provider role context means this IS a person name.
   * Don't whitelist based on eponymous disease names.
   */
  private detectProviderRoleNames(text: string, spans: Span[]): void {
    // Provider role labels that are followed by names
    // Added: Ordering (for "ORDERING PHYSICIAN")
    // FIX: Require either a colon separator or explicit role descriptor (Physician/Provider/etc.)
    // This prevents matching narrative text like "The surgeon was Dr. Smith"
    // FIX2: Name capture group now stops at common sentence boundaries (performed, did, was, etc.)
    const rolePattern =
      /\b(?:Referring|Consulting|Ordering|Sonographer|Interpreting|Radiologist|Pathologist|Surgeon|Anesthesiologist|Attending|Resident|Nurse|Therapist|Technician|Technologist|Endoscopist|Assistant|Cardiologist|Neurologist|Oncologist|Provider|Physician|Psychiatrist|Psychologist|Dentist|Hygienist|Charge Nurse|Primary Nurse|Supervising|Laboratory Director)(?:\s+(?:Physician|Provider|Doctor|Nurse|Specialist))?\s*:\s*(?:Dr\.?\s+)?([A-Z][a-z]+(?:,?\s+[A-Z][a-z]+)?)/gi;

    let match;
    while ((match = rolePattern.exec(text)) !== null) {
      const name = match[1].trim();
      const fullMatch = match[0];

      // STREET-SMART: Only skip obvious non-person terms
      // Context (Ordering Physician, etc.) makes it clear this is a person
      if (this.isNonPersonStructureTerm(name)) {
        continue;
      }

      // Find position of name within full match
      const matchPos = match.index;
      const nameStart = matchPos + fullMatch.lastIndexOf(name);
      const nameEnd = nameStart + name.length;

      const span = new Span({
        text: name,
        originalValue: name,
        characterStart: nameStart,
        characterEnd: nameEnd,
        filterType: FilterType.NAME,
        confidence: 0.92,
        // STREET-SMART: High priority (150+) = protected from vocabulary filtering
        // Provider role context is strong evidence this is a person name
        priority: 150,
        context: this.extractContext(text, nameStart, nameEnd),
        window: [],
        replacement: null,
        salt: null,
        pattern: "Provider role name",
        applied: false,
        ignored: false,
        ambiguousWith: [],
        disambiguationScore: null,
      });
      spans.push(span);
    }
  }

  /**
   * Pattern 1: Title + Name (handles both "Dr. Smith" and "Dr. John Smith")
   * Matches: Dr. Smith, Dr. John Smith, Mr. Robert Jones, etc.
   *
   * Now also matches case variations like:
   * - "dr. smith" (all lowercase)
   * - "DR. SMITH" (all caps)
   * - "Dr. SMITH" (mixed case)
   */
  private detectTitledNames(text: string, spans: Span[]): void {
    // Standard Title Case pattern
    const titlePattern = new RegExp(
      `\\b(?:${this.PREFIXES.join("|")})\\.?[ \\t]+[A-Z][a-z]+(?:[ \\t]+[A-Z][a-z]+)*\\b`,
      "g",
    );

    // Case-insensitive pattern for OCR/typing variations
    // Matches "dr. smith", "DR. SMITH", "dR. sMiTh", etc.
    // NOTE: Only match a SINGLE name part to avoid capturing verbs/sentences
    // If two words follow title, only capture if second looks like a name (capitalized or all same case)
    const caseInsensitivePattern = new RegExp(
      `\\b(?:${this.PREFIXES.join("|")})\\.?[ \\t]+([A-Za-z]{2,})\\b`,
      "gi",
    );

    // Process standard pattern first
    titlePattern.lastIndex = 0;
    let match;
    while ((match = titlePattern.exec(text)) !== null) {
      const matchedText = match[0];

      // Skip if whitelisted
      if (this.isWhitelisted(matchedText)) {
        continue;
      }

      // Create span for entire match (title + name)
      // STREET-SMART: Titled names get high priority (150+) to bypass vocabulary filtering
      const span = new Span({
        text: matchedText,
        originalValue: matchedText,
        characterStart: match.index,
        characterEnd: match.index + matchedText.length,
        filterType: FilterType.NAME,
        confidence: 0.92,
        priority: 150, // High priority = protected from vocabulary filtering
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

    // Process case-insensitive pattern for variations
    // Only add if not already covered by standard pattern
    const coveredPositions = new Set(
      spans.map((s) => `${s.characterStart}-${s.characterEnd}`),
    );

    caseInsensitivePattern.lastIndex = 0;
    while ((match = caseInsensitivePattern.exec(text)) !== null) {
      const matchedText = match[0];
      const posKey = `${match.index}-${match.index + matchedText.length}`;

      // Skip if already detected or whitelisted
      if (coveredPositions.has(posKey) || this.isWhitelisted(matchedText)) {
        continue;
      }

      // Verify this looks like a name (at least 2 chars after title)
      const afterTitle = matchedText.replace(
        new RegExp(`^(?:${this.PREFIXES.join("|")})\\.?[ \\t]+`, "i"),
        "",
      );
      if (afterTitle.length < 2) {
        continue;
      }

      // Lower confidence for case-insensitive matches (they're more likely to be errors)
      const span = new Span({
        text: matchedText,
        originalValue: matchedText,
        characterStart: match.index,
        characterEnd: match.index + matchedText.length,
        filterType: FilterType.NAME,
        confidence: 0.85, // Slightly lower confidence for non-standard case
        priority: 145, // Still high priority but slightly lower
        context: this.extractContext(
          text,
          match.index,
          match.index + matchedText.length,
        ),
        window: [],
        replacement: null,
        salt: null,
        pattern: "Titled name (case-insensitive)",
        applied: false,
        ignored: false,
        ambiguousWith: [],
        disambiguationScore: null,
      });

      spans.push(span);
      coveredPositions.add(posKey);
    }
  }

  /**
   * Pattern 2: Title + Name + Suffix (Dr. John Smith Jr., Prof. Jane Doe MD)
   */
  private detectTitledNamesWithSuffix(text: string, spans: Span[]): void {
    const titleSuffixPattern = new RegExp(
      `\\b(?:${this.PREFIXES.join("|")})\\.?[ \\t]+[A-Z][a-z]+(?:[ \\t]+[A-Z][a-z]+)*[ \\t]*,?[ \\t]*(?:${this.SUFFIXES.join("|")})\\.?\\b`,
      "gi",
    );

    titleSuffixPattern.lastIndex = 0;
    let match;
    while ((match = titleSuffixPattern.exec(text)) !== null) {
      const matchedText = match[0];

      if (!this.isWhitelisted(matchedText)) {
        // STREET-SMART: Titled names with suffix get high priority
        const span = new Span({
          text: matchedText,
          originalValue: matchedText,
          characterStart: match.index,
          characterEnd: match.index + matchedText.length,
          filterType: FilterType.NAME,
          confidence: 0.93,
          priority: 150, // High priority = protected from vocabulary filtering
          context: this.extractContext(
            text,
            match.index,
            match.index + matchedText.length,
          ),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Titled name with suffix",
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
   * Pattern 3: Last, First format (Smith, John)
   * Detects "Last, First" or "Last, First Middle" patterns
   */
  private detectLastFirstNames(text: string, spans: Span[]): void {
    // Match "Last, First" or "Last, First Middle"
    const lastFirstPattern =
      /\b([A-Z][a-z]{1,20}),\s+([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20})?)\b/g;

    let match;
    while ((match = lastFirstPattern.exec(text)) !== null) {
      const lastName = match[1];
      const firstNames = match[2];
      const fullMatch = match[0];

      if (this.isWhitelisted(fullMatch)) {
        continue;
      }

      // Validate it's a likely person name
      if (this.validateLastFirst(lastName, firstNames)) {
        const span = new Span({
          text: fullMatch,
          originalValue: fullMatch,
          characterStart: match.index,
          characterEnd: match.index + fullMatch.length,
          filterType: FilterType.NAME,
          confidence: 0.88,
          priority: this.getPriority(),
          context: this.extractContext(
            text,
            match.index,
            match.index + fullMatch.length,
          ),
          window: [],
          replacement: null,
          salt: null,
          pattern: null,
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
   * Pattern 4: General Full Names (First Last or First Middle Last)
   * Detects standard full name patterns without titles
   */
  private detectGeneralFullNames(text: string, spans: Span[]): void {
    // Match 2-4 capitalized words in sequence
    const fullNamePattern =
      /\b([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20}){1,3})\b/g;

    let match;
    while ((match = fullNamePattern.exec(text)) !== null) {
      const fullMatch = match[0];

      if (this.isWhitelisted(fullMatch)) {
        continue;
      }

      // Only include if it looks like a person name (not place/organization)
      if (this.isLikelyPersonName(fullMatch)) {
        const span = new Span({
          text: fullMatch,
          originalValue: fullMatch,
          characterStart: match.index,
          characterEnd: match.index + fullMatch.length,
          filterType: FilterType.NAME,
          confidence: 0.8,
          priority: this.getPriority(),
          context: this.extractContext(
            text,
            match.index,
            match.index + fullMatch.length,
          ),
          window: [],
          replacement: null,
          salt: null,
          pattern: null,
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
   * Validate that Last, First pattern is a likely person name
   */
  private validateLastFirst(lastName: string, firstNames: string): boolean {
    // Common organization/location keywords that shouldn't be names
    const nonPersonTerms = [
      "Department",
      "Hospital",
      "Center",
      "Clinic",
      "Institute",
      "University",
      "College",
      "Medical",
      "Health",
      "Emergency",
      "Intensive",
      "Care",
    ];

    const combined = `${lastName} ${firstNames}`;

    for (const term of nonPersonTerms) {
      if (combined.includes(term)) {
        return false;
      }
    }

    // Both parts should be reasonable name length (2-20 chars)
    if (lastName.length < 2 || lastName.length > 20) {
      return false;
    }

    if (firstNames.length < 2 || firstNames.length > 40) {
      return false;
    }

    return true;
  }

  /**
   * Check if a capitalized word sequence is likely a person name
   */
  private isLikelyPersonName(name: string): boolean {
    // Common organization/location keywords
    const nonPersonTerms = [
      "Department",
      "Hospital",
      "Center",
      "Clinic",
      "Institute",
      "University",
      "College",
      "Medical",
      "Health",
      "Emergency",
      "Intensive",
      "Care",
      "Protected",
      "Social",
      "Security",
      "Record",
      "Plan",
      "Patient",
      "Subject",
      "Individual",
      "Client",
    ];

    for (const term of nonPersonTerms) {
      if (name.includes(term)) {
        return false;
      }
    }

    // Names should be 2-4 words (First Last, First Middle Last, etc.)
    const wordCount = name.split(/\s+/).length;
    if (wordCount < 2 || wordCount > 4) {
      return false;
    }

    return true;
  }

  /**
   * Pattern 5: Family relationship names (Daughter: Emma, Wife: Mary, etc.)
   *
   * STREET-SMART: When a name appears after a family relationship label
   * (Son:, Daughter:, Wife:, etc.), it's ALWAYS a person name.
   * Don't whitelist based on eponymous disease names (Bell's palsy, Wilson's disease).
   */
  private detectFamilyRelationshipNames(text: string, spans: Span[]): void {
    const relationshipPattern =
      /\b(?:Spouse|Wife|Husband|Father|Mother|Dad|Mom|Brother|Sister|Son|Daughter|Child|Children|Parent|Sibling|Partner|Guardian|Emergency[ \t]+Contact|Next[ \t]+of[ \t]+Kin|NOK)[ \t:]+([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+)?)/gi;

    let match;
    while ((match = relationshipPattern.exec(text)) !== null) {
      const name = match[1];
      const fullMatch = match[0];

      // STREET-SMART: Only skip obvious non-person terms, NOT medical eponyms
      // Context (Son:, Daughter:, etc.) makes it clear this is a person
      if (this.isNonPersonStructureTerm(name)) {
        continue;
      }

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
        confidence: 0.92,
        // STREET-SMART: High priority (150+) = protected from vocabulary filtering
        // Family relationship context is strong evidence this is a person name
        priority: 150,
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

  /**
   * Check if text matches whitelist (case-insensitive)
   * Uses centralized whitelist + DocumentVocabulary for comprehensive coverage
   *
   * IMPORTANT: If text starts with a person title (Dr., Mr., etc.), we should NOT
   * whitelist based on eponymous disease names. "Dr. Wilson" is a person even though
   * "Wilson's disease" exists.
   */
  private isWhitelisted(text: string): boolean {
    const normalized = text.trim();

    // Check if this text starts with a person title - if so, it's a person reference
    // and should NOT be whitelisted based on disease name matches
    const hasTitlePrefix = this.startsWithTitle(normalized);

    // Check local whitelist for document structure terms (always check these)
    for (const whitelisted of this.WHITELIST) {
      if (normalized.toLowerCase().includes(whitelisted.toLowerCase())) {
        return true;
      }
    }

    // If there's a title prefix, this is explicitly a person reference
    // Only whitelist for non-person terms like "Dr. Emergency Department"
    if (hasTitlePrefix) {
      // Only whitelist if the ENTIRE match (minus title) is a non-person term
      const withoutTitle = this.removeTitle(normalized);
      // Check for obvious non-person terms
      const nonPersonTerms = [
        "protected health",
        "social security",
        "medical record",
        "health plan",
        "emergency department",
        "intensive care",
      ];
      for (const term of nonPersonTerms) {
        if (withoutTitle.toLowerCase().includes(term)) {
          return true;
        }
      }
      // Don't whitelist titled names based on medical term matching
      return false;
    }

    // For non-titled text, use normal whitelist checking
    // Check centralized whitelist (includes medical terms, medications, etc.)
    if (centralizedIsWhitelisted(normalized)) {
      return true;
    }

    // Check if it's a known medical term
    if (DocumentVocabulary.isMedicalTerm(normalized)) {
      return true;
    }

    // Check individual words - if ANY word is a medical term, skip entire match
    const words = normalized.split(/[\s,]+/).filter((w) => w.length > 2);
    for (const word of words) {
      if (
        centralizedIsWhitelisted(word) ||
        DocumentVocabulary.isMedicalTerm(word)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if text starts with a person title (Dr., Mr., Mrs., etc.)
   */
  private startsWithTitle(text: string): boolean {
    const titlePattern = new RegExp(
      `^(?:${this.PREFIXES.join("|")})\\.?\\s`,
      "i",
    );
    return titlePattern.test(text);
  }

  /**
   * Remove the title prefix from text
   */
  private removeTitle(text: string): string {
    const titlePattern = new RegExp(
      `^(?:${this.PREFIXES.join("|")})\\.?\\s+`,
      "i",
    );
    return text.replace(titlePattern, "");
  }

  /**
   * STREET-SMART: Check if text is a non-person structure term.
   * This is a MINIMAL whitelist - only obvious document structure terms.
   * Does NOT include medical eponyms (Bell, Wilson, Parkinson, etc.)
   * because in context (Son:, Daughter:, Dr., etc.) these are person names.
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
}
