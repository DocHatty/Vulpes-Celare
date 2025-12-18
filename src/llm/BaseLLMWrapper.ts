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
export abstract class BaseLLMWrapper {
  protected vulpes: VulpesCelare;
  protected config: Required<LLMRedactionConfig>;
  protected auditLog: RedactionAuditEntry[] = [];

  // Session-based token managers for re-identification
  protected sessionTokenManagers: Map<string, TokenManager> = new Map();

  constructor(redactionConfig: LLMRedactionConfig = {}) {
    this.config = {
      enabled: redactionConfig.enabled ?? true,
      reidentifyResponse: redactionConfig.reidentifyResponse ?? false,
      policy: redactionConfig.policy ?? "maximum",
      logRedactions: redactionConfig.logRedactions ?? false,
      confidenceThreshold: redactionConfig.confidenceThreshold ?? 0.6,
    };

    this.vulpes = new VulpesCelare();
  }

  /**
   * Redact PHI from text and return mapping for re-identification
   *
   * @param text - Text to redact
   * @param sessionId - Optional session ID for consistent token mapping
   * @returns Redaction mapping with token manager
   */
  protected async redactText(
    text: string,
    sessionId?: string
  ): Promise<RedactionMapping> {
    if (!this.config.enabled) {
      // Create a dummy token manager for disabled mode
      const dummyManager = new TokenManager(sessionId || this.generateSessionId());
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
      tokenManager = new TokenManager(effectiveSessionId);
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
  protected reidentifyText(text: string, tokenManager: TokenManager): string {
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
  protected async redactMessages<T extends { content: string | unknown }>(
    messages: T[],
    sessionId?: string
  ): Promise<{ messages: T[]; tokenManager: TokenManager; totalRedacted: number }> {
    const effectiveSessionId = sessionId || this.generateSessionId();
    let tokenManager = this.sessionTokenManagers.get(effectiveSessionId);
    if (!tokenManager) {
      tokenManager = new TokenManager(effectiveSessionId);
      this.sessionTokenManagers.set(effectiveSessionId, tokenManager);
    }

    let totalRedacted = 0;
    const redactedMessages: T[] = [];

    for (const message of messages) {
      if (typeof message.content === "string") {
        const mapping = await this.redactText(message.content, effectiveSessionId);
        totalRedacted += mapping.redactionCount;
        redactedMessages.push({
          ...message,
          content: mapping.redactedText,
        });
      } else {
        // Non-string content (e.g., arrays for vision models) - pass through
        redactedMessages.push(message);
      }
    }

    return { messages: redactedMessages, tokenManager, totalRedacted };
  }

  /**
   * Generate a unique session ID
   */
  protected generateSessionId(): string {
    return `llm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Get audit log entries
   */
  public getAuditLog(): RedactionAuditEntry[] {
    return [...this.auditLog];
  }

  /**
   * Clear audit log
   */
  public clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Get redaction statistics
   */
  public getStats(): { totalRedactions: number; totalReidentifications: number } {
    let totalRedactions = 0;
    let totalReidentifications = 0;

    for (const entry of this.auditLog) {
      if (entry.operation === "redact") {
        totalRedactions += entry.phiCount;
      } else {
        totalReidentifications += entry.phiCount;
      }
    }

    return { totalRedactions, totalReidentifications };
  }

  /**
   * Check if a session has active token mappings
   */
  public hasSession(sessionId: string): boolean {
    return this.sessionTokenManagers.has(sessionId);
  }

  /**
   * Clear a specific session's token mappings
   */
  public clearSession(sessionId: string): void {
    this.sessionTokenManagers.delete(sessionId);
  }

  /**
   * Clear all session token mappings
   */
  public clearAllSessions(): void {
    this.sessionTokenManagers.clear();
  }
}
