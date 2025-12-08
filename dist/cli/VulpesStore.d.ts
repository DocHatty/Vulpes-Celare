/**
 * ============================================================================
 * VULPES STORE - Unified Configuration & Database Module
 * ============================================================================
 *
 * Single source of truth for all Vulpes CLI persistence:
 * - Config management via Conf (replaces manual JSON)
 * - SQLite database for sessions, audit logs, agent memory
 * - Zod schemas for type-safe validation
 *
 * Storage location: ~/.vulpes/
 * ├── config.json     (managed by Conf)
 * └── vulpes.db       (SQLite database)
 */
import Database from "better-sqlite3";
import { z } from "zod";
/**
 * API Key configuration schema
 */
export declare const ApiKeySchema: z.ZodObject<{
    ANTHROPIC_API_KEY: z.ZodOptional<z.ZodString>;
    OPENAI_API_KEY: z.ZodOptional<z.ZodString>;
    OPENROUTER_API_KEY: z.ZodOptional<z.ZodString>;
    GOOGLE_API_KEY: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * User preferences schema
 */
export declare const PreferencesSchema: z.ZodObject<{
    defaultProvider: z.ZodDefault<z.ZodEnum<{
        anthropic: "anthropic";
        openai: "openai";
        openrouter: "openrouter";
        ollama: "ollama";
        custom: "custom";
        google: "google";
    }>>;
    defaultModel: z.ZodOptional<z.ZodString>;
    theme: z.ZodDefault<z.ZodEnum<{
        default: "default";
        minimal: "minimal";
        colorful: "colorful";
    }>>;
    verboseMode: z.ZodDefault<z.ZodBoolean>;
    subagentsEnabled: z.ZodDefault<z.ZodBoolean>;
    maxParallelSubagents: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
/**
 * Full config schema
 */
export declare const ConfigSchema: z.ZodObject<{
    apiKeys: z.ZodObject<{
        ANTHROPIC_API_KEY: z.ZodOptional<z.ZodString>;
        OPENAI_API_KEY: z.ZodOptional<z.ZodString>;
        OPENROUTER_API_KEY: z.ZodOptional<z.ZodString>;
        GOOGLE_API_KEY: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    preferences: z.ZodObject<{
        defaultProvider: z.ZodDefault<z.ZodEnum<{
            anthropic: "anthropic";
            openai: "openai";
            openrouter: "openrouter";
            ollama: "ollama";
            custom: "custom";
            google: "google";
        }>>;
        defaultModel: z.ZodOptional<z.ZodString>;
        theme: z.ZodDefault<z.ZodEnum<{
            default: "default";
            minimal: "minimal";
            colorful: "colorful";
        }>>;
        verboseMode: z.ZodDefault<z.ZodBoolean>;
        subagentsEnabled: z.ZodDefault<z.ZodBoolean>;
        maxParallelSubagents: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>;
    lastUsed: z.ZodObject<{
        provider: z.ZodOptional<z.ZodString>;
        model: z.ZodOptional<z.ZodString>;
        timestamp: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type VulpesConfig = z.infer<typeof ConfigSchema>;
export type ApiKeys = z.infer<typeof ApiKeySchema>;
export type Preferences = z.infer<typeof PreferencesSchema>;
/**
 * Type-safe configuration store using Conf
 */
export declare const config: any;
/**
 * Get an API key (checks env first, then stored config)
 */
export declare function getApiKey(provider: keyof ApiKeys): string | undefined;
/**
 * Save an API key to config
 */
export declare function saveApiKey(provider: keyof ApiKeys, key: string): void;
/**
 * Get user preferences
 */
export declare function getPreferences(): Preferences;
/**
 * Update user preferences
 */
export declare function updatePreferences(updates: Partial<Preferences>): void;
/**
 * Record last used provider/model
 */
export declare function recordLastUsed(provider: string, model?: string): void;
/**
 * Get last used provider/model
 */
export declare function getLastUsed(): {
    provider?: string;
    model?: string;
};
/**
 * Get or create the SQLite database connection
 */
export declare function getDatabase(): Database.Database;
/**
 * Create a new chat session
 */
export declare function createSession(provider: string, model?: string): string;
/**
 * Add a message to a session
 */
export declare function addMessage(sessionId: string, role: "user" | "assistant" | "system", content: string, tokensUsed?: number): void;
/**
 * Get session history
 */
export declare function getSessionMessages(sessionId: string): Array<{
    role: string;
    content: string;
    timestamp: string;
}>;
/**
 * End a session
 */
export declare function endSession(sessionId: string): void;
/**
 * Get recent sessions
 */
export declare function getRecentSessions(limit?: number): Array<{
    id: string;
    provider: string;
    model: string;
    started_at: string;
    message_count: number;
}>;
/**
 * Log a redaction operation
 * NOTE: This is for operational metrics, NOT tamper-proof audit.
 * Use the cryptographic provenance system for compliance audits.
 */
export declare function logRedaction(inputHash: string, phiCount: number, phiTypes: string[], executionMs: number, sessionId?: string): void;
/**
 * Get redaction statistics
 */
export declare function getRedactionStats(): {
    totalRedactions: number;
    totalPhiFound: number;
    avgExecutionMs: number;
};
/**
 * Record what a subagent learned
 */
export declare function recordAgentMemory(taskType: string, taskSummary: string, outcome: "success" | "failure" | "partial", notes?: string, workflowType?: string, durationMs?: number): void;
/**
 * Get relevant past experiences for a task type
 */
export declare function getAgentMemory(taskType: string, limit?: number): Array<{
    task_summary: string;
    outcome: string;
    notes: string;
    timestamp: string;
}>;
/**
 * Get success rate for a task type
 */
export declare function getAgentSuccessRate(taskType: string): {
    total: number;
    successes: number;
    rate: number;
};
/**
 * Record filter performance
 */
export declare function recordFilterMetrics(filterName: string, truePositives: number, falsePositives: number, falseNegatives: number, avgTimeMs: number): void;
/**
 * Get filter performance summary
 */
export declare function getFilterPerformance(filterName: string): {
    totalRuns: number;
    avgTruePositives: number;
    avgFalsePositives: number;
    avgFalseNegatives: number;
    avgTimeMs: number;
} | null;
/**
 * Close database connection
 */
export declare function closeDatabase(): void;
/**
 * Clear all data (for testing)
 */
export declare function clearAllData(): void;
/**
 * Migrate from old api-keys.json format
 */
export declare function migrateFromOldFormat(): void;
//# sourceMappingURL=VulpesStore.d.ts.map