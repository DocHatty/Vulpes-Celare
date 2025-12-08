"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.ConfigSchema = exports.PreferencesSchema = exports.ApiKeySchema = void 0;
exports.getApiKey = getApiKey;
exports.saveApiKey = saveApiKey;
exports.getPreferences = getPreferences;
exports.updatePreferences = updatePreferences;
exports.recordLastUsed = recordLastUsed;
exports.getLastUsed = getLastUsed;
exports.getDatabase = getDatabase;
exports.createSession = createSession;
exports.addMessage = addMessage;
exports.getSessionMessages = getSessionMessages;
exports.endSession = endSession;
exports.getRecentSessions = getRecentSessions;
exports.logRedaction = logRedaction;
exports.getRedactionStats = getRedactionStats;
exports.recordAgentMemory = recordAgentMemory;
exports.getAgentMemory = getAgentMemory;
exports.getAgentSuccessRate = getAgentSuccessRate;
exports.recordFilterMetrics = recordFilterMetrics;
exports.getFilterPerformance = getFilterPerformance;
exports.closeDatabase = closeDatabase;
exports.clearAllData = clearAllData;
exports.migrateFromOldFormat = migrateFromOldFormat;
// @ts-ignore - conf has type issues with moduleResolution node
const conf_1 = __importDefault(require("conf"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const zod_1 = require("zod");
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
// ============================================================================
// ZOD SCHEMAS - Type-safe validation
// ============================================================================
/**
 * API Key configuration schema
 */
exports.ApiKeySchema = zod_1.z.object({
    ANTHROPIC_API_KEY: zod_1.z.string().optional(),
    OPENAI_API_KEY: zod_1.z.string().optional(),
    OPENROUTER_API_KEY: zod_1.z.string().optional(),
    GOOGLE_API_KEY: zod_1.z.string().optional(),
});
/**
 * User preferences schema
 */
exports.PreferencesSchema = zod_1.z.object({
    defaultProvider: zod_1.z
        .enum(["anthropic", "openai", "openrouter", "google", "ollama", "custom"])
        .default("anthropic"),
    defaultModel: zod_1.z.string().optional(),
    theme: zod_1.z.enum(["default", "minimal", "colorful"]).default("default"),
    verboseMode: zod_1.z.boolean().default(false),
    subagentsEnabled: zod_1.z.boolean().default(false),
    maxParallelSubagents: zod_1.z.number().min(1).max(10).default(3),
});
/**
 * Full config schema
 */
exports.ConfigSchema = zod_1.z.object({
    apiKeys: exports.ApiKeySchema,
    preferences: exports.PreferencesSchema,
    lastUsed: zod_1.z.object({
        provider: zod_1.z.string().optional(),
        model: zod_1.z.string().optional(),
        timestamp: zod_1.z.string().optional(),
    }),
});
// ============================================================================
// CONF-BASED CONFIG MANAGER
// ============================================================================
const VULPES_DIR = path.join(os.homedir(), ".vulpes");
// Ensure directory exists
if (!fs.existsSync(VULPES_DIR)) {
    fs.mkdirSync(VULPES_DIR, { recursive: true, mode: 0o700 });
}
/**
 * Type-safe configuration store using Conf
 */
exports.config = new conf_1.default({
    projectName: "vulpes-celare",
    cwd: VULPES_DIR,
    configName: "config",
    schema: {
        apiKeys: {
            type: "object",
            default: {},
        },
        preferences: {
            type: "object",
            default: {
                defaultProvider: "anthropic",
                theme: "default",
                verboseMode: false,
                subagentsEnabled: false,
                maxParallelSubagents: 3,
            },
        },
        lastUsed: {
            type: "object",
            default: {},
        },
    },
});
// ============================================================================
// CONFIG HELPER FUNCTIONS
// ============================================================================
/**
 * Get an API key (checks env first, then stored config)
 */
function getApiKey(provider) {
    // Environment takes precedence
    const envKey = process.env[provider];
    if (envKey)
        return envKey;
    // Fall back to stored config
    const stored = exports.config.get("apiKeys");
    return stored?.[provider];
}
/**
 * Save an API key to config
 */
function saveApiKey(provider, key) {
    const current = exports.config.get("apiKeys") || {};
    exports.config.set("apiKeys", { ...current, [provider]: key });
}
/**
 * Get user preferences
 */
function getPreferences() {
    const prefs = exports.config.get("preferences");
    return exports.PreferencesSchema.parse(prefs);
}
/**
 * Update user preferences
 */
function updatePreferences(updates) {
    const current = getPreferences();
    exports.config.set("preferences", { ...current, ...updates });
}
/**
 * Record last used provider/model
 */
function recordLastUsed(provider, model) {
    exports.config.set("lastUsed", {
        provider,
        model,
        timestamp: new Date().toISOString(),
    });
}
/**
 * Get last used provider/model
 */
function getLastUsed() {
    return exports.config.get("lastUsed") || {};
}
// ============================================================================
// SQLITE DATABASE
// ============================================================================
const DB_PATH = path.join(VULPES_DIR, "vulpes.db");
let db = null;
/**
 * Get or create the SQLite database connection
 */
function getDatabase() {
    if (!db) {
        db = new better_sqlite3_1.default(DB_PATH);
        db.pragma("journal_mode = WAL");
        initializeTables();
    }
    return db;
}
/**
 * Initialize database tables
 */
function initializeTables() {
    const database = db;
    // Chat sessions table
    database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      model TEXT,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      message_count INTEGER DEFAULT 0
    )
  `);
    // Chat messages table
    database.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      tokens_used INTEGER,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )
  `);
    // Redaction audit log - NO CONFLICT with cryptographic provenance
    // This is operational logging, not tamper-proof audit
    database.exec(`
    CREATE TABLE IF NOT EXISTS redaction_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      input_hash TEXT NOT NULL,
      phi_count INTEGER NOT NULL,
      phi_types TEXT,
      execution_ms INTEGER,
      session_id TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )
  `);
    // Subagent memory - what worked, what didn't
    database.exec(`
    CREATE TABLE IF NOT EXISTS agent_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      task_type TEXT NOT NULL,
      task_summary TEXT NOT NULL,
      outcome TEXT NOT NULL,
      notes TEXT,
      workflow_type TEXT,
      duration_ms INTEGER
    )
  `);
    // Filter performance metrics
    database.exec(`
    CREATE TABLE IF NOT EXISTS filter_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      filter_name TEXT NOT NULL,
      true_positives INTEGER DEFAULT 0,
      false_positives INTEGER DEFAULT 0,
      false_negatives INTEGER DEFAULT 0,
      avg_time_ms REAL
    )
  `);
    // Create indexes for common queries
    database.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_redaction_timestamp ON redaction_log(timestamp);
    CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON agent_memory(task_type);
  `);
}
// ============================================================================
// SESSION MANAGEMENT
// ============================================================================
/**
 * Create a new chat session
 */
function createSession(provider, model) {
    const database = getDatabase();
    const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    database
        .prepare(`
    INSERT INTO sessions (id, provider, model, started_at)
    VALUES (?, ?, ?, ?)
  `)
        .run(id, provider, model, new Date().toISOString());
    return id;
}
/**
 * Add a message to a session
 */
function addMessage(sessionId, role, content, tokensUsed) {
    const database = getDatabase();
    database
        .prepare(`
    INSERT INTO messages (session_id, role, content, timestamp, tokens_used)
    VALUES (?, ?, ?, ?, ?)
  `)
        .run(sessionId, role, content, new Date().toISOString(), tokensUsed);
    // Update message count
    database
        .prepare(`
    UPDATE sessions SET message_count = message_count + 1 WHERE id = ?
  `)
        .run(sessionId);
}
/**
 * Get session history
 */
function getSessionMessages(sessionId) {
    const database = getDatabase();
    return database
        .prepare(`
    SELECT role, content, timestamp FROM messages
    WHERE session_id = ? ORDER BY id ASC
  `)
        .all(sessionId);
}
/**
 * End a session
 */
function endSession(sessionId) {
    const database = getDatabase();
    database
        .prepare(`
    UPDATE sessions SET ended_at = ? WHERE id = ?
  `)
        .run(new Date().toISOString(), sessionId);
}
/**
 * Get recent sessions
 */
function getRecentSessions(limit = 10) {
    const database = getDatabase();
    return database
        .prepare(`
    SELECT id, provider, model, started_at, message_count
    FROM sessions ORDER BY started_at DESC LIMIT ?
  `)
        .all(limit);
}
// ============================================================================
// REDACTION AUDIT LOG (Operational - not cryptographic)
// ============================================================================
/**
 * Log a redaction operation
 * NOTE: This is for operational metrics, NOT tamper-proof audit.
 * Use the cryptographic provenance system for compliance audits.
 */
function logRedaction(inputHash, phiCount, phiTypes, executionMs, sessionId) {
    const database = getDatabase();
    database
        .prepare(`
    INSERT INTO redaction_log (timestamp, input_hash, phi_count, phi_types, execution_ms, session_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
        .run(new Date().toISOString(), inputHash, phiCount, JSON.stringify(phiTypes), executionMs, sessionId);
}
/**
 * Get redaction statistics
 */
function getRedactionStats() {
    const database = getDatabase();
    const result = database
        .prepare(`
    SELECT
      COUNT(*) as total,
      SUM(phi_count) as phi_total,
      AVG(execution_ms) as avg_ms
    FROM redaction_log
  `)
        .get();
    return {
        totalRedactions: result?.total || 0,
        totalPhiFound: result?.phi_total || 0,
        avgExecutionMs: result?.avg_ms || 0,
    };
}
// ============================================================================
// AGENT MEMORY
// ============================================================================
/**
 * Record what a subagent learned
 */
function recordAgentMemory(taskType, taskSummary, outcome, notes, workflowType, durationMs) {
    const database = getDatabase();
    database
        .prepare(`
    INSERT INTO agent_memory (timestamp, task_type, task_summary, outcome, notes, workflow_type, duration_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
        .run(new Date().toISOString(), taskType, taskSummary, outcome, notes, workflowType, durationMs);
}
/**
 * Get relevant past experiences for a task type
 */
function getAgentMemory(taskType, limit = 5) {
    const database = getDatabase();
    return database
        .prepare(`
    SELECT task_summary, outcome, notes, timestamp
    FROM agent_memory
    WHERE task_type = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `)
        .all(taskType, limit);
}
/**
 * Get success rate for a task type
 */
function getAgentSuccessRate(taskType) {
    const database = getDatabase();
    const result = database
        .prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) as successes
    FROM agent_memory
    WHERE task_type = ?
  `)
        .get(taskType);
    const total = result?.total || 0;
    const successes = result?.successes || 0;
    return {
        total,
        successes,
        rate: total > 0 ? successes / total : 0,
    };
}
// ============================================================================
// FILTER METRICS
// ============================================================================
/**
 * Record filter performance
 */
function recordFilterMetrics(filterName, truePositives, falsePositives, falseNegatives, avgTimeMs) {
    const database = getDatabase();
    database
        .prepare(`
    INSERT INTO filter_metrics (timestamp, filter_name, true_positives, false_positives, false_negatives, avg_time_ms)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
        .run(new Date().toISOString(), filterName, truePositives, falsePositives, falseNegatives, avgTimeMs);
}
/**
 * Get filter performance summary
 */
function getFilterPerformance(filterName) {
    const database = getDatabase();
    const result = database
        .prepare(`
    SELECT
      COUNT(*) as runs,
      AVG(true_positives) as avg_tp,
      AVG(false_positives) as avg_fp,
      AVG(false_negatives) as avg_fn,
      AVG(avg_time_ms) as avg_ms
    FROM filter_metrics
    WHERE filter_name = ?
  `)
        .get(filterName);
    if (!result || result.runs === 0)
        return null;
    return {
        totalRuns: result.runs,
        avgTruePositives: result.avg_tp,
        avgFalsePositives: result.avg_fp,
        avgFalseNegatives: result.avg_fn,
        avgTimeMs: result.avg_ms,
    };
}
// ============================================================================
// CLEANUP
// ============================================================================
/**
 * Close database connection
 */
function closeDatabase() {
    if (db) {
        db.close();
        db = null;
    }
}
/**
 * Clear all data (for testing)
 */
function clearAllData() {
    const database = getDatabase();
    database.exec(`
    DELETE FROM messages;
    DELETE FROM sessions;
    DELETE FROM redaction_log;
    DELETE FROM agent_memory;
    DELETE FROM filter_metrics;
  `);
}
// ============================================================================
// MIGRATION FROM OLD FORMAT
// ============================================================================
/**
 * Migrate from old api-keys.json format
 */
function migrateFromOldFormat() {
    const oldKeysPath = path.join(VULPES_DIR, "api-keys.json");
    if (fs.existsSync(oldKeysPath)) {
        try {
            const oldKeys = JSON.parse(fs.readFileSync(oldKeysPath, "utf-8"));
            const validKeys = exports.ApiKeySchema.safeParse(oldKeys);
            if (validKeys.success) {
                exports.config.set("apiKeys", validKeys.data);
                // Rename old file as backup
                fs.renameSync(oldKeysPath, oldKeysPath + ".bak");
            }
        }
        catch {
            // Ignore migration errors
        }
    }
}
// Run migration on module load
migrateFromOldFormat();
//# sourceMappingURL=VulpesStore.js.map