# VULPES CELARE - LLM OPERATOR INSTRUCTIONS

## When User Says "Test the System" or "Run the Suite"

Execute this sequence **IN ORDER** - do NOT skip steps:

### 1. Start MCP Server in Visible Window
```bash
node tests/master-suite/cortex --server-window
```
This opens a **visible CMD window** showing MCP server activity on port 3100.
The user can see exactly what the server is doing.

### 2. MANDATORY: Verify Server is Running
```bash
curl http://localhost:3100/health
```
**YOU MUST SEE `"status": "running"` BEFORE PROCEEDING.**

Alternative verification:
```bash
node tests/master-suite/cortex --check
```

If you see "NOT RUNNING" or connection refused, the server failed. Debug before continuing.

### 3. Run Tests VIA THE MCP SERVER (NOT directly!)
```bash
curl -X POST "http://localhost:3100/tool/run_tests" -H "Content-Type: application/json" -d "{\"quick\": true}"
```

For a full assessment (200 documents):
```bash
curl -X POST "http://localhost:3100/tool/run_tests" -H "Content-Type: application/json" -d "{}"
```

**CRITICAL: Tests run INSIDE the MCP server. You will see activity in the CMD window.**
**DO NOT run tests directly via `node tests/master-suite/run.js` - that bypasses the MCP!**

### 4. Read the Response
The MCP server returns JSON with:
- `metrics`: sensitivity, specificity, F1, F2, grade
- `confusionMatrix`: TP, TN, FP, FN counts
- `topFailure`: The most common failure type with examples and file to edit
- `action`: A one-liner describing what to fix
- `allFailures`: Breakdown by PHI type
- `insights`: Historical patterns and recommendations

### 5. Execute the Closed Loop
You ARE the execution engine. Follow this loop:

1. **See the failure** - MCP response shows exactly what was missed (e.g., "0RIYO SANCHEZ")
2. **Read the filter** - Open the file from `topFailure.fileToEdit`
3. **Edit the file** - Add the pattern/entry to catch the missed PHI
4. **Run test again** - Call `run_tests` tool via MCP
5. **Compare metrics** - Did sensitivity improve?
   - Better: Keep the change
   - Worse: `git checkout <file>` to revert
6. **Repeat** until sensitivity >= 99%

## MCP Server Architecture

The MCP server is the **brain** - it:
- Runs tests INTERNALLY (no external process spawning)
- Tracks historical patterns across sessions
- Provides intelligent recommendations
- Records what worked and what didn't

The LLM:
- Reads compact JSON results from MCP
- Writes actual code fixes
- Executes the fix-test-verify loop

## MCP Server Commands Reference

| Command | Description |
|---------|-------------|
| `node tests/master-suite/cortex --server-window` | Start server in visible CMD window |
| `node tests/master-suite/cortex --server` | Start server (background daemon) |
| `node tests/master-suite/cortex --check` | Verify server is running |
| `curl http://localhost:3100/health` | Check server health |
| `curl -X POST http://localhost:3100/tool/run_tests` | Run tests via MCP |

## Key Locations

| What | Where |
|------|-------|
| Filters | `src/redaction/filters/*.ts` |
| Dictionaries | `src/redaction/dictionaries/*.json` |
| Config | `src/redaction/config/` |
| Test Results | `tests/results/` |
| MCP Server | `tests/master-suite/cortex/` |
| Master Test Runner | `tests/master-suite/run.js` (internal to MCP) |

## Critical Rules

1. **ALWAYS start MCP server with --server-window so user can see activity**
2. **ALWAYS verify MCP server is running before tests** - Use health check
3. **ALWAYS run tests via MCP server** - Never bypass it
4. Make ONE change at a time, test, then decide keep/revert
5. Prioritize sensitivity (catching PHI) over specificity (avoiding false positives)
6. Target: Sensitivity >= 99%, Grade A under HIPAA_STRICT profile

## You Have Full Power

- READ any file
- EDIT any file
- RUN tests (via MCP)
- COMPARE metrics
- ROLLBACK with git checkout

DO NOT just analyze and report. EXECUTE THE FIXES.
