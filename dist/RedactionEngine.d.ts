/**
 * RedactionEngine - Thin Orchestrator for PII/PHI Redaction
 *
 * Enterprise-grade redaction system with modular architecture:
 * - Token management (TokenManager, RedactionContext)
 * - Filter registration and application (FilterRegistry)
 * - Policy loading and caching (PolicyLoader)
 * - Statistics tracking (StatisticsTracker)
 * - Parallel NER and regex processing
 *
 * This facade delegates to specialized services while maintaining
 * backward compatibility with the original RedactionEngine interface.
 *
 * @module RedactionEngine
 */
import { RedactionContext } from "./context/RedactionContext";
export { RedactionContext } from "./context/RedactionContext";
/**
 * Base Filter - abstract class for all filters
 */
export declare abstract class BaseFilter {
    abstract apply(text: string, config: any, context: RedactionContext): string | Promise<string>;
    abstract getType(): string;
}
/**
 * RedactionEngine - Thin Orchestrator
 * Delegates to specialized services for each concern
 */
export declare class RedactionEngine {
    /**
     * Initialize the redaction engine
     * Loads all Span-based filters for parallel execution
     */
    static init(): Promise<void>;
    /**
     * Create a new redaction context for a request
     */
    static createContext(): RedactionContext;
    /**
     * Redact sensitive information from text
     * Parallel processing: Regex filters AND NER both process original text
     *
     * @throws {Error} If text is empty/null when policy requires redaction
     * @throws {Error} If policy is invalid or missing required fields
     * @throws {Error} If context is missing or invalid
     */
    static redact(text: string, policy: any, context: RedactionContext): Promise<string>;
    /**
     * Extract NER entities from NER result
     */
    private static extractNEREntities;
    /**
     * Map position in NER-redacted text back to original text position
     */
    private static mapNERPositionToOriginal;
    /**
     * Merge NER entities into regex-redacted text
     */
    private static mergeNEREntities;
    /**
     * Normalize tokens in LLM response (handle formatting variations)
     */
    static normalizeTokensInResponse(llmResponse: string): string;
    /**
     * Get system prompt instructions for LLM
     * Compressed to minimize token overhead (~25 tokens vs ~200)
     */
    static getSystemPromptInstructions(): string;
    /**
     * Load redaction policy from JSON file
     * Delegates to PolicyLoader
     */
    static loadPolicy(policyName: string): Promise<any>;
    /**
     * Record provenance data to the local RPL layer
     */
    private static recordProvenance;
}
//# sourceMappingURL=RedactionEngine.d.ts.map