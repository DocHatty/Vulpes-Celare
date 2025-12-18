"use strict";
/**
 * VULPES CELARE - EXPLANATION GENERATOR
 *
 * Generates human-readable explanations for every redaction decision.
 * Leverages existing Span metadata to provide full audit trails.
 *
 * This is a key differentiator: deterministic filters enable explainable AI
 * that black-box ML systems cannot match.
 *
 * @module ExplanationGenerator
 *
 * @example
 * ```typescript
 * import { ExplanationGenerator } from 'vulpes-celare/explanations';
 *
 * const result = await engine.process(text, { generateExplanations: true });
 * for (const explanation of result.explanations) {
 *   console.log(explanation.summary);
 * }
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExplanationGenerator = void 0;
/**
 * Filter type to human-readable name mapping
 */
const FILTER_TYPE_NAMES = {
    NAME: "Person Name",
    PROVIDER_NAME: "Healthcare Provider Name",
    EMAIL: "Email Address",
    SSN: "Social Security Number",
    PHONE: "Phone Number",
    FAX: "Fax Number",
    ADDRESS: "Physical Address",
    ZIPCODE: "ZIP Code",
    CITY: "City",
    STATE: "State",
    DATE: "Date",
    RELATIVE_DATE: "Relative Date",
    AGE: "Age",
    CREDIT_CARD: "Credit Card Number",
    ACCOUNT: "Account Number",
    MRN: "Medical Record Number",
    HEALTH_PLAN: "Health Plan Number",
    DEVICE: "Device Identifier",
    LICENSE: "License Number",
    PASSPORT: "Passport Number",
    IP: "IP Address",
    URL: "URL",
    BIOMETRIC: "Biometric Identifier",
    VEHICLE: "Vehicle Identifier",
};
/**
 * Patterns that indicate dictionary-based detection
 */
const DICTIONARY_FILTER_TYPES = new Set([
    "NAME",
    "PROVIDER_NAME",
    "CITY",
    "STATE",
]);
/**
 * Patterns that indicate regex-based detection
 */
const REGEX_FILTER_TYPES = new Set([
    "SSN",
    "PHONE",
    "FAX",
    "EMAIL",
    "CREDIT_CARD",
    "IP",
    "URL",
    "MRN",
    "ZIPCODE",
    "DATE",
]);
/**
 * ExplanationGenerator - Creates human-readable explanations for redaction decisions
 */
class ExplanationGenerator {
    /** Default confidence threshold for redaction decisions */
    static DEFAULT_THRESHOLD = 0.6;
    /**
     * Generate explanation from existing Span metadata
     *
     * @param span - The span to explain
     * @param threshold - Confidence threshold (default: 0.6)
     * @returns Complete redaction explanation
     */
    static explain(span, threshold = ExplanationGenerator.DEFAULT_THRESHOLD) {
        const matchSource = this.inferMatchSource(span);
        const contextIndicators = this.extractContextIndicators(span);
        const confidenceFactors = this.decomposeConfidence(span, contextIndicators);
        const isDictionaryHit = DICTIONARY_FILTER_TYPES.has(span.filterType);
        return {
            detectedValue: span.text,
            phiType: span.filterType,
            matchedBy: matchSource,
            patternMatched: span.pattern,
            dictionaryHit: isDictionaryHit,
            contextIndicators,
            confidenceFactors,
            finalConfidence: span.confidence,
            decisionThreshold: threshold,
            decision: span.confidence >= threshold ? "REDACT" : "ALLOW",
            summary: this.generateSummary(span, threshold, contextIndicators),
            position: {
                start: span.characterStart,
                end: span.characterEnd,
            },
            contextWindow: span.window,
            alternativeTypes: span.ambiguousWith || [],
        };
    }
    /**
     * Generate full explanation report for all redactions
     *
     * @param result - Redaction result with spans
     * @param spans - Array of detected spans
     * @param threshold - Confidence threshold
     * @returns Complete explanation report
     */
    static generateReport(result, spans, threshold = ExplanationGenerator.DEFAULT_THRESHOLD) {
        const explanations = spans.map((span) => this.explain(span, threshold));
        const byType = {};
        let redactedCount = 0;
        let allowedCount = 0;
        for (const explanation of explanations) {
            const typeKey = explanation.phiType;
            byType[typeKey] = (byType[typeKey] || 0) + 1;
            if (explanation.decision === "REDACT") {
                redactedCount++;
            }
            else {
                allowedCount++;
            }
        }
        return {
            totalDetections: spans.length,
            redactedCount,
            totalExplained: redactedCount, // Alias for convenience
            allowedCount,
            byType,
            explanations,
            timestamp: new Date().toISOString(),
            executionTimeMs: result.executionTimeMs,
        };
    }
    /**
     * Export explanations as auditor-friendly markdown document
     *
     * @param result - Redaction result
     * @param spans - Array of detected spans
     * @param options - Export options
     * @returns Markdown document string
     */
    static exportAuditDocument(result, spans, options = {}) {
        const { includeContext = true, includeFactors = true } = options;
        const report = this.generateReport(result, spans);
        const lines = [
            "# Redaction Audit Report",
            "",
            `**Generated**: ${report.timestamp}`,
            `**Processing Time**: ${report.executionTimeMs}ms`,
            "",
            "## Summary",
            "",
            `| Metric | Value |`,
            `|--------|-------|`,
            `| Total PHI Detected | ${report.totalDetections} |`,
            `| Elements Redacted | ${report.redactedCount} |`,
            `| Elements Allowed | ${report.allowedCount} |`,
            "",
            "### By PHI Type",
            "",
            "| Type | Count |",
            "|------|-------|",
        ];
        for (const [type, count] of Object.entries(report.byType).sort((a, b) => b[1] - a[1])) {
            const typeName = FILTER_TYPE_NAMES[type] || type;
            lines.push(`| ${typeName} | ${count} |`);
        }
        lines.push("", "## Detailed Explanations", "");
        for (let i = 0; i < report.explanations.length; i++) {
            const exp = report.explanations[i];
            const typeName = FILTER_TYPE_NAMES[exp.phiType] || exp.phiType;
            lines.push(`### ${i + 1}. ${typeName}`);
            lines.push("");
            lines.push(`- **Value**: \`${this.maskValue(exp.detectedValue)}\``);
            lines.push(`- **Position**: ${exp.position.start}-${exp.position.end}`);
            lines.push(`- **Confidence**: ${(exp.finalConfidence * 100).toFixed(1)}%`);
            lines.push(`- **Decision**: ${exp.decision}`);
            lines.push(`- **Matched By**: ${exp.matchedBy}`);
            if (exp.patternMatched) {
                lines.push(`- **Pattern**: \`${exp.patternMatched}\``);
            }
            if (exp.dictionaryHit) {
                lines.push(`- **Dictionary Match**: Yes`);
            }
            if (includeContext && exp.contextIndicators.length > 0) {
                lines.push(`- **Context Indicators**:`);
                for (const indicator of exp.contextIndicators) {
                    lines.push(`  - ${indicator}`);
                }
            }
            if (includeFactors && exp.confidenceFactors.length > 0) {
                lines.push(`- **Confidence Factors**:`);
                for (const factor of exp.confidenceFactors) {
                    const sign = factor.impact >= 0 ? "+" : "";
                    lines.push(`  - ${factor.factor}: ${sign}${(factor.impact * 100).toFixed(0)}% (${factor.reason})`);
                }
            }
            if (exp.alternativeTypes.length > 0) {
                const altNames = exp.alternativeTypes
                    .map((t) => FILTER_TYPE_NAMES[t] || t)
                    .join(", ");
                lines.push(`- **Also Considered As**: ${altNames}`);
            }
            lines.push("");
            lines.push(`> **Summary**: ${exp.summary}`);
            lines.push("");
        }
        lines.push("---");
        lines.push("");
        lines.push("*Generated by Vulpes Celare Explanation API*");
        return lines.join("\n");
    }
    /**
     * Export explanations as JSON for programmatic consumption
     *
     * @param result - Redaction result
     * @param spans - Array of detected spans
     * @param options - Export options
     * @returns JSON string
     */
    static exportJSON(result, spans, options = {}) {
        const { includeOriginalText = false, prettyPrint = true } = options;
        const report = this.generateReport(result, spans);
        // Sanitize explanations if needed
        const sanitizedExplanations = report.explanations.map((exp) => ({
            ...exp,
            detectedValue: includeOriginalText
                ? exp.detectedValue
                : this.maskValue(exp.detectedValue),
        }));
        const exportData = {
            ...report,
            explanations: sanitizedExplanations,
            meta: {
                generator: "vulpes-celare/explanations",
                version: "1.0.0",
                sanitized: !includeOriginalText,
            },
        };
        return prettyPrint
            ? JSON.stringify(exportData, null, 2)
            : JSON.stringify(exportData);
    }
    /**
     * Infer the match source from span metadata
     */
    static inferMatchSource(span) {
        const type = span.filterType;
        // Check if it has a regex pattern
        if (span.pattern) {
            return `${type} regex pattern`;
        }
        // Dictionary-based types
        if (DICTIONARY_FILTER_TYPES.has(type)) {
            return `${type} dictionary lookup`;
        }
        // Regex-based types
        if (REGEX_FILTER_TYPES.has(type)) {
            return `${type} pattern matching`;
        }
        // Context-based detection
        if (span.window && span.window.length > 0) {
            return `${type} contextual detection`;
        }
        return `${type} filter`;
    }
    /**
     * Extract context indicators from span's window
     */
    static extractContextIndicators(span) {
        const indicators = [];
        if (!span.window || span.window.length === 0) {
            return indicators;
        }
        // Common context patterns
        const contextPatterns = [
            { pattern: /patient/i, description: "preceded by 'patient'" },
            { pattern: /name/i, description: "near 'name' keyword" },
            { pattern: /dob|birth/i, description: "near date of birth context" },
            { pattern: /ssn|social/i, description: "near SSN context" },
            { pattern: /mrn|record/i, description: "near medical record context" },
            { pattern: /phone|call|contact/i, description: "near phone context" },
            { pattern: /email|@/i, description: "near email context" },
            { pattern: /address|street|apt/i, description: "near address context" },
            { pattern: /dr\.|doctor|physician/i, description: "near provider context" },
            { pattern: /insurance|plan|coverage/i, description: "near insurance context" },
        ];
        const windowText = span.window.join(" ").toLowerCase();
        for (const { pattern, description } of contextPatterns) {
            if (pattern.test(windowText)) {
                indicators.push(description);
            }
        }
        return indicators;
    }
    /**
     * Decompose confidence score into contributing factors
     */
    static decomposeConfidence(span, contextIndicators) {
        const factors = [];
        // Base confidence from filter
        const baseConfidence = this.estimateBaseConfidence(span);
        factors.push({
            factor: "Base Pattern Match",
            impact: baseConfidence,
            reason: `${span.filterType} filter detected match`,
        });
        // Pattern specificity boost
        if (span.pattern) {
            const patternBoost = 0.1;
            factors.push({
                factor: "Pattern Specificity",
                impact: patternBoost,
                reason: "Matched specific regex pattern",
            });
        }
        // Context boost
        if (contextIndicators.length > 0) {
            const contextBoost = Math.min(contextIndicators.length * 0.05, 0.15);
            factors.push({
                factor: "Contextual Support",
                impact: contextBoost,
                reason: `${contextIndicators.length} context indicator(s) found`,
            });
        }
        // Length-based adjustment
        if (span.text.length > 20) {
            factors.push({
                factor: "Length Confidence",
                impact: 0.05,
                reason: "Longer match increases confidence",
            });
        }
        else if (span.text.length < 3) {
            factors.push({
                factor: "Length Penalty",
                impact: -0.1,
                reason: "Very short match decreases confidence",
            });
        }
        // Disambiguation penalty
        if (span.ambiguousWith && span.ambiguousWith.length > 0) {
            const ambiguityPenalty = -0.05 * span.ambiguousWith.length;
            factors.push({
                factor: "Ambiguity Penalty",
                impact: ambiguityPenalty,
                reason: `Could also be ${span.ambiguousWith.join(", ")}`,
            });
        }
        // Priority boost for high-priority types
        if (span.priority >= 90) {
            factors.push({
                factor: "High Priority Type",
                impact: 0.05,
                reason: "PHI type has high sensitivity priority",
            });
        }
        return factors;
    }
    /**
     * Estimate base confidence from filter type
     */
    static estimateBaseConfidence(span) {
        // High-precision types (structured patterns)
        const highPrecisionTypes = new Set([
            "SSN",
            "CREDIT_CARD",
            "IP",
            "EMAIL",
            "PHONE",
        ]);
        if (highPrecisionTypes.has(span.filterType)) {
            return 0.85;
        }
        // Medium-precision types
        const mediumPrecisionTypes = new Set([
            "MRN",
            "DATE",
            "ZIPCODE",
            "URL",
            "FAX",
        ]);
        if (mediumPrecisionTypes.has(span.filterType)) {
            return 0.75;
        }
        // Lower precision types (more context-dependent)
        return 0.65;
    }
    /**
     * Generate human-readable summary for a span
     */
    static generateSummary(span, threshold, contextIndicators) {
        const parts = [];
        const typeName = FILTER_TYPE_NAMES[span.filterType] || span.filterType;
        const decision = span.confidence >= threshold ? "Redacted" : "Allowed";
        parts.push(`${decision} '${this.maskValue(span.text)}' as ${typeName}`);
        // Add match reason
        if (span.pattern) {
            parts.push("matched pattern");
        }
        else if (DICTIONARY_FILTER_TYPES.has(span.filterType)) {
            parts.push("matched dictionary");
        }
        // Add context if present
        if (contextIndicators.length > 0) {
            parts.push(`context: ${contextIndicators.slice(0, 2).join(", ")}`);
        }
        // Add confidence
        parts.push(`confidence ${(span.confidence * 100).toFixed(0)}%`);
        // Add threshold comparison
        if (span.confidence >= threshold) {
            parts.push(`>= ${(threshold * 100).toFixed(0)}% threshold`);
        }
        else {
            parts.push(`< ${(threshold * 100).toFixed(0)}% threshold`);
        }
        return parts.join(", ");
    }
    /**
     * Mask sensitive value for display (show first/last chars)
     */
    static maskValue(value) {
        if (value.length <= 4) {
            return "*".repeat(value.length);
        }
        const visibleChars = Math.min(2, Math.floor(value.length / 4));
        const masked = value.slice(0, visibleChars) +
            "*".repeat(value.length - visibleChars * 2) +
            value.slice(-visibleChars);
        return masked;
    }
}
exports.ExplanationGenerator = ExplanationGenerator;
//# sourceMappingURL=ExplanationGenerator.js.map