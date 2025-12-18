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
 * ║   MCP PROMPTS                                                                 ║
 * ║   Pre-built Templates for Common Tasks                                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * Prompts are pre-built templates that guide the LLM through specific tasks.
 * They include context from Cortex and structure the conversation.
 *
 * PROMPT CATEGORIES:
 * ─────────────────────────────────────────────────────────────────────────────────
 * ANALYSIS     - Analyze results, investigate issues
 * IMPROVEMENT  - Plan and execute improvements
 * DEBUGGING    - Debug specific problems
 * REPORTING    - Generate reports and summaries
 */

// ============================================================================
// PROMPT DEFINITIONS
// ============================================================================

const PROMPTS = [
  {
    name: "analyze_test_failure",
    description:
      "Analyze why a test failed and suggest fixes. Provides full context including patterns, history, and codebase state.",
    arguments: [
      {
        name: "phiType",
        description: "PHI type that failed (e.g., NAME, SSN, DATE)",
        required: false,
      },
      {
        name: "errorDetails",
        description: "Details about the failure",
        required: false,
      },
    ],
  },
  {
    name: "improve_detection",
    description:
      "Get a guided plan to improve detection for a specific PHI type. Includes history consultation and evidence-based recommendations.",
    arguments: [
      {
        name: "phiType",
        description: "PHI type to improve (e.g., NAME, SSN, DATE)",
        required: true,
      },
      {
        name: "targetMetric",
        description: "Which metric to focus on (sensitivity, specificity)",
        required: false,
      },
    ],
  },
  {
    name: "review_recent_changes",
    description:
      "Review recent interventions and their effects. Helps understand what changes were made and whether they worked.",
    arguments: [
      {
        name: "days",
        description: "Number of days to review",
        required: false,
      },
    ],
  },
  {
    name: "plan_experiment",
    description:
      "Plan an A/B experiment to test a potential improvement safely.",
    arguments: [
      {
        name: "hypothesis",
        description: "What change you want to test",
        required: true,
      },
      {
        name: "expectedOutcome",
        description: "What improvement you expect",
        required: false,
      },
    ],
  },
  {
    name: "debug_false_negatives",
    description:
      "Debug why specific PHI is being missed. Analyzes patterns and suggests fixes.",
    arguments: [
      {
        name: "examples",
        description: "Examples of missed PHI",
        required: false,
      },
      {
        name: "phiType",
        description: "Type of PHI being missed",
        required: false,
      },
    ],
  },
  {
    name: "debug_false_positives",
    description:
      "Debug why non-PHI is being incorrectly flagged. Helps reduce over-detection.",
    arguments: [
      {
        name: "examples",
        description: "Examples of false positives",
        required: false,
      },
      {
        name: "phiType",
        description: "Type being over-detected",
        required: false,
      },
    ],
  },
  {
    name: "status_report",
    description:
      "Get a comprehensive status report of the current system state.",
    arguments: [
      {
        name: "focus",
        description: "What to focus on (metrics, patterns, recommendations)",
        required: false,
      },
    ],
  },
  {
    name: "what_should_i_do_next",
    description:
      "Get prioritized recommendations for what to work on next based on current state and history.",
    arguments: [],
  },
];

// ============================================================================
// PROMPT GENERATION
// ============================================================================

async function getPrompt(name, args, modules) {
  switch (name) {
    case "analyze_test_failure":
      return generateAnalyzeFailurePrompt(args, modules);

    case "improve_detection":
      return generateImproveDetectionPrompt(args, modules);

    case "review_recent_changes":
      return generateReviewChangesPrompt(args, modules);

    case "plan_experiment":
      return generatePlanExperimentPrompt(args, modules);

    case "debug_false_negatives":
      return generateDebugFNPrompt(args, modules);

    case "debug_false_positives":
      return generateDebugFPPrompt(args, modules);

    case "status_report":
      return generateStatusReportPrompt(args, modules);

    case "what_should_i_do_next":
      return generateWhatNextPrompt(modules);

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

async function generateAnalyzeFailurePrompt(args, modules) {
  const { phiType, errorDetails } = args || {};

  // Gather context
  const patterns = modules.patternRecognizer?.getTopFailurePatterns(5) || [];
  const history = modules.historyConsultant
    ? await modules.historyConsultant.consult("HOW_TO_FIX", {
        phiType,
        issueType: "FAILURE",
      })
    : null;
  const codebaseState = modules.codebaseAnalyzer?.exportForLLM() || {};

  const messages = [
    {
      role: "user",
      content: {
        type: "text",
        text: `# Test Failure Analysis Request

${phiType ? `**PHI Type:** ${phiType}` : ""}
${errorDetails ? `**Error Details:** ${errorDetails}` : ""}

## Current Context

### Top Failure Patterns
${JSON.stringify(patterns, null, 2)}

### Historical Analysis
${history ? JSON.stringify(history, null, 2) : "No history available"}

### Codebase State
- Filters: ${codebaseState.summary?.filters || "Unknown"}
- Capabilities: ${codebaseState.filterCapabilities?.map((f) => f.name).join(", ") || "Unknown"}
- Gaps: ${codebaseState.gaps?.join(", ") || "None identified"}

## Your Task

1. Analyze the failure patterns to identify the root cause
2. Check if similar issues have been addressed before (history)
3. Consider the current codebase capabilities
4. Provide specific, actionable recommendations
5. Estimate the impact of your recommendations

Remember: ALWAYS check history before recommending changes that may have been tried before.`,
      },
    },
  ];

  return { messages };
}

async function generateImproveDetectionPrompt(args, modules) {
  const { phiType, targetMetric = "sensitivity" } = args || {};

  if (!phiType) {
    throw new Error("phiType is required");
  }

  // Gather comprehensive context
  const patterns =
    modules.patternRecognizer?.getPatternsByPhiType(phiType) || [];
  const history = modules.historyConsultant
    ? await modules.historyConsultant.consult("WHAT_TO_IMPROVE", { phiType })
    : null;
  const codebaseState = modules.codebaseAnalyzer?.getCurrentState() || {};
  const insights =
    modules.insightGenerator
      ?.getActiveInsights()
      .filter((i) => !i.details?.phiType || i.details.phiType === phiType)
      .slice(0, 5) || [];
  const recommendations =
    modules.recommendationBuilder?.getTopRecommendations(5) || [];

  const relevantFilters = codebaseState.filters?.byType?.[phiType] || [];

  const messages = [
    {
      role: "user",
      content: {
        type: "text",
        text: `# Improve ${phiType} Detection

**Target Metric:** ${targetMetric}

## Current State

### Filters for ${phiType}
${relevantFilters.length > 0 ? relevantFilters.join(", ") : "No dedicated filter found"}

### Failure Patterns for ${phiType}
${JSON.stringify(patterns.slice(0, 5), null, 2)}

### Historical Attempts
${
  history
    ? `
**Summary:** ${history.summary}
**Previous Successes:** ${history.relatedSuccesses?.length || 0}
**Previous Failures:** ${history.relatedFailures?.length || 0}
${history.warnings?.length > 0 ? `**Warnings:** ${history.warnings.map((w) => w.message).join("; ")}` : ""}
`
    : "No history available"
}

### Active Insights
${JSON.stringify(insights, null, 2)}

### Pending Recommendations
${JSON.stringify(recommendations, null, 2)}

## Your Task

1. **Review History First** - What was tried before? What worked? What failed?
2. **Analyze Current Patterns** - What's causing the most failures?
3. **Check Capabilities** - What tools are available? What's missing?
4. **Develop Plan** - Create a step-by-step improvement plan
5. **Assess Risk** - What could go wrong? How do we mitigate?

**Important:** If similar improvements have failed before, explain why your approach is different.`,
      },
    },
  ];

  return { messages };
}

async function generateReviewChangesPrompt(args, modules) {
  const { days = 7 } = args || {};

  const interventions =
    modules.interventionTracker?.getRecentInterventions(10) || [];
  const experiments = modules.experimentRunner?.getRecentExperiments(5) || [];

  const messages = [
    {
      role: "user",
      content: {
        type: "text",
        text: `# Review Recent Changes (Last ${days} Days)

## Recent Interventions
${JSON.stringify(
  interventions.map((i) => ({
    id: i.id,
    type: i.type,
    description: i.description,
    effect: i.effect?.classification,
    status: i.status,
    timestamp: i.timeline?.applied,
  })),
  null,
  2,
)}

## Recent Experiments
${JSON.stringify(
  experiments.map((e) => ({
    id: e.id,
    name: e.name,
    status: e.status,
    conclusion: e.conclusion?.accepted ? "ACCEPTED" : "REJECTED",
    effect: e.analysis?.overallEffect,
  })),
  null,
  2,
)}

## Your Task

1. Summarize what changes were made
2. Identify which changes were successful
3. Identify which changes caused problems
4. Note any patterns in what works vs what doesn't
5. Recommend follow-up actions if needed`,
      },
    },
  ];

  return { messages };
}

async function generatePlanExperimentPrompt(args, modules) {
  const { hypothesis, expectedOutcome } = args || {};

  if (!hypothesis) {
    throw new Error("hypothesis is required");
  }

  const history = modules.historyConsultant
    ? await modules.historyConsultant.consult("SHOULD_WE_TRY", {
        description: hypothesis,
      })
    : null;
  const rollbackPolicy = modules.rollbackManager?.getPolicy() || {};

  const messages = [
    {
      role: "user",
      content: {
        type: "text",
        text: `# Experiment Planning

## Hypothesis
${hypothesis}

${expectedOutcome ? `## Expected Outcome\n${expectedOutcome}` : ""}

## Historical Analysis
${
  history
    ? `
**Similar Attempts:** ${history.previousAttempts?.length || 0}
**Summary:** ${history.summary}
${history.warnings?.length > 0 ? `**Warnings:**\n${history.warnings.map((w) => `- [${w.level}] ${w.message}`).join("\n")}` : ""}
`
    : "No history available"
}

## Current Rollback Policy
- Policy: ${rollbackPolicy.name || "Standard"}
- Auto-rollback: ${rollbackPolicy.autoRollbackThresholds ? "Enabled" : "Disabled"}

## Your Task

1. **Evaluate Feasibility** - Is this worth testing?
2. **Design Experiment** - How should we test this?
   - What documents to use
   - What metrics to measure
   - What constitutes success/failure
3. **Plan for Failure** - What if it makes things worse?
   - Rollback procedure
   - How to detect regression quickly
4. **Define Success Criteria** - How do we know it worked?
5. **Create Step-by-Step Plan**`,
      },
    },
  ];

  return { messages };
}

async function generateDebugFNPrompt(args, modules) {
  const { examples, phiType } = args || {};

  const patterns =
    modules.patternRecognizer
      ?.getTopFailurePatterns(10)
      .filter((p) => !phiType || p.phiType === phiType) || [];
  const codebaseState = modules.codebaseAnalyzer?.exportForLLM() || {};

  const messages = [
    {
      role: "user",
      content: {
        type: "text",
        text: `# Debug False Negatives (Missed PHI)

${phiType ? `**PHI Type:** ${phiType}` : ""}
${examples ? `**Examples:** ${examples}` : ""}

## Failure Pattern Analysis
${JSON.stringify(patterns, null, 2)}

## Codebase Capabilities
${JSON.stringify(codebaseState.filterCapabilities || [], null, 2)}

## Known Gaps
${codebaseState.gaps?.join(", ") || "None identified"}

## Your Task

1. Identify WHY these PHI are being missed:
   - Pattern not covered?
   - Dictionary miss?
   - OCR/formatting issue?
   - Context-dependent?

2. For each cause, suggest a specific fix

3. Prioritize fixes by:
   - Frequency (how often this happens)
   - Severity (how bad is missing this PHI)
   - Difficulty (how hard to fix)

4. Consider side effects - could fixes cause false positives?`,
      },
    },
  ];

  return { messages };
}

async function generateDebugFPPrompt(args, modules) {
  const { examples, phiType } = args || {};

  const codebaseState = modules.codebaseAnalyzer?.exportForLLM() || {};

  const messages = [
    {
      role: "user",
      content: {
        type: "text",
        text: `# Debug False Positives (Over-detection)

${phiType ? `**PHI Type:** ${phiType}` : ""}
${examples ? `**Examples:** ${examples}` : ""}

## Current Filters
${JSON.stringify(codebaseState.filterCapabilities || [], null, 2)}

## Your Task

1. Identify WHY these are being incorrectly flagged:
   - Pattern too broad?
   - Common word matching?
   - Missing exclusion rule?

2. For each cause, suggest a specific fix:
   - Tighten pattern
   - Add exclusion list
   - Add context requirement

3. **Critical:** Ensure fixes don't cause false negatives
   - What legitimate PHI might look similar?
   - How to distinguish them?

4. Prioritize by frequency and user impact`,
      },
    },
  ];

  return { messages };
}

async function generateStatusReportPrompt(args, modules) {
  const { focus } = args || {};

  const summary = {
    codebase: modules.codebaseStateTracker?.exportForLLM() || null,
    patterns: modules.patternRecognizer?.exportForLLM() || null,
    insights: modules.insightGenerator?.getSummary() || null,
    interventions: modules.interventionTracker?.getStats() || null,
    experiments: modules.experimentRunner?.getStats() || null,
  };

  const messages = [
    {
      role: "user",
      content: {
        type: "text",
        text: `# Status Report Request

${focus ? `**Focus:** ${focus}` : ""}

## Current System Summary
${JSON.stringify(summary, null, 2)}

## Your Task

Generate a clear, concise status report covering:

1. **Current State**
   - Overall health of the system
   - Key metrics and trends

2. **Recent Activity**
   - What changes were made
   - Their effects

3. **Active Issues**
   - Critical problems
   - Pending items

4. **Recommendations**
   - Top priorities
   - Quick wins

Keep it actionable and focused on what matters most.`,
      },
    },
  ];

  return { messages };
}

async function generateWhatNextPrompt(modules) {
  const insights =
    modules.insightGenerator?.getActiveInsights().slice(0, 10) || [];
  const recommendations =
    modules.recommendationBuilder?.getTopRecommendations(5) || [];
  const pending = modules.interventionTracker?.getPendingTesting() || [];
  const history = modules.historyConsultant
    ? await modules.historyConsultant.consult("WHAT_TO_IMPROVE", {})
    : null;

  const messages = [
    {
      role: "user",
      content: {
        type: "text",
        text: `# What Should I Do Next?

## Active Insights (by priority)
${JSON.stringify(
  insights.map((i) => ({
    priority: i.priority,
    type: i.type,
    title: i.title,
    action: i.action,
  })),
  null,
  2,
)}

## Top Recommendations
${JSON.stringify(
  recommendations.map((r) => ({
    priority: r.priority,
    action: r.action,
    confidence: r.confidence,
    risk: r.risk?.level,
  })),
  null,
  2,
)}

## Pending Items
- Interventions awaiting testing: ${pending.length}

## Historical Context
${history ? history.summary : "No history available"}

## Your Task

Based on all available information:

1. **Prioritize** - What's most important right now?
2. **Recommend** - What specific action should be taken?
3. **Justify** - Why this over other options?
4. **Plan** - High-level steps to execute
5. **Warn** - Any risks or gotchas to watch for

Be specific and actionable. Don't just say "improve X" - say exactly how.`,
      },
    },
  ];

  return { messages };
}

// ============================================================================
// EXPORTS
// ============================================================================

function getPrompts() {
  return PROMPTS;
}

module.exports = {
  getPrompts,
  getPrompt,
};
