# Vulpes Cortex - Self-Learning PHI Detection Intelligence

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  VULPES CORTEX                                                                ║
║  The Brain That Never Forgets                                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## Overview

Vulpes Cortex is a self-learning, self-improving test intelligence system for PHI detection.
It follows MCP (Model Context Protocol) gold standards and is designed to be:

- **Plug-and-play**: Auto-discovers and handshakes with any LLM/IDE/SDK
- **Self-running**: Operates autonomously with minimal intervention  
- **Self-learning**: Remembers everything, learns from every change
- **History-consulting**: ALWAYS checks what was tried before making recommendations

## Core Principle

> "Those who cannot remember the past are condemned to repeat it."

**The decision engine REFUSES to make recommendations without consulting history.**

Every recommendation includes:
- What similar things were tried before
- What worked and what failed
- Why this approach might be different
- Confidence based on historical evidence

## Directory Structure

```
cortex/
├── index.js                 # Main entry point - unified API
├── package.json             # Dependencies
├── README.md                # This file
│
├── core/                    # Core infrastructure (5 modules)
│   ├── config.js            # Central configuration
│   ├── knowledge-base.js    # Persistent memory (entities, relations)
│   ├── temporal-index.js    # Bi-temporal tracking
│   ├── metrics-engine.js    # Industry-standard metrics (F1, MCC, etc.)
│   └── codebase-analyzer.js # Filter/dictionary/pipeline awareness
│
├── learning/                # Learning systems (4 modules)
│   ├── pattern-recognizer.js    # WHY failures happen
│   ├── hypothesis-engine.js     # Form and test hypotheses
│   ├── intervention-tracker.js  # Track all changes and effects
│   └── insight-generator.js     # Synthesize actionable insights
│
├── experiments/             # Experiment framework (4 modules)
│   ├── experiment-runner.js     # A/B testing
│   ├── snapshot-manager.js      # Document versioning
│   ├── comparison-engine.js     # Before/after analysis
│   └── rollback-manager.js      # Auto-revert regressions
│
├── decision/                # Decision engine (4 modules)
│   ├── decision-engine.js       # MUST consult history!
│   ├── history-consultant.js    # Query historical data
│   ├── recommendation-builder.js # Evidence-based recommendations
│   └── codebase-state-tracker.js # Track codebase evolution
│
└── mcp/                     # MCP Protocol (4 modules)
    ├── server.js            # MCP server (stdio)
    ├── tools.js             # 16 executable tools
    ├── prompts.js           # 8 pre-built prompts
    └── handshake.js         # Auto-discovery
```

## Quick Start

### As a Module (in your tests)

```javascript
const cortex = require('./cortex');

// Initialize
await cortex.initialize();

// Analyze test results
const analysis = await cortex.analyzeResults(testResults, {
  analyzePatterns: true,
  generateInsights: true
});

// Get recommendation (ALWAYS consults history)
const recommendation = await cortex.getRecommendation('WHAT_TO_IMPROVE', {
  currentMetrics: analysis.metrics
});

// Consult history before making changes
const history = await cortex.consultHistory('Add fuzzy matching to SSN filter', {
  phiType: 'SSN'
});

// Record an intervention
const intervention = await cortex.recordIntervention({
  type: 'FILTER_MODIFICATION',
  description: 'Added fuzzy matching to SSN filter',
  target: { file: 'src/filters/SSNFilter.ts' },
  metricsBefore: beforeMetrics
});

// After testing, record the effect
await cortex.recordEffect(intervention.id, afterMetrics);
```

### As MCP Server (for Claude Desktop, Claude Code, Cursor, etc.)

#### Quick Start (Manual)

From your project root:
```bash
# Start MCP server in visible window (recommended)
node tests/master-suite/cortex/index.js --server-window

# OR: Start as background daemon
node tests/master-suite/cortex/index.js --server

# OR: Via npm script
cd tests/master-suite/cortex && npm run server
```

**Verify it's running:**
```bash
curl http://localhost:3100/health
# Should see: {"status":"running",...}
```

#### Claude Desktop Integration

Configure in your Claude Desktop settings:

**Location**: 
- Mac/Linux: `~/.config/claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**Configuration** (replace `<PROJECT_ROOT>` with your actual path):
```json
{
  "mcpServers": {
    "vulpes-cortex": {
      "command": "node",
      "args": [
        "<PROJECT_ROOT>/tests/master-suite/cortex/index.js",
        "--server"
      ]
    }
  }
}
```

**Example** (if your project is at `/home/alice/vulpes-celare`):
```json
{
  "mcpServers": {
    "vulpes-cortex": {
      "command": "node",
      "args": [
        "/home/alice/vulpes-celare/tests/master-suite/cortex/index.js",
        "--server"
      ]
    }
  }
}
```

After editing config:
1. Save the file
2. Completely close Claude Desktop
3. Reopen Claude Desktop
4. Ask Claude: "What MCP servers are connected?"
5. You should see `vulpes-cortex` listed

#### Other IDE Integration (Cursor, Zed, etc.)

Most MCP-compatible tools use similar config formats. Check your tool's documentation for the config file location, then use the same structure as Claude Desktop.

### Via CLI

```bash
# Show current status
node cortex --status

# Show help
node cortex --help
```

## MCP Tools Available (16)

### Analysis Tools
| Tool | Description |
|------|-------------|
| `analyze_test_results` | Analyze results with patterns and insights |
| `get_codebase_state` | Current filters, dictionaries, capabilities |
| `analyze_patterns` | Failure/success patterns |
| `get_metrics_trend` | Metric trends over time |

### Decision Tools
| Tool | Description |
|------|-------------|
| `get_recommendation` | Evidence-based recommendation (consults history!) |
| `consult_history` | Check what was tried before |
| `get_active_insights` | Current actionable insights |

### Experiment Tools
| Tool | Description |
|------|-------------|
| `create_experiment` | Create A/B experiment |
| `compare_results` | Compare before/after |
| `create_backup` | Backup before changes |
| `rollback` | Revert to backup |

### Management Tools
| Tool | Description |
|------|-------------|
| `record_intervention` | Log a change |
| `record_effect` | Log change effect |
| `create_hypothesis` | Create testable hypothesis |
| `generate_report` | Generate reports |
| `get_summary` | Quick system summary |

## MCP Prompts Available (8)

| Prompt | Description |
|--------|-------------|
| `analyze_test_failure` | Debug why a test failed |
| `improve_detection` | Plan improvements for PHI type |
| `review_recent_changes` | Review recent interventions |
| `plan_experiment` | Plan an A/B experiment |
| `debug_false_negatives` | Debug missed PHI |
| `debug_false_positives` | Debug over-detection |
| `status_report` | Get comprehensive status |
| `what_should_i_do_next` | Get prioritized next steps |

## Key Features

### 1. Bi-Temporal Tracking
Every piece of data is tracked with:
- **t_occurred**: When the event actually happened
- **t_recorded**: When we learned about it
- **t_valid**: When the knowledge is applicable

This enables "what did we know at time X?" queries.

### 2. Pattern Recognition
Automatically identifies failure patterns:
- OCR_CONFUSION (0/O, 1/l/I confusion)
- CASE_VARIATION (SMITH vs smith)
- FORMAT_VARIATION (555-1234 vs 5551234)
- DICTIONARY_MISS (name not in dictionary)
- CONTEXT_DEPENDENT (needs surrounding text)
- BOUNDARY_ERROR (partial matches)

### 3. Automatic Rollback
When experiments cause regression:
1. Detects metric degradation
2. Identifies the causing change
3. Auto-rollbacks (configurable)
4. Records for future learning

### 4. Smart Grading
Multiple grading profiles:
- **HIPAA_STRICT**: Zero tolerance for missed PHI
- **DEVELOPMENT**: Balanced for iteration
- **RESEARCH**: Focus on improvement rate
- **OCR_TOLERANT**: Accounts for OCR challenges

### 5. Codebase Awareness
Full understanding of:
- All filters and their capabilities
- All dictionaries and their sizes
- Pipeline flow and stages
- What changed between runs

## Integration with Test Runner

The test runner (`run.js`) automatically uses Cortex when available:

```bash
# Run with Cortex analysis
node tests/master-suite/run.js --count=200

# Show Cortex report
node tests/master-suite/run.js --cortex-report

# Show Cortex insights
node tests/master-suite/run.js --cortex-insights

# Disable Cortex (use legacy learning)
node tests/master-suite/run.js --no-cortex
```

## Storage

All data is stored as JSON in `tests/master-suite/cortex/storage/`:
- `knowledge/` - Knowledge base, patterns, insights
- `snapshots/` - Document snapshots for experiments
- `experiments/` - Experiment results

Benefits:
- Easy inspection and debugging
- Git-compatible
- No external database required
- Fully portable

## Architecture Philosophy

1. **Everything is tracked** - No change is forgotten
2. **History is mandatory** - Check before recommending
3. **Fail safe** - Auto-rollback on regression
4. **Evidence-based** - Recommendations cite history
5. **LLM-augmented** - Let LLMs do complex reasoning
6. **MCP-compliant** - Works with any compatible client

## License

MIT - Part of the Vulpes Celare project
