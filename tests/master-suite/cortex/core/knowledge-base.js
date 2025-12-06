const { random } = require("../../generators/seeded-random");

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║     ██╗   ██╗██╗   ██╗██╗     ██████╗ ███████╗███████╗                        ║
 * ║     ██║   ██║██║   ██║██║     ██╔══██╗██╔════╝██╔════╝                        ║
 * ║     ██║   ██║██║   ██║██║     ██████╔╝█████╗  ███████╗                        ║
 * ║     ╚██╗ ██╔╝██║   ██║██║     ██╔═══╝ ██╔══╝  ╚════██║                        ║
 * ║      ╚████╔╝ ╚██████╔╝███████╗██║     ███████╗███████║                        ║
 * ║       ╚═══╝   ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚══════╝                        ║
 * ║                                                                               ║
 * ║      ██████╗ ██████╗ ██████╗ ████████╗███████╗██╗  ██╗                        ║
 * ║     ██╔════╝██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝╚██╗██╔╝                        ║
 * ║     ██║     ██║   ██║██████╔╝   ██║   █████╗   ╚███╔╝                         ║
 * ║     ██║     ██║   ██║██╔══██╗   ██║   ██╔══╝   ██╔██╗                         ║
 * ║     ╚██████╗╚██████╔╝██║  ██║   ██║   ███████╗██╔╝ ██╗                        ║
 * ║      ╚═════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝                        ║
 * ║                                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║   KNOWLEDGE BASE                                                              ║
 * ║   Persistent Memory with Entities, Relations, and Observations                ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * Based on Anthropic's Knowledge Graph MCP design, enhanced with:
 * - Bi-temporal tracking (when it happened vs when we learned)
 * - Causal chain support (intervention → effect → hypothesis → validation)
 * - Domain-specific entity types for PHI redaction testing
 *
 * ENTITY TYPES:
 * - TestRun: A single test execution with metrics
 * - Intervention: A code change made to improve detection
 * - Hypothesis: A prediction about what might help
 * - Pattern: A recognized failure pattern
 * - Insight: A learning extracted from data
 * - Metric: A tracked metric over time
 *
 * RELATION TYPES:
 * - caused: Intervention caused Effect
 * - validated: TestRun validated/invalidated Hypothesis
 * - identified: TestRun identified Pattern
 * - generated: Pattern generated Hypothesis
 * - improved: Intervention improved Metric
 * - regressed: Intervention regressed Metric
 */

const fs = require("fs");
const path = require("path");
const { PATHS } = require("./config");

// ============================================================================
// ENTITY SCHEMAS - What we track
// ============================================================================

const ENTITY_TYPES = {
  TEST_RUN: {
    name: "TestRun",
    description: "A single test execution with metrics",
    requiredFields: ["id", "timestamp", "documentCount", "metrics"],
    optionalFields: ["failures", "overRedactions", "profile", "snapshotId"],
  },
  INTERVENTION: {
    name: "Intervention",
    description: "A code change made to improve detection",
    requiredFields: ["id", "timestamp", "description", "targetedPatterns"],
    optionalFields: [
      "filesChanged",
      "beforeRunId",
      "afterRunId",
      "status",
      "effectiveness",
    ],
  },
  HYPOTHESIS: {
    name: "Hypothesis",
    description: "A prediction about what might help",
    requiredFields: ["id", "timestamp", "pattern", "hypothesis", "confidence"],
    optionalFields: ["affectedCount", "reasoning", "status", "validatedBy"],
  },
  PATTERN: {
    name: "Pattern",
    description: "A recognized failure pattern",
    requiredFields: ["id", "type", "description"],
    optionalFields: ["severity", "count", "samples", "knownFixes", "lastSeen"],
  },
  INSIGHT: {
    name: "Insight",
    description: "A learning extracted from data",
    requiredFields: ["id", "timestamp", "type", "content"],
    optionalFields: ["sourceRunId", "confidence", "actionable"],
  },
  SNAPSHOT: {
    name: "Snapshot",
    description: "A saved set of test documents for reproducibility",
    requiredFields: ["id", "timestamp", "documentCount", "checksum"],
    optionalFields: ["description", "filePath"],
  },
};

const RELATION_TYPES = {
  CAUSED: {
    name: "caused",
    description: "Intervention caused this effect",
    validFrom: ["Intervention"],
    validTo: ["TestRun", "Insight"],
  },
  VALIDATED: {
    name: "validated",
    description: "TestRun validated this hypothesis",
    validFrom: ["TestRun"],
    validTo: ["Hypothesis"],
  },
  INVALIDATED: {
    name: "invalidated",
    description: "TestRun invalidated this hypothesis",
    validFrom: ["TestRun"],
    validTo: ["Hypothesis"],
  },
  IDENTIFIED: {
    name: "identified",
    description: "TestRun identified this pattern",
    validFrom: ["TestRun"],
    validTo: ["Pattern"],
  },
  GENERATED: {
    name: "generated",
    description: "Pattern generated this hypothesis",
    validFrom: ["Pattern"],
    validTo: ["Hypothesis"],
  },
  IMPROVED: {
    name: "improved",
    description: "Intervention improved this metric",
    validFrom: ["Intervention"],
    validTo: ["Metric"],
    metadata: ["delta", "before", "after"],
  },
  REGRESSED: {
    name: "regressed",
    description: "Intervention regressed this metric",
    validFrom: ["Intervention"],
    validTo: ["Metric"],
    metadata: ["delta", "before", "after"],
  },
  USED_SNAPSHOT: {
    name: "used_snapshot",
    description: "TestRun used this document snapshot",
    validFrom: ["TestRun"],
    validTo: ["Snapshot"],
  },
  ROLLED_BACK: {
    name: "rolled_back",
    description: "Intervention was rolled back",
    validFrom: ["Intervention"],
    validTo: ["Intervention"],
    metadata: ["reason", "rollbackRunId"],
  },
};

// ============================================================================
// KNOWLEDGE BASE CLASS
// ============================================================================

class KnowledgeBase {
  constructor(storagePath = null) {
    this.storagePath = storagePath || PATHS.knowledge;
    this.ensureStorageExists();

    // In-memory cache, loaded from disk
    this.entities = {};
    this.relations = [];
    this.observations = [];
    this.metadata = {
      created: null,
      lastModified: null,
      version: "1.0.0",
      entityCount: 0,
      relationCount: 0,
    };

    // Load existing data
    this.load();
  }

  // ==========================================================================
  // STORAGE MANAGEMENT
  // ==========================================================================

  ensureStorageExists() {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  getFilePath(filename) {
    return path.join(this.storagePath, filename);
  }

  load() {
    try {
      // Load entities
      const entitiesPath = this.getFilePath("entities.json");
      if (fs.existsSync(entitiesPath)) {
        this.entities = JSON.parse(fs.readFileSync(entitiesPath, "utf8"));
      }

      // Load relations
      const relationsPath = this.getFilePath("relations.json");
      if (fs.existsSync(relationsPath)) {
        this.relations = JSON.parse(fs.readFileSync(relationsPath, "utf8"));
      }

      // Load observations
      const observationsPath = this.getFilePath("observations.json");
      if (fs.existsSync(observationsPath)) {
        this.observations = JSON.parse(
          fs.readFileSync(observationsPath, "utf8"),
        );
      }

      // Load metadata
      const metadataPath = this.getFilePath("metadata.json");
      if (fs.existsSync(metadataPath)) {
        this.metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
      } else {
        this.metadata.created = new Date().toISOString();
      }

      this.updateCounts();
    } catch (error) {
      console.warn(`KnowledgeBase: Error loading data: ${error.message}`);
      // Start fresh if corrupted
      this.entities = {};
      this.relations = [];
      this.observations = [];
    }
  }

  save() {
    this.metadata.lastModified = new Date().toISOString();
    this.updateCounts();

    fs.writeFileSync(
      this.getFilePath("entities.json"),
      JSON.stringify(this.entities, null, 2),
    );
    fs.writeFileSync(
      this.getFilePath("relations.json"),
      JSON.stringify(this.relations, null, 2),
    );
    fs.writeFileSync(
      this.getFilePath("observations.json"),
      JSON.stringify(this.observations, null, 2),
    );
    fs.writeFileSync(
      this.getFilePath("metadata.json"),
      JSON.stringify(this.metadata, null, 2),
    );
  }

  updateCounts() {
    this.metadata.entityCount = Object.values(this.entities).reduce(
      (sum, typeEntities) => sum + Object.keys(typeEntities).length,
      0,
    );
    this.metadata.relationCount = this.relations.length;
  }

  // ==========================================================================
  // ENTITY OPERATIONS
  // ==========================================================================

  /**
   * Create a new entity with bi-temporal tracking
   */
  createEntity(type, data) {
    const schema = Object.values(ENTITY_TYPES).find((t) => t.name === type);
    if (!schema) {
      throw new Error(`Unknown entity type: ${type}`);
    }

    // Validate required fields
    for (const field of schema.requiredFields) {
      if (data[field] === undefined) {
        throw new Error(
          `Missing required field '${field}' for entity type '${type}'`,
        );
      }
    }

    // Ensure type bucket exists
    if (!this.entities[type]) {
      this.entities[type] = {};
    }

    // Add temporal tracking
    const entity = {
      ...data,
      _type: type,
      _temporal: {
        t_recorded: new Date().toISOString(), // When we learned about it
        t_occurred: data.timestamp || new Date().toISOString(), // When it happened
        t_valid_from: new Date().toISOString(),
        t_valid_until: null, // null = still valid
      },
    };

    this.entities[type][data.id] = entity;
    this.save();

    return entity;
  }

  /**
   * Get an entity by type and ID
   */
  getEntity(type, id) {
    return this.entities[type]?.[id] || null;
  }

  /**
   * Get all entities of a type
   */
  getEntitiesByType(type, options = {}) {
    const entities = this.entities[type] || {};
    let results = Object.values(entities);

    // Filter by validity (exclude invalidated unless requested)
    if (!options.includeInvalid) {
      results = results.filter((e) => e._temporal.t_valid_until === null);
    }

    // Sort by timestamp (newest first by default)
    if (options.sort !== false) {
      results.sort((a, b) => {
        const timeA = new Date(a._temporal.t_occurred).getTime();
        const timeB = new Date(b._temporal.t_occurred).getTime();
        return options.oldestFirst ? timeA - timeB : timeB - timeA;
      });
    }

    // Limit results
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Update an entity (creates new temporal version)
   */
  updateEntity(type, id, updates) {
    const existing = this.getEntity(type, id);
    if (!existing) {
      throw new Error(`Entity not found: ${type}/${id}`);
    }

    // Invalidate old version
    existing._temporal.t_valid_until = new Date().toISOString();

    // Create new version with updates
    const updated = {
      ...existing,
      ...updates,
      _temporal: {
        ...existing._temporal,
        t_recorded: new Date().toISOString(),
        t_valid_from: new Date().toISOString(),
        t_valid_until: null,
      },
    };

    this.entities[type][id] = updated;
    this.save();

    return updated;
  }

  /**
   * Invalidate an entity (soft delete with temporal tracking)
   */
  invalidateEntity(type, id, reason = null) {
    const entity = this.getEntity(type, id);
    if (!entity) {
      throw new Error(`Entity not found: ${type}/${id}`);
    }

    entity._temporal.t_valid_until = new Date().toISOString();
    entity._invalidation_reason = reason;

    this.save();
    return entity;
  }

  // ==========================================================================
  // RELATION OPERATIONS
  // ==========================================================================

  /**
   * Create a relation between two entities
   */
  createRelation(fromType, fromId, relationType, toType, toId, metadata = {}) {
    const relationSchema = Object.values(RELATION_TYPES).find(
      (r) => r.name === relationType,
    );
    if (!relationSchema) {
      throw new Error(`Unknown relation type: ${relationType}`);
    }

    // Verify entities exist
    if (!this.getEntity(fromType, fromId)) {
      throw new Error(`Source entity not found: ${fromType}/${fromId}`);
    }
    if (!this.getEntity(toType, toId)) {
      throw new Error(`Target entity not found: ${toType}/${toId}`);
    }

    const relation = {
      id: `REL-${Date.now()}-${random().toString(36).substr(2, 9)}`,
      type: relationType,
      from: { type: fromType, id: fromId },
      to: { type: toType, id: toId },
      metadata,
      _temporal: {
        t_recorded: new Date().toISOString(),
        t_valid_from: new Date().toISOString(),
        t_valid_until: null,
      },
    };

    this.relations.push(relation);
    this.save();

    return relation;
  }

  /**
   * Get relations for an entity
   */
  getRelationsFor(type, id, options = {}) {
    let results = this.relations.filter((r) => {
      const matchesFrom = r.from.type === type && r.from.id === id;
      const matchesTo = r.to.type === type && r.to.id === id;

      if (options.direction === "outgoing") return matchesFrom;
      if (options.direction === "incoming") return matchesTo;
      return matchesFrom || matchesTo;
    });

    // Filter by relation type
    if (options.relationType) {
      results = results.filter((r) => r.type === options.relationType);
    }

    // Filter by validity
    if (!options.includeInvalid) {
      results = results.filter((r) => r._temporal.t_valid_until === null);
    }

    return results;
  }

  /**
   * Get the causal chain for an intervention
   * Returns: Intervention → Effect → Hypothesis → Validation
   */
  getCausalChain(interventionId) {
    const chain = {
      intervention: this.getEntity("Intervention", interventionId),
      effects: [],
      hypotheses: [],
      validations: [],
    };

    if (!chain.intervention) return null;

    // Get effects (what test runs this intervention caused)
    const effectRelations = this.getRelationsFor(
      "Intervention",
      interventionId,
      {
        direction: "outgoing",
        relationType: "caused",
      },
    );

    for (const rel of effectRelations) {
      const effect = this.getEntity(rel.to.type, rel.to.id);
      if (effect) {
        chain.effects.push({
          ...effect,
          _relation: rel.metadata,
        });
      }
    }

    // Get hypotheses that led to this intervention
    const hypothesisRelations = this.relations.filter(
      (r) => r.to.type === "Intervention" && r.to.id === interventionId,
    );

    for (const rel of hypothesisRelations) {
      const hypothesis = this.getEntity(rel.from.type, rel.from.id);
      if (hypothesis) {
        chain.hypotheses.push(hypothesis);
      }
    }

    return chain;
  }

  // ==========================================================================
  // OBSERVATION OPERATIONS
  // ==========================================================================

  /**
   * Add an observation about an entity
   */
  addObservation(entityType, entityId, observation) {
    const obs = {
      id: `OBS-${Date.now()}-${random().toString(36).substr(2, 9)}`,
      entity: { type: entityType, id: entityId },
      content: observation,
      _temporal: {
        t_recorded: new Date().toISOString(),
      },
    };

    this.observations.push(obs);
    this.save();

    return obs;
  }

  /**
   * Get observations for an entity
   */
  getObservationsFor(entityType, entityId) {
    return this.observations.filter(
      (o) => o.entity.type === entityType && o.entity.id === entityId,
    );
  }

  // ==========================================================================
  // QUERY OPERATIONS
  // ==========================================================================

  /**
   * Query entities with flexible filters
   */
  query(type, filters = {}) {
    let results = this.getEntitiesByType(type, {
      includeInvalid: filters.includeInvalid,
    });

    // Apply custom filters
    for (const [key, value] of Object.entries(filters)) {
      if (key === "includeInvalid" || key === "limit" || key === "sort")
        continue;

      if (typeof value === "function") {
        results = results.filter((e) => value(e[key], e));
      } else {
        results = results.filter((e) => e[key] === value);
      }
    }

    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Get recent test runs
   */
  getRecentRuns(limit = 10) {
    return this.getEntitiesByType("TestRun", { limit });
  }

  /**
   * Get active hypotheses (not yet validated/invalidated)
   */
  getActiveHypotheses() {
    return this.query("Hypothesis", {
      status: (s) => s === "active" || s === undefined,
    });
  }

  /**
   * Get interventions pending validation
   */
  getPendingInterventions() {
    return this.query("Intervention", {
      status: (s) => s === "pending_validation" || s === "in_progress",
    });
  }

  /**
   * Get successful interventions (for "what worked before")
   */
  getSuccessfulInterventions() {
    return this.query("Intervention", {
      status: "validated",
      effectiveness: (e) => e && e.improved === true,
    });
  }

  /**
   * Get failed interventions (for "what didn't work")
   */
  getFailedInterventions() {
    return this.query("Intervention", {
      status: (s) => s === "ineffective" || s === "rolled_back",
    });
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get knowledge base statistics
   */
  getStats() {
    const stats = {
      metadata: this.metadata,
      entities: {},
      relations: {
        total: this.relations.length,
        byType: {},
      },
      observations: this.observations.length,
    };

    // Count entities by type
    for (const [type, entities] of Object.entries(this.entities)) {
      const all = Object.values(entities);
      const valid = all.filter((e) => e._temporal.t_valid_until === null);
      stats.entities[type] = {
        total: all.length,
        valid: valid.length,
        invalidated: all.length - valid.length,
      };
    }

    // Count relations by type
    for (const rel of this.relations) {
      stats.relations.byType[rel.type] =
        (stats.relations.byType[rel.type] || 0) + 1;
    }

    return stats;
  }

  /**
   * Export full knowledge base for LLM context
   */
  exportForLLM() {
    return {
      summary: this.getStats(),
      recentRuns: this.getRecentRuns(5),
      activeHypotheses: this.getActiveHypotheses(),
      pendingInterventions: this.getPendingInterventions(),
      successfulApproaches: this.getSuccessfulInterventions().slice(0, 5),
      failedApproaches: this.getFailedInterventions().slice(0, 5),
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  KnowledgeBase,
  ENTITY_TYPES,
  RELATION_TYPES,
};
