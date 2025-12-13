/**
 * Redaction Context
 *
 * Manages token mappings for a single redaction session:
 * - Token creation and storage
 * - Token-to-original-value mappings
 * - Statistics tracking
 * - Session management
 *
 * @module redaction/context
 */
import { ReplacementContextService, ReplacementScope } from "../services/ReplacementContextService";
/**
 * Redaction Context - manages token mappings for a request
 */
export declare class RedactionContext {
    private sessionId;
    private tokenManager;
    private statsTracker;
    private createdAt;
    private referenceDate;
    private dateShiftingEngine;
    private replacementService;
    private contextName;
    private readonly memo;
    constructor(sessionId?: string, contextName?: string, replacementScope?: ReplacementScope);
    /**
     * Create a unique token and store the mapping
     * Returns: "{{EMAIL_12345_1}}" format
     *
     * Uses ReplacementContextService for consistent replacements:
     * - Same value → Same token (within scope)
     */
    createToken(type: string, originalValue: string): string;
    /**
     * Create a date token using HIPAA-compliant date shifting
     * Returns: [SHIFTED_DATE_1: 2023] or [97 days later, SHIFTED_DATE_2: 2024]
     */
    createDateToken(originalValue: string): string;
    /**
     * Reinsert original values back into LLM response
     */
    reinsert(llmResponse: string): string;
    /**
     * Get redaction statistics
     */
    getStats(): {
        totalTokens: number;
        breakdown: string;
        [key: string]: any;
    };
    /**
     * Get session ID
     */
    getSessionId(): string;
    /**
     * Get token map (for debugging/auditing)
     */
    getTokenMap(): Map<string, string>;
    /**
     * Get original value for a token
     */
    getOriginalValue(token: string): string | undefined;
    /**
     * Get temporal context for system prompt
     */
    getTemporalContext(): string;
    /**
     * Get replacement context service
     */
    getReplacementService(): ReplacementContextService;
    /**
     * Get context name
     */
    getContextName(): string;
    /**
     * Get replacement statistics
     */
    getReplacementStats(): {
        uniqueValues: number;
        consistencyRate: number;
        totalReplacements: number;
        consistentReplacements: number;
    };
    /**
     * Internal per-request memoization store.
     * Modules should namespace keys to avoid collisions (e.g., `MyModule:cache`).
     *
     * This is intentionally generic so we can standardize caches on `RedactionContext`
     * without introducing a global registry.
     *
     * @internal
     */
    getMemo<T>(key: string): T | undefined;
    /**
     * @internal
     */
    setMemo<T>(key: string, value: T): void;
    /**
     * @internal
     */
    getOrCreateMemo<T>(key: string, factory: () => T): T;
}
//# sourceMappingURL=RedactionContext.d.ts.map