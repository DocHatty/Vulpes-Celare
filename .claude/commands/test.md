# PHI Redaction Test Engine

You are now running the Vulpes Celare PHI redaction test system.

## Step 1: Start Infrastructure

Start BOTH servers (required):

```bash
# Start MCP Server (port 3100)
start "MCP" cmd /c "node tests/master-suite/cortex/index.js --server"

# Start REST API Server (port 3101)  
start "API" cmd /c "node tests/master-suite/cortex/api/server.js"
```

## Step 2: Verify Servers

```bash
curl http://localhost:3100/health
curl http://localhost:3101/health
```

Both must return `{"status":"running"...}` before proceeding.

## Step 3: Run Tests

```bash
node tests/master-suite/run.js --log-file --profile=HIPAA_STRICT
```

**CRITICAL**: Always use `--log-file` flag. Console output truncates.

## Step 4: Read Full Results

```bash
# Find and read latest log (NOT truncated)
cat tests/results/verbose-*.log | tail -500
```

## Step 5: Fix Loop

1. Identify TOP failure pattern from log
2. Make ONE focused fix
3. Run `npm run build`
4. Re-test and compare metrics
5. If worse: `git checkout <file>`
6. Repeat until Sensitivity >= 99%

## Key Files

| Purpose | Location |
|---------|----------|
| Filters | `src/filters/*.ts` |
| Scoring | `src/core/WeightedPHIScorer.ts` |
| Cross-Type | `src/core/CrossTypeReasoner.ts` |
| Calibration | `src/core/ConfidenceCalibrator.ts` |
| Dictionaries | `src/dictionaries/*.txt` |

## Target Metrics

- Sensitivity: >= 99%
- Specificity: >= 96%  
- Grade: A

**Priority**: Sensitivity > Specificity (missing PHI = HIPAA violation)

---

Now execute these steps. Start the servers, verify health, run tests, and report findings.
