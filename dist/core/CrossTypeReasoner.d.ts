/**
 * CrossTypeReasoner - Comprehensive Cross-PHI-Type Reasoning Engine
 *
 * Implements constraint solving and mutual exclusion logic across all PHI types.
 * When one PHI type is detected, it can inform or contradict other types.
 *
 * RESEARCH BASIS:
 * - Constraint Propagation (Waltz, 1975)
 * - Belief Revision (Alchourrón, Gärdenfors, Makinson, 1985)
 * - Mutual Information for feature correlation
 *
 * REASONING RULES:
 * 1. Mutual Exclusion: Some types cannot coexist at same position
 * 2. Mutual Support: Some types reinforce each other
 * 3. Context Propagation: Detecting one type informs nearby spans
 * 4. Document-Level Consistency: Same entity should have same type throughout
 *
 * @module redaction/core
 */
import { Span, FilterType } from "../models/Span";
/**
 * Constraint between two PHI types
 */
interface TypeConstraint {
    type1: FilterType;
    type2: FilterType;
    relationship: "EXCLUSIVE" | "SUPPORTIVE" | "NEUTRAL";
    strength: number;
    contextRequired?: RegExp;
    reason: string;
}
/**
 * Cross-type reasoning result for a span
 */
export interface ReasoningResult {
    span: Span;
    originalType: FilterType;
    resolvedType: FilterType;
    originalConfidence: number;
    adjustedConfidence: number;
    reasoning: string[];
    constraintsApplied: string[];
}
/**
 * CrossTypeReasoner - Main reasoning class
 */
export declare class CrossTypeReasoner {
    private constraints;
    private entityTracker;
    private static readonly CONSISTENCY_BOOST;
    private static readonly CONFLICT_PENALTY;
    private static readonly MIN_CONFIDENCE_THRESHOLD;
    private static readonly PROXIMITY_WINDOW;
    constructor();
    /**
     * Initialize built-in type constraints
     */
    private initializeConstraints;
    /**
     * Add custom constraint
     */
    addConstraint(constraint: TypeConstraint): void;
    /**
     * Apply cross-type reasoning to a set of spans
     */
    reason(spans: Span[], fullText: string): ReasoningResult[];
    /**
     * Clear entity tracker - call this between documents in batch processing
     * or when done with a processing session
     */
    clearEntityTracker(): void;
    /**
     * Build map of entity occurrences across document
     */
    private buildEntityMap;
    /**
     * Apply document-level consistency (same text = same type)
     */
    private applyDocumentConsistency;
    /**
     * Apply pairwise constraints to a single span
     */
    private applyConstraints;
    /**
     * Resolve remaining conflicts using context analysis
     */
    private resolveConflicts;
    /**
     * Check if two ranges overlap
     */
    private overlaps;
    /**
     * Normalize text for entity matching
     */
    private normalizeText;
    /**
     * Get applicable constraints for a type pair
     */
    getConstraints(type1: FilterType, type2: FilterType): TypeConstraint[];
    /**
     * Resolve ambiguous spans based on context
     * Enhanced version of InterPHIDisambiguator
     */
    resolveAmbiguousSpans(spans: Span[], fullText: string): Span[];
    /**
     * Check if a type change is valid based on constraints
     */
    isTypeChangeValid(span: Span, newType: FilterType, nearbySpans: Span[]): {
        valid: boolean;
        reason: string;
    };
    /**
     * Get reasoning statistics
     */
    getStatistics(): {
        totalConstraints: number;
        exclusiveConstraints: number;
        supportiveConstraints: number;
        trackedEntities: number;
    };
}
export declare const crossTypeReasoner: CrossTypeReasoner;
export {};
//# sourceMappingURL=CrossTypeReasoner.d.ts.map