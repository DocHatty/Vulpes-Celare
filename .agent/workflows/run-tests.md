---
description: Run the Vulpes Celare test suite with MCP server
---

# Run Test Suite Workflow

**MANDATORY: Follow these steps IN ORDER. Do NOT skip any step.**

## Step 1: Start MCP Server in Visible Window

// turbo

```bash
node tests/master-suite/cortex --server-window
```

This opens a **visible CMD window** on port 3100. Wait 3 seconds for startup.

## Step 2: Verify Server is Running

// turbo

```bash
curl http://localhost:3100/health
```

**YOU MUST SEE `"status": "running"` BEFORE PROCEEDING.**

If you see "NOT RUNNING" or connection refused, the server failed. Debug before continuing.

## Step 3: Run Tests VIA the MCP Server

// turbo

```bash
curl -X POST "http://localhost:3100/tool/run_tests" -H "Content-Type: application/json" -d "{}"
```

For quick test (50 docs):

```bash
curl -X POST "http://localhost:3100/tool/run_tests" -H "Content-Type: application/json" -d "{\"quick\": true}"
```

**CRITICAL: DO NOT run tests directly via `node tests/master-suite/run.js` - that bypasses the MCP!**

## Step 4: Read the MCP Response

The MCP server returns JSON with:

- `metrics`: sensitivity, specificity, F1, F2, **MCC** (Matthews Correlation Coefficient), grade
- `confusionMatrix`: TP, TN, FP, FN counts, with integrity check
- `topFailure`: The most common failure type with examples and file to edit
- `action`: A one-liner describing what to fix
- `allFailures`: Breakdown by PHI type
- `insights`: Historical patterns and recommendations

### Grading Profiles

Use the `profile` parameter to control grading:

- **HIPAA_STRICT** (default): Full linear penalties - use for production validation
- **DEVELOPMENT**: Diminishing penalties - useful for iterative improvement
- **RESEARCH**: Minimal penalties - focus on understanding patterns

Example with profile:

```bash
curl -X POST "http://localhost:3100/tool/run_tests" -H "Content-Type: application/json" -d "{\"quick\": true, \"profile\": \"DEVELOPMENT\"}"
```

## Step 5: Execute the Closed Loop (if improving)

1. **See the failure** - MCP response shows exactly what was missed
2. **Read the filter** - Open the file from `topFailure.fileToEdit`
3. **Edit the file** - Add the pattern/entry to catch the missed PHI
4. **Run test again** - Call `run_tests` tool via MCP (Step 3)
5. **Compare metrics** - Did sensitivity improve?
   - Better: Keep the change
   - Worse: `git checkout <file>` to revert
6. **Repeat** until sensitivity >= 99%

## Key Locations

| What | Where |
|------|-------|
| Filters | `src/redaction/filters/*.ts` |
| Dictionaries | `src/redaction/dictionaries/*.json` |
| Config | `src/redaction/config/` |
| Test Results | `tests/results/` |
| MCP Server | `tests/master-suite/cortex/` |

## Critical Rules

1. **ALWAYS start MCP server with --server-window**
2. **ALWAYS verify MCP server is running before tests**
3. **ALWAYS run tests via MCP server HTTP API**
4. Make ONE change at a time, test, then decide keep/revert
5. Target: Sensitivity >= 99%, Grade A under HIPAA_STRICT profile
