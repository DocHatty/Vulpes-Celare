/**
 * Post-Filter Pipeline - Cleans up and validates spans after initial detection
 *
 * Post-filters run after primary detection to:
 * - Remove trailing punctuation/whitespace
 * - Validate patterns
 * - Apply ignore lists
 * - Clean up edge cases
 *
 * Based on Phileas's post-filter architecture.
 *
 * @module redaction/services
 */

import { Span, FilterType } from "../models/Span";

export interface PostFilterResult {
  span: Span;
  shouldRemove: boolean; // Should this span be removed entirely?
  modified: boolean; // Was the span modified?
}

/**
 * Abstract Post Filter
 */
export abstract class PostFilter {
  abstract getName(): string;
  abstract process(text: string, span: Span): PostFilterResult;
}

/**
 * Trailing Punctuation Post Filter
 * Removes trailing periods, commas, etc. from spans
 */
export class TrailingPunctuationPostFilter extends PostFilter {
  getName(): string {
    return "TrailingPunctuation";
  }

  process(text: string, span: Span): PostFilterResult {
    // Don't clean up addresses (may have valid periods like "St.")
    if (span.filterType === FilterType.ADDRESS) {
      return { span, shouldRemove: false, modified: false };
    }

    let modified = false;
    let spanText = span.text;

    // Remove trailing punctuation
    const trailingPunctuation = /[.,;:!?]+$/;
    while (trailingPunctuation.test(spanText)) {
      spanText = spanText.replace(trailingPunctuation, "");
      span.characterEnd--;
      modified = true;
    }

    span.text = spanText;

    return { span, shouldRemove: false, modified };
  }
}

/**
 * Trailing Whitespace Post Filter
 * Removes trailing spaces, tabs, newlines from spans
 */
export class TrailingWhitespacePostFilter extends PostFilter {
  getName(): string {
    return "TrailingWhitespace";
  }

  process(text: string, span: Span): PostFilterResult {
    let modified = false;
    let spanText = span.text;

    // Remove trailing whitespace
    while (/\s$/.test(spanText)) {
      spanText = spanText.substring(0, spanText.length - 1);
      span.characterEnd--;
      modified = true;
    }

    // Remove leading whitespace
    while (/^\s/.test(spanText)) {
      spanText = spanText.substring(1);
      span.characterStart++;
      modified = true;
    }

    span.text = spanText;

    return { span, shouldRemove: false, modified };
  }
}

/**
 * Minimum Length Post Filter
 * Removes spans that are too short
 */
export class MinimumLengthPostFilter extends PostFilter {
  private minLengths: Map<FilterType, number>;

  constructor() {
    super();
    this.minLengths = new Map([
      [FilterType.NAME, 2],
      [FilterType.EMAIL, 5],
      [FilterType.SSN, 9],
      [FilterType.PHONE, 7],
      [FilterType.ADDRESS, 5],
      [FilterType.ZIPCODE, 5],
      [FilterType.DATE, 6],
      [FilterType.MRN, 3],
      [FilterType.CREDIT_CARD, 13],
    ]);
  }

  getName(): string {
    return "MinimumLength";
  }

  process(text: string, span: Span): PostFilterResult {
    const minLength = this.minLengths.get(span.filterType) || 1;

    if (span.text.length < minLength) {
      return { span, shouldRemove: true, modified: false };
    }

    return { span, shouldRemove: false, modified: false };
  }
}

/**
 * Ignored Terms Post Filter
 * Removes spans that match ignored terms list
 */
export class IgnoredTermsPostFilter extends PostFilter {
  private ignoredTerms: Set<string>;
  private caseSensitive: boolean;

  constructor(ignoredTerms: string[], caseSensitive: boolean = false) {
    super();
    this.caseSensitive = caseSensitive;
    this.ignoredTerms = new Set(
      caseSensitive ? ignoredTerms : ignoredTerms.map((t) => t.toLowerCase()),
    );
  }

  getName(): string {
    return "IgnoredTerms";
  }

  process(text: string, span: Span): PostFilterResult {
    const searchText = this.caseSensitive ? span.text : span.text.toLowerCase();

    if (this.ignoredTerms.has(searchText)) {
      return { span, shouldRemove: true, modified: false };
    }

    return { span, shouldRemove: false, modified: false };
  }

  addIgnoredTerm(term: string): void {
    const searchTerm = this.caseSensitive ? term : term.toLowerCase();
    this.ignoredTerms.add(searchTerm);
  }

  removeIgnoredTerm(term: string): void {
    const searchTerm = this.caseSensitive ? term : term.toLowerCase();
    this.ignoredTerms.delete(searchTerm);
  }
}

/**
 * Ignored Patterns Post Filter
 * Removes spans that match ignored regex patterns
 */
export class IgnoredPatternsPostFilter extends PostFilter {
  private patterns: RegExp[];

  constructor(patterns: string[]) {
    super();
    this.patterns = patterns.map((p) => new RegExp(p, "i"));
  }

  getName(): string {
    return "IgnoredPatterns";
  }

  process(text: string, span: Span): PostFilterResult {
    for (const pattern of this.patterns) {
      if (pattern.test(span.text)) {
        return { span, shouldRemove: true, modified: false };
      }
    }

    return { span, shouldRemove: false, modified: false };
  }

  addPattern(pattern: string): void {
    this.patterns.push(new RegExp(pattern, "i"));
  }
}

/**
 * Already Tokenized Post Filter
 * Removes spans that appear to already be tokens (contain {{ or }})
 */
export class AlreadyTokenizedPostFilter extends PostFilter {
  getName(): string {
    return "AlreadyTokenized";
  }

  process(text: string, span: Span): PostFilterResult {
    if (span.text.includes("{{") || span.text.includes("}}")) {
      return { span, shouldRemove: true, modified: false };
    }

    return { span, shouldRemove: false, modified: false };
  }
}

/**
 * Confidence Threshold Post Filter
 * Removes spans below confidence threshold
 */
export class ConfidenceThresholdPostFilter extends PostFilter {
  private threshold: number;

  constructor(threshold: number = 0.5) {
    super();
    this.threshold = threshold;
  }

  getName(): string {
    return "ConfidenceThreshold";
  }

  process(text: string, span: Span): PostFilterResult {
    if (span.confidence < this.threshold) {
      return { span, shouldRemove: true, modified: false };
    }

    return { span, shouldRemove: false, modified: false };
  }

  setThreshold(threshold: number): void {
    this.threshold = threshold;
  }
}

/**
 * Post-Filter Pipeline
 * Orchestrates multiple post-filters
 */
export class PostFilterPipeline {
  private filters: PostFilter[];

  constructor(filters?: PostFilter[]) {
    this.filters = filters || this.getDefaultFilters();
  }

  /**
   * Get default post-filters
   */
  private getDefaultFilters(): PostFilter[] {
    return [
      new TrailingWhitespacePostFilter(),
      new TrailingPunctuationPostFilter(),
      new AlreadyTokenizedPostFilter(),
      new MinimumLengthPostFilter(),
    ];
  }

  /**
   * Process a single span through all filters
   */
  process(text: string, span: Span): Span | null {
    let currentSpan = span;
    let shouldRemove = false;

    for (const filter of this.filters) {
      const result = filter.process(text, currentSpan);

      if (result.shouldRemove) {
        console.log(
          `[PostFilter] ${filter.getName()}: Removing span "${span.text}"`,
        );
        shouldRemove = true;
        break;
      }

      if (result.modified) {
        console.log(
          `[PostFilter] ${filter.getName()}: Modified span "${span.text}" -> "${result.span.text}"`,
        );
        currentSpan = result.span;
      }
    }

    return shouldRemove ? null : currentSpan;
  }

  /**
   * Process multiple spans through all filters
   */
  processAll(text: string, spans: Span[]): Span[] {
    const filtered: Span[] = [];

    for (const span of spans) {
      const result = this.process(text, span);
      if (result !== null) {
        filtered.push(result);
      }
    }

    console.log(
      `[PostFilter] Processed ${spans.length} spans, kept ${filtered.length}`,
    );

    return filtered;
  }

  /**
   * Add a filter to the pipeline
   */
  addFilter(filter: PostFilter): void {
    this.filters.push(filter);
  }

  /**
   * Remove a filter from the pipeline
   */
  removeFilter(filterName: string): void {
    this.filters = this.filters.filter((f) => f.getName() !== filterName);
  }

  /**
   * Get all filters
   */
  getFilters(): PostFilter[] {
    return [...this.filters];
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.filters = [];
  }
}
