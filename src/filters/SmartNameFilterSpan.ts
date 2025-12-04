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
import { SpanBasedFilter, FilterPriority } from "../core/SpanBasedFilter";
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
import { HospitalDictionary } from "../dictionaries/HospitalDictionary";
import { FieldLabelWhitelist } from "../core/FieldLabelWhitelist";
import {
  NameDetectionUtils,
  PROVIDER_TITLE_PREFIXES,
  PROVIDER_CREDENTIALS,
} from "../utils/NameDetectionUtils";

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

    // Pattern 9a: Labeled names with OCR/noisy spacing (Patient: MAR1A G0NZ ALEZ)
    this.detectLabeledOcrNames(text, spans);

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

  // PROVIDER_TITLE_PREFIXES imported from NameDetectionUtils

  /**
   * Check if a titled name is a PROVIDER name (should NOT be redacted)
   * Provider names with professional titles or credentials are NOT patient PHI
   */
  private isProviderName(matchedText: string, fullContext: string): boolean {
    const trimmed = matchedText.trim();

    // Extract the title (first word)
    const titleMatch = trimmed.match(/^([A-Za-z]+)\.?\s+/);
    if (!titleMatch) return false;

    const title = titleMatch[1];

    // Check if this is a provider title
    if (PROVIDER_TITLE_PREFIXES.has(title)) {
      return true;
    }

    // Also check if the name has professional credentials (e.g., "John Smith, MD")
    // Check the context after the name for credentials
    const nameEnd = fullContext.indexOf(trimmed) + trimmed.length;
    if (nameEnd < fullContext.length) {
      const afterName = fullContext.substring(nameEnd, nameEnd + 30); // Look ahead 30 chars
      // Check for credentials pattern: ", MD" or ", DDS" or ", PhD" etc.
      const credentialPattern =
        /^[,\s]+(?:MD|DO|PhD|DDS|DMD|DPM|DVM|OD|PsyD|PharmD|EdD|DrPH|DC|ND|JD|RN|NP|BSN|MSN|DNP|APRN|CRNA|CNS|CNM|LPN|LVN|CNA|PA|PA-C|PT|DPT|OT|OTR|SLP|RT|RRT|RD|RDN|LCSW|LMFT|LPC|LCPC|FACS|FACP|FACC|FACOG|FASN|FAAN|FAAP|FACHE|Esq|CPA|MBA|MPH|MHA|MHSA|ACNP-BC|FNP-BC|ANP-BC|PNP-BC|PMHNP-BC)\b/i;
      if (credentialPattern.test(afterName)) {
        return true;
      }
    }

    return false;
  }

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
  private isInProviderContext(
    name: string,
    matchIndex: number,
    fullContext: string,
  ): boolean {
    // Look backwards from the match to see if there's a title prefix
    // Use a larger lookback distance to catch "Dame Ananya O'Neill" where O'Neill
    // is separated from Dame by the first name
    const lookBackDistance = 40; // Enough for "Title FirstName MiddleName "
    const startLook = Math.max(0, matchIndex - lookBackDistance);
    const beforeText = fullContext.substring(startLook, matchIndex);

    // Check if text before the name ends with a title prefix (immediate)
    // Pattern: title possibly followed by period and space(s)
    const titlePattern = new RegExp(
      `(?:${Array.from(PROVIDER_TITLE_PREFIXES).join("|")})\\.?\\s*$`,
      "i",
    );
    if (titlePattern.test(beforeText)) {
      return true;
    }

    // ALSO check if there's a title anywhere in the lookback followed by name-like words
    // This catches "Dame Ananya O'Neill" where O'Neill is matched separately
    // Pattern: Title + period? + space + CapitalizedWord(s) + space at end
    const titledNamePattern = new RegExp(
      `(?:${Array.from(PROVIDER_TITLE_PREFIXES).join("|")})\\.?\\s+[A-Z][a-zA-Z'-]+(?:\\s+[A-Z][a-zA-Z'-]+)*\\s*$`,
      "i",
    );
    if (titledNamePattern.test(beforeText)) {
      return true;
    }

    // Also check if this name is followed by professional credentials
    const nameEnd = matchIndex + name.length;
    if (nameEnd < fullContext.length) {
      const afterName = fullContext.substring(nameEnd, nameEnd + 30);
      const credentialPattern =
        /^[,\s]+(?:MD|DO|PhD|DDS|DMD|DPM|DVM|OD|PsyD|PharmD|EdD|DrPH|DC|ND|JD|RN|NP|BSN|MSN|DNP|APRN|CRNA|CNS|CNM|LPN|LVN|CNA|PA|PA-C|PT|DPT|OT|OTR|SLP|RT|RRT|RD|RDN|LCSW|LMFT|LPC|LCPC|FACS|FACP|FACC|FACOG|FASN|FAAN|FAAP|FACHE|FCCP|FAHA|Esq|CPA|MBA|MPH|MHA|MHSA|ACNP-BC|FNP-BC|ANP-BC|PNP-BC|PMHNP-BC|AGNP-C|OTR\/L)\b/i;
      if (credentialPattern.test(afterName)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Pattern 1: Title + Name (handles both "Dr. Smith" and "Dr. John Smith")
   *
   * IMPORTANT: Names with professional titles (Dr., Prof., Hon., Dame, Sir, etc.)
   * are PROVIDER names under HIPAA Safe Harbor and should NOT be redacted.
   * Only patient names should be redacted.
   */
  private detectTitledNames(text: string, spans: Span[]): void {
    // DISABLED: TitledNameFilterSpan now handles all titled names with PROVIDER_NAME type
    // This prevents duplicate detection and ensures consistent labeling
    return;
  }

  /**
   * Pattern 2: Patient + Name patterns
   *
   * CRITICAL: The name capture MUST require proper capitalization (First Last)
   * to avoid matching things like "patient was seen by" as a name.
   * We use case-insensitive for the prefix (Patient/Pt/etc.) but the name
   * itself must be properly capitalized.
   */
  private detectPatientNames(text: string, spans: Span[]): void {
    // First find potential matches with case-insensitive prefix
    const prefixPattern = /\b(?:Patient|Pt|Subject|Individual|Client)[ \t:]+/gi;
    let prefixMatch;

    while ((prefixMatch = prefixPattern.exec(text)) !== null) {
      const afterPrefix = text.substring(
        prefixMatch.index + prefixMatch[0].length,
      );

      // Now match the name with STRICT capitalization (case-sensitive)
      // Name must be: Capital + lowercase, optionally with middle initial and last name
      const namePattern =
        /^([A-Z][a-z]{2,}(?:[ \t]+[A-Z]\.?)?(?:[ \t]+[A-Z][a-z]{2,}){1,2})\b/;
      const nameMatch = afterPrefix.match(namePattern);

      if (nameMatch) {
        const name = nameMatch[1];
        const fullMatch = prefixMatch[0] + name;
        const matchPos = prefixMatch.index;

        if (!this.isHeading(fullMatch)) {
          const nameStart = matchPos + prefixMatch[0].length;
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

  // PROVIDER_CREDENTIALS imported from NameDetectionUtils

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
  private detectNamesWithSuffix(text: string, spans: Span[]): void {
    // STRICT pattern: Name must have proper capitalization (case-sensitive)
    // Only the suffix matching is case-insensitive
    const suffixPattern = new RegExp(
      `(?:${NAME_SUFFIXES.join("|")})\\.?\\b`,
      "gi",
    );

    // Find all suffix occurrences
    let suffixMatch;
    while ((suffixMatch = suffixPattern.exec(text)) !== null) {
      // Look backwards from the suffix to find the name
      const beforeSuffix = text.substring(0, suffixMatch.index);

      // Match name with STRICT capitalization (case-sensitive)
      // Pattern: "First Last ,?" at the end of beforeSuffix
      const namePattern =
        /([A-Z][a-z]+(?:[ \t]+[A-Z]\.?)?[ \t]+[A-Z][a-z]+)[ \t]*,?[ \t]*$/;
      const nameMatch = beforeSuffix.match(namePattern);

      if (!nameMatch || nameMatch.index === undefined) continue;

      const name = nameMatch[1];
      const nameMatchIndex = nameMatch.index;
      const fullMatch =
        name +
        beforeSuffix.substring(nameMatchIndex + name.length) +
        suffixMatch[0];

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

      // Calculate the actual position of the name in the text
      const nameStartPos = nameMatchIndex;
      const nameEndPos = nameStartPos + name.length;

      // CRITICAL: Skip if this name appears in a provider context
      // (preceded by a title like Dr., Prof., Mr., etc.)
      if (this.isInProviderContext(name, nameStartPos, text)) {
        continue;
      }

      // CRITICAL: Check if this is a PROVIDER with professional credentials
      // Extract the suffix from the full match
      const extractedSuffix = suffixMatch[0].replace(/\.$/, "").toUpperCase();
      // If suffix is a provider credential, skip - this is a provider name
      if (PROVIDER_CREDENTIALS.has(extractedSuffix)) {
        continue;
      }

      const nameStart = nameStartPos;
      const nameEnd = nameEndPos;

      const span = new Span({
        text: name,
        originalValue: name,
        characterStart: nameStart,
        characterEnd: nameEnd,
        filterType: FilterType.NAME,
        confidence: 0.92, // Higher confidence for suffix-qualified names
        priority: this.getPriority(),
        context: this.getContext(text, nameStart, fullMatch.length),
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
   * Delegates to shared NameDetectionUtils
   */
  private isNonPersonStructureTerm(text: string): boolean {
    return NameDetectionUtils.isNonPersonStructureTerm(text);
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
   *
   * CRITICAL: This pattern must be STRICT to avoid false positives.
   * The pattern requires proper capitalization: Capital letter followed by lowercase.
   */
  private detectLastFirstNames(text: string, spans: Span[]): void {
    // STRICT pattern: "Last, First" format with proper capitalization
    // Each word must start with capital letter followed by at least 2 lowercase letters
    const pattern =
      /\b([A-Z][a-z]{2,},[ \t]+[A-Z][a-z]{2,}(?:[ \t]+[A-Z][a-z]{2,})?)\b/g;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const fullName = match[1];

      // CRITICAL: Check if preceded by a provider title (with name in between)
      // "Hon. Javier Rosen, AGNP" -> "Rosen, AGNP" should NOT be detected
      const lookbackStart = Math.max(0, match.index - 30);
      const textBefore = text.substring(lookbackStart, match.index);
      const titleNamePattern = new RegExp(
        `\\b(${Array.from(PROVIDER_TITLE_PREFIXES).join("|")})\\.?\\s+[A-Za-z]+\\s*$`,
        "i",
      );
      if (titleNamePattern.test(textBefore)) {
        continue;
      }

      // CRITICAL: Skip if second part is a credential (AGNP, RN, MD, etc.)
      const parts = fullName.split(/\s*,\s*/);
      if (parts.length === 2) {
        const secondPart = parts[1].split(/\s+/)[0]; // Get first word after comma
        if (PROVIDER_CREDENTIALS.has(secondPart.toUpperCase())) {
          continue;
        }
      }

      if (
        !this.isWhitelisted(fullName, text) &&
        this.validateLastFirst(fullName)
      ) {
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
  }

  /**
   * Pattern 9: General full names (First Last format)
   *
   * CRITICAL: This pattern must be STRICT to avoid false positives.
   * The pattern requires proper capitalization: Capital letter followed by lowercase.
   * This prevents matching things like "Apixaban 5mg" or "takes Apixaban" as names.
   */
  private detectGeneralFullNames(text: string, spans: Span[]): void {
    // STRICT pattern: First Last format with proper capitalization
    // Each word must start with capital letter followed by at least 2 lowercase letters
    // This matches: "John Smith", "Mary Johnson Jr."
    // This does NOT match: "Apixaban 5mg", "takes Apixaban", "CT Scan"
    const pattern =
      /\b([A-Z][a-z]{2,}[ \t]+[A-Z][a-z]{2,}(?:[ \t]+(?:Jr\.?|Sr\.?|II|III|IV))?)\b/g;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const name = match[1];

      // CRITICAL: Skip if the FIRST word of the match is a provider title
      // "Dame Joshua" should NOT be detected because "Dame" is a title
      const firstWord = name.split(/\s+/)[0].replace(/[.,!?;:'"]+$/, "");
      if (PROVIDER_TITLE_PREFIXES.has(firstWord)) {
        continue;
      }

      // CRITICAL: Skip if this name appears in a provider context
      // (preceded by a title like Dr., Prof., Mr., etc. OR followed by credentials)
      if (this.isInProviderContext(name, match.index, text)) {
        continue;
      }

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
  private detectLabeledOcrNames(text: string, spans: Span[]): void {
    const labeledPattern =
      /\b(?:patient(?:\s+name)?|pt(?:\s*name)?|emergency\s+contact|next\s+of\s+kin|contact|guardian|spouse|mother|father|daughter|son|caregiver)[\s:;#-]*([A-Z0-9][A-Za-z0-9'`’.-]{1,40}(?:\s+[A-Z0-9][A-Za-z0-9'`’.-]{1,40}){0,2})/gi;

    labeledPattern.lastIndex = 0;
    let match;

    while ((match = labeledPattern.exec(text)) !== null) {
      const rawName = match[1];
      const normalizedName = this.normalizeOcrName(rawName);

      if (!this.isNoisyNameCandidate(normalizedName)) {
        continue;
      }

      // Skip provider contexts (Dr., Prof., credentials) even if labeled
      if (this.isInProviderContext(normalizedName, match.index, text)) {
        continue;
      }

      const nameStart = match.index + match[0].indexOf(rawName);
      const span = new Span({
        text: rawName,
        originalValue: rawName,
        characterStart: nameStart,
        characterEnd: nameStart + rawName.length,
        filterType: FilterType.NAME,
        confidence: 0.91,
        priority: this.getPriority(),
        context: this.getContext(text, nameStart, rawName.length),
        window: [],
        replacement: null,
        salt: null,
        pattern: "Labeled noisy name",
        applied: false,
        ignored: false,
        ambiguousWith: [],
        disambiguationScore: null,
      });

      spans.push(span);
    }
  }

  /**
   * Normalize common OCR substitutions in names
   */
  private normalizeOcrName(name: string): string {
    const cleaned = name
      .replace(/[0O]/g, "o")
      .replace(/[1Il|]/g, "l")
      .replace(/[5Ss]/g, "s")
      .replace(/[8B]/g, "b")
      .replace(/[6G]/g, "g");

    return cleaned
      .split(/\s+/)
      .filter((part) => part.length > 0)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }

  /**
   * Validate whether an OCR-normalized candidate looks like a person name
   */
  private isNoisyNameCandidate(name: string): boolean {
    const pieces = name.split(/\s+/).filter((p) => p.length > 1);
    if (pieces.length === 0) return false;

    const allLookLikeNames = pieces.every((piece) =>
      /^[A-Z][a-z'`’.-]{1,}$/.test(piece),
    );

    return allLookLikeNames && this.isLikelyPersonName(name);
  }

  /**
   * Helper methods - Delegates to shared NameDetectionUtils
   */
  private validateLastFirst(name: string): boolean {
    return NameDetectionUtils.validateLastFirstStrict(name);
  }

  private isLikelyPersonName(text: string, fullContext?: string): boolean {
    if (this.isWhitelisted(text, fullContext)) return false;
    return NameDetectionUtils.isLikelyPersonName(text, fullContext);
  }

  private getContext(text: string, offset: number, length: number): string {
    return NameDetectionUtils.extractContext(text, offset, length, 150);
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

      // Skip provider names (preceded by title or followed by credentials)
      if (this.isInProviderContext(name, match.index, text)) {
        continue;
      }

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

        // Skip provider names (preceded by title or followed by credentials)
        if (this.isInProviderContext(name, match.index, text)) {
          continue;
        }

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

      // Skip provider names (preceded by title or followed by credentials)
      if (this.isInProviderContext(name, match.index, text)) {
        continue;
      }

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

      // Skip provider names (preceded by title or followed by credentials)
      if (this.isInProviderContext(name, match.index, text)) {
        continue;
      }

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

    // NOTE: We intentionally DO NOT detect "Dr. van Gogh", "Prof. de Silva" etc.
    // These are explicitly titled names = provider names = NOT PHI
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

    // CRITICAL: Check FieldLabelWhitelist FIRST - this is the centralized whitelist
    // This was missing and caused 98% -> 26% specificity drop!
    if (FieldLabelWhitelist.shouldExclude(normalized)) {
      return true;
    }

    // Check base whitelist from NameFilterConstants
    if (baseIsWhitelisted(normalized)) {
      return true;
    }

    // Check if it's a medical term
    if (DocumentVocabulary.isMedicalTerm(normalized)) {
      return true;
    }

    // Check individual words - if ANY word is a medical term, skip entire match
    const words = normalized.split(/[\s,]+/).filter((w) => w.length > 2);
    for (const word of words) {
      if (FieldLabelWhitelist.shouldExclude(word)) {
        return true;
      }
      if (baseIsWhitelisted(word) || DocumentVocabulary.isMedicalTerm(word)) {
        return true;
      }
    }

    // HOSPITAL WHITELIST: Check if this is part of a hospital name
    // Hospital names are NOT patient PHI under HIPAA Safe Harbor
    if (
      context &&
      HospitalDictionary.isPartOfHospitalName(normalized, context)
    ) {
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
