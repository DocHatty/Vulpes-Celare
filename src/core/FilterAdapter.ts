/**
 * Filter Adapter
 *
 * Wraps legacy text-based filters to work in the Span-based parallel architecture.
 * This allows gradual migration without rewriting all 25+ filters at once.
 *
 * @module redaction/core
 */

import { Span, FilterType } from "../models/Span";
import { SpanBasedFilter } from "./SpanBasedFilter";
import { BaseFilter } from "./BaseFilter";
import { RedactionContext } from "../context/RedactionContext";

/**
 * Adapter that converts legacy BaseFilter to SpanBasedFilter
 */
export class FilterAdapter extends SpanBasedFilter {
  private legacyFilter: BaseFilter;
  private filterType: FilterType;
  private priority: number;

  constructor(legacyFilter: BaseFilter, priority?: number) {
    super();
    this.legacyFilter = legacyFilter;
    this.filterType = legacyFilter.getType() as FilterType;
    this.priority = priority ?? 5;
  }

  getType(): string {
    return this.legacyFilter.getType();
  }

  getPriority(): number {
    return this.priority;
  }

  /**
   * Detect spans by running legacy filter and extracting tokens
   *
   * Algorithm:
   * 1. Run legacy filter on text (gets back tokenized text)
   * 2. Extract all tokens and their positions
   * 3. Look up original values from context
   * 4. Find positions in original text
   * 5. Create Spans
   */
  async detect(
    text: string,
    config: any,
    context: RedactionContext
  ): Promise<Span[]> {
    // Create a temporary context to isolate this filter
    const tempContext = new RedactionContext(context.getSessionId());

    // Run legacy filter
    const redactedText = await Promise.resolve(
      this.legacyFilter.apply(text, config, tempContext)
    );

    // Extract tokens and convert to Spans
    const spans = this.extractSpansFromTokens(text, redactedText, tempContext);

    return spans;
  }

  /**
   * Extract Spans by finding tokens in the redacted text
   */
  private extractSpansFromTokens(
    originalText: string,
    redactedText: string,
    tempContext: RedactionContext
  ): Span[] {
    const spans: Span[] = [];
    const tokenPattern = new RegExp(
      `\\{\\{${this.filterType}_[^}]+\\}\\}`,
      'g'
    );

    let match;
    while ((match = tokenPattern.exec(redactedText)) !== null) {
      const token = match[0];
      const tokenPos = match.index;

      // Get original value from temp context
      const originalValue = tempContext.getOriginalValue(token);
      if (!originalValue) continue;

      // Find position in original text
      const originalPos = this.findPositionInOriginal(
        originalText,
        redactedText,
        tokenPos,
        originalValue
      );

      if (originalPos === -1) {
        // Fallback: search entire text
        const idx = originalText.indexOf(originalValue);
        if (idx !== -1) {
          const span = this.createSpan(originalText, idx, idx + originalValue.length, originalValue);
          spans.push(span);
        }
        continue;
      }

      // Create span
      const span = this.createSpan(
        originalText,
        originalPos,
        originalPos + originalValue.length,
        originalValue
      );
      spans.push(span);
    }

    return spans;
  }

  /**
   * Find position in original text by mapping from tokenized text
   */
  private findPositionInOriginal(
    originalText: string,
    tokenizedText: string,
    tokenPos: number,
    originalValue: string
  ): number {
    // Simple heuristic: search near the token position
    const searchRadius = 200;
    const searchStart = Math.max(0, tokenPos - searchRadius);
    const searchEnd = Math.min(originalText.length, tokenPos + searchRadius);

    const searchRegion = originalText.substring(searchStart, searchEnd);
    const localPos = searchRegion.indexOf(originalValue);

    if (localPos !== -1) {
      return searchStart + localPos;
    }

    return -1;
  }

  /**
   * Create a Span from position info
   */
  private createSpan(
    text: string,
    start: number,
    end: number,
    value: string
  ): Span {
    return new Span({
      text: value,
      originalValue: value,
      characterStart: start,
      characterEnd: end,
      filterType: this.filterType,
      confidence: 0.85, // Lower confidence for adapted filters
      priority: this.priority,
      context: this.extractContext(text, start, end),
      window: [],
      replacement: null,
      salt: null,
      pattern: null,
      applied: false,
      ignored: false,
      ambiguousWith: [],
      disambiguationScore: null,
    });
  }
}
