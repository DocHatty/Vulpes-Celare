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
import { SpanBasedFilter, FilterPriority } from "../core/SpanBasedFilter";
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
import { HospitalDictionary } from "../dictionaries/HospitalDictionary";
import {
  NameDetectionUtils,
  PROVIDER_TITLE_PREFIXES,
  PROVIDER_CREDENTIALS,
} from "../utils/NameDetectionUtils";
import { RustNameScanner } from "../utils/RustNameScanner";

export class FormattedNameFilterSpan extends SpanBasedFilter {
  getType(): string {
    return "NAME";
  }

  getPriority(): number {
    return FilterPriority.NAME;
  }

  detect(text: string, config: any, context: RedactionContext): Span[] {
    const spans: Span[] = [];

    // Rust accelerator mode (shared with SmartNameFilterSpan)
    // Default to level 2 (Last,First + First Last patterns in Rust)
    const accelMode = process.env.VULPES_NAME_ACCEL ?? "2";
    const useRustCommaNames =
      accelMode === "1" || accelMode === "2" || accelMode === "3";
    const useRustFirstLastNames = accelMode === "2" || accelMode === "3";

    // Pattern -1: Labeled name fields ("Name:", "Patient:", "Member Name:", etc.)
    // This is high-sensitivity and high-precision because it only triggers in explicit name fields.
    this.detectLabeledNameFields(text, spans);

    // Pattern 0: Last, First format (medical records format)
    if (useRustCommaNames) {
      this.detectRustLastFirstNames(text, spans);
    } else {
      this.detectLastFirstNames(text, spans);
    }

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
    if (useRustFirstLastNames) {
      this.detectRustFirstLastNames(text, spans);
    } else {
      this.detectGeneralFullNames(text, spans);
    }

    // Pattern 9: Names with credential suffixes (RN, NP, MD, etc.)
    this.detectNamesWithCredentials(text, spans);

    return spans;
  }

  /**
   * Detect explicit "name field" values.
   * These are very high-signal contexts in clinical/admin documents and should not be missed.
   */
  private detectLabeledNameFields(text: string, spans: Span[]): void {
    const pattern =
      /\b(?:name|patient\s+name|member\s+name|legal\s+name(?:\s*\([^)]*\))?|patient)\s*:\s*([^\r\n]{2,120})/gim;

    const terminator =
      /\b(?:preferred\s+name|date\s+of\s+birth|dob|medical\s+record|member\s+id|member\s+id|group|mrn|id)\b/i;

    const covered = new Set(
      spans.map((s) => `${s.characterStart}-${s.characterEnd}`),
    );
    let match;
    pattern.lastIndex = 0;

    while ((match = pattern.exec(text)) !== null) {
      const rawFieldValue = match[1];
      const cutAt = rawFieldValue.search(terminator);
      const rawCandidate = (
        cutAt >= 0 ? rawFieldValue.slice(0, cutAt) : rawFieldValue
      ).replace(/\s+$/g, "");

      const trimmedLeft = rawCandidate.length - rawCandidate.trimStart().length;
      const trimmedRight = rawCandidate.length - rawCandidate.trimEnd().length;
      const start = match.index + match[0].indexOf(rawFieldValue) + trimmedLeft;
      const end = start + rawCandidate.length - trimmedLeft - trimmedRight;

      if (start < 0 || end <= start || end > text.length) continue;

      const candidateText = text.substring(start, end).trim();
      if (candidateText.length < 3) continue;
      if (/^(?:n\/a|none|unknown)$/i.test(candidateText)) continue;

      // Must look like a person name: either multiple tokens, or a strong punctuation marker.
      const tokens = candidateText.split(/\s+/).filter(Boolean);
      const hasStrongMarker = /[,.'-]/.test(candidateText);
      if (tokens.length < 2 && !hasStrongMarker) continue;

      // Avoid swallowing the next label if we accidentally included it.
      if (terminator.test(candidateText)) continue;

      const posKey = `${start}-${end}`;
      if (covered.has(posKey)) continue;
      covered.add(posKey);

      spans.push(
        new Span({
          text: text.substring(start, end),
          originalValue: text.substring(start, end),
          characterStart: start,
          characterEnd: end,
          filterType: FilterType.NAME,
          confidence: 0.98,
          priority: 180,
          context: this.extractContext(text, start, end),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Labeled name field",
          applied: false,
          ignored: false,
          ambiguousWith: [],
          disambiguationScore: null,
        }),
      );
    }
  }

  /**
   * Pattern 0: Last, First format (both mixed case and ALL CAPS)
   * STREET-SMART: "Last, First" and "Last, First Middle" formats are highly specific
   * to person names in medical documents. Don't whitelist based on individual words.
   */
  private detectLastFirstNames(text: string, spans: Span[]): void {
    // Mixed case: Smith, John (with optional space after comma)
    const mixedCasePattern =
      /\b([A-Z][a-z]{2,},[ \t]*[A-Z][a-z]{2,}(?:[ \t]+[A-Z][a-z]{2,})?)\b/g;
    mixedCasePattern.lastIndex = 0;
    let match;

    while ((match = mixedCasePattern.exec(text)) !== null) {
      const fullName = match[1];

      // CRITICAL: Check if name is PRECEDED by a provider title
      // "Hon. Rosen, Javier" -> should NOT be redacted
      const lookbackStart = Math.max(0, match.index - 10);
      const textBefore = text.substring(lookbackStart, match.index);
      const titleBeforeMatch = textBefore.match(/\b([A-Za-z]+)\.?\s*$/);
      if (titleBeforeMatch) {
        const possibleTitle = titleBeforeMatch[1];
        let isPrecededByTitle = false;
        for (const prefix of PROVIDER_TITLE_PREFIXES) {
          if (possibleTitle.toLowerCase() === prefix.toLowerCase()) {
            isPrecededByTitle = true;
            break;
          }
        }
        if (isPrecededByTitle) {
          continue;
        }
      }

      // STREET-SMART: For "Last, First [Middle]" format, only check if the ENTIRE
      // phrase is a medical term, not individual words. "Clark, Patricia Ann" should
      // NOT be blocked just because "Ann" is in Ann Arbor staging.
      if (
        !this.isWhitelistedLastFirst(fullName) &&
        this.validateLastFirst(fullName)
      ) {
        const span = new Span({
          text: fullName,
          originalValue: fullName,
          characterStart: match.index,
          characterEnd: match.index + fullName.length,
          filterType: FilterType.NAME,
          confidence: 0.93,
          // STREET-SMART: Priority 150+ bypasses individual word whitelist filtering
          // "Last, First [Middle]" format is highly specific to person names
          priority: 150,
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

    // OCR variant: comma with space before it "Garcia ,Charles"
    const spaceBeforeCommaPattern =
      /\b([A-Z][a-z]{2,})\s*,\s*([A-Z][a-z]{2,}(?:[ \t]+[A-Z][a-z]{2,})?)\b/g;
    spaceBeforeCommaPattern.lastIndex = 0;

    while ((match = spaceBeforeCommaPattern.exec(text)) !== null) {
      const fullName = match[0];
      const normalized = `${match[1]}, ${match[2]}`;

      if (
        !this.isWhitelistedLastFirst(normalized) &&
        this.validateLastFirst(normalized)
      ) {
        const span = new Span({
          text: fullName,
          originalValue: fullName,
          characterStart: match.index,
          characterEnd: match.index + fullName.length,
          filterType: FilterType.NAME,
          confidence: 0.9,
          // STREET-SMART: Priority 150+ bypasses individual word whitelist filtering
          priority: 150,
          context: this.extractContext(
            text,
            match.index,
            match.index + fullName.length,
          ),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Last, First format (spacing variant)",
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
          !this.isWhitelisted(fullName, true, text) // STREET-SMART: use ALL CAPS mode with context
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

      // CRITICAL: Check if preceded by a provider title (with name in between)
      // "Hon. Javier Rosen, AGNP" -> "Rosen, AGNP" should NOT be detected
      const lookbackStart = Math.max(0, match.index - 30);
      const textBefore = text.substring(lookbackStart, match.index);
      // Check for title followed by name(s) at end of lookback
      const titleNamePattern = new RegExp(
        `\\b(${Array.from(PROVIDER_TITLE_PREFIXES).join("|")})\\.?\\s+[A-Za-z]+\\s*$`,
        "i",
      );
      if (titleNamePattern.test(textBefore)) {
        continue;
      }

      const parts = fullName.split(",");
      if (parts.length !== 2) continue;

      const lastName = parts[0].trim();
      const firstName = parts[1].trim();

      // CRITICAL: Skip if "firstName" is actually a credential (AGNP, RN, MD, etc.)
      const credentials = new Set([
        "MD",
        "DO",
        "PhD",
        "DDS",
        "DMD",
        "RN",
        "NP",
        "PA",
        "LPN",
        "APRN",
        "CRNA",
        "CNS",
        "CNM",
        "BSN",
        "MSN",
        "DNP",
        "PT",
        "OT",
        "SLP",
        "RT",
        "LCSW",
        "LMFT",
        "LPC",
        "AGNP",
        "FNP",
        "ANP",
        "PNP",
        "PMHNP",
      ]);
      if (credentials.has(firstName.toUpperCase())) {
        continue;
      }

      // Validate: each part 2+ chars, looks like a name
      if (
        lastName.length >= 2 &&
        firstName.length >= 2 &&
        !this.isWhitelisted(fullName, false, text) &&
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

  // PROVIDER_TITLE_PREFIXES imported from NameDetectionUtils

  /**
   * Check if a titled name is a PROVIDER name (should NOT be redacted)
   * Delegates to shared NameDetectionUtils
   */
  private isProviderTitledName(matchedText: string): boolean {
    return NameDetectionUtils.startsWithTitle(matchedText);
  }

  /**
   * Pattern 0.5: Titled names (Dr. Smith, Mr. Jones)
   *
   * IMPORTANT: Titled names are PROVIDER names under HIPAA Safe Harbor
   * and should NOT be redacted. Patients don't have formal titles.
   */
  private detectTitledNames(text: string, spans: Span[]): void {
    // CRITICAL: ALL titled names are provider names - skip this pattern entirely
    // This method is kept for backwards compatibility but should not add any spans
    return;

    // Dead code below - kept for reference but never executes
    const pattern = new RegExp(
      `\\b(?:${NAME_PREFIXES.join("|")})\\.?[ \\t]+[A-Z][a-z]+(?:[ \\t]+[A-Z][a-z]+)*\\b`,
      "g",
    );
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const matchedText = match[0];

      if (!this.isWhitelisted(matchedText, false, text)) {
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

      if (!this.isWhitelisted(name, false, text)) {
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

      // Skip if whitelisted (medications, medical terms, hospital names, etc.)
      if (this.isWhitelisted(name, false, text)) {
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

      // CRITICAL: Check if FIRST word of name is a provider title
      // "Dame Joshua" should NOT be detected because "Dame" is a title
      const firstWord = name.split(/\s+/)[0];
      if (PROVIDER_TITLE_PREFIXES.has(firstWord)) {
        continue;
      }

      // CRITICAL: Check if name is PRECEDED by a provider title
      // "Dr. Hassan Lindberg" -> "Hassan Lindberg" should NOT be redacted
      const lookbackStart = Math.max(0, match.index - 10);
      const textBefore = text.substring(lookbackStart, match.index);
      const titleBeforeMatch = textBefore.match(/\b([A-Za-z]+)\.?\s*$/);
      if (titleBeforeMatch) {
        const possibleTitle = titleBeforeMatch[1];
        let isPrecededByTitle = false;
        for (const prefix of PROVIDER_TITLE_PREFIXES) {
          if (possibleTitle.toLowerCase() === prefix.toLowerCase()) {
            isPrecededByTitle = true;
            break;
          }
        }
        if (isPrecededByTitle) {
          continue;
        }
      }

      if (
        !this.isWhitelisted(name, false, text) &&
        this.isLikelyPersonName(name)
      ) {
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
   * Validation helpers - Delegates to shared NameDetectionUtils
   */
  private validateLastFirst(name: string): boolean {
    return NameDetectionUtils.validateLastFirst(name);
  }

  /**
   * STREET-SMART: Special whitelist check for "Last, First [Middle]" format.
   * Only whitelist if the ENTIRE phrase is a known non-person term.
   * Do NOT whitelist based on individual words like "Ann" (Ann Arbor staging).
   */
  private isWhitelistedLastFirst(text: string): boolean {
    const normalized = text.trim().toLowerCase();

    // STREET-SMART: Check if ALL words are medical terms.
    // This prevents "Invasive Ductal Carcinoma" or "Hypertension, Hyperlipidemia"
    // from being detected as "Last, First" names.
    const words = text.split(/[\s,]+/).filter((w) => w.length > 1);
    if (words.length > 0) {
      const allMedical = words.every((word) =>
        DocumentVocabulary.isMedicalTerm(word),
      );
      if (allMedical) return true;
    }

    // Only whitelist complete phrases that are definitely not person names
    const nonPersonPhrases = [
      "emergency department",
      "intensive care",
      "medical record",
      "health plan",
      "ann arbor", // Ann Arbor staging - but only as complete phrase
    ];

    return nonPersonPhrases.some((phrase) => normalized.includes(phrase));
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
   * Check if text is a non-person structure term.
   * Delegates to shared NameDetectionUtils
   */
  private isNonPersonStructureTerm(text: string): boolean {
    return NameDetectionUtils.isNonPersonStructureTerm(text);
  }

  /**
   * Enhanced whitelist check that includes medical terms, hospital names, and word-by-word checking
   * STREET-SMART: For ALL CAPS LAST, FIRST format, be more permissive -
   * these are almost always patient names in medical documents
   */
  private isWhitelisted(
    text: string,
    isAllCapsLastFirst: boolean = false,
    context?: string,
  ): boolean {
    const normalized = text.trim();

    // Check base whitelist
    if (baseIsWhitelisted(normalized)) {
      return true;
    }

    // HOSPITAL WHITELIST: Check if this is part of a hospital name
    // Hospital names are NOT patient PHI under HIPAA Safe Harbor
    if (
      context &&
      HospitalDictionary.isPartOfHospitalName(normalized, context)
    ) {
      return true;
    }

    // STREET-SMART: For ALL CAPS "LAST, FIRST" format names, don't whitelist
    // based on individual word medical term matching. These are patient names.
    if (isAllCapsLastFirst) {
      // STREET-SMART: For ALL CAPS "LAST, FIRST" format, we usually assume it's a patient name.
      // HOWEVER, if ALL parts of the "name" are medical terms (e.g. "HTN, HLD" or "INVASIVE, DUCTAL"),
      // then it is likely a list of conditions, not a person.

      const words = normalized.split(/[\s,]+/).filter((w) => w.length > 1);
      const allWordsAreMedical = words.every((word) =>
        DocumentVocabulary.isMedicalTerm(word),
      );

      if (allWordsAreMedical && words.length > 0) {
        return true; // Whitelist it (it's a list of medical terms)
      }

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
   * IMPORTANT: Names with professional credentials are ALWAYS PROVIDERS
   * under HIPAA Safe Harbor and should NOT be redacted.
   * "Sarah Stokes, RN" is a provider (nurse), not a patient.
   */
  private detectNamesWithCredentials(text: string, spans: Span[]): void {
    // CRITICAL: Names with professional credentials are PROVIDER names
    // They should NOT be redacted - skip this detection entirely
    return;

    // Dead code below - kept for reference but never executes
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

  // ═══════════════════════════════════════════════════════════════════════════
  // RUST ACCELERATOR METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Rust-accelerated Last, First detection
   * Delegates to VulpesNameScanner.detectLastFirst() for performance
   */
  private detectRustLastFirstNames(text: string, spans: Span[]): void {
    const detections = RustNameScanner.detectLastFirst(text);
    if (!detections.length) return;

    for (const d of detections) {
      const fullName = d.text;
      const start = d.characterStart;
      const end = d.characterEnd;

      // Apply same provider-title exclusion as TS path
      const lookbackStart = Math.max(0, start - 30);
      const textBefore = text.substring(lookbackStart, start);
      const titleNamePattern = new RegExp(
        `\\b(${Array.from(PROVIDER_TITLE_PREFIXES).join("|")})\\.?\\s+[A-Za-z]+\\s*$`,
        "i",
      );
      if (titleNamePattern.test(textBefore)) {
        continue;
      }

      // Skip if second part is a credential
      const parts = fullName.split(/\s*,\s*/);
      if (parts.length === 2) {
        const secondPart = parts[1].split(/\s+/)[0];
        if (PROVIDER_CREDENTIALS.has(secondPart.toUpperCase())) {
          continue;
        }
      }

      if (!this.isWhitelistedLastFirst(fullName)) {
        spans.push(
          new Span({
            text: fullName,
            originalValue: fullName,
            characterStart: start,
            characterEnd: end,
            filterType: FilterType.NAME,
            confidence: d.confidence,
            priority: this.getPriority(),
            context: this.extractContext(text, start, end),
            window: [],
            replacement: null,
            salt: null,
            pattern: d.pattern,
            applied: false,
            ignored: false,
            ambiguousWith: [],
            disambiguationScore: null,
          }),
        );
      }
    }
  }

  /**
   * Rust-accelerated First Last detection
   * Delegates to VulpesNameScanner.detectFirstLast() for performance
   */
  private detectRustFirstLastNames(text: string, spans: Span[]): void {
    const detections = RustNameScanner.detectFirstLast(text);
    if (!detections.length) return;

    for (const d of detections) {
      const fullName = d.text;
      const start = d.characterStart;
      const end = d.characterEnd;

      // Exclude provider-title contexts
      const lookbackStart = Math.max(0, start - 30);
      const textBefore = text.substring(lookbackStart, start);
      const titlePattern = new RegExp(
        `(?:${Array.from(PROVIDER_TITLE_PREFIXES).join("|")})\\.?\\s*$`,
        "i",
      );
      if (titlePattern.test(textBefore)) {
        continue;
      }

      // Exclude credentials immediately after the match
      const after = text.substring(end, Math.min(text.length, end + 40));
      const credentialPattern =
        /^[,\s]+(?:MD|DO|PhD|DDS|DMD|DPM|DVM|OD|PsyD|PharmD|RN|NP|PA|PA-C|FACS|FACP|FACC)\b/i;
      if (credentialPattern.test(after)) {
        continue;
      }

      if (
        !this.isWhitelisted(fullName, false, text) &&
        this.isLikelyPersonName(fullName)
      ) {
        spans.push(
          new Span({
            text: fullName,
            originalValue: fullName,
            characterStart: start,
            characterEnd: end,
            filterType: FilterType.NAME,
            confidence: d.confidence,
            priority: this.getPriority(),
            context: this.extractContext(text, start, end),
            window: [],
            replacement: null,
            salt: null,
            pattern: d.pattern,
            applied: false,
            ignored: false,
            ambiguousWith: [],
            disambiguationScore: null,
          }),
        );
      }
    }
  }
}
