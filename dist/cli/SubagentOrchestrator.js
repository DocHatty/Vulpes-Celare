"use strict";
/**
 * ============================================================================
 * VULPES CELARE - INTELLIGENT SUBAGENT ORCHESTRATION SYSTEM
 * ============================================================================
 *
 * A workflow-aware multi-agent architecture with DYNAMIC parallel/serial
 * execution based on task dependencies and intelligent routing.
 *
 * KEY INNOVATION: The orchestrator understands Vulpes workflows and
 * automatically determines optimal execution strategy.
 *
 * WORKFLOW PATTERNS (Auto-detected):
 *
 * 1. PHI LEAK FIX WORKFLOW (Serial - dependency chain)
 *    ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
 *    │ SCOUT   │ → │ ANALYST │ → │ ENGINEER│ → │ TESTER  │ → │ AUDITOR │
 *    │(scan)   │   │(diagnose│   │(fix)    │   │(verify) │   │(certify)│
 *    └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
 *
 * 2. BATCH DOCUMENT SCAN (Parallel - independent)
 *    ┌─────────┐
 *    │ SCOUT-1 │──┐
 *    └─────────┘  │   ┌─────────────┐
 *    ┌─────────┐  ├──→│ AGGREGATOR  │
 *    │ SCOUT-2 │──┤   │ (combine)   │
 *    └─────────┘  │   └─────────────┘
 *    ┌─────────┐  │
 *    │ SCOUT-N │──┘
 *    └─────────┘
 *
 * 3. REGRESSION HUNT (Hybrid - parallel scan, serial fix)
 *    ┌──────────────────────────┐
 *    │    PARALLEL PHASE        │
 *    │  ┌───────┐ ┌───────┐    │    ┌─────────┐   ┌─────────┐
 *    │  │SCOUT  │ │ANALYST│    │ →  │ENGINEER │ → │ TESTER  │
 *    │  └───────┘ └───────┘    │    │(fix)    │   │(verify) │
 *    └──────────────────────────┘    └─────────┘   └─────────┘
 *
 * SUBAGENT ROLES (Redesigned for Vulpes workflows):
 *
 * 1. SCOUT - Fast reconnaissance
 *    - Quick document scanning
 *    - PHI detection
 *    - Pattern identification
 *    - Returns structured findings
 *
 * 2. ANALYST - Deep investigation
 *    - Root cause analysis
 *    - Filter behavior analysis
 *    - Dictionary coverage gaps
 *    - Detailed diagnostics
 *
 * 3. ENGINEER - Code modifications
 *    - Filter fixes
 *    - Regex improvements
 *    - Dictionary updates
 *    - Returns precise diffs
 *
 * 4. TESTER - Validation
 *    - Run test suites
 *    - Metric comparison
 *    - Regression detection
 *    - Pass/fail verdicts
 *
 * 5. AUDITOR - Compliance & quality
 *    - HIPAA compliance check
 *    - Risk assessment
 *    - Quality certification
 *    - Final sign-off
 *
 * 6. SETUP - Environment preparation
 *    - MCP server status
 *    - API connectivity
 *    - Cortex initialization
 *    - Returns readiness report
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKFLOW_TEMPLATES = exports.SUBAGENT_TOOLS = exports.SUBAGENT_PROMPTS = exports.SubagentOrchestrator = void 0;
exports.createOrchestrator = createOrchestrator;
exports.detectWorkflow = detectWorkflow;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const SecurityUtils_1 = require("../utils/SecurityUtils");
const figures_1 = __importDefault(require("figures"));
const p_queue_1 = __importDefault(require("p-queue"));
const VulpesCelare_1 = require("../VulpesCelare");
const APIProvider_1 = require("./APIProvider");
const SystemPrompts_1 = require("./SystemPrompts");
const VulpesStore_1 = require("./VulpesStore");
// Import unified theme system
const theme_1 = require("../theme");
const VulpesOutput_1 = require("../utils/VulpesOutput");
// Theme imported from unified theme system (../theme)
// ============================================================================
// WORKFLOW DETECTION - The "Brain" that chooses execution strategy
// ============================================================================
const WORKFLOW_PATTERNS = {
    leak_fix: {
        keywords: [
            "leak",
            "missed",
            "not redacted",
            "false negative",
            "PHI exposed",
            "fix",
            "patch",
        ],
        workflow: "phi_leak_fix",
    },
    batch: {
        keywords: [
            "batch",
            "multiple",
            "all files",
            "directory",
            "bulk",
            "scan all",
        ],
        workflow: "batch_scan",
    },
    regression: {
        keywords: [
            "regression",
            "broke",
            "was working",
            "stopped",
            "after update",
            "compare",
        ],
        workflow: "regression_hunt",
    },
    compliance: {
        keywords: [
            "HIPAA",
            "compliance",
            "audit",
            "certify",
            "review",
            "safe harbor",
        ],
        workflow: "compliance_audit",
    },
    dictionary: {
        keywords: [
            "dictionary",
            "add name",
            "missing name",
            "surname",
            "hospital",
            "false positive",
        ],
        workflow: "dictionary_update",
    },
    quick: {
        keywords: [
            "quick",
            "scan",
            "check",
            "test this",
            "redact this",
            "try this",
        ],
        workflow: "quick_scan",
    },
    system: {
        keywords: [
            "setup",
            "initialize",
            "MCP",
            "API",
            "status",
            "health",
            "ready",
        ],
        workflow: "system_check",
    },
};
function detectWorkflow(userMessage) {
    const messageLower = userMessage.toLowerCase();
    let bestMatch = "custom";
    let bestScore = 0;
    for (const [, pattern] of Object.entries(WORKFLOW_PATTERNS)) {
        const score = pattern.keywords.filter((kw) => messageLower.includes(kw)).length;
        if (score > bestScore) {
            bestScore = score;
            bestMatch = pattern.workflow;
        }
    }
    return bestMatch;
}
// ============================================================================
// WORKFLOW TEMPLATES - Pre-defined execution plans
// ============================================================================
const WORKFLOW_TEMPLATES = {
    phi_leak_fix: (ctx) => ({
        type: "phi_leak_fix",
        mode: "serial",
        description: "PHI Leak Fix: Scout → Analyst → Engineer → Tester → Auditor",
        phases: [
            [
                {
                    id: "scout-1",
                    role: "scout",
                    prompt: `Scan this text for PHI and identify what was missed:\n\n${ctx.text || ctx.input}`,
                    phase: 0,
                },
            ],
            [
                {
                    id: "analyst-1",
                    role: "analyst",
                    prompt: "Analyze the scout findings. Identify which filter failed and why. Check dictionary coverage.",
                    dependsOn: ["scout-1"],
                    phase: 1,
                },
            ],
            [
                {
                    id: "engineer-1",
                    role: "engineer",
                    prompt: "Based on the analysis, write the specific code fix needed. Include exact file, line, and diff.",
                    dependsOn: ["analyst-1"],
                    phase: 2,
                },
            ],
            [
                {
                    id: "tester-1",
                    role: "tester",
                    prompt: "Run tests to verify the fix works. Check for regressions. Report metrics.",
                    dependsOn: ["engineer-1"],
                    phase: 3,
                },
            ],
            [
                {
                    id: "auditor-1",
                    role: "auditor",
                    prompt: "Final compliance check. Verify the PHI is now properly redacted. Sign off or reject.",
                    dependsOn: ["tester-1"],
                    phase: 4,
                },
            ],
        ],
    }),
    batch_scan: (ctx) => {
        const files = ctx.files || [];
        const scoutTasks = files.map((file, i) => ({
            id: `scout-${i}`,
            role: "scout",
            prompt: `Scan file for PHI: ${file}`,
            phase: 0,
        }));
        return {
            type: "batch_scan",
            mode: "parallel",
            description: `Batch Scan: ${files.length} files in parallel`,
            phases: [
                scoutTasks.length > 0
                    ? scoutTasks
                    : [
                        {
                            id: "scout-1",
                            role: "scout",
                            prompt: ctx.input || "Scan for PHI",
                            phase: 0,
                        },
                    ],
            ],
        };
    },
    regression_hunt: (ctx) => ({
        type: "regression_hunt",
        mode: "hybrid",
        description: "Regression Hunt: Parallel diagnosis → Serial fix",
        phases: [
            // Phase 0: Parallel diagnosis
            [
                {
                    id: "scout-1",
                    role: "scout",
                    prompt: `Scan current behavior: ${ctx.input}`,
                    phase: 0,
                },
                {
                    id: "analyst-1",
                    role: "analyst",
                    prompt: "Check recent filter changes. Compare with expected behavior.",
                    phase: 0,
                },
            ],
            // Phase 1: Serial fix
            [
                {
                    id: "engineer-1",
                    role: "engineer",
                    prompt: "Based on diagnosis, identify and fix the regression.",
                    dependsOn: ["scout-1", "analyst-1"],
                    phase: 1,
                },
            ],
            [
                {
                    id: "tester-1",
                    role: "tester",
                    prompt: "Verify regression is fixed. Run full test suite.",
                    dependsOn: ["engineer-1"],
                    phase: 2,
                },
            ],
        ],
    }),
    compliance_audit: (ctx) => ({
        type: "compliance_audit",
        mode: "serial",
        description: "Compliance Audit: Scout → Auditor",
        phases: [
            [
                {
                    id: "scout-1",
                    role: "scout",
                    prompt: `Scan document for complete PHI inventory:\n\n${ctx.text || ctx.input}`,
                    phase: 0,
                },
            ],
            [
                {
                    id: "auditor-1",
                    role: "auditor",
                    prompt: "Full HIPAA Safe Harbor compliance review. Check all 18 identifier types.",
                    dependsOn: ["scout-1"],
                    phase: 1,
                },
            ],
        ],
    }),
    dictionary_update: (ctx) => ({
        type: "dictionary_update",
        mode: "serial",
        description: "Dictionary Update: Analyst → Engineer → Tester",
        phases: [
            [
                {
                    id: "analyst-1",
                    role: "analyst",
                    prompt: `Analyze dictionary coverage for: ${ctx.term || ctx.input}. Check all relevant dictionaries.`,
                    phase: 0,
                },
            ],
            [
                {
                    id: "engineer-1",
                    role: "engineer",
                    prompt: "Update dictionaries based on analysis. Add or remove entries as needed.",
                    dependsOn: ["analyst-1"],
                    phase: 1,
                },
            ],
            [
                {
                    id: "tester-1",
                    role: "tester",
                    prompt: "Verify dictionary changes work. Check for new false positives.",
                    dependsOn: ["engineer-1"],
                    phase: 2,
                },
            ],
        ],
    }),
    quick_scan: (ctx) => ({
        type: "quick_scan",
        mode: "serial",
        description: "Quick Scan: Scout only",
        phases: [
            [
                {
                    id: "scout-1",
                    role: "scout",
                    prompt: `Quick PHI scan:\n\n${ctx.text || ctx.input}`,
                    phase: 0,
                },
            ],
        ],
    }),
    system_check: (_ctx) => ({
        type: "system_check",
        mode: "serial",
        description: "System Check: Setup agent",
        phases: [
            [
                {
                    id: "setup-1",
                    role: "setup",
                    prompt: "Check system readiness: MCP servers, API connectivity, Cortex status, dictionaries loaded.",
                    phase: 0,
                },
            ],
        ],
    }),
    custom: (ctx) => ({
        type: "custom",
        mode: "serial",
        description: "Custom task",
        phases: [
            [
                {
                    id: "scout-1",
                    role: "scout",
                    prompt: ctx.input || "Analyze request",
                    phase: 0,
                },
            ],
        ],
    }),
};
exports.WORKFLOW_TEMPLATES = WORKFLOW_TEMPLATES;
// ============================================================================
// SUBAGENT SYSTEM PROMPTS - Redesigned for workflow roles
// ============================================================================
const SUBAGENT_PROMPTS = {
    scout: `You are SCOUT - Vulpes Celare's fast reconnaissance agent.

PURPOSE: Quick, accurate PHI detection and pattern identification.

CAPABILITIES:
- Scan text/documents for all PHI types
- Identify what was detected vs what might be missed
- Flag confidence levels for each finding
- Batch process multiple inputs efficiently

OUTPUT FORMAT (JSON):
{
  "scan_id": "unique-id",
  "input_length": 1234,
  "phi_detected": [
    {"type": "NAME", "value": "John Smith", "redacted_as": "[NAME-1]", "confidence": 0.95, "position": [0, 10]}
  ],
  "potential_misses": [
    {"text": "Dr. Xyz", "likely_type": "NAME", "reason": "Unusual format", "position": [50, 57]}
  ],
  "potential_false_positives": [
    {"text": "Ace", "detected_as": "NAME", "likely_actual": "ACE inhibitor medication"}
  ],
  "risk_level": "low|medium|high|critical",
  "summary": "One-line summary"
}

Be FAST. Be PRECISE. Structured output only.`,
    analyst: `You are ANALYST - Vulpes Celare's diagnostic specialist.

PURPOSE: Deep investigation of PHI detection issues and root cause analysis.

OPERATING ENVIRONMENT:
- OS: Windows (PowerShell)
- Forbidden: 'sed', 'awk', 'grep'
- Use: Node.js scripts, PowerShell commands

CAPABILITIES:
- Analyze why PHI was missed or incorrectly flagged
- Investigate filter behavior and regex patterns
- Check dictionary coverage gaps
- Compare expected vs actual behavior
- Trace issues to specific code locations

KEY KNOWLEDGE:
- 27 filters in src/filters/
- Dictionaries: first-names.txt (~30K), surnames.txt (~162K), hospitals.txt (~6K)
- SpanBasedFilter is the base class
- ParallelRedactionEngine runs all filters simultaneously

OUTPUT FORMAT (JSON):
{
  "diagnosis": {
    "issue_type": "false_negative|false_positive|performance|other",
    "root_cause": "Detailed explanation",
    "affected_filter": "NameFilterSpan.ts",
    "affected_line": 145,
    "evidence": ["Supporting facts"]
  },
  "dictionary_analysis": {
    "checked": ["surnames.txt"],
    "missing_entries": ["Brzezinski"],
    "problematic_entries": []
  },
  "recommendations": [
    {"priority": "high", "action": "Add entry to surnames.txt", "rationale": "..."}
  ]
}

Be THOROUGH. Find the root cause, not just symptoms.`,
    engineer: `You are ENGINEER - Vulpes Celare's code modification specialist.

PURPOSE: Write precise, minimal code fixes for PHI detection issues.

OPERATING ENVIRONMENT:
- OS: Windows (PowerShell)
- Forbidden: 'sed', 'awk', 'grep'
- Use: Node.js scripts, PowerShell commands

CAPABILITIES:
- Modify filter regex patterns
- Update dictionary files
- Adjust filter logic
- Write targeted fixes (no over-engineering)

KEY FILES:
- src/filters/*FilterSpan.ts - PHI type filters
- src/core/SpanBasedFilter.ts - Base class
- src/dictionaries/*.txt - Name/location lists
- src/utils/PhoneticMatcher.ts - Fuzzy name matching

OUTPUT FORMAT (JSON):
{
  "changes": [
    {
      "file": "src/filters/NameFilterSpan.ts",
      "type": "modify|add|delete",
      "line": 145,
      "old_code": "const pattern = /[A-Z][a-z]+/",
      "new_code": "const pattern = /[A-Z][a-z]+(?:-[A-Z][a-z]+)?/",
      "explanation": "Handle hyphenated names"
    }
  ],
  "dictionary_changes": [
    {"file": "surnames.txt", "action": "add", "entry": "Brzezinski"}
  ],
  "test_suggestion": "Add test case for hyphenated names"
}

Be MINIMAL. Change only what's needed. Test your regex mentally.`,
    tester: `You are TESTER - Vulpes Celare's validation specialist.

PURPOSE: Run tests, verify fixes, detect regressions.

CAPABILITIES:
- Execute test suites (npm test)
- Compare before/after metrics
- Check for sensitivity/specificity changes
- Validate specific fixes work

TARGET METRICS (CRITICAL THRESHOLDS):
- Sensitivity: ≥99% (catch nearly all PHI)
- Specificity: ≥96% (minimize false positives)
- Speed: ≤3ms per document

OUTPUT FORMAT (JSON):
{
  "test_run": {
    "command": "npm test",
    "exit_code": 0,
    "duration_ms": 12500
  },
  "results": {
    "total": 47,
    "passed": 47,
    "failed": 0,
    "skipped": 0
  },
  "metrics": {
    "sensitivity": 0.996,
    "specificity": 0.982,
    "avg_time_ms": 2.3
  },
  "regressions": [],
  "verdict": "PASS|FAIL|NEEDS_REVIEW",
  "notes": "All tests passing"
}

Be OBJECTIVE. Numbers don't lie. FAIL if metrics drop below thresholds.`,
    auditor: `You are AUDITOR - Vulpes Celare's compliance and quality specialist.

PURPOSE: Final compliance verification and quality certification.

CAPABILITIES:
- HIPAA Safe Harbor compliance checking (17/18 identifiers)
- Risk assessment for residual PHI
- Quality certification
- Compliance reporting

HIPAA SAFE HARBOR IDENTIFIERS:
1. Names ✓
2. Geographic data ✓
3. Dates ✓
4. Phone numbers ✓
5. Fax numbers ✓
6. Email addresses ✓
7. SSN ✓
8. Medical record numbers ✓
9. Health plan numbers ✓
10. Account numbers ✓
11. Certificate/license numbers ✓
12. Vehicle identifiers ✓
13. Device identifiers ✓
14. URLs ✓
15. IP addresses ✓
16. Biometric identifiers ✓
17. Photos/images ✗ (not text-based)
18. Any other unique identifier ✗ (context-dependent)

OUTPUT FORMAT (JSON):
{
  "compliance_check": {
    "status": "COMPLIANT|NON_COMPLIANT|NEEDS_REVIEW",
    "identifiers_verified": {
      "names": {"found": 3, "redacted": 3, "status": "pass"},
      "ssn": {"found": 1, "redacted": 1, "status": "pass"}
    },
    "coverage": "17/18 Safe Harbor identifiers"
  },
  "risk_assessment": {
    "level": "low|medium|high|critical",
    "residual_phi": [],
    "exposure_risk": "Description of any remaining risk"
  },
  "certification": {
    "approved": true,
    "certifier": "AUDITOR",
    "timestamp": "ISO-8601",
    "notes": "Document meets HIPAA Safe Harbor requirements"
  }
}

Be THOROUGH. Missing PHI = potential HIPAA violation. When in doubt, flag it.`,
    setup: `You are SETUP - Vulpes Celare's environment preparation specialist.

PURPOSE: Ensure system readiness for PHI redaction operations.

CAPABILITIES:
- Check MCP server status (Vulpes Cortex)
- Verify API connectivity
- Validate dictionary loading
- Check Cortex database status
- Report system health

COMPONENTS TO CHECK:
- Vulpes Cortex MCP server
- Dictionary files (first-names, surnames, hospitals, cities)
- Test suite availability
- Build status
- Node.js environment

OUTPUT FORMAT (JSON):
{
  "system_status": {
    "overall": "ready|degraded|unavailable",
    "timestamp": "ISO-8601"
  },
  "components": {
    "mcp_server": {"status": "running|stopped|error", "details": "..."},
    "dictionaries": {"status": "loaded", "counts": {"first_names": 30000, "surnames": 162000}},
    "cortex_db": {"status": "connected", "path": "..."},
    "api_keys": {"anthropic": "configured", "openai": "missing"}
  },
  "recommendations": [
    {"priority": "high", "action": "Start MCP server", "command": "npm run mcp:start"}
  ]
}

Be COMPREHENSIVE. Check everything. Report clearly.`,
};
exports.SUBAGENT_PROMPTS = SUBAGENT_PROMPTS;
// ============================================================================
// SUBAGENT TOOLS - Role-specific capabilities
// ============================================================================
const SUBAGENT_TOOLS = {
    scout: [
        {
            name: "scan_text",
            description: "Scan text for PHI using Vulpes engine",
            input_schema: {
                type: "object",
                properties: {
                    text: { type: "string", description: "Text to scan" },
                },
                required: ["text"],
            },
        },
        {
            name: "scan_file",
            description: "Scan a file for PHI",
            input_schema: {
                type: "object",
                properties: {
                    path: { type: "string", description: "File path" },
                },
                required: ["path"],
            },
        },
        {
            name: "batch_scan",
            description: "Scan multiple texts",
            input_schema: {
                type: "object",
                properties: {
                    texts: {
                        type: "array",
                        items: { type: "string" },
                        description: "Array of texts",
                    },
                },
                required: ["texts"],
            },
        },
    ],
    analyst: [
        {
            name: "read_filter",
            description: "Read a filter source file",
            input_schema: {
                type: "object",
                properties: {
                    filter_name: {
                        type: "string",
                        description: "Filter name without extension",
                    },
                },
                required: ["filter_name"],
            },
        },
        {
            name: "search_code",
            description: "Search codebase for pattern",
            input_schema: {
                type: "object",
                properties: {
                    pattern: { type: "string", description: "Regex pattern" },
                    path: { type: "string", description: "Directory to search" },
                },
                required: ["pattern"],
            },
        },
        {
            name: "check_dictionary",
            description: "Check if term exists in dictionary",
            input_schema: {
                type: "object",
                properties: {
                    dictionary: {
                        type: "string",
                        enum: ["first-names", "surnames", "hospitals", "cities"],
                    },
                    term: { type: "string", description: "Term to check" },
                },
                required: ["dictionary", "term"],
            },
        },
        {
            name: "list_filters",
            description: "List all available filters",
            input_schema: { type: "object", properties: {} },
        },
    ],
    engineer: [
        {
            name: "read_file",
            description: "Read any source file",
            input_schema: {
                type: "object",
                properties: {
                    path: { type: "string", description: "File path" },
                },
                required: ["path"],
            },
        },
        {
            name: "write_file",
            description: "Write content to file",
            input_schema: {
                type: "object",
                properties: {
                    path: { type: "string", description: "File path" },
                    content: { type: "string", description: "File content" },
                },
                required: ["path", "content"],
            },
        },
        {
            name: "append_dictionary",
            description: "Append entry to dictionary",
            input_schema: {
                type: "object",
                properties: {
                    dictionary: { type: "string", description: "Dictionary name" },
                    entry: { type: "string", description: "Entry to add" },
                },
                required: ["dictionary", "entry"],
            },
        },
    ],
    tester: [
        {
            name: "run_tests",
            description: "Run test suite",
            input_schema: {
                type: "object",
                properties: {
                    filter: { type: "string", description: "Test filter pattern" },
                    quick: { type: "boolean", description: "Quick mode" },
                },
            },
        },
        {
            name: "run_single_test",
            description: "Run specific test file",
            input_schema: {
                type: "object",
                properties: {
                    file: { type: "string", description: "Test file path" },
                },
                required: ["file"],
            },
        },
        {
            name: "compare_metrics",
            description: "Compare before/after metrics",
            input_schema: {
                type: "object",
                properties: {
                    before: { type: "object", description: "Before metrics" },
                    after: { type: "object", description: "After metrics" },
                },
                required: ["before", "after"],
            },
        },
    ],
    auditor: [
        {
            name: "audit_document",
            description: "Full compliance audit of document",
            input_schema: {
                type: "object",
                properties: {
                    original: { type: "string", description: "Original text" },
                    redacted: { type: "string", description: "Redacted text" },
                },
                required: ["original", "redacted"],
            },
        },
        {
            name: "check_safe_harbor",
            description: "Check HIPAA Safe Harbor compliance",
            input_schema: {
                type: "object",
                properties: {
                    text: { type: "string", description: "Redacted text" },
                },
                required: ["text"],
            },
        },
        {
            name: "generate_report",
            description: "Generate compliance report",
            input_schema: {
                type: "object",
                properties: {
                    findings: { type: "object", description: "Audit findings" },
                },
                required: ["findings"],
            },
        },
    ],
    setup: [
        {
            name: "check_mcp",
            description: "Check MCP server status",
            input_schema: { type: "object", properties: {} },
        },
        {
            name: "check_dictionaries",
            description: "Check dictionary loading status",
            input_schema: { type: "object", properties: {} },
        },
        {
            name: "check_api_keys",
            description: "Check API key configuration",
            input_schema: { type: "object", properties: {} },
        },
        {
            name: "run_health_check",
            description: "Run full system health check",
            input_schema: { type: "object", properties: {} },
        },
    ],
};
exports.SUBAGENT_TOOLS = SUBAGENT_TOOLS;
// ============================================================================
// SUBAGENT CLASS
// ============================================================================
class Subagent {
    role;
    provider;
    vulpes;
    workingDir;
    constructor(role, provider, workingDir, _verbose = false) {
        this.role = role;
        this.provider = provider;
        this.vulpes = new VulpesCelare_1.VulpesCelare();
        this.workingDir = workingDir;
    }
    async execute(task, previousResults) {
        const startTime = Date.now();
        // Build context from dependent tasks
        let contextPrompt = "";
        if (task.dependsOn && previousResults) {
            const deps = task.dependsOn
                .map((id) => previousResults.get(id))
                .filter(Boolean);
            if (deps.length > 0) {
                contextPrompt =
                    "\n\nPREVIOUS RESULTS:\n" +
                        deps
                            .map((d) => `[${d.role.toUpperCase()}]: ${d.result || d.error}`)
                            .join("\n\n");
            }
        }
        try {
            const messages = [
                { role: "system", content: SUBAGENT_PROMPTS[this.role] },
                { role: "user", content: task.prompt + contextPrompt },
            ];
            let response = "";
            const tools = SUBAGENT_TOOLS[this.role];
            for await (const event of this.provider.streamChat(messages, {
                maxTokens: 4096,
                tools: tools.length > 0 ? tools : undefined,
            })) {
                if (event.type === "text" && event.text) {
                    response += event.text;
                }
                if (event.type === "tool_use_start" && event.toolUse) {
                    const toolResult = await this.executeTool(event.toolUse.name, event.toolUse.input || {});
                    response += `\n\n[Tool: ${event.toolUse.name}]\n${toolResult}`;
                }
            }
            // Try to extract structured findings
            let findings = undefined;
            const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
                try {
                    findings = JSON.parse(jsonMatch[1]);
                }
                catch { }
            }
            return {
                taskId: task.id,
                role: this.role,
                success: true,
                result: response,
                findings,
                executionTimeMs: Date.now() - startTime,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                taskId: task.id,
                role: this.role,
                success: false,
                error: message,
                executionTimeMs: Date.now() - startTime,
            };
        }
    }
    async executeTool(name, input) {
        switch (name) {
            // Scout tools
            case "scan_text":
                return this.toolScanText(input.text);
            case "scan_file":
                return this.toolScanFile(input.path);
            case "batch_scan":
                return this.toolBatchScan(input.texts);
            // Analyst tools
            case "read_filter":
                return this.toolReadFilter(input.filter_name);
            case "search_code":
                return this.toolSearchCode(input.pattern, input.path);
            case "check_dictionary":
                return this.toolCheckDictionary(input.dictionary, input.term);
            case "list_filters":
                return this.toolListFilters();
            // Engineer tools
            case "read_file":
                return this.toolReadFile(input.path);
            case "write_file":
                return this.toolWriteFile(input.path, input.content);
            case "append_dictionary":
                return this.toolAppendDictionary(input.dictionary, input.entry);
            // Tester tools
            case "run_tests":
                return this.toolRunTests(input.filter, input.quick);
            case "run_single_test":
                return this.toolRunTests(input.file);
            case "compare_metrics":
                return this.toolCompareMetrics(input.before, input.after);
            // Auditor tools
            case "audit_document":
                return this.toolAuditDocument(input.original, input.redacted);
            case "check_safe_harbor":
                return this.toolCheckSafeHarbor(input.text);
            case "generate_report":
                return JSON.stringify(input.findings, null, 2);
            // Setup tools
            case "check_mcp":
                return this.toolCheckMcp();
            case "check_dictionaries":
                return this.toolCheckDictionaries();
            case "check_api_keys":
                return this.toolCheckApiKeys();
            case "run_health_check":
                return this.toolRunHealthCheck();
            default:
                return `Unknown tool: ${name}`;
        }
    }
    // Tool implementations
    async toolScanText(text) {
        const result = await this.vulpes.process(text);
        return JSON.stringify({
            original: text.slice(0, 200) + (text.length > 200 ? "..." : ""),
            redacted: result.text,
            phi_count: result.redactionCount,
            breakdown: result.breakdown,
            time_ms: result.executionTimeMs,
        });
    }
    async toolScanFile(filePath) {
        const fullPath = path.resolve(this.workingDir, filePath);
        if (!fs.existsSync(fullPath))
            return `File not found: ${filePath}`;
        const content = fs.readFileSync(fullPath, "utf-8");
        return this.toolScanText(content);
    }
    async toolBatchScan(texts) {
        const results = await Promise.all(texts.map(async (t, i) => {
            const r = await this.vulpes.process(t);
            return {
                index: i,
                phi_count: r.redactionCount,
                time_ms: r.executionTimeMs,
            };
        }));
        return JSON.stringify({ batch_size: texts.length, results });
    }
    toolReadFilter(filterName) {
        const filePath = path.join(this.workingDir, "src", "filters", `${filterName}.ts`);
        if (!fs.existsSync(filePath)) {
            // Try with FilterSpan suffix
            const altPath = path.join(this.workingDir, "src", "filters", `${filterName}FilterSpan.ts`);
            if (!fs.existsSync(altPath))
                return `Filter not found: ${filterName}`;
            return fs.readFileSync(altPath, "utf-8");
        }
        return fs.readFileSync(filePath, "utf-8");
    }
    toolSearchCode(pattern, searchPath) {
        try {
            const targetPath = searchPath
                ? (0, SecurityUtils_1.validatePath)(this.workingDir, searchPath)
                : path.join(this.workingDir, "src");
            // Use safeGrep which prevents command injection
            // This is sync context so we use a simplified approach
            const isWindows = process.platform === "win32";
            if (isWindows) {
                const result = (0, SecurityUtils_1.safeExecSync)("findstr", ["/N", "/S", "/C:" + pattern, path.join(targetPath, "*.ts")], { cwd: this.workingDir, timeout: 10000 });
                return result.split("\n").slice(0, 30).join("\n") || "No matches";
            }
            else {
                const result = (0, SecurityUtils_1.safeExecSync)("grep", ["-r", "-n", "--include=*.ts", "--", pattern, targetPath], { cwd: this.workingDir, timeout: 10000 });
                return result.split("\n").slice(0, 30).join("\n") || "No matches";
            }
        }
        catch {
            return "No matches found";
        }
    }
    toolCheckDictionary(dictionary, term) {
        const dictPath = path.join(this.workingDir, "src", "dictionaries", `${dictionary}.txt`);
        if (!fs.existsSync(dictPath))
            return `Dictionary not found: ${dictionary}`;
        const content = fs.readFileSync(dictPath, "utf-8");
        const lines = content.split("\n");
        const termLower = term.toLowerCase();
        const matches = lines
            .map((l, i) => ({ line: i + 1, entry: l.trim() }))
            .filter((l) => l.entry.toLowerCase().includes(termLower));
        return JSON.stringify({
            dictionary,
            term,
            found: matches.length > 0,
            matches: matches.slice(0, 5),
        });
    }
    toolListFilters() {
        const dir = path.join(this.workingDir, "src", "filters");
        if (!fs.existsSync(dir))
            return "Filters directory not found";
        return fs
            .readdirSync(dir)
            .filter((f) => f.endsWith(".ts"))
            .join("\n");
    }
    toolReadFile(filePath) {
        try {
            const fullPath = (0, SecurityUtils_1.validatePath)(this.workingDir, filePath);
            if (!fs.existsSync(fullPath))
                return `File not found: ${filePath}`;
            return fs.readFileSync(fullPath, "utf-8");
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return `Security error: ${message}`;
        }
    }
    toolWriteFile(filePath, content) {
        try {
            const fullPath = (0, SecurityUtils_1.validatePath)(this.workingDir, filePath);
            fs.writeFileSync(fullPath, content, "utf-8");
            return `Written ${content.length} bytes to ${filePath}`;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return `Security error: ${message}`;
        }
    }
    toolAppendDictionary(dictionary, entry) {
        const dictPath = path.join(this.workingDir, "src", "dictionaries", `${dictionary}.txt`);
        if (!fs.existsSync(dictPath))
            return `Dictionary not found: ${dictionary}`;
        fs.appendFileSync(dictPath, `\n${entry}`);
        return `Appended "${entry}" to ${dictionary}.txt`;
    }
    toolRunTests(filter, quick) {
        return new Promise((resolve) => {
            const args = ["test"];
            if (quick)
                args.push("--", "--quick");
            if (filter)
                args.push("--", `--filter=${filter}`);
            const proc = (0, child_process_1.spawn)("npm", args, {
                cwd: this.workingDir,
                shell: process.platform === "win32",
                stdio: "pipe",
            });
            let output = "";
            proc.stdout?.on("data", (d) => (output += d.toString()));
            proc.stderr?.on("data", (d) => (output += d.toString()));
            proc.on("close", (code) => resolve(`Exit: ${code}\n${output}`));
            setTimeout(() => {
                proc.kill();
                resolve("Timeout");
            }, 60000);
        });
    }
    toolCompareMetrics(before, after) {
        const changes = [];
        for (const key of Object.keys(before)) {
            if (after[key] !== undefined && before[key] !== after[key]) {
                const delta = after[key] - before[key];
                changes.push(`${key}: ${before[key]} → ${after[key]} (${delta > 0 ? "+" : ""}${delta})`);
            }
        }
        return changes.length > 0 ? changes.join("\n") : "No changes";
    }
    async toolAuditDocument(original, redacted) {
        const result = await this.vulpes.process(original);
        return JSON.stringify({
            original_phi: result.redactionCount,
            expected: result.text,
            actual: redacted,
            match: result.text === redacted,
        });
    }
    async toolCheckSafeHarbor(text) {
        const result = await this.vulpes.process(text);
        return JSON.stringify({
            remaining_phi: result.redactionCount,
            compliant: result.redactionCount === 0,
            breakdown: result.breakdown,
        });
    }
    toolCheckMcp() {
        // Check if MCP server is defined in package.json
        const pkgPath = path.join(this.workingDir, "package.json");
        if (!fs.existsSync(pkgPath))
            return JSON.stringify({ status: "unknown" });
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        const hasMcp = pkg.scripts && Object.keys(pkg.scripts).some((k) => k.includes("mcp"));
        return JSON.stringify({ mcp_configured: hasMcp, scripts: pkg.scripts });
    }
    toolCheckDictionaries() {
        const dictDir = path.join(this.workingDir, "src", "dictionaries");
        if (!fs.existsSync(dictDir))
            return JSON.stringify({ status: "missing" });
        const dicts = [
            "first-names.txt",
            "surnames.txt",
            "hospitals.txt",
            "cities.txt",
        ];
        const status = {};
        for (const dict of dicts) {
            const p = path.join(dictDir, dict);
            if (fs.existsSync(p)) {
                const lines = fs.readFileSync(p, "utf-8").split("\n").filter(Boolean);
                status[dict] = { loaded: true, entries: lines.length };
            }
            else {
                status[dict] = { loaded: false };
            }
        }
        return JSON.stringify(status);
    }
    toolCheckApiKeys() {
        const keys = [
            "ANTHROPIC_API_KEY",
            "OPENAI_API_KEY",
            "OPENROUTER_API_KEY",
            "GOOGLE_API_KEY",
        ];
        const status = {};
        for (const key of keys) {
            status[key] = process.env[key] ? "configured" : "missing";
        }
        return JSON.stringify(status);
    }
    toolRunHealthCheck() {
        const checks = {
            node_version: process.version,
            platform: process.platform,
            cwd: this.workingDir,
            dictionaries: this.toolCheckDictionaries(),
            api_keys: this.toolCheckApiKeys(),
        };
        return JSON.stringify(checks, null, 2);
    }
}
// ============================================================================
// INTELLIGENT ORCHESTRATOR CLASS
// ============================================================================
class SubagentOrchestrator {
    config;
    mainProvider;
    subagentProvider = null;
    taskQueue;
    constructor(config, mainProvider) {
        // Get preferences for max parallel (or use config override)
        let maxParallel = config.maxParallel || 3;
        try {
            const prefs = (0, VulpesStore_1.getPreferences)();
            if (prefs.maxParallelSubagents) {
                maxParallel = prefs.maxParallelSubagents;
            }
        }
        catch {
            // Use default if store not available
        }
        this.config = {
            maxParallel,
            workingDir: config.workingDir || process.cwd(),
            mode: config.mode || "dev",
            verbose: config.verbose || false,
            autoRoute: config.autoRoute !== false,
            ...config,
        };
        this.mainProvider = mainProvider;
        // Initialize p-queue with concurrency control
        this.taskQueue = new p_queue_1.default({
            concurrency: maxParallel,
            interval: 1000, // Rate limit: max N tasks per second
            intervalCap: maxParallel,
        });
    }
    setSubagentProvider(provider) {
        this.subagentProvider = provider;
    }
    /**
     * Analyze user request and create optimal workflow plan
     */
    planWorkflow(userMessage, context) {
        const workflowType = detectWorkflow(userMessage);
        const template = WORKFLOW_TEMPLATES[workflowType];
        const plan = template({ input: userMessage, ...context });
        if (this.config.verbose) {
            VulpesOutput_1.out.print(theme_1.theme.workflow(`\n  ${figures_1.default.pointer} Detected workflow: ${workflowType}`));
            VulpesOutput_1.out.print(theme_1.theme.workflow(`  ${figures_1.default.pointer} Execution mode: ${plan.mode}`));
            VulpesOutput_1.out.print(theme_1.theme.workflow(`  ${figures_1.default.pointer} Phases: ${plan.phases.length}`));
        }
        return plan;
    }
    /**
     * Execute a workflow plan with intelligent parallel/serial handling
     * Uses p-queue for rate limiting and records results to agent memory
     */
    async executeWorkflow(plan) {
        const provider = this.subagentProvider || this.mainProvider;
        const allResults = [];
        const resultsMap = new Map();
        const workflowStart = Date.now();
        if (this.config.verbose) {
            VulpesOutput_1.out.print(theme_1.theme.orchestrator(`\n  ${figures_1.default.arrowRight} Executing: ${plan.description}\n`));
        }
        // Execute phases in order
        for (let phaseIdx = 0; phaseIdx < plan.phases.length; phaseIdx++) {
            const phase = plan.phases[phaseIdx];
            if (this.config.verbose) {
                VulpesOutput_1.out.print(theme_1.theme.phase(`  Phase ${phaseIdx + 1}/${plan.phases.length}: ${phase.length} task(s)`));
            }
            // Execute tasks within phase using p-queue for controlled concurrency
            if (plan.mode === "parallel" ||
                (plan.mode === "hybrid" && phase.length > 1)) {
                // Parallel execution via p-queue (handles rate limiting automatically)
                const batchResults = await Promise.all(phase.map((task) => this.taskQueue.add(async () => {
                    const subagent = new Subagent(task.role, provider, this.config.workingDir || process.cwd(), this.config.verbose);
                    return subagent.execute(task, resultsMap);
                })));
                for (const r of batchResults) {
                    if (r) {
                        allResults.push(r);
                        resultsMap.set(r.taskId, r);
                        this.logResult(r);
                    }
                }
            }
            else {
                // Serial execution (still use queue for rate limiting)
                for (const task of phase) {
                    const result = await this.taskQueue.add(async () => {
                        const subagent = new Subagent(task.role, provider, this.config.workingDir || process.cwd(), this.config.verbose);
                        return subagent.execute(task, resultsMap);
                    });
                    if (result) {
                        allResults.push(result);
                        resultsMap.set(result.taskId, result);
                        this.logResult(result);
                    }
                }
            }
        }
        // Generate summary
        const successful = allResults.filter((r) => r.success).length;
        const totalDuration = Date.now() - workflowStart;
        const summary = `Workflow complete: ${successful}/${allResults.length} tasks succeeded in ${totalDuration}ms`;
        // Record to agent memory for future learning
        try {
            (0, VulpesStore_1.recordAgentMemory)(plan.type, plan.description, successful === allResults.length
                ? "success"
                : successful > 0
                    ? "partial"
                    : "failure", `${successful}/${allResults.length} tasks, ${totalDuration}ms`, plan.type, totalDuration);
        }
        catch {
            // Silently ignore if store not available
        }
        return { results: allResults, summary };
    }
    logResult(result) {
        if (!this.config.verbose)
            return;
        const icon = result.success ? figures_1.default.tick : figures_1.default.cross;
        const color = result.success ? theme_1.theme.success : theme_1.theme.error;
        VulpesOutput_1.out.print(color(`    ${icon} ${result.role.toUpperCase()} (${result.executionTimeMs}ms)`));
    }
    /**
     * Main orchestration entry point - auto-routes to optimal workflow
     */
    async orchestrate(userMessage, conversationHistory) {
        // Plan the workflow
        const plan = this.planWorkflow(userMessage);
        // Execute if we have a subagent provider
        if (this.subagentProvider || this.config.autoRoute) {
            const { results, summary: _summary } = await this.executeWorkflow(plan);
            // Synthesize results with main LLM
            const synthesisPrompt = `You are synthesizing results from a Vulpes workflow.

WORKFLOW: ${plan.description}
USER REQUEST: ${userMessage}

RESULTS:
${results.map((r) => `[${r.role.toUpperCase()}] ${r.success ? "SUCCESS" : "FAILED"}\n${r.result || r.error}`).join("\n\n---\n\n")}

Provide a clear, actionable summary for the user. If there are code changes needed, show them. If there are issues, explain them.`;
            const messages = [
                { role: "system", content: (0, SystemPrompts_1.getSystemPrompt)(this.config.mode || "dev") },
                ...conversationHistory.filter((m) => m.role !== "system"),
                { role: "user", content: synthesisPrompt },
            ];
            let response = "";
            for await (const event of this.mainProvider.streamChat(messages, {
                maxTokens: 4096,
            })) {
                if (event.type === "text" && event.text) {
                    response += event.text;
                }
            }
            return { response, workflow: plan, results };
        }
        // Fallback: direct LLM response without subagents
        const messages = [
            { role: "system", content: (0, SystemPrompts_1.getSystemPrompt)(this.config.mode || "dev") },
            ...conversationHistory.filter((m) => m.role !== "system"),
            { role: "user", content: userMessage },
        ];
        let response = "";
        for await (const event of this.mainProvider.streamChat(messages, {
            maxTokens: 8192,
        })) {
            if (event.type === "text" && event.text) {
                response += event.text;
            }
        }
        return { response };
    }
    /**
     * Quick scan shortcut - runs scout only
     */
    async quickScan(text) {
        const plan = this.planWorkflow(`quick scan: ${text}`, { text });
        const { results } = await this.executeWorkflow(plan);
        return results[0];
    }
    /**
     * Full audit shortcut - runs compliance workflow
     */
    async fullAudit(text) {
        const plan = this.planWorkflow(`HIPAA compliance audit: ${text}`, { text });
        return this.executeWorkflow(plan);
    }
    getMainProvider() {
        return this.mainProvider;
    }
}
exports.SubagentOrchestrator = SubagentOrchestrator;
// ============================================================================
// FACTORY FUNCTION
// ============================================================================
function createOrchestrator(config) {
    const mainProvider = (0, APIProvider_1.createProviderFromOptions)({
        provider: config.mainProvider,
        apiKey: config.mainApiKey,
        model: config.mainModel,
    });
    if (!mainProvider) {
        throw new Error("Could not create main provider for orchestrator");
    }
    const orchestrator = new SubagentOrchestrator(config, mainProvider);
    // Create subagent provider (use faster/cheaper model)
    const subagentProvider = (0, APIProvider_1.createProviderFromOptions)({
        provider: config.subagentProvider || config.mainProvider,
        apiKey: config.subagentApiKey || config.mainApiKey,
        model: config.subagentModel || "claude-3-5-haiku-20241022",
    });
    if (subagentProvider) {
        orchestrator.setSubagentProvider(subagentProvider);
    }
    return orchestrator;
}
//# sourceMappingURL=SubagentOrchestrator.js.map