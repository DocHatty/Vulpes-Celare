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
import { Span, FilterType } from "../models/Span";
import { RedactionResult } from "../VulpesCelare";
/**
 * Confidence factor contributing to the final score
 */
export interface ConfidenceFactor {
    /** Name of the factor */
    factor: string;
    /** Impact on confidence (-1.0 to +1.0) */
    impact: number;
    /** Human-readable reason */
    reason: string;
}
/**
 * Complete explanation for a single redaction decision
 */
export interface RedactionExplanation {
    /** The detected value that was redacted */
    detectedValue: string;
    /** PHI type classification */
    phiType: FilterType;
    /** What filter/method detected this */
    matchedBy: string;
    /** Regex pattern that matched (if applicable) */
    patternMatched: string | null;
    /** Dictionary hit (if applicable) */
    dictionaryHit: boolean;
    /** Context indicators that influenced the decision */
    contextIndicators: string[];
    /** Breakdown of confidence score factors */
    confidenceFactors: ConfidenceFactor[];
    /** Final confidence score (0.0-1.0) */
    finalConfidence: number;
    /** Threshold used for decision */
    decisionThreshold: number;
    /** Final decision */
    decision: "REDACT" | "ALLOW";
    /** Human-readable summary */
    summary: string;
    /** Character position in original text */
    position: {
        start: number;
        end: number;
    };
    /** Surrounding context window */
    contextWindow: string[];
    /** Alternative interpretations considered */
    alternativeTypes: FilterType[];
}
/**
 * Complete explanation report for a redaction operation
 */
export interface ExplanationReport {
    /** Total PHI elements detected */
    totalDetections: number;
    /** Elements that were redacted (alias: totalExplained for backward compat) */
    redactedCount: number;
    /** Alias for redactedCount - elements that have explanations */
    totalExplained: number;
    /** Elements that were allowed (below threshold) */
    allowedCount: number;
    /** Breakdown by PHI type */
    byType: Record<string, number>;
    /** Individual explanations */
    explanations: RedactionExplanation[];
    /** Processing timestamp */
    timestamp: string;
    /** Execution time */
    executionTimeMs: number;
}
/**
 * ExplanationGenerator - Creates human-readable explanations for redaction decisions
 */
export declare class ExplanationGenerator {
    /** Default confidence threshold for redaction decisions */
    private static readonly DEFAULT_THRESHOLD;
    /**
     * Generate explanation from existing Span metadata
     *
     * @param span - The span to explain
     * @param threshold - Confidence threshold (default: 0.6)
     * @returns Complete redaction explanation
     */
    static explain(span: Span, threshold?: number): RedactionExplanation;
    /**
     * Generate full explanation report for all redactions
     *
     * @param result - Redaction result with spans
     * @param spans - Array of detected spans
     * @param threshold - Confidence threshold
     * @returns Complete explanation report
     */
    static generateReport(result: RedactionResult, spans: Span[], threshold?: number): ExplanationReport;
    /**
     * Export explanations as auditor-friendly markdown document
     *
     * @param result - Redaction result
     * @param spans - Array of detected spans
     * @param options - Export options
     * @returns Markdown document string
     */
    static exportAuditDocument(result: RedactionResult, spans: Span[], options?: {
        includeContext?: boolean;
        includeFactors?: boolean;
    }): string;
    /**
     * Export explanations as JSON for programmatic consumption
     *
     * @param result - Redaction result
     * @param spans - Array of detected spans
     * @param options - Export options
     * @returns JSON string
     */
    static exportJSON(result: RedactionResult, spans: Span[], options?: {
        includeOriginalText?: boolean;
        prettyPrint?: boolean;
    }): string;
    /**
     * Infer the match source from span metadata
     */
    private static inferMatchSource;
    /**
     * Extract context indicators from span's window
     */
    private static extractContextIndicators;
    /**
     * Decompose confidence score into contributing factors
     */
    private static decomposeConfidence;
    /**
     * Estimate base confidence from filter type
     */
    private static estimateBaseConfidence;
    /**
     * Generate human-readable summary for a span
     */
    private static generateSummary;
    /**
     * Mask sensitive value for display (show first/last chars)
     */
    private static maskValue;
}
//# sourceMappingURL=ExplanationGenerator.d.ts.map