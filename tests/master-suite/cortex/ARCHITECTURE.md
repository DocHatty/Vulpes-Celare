# Vulpes Cortex Architecture

## Overview

Vulpes Cortex is a **100% local** system for testing and improving PHI redaction.
**No data ever leaves your machine** - everything runs on localhost.

## Architecture Layers

```
LLM (Claude)
    |
    | MCP Protocol (stdio - local)
    v
MCP SERVER (mcp/server.js)
    |
    |---> tools-api-integration.js ---> API SERVER (localhost:3101)
    |                                        |
    v                                        v
CORE SERVICES (core/services/)          JOB QUEUE
    |                                        |
    v                                        v
ResultProcessor <---------------------- Test Execution
    |
    v
DATABASE (SQLite local file)
```

## Key Principles

### 1. Separation of Concerns

| Layer | Responsibility | Files |
|-------|---------------|-------|
| Transport | Protocol handling only | mcp/server.js, api/server.js |
| Services | Business logic | core/services/index.js |
| Processing | Result enrichment | core/result-processor.js |
| Data | Storage/retrieval | db/database.js |

### 2. Single Source of Truth

- **ResultProcessor** - ALL result processing logic lives here
- **Services** - ALL business logic lives here
- No duplication between MCP and API layers

### 3. HIPAA Compliance (Local Only)

- MCP: stdio communication (no network)
- API: localhost:3101 only (not exposed)
- Database: Local SQLite file
- No external HTTP calls anywhere

## File Structure

```
cortex/
├── api/
│   ├── server.js           # REST API (uses services)
│   ├── queue.js            # Async job queue
│   ├── experiments.js      # Experiment runner
│   └── retention.js        # Data retention
├── core/
│   ├── services/
│   │   └── index.js        # All service classes
│   ├── result-processor.js # Result processing logic
│   ├── metrics-engine.js   # Metrics calculations
│   └── knowledge-base.js   # Knowledge storage
├── db/
│   └── database.js         # SQLite wrapper
├── mcp/
│   ├── server.js           # MCP protocol handler
│   ├── tools.js            # Tool definitions (routing only)
│   ├── tools-api-integration.js # API client
│   └── prompts.js          # Prompt definitions
└── index.js                # Main entry point
```

## Data Flow: Running Tests

1. LLM calls `run_tests` tool via MCP
2. MCP routes to `runTests()` in tools.js
3. `runTests()` calls `runTestsViaAPI()`
4. API client queues test via POST /api/tests/run
5. Job queue executes test asynchronously
6. API client polls GET /api/tests/:id
7. On completion, `ResultProcessor.processTestResults()` enriches results
8. Enriched results returned to LLM

## Services Reference

| Service | Methods | Purpose |
|---------|---------|---------|
| patterns | query, getTrending, getByPhiType, record | Pattern recognition |
| metrics | getLatest, getTrend, record, compare | Performance metrics |
| decisions | query, get, record, consult | Decision history |
| tests | enqueue, getStatus, getProcessedResult | Test execution |
| experiments | query, create, get, update | A/B testing |
| interventions | query, record, update | Change tracking |
| knowledge | getSummary, search | Unified queries |
| audit | verify, getHead, record | Blockchain audit |

## Adding New Features

### Adding a New API Endpoint
1. Add route in `api/server.js`
2. Call service method (never direct DB)
3. Return JSON response

### Adding a New MCP Tool
1. Add tool definition in `mcp/tools.js` TOOLS array
2. Add case in `executeTool()` switch
3. Create handler function that calls services

## Security

- No external network calls
- No credentials stored
- No PHI transmitted externally
- Runs entirely on localhost
