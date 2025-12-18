/**
 * VULPES CELARE - BASE LLM WRAPPER
 *
 * Shared logic for LLM SDK wrappers that automatically redact PHI
 * before sending to external APIs and optionally re-identify on response.
 *
 * @module llm/BaseLLMWrapper
 */
import { VulpesCelare, RedactionResult } from "../VulpesCelare";
import { TokenManager } from "../tokens/TokenManager";
/**
 * Configuration for LLM redaction behavior
 */
export interface LLMRedactionConfig {
    /** Enable automatic redaction (default: true) */
    enabled?: boolean;
    /** Re-identify PHI in responses (default: false) */
    reidentifyResponse?: boolean;
    /** Vulpes policy to use (default: 'maximum') */
    policy?: string;
    /** Log redactions for audit (default: false) */
    logRedactions?: boolean;
    /** Custom confidence threshold (default: 0.6) */
    confidenceThreshold?: number;
}
/**
 * Result of a redaction operation with mapping for re-identification
 */
export interface RedactionMapping {
    /** Redacted text */
    redactedText: string;
    /** Original text */
    originalText: string;
    /** Token manager for re-identification */
    tokenManager: TokenManager;
    /** Redaction result with metadata */
    result: RedactionResult;
    /** Number of PHI elements redacted */
    redactionCount: number;
}
/**
 * Audit log entry for redaction operations
 */
export interface RedactionAuditEntry {
    timestamp: string;
    operation: "redact" | "reidentify";
    phiCount: number;
    executionTimeMs: number;
    model?: string;
}
/**
 * Base class for LLM SDK wrappers with PHI redaction
 */
export declare abstract class BaseLLMWrapper {
    protected vulpes: VulpesCelare;
    protected config: Required<LLMRedactionConfig>;
    protected auditLog: RedactionAuditEntry[];
    protected sessionTokenManagers: Map<string, TokenManager>;
    constructor(redactionConfig?: LLMRedactionConfig);
    /**
     * Redact PHI from text and return mapping for re-identification
     *
     * @param text - Text to redact
     * @param sessionId - Optional session ID for consistent token mapping
     * @returns Redaction mapping with token manager
     */
    protected redactText(text: string, sessionId?: string): Promise<RedactionMapping>;
    /**
     * Re-identify PHI in response text using token mapping
     *
     * @param text - Text with redaction tokens
     * @param tokenManager - Token manager with mappings
     * @returns Text with PHI restored
     */
    protected reidentifyText(text: string, tokenManager: TokenManager): string;
    /**
     * Redact PHI from an array of messages (chat format)
     *
     * @param messages - Array of chat messages
     * @param sessionId - Session ID for consistent mapping
     * @returns Redacted messages and combined token manager
     */
    protected redactMessages<T extends {
        content: string | unknown;
    }>(messages: T[], sessionId?: string): Promise<{
        messages: T[];
        tokenManager: TokenManager;
        totalRedacted: number;
    }>;
    /**
     * Generate a unique session ID
     */
    protected generateSessionId(): string;
    /**
     * Get audit log entries
     */
    getAuditLog(): RedactionAuditEntry[];
    /**
     * Clear audit log
     */
    clearAuditLog(): void;
    /**
     * Get redaction statistics
     */
    getStats(): {
        totalRedactions: number;
        totalReidentifications: number;
    };
    /**
     * Check if a session has active token mappings
     */
    hasSession(sessionId: string): boolean;
    /**
     * Clear a specific session's token mappings
     */
    clearSession(sessionId: string): void;
    /**
     * Clear all session token mappings
     */
    clearAllSessions(): void;
}
//# sourceMappingURL=BaseLLMWrapper.d.ts.map