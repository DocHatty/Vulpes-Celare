# Elite LLM Guidance System - Implementation Plan

## Executive Summary

This document outlines the architecture for an **elite-tier LLM guidance system** that maximizes any AI agent's ability to analyze, diagnose, and implement improvement plans when interacting with Vulpes Celare's test suite.

**Target State**: Any LLM (Claude, Codex, GPT, Gemini) receives perfectly calibrated context and actionable directives when running tests - not over-prompted, not under-prompted, but **precision-guided** for maximum effectiveness.

---

## Current State Assessment

### What's Already Implemented (Strong Foundation)

| Component | Location | Quality |
|-----------|----------|---------|
| CLAUDE.md with analysis protocol | Root | Good |
| CODEX_AGENTS_TEMPLATE.md | templates/ | Excellent |
| 16+ MCP Tools | cortex/mcp/tools.js | Comprehensive |
| Self-Correction Orchestrator | cortex/analysis/ | Sophisticated |
| Deep Analysis Engine | cortex/analysis/ | Advanced |
| Prompts System | cortex/mcp/prompts.js | Basic |
| Test Result Processor | cortex/core/ | Functional |

### Identified Gaps (Per 2025 Gold Standards)

1. **No Live Prompt Injection in Test Output** - Results are data-only
2. **No Claude Code Hooks** - Missing CI/CD integration
3. **No Model-Specific Calibration** - Same prompts for all LLMs
4. **No Action Blocks** - Missing imperative "DO THIS NOW" format
5. **No Feedback Loop** - Interventions not feeding back to prompt refinement

---

## Elite Architecture Design

### 1. Prompt Injection Layer (PIL)

The Prompt Injection Layer embeds calibrated guidance directly into test output.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      VULPES CELARE TEST OUTPUT                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ LLM GUIDANCE HEADER ─────────────────────────────────────────────────┐ │
│  │ Model: Claude Opus 4.5                                                 │ │
│  │ Mode: Extended Thinking Recommended                                    │ │
│  │ Priority: SENSITIVITY CRITICAL (HIPAA)                                 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─ METRICS ─────────────────────────────────────────────────────────────┐ │
│  │ Sensitivity: 97.70% │ Specificity: 91.04% │ Grade: B+                  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─ DO THIS NOW ─────────────────────────────────────────────────────────┐ │
│  │ 1. Read: src/filters/SmartNameFilterSpan.ts:450-520                    │ │
│  │ 2. Fix: Add OCR normalization for "0" → "O" in name detection          │ │
│  │ 3. Run: npm run build && npm test                                      │ │
│  │ 4. Expected: +1.5% sensitivity improvement                             │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─ HISTORY CONTEXT ─────────────────────────────────────────────────────┐ │
│  │ Similar fix applied 2025-12-15: SUCCESS (+2.1% sensitivity)            │ │
│  │ Related fix attempted 2025-12-10: FAILED (caused regression)           │ │
│  │ Risk Level: LOW                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Model-Specific Calibration (MSC)

Different LLMs have different strengths. The system calibrates guidance accordingly:

| Model | Strengths | Calibration |
|-------|-----------|-------------|
| **Claude Opus 4.5** | Extended thinking, complex analysis | Deep root cause prompts, architectural suggestions |
| **Claude Sonnet** | Balance of speed/quality | Focused action items, less exploration |
| **Codex 5.2** | Code generation, pattern matching | Code snippets, regex suggestions |
| **GPT-4o** | Fast iteration, broad knowledge | Multiple options, quick fixes |
| **Gemini** | Structured output, long context | Detailed analysis, full file context |

**Implementation**: Detect model from environment or User-Agent, adjust prompt injection accordingly.

### 3. Action Block System (ABS)

Every test output includes imperative action blocks:

```javascript
const ACTION_BLOCKS = {
  DO_THIS_NOW: {
    format: "Numbered steps with file:line references",
    tone: "Imperative, specific, actionable",
    maxSteps: 5,
    includesExpectedOutcome: true,
  },

  CONSULT_BEFORE_FIXING: {
    format: "Historical context with success/failure rates",
    tone: "Advisory, contextual",
    includesRiskLevel: true,
  },

  DEEP_DIVE_REQUIRED: {
    format: "Triggers extended thinking mode",
    threshold: "failures > 50 OR sensitivity < 98%",
    includesPipelineTrace: true,
  },

  AVOID_THIS: {
    format: "Anti-patterns from historical failures",
    tone: "Warning, preventive",
    includesFailureExamples: true,
  },
};
```

### 4. Claude Code Hooks Integration

Create `.claude/hooks/` directory with:

```javascript
// .claude/hooks/post-test.js
// Runs after any test command
module.exports = {
  pattern: /npm\s+test|node\s+tests\/master-suite/,
  async handler(result) {
    // Inject analysis guidance into Claude's context
    if (result.exitCode !== 0) {
      return {
        inject: await generateFailureGuidance(result.output),
        continueWith: "analyze before fixing",
      };
    }
    return {
      inject: await generateSuccessGuidance(result.output),
      continueWith: "document changes",
    };
  },
};
```

### 5. Feedback Loop Engine (FLE)

Every intervention feeds back to improve future prompts:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   LLM       │────>│ Intervention │────>│  Outcome    │
│   Action    │     │   Tracker    │     │  Analyzer   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                    │
                           v                    v
                    ┌─────────────┐     ┌─────────────┐
                    │  Prompt     │<────│  Success/   │
                    │  Refiner    │     │  Failure    │
                    └─────────────┘     └─────────────┘
                           │
                           v
                    ┌─────────────┐
                    │  Updated    │
                    │  Guidance   │
                    └─────────────┘
```

---

## Implementation Phases

### Phase 1: Prompt Injection Layer (4 hours)

Create `tests/master-suite/cortex/llm-guidance/PromptInjector.js`:
- Detects current LLM from environment
- Generates model-specific guidance blocks
- Embeds "DO THIS NOW" action items in test output
- Includes historical context from knowledge base

### Phase 2: Action Block Formatter (2 hours)

Create `tests/master-suite/cortex/llm-guidance/ActionBlockFormatter.js`:
- Standard format for all action blocks
- File:line references with clickable links
- Expected outcome predictions
- Risk level indicators

### Phase 3: Claude Code Hooks (2 hours)

Create `.claude/hooks/`:
- `post-test-hook.js` - Injects guidance after tests
- `pre-commit-hook.js` - Validates changes before commit
- `session-start-hook.js` - Loads relevant context

### Phase 4: Model Calibration (2 hours)

Create `tests/master-suite/cortex/llm-guidance/ModelCalibrator.js`:
- Detect model from environment variables
- Apply model-specific prompt adjustments
- Calibrate verbosity, depth, and focus

### Phase 5: Feedback Loop (4 hours)

Enhance `cortex/learning/intervention-tracker.js`:
- Record prompt → action → outcome chains
- Analyze which prompts lead to successful fixes
- Auto-refine action block templates
- Generate "what worked before" summaries

---

## File Structure

```
tests/master-suite/cortex/llm-guidance/
├── index.js                 # Main exports
├── PromptInjector.js        # Core injection logic
├── ActionBlockFormatter.js  # Action block formatting
├── ModelCalibrator.js       # Model-specific tuning
├── HistoryContextBuilder.js # Historical context
├── FeedbackLoopEngine.js    # Learning from outcomes
├── templates/
│   ├── claude-opus.md       # Claude Opus-specific prompts
│   ├── claude-sonnet.md     # Claude Sonnet-specific prompts
│   ├── codex.md             # Codex-specific prompts
│   └── generic.md           # Fallback prompts
└── calibration/
    ├── verbosity.js         # Verbosity settings per model
    ├── depth.js             # Analysis depth settings
    └── focus.js             # Focus area preferences

.claude/
├── hooks/
│   ├── post-test-hook.js
│   ├── pre-commit-hook.js
│   └── session-start-hook.js
└── commands/
    └── deep-analysis.md     # Already exists
```

---

## Key Metrics

### Success Criteria

| Metric | Current | Target |
|--------|---------|--------|
| Time to first correct fix | ~15 min | < 5 min |
| LLM understanding of issue | Variable | 95%+ |
| Action block clarity score | N/A | 4.5/5 |
| Historical context utilization | Low | High |
| Feedback loop closure rate | 0% | 80%+ |

### Monitoring

- Track which action blocks lead to successful fixes
- Measure time from test failure to fix commit
- Log which historical contexts were most useful
- A/B test different prompt templates

---

## Example Output (After Implementation)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  VULPES CELARE TEST RESULTS - LLM GUIDANCE ENABLED                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Model Detected: Claude Opus 4.5                                             ║
║  Guidance Mode: Extended Thinking Recommended                                ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌─ METRICS ─────────────────────────────────────────────────────────────────────┐
│  Sensitivity: 97.70% (-0.48%)  │  Specificity: 91.04% (-1.85%)                │
│  Grade: B+ (was A-)            │  Trend: DECLINING                            │
└───────────────────────────────────────────────────────────────────────────────┘

┌─ TOP FAILURE ─────────────────────────────────────────────────────────────────┐
│  Type: NAME                                                                   │
│  Count: 23 failures (42% of total)                                            │
│  Root Cause: OCR_CONFUSION (0↔O, 1↔l)                                         │
│  Confidence: HIGH (pattern matched 19/23 failures)                            │
└───────────────────────────────────────────────────────────────────────────────┘

┌─ DO THIS NOW ─────────────────────────────────────────────────────────────────┐
│                                                                               │
│  1. READ: src/filters/SmartNameFilterSpan.ts:450-520                          │
│     Focus on: detectOcrTolerantLastFirst() method                             │
│                                                                               │
│  2. ADD: OCR normalization for character pairs:                               │
│     - "0" ↔ "O" (zero/letter O)                                               │
│     - "1" ↔ "l" ↔ "I" (one/lowercase L/capital I)                             │
│     - "5" ↔ "S" (five/letter S)                                               │
│                                                                               │
│  3. REFERENCE: src/config/OcrPatterns.ts for existing mappings                │
│                                                                               │
│  4. RUN: npm run build && npm test                                            │
│                                                                               │
│  5. EXPECTED: +1.5% to +2.5% sensitivity improvement                          │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘

┌─ HISTORY CONTEXT ─────────────────────────────────────────────────────────────┐
│                                                                               │
│  SIMILAR SUCCESSFUL FIX (2025-12-15):                                         │
│  • Added OCR tolerance to AddressFilterSpan                                   │
│  • Result: +2.1% sensitivity                                                  │
│  • Commit: abc123 "Add OCR normalization for addresses"                       │
│                                                                               │
│  AVOID THIS (2025-12-10):                                                     │
│  • Aggressive OCR normalization caused false positives                        │
│  • Lesson: Apply only to dictionary lookups, not raw regex                    │
│                                                                               │
│  RISK LEVEL: LOW                                                              │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘

┌─ DEEP ANALYSIS TRIGGER ───────────────────────────────────────────────────────┐
│                                                                               │
│  ⚠ DECLINING TREND DETECTED                                                  │
│                                                                               │
│  Consider using extended thinking to investigate:                             │
│  • Why did recent changes cause regression?                                   │
│  • Is this a pattern issue or pipeline issue?                                 │
│  • Should we rollback recent commits?                                         │
│                                                                               │
│  Run: /deep-analysis to trigger comprehensive investigation                   │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘

┌─ AVOID THIS ──────────────────────────────────────────────────────────────────┐
│                                                                               │
│  ❌ Don't add patterns without dictionary validation                          │
│  ❌ Don't modify PostFilterService without checking side effects              │
│  ❌ Don't commit without running full test suite                              │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary

This plan transforms Vulpes Celare from having "good LLM integration" to having **elite-tier, precision-calibrated AI guidance** that:

1. **Injects actionable prompts** directly into test output
2. **Calibrates for each LLM model's** strengths
3. **Provides imperative action blocks** ("DO THIS NOW")
4. **Surfaces historical context** (what worked/failed before)
5. **Closes the feedback loop** (learns from outcomes)
6. **Integrates with Claude Code hooks** for seamless CI/CD

**Estimated Implementation Time**: 14-16 hours
**Expected Impact**: 3x faster issue resolution, 95%+ LLM comprehension

---

*Created: 2025-12-18*
*Status: Plan approved, ready for implementation*
