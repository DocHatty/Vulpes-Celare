/**
 * DatalogReasoner - Declarative Datalog-Style Constraint Solver
 *
 * Replaces the imperative CrossTypeReasoner with ~25 declarative rules.
 * Rules are self-documenting and provide full provenance for debugging.
 *
 * BENEFITS:
 * - Declarative: Rules describe WHAT, not HOW
 * - Provenance: Know exactly WHY each decision was made
 * - Extensible: Add new rules without code changes
 * - Testable: Test individual rules in isolation
 *
 * DATALOG SEMANTICS:
 * - Facts: Base assertions from detection (Detected, Nearby, SameText)
 * - Rules: Implications that derive new facts (Adjusted, Conflict)
 * - Negation as Failure: Only positive derivation supported
 *
 * FUTURE: This TypeScript implementation can be swapped for Rust Crepe
 * for 10-50x performance improvement on large documents.
 *
 * @module redaction/core
 */
import { Span, FilterType } from "../models/Span";
import { ReasoningResult } from "./CrossTypeReasoner";
type RuleRelationship = "EXCLUSIVE" | "SUPPORTIVE";
interface Rule {
    name: string;
    type1: FilterType;
    type2: FilterType;
    relationship: RuleRelationship;
    strength: number;
    contextPattern?: RegExp;
    description: string;
}
interface Adjustment {
    spanId: number;
    delta: number;
    reason: string;
    ruleName: string;
}
interface Provenance {
    spanId: number;
    rules: string[];
    adjustments: Adjustment[];
}
export interface DatalogReasoningResult {
    spanId: number;
    adjustedConfidence: number;
    reason: string;
    provenance: Provenance;
}
export declare class DatalogReasoner {
    private static readonly PROXIMITY_WINDOW;
    private static readonly CONSISTENCY_BOOST;
    private static readonly CONFLICT_PENALTY;
    private fallback;
    private rules;
    constructor();
    /**
     * Add a custom rule at runtime
     */
    addRule(rule: Rule): void;
    /**
     * Get all defined rules
     */
    getRules(): Rule[];
    /**
     * Main reasoning entry point
     */
    reason(spans: Span[], fullText: string): ReasoningResult[];
    private isDatalogEnabled;
    /**
     * Run the Datalog-style reasoning engine
     */
    private runDatalogEngine;
    private buildDetectedFacts;
    private buildNearbyFacts;
    private buildSameTextFacts;
    private buildContextFacts;
    private deriveAdjustments;
    private deriveConsistencyAdjustments;
    private buildProvenanceMap;
    private applyAdjustments;
    private normalizeText;
    /**
     * Get statistics about the Datalog engine
     */
    getStatistics(): {
        totalRules: number;
        exclusiveRules: number;
        supportiveRules: number;
        isDatalogEnabled: boolean;
    };
}
export declare const datalogReasoner: DatalogReasoner;
export {};
//# sourceMappingURL=DatalogReasoner.d.ts.map