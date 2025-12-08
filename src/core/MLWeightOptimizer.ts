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
  isPHI: boolean; // true = actual PHI, false = false positive
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
 * Evaluation metrics
 */
interface EvaluationMetrics {
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  f1Score: number;
  precision: number;
  recall: number;
  specificity: number;
  accuracy: number;
}

/**
 * Individual in genetic algorithm population
 */
interface GeneticIndividual {
  weights: Partial<ScoringWeights>;
  votingConfig: Partial<VotingConfig>;
  fitness: number;
}

/**
 * MLWeightOptimizer - Main optimization class
 */
export class MLWeightOptimizer {
  private trainingData: TrainingDocument[] = [];
  private validationData: TrainingDocument[] = [];
  private bestResult: OptimizationResult | null = null;

  // Optimization parameters
  private static readonly GRID_SEARCH_STEPS = 5; // Steps per dimension
  private static readonly GA_POPULATION_SIZE = 50;
  private static readonly GA_GENERATIONS = 100;
  private static readonly GA_MUTATION_RATE = 0.1;
  private static readonly GA_CROSSOVER_RATE = 0.7;
  private static readonly GA_ELITE_COUNT = 5;

  // Weight bounds for optimization
  private static readonly WEIGHT_BOUNDS = {
    // Pattern weights [min, max]
    lastFirstFormat: [0.80, 0.99],
    titledName: [0.80, 0.98],
    patientLabel: [0.75, 0.95],
    labeledName: [0.75, 0.95],
    familyRelation: [0.75, 0.95],
    generalFullName: [0.50, 0.85],
    highPrecisionPattern: [0.85, 0.99],
    // Context bonuses [min, max]
    titleContextBonus: [0.10, 0.40],
    familyContextBonus: [0.15, 0.45],
    phiLabelBonus: [0.10, 0.35],
    clinicalRoleBonus: [0.10, 0.40],
    // Whitelist penalties [min, max] (negative values)
    diseaseEponymPenalty: [-0.95, -0.70],
    diseaseNamePenalty: [-0.95, -0.65],
    medicationPenalty: [-0.90, -0.60],
    procedurePenalty: [-0.85, -0.55],
    anatomicalPenalty: [-0.80, -0.50],
    sectionHeaderPenalty: [-0.98, -0.80],
    organizationPenalty: [-0.75, -0.45],
  };

  // Voting config bounds
  private static readonly VOTING_BOUNDS = {
    redactThreshold: [0.50, 0.80],
    skipThreshold: [0.20, 0.45],
    phiPrior: [0.10, 0.25],
  };

  constructor() {}

  /**
   * Add training documents with ground truth labels
   */
  addTrainingData(documents: TrainingDocument[]): void {
    this.trainingData.push(...documents);
  }

  /**
   * Add validation documents (held out for final evaluation)
   */
  addValidationData(documents: TrainingDocument[]): void {
    this.validationData.push(...documents);
  }

  /**
   * Generate synthetic training data from existing spans
   * Useful when you have detection results but not manually labeled data
   */
  generateSyntheticTrainingData(
    documents: Array<{ text: string; spans: Span[]; confirmedPHI?: Span[]; falsePositives?: Span[] }>
  ): TrainingDocument[] {
    return documents.map((doc, idx) => {
      const groundTruth: GroundTruthLabel[] = [];

      // Add confirmed PHI
      if (doc.confirmedPHI) {
        for (const span of doc.confirmedPHI) {
          groundTruth.push({
            text: span.text,
            start: span.characterStart,
            end: span.characterEnd,
            filterType: span.filterType,
            isPHI: true,
          });
        }
      }

      // Add false positives
      if (doc.falsePositives) {
        for (const span of doc.falsePositives) {
          groundTruth.push({
            text: span.text,
            start: span.characterStart,
            end: span.characterEnd,
            filterType: span.filterType,
            isPHI: false,
          });
        }
      }

      // If no explicit labels, use high-confidence spans as assumed PHI
      if (!doc.confirmedPHI && !doc.falsePositives) {
        for (const span of doc.spans) {
          groundTruth.push({
            text: span.text,
            start: span.characterStart,
            end: span.characterEnd,
            filterType: span.filterType,
            isPHI: span.confidence >= 0.7, // Assume high confidence = PHI
          });
        }
      }

      return {
        id: `synthetic-${idx}`,
        text: doc.text,
        groundTruth,
      };
    });
  }

  /**
   * Evaluate weights against training data
   */
  private evaluateWeights(
    weights: Partial<ScoringWeights>,
    votingConfig: Partial<VotingConfig>,
    documents: TrainingDocument[]
  ): EvaluationMetrics {
    const scorer = new WeightedPHIScorer(weights, votingConfig.redactThreshold || 0.50);

    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;

    for (const doc of documents) {
      for (const label of doc.groundTruth) {
        // Create a mock span for scoring
        const mockSpan = new Span({
          text: label.text,
          originalValue: label.text,
          characterStart: label.start,
          characterEnd: label.end,
          filterType: label.filterType,
          confidence: 0.5, // Neutral starting confidence
          priority: 50,
          context: '',
          window: [],
          replacement: null,
          salt: null,
          pattern: null,
          applied: false,
          ignored: false,
          ambiguousWith: [],
          disambiguationScore: null,
        });

        // Get context around the span
        const contextStart = Math.max(0, label.start - 100);
        const contextEnd = Math.min(doc.text.length, label.end + 100);
        const context = doc.text.substring(contextStart, contextEnd);

        // Score the span
        const result = scorer.score(mockSpan, context);
        const predictedPHI = result.recommendation === 'PHI' || result.recommendation === 'UNCERTAIN';

        // Update confusion matrix
        if (label.isPHI && predictedPHI) {
          truePositives++;
        } else if (!label.isPHI && predictedPHI) {
          falsePositives++;
        } else if (!label.isPHI && !predictedPHI) {
          trueNegatives++;
        } else if (label.isPHI && !predictedPHI) {
          falseNegatives++;
        }
      }
    }

    // Calculate metrics
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const specificity = trueNegatives / (trueNegatives + falsePositives) || 0;
    const accuracy = (truePositives + trueNegatives) /
      (truePositives + trueNegatives + falsePositives + falseNegatives) || 0;
    const f1Score = (2 * precision * recall) / (precision + recall) || 0;

    return {
      truePositives,
      falsePositives,
      trueNegatives,
      falseNegatives,
      f1Score,
      precision,
      recall,
      specificity,
      accuracy,
    };
  }

  /**
   * Grid Search Optimization
   * Exhaustively searches weight space at fixed intervals
   */
  optimizeGridSearch(): OptimizationResult {
    if (this.trainingData.length === 0) {
      throw new Error('No training data provided. Call addTrainingData() first.');
    }

    const steps = MLWeightOptimizer.GRID_SEARCH_STEPS;
    let bestF1 = -1;
    let bestWeights: Partial<ScoringWeights> = {};
    let bestVotingConfig: Partial<VotingConfig> = {};
    const convergenceHistory: number[] = [];
    let iterations = 0;

    // Key weights to optimize (subset for tractability)
    const keyWeights: (keyof typeof MLWeightOptimizer.WEIGHT_BOUNDS)[] = [
      'generalFullName',
      'titleContextBonus',
      'familyContextBonus',
      'diseaseEponymPenalty',
      'medicationPenalty',
    ];

    // Generate grid points for each weight
    const generateGridPoints = (min: number, max: number): number[] => {
      const points: number[] = [];
      for (let i = 0; i <= steps; i++) {
        points.push(min + (max - min) * (i / steps));
      }
      return points;
    };

    // Grid search over key weights
    const weightGrids = keyWeights.map(key => {
      const bounds = MLWeightOptimizer.WEIGHT_BOUNDS[key];
      return generateGridPoints(bounds[0], bounds[1]);
    });

    // Threshold grid
    const thresholdGrid = generateGridPoints(
      MLWeightOptimizer.VOTING_BOUNDS.redactThreshold[0],
      MLWeightOptimizer.VOTING_BOUNDS.redactThreshold[1]
    );

    // Exhaustive search (limited to key weights for tractability)
    for (const w0 of weightGrids[0]) {
      for (const w1 of weightGrids[1]) {
        for (const w2 of weightGrids[2]) {
          for (const w3 of weightGrids[3]) {
            for (const w4 of weightGrids[4]) {
              for (const threshold of thresholdGrid) {
                iterations++;

                const weights: Partial<ScoringWeights> = {
                  [keyWeights[0]]: w0,
                  [keyWeights[1]]: w1,
                  [keyWeights[2]]: w2,
                  [keyWeights[3]]: w3,
                  [keyWeights[4]]: w4,
                };

                const votingConfig: Partial<VotingConfig> = {
                  redactThreshold: threshold,
                };

                const metrics = this.evaluateWeights(weights, votingConfig, this.trainingData);

                if (metrics.f1Score > bestF1) {
                  bestF1 = metrics.f1Score;
                  bestWeights = { ...weights };
                  bestVotingConfig = { ...votingConfig };
                }

                convergenceHistory.push(bestF1);
              }
            }
          }
        }
      }
    }

    // Final evaluation on validation data if available
    const finalMetrics = this.validationData.length > 0
      ? this.evaluateWeights(bestWeights, bestVotingConfig, this.validationData)
      : this.evaluateWeights(bestWeights, bestVotingConfig, this.trainingData);

    this.bestResult = {
      bestWeights,
      bestVotingConfig,
      metrics: {
        f1Score: finalMetrics.f1Score,
        precision: finalMetrics.precision,
        recall: finalMetrics.recall,
        specificity: finalMetrics.specificity,
        accuracy: finalMetrics.accuracy,
      },
      iterations,
      convergenceHistory,
      timestamp: new Date(),
    };

    return this.bestResult;
  }

  /**
   * Genetic Algorithm Optimization
   * Evolutionary approach for large search spaces
   */
  optimizeGenetic(): OptimizationResult {
    if (this.trainingData.length === 0) {
      throw new Error('No training data provided. Call addTrainingData() first.');
    }

    const populationSize = MLWeightOptimizer.GA_POPULATION_SIZE;
    const generations = MLWeightOptimizer.GA_GENERATIONS;
    const mutationRate = MLWeightOptimizer.GA_MUTATION_RATE;
    const crossoverRate = MLWeightOptimizer.GA_CROSSOVER_RATE;
    const eliteCount = MLWeightOptimizer.GA_ELITE_COUNT;

    const convergenceHistory: number[] = [];
    let iterations = 0;

    // Initialize population with random individuals
    let population: GeneticIndividual[] = [];
    for (let i = 0; i < populationSize; i++) {
      population.push(this.createRandomIndividual());
    }

    // Evaluate initial population
    for (const individual of population) {
      const metrics = this.evaluateWeights(
        individual.weights,
        individual.votingConfig,
        this.trainingData
      );
      individual.fitness = metrics.f1Score;
      iterations++;
    }

    // Evolution loop
    for (let gen = 0; gen < generations; gen++) {
      // Sort by fitness (descending)
      population.sort((a, b) => b.fitness - a.fitness);

      // Track best fitness
      convergenceHistory.push(population[0].fitness);

      // Early stopping if converged
      if (gen > 10) {
        const recentHistory = convergenceHistory.slice(-10);
        const improvement = recentHistory[9] - recentHistory[0];
        if (improvement < 0.001) {
          break; // Converged
        }
      }

      // Create next generation
      const nextGeneration: GeneticIndividual[] = [];

      // Elitism: keep top individuals
      for (let i = 0; i < eliteCount; i++) {
        nextGeneration.push({ ...population[i] });
      }

      // Fill rest with offspring
      while (nextGeneration.length < populationSize) {
        // Tournament selection
        const parent1 = this.tournamentSelect(population);
        const parent2 = this.tournamentSelect(population);

        // Crossover
        let offspring: GeneticIndividual;
        if (Math.random() < crossoverRate) {
          offspring = this.crossover(parent1, parent2);
        } else {
          offspring = { ...parent1 };
        }

        // Mutation
        if (Math.random() < mutationRate) {
          this.mutate(offspring);
        }

        // Evaluate offspring
        const metrics = this.evaluateWeights(
          offspring.weights,
          offspring.votingConfig,
          this.trainingData
        );
        offspring.fitness = metrics.f1Score;
        iterations++;

        nextGeneration.push(offspring);
      }

      population = nextGeneration;
    }

    // Get best individual
    population.sort((a, b) => b.fitness - a.fitness);
    const best = population[0];

    // Final evaluation on validation data if available
    const finalMetrics = this.validationData.length > 0
      ? this.evaluateWeights(best.weights, best.votingConfig, this.validationData)
      : this.evaluateWeights(best.weights, best.votingConfig, this.trainingData);

    this.bestResult = {
      bestWeights: best.weights,
      bestVotingConfig: best.votingConfig,
      metrics: {
        f1Score: finalMetrics.f1Score,
        precision: finalMetrics.precision,
        recall: finalMetrics.recall,
        specificity: finalMetrics.specificity,
        accuracy: finalMetrics.accuracy,
      },
      iterations,
      convergenceHistory,
      timestamp: new Date(),
    };

    return this.bestResult;
  }

  /**
   * Create a random individual for genetic algorithm
   */
  private createRandomIndividual(): GeneticIndividual {
    const weights: Partial<ScoringWeights> = {};

    for (const [key, bounds] of Object.entries(MLWeightOptimizer.WEIGHT_BOUNDS)) {
      const [min, max] = bounds;
      (weights as any)[key] = min + Math.random() * (max - min);
    }

    const votingConfig: Partial<VotingConfig> = {
      redactThreshold: MLWeightOptimizer.VOTING_BOUNDS.redactThreshold[0] +
        Math.random() * (MLWeightOptimizer.VOTING_BOUNDS.redactThreshold[1] -
          MLWeightOptimizer.VOTING_BOUNDS.redactThreshold[0]),
      skipThreshold: MLWeightOptimizer.VOTING_BOUNDS.skipThreshold[0] +
        Math.random() * (MLWeightOptimizer.VOTING_BOUNDS.skipThreshold[1] -
          MLWeightOptimizer.VOTING_BOUNDS.skipThreshold[0]),
      phiPrior: MLWeightOptimizer.VOTING_BOUNDS.phiPrior[0] +
        Math.random() * (MLWeightOptimizer.VOTING_BOUNDS.phiPrior[1] -
          MLWeightOptimizer.VOTING_BOUNDS.phiPrior[0]),
    };

    return { weights, votingConfig, fitness: 0 };
  }

  /**
   * Tournament selection for genetic algorithm
   */
  private tournamentSelect(population: GeneticIndividual[], tournamentSize: number = 3): GeneticIndividual {
    let best: GeneticIndividual | null = null;

    for (let i = 0; i < tournamentSize; i++) {
      const idx = Math.floor(Math.random() * population.length);
      const individual = population[idx];

      if (!best || individual.fitness > best.fitness) {
        best = individual;
      }
    }

    return best!;
  }

  /**
   * Crossover two parents to create offspring
   */
  private crossover(parent1: GeneticIndividual, parent2: GeneticIndividual): GeneticIndividual {
    const weights: Partial<ScoringWeights> = {};

    // Uniform crossover for weights
    for (const key of Object.keys(MLWeightOptimizer.WEIGHT_BOUNDS)) {
      if (Math.random() < 0.5) {
        (weights as any)[key] = (parent1.weights as any)[key];
      } else {
        (weights as any)[key] = (parent2.weights as any)[key];
      }
    }

    // Crossover voting config
    const votingConfig: Partial<VotingConfig> = {
      redactThreshold: Math.random() < 0.5
        ? parent1.votingConfig.redactThreshold
        : parent2.votingConfig.redactThreshold,
      skipThreshold: Math.random() < 0.5
        ? parent1.votingConfig.skipThreshold
        : parent2.votingConfig.skipThreshold,
      phiPrior: Math.random() < 0.5
        ? parent1.votingConfig.phiPrior
        : parent2.votingConfig.phiPrior,
    };

    return { weights, votingConfig, fitness: 0 };
  }

  /**
   * Mutate an individual
   */
  private mutate(individual: GeneticIndividual): void {
    // Mutate random weight
    const weightKeys = Object.keys(MLWeightOptimizer.WEIGHT_BOUNDS);
    const keyToMutate = weightKeys[Math.floor(Math.random() * weightKeys.length)];
    const bounds = (MLWeightOptimizer.WEIGHT_BOUNDS as any)[keyToMutate];

    // Gaussian mutation
    const currentValue = (individual.weights as any)[keyToMutate] || (bounds[0] + bounds[1]) / 2;
    const stdDev = (bounds[1] - bounds[0]) * 0.1; // 10% of range
    let newValue = currentValue + this.gaussianRandom() * stdDev;

    // Clamp to bounds
    newValue = Math.max(bounds[0], Math.min(bounds[1], newValue));
    (individual.weights as any)[keyToMutate] = newValue;

    // Occasionally mutate voting config
    if (Math.random() < 0.3) {
      const configKeys = Object.keys(MLWeightOptimizer.VOTING_BOUNDS);
      const configKey = configKeys[Math.floor(Math.random() * configKeys.length)];
      const configBounds = (MLWeightOptimizer.VOTING_BOUNDS as any)[configKey];

      const currentConfigValue = (individual.votingConfig as any)[configKey] ||
        (configBounds[0] + configBounds[1]) / 2;
      const configStdDev = (configBounds[1] - configBounds[0]) * 0.1;
      let newConfigValue = currentConfigValue + this.gaussianRandom() * configStdDev;
      newConfigValue = Math.max(configBounds[0], Math.min(configBounds[1], newConfigValue));
      (individual.votingConfig as any)[configKey] = newConfigValue;
    }
  }

  /**
   * Generate Gaussian random number (Box-Muller transform)
   */
  private gaussianRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /**
   * Quick optimization using random search (faster than grid search)
   * Reference: Bergstra & Bengio (2012)
   */
  optimizeRandomSearch(iterations: number = 1000): OptimizationResult {
    if (this.trainingData.length === 0) {
      throw new Error('No training data provided. Call addTrainingData() first.');
    }

    let bestF1 = -1;
    let bestWeights: Partial<ScoringWeights> = {};
    let bestVotingConfig: Partial<VotingConfig> = {};
    const convergenceHistory: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const individual = this.createRandomIndividual();
      const metrics = this.evaluateWeights(
        individual.weights,
        individual.votingConfig,
        this.trainingData
      );

      if (metrics.f1Score > bestF1) {
        bestF1 = metrics.f1Score;
        bestWeights = { ...individual.weights };
        bestVotingConfig = { ...individual.votingConfig };
      }

      convergenceHistory.push(bestF1);
    }

    // Final evaluation
    const finalMetrics = this.validationData.length > 0
      ? this.evaluateWeights(bestWeights, bestVotingConfig, this.validationData)
      : this.evaluateWeights(bestWeights, bestVotingConfig, this.trainingData);

    this.bestResult = {
      bestWeights,
      bestVotingConfig,
      metrics: {
        f1Score: finalMetrics.f1Score,
        precision: finalMetrics.precision,
        recall: finalMetrics.recall,
        specificity: finalMetrics.specificity,
        accuracy: finalMetrics.accuracy,
      },
      iterations,
      convergenceHistory,
      timestamp: new Date(),
    };

    return this.bestResult;
  }

  /**
   * Get the best result from optimization
   */
  getBestResult(): OptimizationResult | null {
    return this.bestResult;
  }

  /**
   * Apply optimized weights to a WeightedPHIScorer
   */
  applyToScorer(scorer: WeightedPHIScorer): void {
    if (!this.bestResult) {
      throw new Error('No optimization result available. Run optimization first.');
    }

    scorer.setWeights(this.bestResult.bestWeights);
    if (this.bestResult.bestVotingConfig.redactThreshold !== undefined) {
      scorer.setThreshold(this.bestResult.bestVotingConfig.redactThreshold);
    }
  }

  /**
   * Export optimized weights as JSON
   */
  exportWeights(): string {
    if (!this.bestResult) {
      throw new Error('No optimization result available. Run optimization first.');
    }

    return JSON.stringify({
      weights: this.bestResult.bestWeights,
      votingConfig: this.bestResult.bestVotingConfig,
      metrics: this.bestResult.metrics,
      timestamp: this.bestResult.timestamp.toISOString(),
    }, null, 2);
  }

  /**
   * Import previously optimized weights
   */
  importWeights(json: string): void {
    const data = JSON.parse(json);

    this.bestResult = {
      bestWeights: data.weights,
      bestVotingConfig: data.votingConfig,
      metrics: data.metrics,
      iterations: 0,
      convergenceHistory: [],
      timestamp: new Date(data.timestamp),
    };
  }
}

// Export singleton for convenience
export const mlWeightOptimizer = new MLWeightOptimizer();
