/**
 * MLWeightOptimizer - Machine Learning Weight Optimization for PHI Scoring
 *
 * Implements grid search and genetic algorithm optimization to find optimal
 * weights for the WeightedPHIScorer and EnsembleVoter systems.
 *
 * ALGORITHMS:
 * 1. Grid Search - Exhaustive search over weight space (good for small spaces)
 * 2. Genetic Algorithm - Evolutionary optimization (good for large spaces)
 * 3. Bayesian Optimization - Probabilistic model-based optimization
 *
 * METRICS:
 * - F1 Score (harmonic mean of precision and recall)
 * - Precision (true positives / predicted positives)
 * - Recall (true positives / actual positives)
 * - Specificity (true negatives / actual negatives)
 *
 * REFERENCE: Bergstra & Bengio (2012) "Random Search for Hyper-Parameter Optimization"
 *
 * @module redaction/core
 */
import { Span, FilterType } from '../models/Span';
import { ScoringWeights, WeightedPHIScorer } from './WeightedPHIScorer';
import { VotingConfig } from './EnsembleVoter';
/**
 * Ground truth label for a span
 */
export interface GroundTruthLabel {
    text: string;
    start: number;
    end: number;
    filterType: FilterType;
    isPHI: boolean;
}
/**
 * Training document with labeled spans
 */
export interface TrainingDocument {
    id: string;
    text: string;
    groundTruth: GroundTruthLabel[];
}
/**
 * Optimization result
 */
export interface OptimizationResult {
    bestWeights: Partial<ScoringWeights>;
    bestVotingConfig: Partial<VotingConfig>;
    metrics: {
        f1Score: number;
        precision: number;
        recall: number;
        specificity: number;
        accuracy: number;
    };
    iterations: number;
    convergenceHistory: number[];
    timestamp: Date;
}
/**
 * MLWeightOptimizer - Main optimization class
 */
export declare class MLWeightOptimizer {
    private trainingData;
    private validationData;
    private bestResult;
    private static readonly GRID_SEARCH_STEPS;
    private static readonly GA_POPULATION_SIZE;
    private static readonly GA_GENERATIONS;
    private static readonly GA_MUTATION_RATE;
    private static readonly GA_CROSSOVER_RATE;
    private static readonly GA_ELITE_COUNT;
    private static readonly WEIGHT_BOUNDS;
    private static readonly VOTING_BOUNDS;
    constructor();
    /**
     * Add training documents with ground truth labels
     */
    addTrainingData(documents: TrainingDocument[]): void;
    /**
     * Add validation documents (held out for final evaluation)
     */
    addValidationData(documents: TrainingDocument[]): void;
    /**
     * Generate synthetic training data from existing spans
     * Useful when you have detection results but not manually labeled data
     */
    generateSyntheticTrainingData(documents: Array<{
        text: string;
        spans: Span[];
        confirmedPHI?: Span[];
        falsePositives?: Span[];
    }>): TrainingDocument[];
    /**
     * Evaluate weights against training data
     */
    private evaluateWeights;
    /**
     * Grid Search Optimization
     * Exhaustively searches weight space at fixed intervals
     */
    optimizeGridSearch(): OptimizationResult;
    /**
     * Genetic Algorithm Optimization
     * Evolutionary approach for large search spaces
     */
    optimizeGenetic(): OptimizationResult;
    /**
     * Create a random individual for genetic algorithm
     */
    private createRandomIndividual;
    /**
     * Tournament selection for genetic algorithm
     */
    private tournamentSelect;
    /**
     * Crossover two parents to create offspring
     */
    private crossover;
    /**
     * Mutate an individual
     */
    private mutate;
    /**
     * Generate Gaussian random number (Box-Muller transform)
     */
    private gaussianRandom;
    /**
     * Quick optimization using random search (faster than grid search)
     * Reference: Bergstra & Bengio (2012)
     */
    optimizeRandomSearch(iterations?: number): OptimizationResult;
    /**
     * Get the best result from optimization
     */
    getBestResult(): OptimizationResult | null;
    /**
     * Apply optimized weights to a WeightedPHIScorer
     */
    applyToScorer(scorer: WeightedPHIScorer): void;
    /**
     * Export optimized weights as JSON
     */
    exportWeights(): string;
    /**
     * Import previously optimized weights
     */
    importWeights(json: string): void;
}
export declare const mlWeightOptimizer: MLWeightOptimizer;
//# sourceMappingURL=MLWeightOptimizer.d.ts.map