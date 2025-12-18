/**
 * Replacement Context Service
 *
 * Ensures consistent token replacement across document/session.
 * Based on Phileas's ContextService architecture.
 *
 * Guarantees: Same original value → Same token replacement
 *
 * @module redaction/services
 */
import { FilterType } from "../models/Span";
export declare enum ReplacementScope {
    /** Same value gets same replacement across entire document */
    DOCUMENT = "DOCUMENT",
    /** Same value gets same replacement within same context */
    CONTEXT = "CONTEXT",
    /** No consistency - each occurrence gets unique replacement */
    NONE = "NONE"
}
export interface ReplacementEntry {
    originalValue: string;
    replacement: string;
    filterType: FilterType;
    context: string;
    firstSeen: number;
    occurrences: number;
}
/**
 * Replacement Context Service
 * Manages consistent token replacement across scopes
 */
export declare class ReplacementContextService {
    private scope;
    private documentMap;
    private contextMap;
    private stats;
    constructor(scope?: ReplacementScope);
    /**
     * Get replacement for a value (or create new one)
     *
     * @param originalValue - Original PII/PHI value
     * @param filterType - Type of filter
     * @param context - Document context (for CONTEXT scope)
     * @param generator - Function to generate new replacement if needed
     * @returns Replacement token (consistent if seen before)
     */
    getReplacement(originalValue: string, filterType: FilterType, context: string, generator: () => string): string;
    /**
     * Check if value has been seen before
     *
     * @param originalValue - Original value
     * @param filterType - Filter type
     * @param context - Document context
     * @returns True if value has existing replacement
     */
    hasSeen(originalValue: string, filterType: FilterType, context: string): boolean;
    /**
     * Get existing replacement (if any)
     *
     * @param originalValue - Original value
     * @param filterType - Filter type
     * @param context - Document context
     * @returns Existing replacement or null
     */
    getExistingReplacement(originalValue: string, filterType: FilterType, context: string): string | null;
    /**
     * Get all replacements for a filter type
     *
     * @param filterType - Filter type
     * @returns Array of replacement entries
     */
    getReplacementsForType(filterType: FilterType): ReplacementEntry[];
    /**
     * Get all replacements for a context
     *
     * @param context - Document context
     * @returns Array of replacement entries
     */
    getReplacementsForContext(context: string): ReplacementEntry[];
    /**
     * Get total number of unique values tracked
     */
    getUniqueValueCount(): number;
    /**
     * Get total number of replacements made
     */
    getTotalReplacementCount(): number;
    /**
     * Get number of consistent replacements (reused existing token)
     */
    getConsistentReplacementCount(): number;
    /**
     * Get statistics
     */
    getStatistics(): {
        uniqueValues: number;
        consistencyRate: number;
        totalReplacements: number;
        consistentReplacements: number;
    };
    /**
     * Clear all replacements
     */
    clear(): void;
    /**
     * Set replacement scope
     */
    setScope(scope: ReplacementScope): void;
    /**
     * Get current scope
     */
    getScope(): ReplacementScope;
    /**
     * Export replacements to JSON
     */
    export(): Record<string, any>;
    /**
     * Import replacements from JSON
     */
    import(data: Record<string, any>): void;
    /**
     * Make key for map lookup
     */
    private makeKey;
    /**
     * Get appropriate map based on scope
     */
    private getMap;
}
//# sourceMappingURL=ReplacementContextService.d.ts.map