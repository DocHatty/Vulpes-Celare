/**
 * WorkerPool - True Multi-Core Parallel Execution for Filters
 *
 * Uses Node.js worker_threads to actually run filters on multiple CPU cores.
 * This replaces the fake "parallel" Promise.all() which runs on a single thread.
 *
 * ARCHITECTURE:
 * - Main thread: Orchestrates work distribution
 * - Worker threads: Execute filter detection in parallel
 * - Each worker can handle multiple filters (work stealing pattern)
 *
 * @module redaction/core
 */
export interface FilterTask {
    taskId: string;
    filterName: string;
    filterType: string;
    text: string;
    config: any;
    textLength?: number;
}
export interface FilterResult {
    taskId: string;
    filterName: string;
    filterType: string;
    success: boolean;
    spans: SerializedSpan[];
    executionTimeMs: number;
    error?: string;
}
export interface SerializedSpan {
    text: string;
    originalValue: string;
    characterStart: number;
    characterEnd: number;
    filterType: string;
    confidence: number;
    priority: number;
    context: string;
    pattern: string | null;
}
export interface WorkerPoolConfig {
    maxWorkers?: number;
    taskTimeoutMs?: number;
    /** Base timeout per 1000 chars of text (ms) */
    timeoutPerKChars?: number;
    /** Minimum timeout regardless of text size (ms) */
    minTimeout?: number;
    /** Maximum timeout cap (ms) */
    maxTimeout?: number;
}
/**
 * WorkerPool manages a pool of worker threads for parallel filter execution
 */
export declare class WorkerPool {
    private workers;
    private taskQueue;
    private pendingTasks;
    private workerBusy;
    private initialized;
    private config;
    constructor(config?: WorkerPoolConfig);
    /**
     * Calculate smart timeout based on text length and filter type
     */
    private calculateTimeout;
    /**
     * Initialize the worker pool
     */
    initialize(): Promise<void>;
    /**
     * Execute a filter task on a worker
     */
    executeTask(task: FilterTask): Promise<FilterResult>;
    /**
     * Execute multiple filter tasks in parallel
     */
    executeTasks(tasks: FilterTask[]): Promise<FilterResult[]>;
    /**
     * Get an available worker
     */
    private getAvailableWorker;
    /**
     * Assign a task to a worker
     */
    private assignTaskToWorker;
    /**
     * Handle result from worker
     */
    private handleWorkerResult;
    /**
     * Handle worker error
     */
    private handleWorkerError;
    /**
     * Shutdown the worker pool
     */
    shutdown(): Promise<void>;
    /**
     * Get pool statistics
     */
    getStats(): {
        totalWorkers: number;
        busyWorkers: number;
        queuedTasks: number;
        pendingTasks: number;
    };
}
/**
 * Get the global worker pool instance
 */
export declare function getWorkerPool(config?: WorkerPoolConfig): WorkerPool;
/**
 * Shutdown the global worker pool
 */
export declare function shutdownWorkerPool(): Promise<void>;
//# sourceMappingURL=WorkerPool.d.ts.map