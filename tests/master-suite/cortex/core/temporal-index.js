const { random } = require("../../generators/seeded-random");

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  VULPES CORTEX - TEMPORAL INDEX                                              ║
 * ║  Bi-Temporal Tracking for Knowledge Evolution                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * Based on Graphiti/Zep research on temporal knowledge graphs.
 *
 * BI-TEMPORAL MODEL:
 * Every piece of knowledge has TWO time dimensions:
 *
 * 1. TRANSACTION TIME (t_recorded): When we learned about it
 *    - When the system recorded this fact
 *    - Useful for: "What did we know at time X?"
 *
 * 2. VALID TIME (t_occurred, t_valid_from, t_valid_until): When it was/is true
 *    - When the event actually happened in the real world
 *    - Useful for: "What was true at time X?"
 *
 * WHY THIS MATTERS:
 * - We might learn about an intervention's effect AFTER the test ran
 * - Knowledge can become invalid (a fix that worked might stop working)
 * - We need to ask: "Based on what we knew at time X, what would we recommend?"
 *
 * EXAMPLE:
 * - t_occurred: 2024-01-15 (when intervention was made)
 * - t_recorded: 2024-01-16 (when we ran the test and learned the effect)
 * - t_valid_from: 2024-01-16 (knowledge became valid after test)
 * - t_valid_until: 2024-02-01 (knowledge invalidated when code changed again)
 */

const fs = require("fs");
const path = require("path");
const { PATHS, TEMPORAL_CONFIG } = require("./config");

// ============================================================================
// TEMPORAL INDEX CLASS
// ============================================================================

class TemporalIndex {
  constructor(knowledgeBase) {
    this.kb = knowledgeBase;
    this.indexPath = path.join(PATHS.knowledge, "temporal-index.json");
    this.index = this.load();
  }

  // ==========================================================================
  // INDEX MANAGEMENT
  // ==========================================================================

  load() {
    try {
      if (fs.existsSync(this.indexPath)) {
        return JSON.parse(fs.readFileSync(this.indexPath, "utf8"));
      }
    } catch (e) {
      console.warn("TemporalIndex: Starting fresh index");
    }

    return {
      byRecordedTime: {}, // Index by when we learned
      byOccurredTime: {}, // Index by when it happened
      byValidityPeriod: {}, // Index by validity window
      timeline: [], // Ordered list of all events
      version: "1.0.0",
    };
  }

  save() {
    fs.writeFileSync(this.indexPath, JSON.stringify(this.index, null, 2));
  }

  // ==========================================================================
  // INDEXING OPERATIONS
  // ==========================================================================

  /**
   * Index an entity's temporal data
   */
  indexEntity(entity) {
    if (!entity._temporal) return;

    const ref = {
      type: entity._type,
      id: entity.id,
      t_recorded: entity._temporal.t_recorded,
      t_occurred: entity._temporal.t_occurred,
      t_valid_from: entity._temporal.t_valid_from,
      t_valid_until: entity._temporal.t_valid_until,
    };

    // Index by recorded time (YYYY-MM-DD)
    const recordedDate = this.toDateKey(ref.t_recorded);
    if (!this.index.byRecordedTime[recordedDate]) {
      this.index.byRecordedTime[recordedDate] = [];
    }
    this.index.byRecordedTime[recordedDate].push(ref);

    // Index by occurred time
    const occurredDate = this.toDateKey(ref.t_occurred);
    if (!this.index.byOccurredTime[occurredDate]) {
      this.index.byOccurredTime[occurredDate] = [];
    }
    this.index.byOccurredTime[occurredDate].push(ref);

    // Add to timeline
    this.index.timeline.push({
      ...ref,
      timestamp: new Date(ref.t_occurred).getTime(),
    });

    // Keep timeline sorted
    this.index.timeline.sort((a, b) => b.timestamp - a.timestamp);

    this.save();
  }

  toDateKey(isoString) {
    if (!isoString) return "unknown";
    return isoString.split("T")[0];
  }

  // ==========================================================================
  // TEMPORAL QUERIES
  // ==========================================================================

  /**
   * Get what we knew at a specific point in time
   * (Only facts that were recorded BEFORE the given time)
   */
  getKnowledgeAsOf(asOfTime) {
    const asOfTimestamp = new Date(asOfTime).getTime();

    return this.index.timeline.filter((entry) => {
      const recordedTimestamp = new Date(entry.t_recorded).getTime();
      return recordedTimestamp <= asOfTimestamp;
    });
  }

  /**
   * Get what was true at a specific point in time
   * (Facts that were valid during the given time)
   */
  getValidAt(atTime) {
    const atTimestamp = new Date(atTime).getTime();

    return this.index.timeline.filter((entry) => {
      const validFrom = new Date(entry.t_valid_from).getTime();
      const validUntil = entry.t_valid_until
        ? new Date(entry.t_valid_until).getTime()
        : Infinity;

      return validFrom <= atTimestamp && atTimestamp < validUntil;
    });
  }

  /**
   * Get the history of changes for an entity
   * (All versions across time)
   */
  getEntityHistory(type, id) {
    return this.index.timeline
      .filter((entry) => entry.type === type && entry.id === id)
      .map((entry) => ({
        ...entry,
        entity: this.kb.getEntity(type, id),
      }));
  }

  /**
   * Get events in a time range
   */
  getEventsInRange(startTime, endTime, options = {}) {
    const startTimestamp = new Date(startTime).getTime();
    const endTimestamp = new Date(endTime).getTime();

    let results = this.index.timeline.filter((entry) => {
      const timestamp = entry.timestamp;
      return timestamp >= startTimestamp && timestamp <= endTimestamp;
    });

    // Filter by type if specified
    if (options.type) {
      results = results.filter((e) => e.type === options.type);
    }

    return results;
  }

  /**
   * Get the most recent N events
   */
  getRecentEvents(limit = 20) {
    return this.index.timeline.slice(0, limit);
  }

  // ==========================================================================
  // METRICS RECORDING
  // ==========================================================================

  /**
   * Record metrics from a test run
   * Creates a TestRun entity in the knowledge base for trend tracking
   */
  recordMetrics(metrics, context = {}) {
    // Extract key metrics for the entity
    const metricsData = {
      sensitivity: metrics.primary?.sensitivity ?? metrics.sensitivity,
      specificity: metrics.primary?.specificity ?? metrics.specificity,
      precision: metrics.primary?.precision ?? metrics.precision,
      f1Score: metrics.primary?.f1Score ?? metrics.f1Score,
      mcc: metrics.primary?.mcc ?? metrics.mcc,
    };

    // Generate unique run ID
    const runId = `run_${Date.now()}_${random().toString(36).substr(2, 9)}`;

    // Create TestRun entity using knowledge base API
    // Required fields: id, timestamp, documentCount, metrics
    const testRunEntity = this.kb.createEntity("TestRun", {
      id: runId,
      timestamp: new Date().toISOString(),
      documentCount: context.documentCount || 0,
      metrics: metricsData,
      // Optional fields
      confusionMatrix: metrics.confusionMatrix,
      interpretation: metrics.interpretation,
      profile: context.profile,
    });

    // Index it temporally
    this.indexEntity(testRunEntity);

    return testRunEntity;
  }

  // ==========================================================================
  // TREND ANALYSIS
  // ==========================================================================

  /**
   * Analyze trends over time for a metric
   */
  analyzeTrend(metricName, options = {}) {
    const runs = this.kb.getEntitiesByType("TestRun", {
      limit: options.windowSize || 20,
    });

    if (runs.length < 2) {
      return {
        trend: "INSUFFICIENT_DATA",
        dataPoints: runs.length,
        message: "Need at least 2 data points for trend analysis",
      };
    }

    // Extract metric values with timestamps
    const dataPoints = runs
      .filter((r) => r.metrics && r.metrics[metricName] !== undefined)
      .map((r) => ({
        timestamp: new Date(r._temporal.t_occurred).getTime(),
        value: r.metrics[metricName],
      }))
      .sort((a, b) => a.timestamp - b.timestamp); // Oldest first

    if (dataPoints.length < 2) {
      return {
        trend: "INSUFFICIENT_DATA",
        dataPoints: dataPoints.length,
      };
    }

    // Calculate linear regression
    const regression = this.linearRegression(dataPoints);

    // Determine trend direction
    let trend;
    if (regression.slope > 0.1) trend = "STRONGLY_IMPROVING";
    else if (regression.slope > 0.02) trend = "IMPROVING";
    else if (regression.slope > -0.02) trend = "STABLE";
    else if (regression.slope > -0.1) trend = "DECLINING";
    else trend = "STRONGLY_DECLINING";

    // Calculate statistics
    const values = dataPoints.map((d) => d.value);
    const stats = {
      current: values[values.length - 1],
      previous: values[values.length - 2],
      min: Math.min(...values),
      max: Math.max(...values),
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      delta: values[values.length - 1] - values[0],
      deltaPercent: ((values[values.length - 1] - values[0]) / values[0]) * 100,
    };

    return {
      metric: metricName,
      trend,
      slope: regression.slope,
      intercept: regression.intercept,
      rSquared: regression.rSquared,
      dataPoints: dataPoints.length,
      timeSpanDays:
        (dataPoints[dataPoints.length - 1].timestamp -
          dataPoints[0].timestamp) /
        (1000 * 60 * 60 * 24),
      stats,
      interpretation: this.interpretTrend(metricName, trend, stats),
    };
  }

  linearRegression(points) {
    const n = points.length;
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0,
      sumY2 = 0;

    // Normalize timestamps to indices for numerical stability
    for (let i = 0; i < n; i++) {
      const x = i;
      const y = points[i].value;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const meanY = sumY / n;
    let ssTotal = 0,
      ssResidual = 0;
    for (let i = 0; i < n; i++) {
      const predicted = slope * i + intercept;
      ssTotal += Math.pow(points[i].value - meanY, 2);
      ssResidual += Math.pow(points[i].value - predicted, 2);
    }
    const rSquared = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;

    return { slope, intercept, rSquared };
  }

  interpretTrend(metric, trend, stats) {
    const messages = {
      STRONGLY_IMPROVING: `${metric} is strongly improving (+${stats.delta.toFixed(2)} over the period)`,
      IMPROVING: `${metric} is gradually improving`,
      STABLE: `${metric} is stable around ${stats.mean.toFixed(2)}`,
      DECLINING: `${metric} is declining - review recent changes`,
      STRONGLY_DECLINING: `WARNING: ${metric} is strongly declining (${stats.delta.toFixed(2)} drop)`,
    };
    return messages[trend] || `${metric} trend: ${trend}`;
  }

  /**
   * Detect anomalies (sudden changes)
   */
  detectAnomalies(metricName, options = {}) {
    const threshold = options.threshold || 2; // Standard deviations
    const runs = this.kb.getEntitiesByType("TestRun", { limit: 50 });

    const values = runs
      .filter((r) => r.metrics && r.metrics[metricName] !== undefined)
      .map((r) => ({
        runId: r.id,
        timestamp: r._temporal.t_occurred,
        value: r.metrics[metricName],
      }));

    if (values.length < 5) return [];

    // Calculate mean and standard deviation
    const mean = values.reduce((a, b) => a + b.value, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v.value - mean, 2), 0) /
        values.length,
    );

    // Find anomalies
    const anomalies = values
      .filter((v) => Math.abs(v.value - mean) > threshold * stdDev)
      .map((v) => ({
        ...v,
        deviation: (v.value - mean) / stdDev,
        direction: v.value > mean ? "HIGH" : "LOW",
      }));

    return anomalies;
  }

  // ==========================================================================
  // VALIDITY MANAGEMENT
  // ==========================================================================

  /**
   * Invalidate knowledge that's no longer true
   */
  invalidateKnowledge(type, id, reason) {
    const entity = this.kb.getEntity(type, id);
    if (!entity) return null;

    // Update the entity's validity
    this.kb.updateEntity(type, id, {
      _temporal: {
        ...entity._temporal,
        t_valid_until: new Date().toISOString(),
      },
      _invalidation_reason: reason,
    });

    // Update the index
    const indexEntry = this.index.timeline.find(
      (e) => e.type === type && e.id === id && !e.t_valid_until,
    );
    if (indexEntry) {
      indexEntry.t_valid_until = new Date().toISOString();
      this.save();
    }

    return entity;
  }

  /**
   * Check if knowledge is currently valid
   */
  isCurrentlyValid(type, id) {
    const entity = this.kb.getEntity(type, id);
    return entity && entity._temporal.t_valid_until === null;
  }

  /**
   * Get all knowledge that became invalid in a time range
   * (Useful for understanding what changed)
   */
  getInvalidatedInRange(startTime, endTime) {
    const startTimestamp = new Date(startTime).getTime();
    const endTimestamp = new Date(endTime).getTime();

    return this.index.timeline.filter((entry) => {
      if (!entry.t_valid_until) return false;
      const invalidatedAt = new Date(entry.t_valid_until).getTime();
      return invalidatedAt >= startTimestamp && invalidatedAt <= endTimestamp;
    });
  }

  // ==========================================================================
  // TIMELINE GENERATION
  // ==========================================================================

  /**
   * Generate a human-readable timeline of events
   */
  generateTimeline(options = {}) {
    const events = options.limit
      ? this.index.timeline.slice(0, options.limit)
      : this.index.timeline;

    return events.map((entry) => {
      const entity = this.kb.getEntity(entry.type, entry.id);
      return {
        date: entry.t_occurred,
        type: entry.type,
        id: entry.id,
        summary: this.summarizeEvent(entry.type, entity),
        isValid: entry.t_valid_until === null,
      };
    });
  }

  summarizeEvent(type, entity) {
    if (!entity) return "Unknown event";

    switch (type) {
      case "TestRun":
        return `Test run: ${entity.metrics?.sensitivity?.toFixed(2) || "?"}% sensitivity, ${entity.documentCount || "?"} docs`;
      case "Intervention":
        return `Intervention: ${entity.description || "No description"}`;
      case "Hypothesis":
        return `Hypothesis: ${entity.hypothesis || "No hypothesis"}`;
      case "Pattern":
        return `Pattern identified: ${entity.type || "Unknown"} (${entity.count || 0} occurrences)`;
      case "Insight":
        return `Insight: ${entity.content || "No content"}`;
      default:
        return `${type}: ${entity.id}`;
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  TemporalIndex,
};
