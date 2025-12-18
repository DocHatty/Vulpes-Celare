/**
 * Token Manager
 *
 * Handles token creation, storage, and reinsertion:
 * - Unique token generation
 * - Token-to-value mapping storage
 * - Token reinsertion (exact matching)
 *
 * @module redaction/tokens
 */
/**
 * Token Manager - creates and manages redaction tokens
 */
export declare class TokenManager {
    private sessionId;
    private tokens;
    private counters;
    private tokensReinserted;
    constructor(sessionId: string);
    /**
     * Create a unique token for a type and value
     * Format: {{TYPE_SESSION_N}}
     */
    createToken(type: string, originalValue: string): string;
    /**
     * Store a token-to-value mapping directly
     * Used for special tokens like SHIFTED_DATE
     */
    storeToken(token: string, originalValue: string): void;
    /**
     * Reinsert original values back into LLM response
     * Optimized: O(m) single-pass for standard tokens, O(n) for date tokens
     */
    reinsert(llmResponse: string): string;
    /**
     * Escape regex special characters
     */
    private escapeRegex;
    /**
     * Get token map (for debugging)
     */
    getTokenMap(): Map<string, string>;
    /**
     * Get original value for a token
     */
    getOriginalValue(token: string): string | undefined;
    /**
     * Get count of tokens reinserted in last operation
     */
    getTokensReinsertedCount(): number;
}
//# sourceMappingURL=TokenManager.d.ts.map