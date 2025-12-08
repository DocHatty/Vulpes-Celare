"use strict";
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
exports.shutdownWorkerPool = exports.getWorkerPool = exports.TrueParallelExecutor = void 0;
const os = __importStar(require("os"));
const Span_1 = require("../models/Span");
const WorkerPool_1 = require("./WorkerPool");
const RadiologyLogger_1 = require("../utils/RadiologyLogger");
const DEFAULT_CONFIG = {
    useWorkerThreads: false, // Disabled until dictionary loading is optimized
    maxWorkers: Math.max(1, Math.min(4, os.cpus().length - 1)), // Cap at 4 workers
    minTextLengthForWorkers: 2000, // Only use workers for larger texts
    minFiltersForWorkers: 10, // Only use workers when many filters
};
// ============================================================================
// TRUE PARALLEL EXECUTOR
// ============================================================================
class TrueParallelExecutor {
    /**
     * Configure the executor
     */
    static configure(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Initialize the executor (checks if worker pool is available)
     */
    static async initialize() {
        if (this.initialized)
            return;
        if (this.config.useWorkerThreads) {
            try {
                const pool = (0, WorkerPool_1.getWorkerPool)({ maxWorkers: this.config.maxWorkers });
                await pool.initialize();
                this.workerPoolAvailable = true;
                RadiologyLogger_1.RadiologyLogger.info("PARALLEL", `True parallel execution enabled with ${this.config.maxWorkers} workers`);
            }
            catch (error) {
                RadiologyLogger_1.RadiologyLogger.warn("PARALLEL", `Worker pool initialization failed, falling back to single-threaded: ${error}`);
                this.workerPoolAvailable = false;
            }
        }
        this.initialized = true;
    }
    /**
     * Execute filters in true parallel (multi-core) or fall back to Promise.all
     */
    static async executeFilters(filters, text, policy, context) {
        await this.initialize();
        // Decide whether to use workers
        const shouldUseWorkers = this.workerPoolAvailable &&
            this.config.useWorkerThreads &&
            text.length >= this.config.minTextLengthForWorkers &&
            filters.length >= this.config.minFiltersForWorkers;
        if (shouldUseWorkers) {
            return this.executeWithWorkers(filters, text, policy, context);
        }
        else {
            return this.executeWithPromiseAll(filters, text, policy, context);
        }
    }
    /**
     * Execute using worker threads (TRUE parallelism)
     */
    static async executeWithWorkers(filters, text, policy, context) {
        const pool = (0, WorkerPool_1.getWorkerPool)();
        const startTime = Date.now();
        // Create tasks for each filter
        const tasks = filters.map((filter, index) => ({
            taskId: `task-${index}-${Date.now()}`,
            filterName: filter.constructor.name,
            filterType: filter.getType(),
            text: text,
            config: policy.identifiers?.[filter.getType()] || {},
        }));
        RadiologyLogger_1.RadiologyLogger.info("PARALLEL", `Executing ${tasks.length} filters across ${this.config.maxWorkers} worker threads`);
        // Execute all tasks
        const results = await pool.executeTasks(tasks);
        // Convert results back to Span objects
        const output = [];
        for (let i = 0; i < filters.length; i++) {
            const filter = filters[i];
            const result = results[i];
            const spans = result.success
                ? result.spans.map((s) => this.deserializeSpan(s))
                : [];
            output.push({
                filter,
                spans,
                executionTimeMs: result.executionTimeMs,
            });
            if (!result.success) {
                RadiologyLogger_1.RadiologyLogger.error("PARALLEL", `Filter ${result.filterName} failed: ${result.error}`);
            }
        }
        const totalTime = Date.now() - startTime;
        RadiologyLogger_1.RadiologyLogger.info("PARALLEL", `Worker execution completed in ${totalTime}ms (${Math.round(totalTime / filters.length)}ms avg per filter)`);
        return output;
    }
    /**
     * Execute using Promise.all (FAKE parallelism - single threaded)
     */
    static async executeWithPromiseAll(filters, text, policy, context) {
        const startTime = Date.now();
        RadiologyLogger_1.RadiologyLogger.info("PARALLEL", `Executing ${filters.length} filters with Promise.all (single-threaded)`);
        const promises = filters.map(async (filter) => {
            const filterStart = Date.now();
            const config = policy.identifiers?.[filter.getType()];
            try {
                const spans = await Promise.resolve(filter.detect(text, config, context));
                return {
                    filter,
                    spans,
                    executionTimeMs: Date.now() - filterStart,
                };
            }
            catch (error) {
                RadiologyLogger_1.RadiologyLogger.error("PARALLEL", `Filter ${filter.constructor.name} failed: ${error}`);
                return {
                    filter,
                    spans: [],
                    executionTimeMs: Date.now() - filterStart,
                };
            }
        });
        const results = await Promise.all(promises);
        const totalTime = Date.now() - startTime;
        RadiologyLogger_1.RadiologyLogger.info("PARALLEL", `Promise.all execution completed in ${totalTime}ms`);
        return results;
    }
    /**
     * Deserialize a span from worker result
     */
    static deserializeSpan(serialized) {
        return new Span_1.Span({
            text: serialized.text,
            originalValue: serialized.originalValue,
            characterStart: serialized.characterStart,
            characterEnd: serialized.characterEnd,
            filterType: serialized.filterType,
            confidence: serialized.confidence,
            priority: serialized.priority,
            context: serialized.context,
            window: [],
            replacement: null,
            salt: null,
            pattern: serialized.pattern,
            applied: false,
            ignored: false,
            ambiguousWith: [],
            disambiguationScore: null,
        });
    }
    /**
     * Get execution mode info
     */
    static getInfo() {
        return {
            mode: this.workerPoolAvailable ? "worker_threads" : "promise_all",
            workers: this.workerPoolAvailable ? this.config.maxWorkers || 0 : 1,
            cpus: os.cpus().length,
        };
    }
    /**
     * Shutdown workers (call on process exit)
     */
    static async shutdown() {
        if (this.workerPoolAvailable) {
            const pool = (0, WorkerPool_1.getWorkerPool)();
            await pool.shutdown();
            this.workerPoolAvailable = false;
        }
        this.initialized = false;
    }
}
exports.TrueParallelExecutor = TrueParallelExecutor;
TrueParallelExecutor.config = { ...DEFAULT_CONFIG };
TrueParallelExecutor.initialized = false;
TrueParallelExecutor.workerPoolAvailable = false;
// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================
var WorkerPool_2 = require("./WorkerPool");
Object.defineProperty(exports, "getWorkerPool", { enumerable: true, get: function () { return WorkerPool_2.getWorkerPool; } });
Object.defineProperty(exports, "shutdownWorkerPool", { enumerable: true, get: function () { return WorkerPool_2.shutdownWorkerPool; } });
//# sourceMappingURL=TrueParallelExecutor.js.map