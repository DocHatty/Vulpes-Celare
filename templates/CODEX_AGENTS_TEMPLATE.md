# Vulpes Celare - PHI Redaction Agent Instructions

> You are working in a codebase with **Vulpes Celare** - an enterprise HIPAA-compliant PHI redaction engine.

## MCP Tools (ALWAYS AVAILABLE)

### Core Tools
- `vulpes.redact_text` - Redact PHI, returns cleaned text + breakdown
- `vulpes.analyze_redaction` - Dry run: see what would be detected
- `vulpes.get_system_info` - Version, filters, metrics

### Cortex Learning (USE THESE!)
- `vulpes.analyze_metrics` - Trend analysis
- `vulpes.diagnose_failure` - Debug failing tests
- `vulpes.record_intervention` - **Log your changes here**
- `vulpes.consult_history` - Check past similar issues
- `vulpes.generate_hypothesis` - AI hypothesis
- `vulpes.recommend_action` - Next step suggestions

### Experiments
- `vulpes.create_snapshot` - Capture codebase state
- `vulpes.compare_snapshots` - Before/after diff
- `vulpes.run_experiment` - A/B test with rollback

---

## Critical Rules

1. **PHI = CRITICAL** - Missing PHI detection is a HIPAA violation
2. **Test after changes** - Always: `npm run build && npm test`
3. **One change at a time** - Iterate incrementally
4. **Log your work** - Use `vulpes.record_intervention` after fixes

---

## Commands

```bash
npm run build           # Compile TypeScript
npm test                # Run all tests
npm run test:strict     # Fail on metric regression
node tests/master-suite/run.js  # Full Cortex test
vulpes redact "text"    # CLI redaction
```

---

## Key Paths

| Path | Purpose |
|------|---------|
| `src/filters/*.ts` | 28 PHI detection filters |
| `src/rust/src/` | Native Rust accelerators |
| `src/core/images/` | OCR-based image redaction |
| `src/core/dicom/` | DICOM anonymization |
| `tests/master-suite/` | Full integration tests |

---

## Target Metrics

| Metric | Target |
|--------|--------|
| Sensitivity | ≥99% (CRITICAL) |
| Specificity | ≥96% |
| Speed | ≤3ms/doc |

---

## Fix Workflow

1. `vulpes.consult_history` - Was this solved before?
2. Make ONE change
3. `npm run build && npm test`
4. `vulpes.record_intervention` - Log your fix
5. If failing: `vulpes.diagnose_failure`
