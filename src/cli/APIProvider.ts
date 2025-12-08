/**
 * ============================================================================
 * VULPES CELARE - UNIFIED API PROVIDER SYSTEM
 * ============================================================================
 *
 * Multi-provider LLM integration with automatic model discovery.
 * Supports: OpenAI, Anthropic, OpenRouter, Ollama, Azure, and custom endpoints.
 *
 * Features:
 * - Auto-detect available models via API ping
 * - Interactive provider/model selection
 * - Unified streaming interface
 * - Vulpes system prompt injection
 */

import * as https from "https";
import * as http from "http";
import * as readline from "readline";
import chalk from "chalk";
import ora, { Ora } from "ora";
import figures from "figures";

import { getSystemPrompt } from "./SystemPrompts";

// ============================================================================
// TYPES
// ============================================================================

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  authHeader: string;
  authPrefix: string;
  envKey: string;
  modelsEndpoint: string;
  chatEndpoint: string;
  modelExtractor: (response: any) => ModelInfo[];
  requestBuilder: (
    messages: Message[],
    model: string,
    options: RequestOptions,
  ) => any;
  responseExtractor: (chunk: any) => {
    text?: string;
    done?: boolean;
    toolUse?: ToolUseEvent;
  };
  supportsStreaming: boolean;
  supportsTools: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  contextLength?: number;
  pricing?: { input: number; output: number };
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: any;
  tool_use_id?: string;
  content?: string;
}

export interface RequestOptions {
  maxTokens?: number;
  temperature?: number;
  tools?: Tool[];
  stream?: boolean;
}

export interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolUseEvent {
  id: string;
  name: string;
  input: any;
}

export interface StreamEvent {
  type:
    | "text"
    | "tool_use_start"
    | "tool_use_delta"
    | "tool_use_end"
    | "done"
    | "error";
  text?: string;
  toolUse?: ToolUseEvent;
  error?: string;
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
};

// ============================================================================
// LOCAL API KEY STORAGE
// ============================================================================

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const VULPES_CONFIG_DIR = path.join(os.homedir(), ".vulpes");
const VULPES_KEYS_FILE = path.join(VULPES_CONFIG_DIR, "api-keys.json");

interface StoredKeys {
  [envKey: string]: string;
}

/**
 * Load saved API keys from local config
 */
function loadSavedKeys(): StoredKeys {
  try {
    if (fs.existsSync(VULPES_KEYS_FILE)) {
      return JSON.parse(fs.readFileSync(VULPES_KEYS_FILE, "utf-8"));
    }
  } catch {
    // Ignore errors, return empty
  }
  return {};
}

/**
 * Save an API key to local config
 */
function saveApiKey(envKey: string, apiKey: string): void {
  try {
    if (!fs.existsSync(VULPES_CONFIG_DIR)) {
      fs.mkdirSync(VULPES_CONFIG_DIR, { recursive: true });
    }

    const keys = loadSavedKeys();
    keys[envKey] = apiKey;

    fs.writeFileSync(VULPES_KEYS_FILE, JSON.stringify(keys, null, 2), {
      mode: 0o600, // Owner read/write only for security
    });
  } catch {
    // Silently fail - not critical
  }
}

/**
 * Get API key - checks env first, then local storage
 */
function getApiKey(envKey: string): string {
  // Check environment first
  if (process.env[envKey]) {
    return process.env[envKey]!;
  }

  // Check local storage
  const saved = loadSavedKeys();
  if (saved[envKey]) {
    // Also set in process.env for this session
    process.env[envKey] = saved[envKey];
    return saved[envKey];
  }

  return "";
}

// ============================================================================
// PROVIDER CONFIGURATIONS
// ============================================================================

export const PROVIDERS: Record<string, ProviderConfig> = {
  anthropic: {
    id: "anthropic",
    name: "Anthropic (Claude)",
    baseUrl: "api.anthropic.com",
    authHeader: "x-api-key",
    authPrefix: "",
    envKey: "ANTHROPIC_API_KEY",
    modelsEndpoint: "/v1/models",
    chatEndpoint: "/v1/messages",
    modelExtractor: (response) => {
      // Anthropic doesn't have a public models endpoint, return known models
      return [
        {
          id: "claude-opus-4-20250514",
          name: "Claude Opus 4",
          description: "Most capable",
          contextLength: 200000,
        },
        {
          id: "claude-sonnet-4-20250514",
          name: "Claude Sonnet 4",
          description: "Balanced",
          contextLength: 200000,
        },
        {
          id: "claude-3-5-sonnet-20241022",
          name: "Claude 3.5 Sonnet",
          description: "Fast & capable",
          contextLength: 200000,
        },
        {
          id: "claude-3-5-haiku-20241022",
          name: "Claude 3.5 Haiku",
          description: "Fastest",
          contextLength: 200000,
        },
      ];
    },
    requestBuilder: (messages, model, options) => ({
      model,
      max_tokens: options.maxTokens || 8192,
      messages: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role,
          content: m.content,
        })),
      system: messages.find((m) => m.role === "system")?.content || "",
      tools: options.tools,
      stream: options.stream !== false,
    }),
    responseExtractor: (chunk) => {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta?.type === "text_delta"
      ) {
        return { text: chunk.delta.text };
      }
      if (
        chunk.type === "content_block_start" &&
        chunk.content_block?.type === "tool_use"
      ) {
        return {
          toolUse: {
            id: chunk.content_block.id,
            name: chunk.content_block.name,
            input: {},
          },
        };
      }
      if (chunk.type === "message_stop") {
        return { done: true };
      }
      return {};
    },
    supportsStreaming: true,
    supportsTools: true,
  },

  openai: {
    id: "openai",
    name: "OpenAI",
    baseUrl: "api.openai.com",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    envKey: "OPENAI_API_KEY",
    modelsEndpoint: "/v1/models",
    chatEndpoint: "/v1/chat/completions",
    modelExtractor: (response) => {
      const models = response.data || [];
      return models
        .filter(
          (m: any) =>
            m.id.includes("gpt") || m.id.includes("o1") || m.id.includes("o3"),
        )
        .map((m: any) => ({
          id: m.id,
          name: m.id,
          description: m.owned_by,
        }))
        .sort((a: ModelInfo, b: ModelInfo) => a.id.localeCompare(b.id));
    },
    requestBuilder: (messages, model, options) => ({
      model,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
      messages: messages.map((m) => ({
        role: m.role,
        content:
          typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      })),
      tools: options.tools?.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        },
      })),
      stream: options.stream !== false,
    }),
    responseExtractor: (chunk) => {
      const delta = chunk.choices?.[0]?.delta;
      if (delta?.content) {
        return { text: delta.content };
      }
      if (chunk.choices?.[0]?.finish_reason === "stop") {
        return { done: true };
      }
      return {};
    },
    supportsStreaming: true,
    supportsTools: true,
  },

  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "openrouter.ai",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    envKey: "OPENROUTER_API_KEY",
    modelsEndpoint: "/api/v1/models",
    chatEndpoint: "/api/v1/chat/completions",
    modelExtractor: (response) => {
      const models = response.data || [];
      return models.map((m: any) => ({
        id: m.id,
        name: m.name || m.id,
        description: m.description,
        contextLength: m.context_length,
        pricing: m.pricing
          ? { input: m.pricing.prompt, output: m.pricing.completion }
          : undefined,
      }));
    },
    requestBuilder: (messages, model, options) => ({
      model,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
      messages: messages.map((m) => ({
        role: m.role,
        content:
          typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      })),
      stream: options.stream !== false,
    }),
    responseExtractor: (chunk) => {
      const delta = chunk.choices?.[0]?.delta;
      if (delta?.content) {
        return { text: delta.content };
      }
      if (chunk.choices?.[0]?.finish_reason === "stop") {
        return { done: true };
      }
      return {};
    },
    supportsStreaming: true,
    supportsTools: false, // OpenRouter tool support varies by model
  },

  ollama: {
    id: "ollama",
    name: "Ollama (Local)",
    baseUrl: "localhost:11434",
    authHeader: "",
    authPrefix: "",
    envKey: "",
    modelsEndpoint: "/api/tags",
    chatEndpoint: "/api/chat",
    modelExtractor: (response) => {
      const models = response.models || [];
      return models.map((m: any) => ({
        id: m.name,
        name: m.name,
        description: `${(m.size / 1e9).toFixed(1)}GB`,
      }));
    },
    requestBuilder: (messages, model, options) => ({
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content:
          typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      })),
      stream: options.stream !== false,
    }),
    responseExtractor: (chunk) => {
      if (chunk.message?.content) {
        return { text: chunk.message.content };
      }
      if (chunk.done) {
        return { done: true };
      }
      return {};
    },
    supportsStreaming: true,
    supportsTools: false,
  },

  custom: {
    id: "custom",
    name: "Custom Endpoint",
    baseUrl: "",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    envKey: "",
    modelsEndpoint: "/v1/models",
    chatEndpoint: "/v1/chat/completions",
    modelExtractor: (response) => {
      const models = response.data || response.models || [];
      return models.map((m: any) => ({
        id: m.id || m.name,
        name: m.name || m.id,
      }));
    },
    requestBuilder: (messages, model, options) => ({
      model,
      max_tokens: options.maxTokens || 4096,
      messages: messages.map((m) => ({
        role: m.role,
        content:
          typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      })),
      stream: options.stream !== false,
    }),
    responseExtractor: (chunk) => {
      const delta = chunk.choices?.[0]?.delta;
      if (delta?.content) {
        return { text: delta.content };
      }
      if (chunk.done || chunk.choices?.[0]?.finish_reason === "stop") {
        return { done: true };
      }
      return {};
    },
    supportsStreaming: true,
    supportsTools: false,
  },
};

// ============================================================================
// API PROVIDER CLASS
// ============================================================================

export class APIProvider {
  private config: ProviderConfig;
  private apiKey: string;
  private baseUrl: string;
  private selectedModel: string | null = null;
  private availableModels: ModelInfo[] = [];

  constructor(providerId: string, apiKey?: string, customBaseUrl?: string) {
    const provider = PROVIDERS[providerId];
    if (!provider) {
      throw new Error(
        `Unknown provider: ${providerId}. Available: ${Object.keys(PROVIDERS).join(", ")}`,
      );
    }

    this.config = { ...provider };
    this.apiKey = apiKey || process.env[provider.envKey] || "";
    this.baseUrl = customBaseUrl || provider.baseUrl;

    if (customBaseUrl) {
      // Parse custom URL to extract host
      const url = new URL(
        customBaseUrl.startsWith("http")
          ? customBaseUrl
          : `https://${customBaseUrl}`,
      );
      this.baseUrl = url.host;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MODEL DISCOVERY
  // ══════════════════════════════════════════════════════════════════════════

  async fetchAvailableModels(): Promise<ModelInfo[]> {
    // For providers without dynamic model endpoint, return static list
    if (this.config.id === "anthropic") {
      this.availableModels = this.config.modelExtractor({});
      return this.availableModels;
    }

    const isLocal = this.config.id === "ollama";
    const protocol = isLocal ? http : https;

    return new Promise((resolve, reject) => {
      const options: any = {
        hostname: this.baseUrl.split(":")[0],
        port: isLocal ? parseInt(this.baseUrl.split(":")[1]) || 11434 : 443,
        path: this.config.modelsEndpoint,
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (this.apiKey && this.config.authHeader) {
        options.headers[this.config.authHeader] =
          `${this.config.authPrefix}${this.apiKey}`;
      }

      const req = protocol.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            if (response.error) {
              reject(new Error(response.error.message || "API error"));
              return;
            }
            this.availableModels = this.config.modelExtractor(response);
            resolve(this.availableModels);
          } catch (e) {
            reject(
              new Error(
                `Failed to parse models response: ${data.substring(0, 200)}`,
              ),
            );
          }
        });
      });

      req.on("error", (e) => reject(e));
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });
      req.end();
    });
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.fetchAvailableModels();
      return true;
    } catch (e) {
      return false;
    }
  }

  getAvailableModels(): ModelInfo[] {
    return this.availableModels;
  }

  setModel(modelId: string): void {
    this.selectedModel = modelId;
  }

  getModel(): string | null {
    return this.selectedModel;
  }

  getProviderName(): string {
    return this.config.name;
  }

  getProviderId(): string {
    return this.config.id;
  }

  supportsTools(): boolean {
    return this.config.supportsTools;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STREAMING CHAT
  // ══════════════════════════════════════════════════════════════════════════

  async *streamChat(
    messages: Message[],
    options: RequestOptions = {},
  ): AsyncGenerator<StreamEvent> {
    if (!this.selectedModel) {
      throw new Error("No model selected. Call setModel() first.");
    }

    const isLocal = this.config.id === "ollama";
    const protocol = isLocal ? http : https;

    const requestBody = this.config.requestBuilder(
      messages,
      this.selectedModel,
      {
        ...options,
        stream: true,
      },
    );

    const postData = JSON.stringify(requestBody);

    const response = await new Promise<any>((resolve, reject) => {
      const reqOptions: any = {
        hostname: this.baseUrl.split(":")[0],
        port: isLocal ? parseInt(this.baseUrl.split(":")[1]) || 11434 : 443,
        path: this.config.chatEndpoint,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      };

      if (this.apiKey && this.config.authHeader) {
        reqOptions.headers[this.config.authHeader] =
          `${this.config.authPrefix}${this.apiKey}`;
      }

      // Anthropic specific header
      if (this.config.id === "anthropic") {
        reqOptions.headers["anthropic-version"] = "2023-06-01";
      }

      const req = protocol.request(reqOptions, resolve);
      req.on("error", reject);
      req.write(postData);
      req.end();
    });

    let buffer = "";
    let currentToolUse: { id: string; name: string; input: string } | null =
      null;

    for await (const chunk of response) {
      buffer += chunk.toString();

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;

        // Handle SSE format
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            yield { type: "done" };
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const extracted = this.config.responseExtractor(parsed);

            if (extracted.text) {
              yield { type: "text", text: extracted.text };
            }
            if (extracted.toolUse) {
              yield { type: "tool_use_start", toolUse: extracted.toolUse };
            }
            if (extracted.done) {
              yield { type: "done" };
            }
          } catch (e) {
            // Skip invalid JSON
          }
        } else {
          // Handle non-SSE streaming (Ollama)
          try {
            const parsed = JSON.parse(line);
            const extracted = this.config.responseExtractor(parsed);

            if (extracted.text) {
              yield { type: "text", text: extracted.text };
            }
            if (extracted.done) {
              yield { type: "done" };
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // NON-STREAMING CHAT
  // ══════════════════════════════════════════════════════════════════════════

  async chat(
    messages: Message[],
    options: RequestOptions = {},
  ): Promise<string> {
    let fullResponse = "";
    for await (const event of this.streamChat(messages, {
      ...options,
      stream: true,
    })) {
      if (event.type === "text" && event.text) {
        fullResponse += event.text;
      }
    }
    return fullResponse;
  }
}

// ============================================================================
// INTERACTIVE PROVIDER SETUP
// ============================================================================

export async function interactiveProviderSetup(): Promise<{
  provider: APIProvider;
  model: string;
} | null> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => resolve(answer.trim()));
    });
  };

  console.log(theme.info.bold("\n  SELECT API PROVIDER:\n"));

  const providerList = Object.values(PROVIDERS);
  const savedKeys = loadSavedKeys();

  for (let i = 0; i < providerList.length; i++) {
    const p = providerList[i];
    let envStatus: string;

    if (!p.envKey) {
      envStatus = theme.success(" [no key needed]");
    } else if (process.env[p.envKey]) {
      envStatus = theme.success(" [env]");
    } else if (savedKeys[p.envKey]) {
      envStatus = theme.success(" [saved]");
    } else {
      envStatus = theme.muted(" [no key]");
    }

    console.log(
      `  ${theme.accent.bold(`[${i + 1}]`)} ${theme.primary(p.name)}${envStatus}`,
    );
  }

  console.log(theme.muted("\n  [b] Back\n"));

  const providerChoice = await question(theme.secondary("  Your choice: "));

  if (providerChoice.toLowerCase() === "b") {
    rl.close();
    return null;
  }

  const providerIndex = parseInt(providerChoice) - 1;
  if (
    isNaN(providerIndex) ||
    providerIndex < 0 ||
    providerIndex >= providerList.length
  ) {
    console.log(theme.error("  Invalid choice"));
    rl.close();
    return null;
  }

  const selectedProviderConfig = providerList[providerIndex];
  let apiKey = getApiKey(selectedProviderConfig.envKey);
  let customUrl = "";

  // Ask for API key if not in env or saved locally
  if (selectedProviderConfig.envKey && !apiKey) {
    console.log(
      theme.warning(`\n  ${selectedProviderConfig.envKey} not found.`),
    );
    apiKey = await question(
      theme.secondary(`  Enter API key (or press Enter to skip): `),
    );

    if (!apiKey) {
      console.log(theme.error("  API key required for this provider."));
      rl.close();
      return null;
    }

    // Save the key for future sessions
    saveApiKey(selectedProviderConfig.envKey, apiKey);
    console.log(
      theme.success(
        `  ${figures.tick} API key saved to ~/.vulpes/api-keys.json`,
      ),
    );
  }

  // Ask for custom URL if custom provider
  if (selectedProviderConfig.id === "custom") {
    customUrl = await question(
      theme.secondary("  Enter base URL (e.g., https://my-api.com): "),
    );
    if (!customUrl) {
      console.log(theme.error("  Base URL required for custom provider."));
      rl.close();
      return null;
    }
  }

  // Create provider and fetch models
  const provider = new APIProvider(
    selectedProviderConfig.id,
    apiKey,
    customUrl,
  );

  const spinner = ora({
    text: "Fetching available models...",
    spinner: "dots12",
    color: "yellow",
  }).start();

  try {
    const models = await provider.fetchAvailableModels();
    spinner.succeed(`Found ${models.length} models`);

    if (models.length === 0) {
      console.log(theme.error("  No models available."));
      rl.close();
      return null;
    }

    // Show model selection
    console.log(theme.info.bold("\n  SELECT MODEL:\n"));

    // Show first 20 models in a clean format (just ID + context)
    const displayLimit = 20;
    const displayModels = models.slice(0, displayLimit);

    for (let i = 0; i < displayModels.length; i++) {
      const m = displayModels[i];
      const ctx = m.contextLength
        ? theme.muted(` [${(m.contextLength / 1000).toFixed(0)}K]`)
        : "";
      // Just show model ID, no verbose descriptions
      console.log(
        `  ${theme.accent.bold(`[${i + 1}]`)} ${theme.primary(m.id)}${ctx}`,
      );
    }

    if (models.length > displayLimit) {
      console.log(
        theme.muted(
          `\n  ... and ${models.length - displayLimit} more. Enter model ID directly to use others.`,
        ),
      );
    }

    console.log();
    const modelChoice = await question(
      theme.secondary("  Your choice (number or model ID): "),
    );

    let selectedModel: string;

    const modelIndex = parseInt(modelChoice) - 1;
    if (
      !isNaN(modelIndex) &&
      modelIndex >= 0 &&
      modelIndex < displayModels.length
    ) {
      selectedModel = displayModels[modelIndex].id;
    } else if (modelChoice) {
      // Try to find by ID
      const found = models.find(
        (m) => m.id === modelChoice || m.id.includes(modelChoice),
      );
      if (found) {
        selectedModel = found.id;
      } else {
        // Use as-is (user might know a model ID not in the list)
        selectedModel = modelChoice;
      }
    } else {
      console.log(theme.error("  No model selected."));
      rl.close();
      return null;
    }

    provider.setModel(selectedModel);
    console.log(
      theme.success(`\n  ${figures.tick} Selected: ${selectedModel}`),
    );

    rl.close();
    return { provider, model: selectedModel };
  } catch (error: any) {
    spinner.fail("Failed to fetch models");
    console.log(theme.error(`  Error: ${error.message}`));
    rl.close();
    return null;
  }
}

// ============================================================================
// CREATE PROVIDER FROM OPTIONS
// ============================================================================

export function createProviderFromOptions(options: {
  provider?: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}): APIProvider | null {
  const providerId = options.provider || "anthropic";
  const apiKey =
    options.apiKey || process.env[PROVIDERS[providerId]?.envKey || ""];

  if (!apiKey && PROVIDERS[providerId]?.envKey) {
    return null; // Will need interactive setup
  }

  const provider = new APIProvider(providerId, apiKey, options.baseUrl);

  if (options.model) {
    provider.setModel(options.model);
  }

  return provider;
}
