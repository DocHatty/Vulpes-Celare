/**
 * ============================================================================
 * VULPES CELARE - NAME DETECTION STRATEGY PATTERN
 * ============================================================================
 *
 * This module implements the Strategy Pattern for name detection, enabling
 * consolidation of the 4 overlapping name filters into a more maintainable
 * architecture.
 *
 * PROBLEM:
 * The audit identified 4 overlapping name filters:
 * - FormattedNameFilterSpan (856 lines) - Labeled names, Last/First
 * - SmartNameFilterSpan (1,993 lines) - 17 OCR-tolerant patterns
 * - TitledNameFilterSpan (~500 lines) - Dr./Mr./Ms. prefixed
 * - FamilyNameFilterSpan (~400 lines) - Family relationships
 *
 * SOLUTION:
 * Use the Strategy Pattern to:
 * 1. Define a common interface for name detection strategies
 * 2. Allow strategies to be composed and combined
 * 3. Consolidate into 2 logical groups:
 *    - StructuredNameStrategy: Formatted, labeled, Last/First patterns
 *    - ContextualNameStrategy: Titled, family, contextual patterns
 *
 * BENEFITS:
 * - Reduced code duplication
 * - Easier to add new patterns
 * - Better testability via strategy injection
 * - Gradual migration path (existing filters can delegate to strategies)
 *
 * Design based on:
 * - https://refactoring.guru/design-patterns/strategy/typescript/example
 * - https://medium.com/@robinviktorsson/a-guide-to-the-strategy-design-pattern
 *
 * @module filters/name-patterns
 */

import { Span, FilterType } from "../../models/Span";
import { RedactionContext } from "../../context/RedactionContext";
import { FilterPriority } from "../../core/SpanBasedFilter";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Result from a name detection strategy
 */
export interface NameDetectionResult {
  /** The detected name text */
  text: string;
  /** Start position in the source text */
  characterStart: number;
  /** End position in the source text */
  characterEnd: number;
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  /** Pattern that matched */
  pattern: string;
  /** Category of name detection */
  category: NameCategory;
  /** Additional metadata */
  metadata?: NameMetadata;
}

/**
 * Categories of name detection for filtering/reporting
 */
export type NameCategory =
  | "formatted"      // Last, First / First Last patterns
  | "labeled"        // Name: John Smith / Patient: Jane Doe
  | "titled"         // Dr. Smith / Mr. Jones
  | "family"         // Mother: Jane / Emergency Contact: Bob
  | "contextual"     // Names with clinical context
  | "ocr_tolerant";  // Patterns that handle OCR errors

/**
 * Additional metadata about the detected name
 */
export interface NameMetadata {
  /** Title prefix if detected (Dr., Mr., etc.) */
  title?: string;
  /** Suffix if detected (Jr., MD, etc.) */
  suffix?: string;
  /** Family relationship if detected */
  relationship?: string;
  /** Whether this is likely a provider vs patient name */
  isProvider?: boolean;
  /** Field label if from labeled pattern */
  label?: string;
  /** OCR error level detected */
  ocrErrorLevel?: "none" | "low" | "medium" | "high";
}

/**
 * Configuration for name detection strategies
 */
export interface NameDetectionConfig {
  /** Enable OCR-tolerant patterns */
  enableOcrTolerance?: boolean;
  /** Minimum confidence threshold */
  minConfidence?: number;
  /** Enable provider name detection */
  detectProviders?: boolean;
  /** Enable family member detection */
  detectFamily?: boolean;
  /** Context from the redaction engine */
  redactionContext?: RedactionContext;
}

/**
 * Strategy interface for name detection
 *
 * Implementing this interface allows different name detection algorithms
 * to be used interchangeably.
 */
export interface INameDetectionStrategy {
  /** Unique identifier for this strategy */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Categories of names this strategy detects */
  readonly categories: ReadonlyArray<NameCategory>;

  /**
   * Detect names in the given text
   * @param text The source text to analyze
   * @param config Detection configuration
   * @returns Array of detected names
   */
  detect(text: string, config: NameDetectionConfig): NameDetectionResult[];

  /**
   * Check if this strategy supports a given category
   */
  supportsCategory(category: NameCategory): boolean;
}

// ============================================================================
// BASE STRATEGY
// ============================================================================

/**
 * Abstract base class for name detection strategies
 */
export abstract class BaseNameStrategy implements INameDetectionStrategy {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly categories: ReadonlyArray<NameCategory>;

  abstract detect(text: string, config: NameDetectionConfig): NameDetectionResult[];

  supportsCategory(category: NameCategory): boolean {
    return this.categories.includes(category);
  }

  /**
   * Create a Span from a detection result
   */
  protected toSpan(result: NameDetectionResult, sourceText: string): Span {
    const filterType = result.metadata?.isProvider
      ? FilterType.PROVIDER_NAME
      : FilterType.NAME;

    return new Span({
      text: result.text,
      originalValue: result.text,
      characterStart: result.characterStart,
      characterEnd: result.characterEnd,
      filterType,
      confidence: result.confidence,
      priority: FilterPriority.NAME,
      context: this.extractContext(sourceText, result.characterStart, result.characterEnd),
      window: [],
      replacement: null,
      salt: null,
      pattern: result.pattern,
      applied: false,
      ignored: false,
      ambiguousWith: [],
      disambiguationScore: null,
    });
  }

  /**
   * Extract context around a detection
   */
  protected extractContext(
    text: string,
    start: number,
    end: number,
    windowSize: number = 50,
  ): string {
    const ctxStart = Math.max(0, start - windowSize);
    const ctxEnd = Math.min(text.length, end + windowSize);
    return text.substring(ctxStart, ctxEnd);
  }

  /**
   * Check if a position is at a word boundary
   */
  protected isWordBoundary(text: string, pos: number): boolean {
    if (pos <= 0 || pos >= text.length) return true;
    const before = text[pos - 1];
    const after = text[pos];
    const wordChar = /[a-zA-Z0-9_'-]/;
    return !wordChar.test(before) || !wordChar.test(after);
  }
}

// ============================================================================
// COMPOSITE STRATEGY
// ============================================================================

/**
 * Composite strategy that combines multiple name detection strategies
 *
 * @example
 * ```typescript
 * const composite = new CompositeNameStrategy([
 *   new StructuredNameStrategy(),
 *   new ContextualNameStrategy(),
 * ]);
 *
 * const results = composite.detect(text, config);
 * ```
 */
export class CompositeNameStrategy implements INameDetectionStrategy {
  readonly id = "composite";
  readonly name = "Composite Name Detection";

  private strategies: INameDetectionStrategy[];

  get categories(): ReadonlyArray<NameCategory> {
    const allCategories = new Set<NameCategory>();
    for (const strategy of this.strategies) {
      for (const cat of strategy.categories) {
        allCategories.add(cat);
      }
    }
    return Array.from(allCategories);
  }

  constructor(strategies: INameDetectionStrategy[]) {
    this.strategies = strategies;
  }

  /**
   * Add a strategy to the composite
   */
  addStrategy(strategy: INameDetectionStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Remove a strategy by ID
   */
  removeStrategy(strategyId: string): void {
    this.strategies = this.strategies.filter((s) => s.id !== strategyId);
  }

  detect(text: string, config: NameDetectionConfig): NameDetectionResult[] {
    const allResults: NameDetectionResult[] = [];

    for (const strategy of this.strategies) {
      const results = strategy.detect(text, config);
      allResults.push(...results);
    }

    // Deduplicate overlapping results (keep highest confidence)
    return this.deduplicateResults(allResults);
  }

  supportsCategory(category: NameCategory): boolean {
    return this.strategies.some((s) => s.supportsCategory(category));
  }

  /**
   * Deduplicate overlapping results, keeping highest confidence
   */
  private deduplicateResults(results: NameDetectionResult[]): NameDetectionResult[] {
    if (results.length <= 1) return results;

    // Sort by start position, then by confidence (descending)
    const sorted = [...results].sort((a, b) => {
      if (a.characterStart !== b.characterStart) {
        return a.characterStart - b.characterStart;
      }
      return b.confidence - a.confidence;
    });

    const deduplicated: NameDetectionResult[] = [];
    let lastEnd = -1;

    for (const result of sorted) {
      // Skip if this result is fully contained within a previous result
      if (result.characterStart < lastEnd && result.characterEnd <= lastEnd) {
        continue;
      }

      // Check for overlap with previous result
      if (result.characterStart < lastEnd) {
        // Partial overlap - check if this one has higher confidence
        const prevResult = deduplicated[deduplicated.length - 1];
        if (prevResult && result.confidence > prevResult.confidence) {
          // Replace previous with this one
          deduplicated.pop();
          deduplicated.push(result);
          lastEnd = result.characterEnd;
        }
        // Otherwise skip this one
      } else {
        deduplicated.push(result);
        lastEnd = result.characterEnd;
      }
    }

    return deduplicated;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Factory for creating name detection strategies
 */
export class NameStrategyFactory {
  /**
   * Create the default composite strategy with all detection patterns
   */
  static createDefault(): CompositeNameStrategy {
    return new CompositeNameStrategy([
      // Add strategies here as they are implemented
      // new StructuredNameStrategy(),
      // new ContextualNameStrategy(),
    ]);
  }

  /**
   * Create a strategy for specific categories only
   */
  static createForCategories(
    categories: NameCategory[],
    allStrategies: INameDetectionStrategy[],
  ): CompositeNameStrategy {
    const filtered = allStrategies.filter((s) =>
      categories.some((cat) => s.supportsCategory(cat)),
    );
    return new CompositeNameStrategy(filtered);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  INameDetectionStrategy as NameDetectionStrategy,
};
