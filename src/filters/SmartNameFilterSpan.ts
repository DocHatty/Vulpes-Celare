/**
 * SmartNameFilterSpan - Context-Aware Name Detection (Span-Based)
 *
 * Detects names with role/demographic context and returns Spans with metadata.
 * This filter can attach additional context to spans for smart redaction.
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
  NAME_WHITELIST,
  DOCUMENT_TERMS,
  NON_NAME_ENDINGS,
  GEOGRAPHIC_TERMS,
  isWhitelisted as baseIsWhitelisted,
  isExcludedAllCaps,
  isPartOfCompoundPhrase,
} from "./constants/NameFilterConstants";
import { DocumentVocabulary } from "../vocabulary/DocumentVocabulary";
import { MedicalTermDictionary } from "../dictionaries/MedicalTermDictionary";
import { HospitalDictionary } from "../dictionaries/HospitalDictionary";

export class SmartNameFilterSpan extends SpanBasedFilter {
  getType(): string {
    return "NAME";
  }

  getPriority(): number {
    return FilterPriority.NAME;
  }

  detect(text: string, config: any, context: RedactionContext): Span[] {
    const spans: Span[] = [];

    // Pattern 0: Last, First format (medical records)
    this.detectLastFirstNames(text, spans);

    // Pattern 1: Title + Name
    this.detectTitledNames(text, spans);

    // Pattern 2: Patient + Name patterns
    this.detectPatientNames(text, spans);

    // Pattern 3: ALL CAPS NAME patterns
    this.detectPatientAllCapsNames(text, spans);

    // Pattern 4: Standalone ALL CAPS names
    this.detectStandaloneAllCapsNames(text, spans);

    // Pattern 5: Family member names
    this.detectFamilyNames(text, spans);

    // Pattern 6: Name with suffix
    this.detectNamesWithSuffix(text, spans);

    // Pattern 7: Age/gender descriptors with names
    this.detectAgeGenderNames(text, spans);

    // Pattern 8: Possessive forms
    this.detectPossessiveNames(text, spans);

    // Pattern 9: General full names (First Last format)
    this.detectGeneralFullNames(text, spans);

    // Pattern 10: Hyphenated names (Mary-Ann Johnson)
    this.detectHyphenatedNames(text, spans);

    // Pattern 11: Apostrophe names (O'Brien, D'Angelo)
    this.detectApostropheNames(text, spans);

    // Pattern 12: Accented/international names (José García)
    this.detectAccentedNames(text, spans);

    // Pattern 13: Names with particles (van Gogh, de Silva)
    this.detectParticleNames(text, spans);

    // Pattern 14: Team member list names (- Jessica Weber, Oncology)
    this.detectTeamMemberNames(text, spans);

    return spans;
  }

  /**
   * Pattern 1: Title + Name (handles both "Dr. Smith" and "Dr. John Smith")
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

      if (!this.isWhitelisted(matchedText, text) && !this.isHeading(matchedText)) {
        const span = new Span({
          text: matchedText,
          originalValue: matchedText,
          characterStart: match.index,
          characterEnd: match.index + matchedText.length,
          filterType: FilterType.NAME,
          confidence: 0.92,
          priority: this.getPriority(),
          context: this.getContext(text, match.index, matchedText.length),
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
   * Pattern 2: Patient + Name patterns
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

      if (!this.isHeading(fullMatch)) {
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
          context: this.getContext(text, matchPos, fullMatch.length),
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
  }

  /**
   * Pattern 3: Patient + ALL CAPS NAME
   * Matches: PATIENT: JOHN SMITH, Patient: JOHN SMITH, etc.
   */
  private detectPatientAllCapsNames(text: string, spans: Span[]): void {
    // More flexible pattern: allows colon directly after keyword, various spacing
    const pattern =
      /\b(?:Patient|Pt|Subject|Individual|Client|PATIENT|PT|SUBJECT|INDIVIDUAL|CLIENT)\s*[:]\s*([A-Z]{2,}(?:\s+[A-Z]{2,}){1,2})\b/gi;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const name = match[1];
      const words = name.trim().split(/\s+/);

      if (
        words.length >= 2 &&
        words.length <= 3 &&
        words.every((w: string) => w.length >= 2 && /^[A-Z]+$/.test(w))
      ) {
        const excludedAcronyms = new Set([
          "CT",
          "MRI",
          "PET",
          "EKG",
          "ECG",
          "CBC",
          "USA",
          "FBI",
          "CIA",
          "ER",
          "IV",
        ]);
        // Check if any word is an excluded acronym
        const hasExcludedWord = words.some((w: string) =>
          excludedAcronyms.has(w),
        );
        if (!hasExcludedWord && !this.isHeading(name)) {
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
            confidence: 0.92,
            priority: this.getPriority(),
            context: this.getContext(text, matchPos, fullMatch.length),
            window: [],
            replacement: null,
            salt: null,
            pattern: "Patient all caps",
            applied: false,
            ignored: false,
            ambiguousWith: [],
            disambiguationScore: null,
          });
          spans.push(span);
        }
      }
    }
  }

  /**
   * Pattern 4: Standalone ALL CAPS names
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
        words.every((w: string) => w.length >= 2 && /^[A-Z]+$/.test(w))
      ) {
        if (!isExcludedAllCaps(name.trim()) && !this.isHeading(name)) {
          const span = this.createSpanFromMatch(
            text,
            match,
            FilterType.NAME,
            0.75,
          );
          span.context = this.getContext(text, match.index!, name.length);
          spans.push(span);
        }
      }
    }
  }

  /**
   * Pattern 5: Family member names and nicknames/preferred names
   */
  private detectFamilyNames(text: string, spans: Span[]): void {
    // Family member pattern
    const pattern =
      /\b(?:Spouse|Wife|Husband|Father|Mother|Dad|Mom|Brother|Sister|Son|Daughter|Child|Children|Parent|Sibling|Partner|Guardian|Emergency[ \t]+Contact|Next[ \t]+of[ \t]+Kin|NOK)[ \t:]+([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+(?:[ \t]+(?:Jr\.?|Sr\.?|II|III|IV))?)?)\b/gi;

    // Also detect nicknames and preferred names - these can be single words
    const nicknamePattern =
      /\b(?:Preferred[ \t]+Name|Nickname|Also[ \t]+Known[ \t]+As|AKA|Goes[ \t]+By)[ \t]*:[ \t]*([A-Z][a-z]+)\b/gi;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const name = match[1];
      const fullMatch = match[0];
      const matchPos = match.index!;

      if (name && name.length >= 2 && /^[A-Z][a-z]/.test(name)) {
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
          context: this.getContext(text, matchPos, fullMatch.length),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Family member",
          applied: false,
          ignored: false,
          ambiguousWith: [],
          disambiguationScore: null,
        });
        spans.push(span);
      }
    }

    // Process nickname pattern
    nicknamePattern.lastIndex = 0;
    while ((match = nicknamePattern.exec(text)) !== null) {
      const name = match[1];
      const fullMatch = match[0];
      const matchPos = match.index!;

      if (name && name.length >= 2) {
        const nameStart = matchPos + fullMatch.indexOf(name);
        const nameEnd = nameStart + name.length;

        const span = new Span({
          text: name.trim(),
          originalValue: name.trim(),
          characterStart: nameStart,
          characterEnd: nameEnd,
          filterType: FilterType.NAME,
          confidence: 0.92, // High confidence for explicitly labeled nicknames
          priority: this.getPriority(),
          context: this.getContext(text, matchPos, fullMatch.length),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Nickname/Preferred name",
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
   * Pattern 6: Name with suffix (Jr., Sr., III, etc.)
   *
   * IMPORTANT: Names with suffixes like "Jr.", "Sr.", "III" are ALWAYS person names.
   * We should NOT whitelist based on medical term matching because:
   * - "Thomas Parkinson Jr." is a person, not Parkinson's disease
   * - "James Wilson III" is a person, not Wilson's disease
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

      // Only skip for non-person structure terms, NOT medical terms
      // Names with suffix are explicitly person names
      if (this.isNonPersonStructureTerm(name)) {
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
        confidence: 0.92, // Higher confidence for suffix-qualified names
        priority: this.getPriority(),
        context: this.getContext(text, matchPos, fullMatch.length),
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
   * Check if text is a non-person structure term (document sections, etc.)
   * This is a minimal whitelist that should NOT include medical terms
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
    ];
    const lower = text.toLowerCase();
    return structureTerms.some((term) => lower.includes(term));
  }

  /**
   * Pattern 7: Age/gender descriptors with names
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
        context: this.getContext(text, matchPos, fullMatch.length),
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
   * Pattern 8: Possessive forms
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
          context: this.getContext(text, matchPos, name.length),
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
   * Pattern 0: Last, First format
   */
  private detectLastFirstNames(text: string, spans: Span[]): void {
    // OCR-tolerant pattern: Allow digits and symbols in names
    // Start with [A-Z0-9@$|] to handle 5eb@stian, 8cndd@, $har0n, |sabella
    // Allow [a-zA-Z0-9@$|] inside to handle M@rtinEz, HArris
    // ALSO handle spacing errors: "LAST ,FIRST" (space before comma from OCR)
    // Case-insensitive to handle "morgan ,lauren", "COOK ,JAMAL", etc.
    const patterns = [
      // Standard: "Last, First" or "Last, First Middle" (case-insensitive)
      /\b([A-Za-z0-9@$|][a-zA-Z0-9@$|]{2,},[ \t]+[A-Za-z0-9@$|][a-zA-Z0-9@$|]{2,}(?:[ \t]+[A-Za-z0-9@$|][a-zA-Z0-9@$|]{2,})?)\b/gi,
      // OCR spacing error: "Last ,First" (space before comma) - case-insensitive
      /\b([A-Za-z0-9@$|][a-zA-Z0-9@$|]{2,}[ \t]+,[A-Za-z0-9@$|][a-zA-Z0-9@$|]{2,}(?:[ \t]+[A-Za-z0-9@$|][a-zA-Z0-9@$|]{2,})?)\b/gi,
      // OCR spacing error: "Last , First" (space on both sides of comma) - case-insensitive
      /\b([A-Za-z0-9@$|][a-zA-Z0-9@$|]{2,}[ \t]+,[ \t]+[A-Za-z0-9@$|][a-zA-Z0-9@$|]{2,}(?:[ \t]+[A-Za-z0-9@$|][a-zA-Z0-9@$|]{2,})?)\b/gi,
    ];
    
    for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const fullName = match[1];

      if (!this.isWhitelisted(fullName, text) && this.validateLastFirst(fullName)) {
        const span = new Span({
          text: fullName,
          originalValue: fullName,
          characterStart: match.index,
          characterEnd: match.index + fullName.length,
          filterType: FilterType.NAME,
          confidence: 0.93,
          priority: this.getPriority(),
          context: this.getContext(text, match.index, fullName.length),
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
    } // end for loop over patterns
  }

  /**
   * Pattern 9: General full names (First Last format)
   */
  private detectGeneralFullNames(text: string, spans: Span[]): void {
    // OCR-tolerant pattern: Allow digits and symbols in names
    const pattern =
      /\b([A-Z0-9@$|][a-zA-Z0-9@$|]{2,}[ \t]+[A-Z0-9@$|][a-zA-Z0-9@$|]{2,}(?:[ \t]+(?:Jr\.?|Sr\.?|II|III|IV))?)\b/g;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const name = match[1];

      if (
        !this.isWhitelisted(name, text) &&
        !this.isHeading(name) &&
        this.isLikelyPersonName(name, text)
      ) {
        const span = new Span({
          text: name,
          originalValue: name,
          characterStart: match.index,
          characterEnd: match.index + name.length,
          filterType: FilterType.NAME,
          confidence: 0.8,
          priority: this.getPriority(),
          context: this.getContext(text, match.index, name.length),
          window: [],
          replacement: null,
          salt: null,
          pattern: "General full name",
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
   * Helper methods
   */
  private validateLastFirst(name: string): boolean {
    // Normalize spacing around comma for validation
    // Handle "Last, First", "Last ,First", "Last , First"
    const normalized = name.replace(/\s*,\s*/g, ",");
    const parts = normalized.split(",");
    if (parts.length === 2) {
      const lastName = parts[0].trim();
      const firstName = parts[1].trim();
      // Relaxed validation for OCR, but MUST contain at least one letter to avoid "123, 456"
      // Case-insensitive to handle "morgan ,lauren", "COOK ,JAMAL", etc.
      const hasLetter = /[a-zA-Z]/.test(lastName) && /[a-zA-Z]/.test(firstName);
      return (
        hasLetter &&
        /^[A-Za-z0-9@$|][a-zA-Z0-9@$|]{2,}/i.test(lastName) &&
        /^[A-Za-z0-9@$|][a-zA-Z0-9@$|]{2,}/i.test(firstName)
      );
    }
    return false;
  }

  private isLikelyPersonName(text: string, fullContext?: string): boolean {
    if (this.isWhitelisted(text, fullContext)) return false;

    const trimmed = text.trim();
    const isAllCaps =
      /^[A-Z0-9\s]+$/.test(trimmed) &&
      /[A-Z]/.test(trimmed) &&
      trimmed.length > 6;
    if (isAllCaps && trimmed.split(/\s+/).length >= 2) return false;
    if (trimmed.endsWith(":")) return false;

    const words = trimmed.split(/\s+/);
    if (words.length < 2 || words.length > 3) return false;

    const firstWord = words[0];
    const lastWord = words[words.length - 1];

    // PRIMARY CHECK: Use dictionary validation
    // If the first word is NOT a known first name, this is likely not a person name
    // This eliminates false positives like "Timeline Narrative", "Physical Therapy"
    const nameConfidence = NameDictionary.getNameConfidence(trimmed);
    if (nameConfidence < 0.5) {
      // Not a recognized name pattern - reject it
      return false;
    }

    // Use shared constants for validation
    if (DOCUMENT_TERMS.has(firstWord)) return false;
    if (NON_NAME_ENDINGS.has(lastWord)) return false;

    // Check if ANY word in the phrase is in the non-name set (catches middle words)
    for (const word of words) {
      if (DOCUMENT_TERMS.has(word) || NON_NAME_ENDINGS.has(word)) {
        return false;
      }
    }

    // Check geographic terms
    for (const word of words) {
      if (GEOGRAPHIC_TERMS.has(word)) return false;
    }

    if (!words.every((w) => w.length >= 2)) return false;

    for (const word of words) {
      // Relaxed check: Allow OCR characters in words
      if (
        !["Jr", "Jr.", "Sr", "Sr.", "II", "III", "IV"].includes(word) &&
        !/^[A-Z0-9@$|][a-zA-Z0-9@$|]+$/.test(word)
      ) {
        return false;
      }
    }

    return true;
  }

  private getContext(text: string, offset: number, length: number): string {
    const start = Math.max(0, offset - 150);
    const end = Math.min(text.length, offset + length + 150);
    return text.substring(start, end);
  }

  private isHeading(text: string): boolean {
    const trimmed = text.trim();

    // Check if it's ALL CAPS with multiple words (section headers)
    const isAllCaps =
      /^[A-Z0-9\s:]+$/.test(trimmed) &&
      /[A-Z]/.test(trimmed) &&
      trimmed.split(/\s+/).length >= 2;

    // Check if it ends with a colon (labels)
    if (isAllCaps || trimmed.endsWith(":")) return true;

    // Check for common medical document section patterns
    const sectionPatterns = [
      /^(History|Physical|Medical|Surgical|Social|Family|Patient|Provider|Billing|Assessment|Plan|Review|Examination)/i,
      /\b(Information|History|Source|Complaint|Comments|Define)\b/i,
    ];

    for (const pattern of sectionPatterns) {
      if (pattern.test(trimmed)) {
        // Additional check: if it's a two-word phrase starting with these terms, likely a header
        const words = trimmed.split(/\s+/);
        if (words.length === 2 || words.length === 3) {
          return true;
        }
      }
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

  /**
   * Pattern 10: Hyphenated names (Mary-Ann Johnson, Jean-Claude Dupont)
   */
  private detectHyphenatedNames(text: string, spans: Span[]): void {
    // Hyphenated first name with optional last name: Mary-Ann, Mary-Ann Johnson
    const pattern = /\b([A-Z][a-z]+-[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const name = match[1];

      if (!this.isWhitelisted(name, text)) {
        const span = new Span({
          text: name,
          originalValue: name,
          characterStart: match.index,
          characterEnd: match.index + name.length,
          filterType: FilterType.NAME,
          confidence: 0.9,
          priority: this.getPriority(),
          context: this.getContext(text, match.index, name.length),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Hyphenated name",
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
   * Pattern 11: Apostrophe names (O'Brien, D'Angelo, O'Malley)
   */
  private detectApostropheNames(text: string, spans: Span[]): void {
    // Irish/Italian style names: O'Brien, D'Angelo, etc.
    // Also handles: McDonald, MacArthur (Mc/Mac prefix)
    const patterns = [
      /\b([A-Z][''][A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g, // O'Brien, D'Angelo
      /\b((?:Mc|Mac)[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g, // McDonald, MacArthur
    ];

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(text)) !== null) {
        const name = match[1];

        if (!this.isWhitelisted(name, text)) {
          const span = new Span({
            text: name,
            originalValue: name,
            characterStart: match.index,
            characterEnd: match.index + name.length,
            filterType: FilterType.NAME,
            confidence: 0.92,
            priority: this.getPriority(),
            context: this.getContext(text, match.index, name.length),
            window: [],
            replacement: null,
            salt: null,
            pattern: "Apostrophe/prefix name",
            applied: false,
            ignored: false,
            ambiguousWith: [],
            disambiguationScore: null,
          });
          spans.push(span);
        }
      }
    }
  }

  /**
   * Pattern 12: Accented/international names (José García, François Müller)
   */
  private detectAccentedNames(text: string, spans: Span[]): void {
    // Extended Latin characters for international names
    // Covers: á é í ó ú à è ì ò ù ä ë ï ö ü ñ ç ø å æ
    const accentedPattern =
      /\b([A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑÇØÅ][a-záéíóúàèìòùäëïöüñçøå]+(?:\s+[A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑÇØÅ][a-záéíóúàèìòùäëïöüñçøå]+){0,2})\b/gu;
    accentedPattern.lastIndex = 0;
    let match;

    while ((match = accentedPattern.exec(text)) !== null) {
      const name = match[1];

      // Only process if it actually contains accented characters
      if (/[áéíóúàèìòùäëïöüñçøåÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑÇØÅ]/.test(name)) {
        const words = name.split(/\s+/);

        // Must be 1-3 words, each starting with capital
        if (
          words.length >= 1 &&
          words.length <= 3 &&
          !this.isWhitelisted(name, text)
        ) {
          const span = new Span({
            text: name,
            originalValue: name,
            characterStart: match.index,
            characterEnd: match.index + name.length,
            filterType: FilterType.NAME,
            confidence: 0.88,
            priority: this.getPriority(),
            context: this.getContext(text, match.index, name.length),
            window: [],
            replacement: null,
            salt: null,
            pattern: "Accented/international name",
            applied: false,
            ignored: false,
            ambiguousWith: [],
            disambiguationScore: null,
          });
          spans.push(span);
        }
      }
    }
  }

  /**
   * Pattern 13: Names with particles (van Gogh, de Silva, von Neumann)
   */
  private detectParticleNames(text: string, spans: Span[]): void {
    // Common name particles: van, de, von, di, da, du, del, la, le, el, etc.
    const particles =
      "van|de|von|di|da|du|del|della|la|le|el|al|bin|ibn|af|av|ten|ter|vander|vanden";
    const pattern = new RegExp(
      `\\b([A-Z][a-z]+\\s+(?:${particles})\\s+[A-Z][a-z]+)\\b`,
      "gi",
    );
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const name = match[1];

      if (!this.isWhitelisted(name, text)) {
        const span = new Span({
          text: name,
          originalValue: name,
          characterStart: match.index,
          characterEnd: match.index + name.length,
          filterType: FilterType.NAME,
          confidence: 0.89,
          priority: this.getPriority(),
          context: this.getContext(text, match.index, name.length),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Name with particle",
          applied: false,
          ignored: false,
          ambiguousWith: [],
          disambiguationScore: null,
        });
        spans.push(span);
      }
    }

    // Also detect standalone particle surnames (more common in references)
    // e.g., "Dr. van Gogh", "Prof. de Silva"
    const standalonePattern = new RegExp(
      `\\b(?:Dr\\.?|Prof\\.?|Mr\\.?|Mrs\\.?|Ms\\.?)\\s+((?:${particles})\\s+[A-Z][a-z]+)\\b`,
      "gi",
    );
    standalonePattern.lastIndex = 0;

    while ((match = standalonePattern.exec(text)) !== null) {
      const name = match[1];
      const fullMatch = match[0];
      const nameStart = match.index + fullMatch.indexOf(name);

      if (!this.isWhitelisted(name, text)) {
        const span = new Span({
          text: name,
          originalValue: name,
          characterStart: nameStart,
          characterEnd: nameStart + name.length,
          filterType: FilterType.NAME,
          confidence: 0.91,
          priority: this.getPriority(),
          context: this.getContext(text, match.index, fullMatch.length),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Titled particle surname",
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
   * Pattern 14: Team member list names
   * Matches names in team member lists like:
   * - Jessica Weber, Oncology
   * - Dr. Samuel Green, Oncology (attending)
   * TEAM MEMBERS PRESENT:
   * - Kim Clark
   */
  private detectTeamMemberNames(text: string, spans: Span[]): void {
    // Pattern: bullet/dash + optional title + First Last + optional role
    const teamPattern =
      /(?:^|\n)\s*[-•*]\s*(?:Dr\.?\s+)?([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s*,|\s*\(|\s*$)/gm;

    let match;
    while ((match = teamPattern.exec(text)) !== null) {
      const name = match[1].trim();

      // Skip if obviously not a name
      if (this.isNonPersonStructureTerm(name)) {
        continue;
      }

      const fullMatch = match[0];
      const nameStart = match.index + fullMatch.indexOf(name);
      const nameEnd = nameStart + name.length;

      const span = new Span({
        text: name,
        originalValue: name,
        characterStart: nameStart,
        characterEnd: nameEnd,
        filterType: FilterType.NAME,
        confidence: 0.91,
        // High priority - team member context confirms this is a person
        priority: 150,
        context: this.getContext(text, match.index, fullMatch.length),
        window: [],
        replacement: null,
        salt: null,
        pattern: "Team member name",
        applied: false,
        ignored: false,
        ambiguousWith: [],
        disambiguationScore: null,
      });
      spans.push(span);
    }

    // Also detect names after "FAMILY PRESENT:" or similar headers
    const familyPresentPattern =
      /(?:FAMILY\s+PRESENT|FAMILY\s+MEMBERS|CONTACTS?)[\s:]+([A-Z][a-z]+\s+[A-Z][a-z]+)/gi;

    while ((match = familyPresentPattern.exec(text)) !== null) {
      const name = match[1].trim();

      if (this.isNonPersonStructureTerm(name)) {
        continue;
      }

      const fullMatch = match[0];
      const nameStart = match.index + fullMatch.indexOf(name);
      const nameEnd = nameStart + name.length;

      const span = new Span({
        text: name,
        originalValue: name,
        characterStart: nameStart,
        characterEnd: nameEnd,
        filterType: FilterType.NAME,
        confidence: 0.92,
        priority: 150,
        context: this.getContext(text, match.index, fullMatch.length),
        window: [],
        replacement: null,
        salt: null,
        pattern: "Family present name",
        applied: false,
        ignored: false,
        ambiguousWith: [],
        disambiguationScore: null,
      });
      spans.push(span);
    }
  }

  /**
   * Enhanced whitelist check that includes medical terms, hospital names, and word-by-word checking.
   * 
   * WHITELIST PRIORITY (things that should NOT be redacted):
   * 1. Base whitelist (document terms, field labels, etc.)
   * 2. Medical terms (diagnoses, procedures, medications)
   * 3. Hospital names (NOT patient PHI under HIPAA Safe Harbor)
   * 4. Compound phrases ("Johns Hopkins", "Major Depression")
   */
  private isWhitelisted(text: string, context?: string): boolean {
    const normalized = text.trim();

    // Check base whitelist
    if (baseIsWhitelisted(normalized)) {
      return true;
    }

    // Check if it's a medical term
    if (MedicalTermDictionary.isMedicalTerm(normalized)) {
      return true;
    }

    // Check individual words - if ANY word is a medical term, skip entire match
    const words = normalized.split(/[\s,]+/).filter((w) => w.length > 2);
    for (const word of words) {
      if (baseIsWhitelisted(word) || MedicalTermDictionary.isMedicalTerm(word)) {
        return true;
      }
    }
    
    // HOSPITAL WHITELIST: Check if this is part of a hospital name
    // Hospital names are NOT patient PHI under HIPAA Safe Harbor
    if (context && HospitalDictionary.isPartOfHospitalName(normalized, context)) {
      return true;
    }
    
    // Check if this is part of a compound phrase (like "Johns Hopkins", "Major Depression")
    // This prevents redacting words that look like names but are part of known phrases
    if (context && isPartOfCompoundPhrase(normalized, context)) {
      return true;
    }

    return false;
  }
}
