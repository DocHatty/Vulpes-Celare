# Vulpes Celare Integration

> **HIPAA-Compliant PHI Redaction Engine** - This project provides enterprise-grade Protected Health Information redaction with a learning system.

## MCP Tools Available

You have access to the **Vulpes Cortex MCP** server. These tools are your primary interface:

### Core Redaction Tools
| Tool | Description |
|------|-------------|
| `vulpes.redact_text` | Redact PHI from text, returns cleaned text + detection breakdown |
| `vulpes.analyze_redaction` | Preview what PHI would be detected (dry run) |
| `vulpes.get_system_info` | Version, filter count, target metrics, capabilities |

### Cortex Learning System
| Tool | Description |
|------|-------------|
| `vulpes.analyze_metrics` | Analyze sensitivity/specificity trends over time |
| `vulpes.diagnose_failure` | Deep-dive into why a test or filter is failing |
| `vulpes.record_intervention` | **USE THIS** to log changes you make |
| `vulpes.generate_hypothesis` | AI-powered hypothesis about issues |
| `vulpes.consult_history` | Check if similar issues were solved before |
| `vulpes.recommend_action` | Get suggested next steps |

### Experiment Tools
| Tool | Description |
|------|-------------|
| `vulpes.create_snapshot` | Capture current codebase/metrics state |
| `vulpes.compare_snapshots` | Before/after analysis of changes |
| `vulpes.run_experiment` | Run controlled A/B tests with rollback |

---

## Quick Commands

```bash
# Build the project
npm run build

# Run ALL tests
npm test

# Run strict tests (fails on metric regression)
npm run test:strict

# Run master test suite with Cortex integration
node tests/master-suite/run.js

# CLI redaction
vulpes redact "Patient John Smith DOB 01/15/1990 SSN 123-45-6789"

# Interactive redaction mode
vulpes interactive
```

---

## PHI Handling Rules

> [!CAUTION]
> **NEVER expose unredacted PHI** in logs, commits, or external API calls.

1. Always use `vulpes.redact_text` before outputting clinical content
2. Use `/vulpes-redact` for quick inline redaction
3. Synthetic data only for testing
4. Use the Cortex learning system to track your changes

---

## Codebase Structure

```
src/
├── filters/          # 28 PHI detection filters (DateFilter, NameFilter, etc.)
├── core/
│   ├── images/       # OCR-based image redaction
│   ├── dicom/        # DICOM medical image anonymization
│   └── cortex/       # Learning system bridge
├── rust/             # Native Rust accelerators
│   └── src/          # 11 high-performance modules
├── mcp/              # MCP server (lightweight)
├── dictionaries/     # Name/location/medical databases
└── cli/              # Command-line interface

tests/
├── unit/             # Individual filter tests
└── master-suite/     # Full integration + Cortex
    └── cortex/       # Full MCP server with all learning tools

native/               # Compiled Rust addon + ONNX runtime
```

---

## Target Metrics

| Metric | Target | Priority |
|--------|--------|----------|
| **Sensitivity** | ≥99% | 🔴 CRITICAL - Missing PHI = HIPAA violation |
| **Specificity** | ≥96% | 🟡 Important but secondary |
| **Speed** | ≤3ms/doc | 🟢 Performance target |

---

## Workflow: Fixing Issues

### Before You Start
```
vulpes.consult_history {"issue": "describe the problem"}
```
Check if this was solved before. Learn from past interventions.

### Make Your Change
1. Make **ONE** change at a time
2. Run: `npm run build && npm test`
3. Check metrics in output

### After Your Change
```
vulpes.record_intervention {
  "type": "filter_fix",
  "description": "What you changed",
  "files_changed": ["src/filters/NameFilter.ts"],
  "metrics_before": {...},
  "metrics_after": {...}
}
```
This helps the system learn!

### If Tests Fail
```
vulpes.diagnose_failure {"test_name": "NameFilter", "error": "..."}
```
Get AI-powered diagnosis and recommendations.

---

## Slash Commands

- `/vulpes-redact <text>` - Quick PHI redaction
- `/vulpes-analyze <text>` - See what would be detected
- `/vulpes-info` - System status
- `/vulpes-test [filter]` - Run tests

---

## Filter Development

When editing filters in `src/filters/`:

1. **Read existing code first** - understand the regex patterns and context rules
2. **Add test cases** to `tests/` before fixing
3. **Run single filter test**: `npm test -- --grep "FilterName"`
4. **Use snapshot/compare** for risky changes
