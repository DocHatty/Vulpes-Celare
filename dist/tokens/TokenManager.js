"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenManager = void 0;
/**
 * Token Manager - creates and manages redaction tokens
 */
class TokenManager {
    sessionId;
    tokens = new Map();
    counters = new Map();
    tokensReinserted = 0;
    constructor(sessionId) {
        this.sessionId = sessionId;
    }
    /**
     * Create a unique token for a type and value
     * Format: {{TYPE_SESSION_N}}
     */
    createToken(type, originalValue) {
        // Increment counter for this type
        if (!this.counters.has(type)) {
            this.counters.set(type, 0);
        }
        const count = (this.counters.get(type) || 0) + 1;
        this.counters.set(type, count);
        // Format: {{TYPE_SESSION_N}}
        const token = `{{${type}_${this.sessionId}_${count}}}`;
        // Store mapping
        this.tokens.set(token, originalValue);
        // Warn if DATE type is used (should use createDateToken)
        if (type === "DATE") {
        }
        return token;
    }
    /**
     * Store a token-to-value mapping directly
     * Used for special tokens like SHIFTED_DATE
     */
    storeToken(token, originalValue) {
        this.tokens.set(token, originalValue);
    }
    /**
     * Reinsert original values back into LLM response
     * Optimized: O(m) single-pass for standard tokens, O(n) for date tokens
     */
    reinsert(llmResponse) {
        if (!llmResponse || this.tokens.size === 0) {
            this.tokensReinserted = 0;
            return llmResponse;
        }
        let processedResponse = llmResponse;
        let tokensReplaced = 0;
        // STEP 1: Handle SHIFTED_DATE tokens with intervals
        // Build a lookup map for date tokens
        const dateTokenMap = new Map();
        for (const [token, originalValue] of this.tokens) {
            if (token.includes("SHIFTED_DATE")) {
                const match = token.match(/SHIFTED_DATE_(\d+)/);
                if (match) {
                    dateTokenMap.set(match[1], originalValue);
                }
            }
        }
        if (dateTokenMap.size > 0) {
            const shiftedDatePattern = /\[(?:(\d+)\s+days\s+(earlier|later),\s+)?SHIFTED_DATE_(\d+):\s+(\d{4})\]/g;
            processedResponse = processedResponse.replace(shiftedDatePattern, (match, _days, _direction, dateNum) => {
                const originalValue = dateTokenMap.get(dateNum);
                if (originalValue) {
                    tokensReplaced++;
                    return originalValue;
                }
                return match;
            });
        }
        // STEP 2: Single-pass replacement for standard tokens
        // Build combined pattern for all non-date tokens
        const standardTokens = [];
        const tokenLookup = new Map();
        for (const [token, originalValue] of this.tokens) {
            if (!token.includes("SHIFTED_DATE")) {
                standardTokens.push(token);
                tokenLookup.set(token, originalValue);
            }
        }
        if (standardTokens.length > 0) {
            // Build single regex pattern: (token1|token2|token3|...)
            const exactPattern = new RegExp(standardTokens.map((t) => this.escapeRegex(t)).join("|"), "g");
            // Single-pass exact replacement - O(m) where m is response length
            processedResponse = processedResponse.replace(exactPattern, (match) => {
                const original = tokenLookup.get(match);
                if (original) {
                    tokensReplaced++;
                    return original;
                }
                return match;
            });
        }
        this.tokensReinserted = tokensReplaced;
        return processedResponse;
    }
    /**
     * Escape regex special characters
     */
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    /**
     * Get token map (for debugging)
     */
    getTokenMap() {
        return new Map(this.tokens);
    }
    /**
     * Get original value for a token
     */
    getOriginalValue(token) {
        return this.tokens.get(token);
    }
    /**
     * Get count of tokens reinserted in last operation
     */
    getTokensReinsertedCount() {
        return this.tokensReinserted;
    }
}
exports.TokenManager = TokenManager;
//# sourceMappingURL=TokenManager.js.map