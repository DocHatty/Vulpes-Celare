/**
 * ============================================================================
 * VULPES CELARE - REDACTION DISPLAY COMPONENT
 * ============================================================================
 *
 * Elegant display of redaction results with diff-style highlighting,
 * PHI breakdown, and statistics.
 *
 * Usage:
 *   import { RedactionDisplay } from '../theme/output';
 *
 *   RedactionDisplay.show(original, result);
 *   RedactionDisplay.compact(result);
 */
export interface RedactionResult {
    text: string;
    redactionCount: number;
    executionTimeMs: number;
    breakdown: Record<string, number>;
}
export interface DisplayOptions {
    /** Show original text */
    showOriginal?: boolean;
    /** Show breakdown by type */
    showBreakdown?: boolean;
    /** Show statistics */
    showStats?: boolean;
    /** Maximum width for text display */
    maxWidth?: number;
    /** Compact mode */
    compact?: boolean;
    /** Highlight redaction markers */
    highlightMarkers?: boolean;
}
export declare class RedactionDisplay {
    /**
     * Show a full redaction result with original comparison
     */
    static show(original: string, result: RedactionResult, options?: DisplayOptions): void;
    /**
     * Compact single-line redaction display
     */
    static compact(result: RedactionResult): void;
    /**
     * Show redaction as a diff
     */
    static diff(original: string, result: RedactionResult): void;
    /**
     * Show inline redaction (original → redacted)
     */
    static inline(original: string, result: RedactionResult): void;
    /**
     * Show redaction statistics as a summary box
     */
    static summary(results: RedactionResult[]): void;
    /**
     * Show a health indicator based on redaction results
     */
    static health(result: RedactionResult, expected?: {
        minPhi?: number;
        maxPhi?: number;
    }): void;
    private static formatText;
    private static highlightRedactions;
    private static miniBar;
}
export default RedactionDisplay;
//# sourceMappingURL=RedactionDisplay.d.ts.map