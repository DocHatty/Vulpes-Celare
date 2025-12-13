"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedactionContext = void 0;
const DateShiftingEngine_1 = require("../utils/DateShiftingEngine");
const TokenManager_1 = require("../tokens/TokenManager");
const StatisticsTracker_1 = require("../stats/StatisticsTracker");
const ReplacementContextService_1 = require("../services/ReplacementContextService");
/**
 * Redaction Context - manages token mappings for a request
 */
class RedactionContext {
    sessionId;
    tokenManager;
    statsTracker;
    createdAt;
    referenceDate;
    dateShiftingEngine;
    replacementService;
    contextName;
    memo = new Map();
    constructor(sessionId, contextName = "default", replacementScope = ReplacementContextService_1.ReplacementScope.DOCUMENT) {
        this.sessionId =
            sessionId || Date.now() + "_" + Math.floor(Math.random() * 9000 + 1000);
        this.createdAt = Date.now();
        this.referenceDate = new Date();
        this.contextName = contextName;
        this.tokenManager = new TokenManager_1.TokenManager(this.sessionId);
        this.statsTracker = new StatisticsTracker_1.StatisticsTracker();
        this.dateShiftingEngine = new DateShiftingEngine_1.DateShiftingEngine(this.sessionId);
        this.replacementService = new ReplacementContextService_1.ReplacementContextService(replacementScope);
    }
    /**
     * Create a unique token and store the mapping
     * Returns: "{{EMAIL_12345_1}}" format
     *
     * Uses ReplacementContextService for consistent replacements:
     * - Same value → Same token (within scope)
     */
    createToken(type, originalValue) {
        const filterType = type;
        // Use ReplacementContextService for consistent replacements
        const token = this.replacementService.getReplacement(originalValue, filterType, this.contextName, () => {
            // Generator: create new token via TokenManager
            return this.tokenManager.createToken(type, originalValue);
        });
        this.statsTracker.increment(type);
        return token;
    }
    /**
     * Create a date token using HIPAA-compliant date shifting
     * Returns: [SHIFTED_DATE_1: 2023] or [97 days later, SHIFTED_DATE_2: 2024]
     */
    createDateToken(originalValue) {
        const eventNumber = this.dateShiftingEngine.addDate(originalValue);
        if (eventNumber === null) {
            console.warn(`[RedactionContext] Failed to parse date: ${originalValue}, using generic redaction`);
            return "[DATE_REDACTED]";
        }
        const token = this.dateShiftingEngine.generateToken(eventNumber);
        this.tokenManager.storeToken(token, originalValue);
        this.statsTracker.increment("DATE");
        return token;
    }
    /**
     * Reinsert original values back into LLM response
     */
    reinsert(llmResponse) {
        return this.tokenManager.reinsert(llmResponse);
    }
    /**
     * Get redaction statistics
     */
    getStats() {
        const stats = this.statsTracker.getStats();
        const totalTokens = this.statsTracker.getTotalCount();
        // Format breakdown as "TYPE1: N, TYPE2: M"
        const breakdown = Object.entries(stats)
            .map(([type, count]) => `${type}: ${count}`)
            .join(", ");
        return {
            ...stats,
            totalTokens,
            breakdown,
        };
    }
    /**
     * Get session ID
     */
    getSessionId() {
        return this.sessionId;
    }
    /**
     * Get token map (for debugging/auditing)
     */
    getTokenMap() {
        return this.tokenManager.getTokenMap();
    }
    /**
     * Get original value for a token
     */
    getOriginalValue(token) {
        return this.tokenManager.getOriginalValue(token);
    }
    /**
     * Get temporal context for system prompt
     */
    getTemporalContext() {
        return this.dateShiftingEngine.getSummary();
    }
    /**
     * Get replacement context service
     */
    getReplacementService() {
        return this.replacementService;
    }
    /**
     * Get context name
     */
    getContextName() {
        return this.contextName;
    }
    /**
     * Get replacement statistics
     */
    getReplacementStats() {
        return this.replacementService.getStatistics();
    }
    /**
     * Internal per-request memoization store.
     * Modules should namespace keys to avoid collisions (e.g., `MyModule:cache`).
     *
     * This is intentionally generic so we can standardize caches on `RedactionContext`
     * without introducing a global registry.
     *
     * @internal
     */
    getMemo(key) {
        return this.memo.get(key);
    }
    /**
     * @internal
     */
    setMemo(key, value) {
        this.memo.set(key, value);
    }
    /**
     * @internal
     */
    getOrCreateMemo(key, factory) {
        const existing = this.getMemo(key);
        if (existing !== undefined)
            return existing;
        const created = factory();
        this.setMemo(key, created);
        return created;
    }
}
exports.RedactionContext = RedactionContext;
//# sourceMappingURL=RedactionContext.js.map