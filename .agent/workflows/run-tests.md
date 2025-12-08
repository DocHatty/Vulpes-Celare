---
description: Run the Vulpes Celare test suite with MCP server
---

# Run Test Suite Workflow

> See also: `.agent/CLAUDE.md` for comprehensive AI agent instructions

---

**MANDATORY: Follow these steps IN ORDER. Do NOT skip any step.**

## Step 0: Start BOTH Servers

**Two servers must be running:**

| Server | Port | Purpose |
|--------|------|---------|
| MCP Server | 3100 | Pattern recognition, hypothesis engine, MCP tools |
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

---

## Step 1: Verify Server Health (MANDATORY)

```bash
curl http://localhost:3100/health
curl http://localhost:3101/health
```

**Both must return `"status": "running"` before proceeding.**

**If MCP not running:**
```bash
node tests/master-suite/cortex/index.js --server-window
```

**If API not running:**
```bash
node tests/master-suite/cortex/api/server.js
```

**Troubleshooting:**
1. Check Node.js version: `node --version` (need >= 18)
2. Install dependencies: `cd tests/master-suite/cortex && npm install`
3. Check port conflicts: `netstat -ano | findstr :3100`

---

## Step 2: Run Tests

### If You Have MCP Tools (Claude Desktop)

```text
[Call vulpes-cortex MCP tool: run_tests with parameters:
{
  "quick": true,
  "profile": "HIPAA_STRICT"
}]
```

### If Running Manually (HTTP API)

**Quick test** (50 documents, ~10-15 seconds):

```bash
curl -X POST "http://localhost:3100/tool/run_tests" \
  -H "Content-Type: application/json" \
  -d "{\"quick\": true, \"profile\": \"HIPAA_STRICT\"}"
```

**Full test** (200 documents, ~60 seconds):

```bash
curl -X POST "http://localhost:3100/tool/run_tests" \
  -H "Content-Type: application/json" \
  -d "{\"profile\": \"HIPAA_STRICT\"}"
```

**Custom test**:

```bash
curl -X POST "http://localhost:3100/tool/run_tests" \
  -H "Content-Type: application/json" \
  -d "{\"documentCount\": 100, \"profile\": \"DEVELOPMENT\"}"
```

---

## Step 3: Interpret Results

The MCP server returns JSON with:

```json
{
  "success": true,
  "metrics": {
    "sensitivity": 96.5,      // % of PHI caught (MUST BE >= 99%)
    "specificity": 98.1,      // % of non-PHI left alone
    "grade": "B+",            // Letter grade (A/B/C/D/F)
    "mcc": 0.947              // Matthews Correlation Coefficient
  },
  "topFailure": {
    "type": "NAME",           // Most common failure type
    "count": 23,              // How many times
    "examples": [             // Actual missed PHI
      {"value": "O'Brien", "context": "...patient O'Brien..."}
    ],
    "fileToEdit": {
      "path": "src/filters/SmartNameFilterSpan.ts",
      "description": "Name detection filter"
    },
    "historicalContext": {    // What was tried before
      "summary": "Similar patterns missed 3 times",
      "warnings": ["Compound surnames need special handling"]
    }
  },
  "action": "Fix NAME detection (23 missed). Edit: src/filters/SmartNameFilterSpan.ts. Examples: \"O'Brien\", \"McDonald\". Suggested: Add O'prefix pattern."
}
```

**Key fields:**

- **`metrics.sensitivity`** - MOST IMPORTANT - must be >= 99%
- **`topFailure`** - What to fix first
- **`fileToEdit.path`** - Which file to edit (use `<PROJECT_ROOT>` + this path)
- **`action`** - One-liner: what to do next

---

## Step 4: Execute Fixes (If Improving)

### The Closed Loop

```text
1. Identify failure from test results
   ↓
2. Read the file: <PROJECT_ROOT>/<topFailure.fileToEdit.path>
   ↓
3. Make ONE targeted change
   ↓
4. Recompile (if TypeScript):
   cd <PROJECT_ROOT> && npm run build
   ↓
5. Run tests again (Step 3)
   ↓
6. Compare sensitivity before/after
   ↓
7. Better? → Keep change
   Worse? → git checkout <file>
   ↓
8. Repeat until sensitivity >= 99%
```

### Example Fix

**Problem**: NAME filter missed "O'Brien", "McDonald"

**File**: `src/filters/SmartNameFilterSpan.ts`

**Fix**: Add compound surname pattern

```typescript
const namePatterns = [
  /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/,  // Existing
  /\b[A-Z][a-z]+\s+(?:O'|Mc|Mac|Van\s+(?:der\s+)?)[A-Z][a-z]+\b/,  // NEW
];
```

**Recompile**:

```bash
cd <PROJECT_ROOT>
npm run build
```

**Test again** and compare metrics.

---

## Available Grading Profiles

Control test harshness with `profile` parameter:

| Profile | Use Case | Penalty Style |
|---------|----------|---------------|
| **HIPAA_STRICT** | Production validation | Zero tolerance - full penalties |
| **DEVELOPMENT** | Iterating on fixes | Diminishing returns - easier to improve |
| **RESEARCH** | Understanding patterns | Minimal penalties - focus on analysis |
| **OCR_TOLERANT** | Scanner artifacts | Accounts for OCR errors |

Example:

```bash
curl -X POST "http://localhost:3100/tool/run_tests" \
  -d "{\"quick\": true, \"profile\": \"DEVELOPMENT\"}"
```

---

## Key Locations

| What | Where |
|------|-------|
| Filters | `src/filters/*.ts` |
| Core Scoring | `src/core/WeightedPHIScorer.ts` |
| Cross-Type Logic | `src/core/CrossTypeReasoner.ts` |
| Confidence | `src/core/ConfidenceCalibrator.ts` |
| Dictionaries | `src/dictionaries/*.txt` |
| MCP Server | `tests/master-suite/cortex/index.js` (port 3100) |
| REST API | `tests/master-suite/cortex/api/server.js` (port 3101) |
| Test Results | `tests/results/verbose-*.log` |

---

## Critical Rules

1. **Ask for project root path** - Never assume or hard-code
2. **Verify server health** before every test run
3. **Run via MCP** - Never call `node tests/master-suite/run.js` directly
4. **One change at a time** - Makes cause-effect clear
5. **Prioritize sensitivity** - It's the most critical metric
6. **Target: >= 99% sensitivity, Grade A**
7. **Check history first** - Use MCP tools to avoid repeating failures

---

## Troubleshooting

### "Server won't start"

1. Check Node.js: `node --version` (need >= 18)
2. Install deps: `cd <PROJECT_ROOT>/tests/master-suite/cortex && npm install`
3. Check port: Is 3100 already in use?

### "Tests fail immediately"

1. Compile code: `cd <PROJECT_ROOT> && npm run build`
2. Check for TypeScript errors
3. Verify filter files are valid

### "MCP errors: Unexpected token 'X'" (CRITICAL)

This means something wrote to stdout instead of stderr!

**Fix immediately:**

```bash
cd <PROJECT_ROOT>/tests/master-suite
node scripts/check-stdout-safety.js
```

**Common causes:**

- `console.log()` → Replace with `console.error()`
- `process.stdout.write()` → Replace with `process.stderr.write()`

MCP uses stdout for JSON-RPC. ANY non-JSON breaks the protocol.

### "Can't find files"

- Did you ask for `<PROJECT_ROOT>`?
- Are you using relative paths?
- Double-check the path exists: `ls src/filters/`

---

**For complete guidance, see `.agent/CLAUDE.md`**
