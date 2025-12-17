/**
 * ============================================================================
 * VULPES CELARE - REDACTION REPORTER
 * ============================================================================
 *
 * Beautiful, informative redaction result display with:
 * - Diff-style highlighting (before/after)
 * - Inline span visualization
 * - PHI type coloring
 * - Confidence indicators
 * - Summary statistics
 *
 * Makes redaction results immediately understandable at a glance.
 */
export interface RedactionSpan {
    start: number;
    end: number;
    type: string;
    original: string;
    replacement: string;
    confidence: number;
    filter?: string;
}
export interface RedactionResult {
    originalText: string;
    redactedText: string;
    spans: RedactionSpan[];
    processingTimeMs?: number;
    documentId?: string;
}
export interface ReporterOptions {
    /** Show original text with highlights */
    showOriginal?: boolean;
    /** Show redacted text */
    showRedacted?: boolean;
    /** Show diff view (side by side or inline) */
    diffStyle?: "inline" | "sideBySide" | "unified" | "none";
    /** Show span details table */
    showSpanDetails?: boolean;
    /** Show summary statistics */
    showSummary?: boolean;
    /** Maximum text length before truncation */
    maxTextLength?: number;
    /** Context characters around each span */
    contextChars?: number;
    /** Compact mode (less verbose) */
    compact?: boolean;
}
export declare class RedactionReporter {
    private options;
    constructor(options?: ReporterOptions);
    /**
     * Render a complete redaction report
     */
    render(result: RedactionResult): string;
    /**
     * Render compact single-line summary
     */
    renderCompact(result: RedactionResult): string;
    /**
     * Render just the diff
     */
    renderDiff(result: RedactionResult): string;
    private truncateIfNeeded;
}
/**
 * Quick render a redaction result
 */
export declare function renderRedactionResult(result: RedactionResult, options?: ReporterOptions): string;
/**
 * Render a compact redaction summary
 */
export declare function renderRedactionCompact(result: RedactionResult): string;
/**
 * Highlight PHI in text (for display purposes)
 */
export declare function highlightPhi(text: string, spans: RedactionSpan[]): string;
//# sourceMappingURL=RedactionReporter.d.ts.map