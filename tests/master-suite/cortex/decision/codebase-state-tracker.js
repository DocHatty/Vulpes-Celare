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
 * ║   CODEBASE STATE TRACKER                                                      ║
 * ║   Continuous Awareness of System Evolution                                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * This module maintains CONTINUOUS awareness of the codebase state:
 *
 * - CURRENT STATE: What exists right now
 * - HISTORICAL STATES: What existed before
 * - CHANGES: What has changed and when
 * - TRAJECTORY: Where the system is heading
 *
 * Unlike CodebaseAnalyzer (which takes snapshots), this module:
 * - Maintains a rolling history of states
 * - Tracks state changes over time
 * - Identifies trends in codebase evolution
 * - Correlates state changes with metric changes
 *
 * KEY QUESTIONS IT ANSWERS:
 * ─────────────────────────────────────────────────────────────────────────────────
 * - What changed since last test run?
 * - When was filter X last modified?
 * - Has dictionary Y grown or shrunk over time?
 * - Are we adding or removing capabilities?
 * - What's the correlation between code changes and metric changes?
 */

const fs = require("fs");
const path = require("path");
const { PATHS } = require("../core/config");

// ============================================================================
// CODEBASE STATE TRACKER CLASS
// ============================================================================

class CodebaseStateTracker {
  constructor(options = {}) {
    this.codebaseAnalyzer = options.codebaseAnalyzer || null;
    this.metricsEngine = options.metricsEngine || null;
    this.temporalIndex = options.temporalIndex || null;

    this.storagePath = path.join(PATHS.knowledge, "codebase-history.json");
    this.data = this.loadData();

    // Cache current state
    this.currentState = null;
    this.lastRefresh = null;
  }

  loadData() {
    try {
      if (fs.existsSync(this.storagePath)) {
        return JSON.parse(fs.readFileSync(this.storagePath, "utf8"));
      }
    } catch (e) {
      console.warn("CodebaseStateTracker: Starting with empty history");
    }
    return {
      states: [],
      changes: [],
      correlations: [],
      stats: {
        totalSnapshots: 0,
        totalChanges: 0,
      },
    };
  }

  saveData() {
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.storagePath, JSON.stringify(this.data, null, 2));
  }

  // ==========================================================================
  // STATE CAPTURE
  // ==========================================================================

  /**
   * Capture current state and compare with previous
   */
  captureState() {
    if (!this.codebaseAnalyzer) {
      throw new Error("CodebaseAnalyzer required for state capture");
    }

    // Get fresh snapshot
    const snapshot = this.codebaseAnalyzer.takeSnapshot();

    const stateRecord = {
      id: `STATE-${Date.now()}`,
      timestamp: new Date().toISOString(),
      hash: snapshot.summary?.codebaseHash,
      summary: {
        filterCount: snapshot.filters?.count || 0,
        dictionaryCount: snapshot.dictionaries?.count || 0,
        dictionaryEntries: snapshot.dictionaries?.totalEntries || 0,
        capabilities: snapshot.filters?.capabilities || [],
        gaps: snapshot.filters?.gaps || [],
      },
      // Store filter details
      filters:
        snapshot.filters?.filters?.map((f) => ({
          name: f.name,
          phiType: f.phiType,
          hash: f.hash,
          capabilities: f.capabilities,
        })) || [],
      // Store dictionary details
      dictionaries:
        snapshot.dictionaries?.dictionaries?.map((d) => ({
          name: d.name,
          type: d.type,
          entries: d.entries,
          hash: d.hash,
        })) || [],
    };

    // Compare with previous state
    const changes = this.compareWithPrevious(stateRecord);

    // Store state
    this.data.states.push({
      id: stateRecord.id,
      timestamp: stateRecord.timestamp,
      hash: stateRecord.hash,
      summary: stateRecord.summary,
    });

    // Store changes
    if (changes.length > 0) {
      this.data.changes.push({
        timestamp: stateRecord.timestamp,
        stateId: stateRecord.id,
        changes,
      });
      this.data.stats.totalChanges += changes.length;
    }

    this.data.stats.totalSnapshots++;

    // Trim old states (keep last 100)
    if (this.data.states.length > 100) {
      this.data.states = this.data.states.slice(-100);
    }
    if (this.data.changes.length > 100) {
      this.data.changes = this.data.changes.slice(-100);
    }

    this.saveData();

    // Update cache
    this.currentState = stateRecord;
    this.lastRefresh = Date.now();

    return {
      state: stateRecord,
      changes,
      changedSinceLastCapture: changes.length > 0,
    };
  }

  compareWithPrevious(currentState) {
    const changes = [];
    const previousState = this.data.states[this.data.states.length - 1];

    if (!previousState) {
      return [{ type: "INITIAL_STATE", description: "First state capture" }];
    }

    // Check hash change
    if (previousState.hash !== currentState.hash) {
      // Find specific changes
      const prevFilters = new Map(
        this.data.states.length > 0
          ? this.getFullState(previousState.id)?.filters?.map((f) => [
              f.name,
              f,
            ]) || []
          : [],
      );
      const currFilters = new Map(currentState.filters.map((f) => [f.name, f]));

      // Check for filter changes
      for (const [name, curr] of currFilters) {
        const prev = prevFilters.get(name);
        if (!prev) {
          changes.push({
            type: "FILTER_ADDED",
            component: name,
            phiType: curr.phiType,
          });
        } else if (prev.hash !== curr.hash) {
          changes.push({
            type: "FILTER_MODIFIED",
            component: name,
            phiType: curr.phiType,
          });
        }
      }

      for (const [name] of prevFilters) {
        if (!currFilters.has(name)) {
          changes.push({
            type: "FILTER_REMOVED",
            component: name,
          });
        }
      }

      // Check for dictionary changes
      const prevEntries = previousState.summary?.dictionaryEntries || 0;
      const currEntries = currentState.summary.dictionaryEntries;
      if (currEntries !== prevEntries) {
        changes.push({
          type: "DICTIONARY_SIZE_CHANGED",
          from: prevEntries,
          to: currEntries,
          delta: currEntries - prevEntries,
        });
      }

      // Check capabilities
      const prevCaps = new Set(previousState.summary?.capabilities || []);
      const currCaps = new Set(currentState.summary.capabilities);

      for (const cap of currCaps) {
        if (!prevCaps.has(cap)) {
          changes.push({
            type: "CAPABILITY_ADDED",
            capability: cap,
          });
        }
      }

      for (const cap of prevCaps) {
        if (!currCaps.has(cap)) {
          changes.push({
            type: "CAPABILITY_REMOVED",
            capability: cap,
          });
        }
      }
    }

    return changes;
  }

  getFullState(stateId) {
    // For older states, we only have summary
    // Full state is only available for current capture
    if (this.currentState?.id === stateId) {
      return this.currentState;
    }
    return null;
  }

  // ==========================================================================
  // STATE QUERIES
  // ==========================================================================

  /**
   * Get current codebase state (uses cache if fresh)
   */
  getCurrentState(options = {}) {
    const maxAge = options.maxAge || 60000; // Default 1 minute

    if (
      this.currentState &&
      this.lastRefresh &&
      Date.now() - this.lastRefresh < maxAge
    ) {
      return this.currentState;
    }

    return this.captureState().state;
  }

  /**
   * Get changes since a specific time
   */
  getChangesSince(timestamp) {
    const cutoff = new Date(timestamp).getTime();

    return this.data.changes
      .filter((c) => new Date(c.timestamp).getTime() > cutoff)
      .flatMap((c) => c.changes);
  }

  /**
   * Get changes between two states
   */
  getChangesBetween(fromStateId, toStateId) {
    const fromIndex = this.data.states.findIndex((s) => s.id === fromStateId);
    const toIndex = this.data.states.findIndex((s) => s.id === toStateId);

    if (fromIndex === -1 || toIndex === -1) {
      return [];
    }

    const changes = [];
    for (let i = fromIndex; i < toIndex; i++) {
      const changeRecord = this.data.changes.find(
        (c) => c.stateId === this.data.states[i + 1]?.id,
      );
      if (changeRecord) {
        changes.push(...changeRecord.changes);
      }
    }

    return changes;
  }

  /**
   * Get filter modification history
   */
  getFilterHistory(filterName) {
    const history = [];

    for (const changeRecord of this.data.changes) {
      const relevantChanges = changeRecord.changes.filter(
        (c) => c.component === filterName,
      );
      if (relevantChanges.length > 0) {
        history.push({
          timestamp: changeRecord.timestamp,
          changes: relevantChanges,
        });
      }
    }

    return history;
  }

  /**
   * Get dictionary size history
   */
  getDictionarySizeHistory() {
    return this.data.states.map((s) => ({
      timestamp: s.timestamp,
      entries: s.summary?.dictionaryEntries || 0,
    }));
  }

  // ==========================================================================
  // TREND ANALYSIS
  // ==========================================================================

  /**
   * Analyze codebase evolution trends
   */
  analyzeTrends() {
    const trends = {
      filterCount: this.analyzeMetricTrend("filterCount"),
      dictionarySize: this.analyzeMetricTrend("dictionaryEntries"),
      capabilities: this.analyzeCapabilityTrend(),
      gaps: this.analyzeGapsTrend(),
      changeFrequency: this.analyzeChangeFrequency(),
    };

    return trends;
  }

  analyzeMetricTrend(metricKey) {
    const values = this.data.states.map((s) => ({
      timestamp: new Date(s.timestamp).getTime(),
      value: s.summary?.[metricKey] || 0,
    }));

    if (values.length < 3) {
      return { direction: "INSUFFICIENT_DATA", samples: values.length };
    }

    // Simple linear regression
    const n = values.length;
    const sumX = values.reduce((sum, v, i) => sum + i, 0);
    const sumY = values.reduce((sum, v) => sum + v.value, 0);
    const sumXY = values.reduce((sum, v, i) => sum + i * v.value, 0);
    const sumX2 = values.reduce((sum, v, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    let direction = "STABLE";
    if (slope > 0.1) direction = "INCREASING";
    if (slope < -0.1) direction = "DECREASING";

    return {
      direction,
      slope,
      samples: n,
      current: values[values.length - 1]?.value,
      first: values[0]?.value,
    };
  }

  analyzeCapabilityTrend() {
    if (this.data.states.length < 2) {
      return { direction: "INSUFFICIENT_DATA" };
    }

    const first = new Set(this.data.states[0]?.summary?.capabilities || []);
    const last = new Set(
      this.data.states[this.data.states.length - 1]?.summary?.capabilities ||
        [],
    );

    const added = [...last].filter((c) => !first.has(c));
    const removed = [...first].filter((c) => !last.has(c));

    return {
      direction:
        added.length > removed.length
          ? "IMPROVING"
          : removed.length > added.length
            ? "DEGRADING"
            : "STABLE",
      added,
      removed,
      current: [...last],
    };
  }

  analyzeGapsTrend() {
    if (this.data.states.length < 2) {
      return { direction: "INSUFFICIENT_DATA" };
    }

    const first = this.data.states[0]?.summary?.gaps?.length || 0;
    const last =
      this.data.states[this.data.states.length - 1]?.summary?.gaps?.length || 0;

    return {
      direction:
        last < first ? "IMPROVING" : last > first ? "DEGRADING" : "STABLE",
      firstGapCount: first,
      currentGapCount: last,
      currentGaps:
        this.data.states[this.data.states.length - 1]?.summary?.gaps || [],
    };
  }

  analyzeChangeFrequency() {
    if (this.data.changes.length < 2) {
      return { frequency: "LOW", changesPerDay: 0 };
    }

    const first = new Date(this.data.changes[0]?.timestamp).getTime();
    const last = new Date(
      this.data.changes[this.data.changes.length - 1]?.timestamp,
    ).getTime();
    const days = Math.max((last - first) / (24 * 60 * 60 * 1000), 1);
    const totalChanges = this.data.changes.reduce(
      (sum, c) => sum + c.changes.length,
      0,
    );

    const perDay = totalChanges / days;

    return {
      frequency: perDay > 5 ? "HIGH" : perDay > 1 ? "MEDIUM" : "LOW",
      changesPerDay: perDay,
      totalChanges,
      periodDays: days,
    };
  }

  // ==========================================================================
  // CORRELATION WITH METRICS
  // ==========================================================================

  /**
   * Correlate codebase changes with metric changes
   */
  async correlateWithMetrics(metricsHistory) {
    if (!metricsHistory || metricsHistory.length < 2) {
      return { correlations: [], insufficient_data: true };
    }

    const correlations = [];

    // For each significant change, find corresponding metric change
    for (const changeRecord of this.data.changes) {
      const changeTime = new Date(changeRecord.timestamp).getTime();

      // Find metric readings around this change
      const beforeMetrics = metricsHistory.find(
        (m) =>
          Math.abs(new Date(m.timestamp).getTime() - changeTime) <
            24 * 60 * 60 * 1000 && new Date(m.timestamp).getTime() < changeTime,
      );

      const afterMetrics = metricsHistory.find(
        (m) =>
          Math.abs(new Date(m.timestamp).getTime() - changeTime) <
            24 * 60 * 60 * 1000 && new Date(m.timestamp).getTime() > changeTime,
      );

      if (beforeMetrics && afterMetrics) {
        const sensitivityDelta =
          (afterMetrics.sensitivity || 0) - (beforeMetrics.sensitivity || 0);

        if (Math.abs(sensitivityDelta) > 0.5) {
          correlations.push({
            timestamp: changeRecord.timestamp,
            changes: changeRecord.changes,
            metricImpact: {
              sensitivity: sensitivityDelta,
              direction: sensitivityDelta > 0 ? "IMPROVED" : "REGRESSED",
            },
          });
        }
      }
    }

    // Store correlations
    this.data.correlations = [...this.data.correlations, ...correlations].slice(
      -50,
    );
    this.saveData();

    return { correlations };
  }

  // ==========================================================================
  // EXPORT
  // ==========================================================================

  /**
   * Export for LLM context
   */
  exportForLLM() {
    const current = this.getCurrentState({ maxAge: 300000 }); // 5 min cache
    const trends = this.analyzeTrends();
    const recentChanges = this.getChangesSince(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ); // Last 7 days

    return {
      currentState: {
        filters: current?.summary?.filterCount || 0,
        dictionaries: current?.summary?.dictionaryCount || 0,
        dictionaryEntries: current?.summary?.dictionaryEntries || 0,
        capabilities: current?.summary?.capabilities || [],
        gaps: current?.summary?.gaps || [],
      },
      trends: {
        filterTrend: trends.filterCount.direction,
        dictionaryTrend: trends.dictionarySize.direction,
        capabilityTrend: trends.capabilities.direction,
        gapTrend: trends.gaps.direction,
        changeFrequency: trends.changeFrequency.frequency,
      },
      recentChanges: recentChanges.slice(0, 10).map((c) => ({
        type: c.type,
        component: c.component,
        description: c.description,
      })),
      stats: this.data.stats,
    };
  }

  /**
   * Generate status report
   */
  generateReport() {
    const state = this.getCurrentState();
    const trends = this.analyzeTrends();

    let report = `
╔══════════════════════════════════════════════════════════════════════════════╗
║  VULPES CORTEX - CODEBASE STATE REPORT                                       ║
║  Generated: ${new Date().toISOString()}
╚══════════════════════════════════════════════════════════════════════════════╝

CURRENT STATE
───────────────────────────────────────────────────────────────────────────────
Filters: ${state?.summary?.filterCount || 0}
Dictionaries: ${state?.summary?.dictionaryCount || 0}
Dictionary Entries: ${state?.summary?.dictionaryEntries || 0}
Capabilities: ${state?.summary?.capabilities?.join(", ") || "None"}
Gaps: ${state?.summary?.gaps?.join(", ") || "None"}

TRENDS
───────────────────────────────────────────────────────────────────────────────
Filter Count: ${trends.filterCount.direction} (${trends.filterCount.first || 0} → ${trends.filterCount.current || 0})
Dictionary Size: ${trends.dictionarySize.direction}
Capabilities: ${trends.capabilities.direction}
  Added: ${trends.capabilities.added?.join(", ") || "None"}
  Removed: ${trends.capabilities.removed?.join(", ") || "None"}
Gaps: ${trends.gaps.direction} (${trends.gaps.firstGapCount} → ${trends.gaps.currentGapCount})
Change Frequency: ${trends.changeFrequency.frequency} (${trends.changeFrequency.changesPerDay?.toFixed(1)}/day)

STATISTICS
───────────────────────────────────────────────────────────────────────────────
Total Snapshots: ${this.data.stats.totalSnapshots}
Total Changes Tracked: ${this.data.stats.totalChanges}
`;

    return report;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  CodebaseStateTracker,
};
