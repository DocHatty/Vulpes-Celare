/**
 * PipelineAudit - System State & Analysis Context
 *
 * PURPOSE:
 * Provides factual system state and optional methodology guidance.
 * 
 * DESIGN PRINCIPLES:
 * 1. FACTUAL DATA - Raw observations, not interpretations
 * 2. NEUTRAL PRESENTATION - No embedded conclusions
 * 3. METHODOLOGY AS SUGGESTION - Framework to use, not rules to follow
 * 4. EMPOWER INVESTIGATION - Support deep analysis, don't constrain it
 *
 * The methodology section offers an analysis approach. It's a tool
 * available for use, not a requirement. The analyst may:
 * - Use it as-is
 * - Adapt it to the situation
 * - Ignore it entirely and use their own approach
 */

import { RustAccelConfig } from "../config/RustAccelConfig";
import { loadNativeBinding } from "../native/binding";
import * as fs from "fs";
import * as path from "path";

// =============================================================================
// TYPE DEFINITIONS - Pure data structures, no interpretation
// =============================================================================

/**
 * Information about a code path - factual only
 */
export interface CodePathInfo {
  name: string;
  implementation: "rust" | "typescript";
  file: string;
  acceleratorEnvVar?: string;
  isActive: boolean;
}

/**
 * System state snapshot - factual only
 */
export interface SystemState {
  timestamp: number;
  
  // Rust binding status
  rustBinding: {
    available: boolean;
    path: string | null;
  };
  
  // Active code paths
  codePaths: {
    overlapResolution: CodePathInfo;
    postFiltering: CodePathInfo;
    spanApplication: CodePathInfo;
    nameScanning: CodePathInfo;
  };
  
  // Environment configuration
  environment: {
    variables: Record<string, string | undefined>;
  };
  
  // File locations by category
  fileLocations: {
    filters: Record<string, string[]>;
    core: string[];
    dictionaries: string[];
  };
  
  // Pipeline stage documentation
  pipelineStages: string[];
}

/**
 * Raw failure record - no interpretation
 */
export interface FailureRecord {
  phiType: string;
  value: string;
  context: string;
  contextBefore: string;
  contextAfter: string;
}

/**
 * Pattern observation - factual description only
 */
export interface PatternObservation {
  pattern: string;
  count: number;
  examples: string[];
  // Factual description of what was observed, NOT interpretation
  observation: string;
}

/**
 * Context for a PHI type - raw data only
 */
export interface PHITypeContext {
  phiType: string;
  totalFailures: number;
  failures: FailureRecord[];
  patterns: PatternObservation[];
  relatedFiles: string[];
  relatedCodePaths: string[];
}

/**
 * Complete analysis context - structured data for reference
 */
export interface AnalysisContext {
  timestamp: number;
  systemState: SystemState;
  failureSummary: {
    total: number;
    byType: Record<string, number>;
  };
  phiContexts: PHITypeContext[];
}

// =============================================================================
// PIPELINE AUDIT - Gathers factual system state
// =============================================================================

export class PipelineAudit {
  private static cached: SystemState | null = null;

  /**
   * Gather current system state - factual only
   */
  static getSystemState(): SystemState {
    if (this.cached) return this.cached;
    
    const timestamp = Date.now();

    // Check Rust binding
    let rustAvailable = false;
    let rustPath: string | null = null;
    try {
      const binding = loadNativeBinding({ configureOrt: false });
      rustAvailable = binding !== null;
      if (binding) {
        const nativePath = path.join(process.cwd(), "native");
        if (fs.existsSync(nativePath)) {
          const files = fs.readdirSync(nativePath);
          const nodeFile = files.find(f => f.endsWith(".node"));
          if (nodeFile) {
            rustPath = path.join(nativePath, nodeFile);
          }
        }
      }
    } catch {
      rustAvailable = false;
    }

    // Determine active code paths
    const codePaths = {
      overlapResolution: this.getCodePath("overlapResolution", rustAvailable),
      postFiltering: this.getCodePath("postFiltering", rustAvailable),
      spanApplication: this.getCodePath("spanApplication", rustAvailable),
      nameScanning: this.getCodePath("nameScanning", rustAvailable),
    };

    // Environment variables
    const environment = {
      variables: {
        VULPES_RUST_ACCEL: process.env.VULPES_RUST_ACCEL,
        VULPES_SPAN_ACCEL: process.env.VULPES_SPAN_ACCEL,
        VULPES_INTERVAL_ACCEL: process.env.VULPES_INTERVAL_ACCEL,
        VULPES_POSTFILTER_ACCEL: process.env.VULPES_POSTFILTER_ACCEL,
        VULPES_NAME_ACCEL: process.env.VULPES_NAME_ACCEL,
        VULPES_WORKERS: process.env.VULPES_WORKERS,
        VULPES_TRACE: process.env.VULPES_TRACE,
      },
    };

    // File locations
    const fileLocations = {
      filters: {
        NAME: ["src/filters/name/NameFilterSpan.ts", "src/filters/name/SmartNameFilterSpan.ts"],
        DATE: ["src/filters/dates/DateFilterSpan.ts"],
        SSN: ["src/filters/ssn/SSNFilterSpan.ts"],
        PHONE: ["src/filters/phone/PhoneFilterSpan.ts"],
        EMAIL: ["src/filters/email/EmailFilterSpan.ts"],
        ADDRESS: ["src/filters/address/AddressFilterSpan.ts"],
        MRN: ["src/filters/mrn/MRNFilterSpan.ts"],
        AGE_90_PLUS: ["src/filters/age/AgeFilterSpan.ts"],
      },
      core: [
        "src/core/ParallelRedactionEngine.ts",
        "src/core/filters/PostFilterService.ts",
        "src/models/Span.ts",
        "src/models/IntervalTreeSpanIndex.ts",
      ],
      dictionaries: [
        "src/dictionaries/first-names.txt",
        "src/dictionaries/surnames.txt",
        "src/dictionaries/cities.txt",
        "src/dictionaries/hospitals.txt",
      ],
    };

    // Pipeline stages (factual description of flow)
    const pipelineStages = [
      "Filter execution",
      "Field context detection",
      "Whitelist filtering",
      "Confidence modification",
      "Overlap resolution",
      "Post-filtering",
      "Span application",
    ];

    this.cached = {
      timestamp,
      rustBinding: { available: rustAvailable, path: rustPath },
      codePaths,
      environment,
      fileLocations,
      pipelineStages,
    };

    return this.cached;
  }

  /**
   * Get cached state or refresh
   */
  static getAudit(): SystemState {
    return this.getSystemState();
  }

  /**
   * Alias for backward compatibility
   */
  static run(): SystemState {
    return this.getSystemState();
  }

  /**
   * Print system state to console - factual only
   */
  static printSummary(): void {
    const state = this.getSystemState();

    console.log("\n" + "=".repeat(80));
    console.log("SYSTEM STATE");
    console.log("=".repeat(80));

    console.log("\n[RUST BINDING]");
    console.log(`  Available: ${state.rustBinding.available ? "YES" : "NO"}`);
    if (state.rustBinding.path) {
      console.log(`  Path: ${state.rustBinding.path}`);
    }

    console.log("\n[ACTIVE CODE PATHS]");
    Object.entries(state.codePaths).forEach(([name, info]) => {
      console.log(`  ${name.padEnd(20)} ${info.implementation.toUpperCase().padEnd(12)} ${info.file}`);
    });

    console.log("\n[ENVIRONMENT]");
    Object.entries(state.environment.variables).forEach(([key, value]) => {
      if (value !== undefined) {
        console.log(`  ${key}=${value}`);
      }
    });

    console.log("\n[PIPELINE STAGES]");
    state.pipelineStages.forEach((stage, i) => {
      console.log(`  ${i + 1}. ${stage}`);
    });

    console.log("\n" + "=".repeat(80) + "\n");
  }

  private static getCodePath(name: string, rustAvailable: boolean): CodePathInfo {
    const paths: Record<string, { rust: CodePathInfo; ts: CodePathInfo; check: () => boolean }> = {
      overlapResolution: {
        rust: { name: "overlapResolution", implementation: "rust", file: "src/rust/src/span.rs", acceleratorEnvVar: "VULPES_SPAN_ACCEL", isActive: true },
        ts: { name: "overlapResolution", implementation: "typescript", file: "src/models/IntervalTreeSpanIndex.ts", isActive: true },
        check: () => RustAccelConfig.isSpanOpsEnabled(),
      },
      postFiltering: {
        rust: { name: "postFiltering", implementation: "rust", file: "src/rust/src/postfilter.rs", acceleratorEnvVar: "VULPES_POSTFILTER_ACCEL", isActive: true },
        ts: { name: "postFiltering", implementation: "typescript", file: "src/core/filters/PostFilterService.ts", isActive: true },
        check: () => RustAccelConfig.isPostFilterEnabled(),
      },
      spanApplication: {
        rust: { name: "spanApplication", implementation: "rust", file: "src/rust/src/apply.rs", acceleratorEnvVar: "VULPES_APPLY_SPANS_ACCEL", isActive: true },
        ts: { name: "spanApplication", implementation: "typescript", file: "src/models/Span.ts", isActive: true },
        check: () => RustAccelConfig.isApplySpansEnabled(),
      },
      nameScanning: {
        rust: { name: "nameScanning", implementation: "rust", file: "src/rust/src/name.rs", acceleratorEnvVar: "VULPES_NAME_ACCEL", isActive: true },
        ts: { name: "nameScanning", implementation: "typescript", file: "src/filters/name/*.ts", isActive: true },
        check: () => RustAccelConfig.getNameAccelMode() > 0,
      },
    };

    const config = paths[name];
    if (!config) return { name, implementation: "typescript", file: "unknown", isActive: false };

    if (rustAvailable && config.check()) {
      return config.rust;
    }
    return config.ts;
  }
}

// =============================================================================
// FAILURE ANALYSIS - Extracts patterns from raw data
// =============================================================================

/**
 * Analyze failures and produce structured context
 * 
 * This function:
 * - Extracts raw failure data
 * - Identifies factual patterns (not interpretations)
 * - Links to relevant files
 * 
 * It does NOT:
 * - Diagnose causes
 * - Suggest fixes
 * - Rank priorities
 */
export function buildAnalysisContext(
  failures: Array<{ type: string; expected: string; context?: string }>
): AnalysisContext {
  const systemState = PipelineAudit.getSystemState();
  
  // Group by type
  const byType: Record<string, Array<{ expected: string; context?: string }>> = {};
  for (const f of failures) {
    const type = f.type.toUpperCase();
    if (!byType[type]) byType[type] = [];
    byType[type].push({ expected: f.expected, context: f.context });
  }

  // Build contexts
  const phiContexts: PHITypeContext[] = [];
  
  for (const [phiType, typeFailures] of Object.entries(byType)) {
    // Extract raw failure records
    const failureRecords: FailureRecord[] = typeFailures.slice(0, 10).map(f => {
      const ctx = f.context || "";
      const idx = ctx.indexOf(f.expected);
      return {
        phiType,
        value: f.expected,
        context: ctx,
        contextBefore: idx > 0 ? ctx.substring(Math.max(0, idx - 60), idx) : "",
        contextAfter: idx >= 0 ? ctx.substring(idx + f.expected.length, idx + f.expected.length + 60) : "",
      };
    });

    // Observe patterns (factual only)
    const patterns = extractPatterns(typeFailures.map(f => f.expected));
    
    // Get related files
    const filterFiles = systemState.fileLocations.filters[phiType] || [];
    const relatedFiles = [
      ...filterFiles,
      systemState.codePaths.overlapResolution.file,
      systemState.codePaths.postFiltering.file,
    ];

    // Get related code paths
    const relatedCodePaths = [
      systemState.codePaths.overlapResolution.file,
      systemState.codePaths.postFiltering.file,
    ];
    if (phiType === "NAME") {
      relatedCodePaths.push(systemState.codePaths.nameScanning.file);
    }

    phiContexts.push({
      phiType,
      totalFailures: typeFailures.length,
      failures: failureRecords,
      patterns,
      relatedFiles,
      relatedCodePaths,
    });
  }

  // Sort by count (factual ordering)
  phiContexts.sort((a, b) => b.totalFailures - a.totalFailures);

  return {
    timestamp: Date.now(),
    systemState,
    failureSummary: {
      total: failures.length,
      byType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.length])),
    },
    phiContexts,
  };
}

/**
 * Extract factual patterns from values - observations only, no interpretation
 */
function extractPatterns(values: string[]): PatternObservation[] {
  const patterns: PatternObservation[] = [];

  // Whitespace patterns
  const multiSpace = values.filter(v => /\s{2,}/.test(v));
  if (multiSpace.length > 0) {
    patterns.push({
      pattern: "multiple_spaces",
      count: multiSpace.length,
      examples: multiSpace.slice(0, 3),
      observation: `${multiSpace.length} of ${values.length} values contain consecutive spaces`,
    });
  }

  // Case patterns
  const allUpper = values.filter(v => v === v.toUpperCase() && /[A-Z]/.test(v));
  if (allUpper.length > 0) {
    patterns.push({
      pattern: "all_uppercase",
      count: allUpper.length,
      examples: allUpper.slice(0, 3),
      observation: `${allUpper.length} of ${values.length} values are entirely uppercase`,
    });
  }

  const mixedCase = values.filter(v => /[a-z]/.test(v) && /[A-Z]/.test(v));
  if (mixedCase.length > 0) {
    patterns.push({
      pattern: "mixed_case",
      count: mixedCase.length,
      examples: mixedCase.slice(0, 3),
      observation: `${mixedCase.length} of ${values.length} values contain both upper and lowercase`,
    });
  }

  // Delimiter patterns
  const hasComma = values.filter(v => v.includes(","));
  if (hasComma.length > 0) {
    patterns.push({
      pattern: "contains_comma",
      count: hasComma.length,
      examples: hasComma.slice(0, 3),
      observation: `${hasComma.length} of ${values.length} values contain commas`,
    });
  }

  const spacedDelimiters = values.filter(v => /\d\s+[-\/]\s*\d|\d\s*[-\/]\s+\d/.test(v));
  if (spacedDelimiters.length > 0) {
    patterns.push({
      pattern: "spaces_around_delimiters",
      count: spacedDelimiters.length,
      examples: spacedDelimiters.slice(0, 3),
      observation: `${spacedDelimiters.length} of ${values.length} values have spaces adjacent to delimiters`,
    });
  }

  // Character patterns
  const hasLettersInNumeric = values.filter(v => {
    const stripped = v.replace(/[a-zA-Z]{3,}/g, ''); // Remove words
    return /[oOlIzZsS]/.test(stripped); // Letters that look like numbers
  });
  if (hasLettersInNumeric.length > 0) {
    patterns.push({
      pattern: "ambiguous_characters",
      count: hasLettersInNumeric.length,
      examples: hasLettersInNumeric.slice(0, 3),
      observation: `${hasLettersInNumeric.length} of ${values.length} values contain characters that visually resemble digits (o/0, l/1, etc.)`,
    });
  }

  return patterns;
}

/**
 * Format analysis context for display - structured output only
 */
export function formatAnalysisContext(context: AnalysisContext): string {
  const lines: string[] = [];
  
  lines.push("=" .repeat(80));
  lines.push("ANALYSIS CONTEXT");
  lines.push("=".repeat(80));
  lines.push("");
  
  // System state summary
  lines.push("SYSTEM STATE");
  lines.push("-".repeat(40));
  lines.push(`Rust binding: ${context.systemState.rustBinding.available ? "active" : "not active"}`);
  lines.push(`Overlap resolution: ${context.systemState.codePaths.overlapResolution.file}`);
  lines.push(`Post-filtering: ${context.systemState.codePaths.postFiltering.file}`);
  lines.push("");
  
  // Failure counts
  lines.push("FAILURE COUNTS");
  lines.push("-".repeat(40));
  lines.push(`Total: ${context.failureSummary.total}`);
  for (const [type, count] of Object.entries(context.failureSummary.byType)) {
    lines.push(`  ${type}: ${count}`);
  }
  lines.push("");
  
  // Per-type context
  for (const ctx of context.phiContexts) {
    lines.push("=".repeat(80));
    lines.push(`${ctx.phiType} (${ctx.totalFailures} instances)`);
    lines.push("=".repeat(80));
    lines.push("");
    
    // Values
    lines.push("VALUES NOT DETECTED:");
    for (const f of ctx.failures.slice(0, 5)) {
      lines.push(`  "${f.value}"`);
      if (f.contextBefore || f.contextAfter) {
        lines.push(`    in: ...${f.contextBefore.slice(-40)}[HERE]${f.contextAfter.slice(0, 40)}...`);
      }
    }
    if (ctx.totalFailures > 5) {
      lines.push(`  ... and ${ctx.totalFailures - 5} more`);
    }
    lines.push("");
    
    // Patterns
    if (ctx.patterns.length > 0) {
      lines.push("OBSERVED PATTERNS:");
      for (const p of ctx.patterns) {
        lines.push(`  ${p.observation}`);
      }
      lines.push("");
    }
    
    // Related files
    lines.push("RELATED FILES:");
    for (const f of ctx.relatedFiles) {
      lines.push(`  ${f}`);
    }
    lines.push("");
  }
  
  return lines.join("\n");
}

// =============================================================================
// BACKWARD COMPATIBILITY - Legacy interface adapters
// =============================================================================

// Legacy types (deprecated but maintained for compatibility)
export interface PipelineAuditResult extends SystemState {
  failureCorrelations: never[];
  diagnosticHints: never[];
  architecture: {
    pipelineStages: string[];
    overlapResolutionLogic: string;
    postFilterLogic: string;
  };
}

export interface FailureDiagnosis {
  phiType: string;
  failureCount: number;
  examples: string[];
  diagnosis: {
    likelyCause: string;
    codePathInvolved: string;
    checkFirst: string;
    suggestedFix: string;
    fileToEdit: string;
  };
  confidence: "high" | "medium" | "low";
}

export interface DiagnosticReport {
  timestamp: number;
  pipelineState: SystemState;
  failureDiagnoses: FailureDiagnosis[];
  topPriorityFix: null;
  summaryForLLM: string;
}

/**
 * Legacy function - now returns neutral analysis context
 */
export function diagnoseFailures(
  failures: Array<{ type: string; expected: string; context?: string }>,
  _audit?: SystemState
): DiagnosticReport {
  const context = buildAnalysisContext(failures);
  
  // Convert to legacy format without prescriptive content
  const diagnoses: FailureDiagnosis[] = context.phiContexts.map(ctx => ({
    phiType: ctx.phiType,
    failureCount: ctx.totalFailures,
    examples: ctx.failures.map(f => f.value).slice(0, 5),
    diagnosis: {
      // Neutral descriptions only
      likelyCause: ctx.patterns.length > 0 
        ? ctx.patterns.map(p => p.observation).join("; ")
        : `${ctx.totalFailures} ${ctx.phiType} values were not detected`,
      codePathInvolved: ctx.relatedFiles[0] || "unknown",
      checkFirst: `See ${ctx.relatedFiles.slice(0, 2).join(" and ")}`,
      suggestedFix: `Related files: ${ctx.relatedFiles.slice(0, 3).join(", ")}`,
      fileToEdit: ctx.relatedFiles[0] || "unknown",
    },
    confidence: ctx.patterns.length >= 2 ? "high" : ctx.patterns.length === 1 ? "medium" : "low",
  }));

  return {
    timestamp: Date.now(),
    pipelineState: context.systemState,
    failureDiagnoses: diagnoses,
    topPriorityFix: null, // No longer prescribe priorities
    summaryForLLM: formatAnalysisContext(context),
  };
}

/**
 * New recommended function - returns structured analysis context
 */
export function analyzeFailuresForInvestigation(
  failures: Array<{ type: string; expected: string; context?: string }>,
  _audit?: SystemState
): AnalysisContext {
  return buildAnalysisContext(failures);
}

// Legacy exports
export function runPipelineAudit(): SystemState {
  return PipelineAudit.run();
}

export function printPipelineAudit(): void {
  PipelineAudit.printSummary();
}

// Type aliases for backward compatibility
export type { SystemState as PipelineAuditResultNew };
export type { AnalysisContext as InvestigationReport };

// =============================================================================
// ANALYSIS METHODOLOGY (OPTIONAL)
// =============================================================================
// This section provides a suggested approach for analysis.
// It is NOT prescriptive - use it, adapt it, or ignore it as you see fit.
// =============================================================================

/**
 * Generate methodology guidance text
 * 
 * This is OPTIONAL guidance - a framework that may help structure analysis.
 * The analyst is free to use their own approach.
 */
export function getMethodologyGuidance(): string {
  return `
ANALYSIS METHODOLOGY (optional framework)
=========================================

This is a suggested approach. You may use it, adapt it, or use your own method.

PHASE 1: OBSERVATION
--------------------
Describe what the data shows without interpreting it:
- What specific values were not detected?
- What patterns appear in the data?
- What is the surrounding context for each failure?

PHASE 2: EXPLORATION  
--------------------
Gather additional context:
- Read the relevant filter source code
- Understand how detection currently works
- Note any patterns in the code that relate to observations

PHASE 3: HYPOTHESIS GENERATION
------------------------------
Generate multiple possible explanations:
- Consider at least 3 different hypotheses
- For each, identify what evidence would support or refute it
- Include explanations you might initially dismiss

PHASE 4: EVIDENCE EVALUATION
----------------------------
Test each hypothesis against available evidence:
- What in the code/data supports this hypothesis?
- What contradicts it?
- Which hypothesis best fits all observations?

PHASE 5: CONCLUSION
-------------------
State your findings:
- What do you believe is happening and why?
- What evidence supports this conclusion?
- What uncertainty remains?
- What change would you propose to test?

NOTES
-----
- This framework is suggestive, not required
- Trust your own judgment and expertise
- The goal is thorough analysis, not following steps
- If you find a better approach, use it
`.trim();
}

/**
 * Format complete analysis output with optional methodology
 */
export function formatCompleteAnalysis(
  context: AnalysisContext,
  includeMethodology: boolean = true
): string {
  const lines: string[] = [];
  
  // Add methodology guidance if requested
  if (includeMethodology) {
    lines.push(getMethodologyGuidance());
    lines.push("");
    lines.push("");
  }
  
  // Add the factual analysis context
  lines.push(formatAnalysisContext(context));
  
  return lines.join("\n");
}
