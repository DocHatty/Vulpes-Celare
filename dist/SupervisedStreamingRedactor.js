"use strict";
/**
 * SupervisedStreamingRedactor - Fault-Tolerant Streaming PHI Redaction
 *
 * Combines the StreamingRedactor with Elixir-style supervision patterns:
 * - CircuitBreaker: Prevents cascading failures
 * - BackpressureQueue: Flow control for high-throughput streams
 * - Supervisor: Automatic recovery from worker failures
 *
 * USAGE:
 *   const redactor = new SupervisedStreamingRedactor();
 *
 *   for await (const chunk of redactor.redactStream(inputStream)) {
 *     console.log(chunk.text);
 *   }
 *
 * FAULT TOLERANCE:
 *   - Circuit opens after 5 consecutive failures
 *   - Backpressure kicks in at 1000 queued chunks
 *   - Failed workers are automatically restarted
 *
 * @module redaction
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupervisedStreamingRedactor = void 0;
exports.createSupervisedStreamingRedactor = createSupervisedStreamingRedactor;
exports.isSupervisionEnabled = isSupervisionEnabled;
const events_1 = require("events");
const StreamingRedactor_1 = require("./StreamingRedactor");
const CircuitBreaker_1 = require("./supervision/CircuitBreaker");
const BackpressureQueue_1 = require("./supervision/BackpressureQueue");
const Supervisor_1 = require("./supervision/Supervisor");
// ═══════════════════════════════════════════════════════════════════════════
// WORKER PROCESS WRAPPER
// ═══════════════════════════════════════════════════════════════════════════
class RedactorWorkerProcess {
    id;
    redactor;
    running = false;
    config;
    constructor(id, config) {
        this.id = id;
        this.config = config;
        this.redactor = new StreamingRedactor_1.StreamingRedactor(config);
    }
    async run() {
        this.running = true;
        // Worker stays alive until stopped
        await new Promise((resolve) => {
            const checkStop = setInterval(() => {
                if (!this.running) {
                    clearInterval(checkStop);
                    resolve();
                }
            }, 100);
        });
    }
    async stop() {
        this.running = false;
        await this.redactor.flush();
    }
    isRunning() {
        return this.running;
    }
    getRedactor() {
        return this.redactor;
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// SUPERVISED STREAMING REDACTOR
// ═══════════════════════════════════════════════════════════════════════════
const DEFAULT_CIRCUIT_CONFIG = {
    failureThreshold: 5,
    resetTimeout: 30000,
    successThreshold: 2,
    operationTimeout: 10000,
};
const DEFAULT_BACKPRESSURE_CONFIG = {
    highWaterMark: 1000,
    lowWaterMark: 100,
    maxSize: 5000,
};
class SupervisedStreamingRedactor extends events_1.EventEmitter {
    config;
    circuitBreaker;
    backpressure;
    supervisor = null;
    worker = null;
    startTime = 0;
    // Statistics
    stats = {
        chunksProcessed: 0,
        chunksDropped: 0,
        totalRestarts: 0,
    };
    constructor(config = {}) {
        super();
        this.config = config;
        // Initialize circuit breaker
        this.circuitBreaker = new CircuitBreaker_1.CircuitBreaker({
            ...DEFAULT_CIRCUIT_CONFIG,
            ...config.circuitBreaker,
        });
        // Initialize backpressure queue
        this.backpressure = new BackpressureQueue_1.BackpressureQueue({
            ...DEFAULT_BACKPRESSURE_CONFIG,
            ...config.backpressure,
        });
        // Set up event forwarding
        this.setupEventForwarding();
        // Initialize supervisor if enabled
        if (config.enableSupervision !== false) {
            this.initializeSupervisor();
        }
        else {
            // Direct worker without supervision
            this.worker = new RedactorWorkerProcess("redactor-0", config);
        }
    }
    setupEventForwarding() {
        // Forward circuit breaker events
        this.circuitBreaker.on("state_change", (oldState, newState) => {
            this.emit("circuit_state_change", { oldState, newState });
        });
        this.circuitBreaker.on("failure", (error) => {
            this.emit("circuit_failure", error);
        });
        // Forward backpressure events
        this.backpressure.on("pause", () => {
            this.emit("backpressure_pause");
        });
        this.backpressure.on("resume", () => {
            this.emit("backpressure_resume");
        });
        this.backpressure.on("dropped", (item) => {
            this.stats.chunksDropped++;
            this.emit("chunk_dropped", item);
        });
    }
    initializeSupervisor() {
        const workerSpec = {
            id: "redactor-worker",
            start: () => {
                this.worker = new RedactorWorkerProcess("redactor-0", this.config);
                return this.worker;
            },
            restart: "permanent",
            shutdown: 5000,
        };
        const supervisorConfig = {
            strategy: "one_for_one",
            maxRestarts: this.config.maxRestarts || 3,
            maxSeconds: this.config.restartWindowSeconds || 60,
            children: [workerSpec],
        };
        this.supervisor = new Supervisor_1.Supervisor(supervisorConfig);
        // Track restarts
        this.supervisor.on("child_restarting", (id, count) => {
            this.stats.totalRestarts = count;
            this.emit("worker_restarting", { id, restartCount: count });
        });
        this.supervisor.on("max_restarts_exceeded", (id) => {
            this.emit("max_restarts_exceeded", { id });
        });
    }
    /**
     * Start the supervised streaming redactor
     */
    async start() {
        this.startTime = Date.now();
        if (this.supervisor) {
            await this.supervisor.start();
        }
        else if (this.worker) {
            // Start worker directly
            this.worker.run().catch((error) => {
                this.emit("worker_error", error);
            });
        }
        this.emit("started");
    }
    /**
     * Stop the supervised streaming redactor
     */
    async stop() {
        if (this.supervisor) {
            await this.supervisor.stop();
        }
        else if (this.worker) {
            await this.worker.stop();
        }
        // Drain the backpressure queue
        const remaining = this.backpressure.drain();
        if (remaining.length > 0) {
            this.emit("drained", { count: remaining.length });
        }
        this.emit("stopped");
    }
    /**
     * Process a single chunk with circuit breaker protection
     */
    async processChunk(text) {
        // Check backpressure
        if (this.backpressure.isPaused) {
            this.emit("backpressure_applied");
            // Wait for resume
            await this.waitForResume();
        }
        try {
            const result = await this.circuitBreaker.execute(async () => {
                if (!this.worker) {
                    throw new Error("No worker available");
                }
                const redactor = this.worker.getRedactor();
                // processChunk returns Promise<StreamingChunk | null>, not async iterable
                return redactor.processChunk(text);
            });
            if (result) {
                this.stats.chunksProcessed++;
                this.backpressure.push(result);
            }
            return result;
        }
        catch (error) {
            if (error instanceof CircuitBreaker_1.CircuitOpenError) {
                this.emit("circuit_open", {
                    message: error.message,
                    nextRetryTime: error.nextRetryTime,
                });
                return null;
            }
            throw error;
        }
    }
    /**
     * Redact a stream with full supervision
     */
    async *redactStream(stream) {
        for await (const chunk of stream) {
            // Apply backpressure if needed
            while (this.backpressure.isPaused) {
                await this.waitForResume();
            }
            try {
                const result = await this.circuitBreaker.execute(async () => {
                    return this.processChunkInternal(chunk);
                });
                if (result) {
                    this.stats.chunksProcessed++;
                    yield result;
                }
            }
            catch (error) {
                if (error instanceof CircuitBreaker_1.CircuitOpenError) {
                    this.emit("circuit_open", {
                        message: error.message,
                        nextRetryTime: error.nextRetryTime,
                    });
                    // Skip this chunk when circuit is open
                    continue;
                }
                throw error;
            }
        }
        // Flush remaining
        const flushResult = await this.flush();
        if (flushResult) {
            yield flushResult;
        }
    }
    /**
     * Internal chunk processing
     */
    async processChunkInternal(text) {
        if (!this.worker) {
            throw new Error("No worker available");
        }
        const redactor = this.worker.getRedactor();
        // processChunk returns Promise<StreamingChunk | null>
        return redactor.processChunk(text);
    }
    /**
     * Flush any buffered content
     */
    async flush() {
        if (!this.worker)
            return null;
        const redactor = this.worker.getRedactor();
        return redactor.flush();
    }
    /**
     * Wait for backpressure to release
     */
    waitForResume() {
        return new Promise((resolve) => {
            if (!this.backpressure.isPaused) {
                resolve();
                return;
            }
            const handler = () => {
                this.backpressure.removeListener("resume", handler);
                resolve();
            };
            this.backpressure.once("resume", handler);
        });
    }
    /**
     * Get comprehensive statistics
     */
    getStats() {
        const circuitStats = this.circuitBreaker.getStats();
        const queueStats = this.backpressure.getStats();
        return {
            chunksProcessed: this.stats.chunksProcessed,
            chunksDropped: this.stats.chunksDropped,
            circuitState: circuitStats.state,
            queueSize: queueStats.size,
            queuePaused: queueStats.paused,
            totalRestarts: this.stats.totalRestarts,
            uptime: this.startTime > 0 ? Date.now() - this.startTime : 0,
        };
    }
    /**
     * Get circuit breaker instance for advanced control
     */
    getCircuitBreaker() {
        return this.circuitBreaker;
    }
    /**
     * Get backpressure queue for advanced control
     */
    getBackpressureQueue() {
        return this.backpressure;
    }
    /**
     * Force reset the circuit breaker
     */
    resetCircuit() {
        this.circuitBreaker.reset();
    }
}
exports.SupervisedStreamingRedactor = SupervisedStreamingRedactor;
// ═══════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Create a supervised streaming redactor with sensible defaults
 */
function createSupervisedStreamingRedactor(config) {
    return new SupervisedStreamingRedactor({
        bufferSize: 50,
        ...config,
    });
}
/**
 * Check if supervision features are enabled
 */
function isSupervisionEnabled() {
    return process.env.VULPES_SUPERVISION !== "0";
}
//# sourceMappingURL=SupervisedStreamingRedactor.js.map