/**
 * FamilyNameFilterSpan - Family Member Name Detection (Span-Based)
 *
 * Detects family member names and relationships and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */

import { Span, FilterType } from "../models/Span";
import { SpanBasedFilter, FilterPriority } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
import { nameDetectionCoordinator } from "./name-patterns/NameDetectionCoordinator";

export class FamilyNameFilterSpan extends SpanBasedFilter {
  getType(): string {
    return "NAME";
  }

  getPriority(): number {
    return FilterPriority.NAME;
  }

  detect(text: string, _config: any, _context: RedactionContext): Span[] {
    // Try Rust acceleration first - detectSmart includes family member patterns
    // Uses coordinator for cached results to avoid duplicate FFI calls
    const rustDetections = nameDetectionCoordinator.getRustSmart(text);
    if (rustDetections.length > 0) {
      // Filter for family-related patterns
      const familyPatterns = rustDetections.filter(
        (d) => d.pattern.includes("Family") || d.pattern.includes("Possessive"),
      );
      if (familyPatterns.length > 0) {
        return familyPatterns.map((d) => {
          return new Span({
            text: d.text,
            originalValue: d.text,
            characterStart: d.characterStart,
            characterEnd: d.characterEnd,
            filterType: FilterType.NAME,
            confidence: d.confidence,
            priority: this.getPriority(),
            context: this.extractContext(
              text,
              d.characterStart,
              d.characterEnd,
            ),
            window: [],
            replacement: null,
            salt: null,
            pattern: d.pattern,
            applied: false,
            ignored: false,
            ambiguousWith: [],
            disambiguationScore: null,
          });
        });
      }
    }

    // TypeScript fallback
    const spans: Span[] = [];

    // PRIMARY PATTERNS: Family relationships (specialized focus)

    // Pattern 1: RELATIONSHIP LABELS + NAMES
    const relationshipPattern =
      /\b(?:Spouse|Wife|Husband|Father|Mother|Dad|Mom|Brother|Sister|Son|Daughter|Child|Children|Parent|Sibling|Partner|Guardian|Emergency[ \t]+Contact|Next[ \t]+of[ \t]+Kin|NOK)[ \t:]+([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+(?:[ \t]+(?:Jr\.?|Sr\.?|II|III|IV))?)?)\b/gi;

    relationshipPattern.lastIndex = 0;
    let match;
    while ((match = relationshipPattern.exec(text)) !== null) {
      const name = match[1];
      const fullMatch = match[0];

      // Skip if followed by "(age" - child patterns handle that
      const matchPos = match.index!;
      const contextCheck = text.substring(
        matchPos,
        matchPos + fullMatch.length + 20,
      );
      if (contextCheck.includes("(age")) {
        continue;
      }

      // Validate it looks like a name
      if (name && name.length >= 2 && /^[A-Z][a-z]/.test(name)) {
        // Find position of name within full match
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
          pattern: "Family relationship",
          applied: false,
          ignored: false,
          ambiguousWith: [],
          disambiguationScore: null,
        });
        spans.push(span);
      }
    }

    // Pattern 2: MAIDEN NAMES
    const maidenNamePattern =
      /\b(?:nee|née|n\.e\.e\.|born)[ \t]+([A-Z][a-z]{2,})\b/gi;

    maidenNamePattern.lastIndex = 0;
    while ((match = maidenNamePattern.exec(text)) !== null) {
      const maidenName = match[1];
      const span = this.createSpanFromMatch(text, match, FilterType.NAME, 0.92);
      // Adjust to capture only the maiden name
      span.characterStart = match.index! + match[0].indexOf(maidenName);
      span.characterEnd = span.characterStart + maidenName.length;
      span.text = maidenName;
      spans.push(span);
    }

    // Pattern 3: NICKNAMES and AKA
    const akaPattern =
      /\b(?:Also[ \t]+known[ \t]+as|AKA|a\.k\.a\.|Nickname|Known[ \t]+as)[ \t:]+([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+)?(?:[ \t]*,[ \t]*[A-Z][a-z]+)*)/gi;

    akaPattern.lastIndex = 0;
    while ((match = akaPattern.exec(text)) !== null) {
      const names = match[1];
      const nameList = names.split(/\s*,\s*/);

      for (const name of nameList) {
        if (name.trim().length >= 2) {
          // Find position of each name in the original text
          const namePos = text.indexOf(name, match.index!);
          if (namePos !== -1) {
            const span = new Span({
              text: name.trim(),
              originalValue: name.trim(),
              characterStart: namePos,
              characterEnd: namePos + name.length,
              filterType: FilterType.NAME,
              confidence: 0.88,
              priority: this.getPriority(),
              context: this.extractContext(
                text,
                namePos,
                namePos + name.length,
              ),
              window: [],
              replacement: null,
              salt: null,
              pattern: "Nickname/AKA",
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

    // Pattern 4: MULTIPLE CHILDREN NAMES
    const multipleChildrenPattern =
      /\b(?:Children|Kids)[ \t:]+([A-Z][a-z]{2,})[ \t]+(\(age[ \t]+\d+\))[ \t]+and[ \t]+([A-Z][a-z]{2,})[ \t]+(\(age[ \t]+\d+\))/gi;

    multipleChildrenPattern.lastIndex = 0;
    while ((match = multipleChildrenPattern.exec(text)) !== null) {
      const name1 = match[1];
      const name2 = match[3];
      const fullMatch = match[0];
      const matchPos = match.index!;

      // Create span for first name
      const name1Start = matchPos + fullMatch.indexOf(name1);
      const span1 = new Span({
        text: name1,
        originalValue: name1,
        characterStart: name1Start,
        characterEnd: name1Start + name1.length,
        filterType: FilterType.NAME,
        confidence: 0.9,
        priority: this.getPriority(),
        context: this.extractContext(
          text,
          name1Start,
          name1Start + name1.length,
        ),
        window: [],
        replacement: null,
        salt: null,
        pattern: "Child with age",
        applied: false,
        ignored: false,
        ambiguousWith: [],
        disambiguationScore: null,
      });
      spans.push(span1);

      // Create span for second name
      const name2Start =
        matchPos +
        fullMatch.indexOf(name2, name1Start - matchPos + name1.length);
      const span2 = new Span({
        text: name2,
        originalValue: name2,
        characterStart: name2Start,
        characterEnd: name2Start + name2.length,
        filterType: FilterType.NAME,
        confidence: 0.9,
        priority: this.getPriority(),
        context: this.extractContext(
          text,
          name2Start,
          name2Start + name2.length,
        ),
        window: [],
        replacement: null,
        salt: null,
        pattern: "Child with age",
        applied: false,
        ignored: false,
        ambiguousWith: [],
        disambiguationScore: null,
      });
      spans.push(span2);
    }

    // Pattern 5: SINGLE CHILD NAMES with age
    const childNameWithAgePattern =
      /\b(?:Children|Daughter|Son|Child)[ \t:]+([A-Z][a-z]+)(?:[ \t]*[\(,][ \t]*age|[ \t]+\(age)/gi;

    childNameWithAgePattern.lastIndex = 0;
    while ((match = childNameWithAgePattern.exec(text)) !== null) {
      const firstName = match[1];
      const fullMatch = match[0];

      // Skip if already matched by other patterns
      if (fullMatch.includes("{{") || fullMatch.includes("}}")) {
        continue;
      }

      if (firstName && firstName.length >= 2) {
        const matchPos = match.index!;
        const firstNameStart = matchPos + fullMatch.indexOf(firstName);
        const span = new Span({
          text: firstName,
          originalValue: firstName,
          characterStart: firstNameStart,
          characterEnd: firstNameStart + firstName.length,
          filterType: FilterType.NAME,
          confidence: 0.9,
          priority: this.getPriority(),
          context: this.extractContext(
            text,
            firstNameStart,
            firstNameStart + firstName.length,
          ),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Child with age",
          applied: false,
          ignored: false,
          ambiguousWith: [],
          disambiguationScore: null,
        });
        spans.push(span);
      }
    }

    // FALLBACK PATTERNS: General name detection for redundancy
    // These ensure FamilyNameFilterSpan can also catch generic names as backup

    // Pattern 6: Titled names (Dr. Smith, Mr. John Doe, etc.)
    this.detectTitledNames(text, spans);

    // Pattern 7: Last, First format (Smith, John)
    this.detectLastFirstNames(text, spans);

    // Pattern 8: General full names (John Smith, Jane Mary Doe)
    this.detectGeneralFullNames(text, spans);

    return spans;
  }

  /**
   * Fallback: Detect titled names (Dr. Smith, Mr. John Doe, etc.)
   *
   * IMPORTANT: Titled names are PROVIDER names under HIPAA Safe Harbor
   * and should NOT be redacted. Patients don't have formal titles.
   * This pattern is DISABLED to prevent provider name over-redaction.
   */
  private detectTitledNames(_text: string, _spans: Span[]): void {
    // CRITICAL: ALL titled names are provider names - skip detection entirely
    // Titled names (Dr., Prof., Mr., Mrs., etc.) are NOT patient PHI
    return;
  }

  /**
   * Fallback: Detect Last, First format (Smith, John)
   */
  private detectLastFirstNames(text: string, spans: Span[]): void {
    const lastFirstPattern =
      /\b([A-Z][a-z]{1,20}),\s+([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20})?)\b/g;

    let match;
    while ((match = lastFirstPattern.exec(text)) !== null) {
      const fullMatch = match[0];

      const span = new Span({
        text: fullMatch,
        originalValue: fullMatch,
        characterStart: match.index,
        characterEnd: match.index + fullMatch.length,
        filterType: FilterType.NAME,
        confidence: 0.82,
        priority: this.getPriority(),
        context: this.extractContext(
          text,
          match.index,
          match.index + fullMatch.length,
        ),
        window: [],
        replacement: null,
        salt: null,
        pattern: "Last, First format (fallback)",
        applied: false,
        ignored: false,
        ambiguousWith: [],
        disambiguationScore: null,
      });
      spans.push(span);
    }
  }

  /**
   * Fallback: Detect general full names (John Smith, Jane Mary Doe)
   *
   * CRITICAL: This pattern is DISABLED because it's too aggressive and matches
   * medical diagnoses like "Trigeminal Neuralgia", "Bell Palsy", etc.
   * SmartNameFilterSpan handles general name detection with proper dictionary validation.
   */
  private detectGeneralFullNames(_text: string, _spans: Span[]): void {
    // DISABLED: This pattern matches too many false positives (medical diagnoses,
    // procedures, etc.) because it just looks for 2-4 capitalized words.
    // SmartNameFilterSpan handles general name detection with proper validation.
    return;

    // Original code preserved for reference but not executed:
    /*
    const fullNamePattern =
      /\b([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20}){1,3})\b/g;

    let match;
    while ((match = fullNamePattern.exec(text)) !== null) {
      const fullMatch = match[0];

      // Skip if whitelisted (medications, medical terms, etc.)
      if (isWhitelisted(fullMatch)) {
        continue;
      }

      // CRITICAL: Check if name starts with a provider title prefix
      // Names like "Dame Joshua Jung", "Sir John Smith" are provider names
      const firstWord = fullMatch.split(/\s+/)[0];
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

      // Basic validation to avoid false positives
      if (this.looksLikePersonName(fullMatch)) {
        const span = new Span({
          text: fullMatch,
          originalValue: fullMatch,
          characterStart: match.index,
          characterEnd: match.index + fullMatch.length,
          filterType: FilterType.NAME,
          confidence: 0.75,
          priority: this.getPriority(),
          context: this.extractContext(
            text,
            match.index,
            match.index + fullMatch.length,
          ),
          window: [],
          replacement: null,
          salt: null,
          pattern: "General full name (fallback)",
          applied: false,
          ignored: false,
          ambiguousWith: [],
          disambiguationScore: null,
        });
        spans.push(span);
      }
    }
    */
  }

}
