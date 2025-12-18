/**
 * FormattedNameFilterSpan - Formatted Name Detection (Span-Based)
 *
 * Detects standard formatted names in various patterns and returns Spans.
 * This is the most complex name filter with extensive validation.
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class FormattedNameFilterSpan extends SpanBasedFilter {
    getType(): string;
    getPriority(): number;
    detect(text: string, config: any, context: RedactionContext): Span[];
    /**
     * Detect explicit "name field" values.
     * These are very high-signal contexts in clinical/admin documents and should not be missed.
     */
    private detectLabeledNameFields;
    /**
     * Pattern 0: Last, First format (both mixed case and ALL CAPS)
     * STREET-SMART: "Last, First" and "Last, First Middle" formats are highly specific
     * to person names in medical documents. Don't whitelist based on individual words.
     */
    private detectLastFirstNames;
    /**
     * Pattern 5: First Initial + Last Name
     */
    private detectInitialLastNames;
    /**
     * Pattern 8: General full names (most permissive)
     */
    private detectGeneralFullNames;
    /**
     * Validation helpers - Delegates to shared NameDetectionUtils
     */
    private validateLastFirst;
    /**
     * STREET-SMART: Special whitelist check for "Last, First [Middle]" format.
     * Only whitelist if the ENTIRE phrase is a known non-person term.
     * Do NOT whitelist based on individual words like "Ann" (Ann Arbor staging).
     */
    private isWhitelistedLastFirst;
    private isLikelyName;
    private isLikelyPersonName;
    /**
     * Enhanced whitelist check using UnifiedMedicalWhitelist.
     * STREET-SMART: For ALL CAPS LAST, FIRST format, be more permissive -
     * these are almost always patient names in medical documents
     */
    private isWhitelisted;
    /**
     * Rust-accelerated Last, First detection
     * Uses coordinator for cached results to avoid duplicate FFI calls
     */
    private detectRustLastFirstNames;
    /**
     * Rust-accelerated First Last detection
     * Uses coordinator for cached results to avoid duplicate FFI calls
     */
    private detectRustFirstLastNames;
}
//# sourceMappingURL=FormattedNameFilterSpan.d.ts.map