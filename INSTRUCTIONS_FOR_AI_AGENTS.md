# 🤖 INSTRUCTIONS FOR AI AGENTS (LLMs, Claude, ChatGPT, etc.)

**READ THIS FIRST** before helping with Vulpes Celare testing or improvements.

This document provides essential context for working efficiently with this codebase.

---

## 🎯 What Vulpes Celare Is

A **HIPAA PHI redaction engine** with:
- 26 specialized filters for names, SSNs, dates, addresses, etc.
- 99.6% sensitivity (catches PHI) 
- Self-learning test suite called **Vulpes Cortex**
- MCP (Model Context Protocol) integration for AI agent control

**Your job**: Help improve PHI detection by running tests and fixing failures.

---

## 🧠 Architecture You Need to Understand

### Two Operating Modes

#### Mode 1: Manual Testing (OLD WAY - Don't Use Unless MCP Unavailable)
```bash
# Old way - manual test running
node tests/master-suite/run.js --count 200
```
**Problem**: Runs once, forgets everything, no learning, requires human analysis.

#### Mode 2: MCP Server (PREFERRED - Use This!)
```bash
# New way - intelligent testing via MCP
node tests/master-suite/cortex/index.js --server
```
**Benefits**: 
- Learns from every test run
- Tracks patterns and history
- Makes evidence-based recommendations
- Runs tests via tools you can call
- Never forgets what worked/failed

---

## 📍 How to Locate Files (Path-Agnostic)

**DO NOT hard-code paths like `C:\Users\docto\...`** - other users have different paths!

### Finding the Project Root

When user says "work on Vulpes Celare" or similar, use these strategies:

1. **Ask where it is**:
   ```
   "What's the full path to your Vulpes-Celare directory?"
   ```

2. **Look for these signature files** at project root:
   - `package.json` with `"name": "vulpes-celare"`
   - `README.md` with "Vulpes Celare" header
   - `tests/master-suite/cortex/` directory exists
   - `src/redaction/filters/` directory exists

3. **Common locations** (try these):
   - User's current directory
   - `~/projects/vulpes-celare` or `~/Vulpes-Celare`
   - `~/Documents/Programs/Vulpes-Celare`
   - GitHub clone: wherever they cloned it

4. **Use relative paths** once you know project root:
   ```
   <project-root>/tests/master-suite/cortex/index.js
   <project-root>/src/redaction/filters/NameFilter.ts
   ```

### Key Directory Structure (Relative to Project Root)

```
<project-root>/
├── src/
│   └── redaction/
│       ├── filters/              # Where PHI detection logic lives
│       │   ├── NameFilter.ts
│       │   ├── SSNFilter.ts
│       │   ├── DateFilter.ts
│       │   └── ... (26 total filters)
│       ├── dictionaries/         # Word lists for detection
│       │   ├── firstNames.json
│       │   ├── lastNames.json
│       │   ├── medications.json
│       │   └── ... (various lists)
│       └── config/               # Configuration
│
├── tests/
│   └── master-suite/
│       ├── run.js                # Legacy test runner (don't use directly)
│       ├── cortex/               # MCP Server & Intelligence System
│       │   ├── index.js          # MAIN ENTRY POINT for MCP server
│       │   ├── mcp/
│       │   │   ├── server.js     # MCP protocol implementation
│       │   │   ├── tools.js      # 16 tools you can call
│       │   │   ├── prompts.js    # 8 workflow templates
│       │   │   └── handshake.js  # Auto-discovery
│       │   ├── core/             # 5 core modules
│       │   ├── learning/         # 4 learning modules
│       │   ├── experiments/      # 4 experiment modules
│       │   ├── decision/         # 4 decision modules
│       │   └── storage/          # Knowledge base data
│       └── assessment/
│           └── rigorous-assessment.js  # Test suite implementation
│
└── ... (other project files)
```

---

## 🚀 Workflow: How to Help the User

### Step 0: Identify Your Environment

Determine if you have MCP access:

**If you're Claude Desktop with MCP enabled:**
- ✅ You can use MCP tools directly
- Look for "vulpes-cortex" MCP server in your active connections
- Skip to [Step 2: Run Tests via MCP](#step-2-run-tests-via-mcp-tools)

**If you're Claude/ChatGPT web or don't have MCP:**
- ⚠️ You need to help user start MCP server manually
- Follow [Step 1: Manual Setup](#step-1-manual-mcp-server-setup)

---

### Step 1: Manual MCP Server Setup (If MCP Not Available)

**Ask user for project path first**:
```
"What's the full path to your Vulpes-Celare directory?"
```

Once you know `<project-root>`, guide user:

#### Start MCP Server (Visible Window)

```bash
cd <project-root>
node tests/master-suite/cortex/index.js --server-window
```

This opens a **visible CMD/terminal window** showing server activity on port 3100.

**Why `--server-window`?**
- User can SEE what's happening
- Shows test progress in real-time
- Easier to debug if something fails
- Window stays open, showing all activity

#### Verify Server is Running

```bash
curl http://localhost:3100/health
```

**Expected response**:
```json
{
  "status": "running",
  "server": "vulpes-cortex",
  "version": "1.0.0",
  "uptime": 45.2,
  "modules": 17,
  "pid": 12345
}
```

If you get "connection refused" or error, the server didn't start. Debug:
1. Check Node.js is installed (`node --version` should be >= 18)
2. Check dependencies installed (`npm install` in cortex directory)
3. Look at error messages in the server window

---

### Step 2: Run Tests via MCP (Tools)

**If you have MCP access:**

Call the `run_tests` tool directly:
```
[Use vulpes-cortex MCP tool: run_tests with {quick: true, profile: "HIPAA_STRICT"}]
```

**If user is running MCP server manually:**

Guide them to call the HTTP API:

```bash
# Quick test (50 documents, ~10-15 seconds)
curl -X POST "http://localhost:3100/tool/run_tests" \
  -H "Content-Type: application/json" \
  -d "{\"quick\": true, \"profile\": \"HIPAA_STRICT\"}"

# Full test (200 documents, ~60 seconds)
curl -X POST "http://localhost:3100/tool/run_tests" \
  -H "Content-Type: application/json" \
  -d "{\"documentCount\": 200, \"profile\": \"HIPAA_STRICT\"}"
```

**Available Profiles**:
- `HIPAA_STRICT` (default): Zero tolerance for missed PHI - production validation
- `DEVELOPMENT`: Diminishing penalties - good for iterative improvement
- `RESEARCH`: Minimal penalties - focus on understanding patterns
- `OCR_TOLERANT`: Accounts for scanner artifacts

---

### Step 3: Interpret Results

The response is JSON with this structure:

```json
{
  "success": true,
  "timestamp": "2025-12-05T13:45:00.000Z",
  
  "metrics": {
    "sensitivity": 96.5,        // % of PHI caught (MOST IMPORTANT)
    "specificity": 98.1,        // % of non-PHI not flagged
    "precision": 94.3,
    "f1Score": 95.4,
    "f2Score": 95.9,           // Weighted toward sensitivity
    "mcc": 0.947,              // Matthews Correlation Coefficient (-1 to 1, >0.95 is excellent)
    "grade": "B+",             // Letter grade (A/B/C/D/F)
    "score": 89.2              // Numeric score (0-100)
  },
  
  "confusionMatrix": {
    "truePositives": 1234,     // PHI correctly caught
    "trueNegatives": 8765,     // Non-PHI correctly left alone
    "falsePositives": 45,      // Non-PHI incorrectly flagged
    "falseNegatives": 23,      // PHI MISSED (!!!)
    "totalPHI": 1257,
    "totalNonPHI": 8810
  },
  
  "topFailure": {
    "type": "NAME",            // What type of PHI was most missed
    "count": 23,               // How many times
    "examples": [              // Actual examples of what was missed
      {
        "value": "O'Brien",
        "context": "...patient O'Brien presented with...",
        "errorLevel": "CRITICAL"
      }
    ],
    "fileToEdit": {
      "path": "src/redaction/filters/NameFilter.ts",
      "lineHint": null,
      "description": "Name detection filter"
    },
    "historicalContext": {
      "summary": "Similar surname patterns have been missed 3 times before",
      "previousSuccesses": 2,
      "previousFailures": 1,
      "warnings": [
        "Compound surnames often need dictionary additions"
      ],
      "suggestedApproach": "Add pattern for O'prefix names or add to dictionary"
    }
  },
  
  "action": "Fix NAME detection (23 missed). Edit: src/redaction/filters/NameFilter.ts. Examples: \"O'Brien\", \"McDonald\", \"Van Der Berg\". Suggested: Add pattern for O'prefix names.",
  
  "allFailures": [
    {"type": "NAME", "count": 23},
    {"type": "DATE", "count": 5},
    {"type": "PHONE", "count": 2}
  ],
  
  "insights": {
    "critical": [
      "NAME detection sensitivity dropped 3% since last run"
    ],
    "high": [
      "Compound surnames pattern emerging"
    ],
    "opportunities": [
      "Add fuzzy matching for OCR errors in names"
    ]
  }
}
```

### What to Focus On

1. **`metrics.sensitivity`** - MOST IMPORTANT
   - Must be >= 99% for HIPAA compliance
   - If < 99%, you MUST fix failures

2. **`topFailure`** - What to fix first
   - Shows most common failure type
   - Gives examples
   - Tells you which file to edit
   - Provides historical context

3. **`action`** - Clear next step
   - One-liner describing what to do
   - Based on history of what worked before

---

### Step 4: Execute Fixes

#### The Closed-Loop Process

```
1. Identify failure from test results
   ↓
2. Read the relevant filter/dictionary file
   ↓
3. Make ONE targeted change
   ↓
4. Run tests again (Step 2)
   ↓
5. Compare sensitivity before/after
   ↓
6. If better → Keep change
   If worse → Revert (git checkout <file>)
   ↓
7. Repeat until sensitivity >= 99%
```

#### Example Fix Workflow

**Test shows**: NAME filter missed "O'Brien", "McDonald", "Van Der Berg"

**Analysis**: These are compound surnames with prefixes

**File to edit**: `<project-root>/src/redaction/filters/NameFilter.ts`

**Read the file first**:
```typescript
// Look for the pattern matching section
// Usually has regex patterns like:
const namePatterns = [
  /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/,  // First Last
  // ... other patterns
];
```

**Add pattern for prefixed surnames**:
```typescript
const namePatterns = [
  /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/,  // First Last
  /\b[A-Z][a-z]+\s+(?:O'|Mc|Mac|Van\s+(?:der\s+)?)[A-Z][a-z]+\b/,  // Compound surnames
  // ... other patterns
];
```

**Recompile** (if TypeScript):
```bash
cd <project-root>
npm run build
```

**Test again** (Step 2):
```bash
curl -X POST "http://localhost:3100/tool/run_tests" \
  -H "Content-Type: application/json" \
  -d "{\"quick\": true}"
```

**Compare**:
- Before: sensitivity 96.5%
- After: sensitivity 98.2%
- ✅ IMPROVEMENT → Keep the change

**If sensitivity got WORSE**:
```bash
git checkout src/redaction/filters/NameFilter.ts
npm run build
```

#### Types of Fixes

| Failure Type | Typical Fix Location | Example Fix |
|-------------|---------------------|-------------|
| NAME | `filters/NameFilter.ts` | Add pattern, update dictionary |
| SSN | `filters/SSNFilter.ts` | Handle format variations, OCR errors |
| DATE | `filters/DateFilter.ts` | Add date format pattern |
| PHONE | `filters/PhoneFilter.ts` | Add format pattern (international?) |
| ADDRESS | `filters/AddressFilter.ts` | Add street suffix, city name |
| MRN | `filters/MRNFilter.ts` | Add hospital-specific format |
| MEDICATION | `dictionaries/medications.json` | Add drug name to list |
| DIAGNOSIS | `dictionaries/diagnoses.json` | Add condition to list |

---

### Step 5: Track Progress

**Goal Metrics** (HIPAA_STRICT profile):
- Sensitivity: >= 99% (MUST ACHIEVE)
- Specificity: >= 96% (nice to have)
- Grade: A (90+ score)
- MCC: >= 0.95

**After each fix**:
1. Note the before/after sensitivity
2. Track which types of failures remain
3. Prioritize by count (fix most common failures first)
4. Stop when sensitivity >= 99%

---

## 🛠️ Available MCP Tools (If You Have Access)

If you're running with MCP enabled, you have these tools:

### Primary Tool

**`run_tests`** - Runs full test suite
- Parameters:
  - `quick: boolean` - Quick test (50 docs) vs full (200 docs)
  - `profile: string` - Grading profile (HIPAA_STRICT, DEVELOPMENT, etc.)
  - `documentCount: number` - Custom document count
  - `focusPhiType: string` - Focus on specific PHI type (NAME, SSN, etc.)
- Returns: Full analysis with metrics, failures, action

### Analysis Tools

**`get_codebase_state`** - Get current filter/dictionary state
- Returns: All filters, their capabilities, known gaps

**`analyze_patterns`** - Analyze failure patterns
- Parameters: `phiType: string`, `limit: number`
- Returns: Recurring failure types, why they happen

**`get_metrics_trend`** - See metric trends over time
- Parameters: `metric: string`, `days: number`
- Returns: Is sensitivity improving or declining?

### Decision Tools

**`get_recommendation`** - Get evidence-based recommendation
- Parameters: `type: string`, `context: object`
- **ALWAYS consults history first**
- Returns: What to do next, with confidence level

**`consult_history`** - Check what was tried before
- Parameters: `query: string`, `phiType: string`
- Returns: Previous attempts, what worked, what failed

**`get_active_insights`** - Current system insights
- Returns: Warnings, opportunities, recommendations

### Experiment Tools

**`create_experiment`** - Set up A/B test
**`compare_results`** - Compare before/after
**`create_backup`** / **`rollback`** - Safe experimentation

### Other Tools

**`record_intervention`** - Log what you changed
**`generate_report`** - Status report
**`get_summary`** - Quick overview

---

## 🚫 Common Mistakes to Avoid

### Mistake 1: Not Starting MCP Server
**Wrong**:
```bash
# Running tests directly - bypasses intelligence system
node tests/master-suite/run.js
```

**Right**:
```bash
# Start MCP server first, then run via MCP
node tests/master-suite/cortex/index.js --server
curl -X POST http://localhost:3100/tool/run_tests -d '{}'
```

### Mistake 2: Hard-Coding Paths
**Wrong**:
```
"Edit C:\Users\docto\Documents\Programs\Vulpes-Celare\src\filters\NameFilter.ts"
```

**Right**:
```
"Edit <project-root>/src/redaction/filters/NameFilter.ts
What's your project root path?"
```

### Mistake 3: Making Multiple Changes at Once
**Wrong**:
```typescript
// Changed 5 things - which one helped?
```

**Right**:
```typescript
// Change ONE thing, test, then decide keep/revert
```

### Mistake 4: Not Verifying Server Health
**Wrong**:
```bash
# Assume server is running
curl -X POST http://localhost:3100/tool/run_tests
```

**Right**:
```bash
# Verify first
curl http://localhost:3100/health
# See "status": "running"? Good, proceed.
```

### Mistake 5: Ignoring Historical Context
**Wrong**:
```
"Let's try adding fuzzy matching"
(This was tried 3 times before and failed every time)
```

**Right**:
```
[Call consult_history tool first]
"History shows fuzzy matching failed 3 times. Let's try X instead."
```

---

## 💡 Pro Tips for LLMs

1. **Always ask for project path** - Don't assume
2. **Check MCP availability** - Use tools if available, else guide manual setup
3. **Verify server before tests** - Health check is mandatory
4. **Read historical context** - Don't repeat past failures
5. **One change at a time** - Makes cause-effect clear
6. **Prioritize by count** - Fix most common failures first
7. **Target sensitivity** - It's the most important metric
8. **Revert bad changes** - Don't be afraid to undo
9. **Use DEVELOPMENT profile** - When iterating (less harsh penalties)
10. **Switch to HIPAA_STRICT** - For final validation

---

## 📚 Key Principles

### Sensitivity > Specificity
- Missing PHI (false negative) = HIPAA violation
- Over-redacting (false positive) = inconvenient but safe
- **ALWAYS prioritize catching PHI**

### History Matters
- The system learns from every test
- Before making recommendations, CHECK what was tried before
- Don't repeat failures

### Iterative Improvement
- Small changes, test, verify
- Ratchet up sensitivity gradually
- Don't expect 99% on first try

### Evidence-Based
- Use actual test failures as evidence
- Don't guess at patterns
- Let data guide decisions

---

## 🎓 Example Session

**User**: "Help me improve my PHI detection"

**You**: 
```
Sure! Let me help you run tests and improve detection.

First, what's the full path to your Vulpes-Celare project directory?
```

**User**: "/home/alice/projects/vulpes-celare"

**You**:
```
Great! Let me start the MCP server for you.

Run this command:
cd /home/alice/projects/vulpes-celare
node tests/master-suite/cortex/index.js --server-window

Wait for the server window to show "VULPES CORTEX MCP SERVER - RUNNING"
Then let me know when it's ready.
```

**User**: "It's running"

**You**:
```
Perfect! Let me verify it's healthy and run a quick test.

curl http://localhost:3100/health

[Sees "status": "running"]

Now running tests:

curl -X POST "http://localhost:3100/tool/run_tests" \
  -H "Content-Type: application/json" \
  -d "{\"quick\": true, \"profile\": \"HIPAA_STRICT\"}"

[Reads response...]

Results:
- Grade: B+ (89.2/100)
- Sensitivity: 96.5% (Need 99%+)
- Top Failure: NAME detection missed 23 instances

Examples of missed names: "O'Brien", "McDonald", "Van Der Berg"

These are compound surnames with prefixes. Let me check the NameFilter...

[Reads /home/alice/projects/vulpes-celare/src/redaction/filters/NameFilter.ts]

I see the issue - there's no pattern for surnames with O', Mc, Mac, Van prefixes.

Let me add this pattern:
[Shows exact code change]

After you make this change, run:
npm run build

Then test again with:
curl -X POST "http://localhost:3100/tool/run_tests" \
  -H "Content-Type: application/json" \
  -d "{\"quick\": true}"

Let's see if sensitivity improves!
```

---

## 🆘 Troubleshooting

### "Server won't start"
1. Check Node.js version: `node --version` (need >= 18)
2. Install dependencies: `cd <project-root>/tests/master-suite/cortex && npm install`
3. Check for port conflicts: `lsof -i :3100` (Unix) or `netstat -ano | findstr :3100` (Windows)

### "Tests fail immediately"
1. Check if code compiles: `npm run build` in project root
2. Look for TypeScript errors
3. Check if src/redaction/filters/*.ts files are valid

### "Sensitivity won't improve"
1. Are you fixing the actual failures shown in results?
2. Are you recompiling after changes? (`npm run build`)
3. Are you reverting bad changes?
4. Try DEVELOPMENT profile for faster iteration

### "MCP tools not available"
1. Check Claude Desktop config: `~/.config/claude/claude_desktop_config.json` (Linux/Mac) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)
2. Restart Claude Desktop
3. Verify server in config points to: `<project-root>/tests/master-suite/cortex/index.js --server`

---

## ✅ Success Criteria

You've succeeded when:
- ✅ Sensitivity >= 99.0%
- ✅ Grade = A (under HIPAA_STRICT profile)
- ✅ MCC >= 0.95
- ✅ No critical insights remaining

---

**Remember**: You're not just analyzing - you're actively improving the system. Read files, make changes, test, iterate. Be the execution engine, not just the advisor.

Good luck! 🚀
