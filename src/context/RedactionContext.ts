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

import { DateShiftingEngine } from "../utils/DateShiftingEngine";
import { TokenManager } from "../tokens/TokenManager";
import { StatisticsTracker } from "../stats/StatisticsTracker";
import {
  ReplacementContextService,
  ReplacementScope,
} from "../services/ReplacementContextService";
import { FilterType } from "../models/Span";

/**
 * Redaction Context - manages token mappings for a request
 */
export class RedactionContext {
  private sessionId: string;
  private tokenManager: TokenManager;
  private statsTracker: StatisticsTracker;
  private createdAt: number;
  private referenceDate: Date;
  private dateShiftingEngine: DateShiftingEngine;
  private replacementService: ReplacementContextService;
  private contextName: string;

  constructor(
    sessionId?: string,
    contextName: string = "default",
    replacementScope: ReplacementScope = ReplacementScope.DOCUMENT,
  ) {
    this.sessionId =
      sessionId || Date.now() + "_" + Math.floor(Math.random() * 9000 + 1000);
    this.createdAt = Date.now();
    this.referenceDate = new Date();
    this.contextName = contextName;
    this.tokenManager = new TokenManager(this.sessionId);
    this.statsTracker = new StatisticsTracker();
    this.dateShiftingEngine = new DateShiftingEngine(this.sessionId);
    this.replacementService = new ReplacementContextService(replacementScope);
  }

  /**
   * Create a unique token and store the mapping
   * Returns: "{{EMAIL_12345_1}}" format
   *
   * Uses ReplacementContextService for consistent replacements:
   * - Same value → Same token (within scope)
   */
  createToken(type: string, originalValue: string): string {
    const filterType = type as FilterType;

    // Use ReplacementContextService for consistent replacements
    const token = this.replacementService.getReplacement(
      originalValue,
      filterType,
      this.contextName,
      () => {
        // Generator: create new token via TokenManager
        return this.tokenManager.createToken(type, originalValue);
      },
    );

    this.statsTracker.increment(type);
    return token;
  }

  /**
   * Create a date token using HIPAA-compliant date shifting
   * Returns: [SHIFTED_DATE_1: 2023] or [97 days later, SHIFTED_DATE_2: 2024]
   */
  createDateToken(originalValue: string): string {
    const eventNumber = this.dateShiftingEngine.addDate(originalValue);

    if (eventNumber === null) {
      console.warn(
        `[RedactionContext] Failed to parse date: ${originalValue}, using generic redaction`,
      );
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
  reinsert(llmResponse: string): string {
    return this.tokenManager.reinsert(llmResponse);
  }

  /**
   * Get redaction statistics
   */
  getStats(): { totalTokens: number; breakdown: string; [key: string]: any } {
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
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get token map (for debugging/auditing)
   */
  getTokenMap(): Map<string, string> {
    return this.tokenManager.getTokenMap();
  }

  /**
   * Get original value for a token
   */
  getOriginalValue(token: string): string | undefined {
    return this.tokenManager.getOriginalValue(token);
  }

  /**
   * Get temporal context for system prompt
   */
  getTemporalContext(): string {
    return this.dateShiftingEngine.getSummary();
  }

  /**
   * Get replacement context service
   */
  getReplacementService(): ReplacementContextService {
    return this.replacementService;
  }

  /**
   * Get context name
   */
  getContextName(): string {
    return this.contextName;
  }

  /**
   * Get replacement statistics
   */
  getReplacementStats() {
    return this.replacementService.getStatistics();
  }
}
