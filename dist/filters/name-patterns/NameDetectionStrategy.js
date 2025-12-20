"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NameStrategyFactory = exports.CompositeNameStrategy = exports.BaseNameStrategy = void 0;
const Span_1 = require("../../models/Span");
const SpanBasedFilter_1 = require("../../core/SpanBasedFilter");
const SpanFactory_1 = require("../../core/SpanFactory");
// ============================================================================
// BASE STRATEGY
// ============================================================================
/**
 * Abstract base class for name detection strategies
 */
class BaseNameStrategy {
    supportsCategory(category) {
        return this.categories.includes(category);
    }
    /**
     * Create a Span from a detection result
     */
    toSpan(result, sourceText) {
        const filterType = result.metadata?.isProvider
            ? Span_1.FilterType.PROVIDER_NAME
            : Span_1.FilterType.NAME;
        return SpanFactory_1.SpanFactory.fromPosition(sourceText, result.characterStart, result.characterEnd, filterType, {
            confidence: result.confidence,
            priority: SpanBasedFilter_1.FilterPriority.NAME,
            pattern: result.pattern,
        });
    }
    /**
     * Extract context around a detection
     */
    extractContext(text, start, end, windowSize = 50) {
        const ctxStart = Math.max(0, start - windowSize);
        const ctxEnd = Math.min(text.length, end + windowSize);
        return text.substring(ctxStart, ctxEnd);
    }
    /**
     * Check if a position is at a word boundary
     */
    isWordBoundary(text, pos) {
        if (pos <= 0 || pos >= text.length)
            return true;
        const before = text[pos - 1];
        const after = text[pos];
        const wordChar = /[a-zA-Z0-9_'-]/;
        return !wordChar.test(before) || !wordChar.test(after);
    }
}
exports.BaseNameStrategy = BaseNameStrategy;
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
class CompositeNameStrategy {
    id = "composite";
    name = "Composite Name Detection";
    strategies;
    get categories() {
        const allCategories = new Set();
        for (const strategy of this.strategies) {
            for (const cat of strategy.categories) {
                allCategories.add(cat);
            }
        }
        return Array.from(allCategories);
    }
    constructor(strategies) {
        this.strategies = strategies;
    }
    /**
     * Add a strategy to the composite
     */
    addStrategy(strategy) {
        this.strategies.push(strategy);
    }
    /**
     * Remove a strategy by ID
     */
    removeStrategy(strategyId) {
        this.strategies = this.strategies.filter((s) => s.id !== strategyId);
    }
    detect(text, config) {
        const allResults = [];
        for (const strategy of this.strategies) {
            const results = strategy.detect(text, config);
            allResults.push(...results);
        }
        // Deduplicate overlapping results (keep highest confidence)
        return this.deduplicateResults(allResults);
    }
    supportsCategory(category) {
        return this.strategies.some((s) => s.supportsCategory(category));
    }
    /**
     * Deduplicate overlapping results, keeping highest confidence
     */
    deduplicateResults(results) {
        if (results.length <= 1)
            return results;
        // Sort by start position, then by confidence (descending)
        const sorted = [...results].sort((a, b) => {
            if (a.characterStart !== b.characterStart) {
                return a.characterStart - b.characterStart;
            }
            return b.confidence - a.confidence;
        });
        const deduplicated = [];
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
            }
            else {
                deduplicated.push(result);
                lastEnd = result.characterEnd;
            }
        }
        return deduplicated;
    }
}
exports.CompositeNameStrategy = CompositeNameStrategy;
// ============================================================================
// FACTORY
// ============================================================================
/**
 * Factory for creating name detection strategies
 */
class NameStrategyFactory {
    /**
     * Create the default composite strategy with all detection patterns
     */
    static createDefault() {
        return new CompositeNameStrategy([
        // Add strategies here as they are implemented
        // new StructuredNameStrategy(),
        // new ContextualNameStrategy(),
        ]);
    }
    /**
     * Create a strategy for specific categories only
     */
    static createForCategories(categories, allStrategies) {
        const filtered = allStrategies.filter((s) => categories.some((cat) => s.supportsCategory(cat)));
        return new CompositeNameStrategy(filtered);
    }
}
exports.NameStrategyFactory = NameStrategyFactory;
//# sourceMappingURL=NameDetectionStrategy.js.map