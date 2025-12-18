/**
 * VULPES CELARE - LLM SDK WRAPPERS
 *
 * Drop-in replacements for OpenAI and Anthropic SDKs that automatically
 * redact PHI before sending to external APIs.
 *
 * @module llm
 *
 * @example
 * ```typescript
 * // OpenAI wrapper
 * import { VulpesOpenAI } from 'vulpes-celare/llm';
 * const openai = new VulpesOpenAI({
 *   apiKey: process.env.OPENAI_API_KEY,
 *   redaction: { enabled: true, reidentifyResponse: true }
 * });
 *
 * // Anthropic wrapper
 * import { VulpesAnthropic } from 'vulpes-celare/llm';
 * const anthropic = new VulpesAnthropic({
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 *   redaction: { enabled: true }
 * });
 * ```
 */

// Base class and types
export {
  BaseLLMWrapper,
  LLMRedactionConfig,
  RedactionMapping,
  RedactionAuditEntry,
} from "./BaseLLMWrapper";

// OpenAI wrapper
export {
  VulpesOpenAI,
  VulpesOpenAIConfig,
  OpenAIMessage,
  OpenAIChatCompletionParams,
  OpenAIChatCompletionResponse,
} from "./OpenAIWrapper";

// Anthropic wrapper
export {
  VulpesAnthropic,
  VulpesAnthropicConfig,
  AnthropicMessage,
  AnthropicContentBlock,
  AnthropicMessageParams,
  AnthropicMessageResponse,
} from "./AnthropicWrapper";
