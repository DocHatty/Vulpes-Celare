/**
 * RESULT PROCESSOR - Core Business Logic for Test Results
 * Single source of truth for all result processing
 */

const PHI_TYPE_FILE_MAP = {
  NAME: { path: "src/redaction/filters/NameFilter.ts", lineHint: null, description: "Name detection filter" },
  SSN: { path: "src/redaction/filters/SSNFilter.ts", lineHint: null, description: "SSN filter" },
  DOB: { path: "src/redaction/filters/DateFilter.ts", lineHint: null, description: "DOB filter" },
  DATE: { path: "src/redaction/filters/DateFilter.ts", lineHint: null, description: "Date filter" },
  PHONE: { path: "src/redaction/filters/PhoneFilter.ts", lineHint: null, description: "Phone filter" },
  EMAIL: { path: "src/redaction/filters/EmailFilter.ts", lineHint: null, description: "Email filter" },
  ADDRESS: { path: "src/redaction/filters/AddressFilter.ts", lineHint: null, description: "Address filter" },
  MRN: { path: "src/redaction/filters/MRNFilter.ts", lineHint: null, description: "MRN filter" },
  MEDICATION: { path: "src/redaction/dictionaries/medications.json", lineHint: null, description: "Medications" },
  DIAGNOSIS: { path: "src/redaction/dictionaries/diagnoses.json", lineHint: null, description: "Diagnoses" },
};

class ResultProcessor {
  constructor(modules = {}) { this.modules = modules; }
  setModules(modules) { this.modules = modules; }

  round(num, decimals) {
    if (typeof num !== "number" || isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  groupFailuresByType(failures) {
    const groups = {};
    for (const failure of failures || []) {
      const type = failure.phiType || failure.type || "UNKNOWN";
      if (!groups[type]) groups[type] = [];
      groups[type].push(failure);
    }
    return groups;
  }

  sortFailuresByCount(failuresByType) {
    return Object.entries(failuresByType)
      .map(([type, items]) => ({ type, count: items.length, items }))
      .sort((a, b) => b.count - a.count);
  }

  getTopFailure(sortedFailures) { return sortedFailures[0] || null; }

  getFileForPhiType(phiType, modules = this.modules) {
    const upperType = phiType?.toUpperCase() || "";
    if (PHI_TYPE_FILE_MAP[upperType]) return PHI_TYPE_FILE_MAP[upperType];
    if (modules?.codebaseAnalyzer) {
      const state = modules.codebaseAnalyzer.exportForLLM();
      const filter = state.filterCapabilities?.find(
        (f) => f.phiTypes?.includes(upperType) || f.name?.toUpperCase().includes(upperType)
      );
      if (filter) {
        return { path: filter.file || `src/redaction/filters/${filter.name}.ts`, lineHint: null, description: `Filter for ${upperType}` };
      }
    }
    return { path: "src/redaction/filters/", lineHint: null, description: `Look for filter handling ${phiType}` };
  }

  buildActionRecommendation(topFailure, fileToEdit, historyContext, metrics) {
    if (!topFailure) {
      if (metrics?.sensitivity >= 99) return "Excellent! Sensitivity at 99%+. Focus on false positives.";
      return "No specific failures. Review test output.";
    }
    const parts = [`Fix ${topFailure.type} detection (${topFailure.count} missed).`];
    if (fileToEdit?.path) parts.push(`Edit: ${fileToEdit.path}`);
    if (topFailure.items?.length > 0) {
      const ex = topFailure.items.slice(0, 3).map((f) => `"${f.value}"`).join(", ");
      parts.push(`Examples: ${ex}`);
    }
    if (historyContext?.suggestedApproach) parts.push(`Suggested: ${historyContext.suggestedApproach}`);
    else if (historyContext?.relatedSuccesses?.length > 0) parts.push(`Note: Similar fixes succeeded ${historyContext.relatedSuccesses.length} times.`);
    if (historyContext?.warnings?.length > 0) parts.push(`Warning: ${historyContext.warnings[0].message}`);
    return parts.join(" ");
  }

  formatMetrics(metrics, gradeInfo) {
    return {
      sensitivity: this.round(metrics.sensitivity, 2),
      specificity: this.round(metrics.specificity, 2),
      precision: this.round(metrics.precision, 2),
      f1Score: this.round(metrics.f1Score, 2),
      f2Score: this.round(metrics.f2Score, 2),
      mcc: this.round(metrics.mcc, 3),
      grade: gradeInfo?.grade || metrics.grade || "?",
      score: this.round(gradeInfo?.score || metrics.finalScore || 0, 1),
    };
  }

  formatConfusionMatrix(metrics, testResults = {}) {
    return {
      truePositives: metrics.confusionMatrix?.truePositives ?? testResults.confusionMatrix?.tp ?? 0,
      trueNegatives: metrics.confusionMatrix?.trueNegatives ?? testResults.confusionMatrix?.tn ?? 0,
      falsePositives: metrics.confusionMatrix?.falsePositives ?? testResults.confusionMatrix?.fp ?? 0,
      falseNegatives: metrics.confusionMatrix?.falseNegatives ?? testResults.confusionMatrix?.fn ?? 0,
      totalPHI: metrics.confusionMatrix?.totalPHI ?? 0,
      totalNonPHI: metrics.confusionMatrix?.totalNonPHI ?? 0,
      integrityPassed: metrics.integrityCheck?.passed ?? true,
    };
  }

  formatTopFailure(topFailure, fileToEdit, historyContext) {
    if (!topFailure) return null;
    return {
      type: topFailure.type, count: topFailure.count,
      examples: topFailure.items.slice(0, 5).map((f) => ({ value: f.value, context: f.context?.substring(0, 100), errorLevel: f.errorLevel })),
      fileToEdit: fileToEdit?.path || null, lineHint: fileToEdit?.lineHint || null,
      historicalContext: historyContext ? {
        summary: historyContext.summary, previousSuccesses: historyContext.relatedSuccesses?.length || 0,
        previousFailures: historyContext.relatedFailures?.length || 0,
        warnings: historyContext.warnings?.map((w) => w.message) || [],
        suggestedApproach: historyContext.suggestedApproach || null,
      } : null,
    };
  }

  async generateInsights(modules = this.modules) {
    let insights = { critical: [], high: [], opportunities: [] };
    if (modules?.insightGenerator) {
      modules.insightGenerator.generateInsights();
      const all = modules.insightGenerator.getActiveInsights();
      insights = {
        critical: all.filter((i) => i.priority === "CRITICAL").slice(0, 3),
        high: all.filter((i) => i.priority === "HIGH").slice(0, 3),
        opportunities: all.filter((i) => i.type === "OPPORTUNITY").slice(0, 3),
      };
    }
    return insights;
  }

  formatInsights(insights) {
    return {
      critical: (insights.critical || []).map((i) => i.title || i.content),
      high: (insights.high || []).map((i) => i.title || i.content),
      opportunities: (insights.opportunities || []).map((i) => i.title || i.content),
    };
  }

  async processTestResults(testResults, options = {}, modules = this.modules) {
    const { focusPhiType = null, testId = null } = options;
    if (!testResults || !testResults.metrics) {
      return { success: false, error: "Invalid test results", action: "Check test execution" };
    }
    const metrics = testResults.metrics;
    const gradeInfo = { grade: metrics.grade || testResults.grade || "?", score: metrics.finalScore || 0 };
    
    if (modules?.patternRecognizer) {
      modules.patternRecognizer.analyzeTestResult({ falseNegatives: testResults.failures, falsePositives: testResults.overRedactions });
    }
    
    const failuresByType = this.groupFailuresByType(testResults.failures);
    const sortedFailures = this.sortFailuresByCount(failuresByType);
    const topFailure = this.getTopFailure(sortedFailures);
    
    let historyContext = null, fileToEdit = null;
    if (topFailure && modules?.historyConsultant) {
      historyContext = await modules.historyConsultant.consult("HOW_TO_FIX", { phiType: topFailure.type, issueType: "FALSE_NEGATIVE" });
    }
    if (topFailure) fileToEdit = this.getFileForPhiType(topFailure.type, modules);
    
    const insights = await this.generateInsights(modules);
    
    if (modules?.temporalIndex) {
      modules.temporalIndex.recordMetrics({ ...metrics, timestamp: new Date().toISOString(), documentCount: testResults.testInfo?.documentCount || 200, profile: testResults.testInfo?.profile || "HIPAA_STRICT" });
    }
    
    const action = this.buildActionRecommendation(topFailure, fileToEdit, historyContext, metrics);
    
    const response = {
      success: true, timestamp: new Date().toISOString(),
      ...(testId && { testId }),
      metrics: this.formatMetrics(metrics, gradeInfo),
      confusionMatrix: this.formatConfusionMatrix(metrics, testResults),
      topFailure: this.formatTopFailure(topFailure, fileToEdit, historyContext),
      action,
      allFailures: sortedFailures.map((f) => ({ type: f.type, count: f.count })),
      insights: this.formatInsights(insights),
      testInfo: { documentCount: testResults.testInfo?.documentCount || 0, profile: testResults.testInfo?.profile || "HIPAA_STRICT", totalPhi: testResults.totalPhi || 0, totalNonPhi: testResults.totalNonPhi || 0 },
      testValidation: testResults.testValidation || null,
    };
    
    if (focusPhiType) {
      const focused = sortedFailures.find((f) => f.type.toUpperCase() === focusPhiType.toUpperCase());
      if (focused) {
        response.focusedAnalysis = {
          type: focused.type, count: focused.count,
          examples: focused.items.slice(0, 10).map((f) => ({ value: f.value, context: f.context, errorLevel: f.errorLevel })),
          fileToEdit: this.getFileForPhiType(focused.type, modules),
        };
      }
    }
    return response;
  }
}

module.exports = { ResultProcessor };
module.exports.defaultProcessor = new ResultProcessor();
