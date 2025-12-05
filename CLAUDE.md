# VULPES CELARE - LLM OPERATOR INSTRUCTIONS

**👉 IMPORTANT: For comprehensive AI agent instructions, read [`INSTRUCTIONS_FOR_AI_AGENTS.md`](./INSTRUCTIONS_FOR_AI_AGENTS.md) in the project root first!**

This file contains a quick workflow summary. The comprehensive instructions explain:
- How to locate files without hard-coded paths
- Complete MCP setup for any user
- Available tools and how to use them
- Common mistakes and troubleshooting
- Detailed examples and best practices

---

## Quick Workflow Summary

### Step 0: Locate Project Root

**NEVER hard-code paths!** Ask the user:
```
"What's the full path to your Vulpes-Celare project directory?"
```

Once you know `<PROJECT_ROOT>`, use relative paths:
- Filters: `<PROJECT_ROOT>/src/redaction/filters/*.ts`
- Dictionaries: `<PROJECT_ROOT>/src/redaction/dictionaries/*.json`
- MCP Server: `<PROJECT_ROOT>/tests/master-suite/cortex/index.js`
- Test Runner: `<PROJECT_ROOT>/tests/master-suite/run.js`

### Step 1: Start MCP Server (If Not Already Running)

Check if you have MCP access:

**If you're Claude Desktop with MCP enabled:**
- Look for "vulpes-cortex" in connected servers
- Skip to Step 2

**If you need to start manually:**
```bash
cd <PROJECT_ROOT>
node tests/master-suite/cortex/index.js --server-window
```

This opens a **visible terminal window** showing server activity on port 3100.

### Step 2: Verify Server Health (MANDATORY)

```bash
curl http://localhost:3100/health
```

**YOU MUST SEE `"status": "running"` BEFORE PROCEEDING.**

Alternative:
```bash
cd <PROJECT_ROOT>
node tests/master-suite/cortex/index.js --check
```

### Step 3: Run Tests via MCP

**If you have MCP tools:**
```
[Call vulpes-cortex tool: run_tests with {quick: true, profile: "HIPAA_STRICT"}]
```

**If running manually:**
```bash
# Quick test (50 documents, ~10-15 seconds)
curl -X POST "http://localhost:3100/tool/run_tests" \
  -H "Content-Type: application/json" \
  -d "{\"quick\": true, \"profile\": \"HIPAA_STRICT\"}"

# Full test (200 documents, ~60 seconds)
curl -X POST "http://localhost:3100/tool/run_tests" \
  -H "Content-Type: application/json" \
  -d "{\"profile\": \"HIPAA_STRICT\"}"
```

**CRITICAL: DO NOT run tests directly via `node tests/master-suite/run.js` - that bypasses the MCP intelligence system!**

### Step 4: Interpret Results

The MCP response includes:
- **`metrics.sensitivity`** - % of PHI caught (MUST BE >= 99%)
- **`topFailure`** - Most common failure type with examples
- **`fileToEdit`** - Which file to modify
- **`action`** - Specific recommendation (based on history!)
- **`historicalContext`** - What was tried before

**Focus on sensitivity** - it's the most critical metric for HIPAA compliance.

### Step 5: Execute the Closed Loop

```
1. Read topFailure from test results
   ↓
2. Open the file from topFailure.fileToEdit (use <PROJECT_ROOT> + path)
   ↓
3. Make ONE targeted change
   ↓
4. Recompile if TypeScript: cd <PROJECT_ROOT> && npm run build
   ↓
5. Run tests again (Step 3)
   ↓
6. Compare sensitivity before/after
   ↓
7. If better → Keep change
   If worse → git checkout <file>
   ↓
8. Repeat until sensitivity >= 99%
```

---

## Key Locations (Relative to Project Root)

| What | Where |
|------|-------|
| Filters | `src/redaction/filters/*.ts` |
| Dictionaries | `src/redaction/dictionaries/*.json` |
| Config | `src/redaction/config/` |
| Test Results | `tests/results/` |
| MCP Server | `tests/master-suite/cortex/index.js` |
| Test Runner (internal) | `tests/master-suite/run.js` |

---

## MCP Server Commands Reference

All commands from `<PROJECT_ROOT>`:

| Command | Description |
|---------|-------------|
| `node tests/master-suite/cortex/index.js --server-window` | Start server in visible window |
| `node tests/master-suite/cortex/index.js --server` | Start server (daemon) |
| `node tests/master-suite/cortex/index.js --check` | Verify server running |
| `curl http://localhost:3100/health` | Check server health |
| `curl -X POST http://localhost:3100/tool/run_tests -d '{}'` | Run tests via MCP |

---

## Critical Rules

1. **NEVER hard-code file paths** - Always ask for project root first
2. **ALWAYS verify server is running** before running tests (health check mandatory)
3. **ALWAYS run tests via MCP server** - Never bypass it with direct run.js calls
4. **Make ONE change at a time** - Test, then decide keep/revert
5. **Prioritize sensitivity** (catching PHI) over specificity (avoiding false positives)
6. **Target: Sensitivity >= 99%, Grade A** under HIPAA_STRICT profile
7. **Consult history first** - Don't repeat past failures (use get_recommendation or consult_history tools)

---

## You Have Full Power

- **READ** any file (ask for project root path first)
- **EDIT** any file
- **RUN** tests (via MCP)
- **COMPARE** metrics
- **ROLLBACK** with git checkout

**DO NOT just analyze and report. EXECUTE THE FIXES.**

---

## Available Grading Profiles

Use the `profile` parameter to control test grading:

- **`HIPAA_STRICT`** (default): Zero tolerance - production validation
- **`DEVELOPMENT`**: Diminishing penalties - good for iteration
- **`RESEARCH`**: Minimal penalties - focus on patterns
- **`OCR_TOLERANT`**: Accounts for scanner artifacts

Example:
```bash
curl -X POST "http://localhost:3100/tool/run_tests" \
  -d "{\"quick\": true, \"profile\": \"DEVELOPMENT\"}"
```

---

## Example Fix Pattern

**Test shows**: NAME filter missed "O'Brien", "McDonald", "Van Der Berg"

**File**: `<PROJECT_ROOT>/src/redaction/filters/NameFilter.ts`

**Fix**: Add pattern for prefixed surnames:
```typescript
const namePatterns = [
  /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/,  // First Last
  /\b[A-Z][a-z]+\s+(?:O'|Mc|Mac|Van\s+(?:der\s+)?)[A-Z][a-z]+\b/,  // NEW: Compound surnames
  // ... other patterns
];
```

**Recompile**:
```bash
cd <PROJECT_ROOT>
npm run build
```

**Test again** and compare sensitivity before/after.

---

## Remember

The MCP server is the **brain** - it:
- Runs tests internally (no external spawning)
- Tracks historical patterns
- Consults what worked before
- Makes evidence-based recommendations

You are the **execution engine** - you:
- Read the results
- Write the actual fixes
- Execute the test-verify loop

Work together efficiently. Read [`INSTRUCTIONS_FOR_AI_AGENTS.md`](./INSTRUCTIONS_FOR_AI_AGENTS.md) for comprehensive guidance.
