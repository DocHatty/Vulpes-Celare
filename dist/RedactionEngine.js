"use strict";
/**
 * RedactionEngine - Thin Orchestrator for PII/PHI Redaction
 *
 * Enterprise-grade redaction system with modular architecture:
 * - Token management (TokenManager, RedactionContext)
 * - Filter registration and application (FilterRegistry)
 * - Policy loading and caching (PolicyLoader)
 * - Statistics tracking (StatisticsTracker)
 * - Parallel NER and regex processing
 *
 * This facade delegates to specialized services while maintaining
 * backward compatibility with the original RedactionEngine interface.
 *
 * @module RedactionEngine
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedactionEngine = exports.BaseFilter = exports.RedactionContext = void 0;
const ConfigLoader_1 = require("./utils/ConfigLoader");
const RadiologyLogger_1 = require("./utils/RadiologyLogger");
const RedactionContext_1 = require("./context/RedactionContext");
const FilterRegistry_1 = require("./filters/FilterRegistry");
const PolicyLoader_1 = require("./policies/PolicyLoader");
const VulpesCelare_1 = require("./VulpesCelare");
const ProvenanceService_1 = require("./services/ProvenanceService");
// Re-export for backward compatibility
var RedactionContext_2 = require("./context/RedactionContext");
Object.defineProperty(exports, "RedactionContext", { enumerable: true, get: function () { return RedactionContext_2.RedactionContext; } });
/**
 * Base Filter - abstract class for all filters
 */
class BaseFilter {
}
exports.BaseFilter = BaseFilter;
/**
 * RedactionEngine - Thin Orchestrator
 * Delegates to specialized services for each concern
 *
 * @deprecated Prefer `VulpesCelare` as the public orchestrator.
 */
class RedactionEngine {
    /**
     * Initialize the redaction engine
     * Loads all Span-based filters for parallel execution
     */
    static async init() {
        await FilterRegistry_1.FilterRegistry.initialize();
        RadiologyLogger_1.RadiologyLogger.info("REDACTION", "Parallel Span-based redaction engine initialized");
    }
    /**
     * Create a new redaction context for a request
     */
    static createContext() {
        return new RedactionContext_1.RedactionContext();
    }
    /**
     * Redact sensitive information from text
     * Parallel processing: Regex filters AND NER both process original text
     *
     * @throws {Error} If text is empty/null when policy requires redaction
     * @throws {Error} If policy is invalid or missing required fields
     * @throws {Error} If context is missing or invalid
     */
    static async redact(text, policy, context) {
        // Validate inputs - fail fast with clear error messages
        if (text === null || text === undefined) {
            throw new Error("Redaction failed: text cannot be null or undefined");
        }
        // Empty text is valid - return as-is
        if (text === "") {
            return text;
        }
        if (!policy) {
            throw new Error("Redaction failed: policy is required");
        }
        if (!policy.identifiers || typeof policy.identifiers !== "object") {
            throw new Error("Redaction failed: policy must have an 'identifiers' object");
        }
        if (!context) {
            throw new Error("Redaction failed: context is required");
        }
        if (typeof context.createToken !== "function") {
            throw new Error("Redaction failed: context must have a createToken method");
        }
        const textLen = text.length;
        const maxSize = ConfigLoader_1.ConfigLoader.getInt("Redaction", "AbsoluteMaxSize", 500000);
        if (textLen > maxSize) {
            RadiologyLogger_1.RadiologyLogger.error("REDACTION", `Text too large: ${textLen} chars - BLOCKING REQUEST`);
            throw new Error(`Text exceeds maximum size (${textLen} > ${maxSize}). Request blocked for security.`);
        }
        const startTime = Date.now();
        try {
            // PARALLEL SPAN-BASED REDACTION
            // All filters scan original text simultaneously, return Spans
            const filters = FilterRegistry_1.FilterRegistry.getAllSpanFilters();
            RadiologyLogger_1.RadiologyLogger.info("REDACTION", `Starting parallel Span-based redaction with ${filters.length} filters`);
            const redactedText = await VulpesCelare_1.VulpesCelare.redactWithPolicy(text, filters, policy, context);
            const totalTime = Date.now() - startTime;
            const stats = context.getStats();
            if (totalTime > 50) {
                RadiologyLogger_1.RadiologyLogger.info("REDACTION", `Completed in ${totalTime}ms - ${stats.totalTokens} tokens`);
            }
            // AUTO-PROVENANCE: Record the redaction job
            try {
                await ProvenanceService_1.ProvenanceService.recordRedaction(text, redactedText);
            }
            catch (provError) {
                RadiologyLogger_1.RadiologyLogger.error("PROVENANCE", "Failed to record provenance", provError);
                // We do NOT block the request if provenance fails, but we log it.
            }
            return redactedText;
        }
        catch (error) {
            RadiologyLogger_1.RadiologyLogger.error("REDACTION", "CRITICAL: Redaction failed - BLOCKING REQUEST", error);
            throw new Error(`Redaction failed: ${error instanceof Error ? error.message : String(error)}. Request blocked for security.`);
        }
    }
    /**
     * Extract NER entities from NER result
     */
    static extractNEREntities(originalText, nerRedactedText, nerContext) {
        const entities = [];
        const tokenPattern = /\{\{[A-Z_]+_\d+_\d+\}\}/g;
        let match;
        while ((match = tokenPattern.exec(nerRedactedText)) !== null) {
            const token = match[0];
            const tokenStart = match.index;
            const originalValue = nerContext.getOriginalValue(token);
            if (!originalValue)
                continue;
            const positionInOriginal = this.mapNERPositionToOriginal(originalText, nerRedactedText, tokenStart, originalValue);
            if (positionInOriginal !== -1) {
                entities.push({
                    start: positionInOriginal,
                    end: positionInOriginal + originalValue.length,
                    text: originalValue,
                    token: token,
                });
            }
        }
        return entities;
    }
    /**
     * Map position in NER-redacted text back to original text position
     */
    static mapNERPositionToOriginal(originalText, nerRedactedText, tokenPosition, originalValue) {
        const searchRadius = 100;
        const searchStart = Math.max(0, tokenPosition - searchRadius);
        const searchEnd = Math.min(originalText.length, tokenPosition + searchRadius);
        const searchWindow = originalText.substring(searchStart, searchEnd);
        const index = searchWindow.indexOf(originalValue);
        if (index !== -1) {
            return searchStart + index;
        }
        return originalText.indexOf(originalValue);
    }
    /**
     * Merge NER entities into regex-redacted text
     */
    static mergeNEREntities(regexRedactedText, nerEntities, context) {
        // Sort entities by start position (descending) for replacement
        const sortedEntities = nerEntities.sort((a, b) => b.start - a.start);
        let mergedText = regexRedactedText;
        for (const entity of sortedEntities) {
            // Check if this position is already redacted (contains token)
            const windowStart = Math.max(0, entity.start - 10);
            const windowEnd = Math.min(mergedText.length, entity.end + 10);
            const window = mergedText.substring(windowStart, windowEnd);
            if (window.includes("{{")) {
                continue; // Already redacted by regex
            }
            // Apply NER token
            const before = mergedText.substring(0, entity.start);
            const after = mergedText.substring(entity.end);
            mergedText = before + entity.token + after;
        }
        return mergedText;
    }
    /**
     * Normalize tokens in LLM response (handle formatting variations)
     */
    static normalizeTokensInResponse(llmResponse) {
        let normalized = llmResponse;
        // Handle: { { TOKEN } } -> {{TOKEN}}
        normalized = normalized.replace(/\{\s*\{([^}]+)\}\s*\}/g, "{{$1}}");
        // Handle: { TOKEN } -> {{TOKEN}} (single braces to double)
        normalized = normalized.replace(/\{\s*([A-Z_0-9]+)\s*\}/g, "{{$1}}");
        // Handle: {{{TOKEN}}} or {TOKEN}} etc -> {{TOKEN}}
        // Use greedy \}+ to consume ALL closing braces, not just one
        normalized = normalized.replace(/\{+\s*([A-Z_0-9]+)\s*\}+/g, "{{$1}}");
        return normalized;
    }
    /**
     * Get system prompt instructions for LLM
     * Compressed to minimize token overhead (~25 tokens vs ~200)
     */
    static getSystemPromptInstructions() {
        return `\n\n[TOKENS: Preserve all {{TYPE_ID_N}} patterns exactly as-is. Do not modify, expand, add spaces, or interpret them.]`;
    }
    /**
     * Load redaction policy from JSON file
     * Delegates to PolicyLoader
     */
    static async loadPolicy(policyName) {
        return await PolicyLoader_1.PolicyLoader.loadPolicy(policyName);
    }
}
exports.RedactionEngine = RedactionEngine;
//# sourceMappingURL=RedactionEngine.js.map