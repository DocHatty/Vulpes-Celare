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
import { Span } from "../../models/Span";
import { RedactionContext } from "../../context/RedactionContext";
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
export type NameCategory = "formatted" | "labeled" | "titled" | "family" | "contextual" | "ocr_tolerant";
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
/**
 * Abstract base class for name detection strategies
 */
export declare abstract class BaseNameStrategy implements INameDetectionStrategy {
    abstract readonly id: string;
    abstract readonly name: string;
    abstract readonly categories: ReadonlyArray<NameCategory>;
    abstract detect(text: string, config: NameDetectionConfig): NameDetectionResult[];
    supportsCategory(category: NameCategory): boolean;
    /**
     * Create a Span from a detection result
     */
    protected toSpan(result: NameDetectionResult, sourceText: string): Span;
    /**
     * Extract context around a detection
     */
    protected extractContext(text: string, start: number, end: number, windowSize?: number): string;
    /**
     * Check if a position is at a word boundary
     */
    protected isWordBoundary(text: string, pos: number): boolean;
}
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
export declare class CompositeNameStrategy implements INameDetectionStrategy {
    readonly id = "composite";
    readonly name = "Composite Name Detection";
    private strategies;
    get categories(): ReadonlyArray<NameCategory>;
    constructor(strategies: INameDetectionStrategy[]);
    /**
     * Add a strategy to the composite
     */
    addStrategy(strategy: INameDetectionStrategy): void;
    /**
     * Remove a strategy by ID
     */
    removeStrategy(strategyId: string): void;
    detect(text: string, config: NameDetectionConfig): NameDetectionResult[];
    supportsCategory(category: NameCategory): boolean;
    /**
     * Deduplicate overlapping results, keeping highest confidence
     */
    private deduplicateResults;
}
/**
 * Factory for creating name detection strategies
 */
export declare class NameStrategyFactory {
    /**
     * Create the default composite strategy with all detection patterns
     */
    static createDefault(): CompositeNameStrategy;
    /**
     * Create a strategy for specific categories only
     */
    static createForCategories(categories: NameCategory[], allStrategies: INameDetectionStrategy[]): CompositeNameStrategy;
}
export { INameDetectionStrategy as NameDetectionStrategy, };
//# sourceMappingURL=NameDetectionStrategy.d.ts.map