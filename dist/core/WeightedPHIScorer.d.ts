/**
 * WeightedPHIScorer - Advanced Ensemble Scoring for PHI Detection
 *
 * Inspired by Vulpes-NeuralNetwork's sophisticated scoring system.
 * Provides weighted combination of multiple detection signals with:
 * - Detector-specific weights (regex patterns vs neural NER)
 * - Context bonuses (titles, family context, clinical roles)
 * - Whitelist penalties (medical terms, disease eponyms)
 * - Type-specific confidence thresholds
 *
 * RUST ACCELERATION:
 * - Uses Rust VulpesPHIScorer for 10-50x speedup when available
 * - Batch scoring via optimized Rust implementation
 * - Falls back to TypeScript when Rust binding unavailable
 *
 * PERFORMANCE: Designed for high-throughput batch scoring
 *
 * @module redaction/core
 */
import { Span } from "../models/Span";
/**
 * Scoring weights for different detection sources
 */
export interface ScoringWeights {
    lastFirstFormat: number;
    titledName: number;
    patientLabel: number;
    labeledName: number;
    familyRelation: number;
    generalFullName: number;
    highPrecisionPattern: number;
    nerBaseWeight: number;
    nerConfidenceMultiplier: number;
    nerHighConfidenceBonus: number;
    titleContextBonus: number;
    familyContextBonus: number;
    phiLabelBonus: number;
    clinicalRoleBonus: number;
    diseaseEponymPenalty: number;
    diseaseNamePenalty: number;
    medicationPenalty: number;
    procedurePenalty: number;
    anatomicalPenalty: number;
    sectionHeaderPenalty: number;
    organizationPenalty: number;
}
/**
 * Scoring result with breakdown
 */
export interface ScoringResult {
    finalScore: number;
    baseScore: number;
    contextBonus: number;
    whitelistPenalty: number;
    recommendation: "PHI" | "NOT_PHI" | "UNCERTAIN";
    breakdown: {
        source: string;
        value: number;
        reason: string;
    }[];
}
/**
 * WeightedPHIScorer - Main scoring class
 *
 * Uses Rust acceleration when available for 10-50x speedup.
 */
export declare class WeightedPHIScorer {
    private weights;
    private whitelists;
    private decisionThreshold;
    private rustScorer;
    private useRust;
    constructor(weights?: Partial<ScoringWeights>, decisionThreshold?: number);
    /**
     * Check if Rust acceleration is active
     */
    isRustAccelerated(): boolean;
    /**
     * Score a single span
     */
    score(span: Span, context: string): ScoringResult;
    /**
     * Score multiple spans (batch mode)
     *
     * Uses Rust batch scoring for optimal performance when available.
     */
    scoreBatch(spans: Span[], fullText: string): Map<Span, ScoringResult>;
    /**
     * Calculate base score from detection pattern
     */
    private calculateBaseScore;
    /**
     * Calculate context bonuses
     */
    private calculateContextBonus;
    /**
     * Calculate whitelist penalties for medical terms
     */
    private calculateWhitelistPenalty;
    /**
     * Update weights
     */
    setWeights(weights: Partial<ScoringWeights>): void;
    /**
     * Update decision threshold
     */
    setThreshold(threshold: number): void;
    /**
     * Get current weights
     */
    getWeights(): ScoringWeights;
    /**
     * Export weights to JSON
     */
    exportWeights(): string;
    /**
     * Load weights from JSON file (static factory)
     */
    static loadFromFile(filePath: string): WeightedPHIScorer;
    /**
     * Auto-load optimized weights if available
     * Looks for weights file at: data/calibration/weights.json
     */
    static autoLoad(): WeightedPHIScorer;
}
export declare const weightedScorer: WeightedPHIScorer;
//# sourceMappingURL=WeightedPHIScorer.d.ts.map