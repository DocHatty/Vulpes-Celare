# VULPES CELARE - AI AGENT INSTRUCTIONS

> **Project**: HIPAA PHI redaction engine with 26 filters, 99.6% sensitivity, MCP-enabled test suite

---

## 🎯 Your Job

Help improve PHI detection by running tests via the MCP server and fixing failures.

---

## 🚀 Quick Workflow

### 1. Verify MCP Server

```bash
curl http://localhost:3100/health
```

Must see `"status": "running"` before proceeding.

**If not running:**

```bash
node tests/master-suite/cortex/index.js --server-window
```

### 2. Run Tests

```bash
# Quick test (50 docs, ~15 sec)
curl -X POST "http://localhost:3100/tool/run_tests" \
  -H "Content-Type: application/json" \
  -d "{\"quick\": true, \"profile\": \"HIPAA_STRICT\"}"

# Full test (200 docs, ~60 sec)
curl -X POST "http://localhost:3100/tool/run_tests" \
  -H "Content-Type: application/json" \
  -d "{\"profile\": \"HIPAA_STRICT\"}"
```

### 3. Fix Loop

```text
Read topFailure → Open suggested file → Make ONE change → Build → Test again
```

```bash
npm run build && curl -X POST "http://localhost:3100/tool/run_tests" -d "{\"quick\": true}"
```

**If sensitivity improves:** Keep change  
**If sensitivity worsens:** `git checkout <file>`

---

## 📍 Key Paths (Relative to Project Root)

| What | Where |
|------|-------|
| Filters | `src/redaction/filters/*.ts` |
| Dictionaries | `src/redaction/dictionaries/*.json` |
| Config | `src/redaction/config/` |
| MCP Server | `tests/master-suite/cortex/index.js` |
| Test Runner | `tests/master-suite/run.js` |
| Cortex Docs | `tests/master-suite/cortex/README.md` |

---

## 📊 Target Metrics (HIPAA_STRICT)

| Metric | Target |
|--------|--------|
| Sensitivity | ≥ 99% |
| Specificity | ≥ 96% |
| Grade | A |
| MCC | ≥ 0.95 |

---

## 🔧 MCP Tools Available

**Primary:**

- `run_tests` - Run test suite with metrics

**Analysis:**

- `get_codebase_state` - Current filter/dictionary state
- `analyze_patterns` - Failure patterns
- `get_metrics_trend` - Trends over time

**Decision:**

- `get_recommendation` - Evidence-based recommendations (consults history!)
- `consult_history` - What was tried before
- `get_active_insights` - Current insights

**Experiment:**

- `create_backup` / `rollback` - Safe experimentation

---

## ⚠️ Critical Rules

1. **NEVER hard-code paths** - Ask for project root first
2. **ALWAYS verify server** - Health check before tests
3. **ALWAYS use MCP** - Don't bypass with direct run.js
4. **ONE change at a time** - Test, then keep/revert
5. **Prioritize sensitivity** - Missing PHI = HIPAA violation
6. **Consult history** - Don't repeat past failures

---

## 🔍 Failure Investigation

| Failure Type | Check These Locations |
|-------------|----------------------|
| NAME | `filters/SmartNameFilterSpan.ts`, `dictionaries/firstNames.json`, `dictionaries/lastNames.json` |
| SSN | `filters/SSNFilterSpan.ts` |
| DATE | `filters/DateFilterSpan.ts` |
| PHONE | `filters/PhoneFilterSpan.ts` |
| ADDRESS | `filters/AddressFilterSpan.ts`, `dictionaries/` |
| MRN | `filters/MRNFilterSpan.ts` |

---

## 📚 Additional References

| Topic | Location |
|-------|----------|
| HIPAA Requirements | `docs/HIPAA.md` |
| Cortex System | `tests/master-suite/cortex/README.md` |
| Test Suite | `tests/master-suite/README.md` |
| AI Behavior Guidelines | `.agent/DEPLOYMENT_PROTOCOL.md` |
| UX Guidelines | `.agent/UX_GUIDELINES.md` |

---

**Remember:** You're the execution engine. Read results, write fixes, test, iterate. Target: Sensitivity ≥ 99%.
