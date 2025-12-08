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
 * PERFORMANCE: Designed for high-throughput batch scoring
 *
 * @module redaction/core
 */
import { Span } from '../models/Span';
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
    recommendation: 'PHI' | 'NOT_PHI' | 'UNCERTAIN';
    breakdown: {
        source: string;
        value: number;
        reason: string;
    }[];
}
/**
 * WeightedPHIScorer - Main scoring class
 */
export declare class WeightedPHIScorer {
    private weights;
    private whitelists;
    private decisionThreshold;
    constructor(weights?: Partial<ScoringWeights>, decisionThreshold?: number);
    /**
     * Score a single span
     */
    score(span: Span, context: string): ScoringResult;
    /**
     * Score multiple spans (batch mode)
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
}
export declare const weightedScorer: WeightedPHIScorer;
//# sourceMappingURL=WeightedPHIScorer.d.ts.map