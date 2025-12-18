/**
 * Filter Adapter
 *
 * Wraps legacy text-based filters to work in the Span-based parallel architecture.
 * This allows gradual migration without rewriting all 25+ filters at once.
 *
 * @module redaction/core
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "./SpanBasedFilter";
import { BaseFilter } from "./BaseFilter";
import { RedactionContext } from "../context/RedactionContext";
/**
 * Adapter that converts legacy BaseFilter to SpanBasedFilter
 */
export declare class FilterAdapter extends SpanBasedFilter {
    private legacyFilter;
    private filterType;
    private priority;
    constructor(legacyFilter: BaseFilter, priority?: number);
    getType(): string;
    getPriority(): number;
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
    detect(text: string, config: any, context: RedactionContext): Promise<Span[]>;
    /**
     * Extract Spans by finding tokens in the redacted text
     */
    private extractSpansFromTokens;
    /**
     * Find position in original text by mapping from tokenized text
     */
    private findPositionInOriginal;
    /**
     * Create a Span from position info
     */
    private createSpan;
}
//# sourceMappingURL=FilterAdapter.d.ts.map