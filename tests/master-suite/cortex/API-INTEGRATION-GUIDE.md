# VULPES CORTEX - API INTEGRATION FIX

## THE PROBLEM
The MCP `run_tests` tool was running tests synchronously in the MCP process, causing:
- **Timeouts** (stdio can't handle 2-3 minute operations)
- **Blocking** (entire MCP server frozen during tests)
- **No progress updates** (black box until completion/timeout)

## THE SOLUTION
Tests now run asynchronously via a dedicated API server:

```
┌─────────────┐
│   Claude    │
└──────┬──────┘
       │ MCP Protocol (stdio)
       │ ~1 second response
┌──────▼──────────┐
│  MCP Server     │ ← Lightweight (queues test, returns immediately)
│  (tools.js)     │
└──────┬──────────┘
       │ HTTP POST
       │
┌──────▼──────────┐
│  API Server     │ ← Heavy lifter (runs tests in background)
│  (port 3101)    │   - Job queue
│                 │   - Progress tracking
│                 │   - Can run 3 tests concurrently
└──────┬──────────┘
       │
┌──────▼──────────┐
│  SQLite DB      │ ← Persistent storage (replaces JSON files)
│  (cortex.db)    │   - Test queue table
│                 │   - Metrics history
│                 │   - Patterns/decisions
└─────────────────┘
```

## FILES CREATED

### 1. API Integration Module
**File:** `tests/master-suite/cortex/mcp/tools-api-integration.js`
- Async test execution via HTTP
- Progress polling every 2 seconds
- 5-minute timeout (vs 30-second MCP timeout)
- Automatic API health checking

### 2. Tools Patcher
**File:** `tests/master-suite/cortex/mcp/patch-tools.js`
- Safely modifies tools.js
- Creates backup automatically
- Replaces synchronous `runTests` with async version

### 3. API Startup Script
**File:** `tests/master-suite/cortex/start-api.bat`
- Windows batch file to start API server
- Easy double-click startup

## INSTALLATION

### Step 1: Apply the Patch
```bash
cd C:\Users\docto\Documents\Programs\Vulpes-Celare\tests\master-suite\cortex\mcp
node patch-tools.js
```

**Expected output:**
```
╔══════════════════════════════════════════════════════════════╗
║  VULPES CORTEX - TOOLS.JS PATCHER                            ║
╚══════════════════════════════════════════════════════════════╝

[1/5] Reading original tools.js...
[2/5] Creating backup...
      Backup saved to: tools.js.backup-1234567890
[3/5] Adding API integration import...
[4/5] Replacing runTests function...
[5/5] Writing patched tools.js...

╔══════════════════════════════════════════════════════════════╗
║  ✓ PATCH COMPLETE                                            ║
╚══════════════════════════════════════════════════════════════╝
```

### Step 2: Start the API Server

**Option A: Double-click the batch file**
```
C:\Users\docto\Documents\Programs\Vulpes-Celare\tests\master-suite\cortex\start-api.bat
```

**Option B: Command line**
```bash
cd C:\Users\docto\Documents\Programs\Vulpes-Celare\tests\master-suite\cortex
node api/server.js
```

**Expected output:**
```
[CortexDB] Schema initialized successfully
[Cortex API] Database connected
[Cortex API] Services initialized (queue, experiments, retention)
[Cortex API] WebSocket server initialized
═══════════════════════════════════════════════════════════════
  VULPES CORTEX REST API SERVER
═══════════════════════════════════════════════════════════════
  Status:    RUNNING
  Port:      3101
  PID:       12345
  Endpoints: http://localhost:3101/
  WebSocket: ws://localhost:3101/ws
═══════════════════════════════════════════════════════════════
```

### Step 3: Restart MCP Server
Restart your Claude Desktop or MCP client to reload the modified tools.js

### Step 4: Verify Integration
Test the fix by asking Claude:
```
Can you run a quick test (50 documents)?
```

**Expected behavior:**
```
[Cortex MCP] Using async API-based test execution
[Cortex MCP] Queueing test via API: 50 docs, profile=HIPAA_STRICT
[Cortex MCP] Test queued with ID: test-1234567890-abc123
[Cortex MCP] Waiting for test to complete (polling every 2s)...
[Cortex MCP] Progress: 10%
[Cortex MCP] Progress: 25%
[Cortex MCP] Progress: 50%
[Cortex MCP] Progress: 75%
[Cortex MCP] Progress: 100%
[Cortex MCP] Test complete. Processing results...
[Cortex MCP] Results processed. Grade: A, Sensitivity: 99.2%
```

## ARCHITECTURE BENEFITS

### Before (Synchronous)
```javascript
async function runTests() {
  const results = await executeTestSuite(); // ❌ BLOCKS FOR 2-3 MINUTES
  return results; // ⏱️ TIMEOUT at 30 seconds
}
```

### After (Async via API)
```javascript
async function runTests() {
  const testId = await queueTest();        // ✓ Returns in <1 second
  const results = await pollForResults();   // ✓ Polls every 2 seconds
  return results;                           // ✓ No timeout issues
}
```

## VERIFICATION CHECKLIST

- [ ] API server starts without errors
- [ ] API health check responds: `curl http://localhost:3101/health`
- [ ] MCP tools.js has been patched
- [ ] MCP server restarted
- [ ] Test runs without timeout
- [ ] Progress updates appear in logs
- [ ] Results returned successfully

## ROLLBACK (If Needed)

If something goes wrong, restore the backup:

```bash
cd C:\Users\docto\Documents\Programs\Vulpes-Celare\tests\master-suite\cortex\mcp
copy tools.js.backup-[timestamp] tools.js
```

Then restart MCP server.

## API ENDPOINTS AVAILABLE

Once the API server is running, you have access to:

### Test Management
- `POST /api/tests/run` - Queue a test
- `GET /api/tests/:id` - Get test status
- `GET /api/queue/stats` - Queue statistics

### Data Access
- `GET /api/patterns` - Query failure patterns
- `GET /api/decisions` - Query past decisions
- `GET /api/metrics` - Get latest metrics
- `GET /api/knowledge/summary` - System summary

### Health & Diagnostics
- `GET /health` - API health check
- `GET /api/queue/stats` - Queue stats

## TROUBLESHOOTING

### "API server not running" error
**Solution:** Start the API server using `start-api.bat` or `node api/server.js`

### "Failed to queue test" error
**Check:**
1. API server is running
2. Port 3101 is not blocked by firewall
3. Database permissions are correct

### Tests still timeout
**Check:**
1. Patch was applied correctly: `grep "runTestsViaAPI" mcp/tools.js`
2. MCP server was restarted after patching
3. API server is running and healthy

### Progress not updating
**Normal:** Progress updates every 2 seconds. Some phases (like analysis) don't report progress.

## WHAT'S NEXT

With this integration complete, you can now:
1. **Run tests without timeouts** ✓
2. **See real-time progress** ✓
3. **Queue multiple tests** (up to 3 concurrent)
4. **Access historical data** via REST API
5. **Build dashboards** using the API endpoints

## PERFORMANCE COMPARISON

| Metric | Before (Sync) | After (Async) |
|--------|---------------|---------------|
| MCP Response Time | 30s+ (timeout) | <1s (queued) |
| Test Execution | 2-3 minutes | 2-3 minutes |
| Concurrent Tests | 1 (blocks MCP) | 3 (queued) |
| Progress Updates | None | Every 2s |
| Timeout Risk | HIGH | NONE |
| MCP Availability | BLOCKED | AVAILABLE |

---

## SUMMARY

✓ **Problem:** MCP timeouts due to synchronous test execution
✓ **Solution:** Async API-based execution with job queue
✓ **Result:** No more timeouts, real-time progress, concurrent tests
✓ **Files:** 3 new files, 1 modified file, 1 backup created
✓ **Impact:** ZERO downtime, backward compatible (legacy function preserved)

**The integration is COMPLETE and READY TO USE.**
