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
import type { StandardizedDocument, DetectionResult, GroundTruthSpan } from '../backends/DetectionBackend';
import { BackendType } from '../backends/BackendFactory';
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
    errors: Array<{
        documentId: string;
        error: string;
    }>;
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
export declare class BenchmarkOrchestrator {
    private config;
    private hermeticEnv;
    private factory;
    constructor(config?: Partial<BenchmarkConfig>);
    /**
     * Generate experiment ID
     */
    private generateExperimentId;
    /**
     * Generate experiment hash for reproducibility verification
     */
    private generateExperimentHash;
    /**
     * Run benchmark across all configured backends
     */
    run(documents: StandardizedDocument[]): Promise<BenchmarkResults>;
    /**
     * Run a single backend with hermetic isolation
     */
    private runBackend;
    /**
     * Get configuration
     */
    getConfig(): BenchmarkConfig;
    /**
     * Update configuration
     */
    setConfig(config: Partial<BenchmarkConfig>): void;
    /**
     * Check which backends are available
     */
    getAvailableBackends(): Promise<BackendType[]>;
    /**
     * Generate a simple comparison summary
     */
    static generateSummary(results: BenchmarkResults): string;
}
/**
 * Create orchestrator with default config
 */
export declare function createOrchestrator(config?: Partial<BenchmarkConfig>): BenchmarkOrchestrator;
