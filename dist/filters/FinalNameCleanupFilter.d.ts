/**
 * Final Name Cleanup Filter
 *
 * Runs AFTER all name filters to clean up false positives
 * This is the Phileas Post-Filter Pipeline integrated as a final cleanup step
 *
 * @module filters
 */
import type { RedactionContext } from "../RedactionEngine";
import { BaseFilter } from "../RedactionEngine";
export declare class FinalNameCleanupFilter extends BaseFilter {
    getType(): string;
    /**
     * Clean up invalid NAME tokens detected by previous filters
     */
    apply(text: string, config: any, context: RedactionContext): string;
    /**
     * Determine if a detected name should be filtered out (false positive)
     */
    private shouldFilterOut;
    /**
     * Escape regex special characters
     */
    private escapeRegex;
}
//# sourceMappingURL=FinalNameCleanupFilter.d.ts.map