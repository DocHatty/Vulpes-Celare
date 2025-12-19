/**
 * URLFilterSpan - URL/Web Address Detection (Span-Based)
 *
 * Detects web URLs and domain names and returns Spans.
 * Includes detection of patient portal URLs and healthcare-related domains.
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class URLFilterSpan extends SpanBasedFilter {
    /**
     * URL regex pattern sources
     *
     * Matches:
     * - http://, https://, ftp:// protocols
     * - www. prefixed domains
     * - Domain names with paths and query strings
     */
    private static readonly URL_PATTERN_SOURCES;
    /**
     * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
     */
    private static readonly COMPILED_PATTERNS;
    /**
     * Pattern names for debugging
     */
    private static readonly PATTERN_NAMES;
    getType(): string;
    getPriority(): number;
    detect(text: string, _config: any, context: RedactionContext): Span[];
    /**
     * Helper to detect URLs using a specific pattern and avoid duplicates
     */
    private detectPattern;
}
//# sourceMappingURL=URLFilterSpan.d.ts.map