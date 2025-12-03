/**
 * TitledNameFilterSpan - Titled Name Detection (Span-Based)
 *
 * Detects names with formal titles (Dr., Mr., Mrs., etc.) and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */

import { Span, FilterType } from "../models/Span";
import { SpanBasedFilter, FilterPriority } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
import { isWhitelisted as centralizedIsWhitelisted } from "./constants/NameFilterConstants";
import { DocumentVocabulary } from "../vocabulary/DocumentVocabulary";
import {
  NameDetectionUtils,
  PROVIDER_TITLE_PREFIXES,
} from "../utils/NameDetectionUtils";

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

  // WHITELIST functionality now provided by NameDetectionUtils.isNonPersonStructureTerm()

  getType(): string {
    return "PROVIDER_NAME"; // Titled names are provider names - redacted but labeled differently
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
   * NEW APPROACH: Redact as PROVIDER_NAME for consistency and context
   * Names after role labels like "Attending:", "Surgeon:", etc. are providers
   */
  private detectProviderRoleNames(text: string, spans: Span[]): void {
    const rolePattern =
      /\b(?:Referring|Consulting|Ordering|Sonographer|Interpreting|Radiologist|Pathologist|Surgeon|Anesthesiologist|Attending|Resident|Nurse|Therapist|Technician|Technologist|Endoscopist|Assistant|Cardiologist|Neurologist|Oncologist|Provider|Physician|Psychiatrist|Psychologist|Dentist|Hygienist|Charge Nurse|Primary Nurse|Supervising|Laboratory Director)(?:\s+(?:Physician|Provider|Doctor|Nurse|Specialist))?\s*:\s*(?:Dr\.?\s+)?([A-Z][a-z]+(?:[,\s]+[A-Z][a-z]+)*(?:[,\s]+(?:MD|DO|PhD|RN|NP|PA|DPT|OT|PT|LCSW|MSN|BSN))?)/gi;

    let match;
    while ((match = rolePattern.exec(text)) !== null) {
      const name = match[1].trim();
      const fullMatch = match[0];

      if (this.isNonPersonStructureTerm(name)) {
        continue;
      }

      const matchPos = match.index;
      const nameStart = matchPos + fullMatch.lastIndexOf(name);
      const nameEnd = nameStart + name.length;

      const span = new Span({
        text: name,
        originalValue: name,
        characterStart: nameStart,
        characterEnd: nameEnd,
        filterType: FilterType.PROVIDER_NAME,
        confidence: 0.92,
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

  // PROVIDER_TITLE_PREFIXES imported from NameDetectionUtils

  /**
   * Check if a titled name is a PROVIDER name (should NOT be redacted)
   * In medical documents, ALL titled names are providers - patients don't have titles
   */
  private isProviderTitledName(matchedText: string): boolean {
    const trimmed = matchedText.trim();
    const titleMatch = trimmed.match(/^([A-Za-z]+)\.?\s+/i);
    if (!titleMatch) return false;

    const title = titleMatch[1];
    // Check case-insensitively
    for (const prefix of PROVIDER_TITLE_PREFIXES) {
      if (title.toLowerCase() === prefix.toLowerCase()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Pattern 1: Title + Name (handles both "Dr. Smith" and "Dr. John Smith")
   * Matches: Dr. Smith, Dr. John Smith, Mr. Robert Jones, etc.
   *
   * NEW APPROACH: Redact ALL names but label titled names as PROVIDER_NAME
   * This maintains context ("Dr. Smith" -> "{{PROVIDER_1}}") while ensuring
   * consistent redaction and document coherence.
   */
  private detectTitledNames(text: string, spans: Span[]): void {
    // Extended prefixes to catch all titled names
    const allPrefixes = [
      ...this.PREFIXES,
      "Dame",
      "Sir",
      "Lord",
      "Lady",
      "Baron",
      "Count",
      "Duke",
      "Earl",
      "Msgr",
      "Fr",
      "Br",
      "Rabbi",
      "Imam",
      "Pastor",
      "Bishop",
      "Archbishop",
      "Cardinal",
      "Deacon",
      "Elder",
      "Atty",
      "Judge",
      "Justice",
      "Cmdr",
      "Adm",
      "Maj",
      "Chief",
      "Cpl",
      "Pvt",
      "Officer",
    ];

    const titlePattern = new RegExp(
      `\\b(?:${allPrefixes.join("|")})\\.?[ \\t]+[A-Z][a-z]+(?:[ \\t]+[A-Z][a-z]+)*\\b`,
      "gi",
    );

    let match;
    while ((match = titlePattern.exec(text)) !== null) {
      const matchedText = match[0];

      // Skip document structure terms
      if (this.isWhitelisted(matchedText)) {
        continue;
      }

      const span = new Span({
        text: matchedText,
        originalValue: matchedText,
        characterStart: match.index,
        characterEnd: match.index + matchedText.length,
        filterType: FilterType.PROVIDER_NAME,
        confidence: 0.92,
        priority: 150,
        context: this.extractContext(
          text,
          match.index,
          match.index + matchedText.length,
        ),
        window: [],
        replacement: null,
        salt: null,
        pattern: "Titled provider name",
        applied: false,
        ignored: false,
        ambiguousWith: [],
        disambiguationScore: null,
      });
      spans.push(span);
    }
  }

  /**
   * Pattern 2: Title + Name + Suffix (Dr. John Smith Jr., Prof. Jane Doe MD)
   *
   * NEW APPROACH: Redact as PROVIDER_NAME for consistency
   */
  private detectTitledNamesWithSuffix(text: string, spans: Span[]): void {
    const allPrefixes = [
      ...this.PREFIXES,
      "Dame",
      "Sir",
      "Lord",
      "Lady",
      "Baron",
      "Count",
      "Duke",
      "Earl",
    ];
    const allSuffixes = [
      ...this.SUFFIXES,
      "DO",
      "DPM",
      "DVM",
      "OD",
      "PsyD",
      "PharmD",
      "EdD",
      "DrPH",
      "DC",
      "ND",
      "BSN",
      "DNP",
      "APRN",
      "CRNA",
      "CNS",
      "CNM",
      "LPN",
      "LVN",
      "CNA",
      "PA-C",
      "PT",
      "DPT",
      "OT",
      "OTR",
      "SLP",
      "RT",
      "RRT",
      "RD",
      "RDN",
      "LCSW",
      "LMFT",
      "LPC",
      "LCPC",
      "FACS",
      "FACP",
      "FACC",
      "FACOG",
      "FASN",
      "FAAN",
      "FAAP",
      "FACHE",
      "FCCP",
      "FAHA",
      "CPA",
      "MBA",
      "MPH",
    ];

    const titleSuffixPattern = new RegExp(
      `\\b(?:${allPrefixes.join("|")})\\.?[ \\t]+[A-Z][a-z]+(?:[ \\t]+[A-Z][a-z]+)*[ \\t]*,?[ \\t]*(?:${allSuffixes.join("|")})\\.?\\b`,
      "gi",
    );

    let match;
    while ((match = titleSuffixPattern.exec(text)) !== null) {
      const matchedText = match[0];

      if (!this.isWhitelisted(matchedText)) {
        const span = new Span({
          text: matchedText,
          originalValue: matchedText,
          characterStart: match.index,
          characterEnd: match.index + matchedText.length,
          filterType: FilterType.PROVIDER_NAME,
          confidence: 0.95,
          priority: 155, // Higher priority for more complete matches
          context: this.extractContext(
            text,
            match.index,
            match.index + matchedText.length,
          ),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Titled provider name with credentials",
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
   *
   * CRITICAL: This pattern is DISABLED because SmartNameFilterSpan handles
   * Last, First detection with proper validation to avoid false positives.
   */
  private detectLastFirstNames(text: string, spans: Span[]): void {
    // DISABLED: SmartNameFilterSpan handles this pattern with proper validation.
    return;
  }

  /**
   * Pattern 4: General Full Names (First Last or First Middle Last)
   * Detects standard full name patterns without titles
   *
   * IMPORTANT: Names starting with provider titles (Dame, Sir, Mr, Mrs, etc.)
   * are provider names and should NOT be redacted under HIPAA Safe Harbor
   *
   * CRITICAL: This pattern is DISABLED because it's too aggressive and matches
   * medical diagnoses like "Trigeminal Neuralgia", "Bell Palsy", etc.
   * Name detection should be handled by SmartNameFilterSpan which has proper
   * dictionary validation.
   */
  private detectGeneralFullNames(text: string, spans: Span[]): void {
    // DISABLED: This pattern matches too many false positives (medical diagnoses,
    // procedures, etc.) because it just looks for 2-4 capitalized words.
    // SmartNameFilterSpan handles general name detection with proper validation.
    return;
  }

  /**
   * Validate that Last, First pattern is a likely person name
   * Delegates to shared NameDetectionUtils
   */
  private validateLastFirst(lastName: string, firstNames: string): boolean {
    const combined = `${lastName}, ${firstNames}`;
    return NameDetectionUtils.validateLastFirst(combined);
  }

  /**
   * Check if a capitalized word sequence is likely a person name
   * Delegates to shared NameDetectionUtils
   */
  private isLikelyPersonName(name: string): boolean {
    return NameDetectionUtils.isLikelyPersonName(name);
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
   * Uses NameDetectionUtils + DocumentVocabulary for comprehensive coverage
   *
   * IMPORTANT: If text starts with a person title (Dr., Mr., etc.), we should NOT
   * whitelist based on eponymous disease names. "Dr. Wilson" is a person even though
   * "Wilson's disease" exists.
   */
  private isWhitelisted(text: string): boolean {
    const normalized = text.trim();

    // Check if this text starts with a person title - if so, it's a person reference
    // and should NOT be whitelisted based on disease name matches
    const hasTitlePrefix = NameDetectionUtils.startsWithTitle(normalized);

    // Check for non-person structure terms (always check these)
    if (NameDetectionUtils.isNonPersonStructureTerm(normalized)) {
      return true;
    }

    // If there's a title prefix, this is explicitly a person reference
    // Only whitelist for non-person terms like "Dr. Emergency Department"
    if (hasTitlePrefix) {
      // Only whitelist if the ENTIRE match (minus title) is a non-person term
      const withoutTitle = NameDetectionUtils.removeTitle(normalized);
      if (NameDetectionUtils.isNonPersonStructureTerm(withoutTitle)) {
        return true;
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
   * Delegates to shared NameDetectionUtils
   */
  private startsWithTitle(text: string): boolean {
    return NameDetectionUtils.startsWithTitle(text);
  }

  /**
   * Remove the title prefix from text
   * Delegates to shared NameDetectionUtils
   */
  private removeTitle(text: string): string {
    return NameDetectionUtils.removeTitle(text);
  }

  /**
   * Check if text is a non-person structure term.
   * Delegates to shared NameDetectionUtils
   */
  private isNonPersonStructureTerm(text: string): boolean {
    return NameDetectionUtils.isNonPersonStructureTerm(text);
  }
}
