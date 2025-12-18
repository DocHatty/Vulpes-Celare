/**
 * ============================================================================
 * BENCHMARK ORCHESTRATOR
 * ============================================================================
 *
 * Central coordinator for benchmark runs.
 * Manages backend execution, result collection, and comparison.
 *
 * @module benchmark/harness/BenchmarkOrchestrator
 */

import type {
  DetectionBackend,
  StandardizedDocument,
  DetectionResult,
  GroundTruthSpan,
} from '../backends/DetectionBackend';
import { HermeticEnvironment } from './HermeticEnvironment';
import { getBackendFactory, BackendType, AVAILABLE_BACKENDS } from '../backends/BackendFactory';
import * as crypto from 'crypto';

/**
 * Benchmark configuration
 */
export interface BenchmarkConfig {
  /** Backends to evaluate */
  backends: BackendType[];
  /** Random seed for reproducibility */
  seed: number;
  /** Number of documents to test */
  documentCount: number;
  /** Corpus type */
  corpus: 'synthetic' | 'mtsamples' | 'hybrid';
  /** Grading profile */
  profile: 'HIPAA_STRICT' | 'DEVELOPMENT' | 'RESEARCH' | 'OCR_TOLERANT';
  /** Save results to leaderboard */
  saveToLeaderboard: boolean;
  /** Enable verbose output */
  verbose: boolean;
}

/**
 * Per-backend benchmark results
 */
export interface BackendBenchmarkResult {
  /** Backend identifier */
  backendId: string;
  /** Backend type */
  backendType: BackendType;
  /** Detection results for all documents */
  detectionResults: DetectionResult[];
  /** Total processing time */
  totalTimeMs: number;
  /** Average processing time per document */
  avgTimeMs: number;
  /** Documents processed */
  documentsProcessed: number;
  /** Total spans detected */
  totalSpansDetected: number;
  /** Errors encountered */
  errors: Array<{ documentId: string; error: string }>;
  /** Backend configuration snapshot */
  configuration: any;
}

/**
 * Complete benchmark run results
 */
export interface BenchmarkResults {
  /** Unique experiment identifier */
  experimentId: string;
  /** Experiment hash for reproducibility */
  experimentHash: string;
  /** Timestamp */
  timestamp: Date;
  /** Configuration used */
  config: BenchmarkConfig;
  /** Per-backend results */
  backendResults: Map<BackendType, BackendBenchmarkResult>;
  /** Documents used (for reference) */
  documentIds: string[];
  /** Ground truth (if available) */
  groundTruth?: Map<string, GroundTruthSpan[]>;
}

/**
 * Benchmark orchestrator - coordinates benchmark execution
 */
export class BenchmarkOrchestrator {
  private config: BenchmarkConfig;
  private hermeticEnv: HermeticEnvironment;
  private factory = getBackendFactory();

  constructor(config: Partial<BenchmarkConfig> = {}) {
    this.config = {
      backends: config.backends || ['rules', 'hybrid'],
      seed: config.seed ?? 1337,
      documentCount: config.documentCount ?? 50,
      corpus: config.corpus || 'synthetic',
      profile: config.profile || 'HIPAA_STRICT',
      saveToLeaderboard: config.saveToLeaderboard ?? false,
      verbose: config.verbose ?? false,
    };

    this.hermeticEnv = new HermeticEnvironment();
  }

  /**
   * Generate experiment ID
   */
  private generateExperimentId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `exp-${timestamp}-${random}`;
  }

  /**
   * Generate experiment hash for reproducibility verification
   */
  private generateExperimentHash(config: BenchmarkConfig, documentIds: string[]): string {
    const data = JSON.stringify({
      backends: config.backends.sort(),
      seed: config.seed,
      documentCount: config.documentCount,
      corpus: config.corpus,
      profile: config.profile,
      documentIds: documentIds.sort(),
    });

    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Run benchmark across all configured backends
   */
  async run(documents: StandardizedDocument[]): Promise<BenchmarkResults> {
    const experimentId = this.generateExperimentId();
    const documentIds = documents.map(d => d.id);
    const experimentHash = this.generateExperimentHash(this.config, documentIds);

    if (this.config.verbose) {
      console.log(`\n[BenchmarkOrchestrator] Starting experiment ${experimentId}`);
      console.log(`  Hash: ${experimentHash}`);
      console.log(`  Backends: ${this.config.backends.join(', ')}`);
      console.log(`  Documents: ${documents.length}`);
      console.log(`  Profile: ${this.config.profile}`);
    }

    const backendResults = new Map<BackendType, BackendBenchmarkResult>();

    // Run each backend in isolation
    for (const backendType of this.config.backends) {
      if (this.config.verbose) {
        console.log(`\n[BenchmarkOrchestrator] Running ${backendType} backend...`);
      }

      try {
        const result = await this.runBackend(backendType, documents);
        backendResults.set(backendType, result);

        if (this.config.verbose) {
          console.log(`  Completed: ${result.documentsProcessed} docs in ${result.totalTimeMs.toFixed(0)}ms`);
          console.log(`  Spans detected: ${result.totalSpansDetected}`);
          console.log(`  Errors: ${result.errors.length}`);
        }
      } catch (error) {
        console.error(`[BenchmarkOrchestrator] Error running ${backendType}:`, error);
        // Continue with other backends
      }
    }

    return {
      experimentId,
      experimentHash,
      timestamp: new Date(),
      config: this.config,
      backendResults,
      documentIds,
    };
  }

  /**
   * Run a single backend with hermetic isolation
   */
  private async runBackend(
    backendType: BackendType,
    documents: StandardizedDocument[]
  ): Promise<BackendBenchmarkResult> {
    const envConfig = HermeticEnvironment.getEnvironmentForMode(backendType);

    return this.hermeticEnv.runIsolated(envConfig, async () => {
      const backend = this.factory.createByType(backendType);
      await backend.initialize();

      const detectionResults: DetectionResult[] = [];
      const errors: Array<{ documentId: string; error: string }> = [];
      let totalSpansDetected = 0;

      const startTime = performance.now();

      for (const doc of documents) {
        try {
          const result = await backend.detect(doc);
          detectionResults.push(result);
          totalSpansDetected += result.spans.length;
        } catch (error) {
          errors.push({
            documentId: doc.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const totalTimeMs = performance.now() - startTime;

      await backend.shutdown();

      return {
        backendId: backend.id,
        backendType,
        detectionResults,
        totalTimeMs,
        avgTimeMs: totalTimeMs / documents.length,
        documentsProcessed: detectionResults.length,
        totalSpansDetected,
        errors,
        configuration: backend.getConfiguration(),
      };
    });
  }

  /**
   * Get configuration
   */
  getConfig(): BenchmarkConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<BenchmarkConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check which backends are available
   */
  async getAvailableBackends(): Promise<BackendType[]> {
    const available: BackendType[] = [];

    for (const metadata of AVAILABLE_BACKENDS) {
      const isAvailable = await this.factory.isAvailable(metadata.id);
      if (isAvailable) {
        available.push(metadata.type);
      }
    }

    return available;
  }

  /**
   * Generate a simple comparison summary
   */
  static generateSummary(results: BenchmarkResults): string {
    const lines: string[] = [];

    lines.push('═'.repeat(60));
    lines.push(`BENCHMARK SUMMARY`);
    lines.push(`Experiment: ${results.experimentId}`);
    lines.push(`Hash: ${results.experimentHash}`);
    lines.push(`Time: ${results.timestamp.toISOString()}`);
    lines.push('═'.repeat(60));
    lines.push('');

    lines.push('┌────────────────┬────────────┬───────────┬───────────┐');
    lines.push('│ Backend        │ Docs       │ Spans     │ Time (ms) │');
    lines.push('├────────────────┼────────────┼───────────┼───────────┤');

    for (const [backendType, result] of results.backendResults) {
      const name = backendType.padEnd(14);
      const docs = result.documentsProcessed.toString().padStart(10);
      const spans = result.totalSpansDetected.toString().padStart(9);
      const time = result.totalTimeMs.toFixed(0).padStart(9);
      lines.push(`│ ${name} │${docs} │${spans} │${time} │`);
    }

    lines.push('└────────────────┴────────────┴───────────┴───────────┘');

    return lines.join('\n');
  }
}

/**
 * Create orchestrator with default config
 */
export function createOrchestrator(config?: Partial<BenchmarkConfig>): BenchmarkOrchestrator {
  return new BenchmarkOrchestrator(config);
}
