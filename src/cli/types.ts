/**
 * ============================================================================
 * VULPES CELARE - CLI TYPE DEFINITIONS
 * ============================================================================
 *
 * Strongly typed interfaces for CLI commands, tool inputs/outputs, and options.
 * Eliminates critical `any` usage and provides type safety across CLI modules.
 *
 * @module cli/types
 */

import { PHIType, ReplacementStyle } from "../VulpesCelare";

// ============================================================================
// CLI OPTIONS INTERFACES
// ============================================================================

/**
 * Base options shared across all CLI commands
 */
export interface BaseCliOptions {
  /** Enable verbose output */
  verbose?: boolean;
  /** Quiet mode - suppress non-essential output */
  quiet?: boolean;
}

/**
 * Options for the redact command
 */
export interface RedactOptions extends BaseCliOptions {
  /** Output format */
  output?: "text" | "json" | "diff";
  /** Output file path */
  outFile?: string;
  /** Replacement style for PHI */
  style?: ReplacementStyle;
  /** PHI types to enable */
  enable?: PHIType[];
  /** PHI types to disable */
  disable?: PHIType[];
  /** Policy file to use */
  policy?: string;
}

/**
 * Options for the batch command
 */
export interface BatchOptions extends RedactOptions {
  /** File extension filter */
  ext?: string;
  /** Enable recursive directory search */
  recursive?: boolean;
  /** Output directory */
  outDir?: string;
  /** Number of parallel workers */
  workers?: number;
}

/**
 * Options for the interactive command
 */
export interface InteractiveOptions extends BaseCliOptions {
  /** Replacement style for PHI */
  style?: ReplacementStyle;
  /** Policy file to use */
  policy?: string;
}

/**
 * Options for the analyze command
 */
export interface AnalyzeOptions extends BaseCliOptions {
  /** Output format */
  output?: "text" | "json" | "table";
  /** Show confidence scores */
  showConfidence?: boolean;
  /** Show filter attribution */
  showFilters?: boolean;
}

/**
 * Options for the info command
 */
export interface InfoOptions extends BaseCliOptions {
  /** Output format */
  output?: "text" | "json";
}

/**
 * Options for the filters command
 */
export interface FiltersOptions extends BaseCliOptions {
  /** Output format */
  output?: "text" | "json" | "table";
}

/**
 * Options for the benchmark command
 */
export interface BenchmarkOptions extends BaseCliOptions {
  /** Number of iterations */
  iterations?: number;
  /** Enable warmup runs */
  warmup?: boolean;
  /** Profile to use */
  profile?: string;
}

/**
 * Options for the stream command
 */
export interface StreamOptions extends BaseCliOptions {
  /** Style for PHI replacement */
  style?: ReplacementStyle;
  /** Policy file to use */
  policy?: string;
  /** Enable supervised mode */
  supervised?: boolean;
}

/**
 * Options for the deep-analysis command
 */
export interface DeepAnalysisOptions extends BaseCliOptions {
  /** Threshold check only */
  thresholdOnly?: boolean;
  /** Output format */
  output?: "text" | "json";
}

/**
 * Options for the self-correct command
 */
export interface SelfCorrectOptions extends BaseCliOptions {
  /** Maximum correction iterations */
  maxIterations?: number;
  /** Output format */
  output?: "text" | "json";
}

/**
 * Options for the policy-compile command
 */
export interface PolicyCompileOptions extends BaseCliOptions {
  /** Output file path */
  outFile?: string;
}

// ============================================================================
// NATIVE CHAT OPTIONS
// ============================================================================

/**
 * Options for the native chat command
 */
export interface NativeChatOptions extends BaseCliOptions {
  /** LLM Provider */
  provider?: "anthropic" | "openai" | "openrouter" | "ollama" | "custom";
  /** Model ID */
  model?: string;
  /** API key (overrides env) */
  apiKey?: string;
  /** Base URL for custom providers */
  baseUrl?: string;
  /** Maximum tokens for response */
  maxTokens?: string | number;
  /** Operating mode */
  mode?: "dev" | "qa" | "production";
  /** Enable subagents */
  subagents?: boolean;
  /** Subagent provider */
  subagentProvider?: string;
  /** Subagent model */
  subagentModel?: string;
  /** Subagent API key */
  subagentApiKey?: string;
  /** Max parallel subagents */
  parallel?: string | number;
  /** Skip banner display */
  skipBanner?: boolean;
}

// ============================================================================
// AGENT OPTIONS
// ============================================================================

/**
 * Valid backend types for agent command
 */
export type AgentBackend = "claude" | "codex" | "copilot" | "native";

/**
 * Options for the agent command
 */
export interface AgentOptions extends BaseCliOptions {
  /** Operating mode */
  mode?: "dev" | "qa" | "production";
  /** Backend to use */
  backend?: AgentBackend | string;
  /** Model ID */
  model?: string;
  /** API key */
  apiKey?: string;
  /** Enable auto-vulpesify */
  vulpesify?: boolean;
}

/**
 * Type guard to validate backend value
 */
export function isValidAgentBackend(value: unknown): value is AgentBackend {
  return (
    typeof value === "string" &&
    ["claude", "codex", "copilot", "native"].includes(value)
  );
}

// ============================================================================
// TOOL INPUT INTERFACES
// ============================================================================

/**
 * Input for the redact_text tool
 */
export interface RedactTextToolInput {
  text: string;
}

/**
 * Input for the analyze_redaction tool
 */
export interface AnalyzeRedactionToolInput {
  text: string;
}

/**
 * Input for the read_file tool
 */
export interface ReadFileToolInput {
  path: string;
}

/**
 * Input for the write_file tool
 */
export interface WriteFileToolInput {
  path: string;
  content: string;
}

/**
 * Input for the run_command tool
 */
export interface RunCommandToolInput {
  command: string;
}

/**
 * Input for the list_files tool
 */
export interface ListFilesToolInput {
  directory: string;
  pattern?: string;
}

/**
 * Input for the search_code tool
 */
export interface SearchCodeToolInput {
  pattern: string;
  path?: string;
}

/**
 * Input for the get_system_info tool
 */
export interface GetSystemInfoToolInput {
  // No input required
}

/**
 * Input for the run_tests tool
 */
export interface RunTestsToolInput {
  filter?: string;
}

/**
 * Union type for all tool inputs
 */
export type ToolInput =
  | RedactTextToolInput
  | AnalyzeRedactionToolInput
  | ReadFileToolInput
  | WriteFileToolInput
  | RunCommandToolInput
  | ListFilesToolInput
  | SearchCodeToolInput
  | GetSystemInfoToolInput
  | RunTestsToolInput;

/**
 * Tool use record with typed input
 */
export interface TypedToolUse {
  id: string;
  name: string;
  input: ToolInput;
}

// ============================================================================
// SUBAGENT TYPES
// ============================================================================

/**
 * Subagent role types
 */
export type SubagentRole =
  | "redaction_analyst"
  | "code_analyst"
  | "validation_agent"
  | "dictionary_agent"
  | "research_agent"
  | "custom";

/**
 * Structured findings from subagent analysis
 */
export interface SubagentFindings {
  /** PHI types detected */
  phiTypes?: string[];
  /** Suggested improvements */
  suggestions?: string[];
  /** Confidence scores by category */
  confidenceScores?: Record<string, number>;
  /** Code locations referenced */
  codeLocations?: Array<{
    file: string;
    line?: number;
    description: string;
  }>;
  /** Test results if applicable */
  testResults?: {
    passed: number;
    failed: number;
    skipped: number;
    details?: string[];
  };
  /** Custom data */
  custom?: Record<string, unknown>;
}

/**
 * Context passed to workflow planning functions
 */
export interface WorkflowContext {
  /** The task description */
  task: string;
  /** Recent conversation messages */
  recentMessages?: Array<{
    role: string;
    content: string;
  }>;
  /** Available subagent roles */
  availableRoles: SubagentRole[];
  /** Current mode */
  mode: "dev" | "qa" | "production";
}

// ============================================================================
// API PROVIDER TYPES (replacing any in modelExtractor, etc.)
// ============================================================================

/**
 * OpenAI model list response
 */
export interface OpenAIModelListResponse {
  data: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }>;
}

/**
 * Anthropic model info (for hardcoded list)
 */
export interface AnthropicModelInfo {
  id: string;
  name: string;
  description: string;
  contextLength: number;
}

/**
 * OpenRouter model list response
 */
export interface OpenRouterModelListResponse {
  data: Array<{
    id: string;
    name?: string;
    description?: string;
    context_length?: number;
    pricing?: {
      prompt: string;
      completion: string;
    };
  }>;
}

/**
 * Ollama model list response
 */
export interface OllamaModelListResponse {
  models: Array<{
    name: string;
    modified_at?: string;
    size?: number;
  }>;
}

/**
 * Generic stream chunk for parsing
 */
export interface StreamChunk {
  type?: string;
  delta?: {
    type?: string;
    text?: string;
    partial_json?: string;
  };
  content_block?: {
    type: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
  };
  index?: number;
  choices?: Array<{
    delta?: {
      content?: string;
      tool_calls?: Array<{
        id: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason?: string;
  }>;
  message?: {
    content?: string;
    tool_calls?: Array<{
      id: string;
      function: {
        name: string;
        arguments: string;
      };
    }>;
  };
  done?: boolean;
}

/**
 * HTTP request options for API calls
 */
export interface ApiRequestOptions {
  hostname: string;
  port?: number | string;
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers: Record<string, string>;
  timeout?: number;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for RedactTextToolInput
 */
export function isRedactTextInput(input: unknown): input is RedactTextToolInput {
  return (
    typeof input === "object" &&
    input !== null &&
    "text" in input &&
    typeof (input as RedactTextToolInput).text === "string"
  );
}

/**
 * Type guard for ReadFileToolInput
 */
export function isReadFileInput(input: unknown): input is ReadFileToolInput {
  return (
    typeof input === "object" &&
    input !== null &&
    "path" in input &&
    typeof (input as ReadFileToolInput).path === "string"
  );
}

/**
 * Type guard for WriteFileToolInput
 */
export function isWriteFileInput(input: unknown): input is WriteFileToolInput {
  return (
    typeof input === "object" &&
    input !== null &&
    "path" in input &&
    "content" in input &&
    typeof (input as WriteFileToolInput).path === "string" &&
    typeof (input as WriteFileToolInput).content === "string"
  );
}

/**
 * Type guard for RunCommandToolInput
 */
export function isRunCommandInput(input: unknown): input is RunCommandToolInput {
  return (
    typeof input === "object" &&
    input !== null &&
    "command" in input &&
    typeof (input as RunCommandToolInput).command === "string"
  );
}

/**
 * Type guard for ListFilesToolInput
 */
export function isListFilesInput(input: unknown): input is ListFilesToolInput {
  return (
    typeof input === "object" &&
    input !== null &&
    "directory" in input &&
    typeof (input as ListFilesToolInput).directory === "string"
  );
}

/**
 * Type guard for SearchCodeToolInput
 */
export function isSearchCodeInput(input: unknown): input is SearchCodeToolInput {
  return (
    typeof input === "object" &&
    input !== null &&
    "pattern" in input &&
    typeof (input as SearchCodeToolInput).pattern === "string"
  );
}

/**
 * Type guard for RunTestsToolInput
 */
export function isRunTestsInput(input: unknown): input is RunTestsToolInput {
  return typeof input === "object" && input !== null;
}
