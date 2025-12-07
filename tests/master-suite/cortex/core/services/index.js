/**
 * CORE SERVICES - Unified Service Layer
 * All business logic lives here. Used by both MCP and API layers.
 * 
 * HIPAA NOTE: Everything runs locally. No external network calls.
 */

const { ResultProcessor } = require('../result-processor');

let services = null;

function initializeServices(db, modules = {}) {
  const resultProcessor = new ResultProcessor(modules);
  
  services = {
    patterns: new PatternService(db, modules),
    metrics: new MetricsService(db, modules, resultProcessor),
    decisions: new DecisionService(db, modules),
    tests: new TestService(db, modules, resultProcessor),
    experiments: new ExperimentService(db, modules),
    interventions: new InterventionService(db, modules),
    knowledge: new KnowledgeService(db, modules),
    audit: new AuditService(db, modules),
    resultProcessor,
  };
  
  return services;
}

function getServices() {
  if (!services) throw new Error('Services not initialized');
  return services;
}

class PatternService {
  constructor(db, modules) { this.db = db; this.modules = modules; }
  
  query(filters = {}, options = {}) { return this.db.queryPatterns(filters, options); }
  getTrending(limit = 10) { return this.db.getTrendingPatterns(limit); }
  getByPhiType(phiType) { return this.db.getPatternsByPhiType(phiType); }
  
  record(pattern) {
    if (!pattern.phiType || !pattern.pattern) throw new Error('Missing phiType or pattern');
    return this.db.recordPattern({ ...pattern, timestamp: new Date().toISOString() });
  }
  
  analyze(failures) {
    if (this.modules.patternRecognizer) {
      return this.modules.patternRecognizer.analyzeTestResult({ falseNegatives: failures, falsePositives: [] });
    }
    return { patterns: [], stats: {} };
  }
}

class MetricsService {
  constructor(db, modules, resultProcessor) { this.db = db; this.modules = modules; this.rp = resultProcessor; }
  
  getLatest() { return this.db.getLatestMetrics(); }
  getTrend(metricName, options = {}) { return this.db.getMetricsTrend(metricName, options); }
  compare(period1, period2) { return this.db.compareMetricsPeriods(period1, period2); }
  
  record(runId, metrics, context = {}) {
    const formatted = this.rp.formatMetrics(metrics, { grade: metrics.grade, score: metrics.finalScore });
    this.db.recordMetrics(runId, formatted, context);
    if (this.modules.temporalIndex) {
      this.modules.temporalIndex.recordMetrics({ ...formatted, timestamp: new Date().toISOString(), ...context });
    }
    return formatted;
  }
}

class DecisionService {
  constructor(db, modules) { this.db = db; this.modules = modules; }
  
  query(filters = {}, options = {}) { return this.db.queryDecisions(filters, options); }
  get(id) { return this.db.getDecision(id); }
  
  record(decision) {
    if (!decision.type || !decision.description) throw new Error('Missing type or description');
    return this.db.recordDecision({ ...decision, timestamp: new Date().toISOString() });
  }
  
  async consult(type, context = {}) {
    if (this.modules.historyConsultant) return await this.modules.historyConsultant.consult(type, context);
    return { summary: 'No history available', suggestions: [] };
  }
}

class TestService {
  constructor(db, modules, resultProcessor) { this.db = db; this.modules = modules; this.rp = resultProcessor; }
  
  enqueue(config) { return this.db.enqueueTest({ ...config, queued_at: new Date().toISOString() }); }
  getStatus(testId) { return this.db.getTestStatus(testId); }
  
  async getProcessedResult(testId) {
    const status = this.db.getTestStatus(testId);
    if (status.status !== 'completed' || !status.result) return status;
    const processed = await this.rp.processTestResults(status.result, { testId }, this.modules);
    return { ...status, result: processed };
  }
}

class ExperimentService {
  constructor(db, modules) { this.db = db; this.modules = modules; }
  
  query(filters = {}, options = {}) { return this.db.queryExperiments(filters, options); }
  create(exp) { return this.db.createExperiment({ ...exp, created_at: new Date().toISOString(), status: 'pending' }); }
  get(id) { return this.db.getExperiment(id); }
  update(id, updates) { this.db.updateExperiment(id, updates); }
}

class InterventionService {
  constructor(db, modules) { this.db = db; this.modules = modules; }
  
  query(filters = {}, options = {}) { return this.db.queryInterventions(filters, options); }
  record(intervention) {
    if (!intervention.type || !intervention.description) throw new Error('Missing type or description');
    return this.db.recordIntervention({ ...intervention, timestamp: new Date().toISOString() });
  }
  update(id, updates) { this.db.updateIntervention(id, updates); }
}

class KnowledgeService {
  constructor(db, modules) { this.db = db; this.modules = modules; }
  
  getSummary() {
    return {
      stats: this.db.getStats(),
      latestMetrics: this.db.getLatestMetrics(),
      trendingPatterns: this.db.getTrendingPatterns(5),
      timestamp: new Date().toISOString(),
    };
  }
  
  search(query, options = {}) {
    const limit = options.limit || 20;
    const q = query.toLowerCase();
    const patterns = this.db.queryPatterns({}, { limit: 100 }).filter(p => 
      p.pattern?.toLowerCase().includes(q) || p.phiType?.toLowerCase().includes(q)
    ).slice(0, limit);
    const decisions = this.db.queryDecisions({}, { limit: 100 }).filter(d =>
      d.description?.toLowerCase().includes(q) || d.type?.toLowerCase().includes(q)
    ).slice(0, limit);
    return { patterns, decisions };
  }
}

class AuditService {
  constructor(db, modules) { this.db = db; this.modules = modules; }
  
  verify(id) {
    if (this.modules.merkleLog) return this.modules.merkleLog.verify(id);
    return { verified: false, error: 'Audit module not available' };
  }
  getHead() { return this.modules.merkleLog?.getHead() || null; }
  record(entry) { return this.modules.merkleLog?.append(entry) || null; }
}

module.exports = {
  initializeServices, getServices,
  PatternService, MetricsService, DecisionService, TestService,
  ExperimentService, InterventionService, KnowledgeService, AuditService,
};
