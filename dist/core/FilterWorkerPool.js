"use strict";
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
exports.FilterWorkerPool = void 0;
const worker_threads_1 = require("worker_threads");
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const Span_1 = require("../models/Span");
const RadiologyLogger_1 = require("../utils/RadiologyLogger");
class FilterWorkerPool {
    static instance;
    workers = [];
    queue = [];
    pending = new Map();
    workerStatus = []; // true = busy, false = free
    workerTasks = new Map(); // workerIndex -> taskId
    maxWorkers;
    initialized = false;
    constructor() {
        // Leave one core free for the main event loop/coordinator
        this.maxWorkers = Math.max(1, os.cpus().length - 1);
        // DON'T initialize workers here - do it lazily on first execute()
    }
    ensureInitialized() {
        if (!this.initialized) {
            this.initialized = true;
            this.initializeWorkers();
        }
    }
    static getInstance() {
        if (!FilterWorkerPool.instance) {
            FilterWorkerPool.instance = new FilterWorkerPool();
        }
        return FilterWorkerPool.instance;
    }
    initializeWorkers() {
        // Determine correct worker path based on environment (dist vs src)
        // Check if we are running from 'dist' (js) or 'src' (ts/ts-node)
        const isTs = __filename.endsWith(".ts");
        let workerPath = path.join(__dirname, "worker.js");
        // Check if worker.js exists (for dist)
        // If not, and isTs, try worker.ts but only if ts-node is likely available
        // Since we know ts-node isn't in dependencies, this often fails in pure Vitest without special setup.
        // We will try to start workers. If they fail, we fallback to sync mode.
        if (isTs) {
            workerPath = path.join(__dirname, "worker.ts");
        }
        RadiologyLogger_1.RadiologyLogger.info("WORKER", `Initializing pool with ${this.maxWorkers} workers (${workerPath})`);
        for (let i = 0; i < this.maxWorkers; i++) {
            this.addWorker(i, workerPath, isTs);
        }
        if (this.workers.filter((w) => !!w).length === 0) {
            RadiologyLogger_1.RadiologyLogger.warn("WORKER", "No workers started successfully. Falling back to synchronous execution.");
        }
    }
    addWorker(index, workerPath, isTs) {
        try {
            const workerOptions = isTs
                ? {
                    // Try ts-node registration if running .ts
                    execArgv: /\.ts$/.test(workerPath)
                        ? ["-r", "ts-node/register"]
                        : undefined,
                }
                : {};
            const worker = new worker_threads_1.Worker(workerPath, workerOptions);
            // CRITICAL: unref() allows Node.js to exit even if workers are still running.
            // Without this, any script using VulpesCelare.redact() will hang forever
            // waiting for the worker pool to terminate.
            worker.unref();
            worker.on("message", (message) => {
                const { taskId, success, spans, error } = message;
                this.handleWorkerResponse(index, taskId, success, spans, error);
            });
            worker.on("error", (err) => {
                RadiologyLogger_1.RadiologyLogger.error("WORKER", `Worker ${index} start error (switching to sync fallback for this slot): ${err.message}`);
                this.handleWorkerDeath(index, err);
            });
            worker.on("exit", (code) => {
                if (code !== 0) {
                    RadiologyLogger_1.RadiologyLogger.error("WORKER", `Worker ${index} exited with code ${code}`);
                    this.handleWorkerDeath(index, new Error(`Worker exited with code ${code}`));
                }
            });
            this.workers[index] = worker;
            this.workerStatus[index] = false; // Free
        }
        catch (e) {
            RadiologyLogger_1.RadiologyLogger.error("WORKER", `Failed to start worker ${index}: ${e}`);
        }
    }
    handleWorkerDeath(index, error) {
        // Remove worker
        this.workers[index] = undefined;
        this.workerStatus[index] = false;
        // Fail pending task if any
        const taskId = this.workerTasks.get(index);
        if (taskId) {
            this.pending.get(taskId)?.reject(error);
            this.pending.delete(taskId);
            this.workerTasks.delete(index);
        }
        // Check if all workers are dead
        const activeWorkers = this.workers.filter((w) => !!w).length;
        if (activeWorkers === 0) {
            RadiologyLogger_1.RadiologyLogger.warn("WORKER", "All workers dead. Draining queue to sync fallback.");
            while (this.queue.length > 0) {
                const task = this.queue.shift();
                this.runSync(task.filterName, task.text, task.config)
                    .then(task.resolve)
                    .catch(task.reject);
            }
        }
    }
    handleWorkerResponse(workerIndex, taskId, success, rawSpans, errorMsg) {
        // Clear task tracking
        this.workerTasks.delete(workerIndex);
        const task = this.pending.get(taskId);
        if (task) {
            this.pending.delete(taskId);
            if (success) {
                // Rehydrate Spans
                const spans = rawSpans.map((s) => new Span_1.Span(s));
                task.resolve(spans);
            }
            else {
                task.reject(new Error(errorMsg || "Unknown worker error"));
            }
        }
        this.workerStatus[workerIndex] = false; // Free
        this.processNext(workerIndex);
    }
    processNext(workerIndex) {
        if (this.queue.length > 0) {
            const task = this.queue.shift();
            this.runTask(workerIndex, task);
        }
    }
    runTask(workerIndex, task) {
        this.workerStatus[workerIndex] = true; // Busy
        this.workerTasks.set(workerIndex, task.taskId);
        this.pending.set(task.taskId, task);
        this.workers[workerIndex].postMessage({
            taskId: task.taskId,
            filterName: task.filterName,
            text: task.text,
            config: task.config,
        });
    }
    async execute(filterName, text, config) {
        // WORKER POOLS DISABLED BY DEFAULT
        // Workers cause timeout issues that haven't been resolved yet.
        // Set VULPES_WORKERS=1 to explicitly enable worker threads.
        // Set VULPES_NO_WORKERS=1 to force synchronous (legacy check, still works).
        const workersExplicitlyEnabled = process.env.VULPES_WORKERS === "1";
        const workersExplicitlyDisabled = process.env.VULPES_NO_WORKERS === "1";
        if (!workersExplicitlyEnabled || workersExplicitlyDisabled) {
            return this.runSync(filterName, text, config);
        }
        // Lazy initialization - only start workers when actually needed
        this.ensureInitialized();
        // If no active workers (or disabled), run sync
        // We check if we have any workers that are NOT undefined/null
        const activeWorkers = this.workers.filter((w) => !!w).length;
        if (activeWorkers === 0) {
            // SYNC FALLBACK
            return this.runSync(filterName, text, config);
        }
        return new Promise((resolve, reject) => {
            const taskId = Math.random().toString(36).substring(7);
            const task = {
                taskId,
                filterName,
                text,
                config,
                resolve,
                reject,
            };
            // Find free worker
            // We must skip slots where worker failed to start (undefined)
            const freeWorkerIndex = this.workerStatus.findIndex((busy, idx) => !busy && !!this.workers[idx]);
            if (freeWorkerIndex >= 0) {
                this.runTask(freeWorkerIndex, task);
            }
            else {
                this.queue.push(task);
            }
        });
    }
    async runSync(filterName, text, config) {
        // Import registry (circular dependency? Registry uses pool? No, Engine uses pool. Registry loads filters.)
        // We need raw filters here.
        // We can dynamically import FilterRegistry?
        const { FilterRegistry } = await Promise.resolve().then(() => __importStar(require("../filters/FilterRegistry")));
        if (!FilterRegistry.isReady()) {
            await FilterRegistry.initialize();
        }
        // Access private static? No, use public accessor
        const filters = FilterRegistry.getAllSpanFilters();
        const filter = filters.find((f) => f.constructor.name === filterName);
        if (!filter) {
            throw new Error(`Filter not found: ${filterName}`);
        }
        // Mock context (same as worker) - minimal needed
        const mockContext = {
            getMemo: () => undefined,
            setMemo: () => { },
            createToken: () => "TOKEN_PLACEHOLDER_SYNC",
        };
        return Promise.resolve(filter.detect(text, config, mockContext));
    }
    /**
     * Terminate all workers
     */
    async terminate() {
        await Promise.all(this.workers.map((w) => w.terminate()));
        this.workers = [];
        this.workerStatus = [];
    }
}
exports.FilterWorkerPool = FilterWorkerPool;
//# sourceMappingURL=FilterWorkerPool.js.map