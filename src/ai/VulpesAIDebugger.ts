/**
 * Vulpes Celare - AI Debugging Agent
 *
 * Intelligent debugging and analysis for PHI detection failures.
 * Provides root cause analysis, fix suggestions, and pattern recommendations.
 */

import { container, ServiceIds } from "../core/ServiceContainer";

// ============================================================================
// Types
// ============================================================================

export type FailureType =
  | "false_negative"      // PHI not detected when it should have been
  | "false_positive"      // Non-PHI detected as PHI
  | "wrong_type"          // PHI detected but wrong type
  | "wrong_boundaries"    // PHI detected but wrong start/end
  | "low_confidence"      // PHI detected but confidence too low
  | "filter_conflict"     // Multiple filters conflicting
  | "post_filter_removal" // Removed by post-processing
  | "unknown";

export type RootCauseCategory =
  | "pattern_gap"         // Regex doesn't cover this format
  | "dictionary_missing"  // Word not in dictionary
  | "context_sensitivity" // Context not recognized
  | "ocr_corruption"      // OCR errors affecting detection
  | "filter_priority"     // Wrong filter took precedence
  | "threshold_too_high"  // Confidence threshold rejected valid match
  | "threshold_too_low"   // Confidence threshold accepted invalid match
  | "normalization_issue" // Text normalization problem
  | "unicode_issue"       // Unicode handling problem
  | "architectural"       // Deeper pipeline issue
  | "unknown";

export interface TestFailure {
  id: string;
  text: string;
  expectedPHI?: string;
  expectedType?: string;
  actualPHI?: string;
  actualType?: string;
  expectedStart?: number;
  expectedEnd?: number;
  actualStart?: number;
  actualEnd?: number;
  confidence?: number;
  errorLevel?: "none" | "low" | "medium" | "high" | "extreme";
  filter?: string;
  stage?: string;
}

export interface RootCause {
  category: RootCauseCategory;
  description: string;
  confidence: number; // 0-1
  evidence: string[];
  affectedFilters: string[];
  relatedFailures: string[]; // IDs of similar failures
}

export interface FixSuggestion {
  type: "pattern" | "dictionary" | "threshold" | "config" | "code";
  priority: "critical" | "high" | "medium" | "low";
  description: string;
  implementation: string;
  filePath?: string;
  lineNumber?: number;
  estimatedImpact: string;
  riskLevel: "none" | "low" | "medium" | "high";
  testCommand?: string;
}

export interface PatternSuggestion {
  pattern: string;
  description: string;
  matchesProvided: number;
  falsePositiveRisk: "low" | "medium" | "high";
  examples: { input: string; matches: string[] }[];
}

export interface Analysis {
  summary: string;
  totalFailures: number;
  byType: Record<FailureType, number>;
  byCategory: Record<RootCauseCategory, number>;
  rootCauses: RootCause[];
  suggestions: FixSuggestion[];
  patterns: PatternSuggestion[];
  systemicIssues: string[];
  recommendations: string[];
}

export interface DebugSession {
  id: string;
  startedAt: string;
  failures: TestFailure[];
  analysis?: Analysis;
  status: "collecting" | "analyzing" | "complete" | "error";
  error?: string;
}

// ============================================================================
// Pattern Analysis Helpers
// ============================================================================

// PHI_TYPE_PATTERNS - Reserved for future pattern analysis functionality
// See: analyzePatternGaps() for current pattern gap detection

// ============================================================================
// VulpesAIDebugger Class
// ============================================================================

export class VulpesAIDebugger {
  private static instance: VulpesAIDebugger | null = null;
  private sessions: Map<string, DebugSession> = new Map();
  private currentSession: DebugSession | null = null;

  private constructor() {}

  static getInstance(): VulpesAIDebugger {
    // Check DI container first (enables testing/replacement)
    const fromContainer = container.tryResolve<VulpesAIDebugger>(ServiceIds.VulpesAIDebugger);
    if (fromContainer) {
      return fromContainer;
    }
    // Fall back to static instance
    if (!VulpesAIDebugger.instance) {
      VulpesAIDebugger.instance = new VulpesAIDebugger();
      container.registerInstance(ServiceIds.VulpesAIDebugger, VulpesAIDebugger.instance);
    }
    return VulpesAIDebugger.instance;
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  startSession(): DebugSession {
    const session: DebugSession = {
      id: this.generateSessionId(),
      startedAt: new Date().toISOString(),
      failures: [],
      status: "collecting",
    };

    this.sessions.set(session.id, session);
    this.currentSession = session;

    return session;
  }

  addFailure(failure: TestFailure): void {
    if (!this.currentSession) {
      this.startSession();
    }
    this.currentSession!.failures.push(failure);
  }

  addFailures(failures: TestFailure[]): void {
    for (const failure of failures) {
      this.addFailure(failure);
    }
  }

  getCurrentSession(): DebugSession | null {
    return this.currentSession;
  }

  getSession(id: string): DebugSession | undefined {
    return this.sessions.get(id);
  }

  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `debug-${timestamp}-${random}`;
  }

  // ============================================================================
  // Analysis
  // ============================================================================

  async analyzeFailures(failures?: TestFailure[]): Promise<Analysis> {
    const toAnalyze = failures ?? this.currentSession?.failures ?? [];

    if (toAnalyze.length === 0) {
      return this.createEmptyAnalysis();
    }

    if (this.currentSession) {
      this.currentSession.status = "analyzing";
    }

    try {
      // Classify failures by type
      const classifiedFailures = toAnalyze.map((f) => ({
        ...f,
        failureType: this.classifyFailure(f),
      }));

      // Count by type
      const byType: Record<FailureType, number> = {
        false_negative: 0,
        false_positive: 0,
        wrong_type: 0,
        wrong_boundaries: 0,
        low_confidence: 0,
        filter_conflict: 0,
        post_filter_removal: 0,
        unknown: 0,
      };

      for (const f of classifiedFailures) {
        byType[f.failureType]++;
      }

      // Find root causes
      const rootCauses = await this.findRootCauses(classifiedFailures);

      // Count by category
      const byCategory: Record<RootCauseCategory, number> = {
        pattern_gap: 0,
        dictionary_missing: 0,
        context_sensitivity: 0,
        ocr_corruption: 0,
        filter_priority: 0,
        threshold_too_high: 0,
        threshold_too_low: 0,
        normalization_issue: 0,
        unicode_issue: 0,
        architectural: 0,
        unknown: 0,
      };

      for (const rc of rootCauses) {
        byCategory[rc.category]++;
      }

      // Generate fix suggestions
      const suggestions = this.generateFixSuggestions(rootCauses, classifiedFailures);

      // Generate pattern suggestions
      const patterns = this.suggestPatterns(classifiedFailures);

      // Identify systemic issues
      const systemicIssues = this.identifySystemicIssues(classifiedFailures, rootCauses);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        rootCauses,
        suggestions,
        systemicIssues
      );

      const analysis: Analysis = {
        summary: this.generateSummary(toAnalyze.length, byType, rootCauses),
        totalFailures: toAnalyze.length,
        byType,
        byCategory,
        rootCauses,
        suggestions,
        patterns,
        systemicIssues,
        recommendations,
      };

      if (this.currentSession) {
        this.currentSession.analysis = analysis;
        this.currentSession.status = "complete";
      }

      return analysis;
    } catch (error) {
      if (this.currentSession) {
        this.currentSession.status = "error";
        this.currentSession.error =
          error instanceof Error ? error.message : String(error);
      }
      throw error;
    }
  }

  private createEmptyAnalysis(): Analysis {
    return {
      summary: "No failures to analyze.",
      totalFailures: 0,
      byType: {
        false_negative: 0,
        false_positive: 0,
        wrong_type: 0,
        wrong_boundaries: 0,
        low_confidence: 0,
        filter_conflict: 0,
        post_filter_removal: 0,
        unknown: 0,
      },
      byCategory: {
        pattern_gap: 0,
        dictionary_missing: 0,
        context_sensitivity: 0,
        ocr_corruption: 0,
        filter_priority: 0,
        threshold_too_high: 0,
        threshold_too_low: 0,
        normalization_issue: 0,
        unicode_issue: 0,
        architectural: 0,
        unknown: 0,
      },
      rootCauses: [],
      suggestions: [],
      patterns: [],
      systemicIssues: [],
      recommendations: [],
    };
  }

  // ============================================================================
  // Failure Classification
  // ============================================================================

  private classifyFailure(failure: TestFailure): FailureType {
    // False negative: expected PHI but got nothing
    if (failure.expectedPHI && !failure.actualPHI) {
      return "false_negative";
    }

    // False positive: detected PHI but none expected
    if (!failure.expectedPHI && failure.actualPHI) {
      return "false_positive";
    }

    // Wrong type: both exist but types differ
    if (
      failure.expectedType &&
      failure.actualType &&
      failure.expectedType !== failure.actualType
    ) {
      return "wrong_type";
    }

    // Wrong boundaries: PHI detected but boundaries differ
    if (
      failure.expectedStart !== undefined &&
      failure.actualStart !== undefined &&
      (failure.expectedStart !== failure.actualStart ||
        failure.expectedEnd !== failure.actualEnd)
    ) {
      return "wrong_boundaries";
    }

    // Low confidence
    if (failure.confidence !== undefined && failure.confidence < 0.5) {
      return "low_confidence";
    }

    // Post-filter removal (check stage)
    if (failure.stage?.includes("post-filter")) {
      return "post_filter_removal";
    }

    return "unknown";
  }

  // ============================================================================
  // Root Cause Analysis
  // ============================================================================

  private async findRootCauses(
    failures: (TestFailure & { failureType: FailureType })[]
  ): Promise<RootCause[]> {
    const rootCauses: RootCause[] = [];

    // Group failures by type for pattern analysis
    const falseNegatives = failures.filter((f) => f.failureType === "false_negative");
    // Note: false positives analysis is handled separately in analyzeThresholdIssues

    // Analyze false negatives for pattern gaps
    if (falseNegatives.length > 0) {
      const patternGaps = this.analyzePatternGaps(falseNegatives);
      rootCauses.push(...patternGaps);
    }

    // Analyze for OCR corruption
    const ocrIssues = this.analyzeOCRCorruption(failures);
    if (ocrIssues) {
      rootCauses.push(ocrIssues);
    }

    // Analyze threshold issues
    const thresholdIssues = this.analyzeThresholdIssues(failures);
    rootCauses.push(...thresholdIssues);

    // Analyze context sensitivity
    const contextIssues = this.analyzeContextSensitivity(failures);
    if (contextIssues) {
      rootCauses.push(contextIssues);
    }

    // Check for unicode issues
    const unicodeIssues = this.analyzeUnicodeIssues(failures);
    if (unicodeIssues) {
      rootCauses.push(unicodeIssues);
    }

    // Sort by confidence
    rootCauses.sort((a, b) => b.confidence - a.confidence);

    return rootCauses;
  }

  private analyzePatternGaps(
    failures: TestFailure[]
  ): RootCause[] {
    const rootCauses: RootCause[] = [];
    const typeGroups: Map<string, TestFailure[]> = new Map();

    // Group by expected type
    for (const failure of failures) {
      const type = failure.expectedType ?? "unknown";
      const group = typeGroups.get(type) ?? [];
      group.push(failure);
      typeGroups.set(type, group);
    }

    for (const [type, group] of typeGroups) {
      if (group.length >= 2) {
        // Multiple failures of same type suggest pattern gap
        const evidence = group.slice(0, 5).map((f) => `"${f.expectedPHI}" in "${f.text.substring(0, 50)}..."`);

        rootCauses.push({
          category: "pattern_gap",
          description: `${group.length} ${type} instances not detected - possible pattern gap`,
          confidence: Math.min(0.5 + group.length * 0.1, 0.95),
          evidence,
          affectedFilters: [type.toLowerCase() + "Filter"],
          relatedFailures: group.map((f) => f.id),
        });
      }
    }

    return rootCauses;
  }

  private analyzeOCRCorruption(failures: TestFailure[]): RootCause | null {
    const ocrFailures = failures.filter(
      (f) => f.errorLevel && f.errorLevel !== "none"
    );

    if (ocrFailures.length === 0) return null;

    const highErrorCount = ocrFailures.filter(
      (f) => f.errorLevel === "high" || f.errorLevel === "extreme"
    ).length;

    if (highErrorCount < 3) return null;

    return {
      category: "ocr_corruption",
      description: `${highErrorCount} failures with high/extreme OCR error levels`,
      confidence: 0.8,
      evidence: [
        `${highErrorCount} failures at high/extreme error level`,
        "OCR corruption can cause character substitutions and layout issues",
        "Consider using OCR_TOLERANT grading profile for these documents",
      ],
      affectedFilters: [],
      relatedFailures: ocrFailures.map((f) => f.id),
    };
  }

  private analyzeThresholdIssues(failures: TestFailure[]): RootCause[] {
    const rootCauses: RootCause[] = [];

    // Low confidence detections that should have passed
    const lowConfidence = failures.filter(
      (f) => f.confidence !== undefined && f.confidence > 0.3 && f.confidence < 0.5
    );

    if (lowConfidence.length >= 2) {
      rootCauses.push({
        category: "threshold_too_high",
        description: `${lowConfidence.length} detections rejected due to confidence threshold`,
        confidence: 0.7,
        evidence: lowConfidence
          .slice(0, 3)
          .map((f) => `Confidence ${(f.confidence! * 100).toFixed(1)}% for "${f.expectedPHI}"`),
        affectedFilters: [...new Set(lowConfidence.map((f) => f.filter).filter(Boolean) as string[])],
        relatedFailures: lowConfidence.map((f) => f.id),
      });
    }

    return rootCauses;
  }

  private analyzeContextSensitivity(failures: TestFailure[]): RootCause | null {
    // Look for patterns where context might help
    const contextSensitive = failures.filter((f) => {
      if (!f.text || !f.expectedPHI) return false;

      // Check if the PHI appears in ambiguous context
      const context = f.text.toLowerCase();
      return (
        context.includes("patient") ||
        context.includes("medical") ||
        context.includes("diagnosis") ||
        context.includes("treatment")
      );
    });

    if (contextSensitive.length < 2) return null;

    return {
      category: "context_sensitivity",
      description: `${contextSensitive.length} failures in medical context that should boost confidence`,
      confidence: 0.6,
      evidence: [
        "PHI appears in medical context but wasn't detected",
        "Context clues (patient, medical, diagnosis) not being leveraged",
      ],
      affectedFilters: ["ContextualBooster"],
      relatedFailures: contextSensitive.map((f) => f.id),
    };
  }

  private analyzeUnicodeIssues(failures: TestFailure[]): RootCause | null {
    const unicodeFailures = failures.filter((f) => {
      if (!f.text) return false;
      // Check for non-ASCII characters
      return /[^\x00-\x7F]/.test(f.text);
    });

    if (unicodeFailures.length < 2) return null;

    return {
      category: "unicode_issue",
      description: `${unicodeFailures.length} failures involving non-ASCII characters`,
      confidence: 0.65,
      evidence: [
        "Text contains non-ASCII characters",
        "Unicode normalization may be needed",
        "Character encoding issues possible",
      ],
      affectedFilters: [],
      relatedFailures: unicodeFailures.map((f) => f.id),
    };
  }

  // ============================================================================
  // Fix Suggestions
  // ============================================================================

  private generateFixSuggestions(
    rootCauses: RootCause[],
    _failures: TestFailure[]
  ): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    for (const cause of rootCauses) {
      switch (cause.category) {
        case "pattern_gap":
          suggestions.push({
            type: "pattern",
            priority: "high",
            description: `Add patterns to cover ${cause.description}`,
            implementation: `Review the ${cause.affectedFilters.join(", ")} filter(s) and add patterns for the missing formats.`,
            estimatedImpact: `Could fix ${cause.relatedFailures.length} failures`,
            riskLevel: "low",
            testCommand: "npm test -- --filter=" + cause.affectedFilters[0],
          });
          break;

        case "threshold_too_high":
          suggestions.push({
            type: "threshold",
            priority: "medium",
            description: "Consider lowering confidence threshold",
            implementation:
              "Adjust the confidence threshold from 0.5 to 0.4 for affected filters, or implement contextual boosting.",
            filePath: "src/core/PostFilterService.ts",
            estimatedImpact: `Could recover ${cause.relatedFailures.length} near-threshold detections`,
            riskLevel: "medium",
          });
          break;

        case "ocr_corruption":
          suggestions.push({
            type: "config",
            priority: "low",
            description: "Use OCR-tolerant grading for heavily corrupted documents",
            implementation:
              "For documents with >5% OCR error rate, use VULPES_GRADE_PROFILE=OCR_TOLERANT or add fuzzy matching to patterns.",
            estimatedImpact: `Informational - ${cause.relatedFailures.length} failures are from extreme corruption`,
            riskLevel: "none",
          });
          break;

        case "context_sensitivity":
          suggestions.push({
            type: "code",
            priority: "medium",
            description: "Enhance contextual confidence boosting",
            implementation:
              "Add medical context detection to boost confidence when text contains healthcare keywords.",
            filePath: "src/filters/ContextualBooster.ts",
            estimatedImpact: `Could improve confidence for ${cause.relatedFailures.length} contextual matches`,
            riskLevel: "low",
          });
          break;

        case "unicode_issue":
          suggestions.push({
            type: "code",
            priority: "medium",
            description: "Add Unicode normalization preprocessing",
            implementation:
              "Normalize Unicode text (NFC/NFKC) before pattern matching to handle variant characters.",
            filePath: "src/core/TextNormalizer.ts",
            estimatedImpact: `Could fix ${cause.relatedFailures.length} Unicode-related failures`,
            riskLevel: "low",
          });
          break;
      }
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return suggestions;
  }

  // ============================================================================
  // Pattern Suggestions
  // ============================================================================

  suggestPatterns(failures: TestFailure[]): PatternSuggestion[] {
    const suggestions: PatternSuggestion[] = [];
    const typeGroups: Map<string, string[]> = new Map();

    // Group expected PHI by type
    for (const failure of failures) {
      if (!failure.expectedPHI || !failure.expectedType) continue;

      const type = failure.expectedType;
      const examples = typeGroups.get(type) ?? [];
      examples.push(failure.expectedPHI);
      typeGroups.set(type, examples);
    }

    // Generate pattern suggestions for each type
    for (const [_type, examples] of typeGroups) {
      if (examples.length < 2) continue;

      const pattern = this.inferPattern(examples);
      if (pattern) {
        suggestions.push({
          pattern: pattern.regex,
          description: pattern.description,
          matchesProvided: pattern.matchCount,
          falsePositiveRisk: pattern.fpRisk,
          examples: examples.slice(0, 3).map((ex) => ({
            input: ex,
            matches: [ex],
          })),
        });
      }
    }

    return suggestions;
  }

  private inferPattern(
    examples: string[]
  ): { regex: string; description: string; matchCount: number; fpRisk: "low" | "medium" | "high" } | null {
    if (examples.length < 2) return null;

    // Analyze character patterns
    const lengths = examples.map((e) => e.length);
    const hasDigits = examples.every((e) => /\d/.test(e));
    const hasLetters = examples.every((e) => /[a-zA-Z]/.test(e));
    const hasDashes = examples.every((e) => /-/.test(e));
    const hasSpaces = examples.every((e) => /\s/.test(e));

    // Try to build a pattern
    let regex = "";
    let description = "";
    let fpRisk: "low" | "medium" | "high" = "medium";

    if (hasDigits && !hasLetters && hasDashes) {
      // Likely an ID format like SSN, phone
      const parts = examples[0].split("-");
      regex = "\\b" + parts.map((p) => `\\d{${p.length}}`).join("-") + "\\b";
      description = `Numeric ID with ${parts.length} dash-separated parts`;
      fpRisk = "low";
    } else if (hasDigits && hasLetters) {
      // Alphanumeric ID
      regex = `\\b[A-Za-z0-9]{${Math.min(...lengths)},${Math.max(...lengths)}}\\b`;
      description = "Alphanumeric identifier";
      fpRisk = "high";
    } else if (hasLetters && hasSpaces) {
      // Name-like pattern
      regex = "\\b[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)+\\b";
      description = "Multi-word capitalized text (name-like)";
      fpRisk = "high";
    }

    if (!regex) return null;

    // Test pattern against examples
    const testRegex = new RegExp(regex);
    const matchCount = examples.filter((e) => testRegex.test(e)).length;

    return { regex, description, matchCount, fpRisk };
  }

  // ============================================================================
  // Systemic Issue Detection
  // ============================================================================

  private identifySystemicIssues(
    failures: TestFailure[],
    rootCauses: RootCause[]
  ): string[] {
    const issues: string[] = [];

    // Check for filter-specific clusters
    const filterCounts: Map<string, number> = new Map();
    for (const failure of failures) {
      if (failure.filter) {
        filterCounts.set(
          failure.filter,
          (filterCounts.get(failure.filter) ?? 0) + 1
        );
      }
    }

    for (const [filter, count] of filterCounts) {
      if (count > failures.length * 0.3) {
        issues.push(
          `${filter} accounts for ${count} failures (${((count / failures.length) * 100).toFixed(0)}%) - may need review`
        );
      }
    }

    // Check for error level distribution
    const errorLevelCounts: Map<string, number> = new Map();
    for (const failure of failures) {
      if (failure.errorLevel) {
        errorLevelCounts.set(
          failure.errorLevel,
          (errorLevelCounts.get(failure.errorLevel) ?? 0) + 1
        );
      }
    }

    const extremeCount = errorLevelCounts.get("extreme") ?? 0;
    const highCount = errorLevelCounts.get("high") ?? 0;
    if (extremeCount + highCount > failures.length * 0.5) {
      issues.push(
        `${extremeCount + highCount} failures (${(((extremeCount + highCount) / failures.length) * 100).toFixed(0)}%) are from high/extreme OCR errors - these are stress tests, not realistic data`
      );
    }

    // Check for architectural patterns
    const architecturalCauses = rootCauses.filter(
      (rc) => rc.category === "architectural"
    );
    if (architecturalCauses.length > 0) {
      issues.push(
        "Architectural issues detected - pipeline redesign may be needed"
      );
    }

    return issues;
  }

  // ============================================================================
  // Recommendations
  // ============================================================================

  private generateRecommendations(
    rootCauses: RootCause[],
    suggestions: FixSuggestion[],
    systemicIssues: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Priority-based recommendations
    const criticalSuggestions = suggestions.filter((s) => s.priority === "critical");
    const highSuggestions = suggestions.filter((s) => s.priority === "high");

    if (criticalSuggestions.length > 0) {
      recommendations.push(
        `🚨 Address ${criticalSuggestions.length} CRITICAL fix(es) immediately`
      );
    }

    if (highSuggestions.length > 0) {
      recommendations.push(
        `⚠️ Review ${highSuggestions.length} HIGH priority fix(es) before deployment`
      );
    }

    // Pattern-specific recommendations
    const patternGaps = rootCauses.filter((rc) => rc.category === "pattern_gap");
    if (patternGaps.length > 0) {
      recommendations.push(
        "📝 Add missing patterns for undetected PHI formats"
      );
    }

    // Threshold recommendations
    const thresholdIssues = rootCauses.filter(
      (rc) =>
        rc.category === "threshold_too_high" || rc.category === "threshold_too_low"
    );
    if (thresholdIssues.length > 0) {
      recommendations.push(
        "⚙️ Review and tune confidence thresholds based on your use case"
      );
    }

    // Systemic recommendations
    if (systemicIssues.length > 0) {
      recommendations.push(
        "🔍 Investigate systemic issues for potential architectural improvements"
      );
    }

    // Testing recommendations
    recommendations.push(
      "✅ Re-run tests after each fix to verify improvements"
    );
    recommendations.push(
      "📊 Focus on Tier 1-3 failures (realistic data) rather than Tier 4 (stress tests)"
    );

    return recommendations;
  }

  // ============================================================================
  // Summary Generation
  // ============================================================================

  private generateSummary(
    totalFailures: number,
    byType: Record<FailureType, number>,
    rootCauses: RootCause[]
  ): string {
    const lines: string[] = [];

    lines.push(`Analyzed ${totalFailures} test failure(s).`);

    // Most common failure type
    const topType = Object.entries(byType)
      .filter(([_, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)[0];

    if (topType) {
      lines.push(
        `Most common: ${topType[0].replace(/_/g, " ")} (${topType[1]} failures)`
      );
    }

    // Top root cause
    if (rootCauses.length > 0) {
      const topCause = rootCauses[0];
      lines.push(
        `Primary root cause: ${topCause.category.replace(/_/g, " ")} (${(topCause.confidence * 100).toFixed(0)}% confidence)`
      );
    }

    return lines.join(" ");
  }

  // ============================================================================
  // Output Formatting
  // ============================================================================

  formatAnalysis(analysis: Analysis, useColor = true): string {
    const lines: string[] = [];
    const c = useColor ? this.getColors() : this.getNoColors();

    lines.push("");
    lines.push(c.heading("═══════════════════════════════════════════════════════════════════════"));
    lines.push(c.heading("                      VULPES AI DEBUGGER ANALYSIS                       "));
    lines.push(c.heading("═══════════════════════════════════════════════════════════════════════"));
    lines.push("");

    // Summary
    lines.push(c.section("📊 SUMMARY"));
    lines.push(`   ${analysis.summary}`);
    lines.push("");

    // Failure breakdown
    lines.push(c.section("📈 FAILURE BREAKDOWN"));
    for (const [type, count] of Object.entries(analysis.byType)) {
      if (count > 0) {
        const bar = "█".repeat(Math.min(count, 20));
        lines.push(`   ${type.padEnd(20)} ${c.count(count.toString().padStart(4))} ${c.bar(bar)}`);
      }
    }
    lines.push("");

    // Root causes
    if (analysis.rootCauses.length > 0) {
      lines.push(c.section("🔍 ROOT CAUSES"));
      for (const cause of analysis.rootCauses.slice(0, 5)) {
        const confidence = `${(cause.confidence * 100).toFixed(0)}%`;
        lines.push(`   ${c.label(cause.category.padEnd(22))} ${c.confidence(confidence.padStart(4))} - ${cause.description}`);
        for (const evidence of cause.evidence.slice(0, 2)) {
          lines.push(`      ${c.dim("→")} ${c.dim(evidence)}`);
        }
      }
      lines.push("");
    }

    // Suggestions
    if (analysis.suggestions.length > 0) {
      lines.push(c.section("💡 FIX SUGGESTIONS"));
      for (const suggestion of analysis.suggestions.slice(0, 5)) {
        const priority = this.getPriorityIcon(suggestion.priority);
        lines.push(`   ${priority} [${c.priority(suggestion.priority.toUpperCase())}] ${suggestion.description}`);
        lines.push(`      ${c.dim(suggestion.implementation)}`);
        if (suggestion.estimatedImpact) {
          lines.push(`      ${c.dim("Impact:")} ${suggestion.estimatedImpact}`);
        }
      }
      lines.push("");
    }

    // Systemic issues
    if (analysis.systemicIssues.length > 0) {
      lines.push(c.section("⚠️ SYSTEMIC ISSUES"));
      for (const issue of analysis.systemicIssues) {
        lines.push(`   • ${issue}`);
      }
      lines.push("");
    }

    // Recommendations
    if (analysis.recommendations.length > 0) {
      lines.push(c.section("📋 RECOMMENDATIONS"));
      for (const rec of analysis.recommendations) {
        lines.push(`   ${rec}`);
      }
      lines.push("");
    }

    lines.push(c.heading("═══════════════════════════════════════════════════════════════════════"));
    lines.push("");

    return lines.join("\n");
  }

  private getPriorityIcon(priority: string): string {
    switch (priority) {
      case "critical":
        return "🚨";
      case "high":
        return "🔴";
      case "medium":
        return "🟡";
      case "low":
        return "🟢";
      default:
        return "⚪";
    }
  }

  private getColors() {
    return {
      heading: (s: string) => `\x1b[1;35m${s}\x1b[0m`,
      section: (s: string) => `\x1b[1;36m${s}\x1b[0m`,
      label: (s: string) => `\x1b[33m${s}\x1b[0m`,
      count: (s: string) => `\x1b[1;37m${s}\x1b[0m`,
      bar: (s: string) => `\x1b[32m${s}\x1b[0m`,
      confidence: (s: string) => `\x1b[36m${s}\x1b[0m`,
      priority: (s: string) => `\x1b[1m${s}\x1b[0m`,
      dim: (s: string) => `\x1b[90m${s}\x1b[0m`,
    };
  }

  private getNoColors() {
    const id = (s: string) => s;
    return {
      heading: id,
      section: id,
      label: id,
      count: id,
      bar: id,
      confidence: id,
      priority: id,
      dim: id,
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const vulpesAIDebugger = VulpesAIDebugger.getInstance();
