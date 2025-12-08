/**
 * TrueParallelExecutor - Multi-Core Filter Execution
 *
 * Provides a drop-in replacement for Promise.all() based filter execution
 * that actually uses multiple CPU cores via worker_threads.
 *
 * USAGE:
 *   // Instead of:
 *   const results = await Promise.all(filters.map(f => f.detect(text)));
 *
 *   // Use:
 *   const results = await TrueParallelExecutor.executeFilters(filters, text, config, context);
 *
 * FALLBACK:
 *   If workers fail to initialize, falls back to single-threaded Promise.all()
 *
 * @module redaction/core
 */
import { SpanBasedFilter } from "./SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
import { Span } from "../models/Span";
export interface ParallelExecutorConfig {
    /** Use true multi-threading (worker_threads) vs fake parallelism (Promise.all) */
    useWorkerThreads: boolean;
    /** Maximum number of worker threads */
    maxWorkers?: number;
    /** Minimum text length to use workers (small texts are faster single-threaded) */
    minTextLengthForWorkers: number;
    /** Minimum number of filters to use workers */
    minFiltersForWorkers: number;
}
export declare class TrueParallelExecutor {
    private static config;
    private static initialized;
    private static workerPoolAvailable;
    /**
     * Configure the executor
     */
    static configure(config: Partial<ParallelExecutorConfig>): void;
    /**
     * Initialize the executor (checks if worker pool is available)
     */
    static initialize(): Promise<void>;
    /**
     * Execute filters in true parallel (multi-core) or fall back to Promise.all
     */
    static executeFilters(filters: SpanBasedFilter[], text: string, policy: any, context: RedactionContext): Promise<{
        filter: SpanBasedFilter;
        spans: Span[];
        executionTimeMs: number;
    }[]>;
    /**
     * Execute using worker threads (TRUE parallelism)
     */
    private static executeWithWorkers;
    /**
     * Execute using Promise.all (FAKE parallelism - single threaded)
     */
    private static executeWithPromiseAll;
    /**
     * Deserialize a span from worker result
     */
    private static deserializeSpan;
    /**
     * Get execution mode info
     */
    static getInfo(): {
        mode: "worker_threads" | "promise_all";
        workers: number;
        cpus: number;
    };
    /**
     * Shutdown workers (call on process exit)
     */
    static shutdown(): Promise<void>;
}
export { getWorkerPool, shutdownWorkerPool } from "./WorkerPool";
//# sourceMappingURL=TrueParallelExecutor.d.ts.map