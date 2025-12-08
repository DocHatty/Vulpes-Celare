# VULPES CELARE - AI AGENT INSTRUCTIONS

> **Project**: HIPAA PHI redaction engine with 26 filters, 99.6% sensitivity, MCP-enabled test suite

---

## 🎯 Your Job

Help improve PHI detection by running tests via the MCP/API servers and fixing failures.

---

## 🚀 Quick Workflow

### 0. Start BOTH Servers (REQUIRED FIRST STEP)

**Two servers must be running:**

| Server | Port | Purpose |
|--------|------|---------|
| MCP Server | 3100 | Pattern recognition, hypothesis engine, decision support |
| REST API | 3101 | Database operations, test streaming, experiments |

**Start both:**
```bash
# Windows
start "MCP" cmd /c "node tests/master-suite/cortex/index.js --server"
start "API" cmd /c "node tests/master-suite/cortex/api/server.js"

# Unix/Mac
node tests/master-suite/cortex/index.js --server &
node tests/master-suite/cortex/api/server.js &
```

### 1. Verify Servers

```bash
curl http://localhost:3100/health
curl http://localhost:3101/health
```

Both must respond with `"status": "running"` before proceeding.

**If MCP not running:**

```bash
node tests/master-suite/cortex/index.js --server-window
```

**If API not running:**

```bash
node tests/master-suite/cortex/api/server.js
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
| Filters | `src/filters/*.ts` |
| Core Scoring | `src/core/WeightedPHIScorer.ts` |
| Cross-Type Logic | `src/core/CrossTypeReasoner.ts` |
| Confidence Cal. | `src/core/ConfidenceCalibrator.ts` |
| ML Optimizer | `src/core/MLWeightOptimizer.ts` |
| Dictionaries | `src/dictionaries/*.txt` |
| MCP Server | `tests/master-suite/cortex/index.js` (port 3100) |
| REST API Server | `tests/master-suite/cortex/api/server.js` (port 3101) |
| Test Runner | `tests/master-suite/run.js` |
| Test Results | `tests/results/verbose-*.log` |
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

## 🔧 MCP Tools Available (Port 3100)

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

## 🌐 REST API Endpoints (Port 3101)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Server health check |
| `/api/patterns` | GET | Query failure patterns |
| `/api/metrics` | GET | Get latest metrics |
| `/api/decisions` | GET | Query past decisions |
| `/api/tests/run` | POST | Start async test |
| `/api/experiments` | GET | List experiments |
| `/api/knowledge/summary` | GET | Full knowledge summary |

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
