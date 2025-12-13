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

// @ts-ignore - conf has type issues with moduleResolution node
import Conf from "conf";
import Database from "better-sqlite3";
import { z } from "zod";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";

// ============================================================================
// ZOD SCHEMAS - Type-safe validation
// ============================================================================

/**
 * API Key configuration schema
 */
export const ApiKeySchema = z.object({
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
});

/**
 * User preferences schema
 */
export const PreferencesSchema = z.object({
  defaultProvider: z
    .enum(["anthropic", "openai", "openrouter", "google", "ollama", "custom"])
    .default("anthropic"),
  defaultModel: z.string().optional(),
  theme: z.enum(["default", "minimal", "colorful"]).default("default"),
  verboseMode: z.boolean().default(false),
  subagentsEnabled: z.boolean().default(false),
  maxParallelSubagents: z.number().min(1).max(10).default(3),
});

/**
 * Full config schema
 */
export const ConfigSchema = z.object({
  apiKeys: ApiKeySchema,
  preferences: PreferencesSchema,
  lastUsed: z.object({
    provider: z.string().optional(),
    model: z.string().optional(),
    timestamp: z.string().optional(),
  }),
});

export type VulpesConfig = z.infer<typeof ConfigSchema>;
export type ApiKeys = z.infer<typeof ApiKeySchema>;
export type Preferences = z.infer<typeof PreferencesSchema>;

// ============================================================================
// DATABASE ROW TYPES - Proper typing for SQLite query results
// ============================================================================

export interface SessionRow {
  id: string;
  provider: string;
  model: string | null;
  started_at: string;
  ended_at: string | null;
  message_count: number;
}

export interface MessageRow {
  id: number;
  session_id: string;
  role: string;
  content: string;
  timestamp: string;
  tokens_used: number | null;
}

export interface RedactionLogRow {
  id: number;
  timestamp: string;
  input_hash: string;
  phi_count: number;
  phi_types: string | null;
  execution_ms: number | null;
  session_id: string | null;
}

export interface AgentMemoryRow {
  id: number;
  timestamp: string;
  task_type: string;
  task_summary: string;
  outcome: string;
  notes: string | null;
  workflow_type: string | null;
  duration_ms: number | null;
}

export interface FilterMetricsRow {
  id: number;
  timestamp: string;
  filter_name: string;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  avg_time_ms: number | null;
}

export interface HipaaKnowledgeRow {
  id: number;
  question: string;
  answer: string;
  type: string;
  source: string | null;
  cfr_refs: string | null;
  embedding_hash: string | null;
}

interface StatsRow {
  total: number;
  phi_total: number | null;
  avg_ms: number | null;
}

interface SuccessRateRow {
  total: number;
  successes: number;
}

interface FilterPerfRow {
  runs: number;
  avg_tp: number;
  avg_fp: number;
  avg_fn: number;
  avg_ms: number;
}

interface CountRow {
  count: number;
}

interface TypeCountRow {
  type: string;
  count: number;
}

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
export const config = new Conf<VulpesConfig>({
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
export function getApiKey(provider: keyof ApiKeys): string | undefined {
  // Environment takes precedence
  const envKey = process.env[provider];
  if (envKey) return envKey;

  // Fall back to stored config
  const stored = config.get("apiKeys") as ApiKeys;
  return stored?.[provider];
}

/**
 * Save an API key to config
 */
export function saveApiKey(provider: keyof ApiKeys, key: string): void {
  const current = (config.get("apiKeys") as ApiKeys) || {};
  config.set("apiKeys", { ...current, [provider]: key });
}

/**
 * Get user preferences
 */
export function getPreferences(): Preferences {
  const prefs = config.get("preferences");
  return PreferencesSchema.parse(prefs);
}

/**
 * Update user preferences
 */
export function updatePreferences(updates: Partial<Preferences>): void {
  const current = getPreferences();
  config.set("preferences", { ...current, ...updates });
}

/**
 * Record last used provider/model
 */
export function recordLastUsed(provider: string, model?: string): void {
  config.set("lastUsed", {
    provider,
    model,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get last used provider/model
 */
export function getLastUsed(): { provider?: string; model?: string } {
  return config.get("lastUsed") || {};
}

// ============================================================================
// SQLITE DATABASE
// ============================================================================

const DB_PATH = path.join(VULPES_DIR, "vulpes.db");

let db: Database.Database | null = null;

/**
 * Get or create the SQLite database connection
 */
export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initializeTables();
  }
  return db;
}

/**
 * Initialize database tables
 */
function initializeTables(): void {
  const database = db!;

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

  // HIPAA Knowledge Base for RAG
  database.exec(`
    CREATE TABLE IF NOT EXISTS hipaa_knowledge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      type TEXT NOT NULL,
      source TEXT,
      cfr_refs TEXT,
      embedding_hash TEXT
    )
  `);

  // Create indexes for common queries
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_redaction_timestamp ON redaction_log(timestamp);
    CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON agent_memory(task_type);
    CREATE INDEX IF NOT EXISTS idx_hipaa_type ON hipaa_knowledge(type);
    CREATE INDEX IF NOT EXISTS idx_hipaa_cfr ON hipaa_knowledge(cfr_refs);
  `);
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Create a new chat session
 */
export function createSession(provider: string, model?: string): string {
  const database = getDatabase();
  const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  database
    .prepare(
      `
    INSERT INTO sessions (id, provider, model, started_at)
    VALUES (?, ?, ?, ?)
  `,
    )
    .run(id, provider, model, new Date().toISOString());

  return id;
}

/**
 * Add a message to a session
 */
export function addMessage(
  sessionId: string,
  role: "user" | "assistant" | "system",
  content: string,
  tokensUsed?: number,
): void {
  const database = getDatabase();

  database
    .prepare(
      `
    INSERT INTO messages (session_id, role, content, timestamp, tokens_used)
    VALUES (?, ?, ?, ?, ?)
  `,
    )
    .run(sessionId, role, content, new Date().toISOString(), tokensUsed);

  // Update message count
  database
    .prepare(
      `
    UPDATE sessions SET message_count = message_count + 1 WHERE id = ?
  `,
    )
    .run(sessionId);
}

/**
 * Get session history
 */
export function getSessionMessages(sessionId: string): Array<{
  role: string;
  content: string;
  timestamp: string;
}> {
  const database = getDatabase();
  return database
    .prepare(
      `
    SELECT role, content, timestamp FROM messages
    WHERE session_id = ? ORDER BY id ASC
  `,
    )
    .all(sessionId) as Pick<MessageRow, "role" | "content" | "timestamp">[];
}

/**
 * End a session
 */
export function endSession(sessionId: string): void {
  const database = getDatabase();
  database
    .prepare(
      `
    UPDATE sessions SET ended_at = ? WHERE id = ?
  `,
    )
    .run(new Date().toISOString(), sessionId);
}

/**
 * Get recent sessions
 */
export function getRecentSessions(limit: number = 10): Array<{
  id: string;
  provider: string;
  model: string | null;
  started_at: string;
  message_count: number;
}> {
  const database = getDatabase();
  return database
    .prepare(
      `
    SELECT id, provider, model, started_at, message_count
    FROM sessions ORDER BY started_at DESC LIMIT ?
  `,
    )
    .all(limit) as Pick<
    SessionRow,
    "id" | "provider" | "model" | "started_at" | "message_count"
  >[];
}

// ============================================================================
// REDACTION AUDIT LOG (Operational - not cryptographic)
// ============================================================================

/**
 * Log a redaction operation
 * NOTE: This is for operational metrics, NOT tamper-proof audit.
 * Use the cryptographic provenance system for compliance audits.
 */
export function logRedaction(
  inputHash: string,
  phiCount: number,
  phiTypes: string[],
  executionMs: number,
  sessionId?: string,
): void {
  const database = getDatabase();
  database
    .prepare(
      `
    INSERT INTO redaction_log (timestamp, input_hash, phi_count, phi_types, execution_ms, session_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    )
    .run(
      new Date().toISOString(),
      inputHash,
      phiCount,
      JSON.stringify(phiTypes),
      executionMs,
      sessionId,
    );
}

/**
 * Get redaction statistics
 */
export function getRedactionStats(): {
  totalRedactions: number;
  totalPhiFound: number;
  avgExecutionMs: number;
} {
  const database = getDatabase();
  const result = database
    .prepare(
      `
    SELECT
      COUNT(*) as total,
      SUM(phi_count) as phi_total,
      AVG(execution_ms) as avg_ms
    FROM redaction_log
  `,
    )
    .get() as StatsRow | undefined;

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
export function recordAgentMemory(
  taskType: string,
  taskSummary: string,
  outcome: "success" | "failure" | "partial",
  notes?: string,
  workflowType?: string,
  durationMs?: number,
): void {
  const database = getDatabase();
  database
    .prepare(
      `
    INSERT INTO agent_memory (timestamp, task_type, task_summary, outcome, notes, workflow_type, duration_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
    )
    .run(
      new Date().toISOString(),
      taskType,
      taskSummary,
      outcome,
      notes,
      workflowType,
      durationMs,
    );
}

/**
 * Get relevant past experiences for a task type
 */
export function getAgentMemory(
  taskType: string,
  limit: number = 5,
): Array<{
  task_summary: string;
  outcome: string;
  notes: string | null;
  timestamp: string;
}> {
  const database = getDatabase();
  return database
    .prepare(
      `
    SELECT task_summary, outcome, notes, timestamp
    FROM agent_memory
    WHERE task_type = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `,
    )
    .all(taskType, limit) as Pick<
    AgentMemoryRow,
    "task_summary" | "outcome" | "notes" | "timestamp"
  >[];
}

/**
 * Get success rate for a task type
 */
export function getAgentSuccessRate(taskType: string): {
  total: number;
  successes: number;
  rate: number;
} {
  const database = getDatabase();
  const result = database
    .prepare(
      `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) as successes
    FROM agent_memory
    WHERE task_type = ?
  `,
    )
    .get(taskType) as SuccessRateRow | undefined;

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
export function recordFilterMetrics(
  filterName: string,
  truePositives: number,
  falsePositives: number,
  falseNegatives: number,
  avgTimeMs: number,
): void {
  const database = getDatabase();
  database
    .prepare(
      `
    INSERT INTO filter_metrics (timestamp, filter_name, true_positives, false_positives, false_negatives, avg_time_ms)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    )
    .run(
      new Date().toISOString(),
      filterName,
      truePositives,
      falsePositives,
      falseNegatives,
      avgTimeMs,
    );
}

/**
 * Get filter performance summary
 */
export function getFilterPerformance(filterName: string): {
  totalRuns: number;
  avgTruePositives: number;
  avgFalsePositives: number;
  avgFalseNegatives: number;
  avgTimeMs: number;
} | null {
  const database = getDatabase();
  const result = database
    .prepare(
      `
    SELECT
      COUNT(*) as runs,
      AVG(true_positives) as avg_tp,
      AVG(false_positives) as avg_fp,
      AVG(false_negatives) as avg_fn,
      AVG(avg_time_ms) as avg_ms
    FROM filter_metrics
    WHERE filter_name = ?
  `,
    )
    .get(filterName) as FilterPerfRow | undefined;

  if (!result || result.runs === 0) return null;

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
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Clear all data (for testing)
 */
export function clearAllData(): void {
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
export function migrateFromOldFormat(): void {
  const oldKeysPath = path.join(VULPES_DIR, "api-keys.json");

  if (fs.existsSync(oldKeysPath)) {
    try {
      const oldKeys = JSON.parse(fs.readFileSync(oldKeysPath, "utf-8"));
      const validKeys = ApiKeySchema.safeParse(oldKeys);

      if (validKeys.success) {
        config.set("apiKeys", validKeys.data);
        // Rename old file as backup
        fs.renameSync(oldKeysPath, oldKeysPath + ".bak");
      }
    } catch {
      // Ignore migration errors
    }
  }
}

// Run migration on module load
migrateFromOldFormat();

// ============================================================================
// HIPAA KNOWLEDGE BASE (RAG)
// ============================================================================

export interface HipaaKnowledge {
  id?: number;
  question: string;
  answer: string;
  type: string;
  source?: string | null;
  cfr_refs?: string[];
}

/**
 * Add HIPAA knowledge entry
 */
export function addHipaaKnowledge(entry: HipaaKnowledge): void {
  const database = getDatabase();
  database
    .prepare(
      `
    INSERT INTO hipaa_knowledge (question, answer, type, source, cfr_refs)
    VALUES (?, ?, ?, ?, ?)
  `,
    )
    .run(
      entry.question,
      entry.answer,
      entry.type,
      entry.source || null,
      entry.cfr_refs ? JSON.stringify(entry.cfr_refs) : null,
    );
}

/**
 * Bulk insert HIPAA knowledge
 */
export function bulkAddHipaaKnowledge(entries: HipaaKnowledge[]): number {
  const database = getDatabase();
  const insert = database.prepare(`
    INSERT INTO hipaa_knowledge (question, answer, type, source, cfr_refs)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = database.transaction((items: HipaaKnowledge[]) => {
    for (const entry of items) {
      insert.run(
        entry.question,
        entry.answer,
        entry.type,
        entry.source || null,
        entry.cfr_refs ? JSON.stringify(entry.cfr_refs) : null,
      );
    }
    return items.length;
  });

  return insertMany(entries);
}

/**
 * Search HIPAA knowledge by keyword
 */
export function searchHipaaKnowledge(
  query: string,
  limit: number = 10,
): HipaaKnowledge[] {
  const database = getDatabase();
  const results = database
    .prepare(
      `
    SELECT id, question, answer, type, source, cfr_refs
    FROM hipaa_knowledge
    WHERE question LIKE ? OR answer LIKE ? OR cfr_refs LIKE ?
    LIMIT ?
  `,
    )
    .all(
      `%${query}%`,
      `%${query}%`,
      `%${query}%`,
      limit,
    ) as HipaaKnowledgeRow[];

  return results.map((r) => ({
    id: r.id,
    question: r.question,
    answer: r.answer,
    type: r.type,
    source: r.source,
    cfr_refs: r.cfr_refs ? JSON.parse(r.cfr_refs) : [],
  }));
}

/**
 * Search by CFR section
 */
export function searchByCfr(cfrSection: string): HipaaKnowledge[] {
  const database = getDatabase();
  const results = database
    .prepare(
      `
    SELECT id, question, answer, type, source, cfr_refs
    FROM hipaa_knowledge
    WHERE cfr_refs LIKE ?
  `,
    )
    .all(`%${cfrSection}%`) as HipaaKnowledgeRow[];

  return results.map((r) => ({
    id: r.id,
    question: r.question,
    answer: r.answer,
    type: r.type,
    source: r.source,
    cfr_refs: r.cfr_refs ? JSON.parse(r.cfr_refs) : [],
  }));
}

/**
 * Get HIPAA knowledge by type
 */
export function getHipaaByType(
  type: string,
  limit: number = 20,
): HipaaKnowledge[] {
  const database = getDatabase();
  const results = database
    .prepare(
      `
    SELECT id, question, answer, type, source, cfr_refs
    FROM hipaa_knowledge
    WHERE type = ?
    LIMIT ?
  `,
    )
    .all(type, limit) as HipaaKnowledgeRow[];

  return results.map((r) => ({
    id: r.id,
    question: r.question,
    answer: r.answer,
    type: r.type,
    source: r.source,
    cfr_refs: r.cfr_refs ? JSON.parse(r.cfr_refs) : [],
  }));
}

/**
 * Get HIPAA knowledge stats
 */
export function getHipaaStats(): {
  total: number;
  byType: Record<string, number>;
  uniqueCfrSections: number;
} {
  const database = getDatabase();

  const totalResult = database
    .prepare(`SELECT COUNT(*) as count FROM hipaa_knowledge`)
    .get() as CountRow | undefined;
  const total = totalResult?.count || 0;

  const byTypeResults = database
    .prepare(
      `SELECT type, COUNT(*) as count FROM hipaa_knowledge GROUP BY type`,
    )
    .all() as TypeCountRow[];

  const byType: Record<string, number> = {};
  for (const r of byTypeResults) {
    byType[r.type] = r.count;
  }

  // Count unique CFR sections (rough estimate)
  const cfrResults = database
    .prepare(
      `SELECT DISTINCT cfr_refs FROM hipaa_knowledge WHERE cfr_refs IS NOT NULL`,
    )
    .all() as Pick<HipaaKnowledgeRow, "cfr_refs">[];

  const uniqueCfr = new Set<string>();
  for (const r of cfrResults) {
    try {
      if (r.cfr_refs) {
        const refs = JSON.parse(r.cfr_refs) as string[];
        for (const ref of refs) {
          uniqueCfr.add(ref);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  return {
    total,
    byType,
    uniqueCfrSections: uniqueCfr.size,
  };
}
