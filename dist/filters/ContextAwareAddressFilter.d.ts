/**
 * ContextAwareAddressFilter - Partial Address Detection with Context Guards
 *
 * WIN-WIN STRATEGY:
 * - INCREASES SENSITIVITY: Detects partial addresses and geographic references
 *   that narrow down location below state level (HIPAA PHI requirement)
 * - INCREASES SPECIFICITY: Only matches when clinical/address context is present,
 *   preventing false positives on standalone geographic terms
 *
 * HIPAA Note: Geographic subdivisions smaller than a state are PHI. This includes:
 * - Street addresses (partial or complete)
 * - City names
 * - County names
 * - Zip codes (first 3 digits if population <20k)
 * - Landmarks that identify location
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
export declare class ContextAwareAddressFilter extends SpanBasedFilter {
    getType(): string;
    getPriority(): number;
    detect(text: string, _config: any, _context: unknown): Span[];
    /**
     * Detect partial address components
     */
    private detectPartialAddresses;
    /**
     * Detect city names with context
     */
    private detectCityNames;
    /**
     * Check if address-specific context exists near position
     */
    private hasAddressContext;
    /**
     * Check if a name is a US state (not PHI)
     */
    private isStateName;
}
//# sourceMappingURL=ContextAwareAddressFilter.d.ts.map