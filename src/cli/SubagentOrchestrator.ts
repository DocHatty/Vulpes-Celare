/**
 * ============================================================================
 * VULPES CELARE - SUBAGENT ORCHESTRATION SYSTEM
 * ============================================================================
 *
 * A multi-agent architecture specifically designed for PHI redaction workflows.
 * The main orchestrator LLM delegates to specialized subagents that run in
 * parallel for maximum efficiency.
 *
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        ORCHESTRATOR (Main LLM)                          │
 * │  Your chosen model - Full Vulpes system prompt                          │
 * │  Analyzes requests, delegates tasks, synthesizes results                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    │
 *      ┌──────────────┬──────────────┼──────────────┬──────────────┐
 *      ▼              ▼              ▼              ▼              ▼
 * ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
 * │  PHI     │  │  FILTER  │  │  TEST    │  │  DICT    │  │  AUDIT   │
 * │  SCANNER │  │  ENGINEER│  │  RUNNER  │  │  CURATOR │  │  AGENT   │
 * │          │  │          │  │          │  │          │  │          │
 * │ Analyze  │  │ Fix/tune │  │ Run &    │  │ Manage   │  │ Check    │
 * │ documents│  │ filters  │  │ validate │  │ entries  │  │ quality  │
 * └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
 *      │              │              │              │              │
 *      └──────────────┴──────────────┴──────────────┴──────────────┘
 *                                    ▼
 *                         ┌────────────────────┐
 *                         │  SYNTHESIZED RESULT│
 *                         │  Back to User      │
 *                         └────────────────────┘
 *
 * VULPES SUBAGENT ROLES:
 *
 * 1. PHI_SCANNER - Scans documents for PHI patterns
 *    - Fast parallel document analysis
 *    - Identifies what PHI types are present
 *    - Spots potential issues (false positives/negatives)
 *    - Batch processing for multiple files
 *
 * 2. FILTER_ENGINEER - Analyzes and fixes filter code
 *    - Reads filter implementations
 *    - Identifies regex/logic issues
 *    - Writes specific code fixes
 *    - Can modify filters to fix leaks
 *
 * 3. TEST_RUNNER - Executes tests and validates changes
 *    - Runs test suites
 *    - Compares before/after metrics
 *    - Identifies regressions
 *    - Validates fixes work
 *
 * 4. DICT_CURATOR - Manages dictionary entries
 *    - Searches dictionaries
 *    - Adds missing names/locations
 *    - Removes false positive triggers
 *    - Cross-references databases
 *
 * 5. AUDIT_AGENT - Quality and compliance checking
 *    - Reviews redaction completeness
 *    - Checks HIPAA compliance
 *    - Assesses risk levels
 *    - Generates reports
 */

import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import chalk from "chalk";
import figures from "figures";

import { VulpesCelare } from "../VulpesCelare";
import { VERSION, ENGINE_NAME } from "../index";
import {
  APIProvider,
  createProviderFromOptions,
  Message,
  Tool,
} from "./APIProvider";
import { getSystemPrompt } from "./SystemPrompts";

// ============================================================================
// TYPES
// ============================================================================

export type SubagentRole =
  | "phi_scanner"
  | "filter_engineer"
  | "test_runner"
  | "dict_curator"
  | "audit_agent";

export interface SubagentTask {
  id: string;
  role: SubagentRole;
  prompt: string;
  context?: Record<string, any>;
  priority?: "high" | "normal" | "low";
  timeout?: number;
}

export interface SubagentResult {
  taskId: string;
  role: SubagentRole;
  success: boolean;
  result?: string;
  error?: string;
  executionTimeMs: number;
  tokensUsed?: { input: number; output: number };
}

export interface OrchestratorConfig {
  mainProvider?: string;
  mainModel?: string;
  mainApiKey?: string;
  subagentProvider?: string;
  subagentModel?: string;
  subagentApiKey?: string;
  maxParallel?: number;
  workingDir?: string;
  mode?: "dev" | "qa" | "production";
  verbose?: boolean;
}

// ============================================================================
// THEME
// ============================================================================

const theme = {
  primary: chalk.hex("#FF6B35"),
  secondary: chalk.hex("#4ECDC4"),
  accent: chalk.hex("#FFE66D"),
  success: chalk.hex("#2ECC71"),
  warning: chalk.hex("#F39C12"),
  error: chalk.hex("#E74C3C"),
  info: chalk.hex("#3498DB"),
  muted: chalk.hex("#95A5A6"),
  orchestrator: chalk.hex("#9B59B6"),
  subagent: chalk.hex("#3498DB"),
};

// ============================================================================
// SUBAGENT SYSTEM PROMPTS - Optimized for Vulpes workflows
// ============================================================================

const SUBAGENT_PROMPTS: Record<SubagentRole, string> = {
  phi_scanner: `You are a PHI Scanner - a specialized subagent for Vulpes Celare.

PURPOSE: Quickly analyze text/documents for Protected Health Information (PHI).

YOU CAN:
- Scan text using the Vulpes redaction engine
- Identify all PHI types present (names, SSN, dates, MRN, addresses, etc.)
- Flag potential false positives (medical terms mistaken as PHI)
- Flag potential misses (PHI that wasn't detected)
- Process multiple documents in sequence

RESPOND IN THIS FORMAT:
\`\`\`json
{
  "documents_scanned": 1,
  "phi_found": [
    {"type": "NAME", "original": "John Smith", "redacted": "[NAME-1]", "confidence": "high"}
  ],
  "potential_false_positives": [
    {"text": "...", "why": "Medical term, not a name"}
  ],
  "potential_misses": [
    {"text": "...", "likely_type": "NAME", "why": "Unusual spelling not in dictionary"}
  ],
  "risk_level": "low|medium|high",
  "summary": "Brief 1-line summary"
}
\`\`\`

Be FAST and PRECISE. Don't explain excessively.`,

  filter_engineer: `You are a Filter Engineer - a specialized subagent for Vulpes Celare.

PURPOSE: Analyze and fix PHI detection filter code.

YOU CAN:
- Read filter source code (src/filters/*.ts)
- Identify regex pattern bugs
- Find logic errors in detection algorithms
- Write specific code fixes with exact line numbers
- Suggest improvements to reduce false positives/negatives

KEY FILES:
- src/filters/*FilterSpan.ts - Individual PHI type filters
- src/core/SpanBasedFilter.ts - Base filter class
- src/core/FieldLabelWhitelist.ts - Whitelist logic
- src/utils/PhoneticMatcher.ts - Name matching

RESPOND IN THIS FORMAT:
\`\`\`json
{
  "files_analyzed": ["src/filters/NameFilterSpan.ts"],
  "issues": [
    {
      "file": "src/filters/NameFilterSpan.ts",
      "line": 145,
      "problem": "Regex doesn't handle hyphenated names",
      "severity": "high|medium|low"
    }
  ],
  "fixes": [
    {
      "file": "src/filters/NameFilterSpan.ts",
      "line": 145,
      "old_code": "const pattern = /[A-Z][a-z]+/",
      "new_code": "const pattern = /[A-Z][a-z]+(?:-[A-Z][a-z]+)?/",
      "explanation": "Added optional hyphenated suffix"
    }
  ]
}
\`\`\`

Be PRECISE with line numbers and code. Test your regex mentally before suggesting.`,

  test_runner: `You are a Test Runner - a specialized subagent for Vulpes Celare.

PURPOSE: Run tests and validate that changes don't break things.

YOU CAN:
- Run the full test suite (npm test)
- Run specific test files
- Compare before/after metrics
- Check for regressions in sensitivity/specificity
- Validate that fixes actually work

TARGET METRICS (CRITICAL):
- Sensitivity: ≥99% (must catch nearly all PHI)
- Specificity: ≥96% (minimize false positives)
- Speed: 2-3ms per document

RESPOND IN THIS FORMAT:
\`\`\`json
{
  "command": "npm test",
  "passed": true,
  "tests_run": 47,
  "tests_passed": 47,
  "tests_failed": 0,
  "metrics": {
    "sensitivity": 0.996,
    "specificity": 0.982,
    "avg_time_ms": 2.3
  },
  "regressions": [],
  "verdict": "PASS|FAIL|NEEDS_REVIEW",
  "notes": "All tests passing, metrics within targets"
}
\`\`\`

Be OBJECTIVE. Report numbers, not opinions. FAIL if metrics drop below targets.`,

  dict_curator: `You are a Dictionary Curator - a specialized subagent for Vulpes Celare.

PURPOSE: Manage the name/location dictionaries used for PHI detection.

YOU CAN:
- Search dictionaries for specific entries
- Add missing names that caused leaks
- Remove entries causing false positives
- Cross-reference entries across dictionaries

DICTIONARIES:
- src/dictionaries/first-names.txt (~30,000 entries)
- src/dictionaries/surnames.txt (~162,000 entries)
- src/dictionaries/hospitals.txt (~6,000 entries)
- src/dictionaries/cities.txt

RESPOND IN THIS FORMAT:
\`\`\`json
{
  "searched": [
    {"dictionary": "surnames.txt", "term": "Nguyen", "found": true, "line": 45123}
  ],
  "recommendations": {
    "add": [
      {"dictionary": "surnames.txt", "entry": "Brzezinski", "reason": "Missed in patient name"}
    ],
    "remove": [
      {"dictionary": "first-names.txt", "entry": "Ace", "reason": "Causes FP with 'ACE inhibitor'"}
    ]
  },
  "notes": "Brief summary of findings"
}
\`\`\`

Be CAREFUL. Dictionary changes affect all users. Justify additions/removals.`,

  audit_agent: `You are an Audit Agent - a specialized subagent for Vulpes Celare.

PURPOSE: Review redaction quality and HIPAA compliance.

YOU CAN:
- Review redacted documents for completeness
- Check HIPAA Safe Harbor compliance (17/18 identifiers)
- Assess risk levels for any remaining PHI
- Generate compliance reports
- Recommend additional protections

HIPAA SAFE HARBOR IDENTIFIERS (17 we cover + 1 we don't):
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
18. Any other unique identifier ✓

RESPOND IN THIS FORMAT:
\`\`\`json
{
  "documents_reviewed": 1,
  "compliance_status": "COMPLIANT|NON_COMPLIANT|NEEDS_REVIEW",
  "identifiers_checked": {
    "names": {"found": 3, "redacted": 3, "status": "ok"},
    "ssn": {"found": 1, "redacted": 1, "status": "ok"},
    "dates": {"found": 5, "redacted": 4, "status": "warning", "note": "DOB missed"}
  },
  "risk_assessment": {
    "level": "low|medium|high|critical",
    "unredacted_phi": [],
    "recommendations": []
  },
  "summary": "Document is HIPAA compliant. All PHI properly redacted."
}
\`\`\`

Be THOROUGH. Missing PHI = potential HIPAA violation. Better to flag than miss.`,
};

// ============================================================================
// SUBAGENT TOOLS
// ============================================================================

const SUBAGENT_TOOLS: Record<SubagentRole, Tool[]> = {
  phi_scanner: [
    {
      name: "scan_text",
      description: "Scan text for PHI using Vulpes engine",
      input_schema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text to scan for PHI" },
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
          path: { type: "string", description: "File path to scan" },
        },
        required: ["path"],
      },
    },
  ],

  filter_engineer: [
    {
      name: "read_file",
      description: "Read a source file",
      input_schema: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path" },
        },
        required: ["path"],
      },
    },
    {
      name: "search_code",
      description: "Search for pattern in codebase",
      input_schema: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Regex pattern to search" },
          path: { type: "string", description: "Directory to search in" },
        },
        required: ["pattern"],
      },
    },
    {
      name: "list_filters",
      description: "List all available filter files",
      input_schema: {
        type: "object",
        properties: {},
      },
    },
  ],

  test_runner: [
    {
      name: "run_tests",
      description: "Run the test suite",
      input_schema: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            description: "Optional test filter pattern",
          },
          quick: { type: "boolean", description: "Run quick subset only" },
        },
      },
    },
    {
      name: "run_single_test",
      description: "Run a specific test file",
      input_schema: {
        type: "object",
        properties: {
          file: { type: "string", description: "Test file path" },
        },
        required: ["file"],
      },
    },
  ],

  dict_curator: [
    {
      name: "search_dictionary",
      description: "Search a dictionary for a term",
      input_schema: {
        type: "object",
        properties: {
          dictionary: {
            type: "string",
            enum: ["first-names", "surnames", "hospitals", "cities"],
            description: "Dictionary to search",
          },
          term: { type: "string", description: "Term to search for" },
        },
        required: ["dictionary", "term"],
      },
    },
    {
      name: "count_entries",
      description: "Count entries in a dictionary",
      input_schema: {
        type: "object",
        properties: {
          dictionary: { type: "string", description: "Dictionary name" },
        },
        required: ["dictionary"],
      },
    },
    {
      name: "read_dictionary_sample",
      description: "Read a sample of entries from a dictionary",
      input_schema: {
        type: "object",
        properties: {
          dictionary: { type: "string", description: "Dictionary name" },
          start: { type: "number", description: "Start line" },
          count: { type: "number", description: "Number of lines" },
        },
        required: ["dictionary"],
      },
    },
  ],

  audit_agent: [
    {
      name: "audit_redaction",
      description: "Audit a redacted document for compliance",
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
      name: "check_compliance",
      description: "Check HIPAA Safe Harbor compliance",
      input_schema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Redacted text to check" },
        },
        required: ["text"],
      },
    },
  ],
};

// ============================================================================
// SUBAGENT CLASS
// ============================================================================

class Subagent {
  private role: SubagentRole;
  private provider: APIProvider;
  private vulpes: VulpesCelare;
  private workingDir: string;
  private verbose: boolean;

  constructor(
    role: SubagentRole,
    provider: APIProvider,
    workingDir: string,
    verbose: boolean = false,
  ) {
    this.role = role;
    this.provider = provider;
    this.vulpes = new VulpesCelare();
    this.workingDir = workingDir;
    this.verbose = verbose;
  }

  async execute(task: SubagentTask): Promise<SubagentResult> {
    const startTime = Date.now();

    try {
      const messages: Message[] = [
        { role: "system", content: SUBAGENT_PROMPTS[this.role] },
        { role: "user", content: task.prompt },
      ];

      let response = "";
      const tools = SUBAGENT_TOOLS[this.role];

      // Stream response from subagent
      for await (const event of this.provider.streamChat(messages, {
        maxTokens: 4096,
        tools: tools.length > 0 ? tools : undefined,
      })) {
        if (event.type === "text" && event.text) {
          response += event.text;
        }
        // Handle tool calls if needed
        if (event.type === "tool_use_start" && event.toolUse) {
          const toolResult = await this.executeTool(
            event.toolUse.name,
            event.toolUse.input || {},
          );
          // For simplicity, append tool result to response
          response += `\n\nTool ${event.toolUse.name} result:\n${toolResult}`;
        }
      }

      return {
        taskId: task.id,
        role: this.role,
        success: true,
        result: response,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        taskId: task.id,
        role: this.role,
        success: false,
        error: error.message,
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  private async executeTool(name: string, input: any): Promise<string> {
    switch (name) {
      case "scan_text":
        return this.toolScanText(input.text);
      case "scan_file":
        return this.toolScanFile(input.path);
      case "read_file":
        return this.toolReadFile(input.path);
      case "search_code":
        return this.toolSearchCode(input.pattern, input.path);
      case "list_filters":
        return this.toolListFilters();
      case "run_tests":
        return this.toolRunTests(input.filter, input.quick);
      case "run_single_test":
        return this.toolRunSingleTest(input.file);
      case "search_dictionary":
        return this.toolSearchDictionary(input.dictionary, input.term);
      case "count_entries":
        return this.toolCountEntries(input.dictionary);
      case "read_dictionary_sample":
        return this.toolReadDictionarySample(
          input.dictionary,
          input.start,
          input.count,
        );
      case "audit_redaction":
        return this.toolAuditRedaction(input.original, input.redacted);
      case "check_compliance":
        return this.toolCheckCompliance(input.text);
      default:
        return `Unknown tool: ${name}`;
    }
  }

  // Tool implementations
  private async toolScanText(text: string): Promise<string> {
    const result = await this.vulpes.process(text);
    return JSON.stringify({
      original: text,
      redacted: result.text,
      phi_count: result.redactionCount,
      breakdown: result.breakdown,
      time_ms: result.executionTimeMs,
    });
  }

  private async toolScanFile(filePath: string): Promise<string> {
    const fullPath = path.resolve(this.workingDir, filePath);
    if (!fs.existsSync(fullPath)) {
      return `File not found: ${filePath}`;
    }
    const content = fs.readFileSync(fullPath, "utf-8");
    return this.toolScanText(content);
  }

  private toolReadFile(filePath: string): string {
    const fullPath = path.resolve(this.workingDir, filePath);
    if (!fs.existsSync(fullPath)) {
      return `File not found: ${filePath}`;
    }
    return fs.readFileSync(fullPath, "utf-8");
  }

  private toolSearchCode(pattern: string, searchPath?: string): string {
    const targetPath = searchPath
      ? path.resolve(this.workingDir, searchPath)
      : path.join(this.workingDir, "src");

    try {
      const { execSync } = require("child_process");
      const result = execSync(
        `grep -r "${pattern}" "${targetPath}" -n --include="*.ts" 2>/dev/null | head -30`,
        { encoding: "utf-8", timeout: 10000 },
      );
      return result || "No matches found";
    } catch {
      return "Search failed or no matches";
    }
  }

  private toolListFilters(): string {
    const filtersDir = path.join(this.workingDir, "src", "filters");
    if (!fs.existsSync(filtersDir)) {
      return "Filters directory not found";
    }
    const files = fs
      .readdirSync(filtersDir)
      .filter((f) => f.endsWith(".ts"))
      .join("\n");
    return files || "No filter files found";
  }

  private toolRunTests(filter?: string, quick?: boolean): string {
    return new Promise<string>((resolve) => {
      let cmd = "npm test";
      if (quick) cmd += " -- --quick";
      if (filter) cmd += ` -- --filter="${filter}"`;

      const proc = spawn(cmd, [], {
        cwd: this.workingDir,
        shell: true,
        stdio: "pipe",
      });

      let output = "";
      proc.stdout?.on("data", (d) => (output += d.toString()));
      proc.stderr?.on("data", (d) => (output += d.toString()));

      proc.on("close", (code) => {
        resolve(`Exit code: ${code}\n\n${output}`);
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        proc.kill();
        resolve("Test run timed out");
      }, 60000);
    }) as any;
  }

  private toolRunSingleTest(file: string): string {
    return this.toolRunTests(file);
  }

  private toolSearchDictionary(dictionary: string, term: string): string {
    const dictPath = path.join(
      this.workingDir,
      "src",
      "dictionaries",
      `${dictionary}.txt`,
    );
    if (!fs.existsSync(dictPath)) {
      return `Dictionary not found: ${dictionary}`;
    }

    const content = fs.readFileSync(dictPath, "utf-8");
    const lines = content.split("\n");
    const termLower = term.toLowerCase();

    const matches: { line: number; entry: string }[] = [];
    lines.forEach((line, i) => {
      if (line.toLowerCase().includes(termLower)) {
        matches.push({ line: i + 1, entry: line.trim() });
      }
    });

    return JSON.stringify({
      dictionary,
      term,
      found: matches.length > 0,
      matches: matches.slice(0, 10),
      total_matches: matches.length,
    });
  }

  private toolCountEntries(dictionary: string): string {
    const dictPath = path.join(
      this.workingDir,
      "src",
      "dictionaries",
      `${dictionary}.txt`,
    );
    if (!fs.existsSync(dictPath)) {
      return `Dictionary not found: ${dictionary}`;
    }

    const content = fs.readFileSync(dictPath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    return JSON.stringify({ dictionary, count: lines.length });
  }

  private toolReadDictionarySample(
    dictionary: string,
    start?: number,
    count?: number,
  ): string {
    const dictPath = path.join(
      this.workingDir,
      "src",
      "dictionaries",
      `${dictionary}.txt`,
    );
    if (!fs.existsSync(dictPath)) {
      return `Dictionary not found: ${dictionary}`;
    }

    const content = fs.readFileSync(dictPath, "utf-8");
    const lines = content.split("\n");
    const startLine = start || 0;
    const countLines = count || 20;

    return lines.slice(startLine, startLine + countLines).join("\n");
  }

  private async toolAuditRedaction(
    original: string,
    redacted: string,
  ): Promise<string> {
    // Re-scan original to see what should have been redacted
    const result = await this.vulpes.process(original);

    return JSON.stringify({
      original_phi_count: result.redactionCount,
      original_breakdown: result.breakdown,
      expected_redacted: result.text,
      actual_redacted: redacted,
      matches: result.text === redacted,
    });
  }

  private async toolCheckCompliance(text: string): Promise<string> {
    // Scan to see if any PHI remains
    const result = await this.vulpes.process(text);

    return JSON.stringify({
      remaining_phi: result.redactionCount,
      breakdown: result.breakdown,
      compliant: result.redactionCount === 0,
      note:
        result.redactionCount === 0
          ? "No PHI detected - appears compliant"
          : `${result.redactionCount} PHI items still present`,
    });
  }
}

// ============================================================================
// ORCHESTRATOR CLASS
// ============================================================================

export class SubagentOrchestrator {
  private config: OrchestratorConfig;
  private mainProvider: APIProvider;
  private subagents: Map<SubagentRole, Subagent> = new Map();
  private vulpes: VulpesCelare;

  constructor(config: OrchestratorConfig, mainProvider: APIProvider) {
    this.config = {
      maxParallel: config.maxParallel || 3,
      workingDir: config.workingDir || process.cwd(),
      mode: config.mode || "dev",
      verbose: config.verbose || false,
      ...config,
    };
    this.mainProvider = mainProvider;
    this.vulpes = new VulpesCelare();
  }

  /**
   * Initialize a subagent for a specific role
   */
  initializeSubagent(role: SubagentRole, provider: APIProvider): void {
    const subagent = new Subagent(
      role,
      provider,
      this.config.workingDir || process.cwd(),
      this.config.verbose,
    );
    this.subagents.set(role, subagent);
  }

  /**
   * Delegate a single task to a subagent
   */
  async delegateTask(task: SubagentTask): Promise<SubagentResult> {
    const subagent = this.subagents.get(task.role);
    if (!subagent) {
      return {
        taskId: task.id,
        role: task.role,
        success: false,
        error: `Subagent ${task.role} not initialized`,
        executionTimeMs: 0,
      };
    }

    if (this.config.verbose) {
      console.log(
        theme.subagent(
          `  ${figures.pointer} Delegating to ${task.role}: ${task.prompt.slice(0, 50)}...`,
        ),
      );
    }

    return subagent.execute(task);
  }

  /**
   * Delegate multiple tasks in parallel (respecting maxParallel limit)
   */
  async delegateParallel(tasks: SubagentTask[]): Promise<SubagentResult[]> {
    const results: SubagentResult[] = [];
    const maxParallel = this.config.maxParallel || 3;

    // Process in batches
    for (let i = 0; i < tasks.length; i += maxParallel) {
      const batch = tasks.slice(i, i + maxParallel);

      if (this.config.verbose) {
        console.log(
          theme.orchestrator(
            `  ${figures.pointer} Running batch ${Math.floor(i / maxParallel) + 1} (${batch.length} tasks)`,
          ),
        );
      }

      const batchResults = await Promise.all(
        batch.map((task) => this.delegateTask(task)),
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Main orchestration - let the main LLM decide how to handle a request
   */
  async orchestrate(
    userMessage: string,
    conversationHistory: Message[],
  ): Promise<{
    response: string;
    subagentResults?: SubagentResult[];
  }> {
    const orchestratorPrompt = `You are the Vulpes Celare Orchestrator.

You have specialized subagents that can help with tasks:

1. PHI_SCANNER - Scans documents for PHI patterns (fast, parallel)
2. FILTER_ENGINEER - Analyzes/fixes filter code (reads/writes code)
3. TEST_RUNNER - Runs tests, validates changes (npm test)
4. DICT_CURATOR - Manages name/location dictionaries
5. AUDIT_AGENT - Checks HIPAA compliance, reviews quality

TO DELEGATE, respond with:
\`\`\`delegate
{
  "tasks": [
    {"role": "phi_scanner", "prompt": "Scan this text: ..."},
    {"role": "filter_engineer", "prompt": "Check NameFilterSpan.ts for..."}
  ]
}
\`\`\`

WHEN TO DELEGATE:
- Document analysis → PHI_SCANNER
- Code bugs/fixes → FILTER_ENGINEER
- Testing → TEST_RUNNER
- Dictionary issues → DICT_CURATOR
- Compliance review → AUDIT_AGENT

For simple questions, just respond directly without delegating.

${getSystemPrompt(this.config.mode || "dev")}`;

    const messages: Message[] = [
      { role: "system", content: orchestratorPrompt },
      ...conversationHistory.filter((m) => m.role !== "system"),
      { role: "user", content: userMessage },
    ];

    let response = "";
    let subagentResults: SubagentResult[] | undefined;

    // Get orchestrator's response
    for await (const event of this.mainProvider.streamChat(messages, {
      maxTokens: 8192,
    })) {
      if (event.type === "text" && event.text) {
        response += event.text;
      }
    }

    // Check if orchestrator wants to delegate
    const delegateMatch = response.match(/```delegate\n([\s\S]*?)\n```/);
    if (delegateMatch) {
      try {
        const delegation = JSON.parse(delegateMatch[1]);
        const tasks: SubagentTask[] = delegation.tasks.map(
          (t: any, i: number) => ({
            id: `task-${i}-${Date.now()}`,
            role: t.role as SubagentRole,
            prompt: t.prompt,
          }),
        );

        if (this.config.verbose) {
          console.log(
            theme.orchestrator(
              `\n  ${figures.pointer} Orchestrator delegating ${tasks.length} task(s)...\n`,
            ),
          );
        }

        subagentResults = await this.delegateParallel(tasks);

        // Send results back to orchestrator for synthesis
        const resultsMessage =
          "Subagent results:\n\n" +
          subagentResults
            .map(
              (r) =>
                `[${r.role}] ${r.success ? "SUCCESS" : "FAILED"}\n${r.result || r.error}`,
            )
            .join("\n\n---\n\n");

        const synthesisMessages: Message[] = [
          ...messages,
          { role: "assistant", content: response },
          { role: "user", content: resultsMessage },
        ];

        let synthesis = "";
        for await (const event of this.mainProvider.streamChat(
          synthesisMessages,
          {
            maxTokens: 4096,
          },
        )) {
          if (event.type === "text" && event.text) {
            synthesis += event.text;
          }
        }

        return { response: synthesis, subagentResults };
      } catch (e: any) {
        // If delegation parsing fails, return original response
        return { response: response + `\n\n(Delegation failed: ${e.message})` };
      }
    }

    return { response };
  }

  /**
   * Get available subagent roles
   */
  getAvailableRoles(): SubagentRole[] {
    return Array.from(this.subagents.keys());
  }

  /**
   * Get the main provider
   */
  getMainProvider(): APIProvider {
    return this.mainProvider;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createOrchestrator(
  config: OrchestratorConfig,
): SubagentOrchestrator {
  // Create main provider
  const mainProvider = createProviderFromOptions({
    provider: config.mainProvider,
    apiKey: config.mainApiKey,
    model: config.mainModel,
  });

  if (!mainProvider) {
    throw new Error("Could not create main provider for orchestrator");
  }

  const orchestrator = new SubagentOrchestrator(config, mainProvider);

  // Create subagent provider
  const subagentProvider = createProviderFromOptions({
    provider: config.subagentProvider || config.mainProvider,
    apiKey: config.subagentApiKey || config.mainApiKey,
    model: config.subagentModel || "claude-3-5-haiku-20241022",
  });

  if (subagentProvider) {
    // Initialize all subagent roles
    const roles: SubagentRole[] = [
      "phi_scanner",
      "filter_engineer",
      "test_runner",
      "dict_curator",
      "audit_agent",
    ];

    for (const role of roles) {
      orchestrator.initializeSubagent(role, subagentProvider);
    }
  }

  return orchestrator;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { SUBAGENT_PROMPTS, SUBAGENT_TOOLS };
