-- ============================================================================
-- VULPES CORTEX DATABASE SCHEMA
-- SQLite schema for knowledge storage, patterns, metrics, and experiments
-- ============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ============================================================================
-- DECISIONS TABLE
-- Replaces: decisions.json (857KB)
-- Stores all decisions made during test runs and interventions
-- ============================================================================

CREATE TABLE IF NOT EXISTS decisions (
    id TEXT PRIMARY KEY,
    intervention_id TEXT,
    decision_type TEXT NOT NULL,
    outcome TEXT,
    reason TEXT,
    metrics_before TEXT,  -- JSON
    metrics_after TEXT,   -- JSON
    context TEXT,         -- JSON
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_decisions_intervention ON decisions(intervention_id);
CREATE INDEX IF NOT EXISTS idx_decisions_type ON decisions(decision_type);
CREATE INDEX IF NOT EXISTS idx_decisions_timestamp ON decisions(timestamp);
CREATE INDEX IF NOT EXISTS idx_decisions_outcome ON decisions(outcome);

-- ============================================================================
-- PATTERNS TABLE
-- Replaces: patterns.json (510KB)
-- Stores failure and success patterns for PHI detection
-- ============================================================================

CREATE TABLE IF NOT EXISTS patterns (
    id TEXT PRIMARY KEY,
    phi_type TEXT NOT NULL,
    category TEXT NOT NULL,
    pattern_type TEXT NOT NULL,  -- 'failure' or 'success'
    severity TEXT,
    count INTEGER DEFAULT 1,
    confidence REAL,
    description TEXT,
    examples TEXT,        -- JSON array
    indicators TEXT,      -- JSON array
    remediation TEXT,
    first_seen DATETIME,
    last_seen DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patterns_phi_type ON patterns(phi_type);
CREATE INDEX IF NOT EXISTS idx_patterns_category ON patterns(category);
CREATE INDEX IF NOT EXISTS idx_patterns_severity ON patterns(severity);
CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_patterns_last_seen ON patterns(last_seen);

-- ============================================================================
-- METRICS HISTORY TABLE
-- Replaces: temporal-index.json (43KB)
-- Time-series storage for test metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS metrics_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    value REAL NOT NULL,
    document_count INTEGER,
    profile TEXT,
    context TEXT,         -- JSON
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics_history(metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_metrics_run ON metrics_history(run_id);
CREATE INDEX IF NOT EXISTS idx_metrics_name_time ON metrics_history(metric_name, timestamp);

-- ============================================================================
-- ENTITIES TABLE
-- Replaces: entities.json (62KB)
-- Generic entity storage with bi-temporal tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS entities (
    id TEXT NOT NULL,
    type TEXT NOT NULL,
    data TEXT NOT NULL,   -- JSON
    valid_from DATETIME,
    valid_until DATETIME,
    is_valid INTEGER DEFAULT 1,
    invalidation_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, type)
);

CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_valid ON entities(is_valid);
CREATE INDEX IF NOT EXISTS idx_entities_valid_from ON entities(valid_from);

-- ============================================================================
-- EXPERIMENTS TABLE
-- Replaces: experiments in storage/experiments/
-- A/B experiment tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS experiments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    experiment_type TEXT NOT NULL,
    hypothesis TEXT,
    status TEXT DEFAULT 'CREATED',
    baseline_config TEXT,     -- JSON
    treatment_config TEXT,    -- JSON
    baseline_results TEXT,    -- JSON
    treatment_results TEXT,   -- JSON
    analysis TEXT,            -- JSON
    conclusion TEXT,
    auto_rollback INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status);
CREATE INDEX IF NOT EXISTS idx_experiments_created ON experiments(created_at);

-- ============================================================================
-- INTERVENTIONS TABLE
-- Replaces: interventions.json
-- Tracks code changes and their effects
-- ============================================================================

CREATE TABLE IF NOT EXISTS interventions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    target TEXT,
    parameters TEXT,          -- JSON
    reason TEXT,
    status TEXT DEFAULT 'ACTIVE',
    metrics_before TEXT,      -- JSON
    metrics_after TEXT,       -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_interventions_type ON interventions(type);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status);
CREATE INDEX IF NOT EXISTS idx_interventions_created ON interventions(created_at);

-- ============================================================================
-- HYPOTHESES TABLE
-- Replaces: hypotheses in knowledge base
-- Tracks generated and tested hypotheses
-- ============================================================================

CREATE TABLE IF NOT EXISTS hypotheses (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    confidence REAL,
    status TEXT DEFAULT 'PROPOSED',
    source TEXT,
    evidence TEXT,            -- JSON array
    validation_results TEXT,  -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    validated_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_hypotheses_type ON hypotheses(type);
CREATE INDEX IF NOT EXISTS idx_hypotheses_status ON hypotheses(status);
CREATE INDEX IF NOT EXISTS idx_hypotheses_confidence ON hypotheses(confidence);

-- ============================================================================
-- RELATIONS TABLE
-- Replaces: relations.json
-- Graph relationships between entities
-- ============================================================================

CREATE TABLE IF NOT EXISTS relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_type TEXT NOT NULL,
    from_id TEXT NOT NULL,
    relation_type TEXT NOT NULL,
    to_type TEXT NOT NULL,
    to_id TEXT NOT NULL,
    metadata TEXT,            -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_relations_from ON relations(from_type, from_id);
CREATE INDEX IF NOT EXISTS idx_relations_to ON relations(to_type, to_id);
CREATE INDEX IF NOT EXISTS idx_relations_type ON relations(relation_type);

-- ============================================================================
-- TEST QUEUE TABLE
-- NEW: Job queue for concurrent test execution
-- ============================================================================

CREATE TABLE IF NOT EXISTS test_queue (
    id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'pending',
    profile TEXT,
    document_count INTEGER,
    quick INTEGER DEFAULT 0,
    progress INTEGER DEFAULT 0,
    current_doc INTEGER DEFAULT 0,
    current_phi_type TEXT,
    result TEXT,              -- JSON
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_queue_status ON test_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_created ON test_queue(created_at);

-- ============================================================================
-- CODEBASE STATES TABLE
-- Replaces: codebase-states.json (69KB)
-- Snapshots of codebase configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS codebase_states (
    id TEXT PRIMARY KEY,
    snapshot_type TEXT,
    filters TEXT,             -- JSON
    dictionaries TEXT,        -- JSON
    pipeline_config TEXT,     -- JSON
    file_hashes TEXT,         -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- HISTORY CONSULTATIONS TABLE
-- Replaces: history-consultations.json
-- Records of history lookups for learning
-- ============================================================================

CREATE TABLE IF NOT EXISTS history_consultations (
    id TEXT PRIMARY KEY,
    decision_type TEXT NOT NULL,
    context TEXT,             -- JSON
    exact_matches INTEGER DEFAULT 0,
    similar_attempts INTEGER DEFAULT 0,
    related_successes INTEGER DEFAULT 0,
    related_failures INTEGER DEFAULT 0,
    warnings TEXT,            -- JSON array
    recommendations TEXT,     -- JSON array
    confidence REAL,
    summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consultations_type ON history_consultations(decision_type);
CREATE INDEX IF NOT EXISTS idx_consultations_created ON history_consultations(created_at);

-- ============================================================================
-- INSIGHTS TABLE
-- Replaces: insights.json
-- Generated insights and learnings
-- ============================================================================

CREATE TABLE IF NOT EXISTS insights (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    source_run_id TEXT,
    confidence REAL,
    actionable INTEGER DEFAULT 0,
    acted_upon INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_insights_type ON insights(type);
CREATE INDEX IF NOT EXISTS idx_insights_actionable ON insights(actionable);

-- ============================================================================
-- AUDIT LOG TABLE (BLOCKCHAIN TIER 1)
-- New: Immutable, cryptographically linked log
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    actor_id TEXT,
    event_type TEXT NOT NULL,
    data_hash TEXT NOT NULL,      -- Hash of the payload
    prev_hash TEXT NOT NULL,      -- Hash of the previous row (Blockchain link)
    merkle_root TEXT NOT NULL,    -- Merkle Root at this point in time
    payload TEXT,                 -- JSON data (optional)
    signature TEXT                -- Optional cryptographic signature
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_type ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_hash ON audit_log(data_hash);

-- ============================================================================
-- SCHEMA VERSION TABLE
-- Track database schema version for migrations
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (1, 'Initial schema - JSON to SQLite migration');
