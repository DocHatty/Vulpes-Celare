"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerPool = void 0;
exports.getWorkerPool = getWorkerPool;
exports.shutdownWorkerPool = shutdownWorkerPool;
const worker_threads_1 = require("worker_threads");
const os = __importStar(require("os"));
const path = __importStar(require("path"));
// ============================================================================
// WORKER POOL IMPLEMENTATION
// ============================================================================
/**
 * WorkerPool manages a pool of worker threads for parallel filter execution
 */
class WorkerPool {
    constructor(config = {}) {
        this.workers = [];
        this.taskQueue = [];
        this.pendingTasks = new Map();
        this.workerBusy = new Map();
        this.initialized = false;
        // Default to number of CPU cores minus 1 (leave one for main thread)
        const cpuCount = os.cpus().length;
        this.config = {
            maxWorkers: config.maxWorkers ?? Math.max(1, cpuCount - 1),
            taskTimeoutMs: config.taskTimeoutMs ?? 30000, // Default fallback
            timeoutPerKChars: config.timeoutPerKChars ?? 500, // 500ms per 1000 chars
            minTimeout: config.minTimeout ?? 30000, // At least 30 seconds (workers may be queued)
            maxTimeout: config.maxTimeout ?? 180000, // Cap at 3 minutes
        };
    }
    /**
     * Calculate smart timeout based on text length and filter type
     */
    calculateTimeout(task) {
        const textLength = task.textLength ?? task.text.length;
        const kChars = textLength / 1000;
        // Name filters are slowest - give them more time
        const isNameFilter = task.filterName.toLowerCase().includes("name");
        const multiplier = isNameFilter ? 3 : 1;
        const calculated = this.config.timeoutPerKChars * kChars * multiplier;
        return Math.min(this.config.maxTimeout, Math.max(this.config.minTimeout, calculated));
    }
    /**
     * Initialize the worker pool
     */
    async initialize() {
        if (this.initialized)
            return;
        const workerScript = path.join(__dirname, "FilterWorker.js");
        for (let i = 0; i < this.config.maxWorkers; i++) {
            try {
                const worker = new worker_threads_1.Worker(workerScript);
                worker.on("message", (result) => {
                    this.handleWorkerResult(worker, result);
                });
                worker.on("error", (error) => {
                    console.error(`Worker ${i} error:`, error);
                    this.handleWorkerError(worker, error);
                });
                worker.on("exit", (code) => {
                    if (code !== 0) {
                        console.error(`Worker ${i} exited with code ${code}`);
                    }
                    this.workerBusy.delete(worker);
                    // Could restart worker here if needed
                });
                this.workers.push(worker);
                this.workerBusy.set(worker, false);
            }
            catch (error) {
                console.error(`Failed to create worker ${i}:`, error);
            }
        }
        this.initialized = true;
        console.log(`[WorkerPool] Initialized with ${this.workers.length} workers (${os.cpus().length} CPUs available)`);
    }
    /**
     * Execute a filter task on a worker
     */
    async executeTask(task) {
        if (!this.initialized) {
            await this.initialize();
        }
        return new Promise((resolve, reject) => {
            // Calculate smart timeout based on text size and filter type
            const timeoutMs = this.calculateTimeout(task);
            // Set up timeout
            const timeout = setTimeout(() => {
                this.pendingTasks.delete(task.taskId);
                reject(new Error(`Task ${task.taskId} (${task.filterName}) timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            this.pendingTasks.set(task.taskId, { resolve, reject, timeout });
            // Try to find an available worker
            const availableWorker = this.getAvailableWorker();
            if (availableWorker) {
                this.assignTaskToWorker(availableWorker, task);
            }
            else {
                // Queue the task for later
                this.taskQueue.push(task);
            }
        });
    }
    /**
     * Execute multiple filter tasks in parallel
     */
    async executeTasks(tasks) {
        if (!this.initialized) {
            await this.initialize();
        }
        // Execute all tasks in parallel
        const promises = tasks.map((task) => this.executeTask(task));
        return Promise.all(promises);
    }
    /**
     * Get an available worker
     */
    getAvailableWorker() {
        for (const [worker, busy] of this.workerBusy.entries()) {
            if (!busy) {
                return worker;
            }
        }
        return null;
    }
    /**
     * Assign a task to a worker
     */
    assignTaskToWorker(worker, task) {
        this.workerBusy.set(worker, true);
        worker.postMessage(task);
    }
    /**
     * Handle result from worker
     */
    handleWorkerResult(worker, result) {
        this.workerBusy.set(worker, false);
        const pending = this.pendingTasks.get(result.taskId);
        if (pending) {
            clearTimeout(pending.timeout);
            this.pendingTasks.delete(result.taskId);
            pending.resolve(result);
        }
        // Process next queued task if any
        if (this.taskQueue.length > 0) {
            const nextTask = this.taskQueue.shift();
            this.assignTaskToWorker(worker, nextTask);
        }
    }
    /**
     * Handle worker error
     */
    handleWorkerError(worker, error) {
        this.workerBusy.set(worker, false);
        // Find any pending tasks for this worker and reject them
        // Note: In a more robust implementation, we'd track which worker has which task
        // For now, we'll just process the next queued task
        if (this.taskQueue.length > 0) {
            const nextTask = this.taskQueue.shift();
            const availableWorker = this.getAvailableWorker();
            if (availableWorker) {
                this.assignTaskToWorker(availableWorker, nextTask);
            }
            else {
                this.taskQueue.unshift(nextTask); // Put it back
            }
        }
    }
    /**
     * Shutdown the worker pool
     */
    async shutdown() {
        // Clear pending tasks
        for (const [taskId, pending] of this.pendingTasks.entries()) {
            clearTimeout(pending.timeout);
            pending.reject(new Error("Worker pool shutting down"));
        }
        this.pendingTasks.clear();
        // Terminate all workers
        const terminationPromises = this.workers.map((worker) => {
            return new Promise((resolve) => {
                worker.once("exit", () => resolve());
                worker.terminate();
            });
        });
        await Promise.all(terminationPromises);
        this.workers = [];
        this.workerBusy.clear();
        this.initialized = false;
    }
    /**
     * Get pool statistics
     */
    getStats() {
        let busyCount = 0;
        for (const busy of this.workerBusy.values()) {
            if (busy)
                busyCount++;
        }
        return {
            totalWorkers: this.workers.length,
            busyWorkers: busyCount,
            queuedTasks: this.taskQueue.length,
            pendingTasks: this.pendingTasks.size,
        };
    }
}
exports.WorkerPool = WorkerPool;
// ============================================================================
// SINGLETON INSTANCE
// ============================================================================
let poolInstance = null;
/**
 * Get the global worker pool instance
 */
function getWorkerPool(config) {
    if (!poolInstance) {
        poolInstance = new WorkerPool(config);
    }
    return poolInstance;
}
/**
 * Shutdown the global worker pool
 */
async function shutdownWorkerPool() {
    if (poolInstance) {
        await poolInstance.shutdown();
        poolInstance = null;
    }
}
//# sourceMappingURL=WorkerPool.js.map