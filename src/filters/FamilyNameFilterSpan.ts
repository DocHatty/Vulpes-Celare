/**
 * FamilyNameFilterSpan - Family Member Name Detection (Span-Based)
 *
 * Detects family member names and relationships and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */

import { Span, FilterType } from "../models/Span";
import { SpanFactory } from "../core/SpanFactory";
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
          return SpanFactory.fromPosition(text, d.characterStart, d.characterEnd, FilterType.NAME, {
            confidence: d.confidence,
            priority: this.getPriority(),
            pattern: d.pattern,
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

        spans.push(
          SpanFactory.fromPosition(text, nameStart, nameEnd, FilterType.NAME, {
            confidence: 0.9,
            priority: this.getPriority(),
            pattern: "Family relationship",
          }),
        );
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
            spans.push(
              SpanFactory.fromPosition(text, namePos, namePos + name.length, FilterType.NAME, {
                confidence: 0.88,
                priority: this.getPriority(),
                pattern: "Nickname/AKA",
              }),
            );
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
      spans.push(
        SpanFactory.fromPosition(text, name1Start, name1Start + name1.length, FilterType.NAME, {
          confidence: 0.9,
          priority: this.getPriority(),
          pattern: "Child with age",
        }),
      );

      // Create span for second name
      const name2Start =
        matchPos +
        fullMatch.indexOf(name2, name1Start - matchPos + name1.length);
      spans.push(
        SpanFactory.fromPosition(text, name2Start, name2Start + name2.length, FilterType.NAME, {
          confidence: 0.9,
          priority: this.getPriority(),
          pattern: "Child with age",
        }),
      );
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
        spans.push(
          SpanFactory.fromPosition(text, firstNameStart, firstNameStart + firstName.length, FilterType.NAME, {
            confidence: 0.9,
            priority: this.getPriority(),
            pattern: "Child with age",
          }),
        );
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

      spans.push(
        SpanFactory.fromPosition(text, match.index, match.index + fullMatch.length, FilterType.NAME, {
          confidence: 0.82,
          priority: this.getPriority(),
          pattern: "Last, First format (fallback)",
        }),
      );
    }
  }

  /**
   * Fallback: Detect general full names (John Smith, Jane Mary Doe)
   *
   * DISABLED: Too aggressive - matches medical diagnoses like "Trigeminal Neuralgia".
   * SmartNameFilterSpan handles general name detection with proper dictionary validation.
   */
  private detectGeneralFullNames(_text: string, _spans: Span[]): void {
    // Intentionally empty - SmartNameFilterSpan handles this with proper validation
  }
}
