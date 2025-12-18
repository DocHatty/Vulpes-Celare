"use strict";
/**
 * VULPES CELARE - BASE LLM WRAPPER
 *
 * Shared logic for LLM SDK wrappers that automatically redact PHI
 * before sending to external APIs and optionally re-identify on response.
 *
 * @module llm/BaseLLMWrapper
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseLLMWrapper = void 0;
const VulpesCelare_1 = require("../VulpesCelare");
const TokenManager_1 = require("../tokens/TokenManager");
/**
 * Base class for LLM SDK wrappers with PHI redaction
 */
class BaseLLMWrapper {
    vulpes;
    config;
    auditLog = [];
    // Session-based token managers for re-identification
    sessionTokenManagers = new Map();
    constructor(redactionConfig = {}) {
        this.config = {
            enabled: redactionConfig.enabled ?? true,
            reidentifyResponse: redactionConfig.reidentifyResponse ?? false,
            policy: redactionConfig.policy ?? "maximum",
            logRedactions: redactionConfig.logRedactions ?? false,
            confidenceThreshold: redactionConfig.confidenceThreshold ?? 0.6,
        };
        this.vulpes = new VulpesCelare_1.VulpesCelare();
    }
    /**
     * Redact PHI from text and return mapping for re-identification
     *
     * @param text - Text to redact
     * @param sessionId - Optional session ID for consistent token mapping
     * @returns Redaction mapping with token manager
     */
    async redactText(text, sessionId) {
        if (!this.config.enabled) {
            // Create a dummy token manager for disabled mode
            const dummyManager = new TokenManager_1.TokenManager(sessionId || this.generateSessionId());
            return {
                redactedText: text,
                originalText: text,
                tokenManager: dummyManager,
                result: {
                    text,
                    redactionCount: 0,
                    breakdown: {},
                    executionTimeMs: 0,
                },
                redactionCount: 0,
            };
        }
        const effectiveSessionId = sessionId || this.generateSessionId();
        // Get or create token manager for this session
        let tokenManager = this.sessionTokenManagers.get(effectiveSessionId);
        if (!tokenManager) {
            tokenManager = new TokenManager_1.TokenManager(effectiveSessionId);
            this.sessionTokenManagers.set(effectiveSessionId, tokenManager);
        }
        // Process with Vulpes
        const result = await this.vulpes.process(text);
        // Log if enabled
        if (this.config.logRedactions) {
            this.auditLog.push({
                timestamp: new Date().toISOString(),
                operation: "redact",
                phiCount: result.redactionCount,
                executionTimeMs: result.executionTimeMs,
            });
        }
        return {
            redactedText: result.text,
            originalText: text,
            tokenManager,
            result,
            redactionCount: result.redactionCount,
        };
    }
    /**
     * Re-identify PHI in response text using token mapping
     *
     * @param text - Text with redaction tokens
     * @param tokenManager - Token manager with mappings
     * @returns Text with PHI restored
     */
    reidentifyText(text, tokenManager) {
        if (!this.config.reidentifyResponse) {
            return text;
        }
        const reidentified = tokenManager.reinsert(text);
        // Log if enabled
        if (this.config.logRedactions) {
            this.auditLog.push({
                timestamp: new Date().toISOString(),
                operation: "reidentify",
                phiCount: tokenManager.getTokensReinsertedCount(),
                executionTimeMs: 0,
            });
        }
        return reidentified;
    }
    /**
     * Redact PHI from an array of messages (chat format)
     *
     * @param messages - Array of chat messages
     * @param sessionId - Session ID for consistent mapping
     * @returns Redacted messages and combined token manager
     */
    async redactMessages(messages, sessionId) {
        const effectiveSessionId = sessionId || this.generateSessionId();
        let tokenManager = this.sessionTokenManagers.get(effectiveSessionId);
        if (!tokenManager) {
            tokenManager = new TokenManager_1.TokenManager(effectiveSessionId);
            this.sessionTokenManagers.set(effectiveSessionId, tokenManager);
        }
        let totalRedacted = 0;
        const redactedMessages = [];
        for (const message of messages) {
            if (typeof message.content === "string") {
                const mapping = await this.redactText(message.content, effectiveSessionId);
                totalRedacted += mapping.redactionCount;
                redactedMessages.push({
                    ...message,
                    content: mapping.redactedText,
                });
            }
            else {
                // Non-string content (e.g., arrays for vision models) - pass through
                redactedMessages.push(message);
            }
        }
        return { messages: redactedMessages, tokenManager, totalRedacted };
    }
    /**
     * Generate a unique session ID
     */
    generateSessionId() {
        return `llm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
    /**
     * Get audit log entries
     */
    getAuditLog() {
        return [...this.auditLog];
    }
    /**
     * Clear audit log
     */
    clearAuditLog() {
        this.auditLog = [];
    }
    /**
     * Get redaction statistics
     */
    getStats() {
        let totalRedactions = 0;
        let totalReidentifications = 0;
        for (const entry of this.auditLog) {
            if (entry.operation === "redact") {
                totalRedactions += entry.phiCount;
            }
            else {
                totalReidentifications += entry.phiCount;
            }
        }
        return { totalRedactions, totalReidentifications };
    }
    /**
     * Check if a session has active token mappings
     */
    hasSession(sessionId) {
        return this.sessionTokenManagers.has(sessionId);
    }
    /**
     * Clear a specific session's token mappings
     */
    clearSession(sessionId) {
        this.sessionTokenManagers.delete(sessionId);
    }
    /**
     * Clear all session token mappings
     */
    clearAllSessions() {
        this.sessionTokenManagers.clear();
    }
}
exports.BaseLLMWrapper = BaseLLMWrapper;
//# sourceMappingURL=BaseLLMWrapper.js.map