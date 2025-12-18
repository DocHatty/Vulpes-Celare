/**
 * IPAddressFilterSpan - IP Address Detection (Span-Based)
 *
 * Detects IPv4 addresses with validation and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class IPAddressFilterSpan extends SpanBasedFilter {
    /**
     * Pre-compiled IPv4 regex pattern
     *
     * Matches: XXX.XXX.XXX.XXX where XXX is 1-3 digits
     * Validation ensures each octet is 0-255
     */
    private static readonly IP_PATTERN;
    getType(): string;
    getPriority(): number;
    detect(text: string, config: any, context: RedactionContext): Span[];
    /**
     * Validate IPv4 address octets
     *
     * Each octet must be 0-255 (inclusive).
     */
    private isValidIP;
}
//# sourceMappingURL=IPAddressFilterSpan.d.ts.map