"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VulpesAnthropic = exports.VulpesOpenAI = exports.BaseLLMWrapper = void 0;
// Base class and types
var BaseLLMWrapper_1 = require("./BaseLLMWrapper");
Object.defineProperty(exports, "BaseLLMWrapper", { enumerable: true, get: function () { return BaseLLMWrapper_1.BaseLLMWrapper; } });
// OpenAI wrapper
var OpenAIWrapper_1 = require("./OpenAIWrapper");
Object.defineProperty(exports, "VulpesOpenAI", { enumerable: true, get: function () { return OpenAIWrapper_1.VulpesOpenAI; } });
// Anthropic wrapper
var AnthropicWrapper_1 = require("./AnthropicWrapper");
Object.defineProperty(exports, "VulpesAnthropic", { enumerable: true, get: function () { return AnthropicWrapper_1.VulpesAnthropic; } });
//# sourceMappingURL=index.js.map