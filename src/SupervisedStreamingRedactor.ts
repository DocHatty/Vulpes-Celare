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

import { EventEmitter } from "events";
import {
  StreamingRedactor,
  StreamingChunk,
  StreamingRedactorConfig,
} from "./StreamingRedactor";
import {
  CircuitBreaker,
  CircuitOpenError,
  CircuitBreakerConfig,
} from "./supervision/CircuitBreaker";
import {
  BackpressureQueue,
  BackpressureQueueConfig,
} from "./supervision/BackpressureQueue";
import {
  Supervisor,
  SupervisorConfig,
  ChildProcess,
  ChildSpec,
} from "./supervision/Supervisor";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SupervisedStreamingConfig extends StreamingRedactorConfig {
  /** Circuit breaker configuration */
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  /** Backpressure queue configuration */
  backpressure?: Partial<BackpressureQueueConfig>;
  /** Enable supervision (default: true) */
  enableSupervision?: boolean;
  /** Max restart attempts per worker (default: 3) */
  maxRestarts?: number;
  /** Restart window in seconds (default: 60) */
  restartWindowSeconds?: number;
}

export interface SupervisedStreamingStats {
  chunksProcessed: number;
  chunksDropped: number;
  circuitState: "closed" | "open" | "half_open";
  queueSize: number;
  queuePaused: boolean;
  totalRestarts: number;
  uptime: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKER PROCESS WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

class RedactorWorkerProcess implements ChildProcess {
  id: string;
  private redactor: StreamingRedactor;
  private running = false;

  constructor(id: string, config: StreamingRedactorConfig) {
    this.id = id;
    this.redactor = new StreamingRedactor(config);
  }

  async run(): Promise<void> {
    this.running = true;
    // Worker stays alive until stopped
    await new Promise<void>((resolve) => {
      const checkStop = setInterval(() => {
        if (!this.running) {
          clearInterval(checkStop);
          resolve();
        }
      }, 100);
    });
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.redactor.flush();
  }

  isRunning(): boolean {
    return this.running;
  }

  getRedactor(): StreamingRedactor {
    return this.redactor;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPERVISED STREAMING REDACTOR
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 30000,
  successThreshold: 2,
  operationTimeout: 10000,
};

const DEFAULT_BACKPRESSURE_CONFIG: BackpressureQueueConfig = {
  highWaterMark: 1000,
  lowWaterMark: 100,
  maxSize: 5000,
};

export class SupervisedStreamingRedactor extends EventEmitter {
  private config: SupervisedStreamingConfig;
  private circuitBreaker: CircuitBreaker;
  private backpressure: BackpressureQueue<StreamingChunk>;
  private supervisor: Supervisor | null = null;
  private worker: RedactorWorkerProcess | null = null;
  private startTime: number = 0;

  // Statistics
  private stats = {
    chunksProcessed: 0,
    chunksDropped: 0,
    totalRestarts: 0,
  };

  constructor(config: SupervisedStreamingConfig = {}) {
    super();
    this.config = config;

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker({
      ...DEFAULT_CIRCUIT_CONFIG,
      ...config.circuitBreaker,
    });

    // Initialize backpressure queue
    this.backpressure = new BackpressureQueue<StreamingChunk>({
      ...DEFAULT_BACKPRESSURE_CONFIG,
      ...config.backpressure,
    });

    // Set up event forwarding
    this.setupEventForwarding();

    // Initialize supervisor if enabled
    if (config.enableSupervision !== false) {
      this.initializeSupervisor();
    } else {
      // Direct worker without supervision
      this.worker = new RedactorWorkerProcess("redactor-0", config);
    }
  }

  private setupEventForwarding(): void {
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

  private initializeSupervisor(): void {
    const workerSpec: ChildSpec = {
      id: "redactor-worker",
      start: () => {
        this.worker = new RedactorWorkerProcess("redactor-0", this.config);
        return this.worker;
      },
      restart: "permanent",
      shutdown: 5000,
    };

    const supervisorConfig: SupervisorConfig = {
      strategy: "one_for_one",
      maxRestarts: this.config.maxRestarts || 3,
      maxSeconds: this.config.restartWindowSeconds || 60,
      children: [workerSpec],
    };

    this.supervisor = new Supervisor(supervisorConfig);

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
  async start(): Promise<void> {
    this.startTime = Date.now();

    if (this.supervisor) {
      await this.supervisor.start();
    } else if (this.worker) {
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
  async stop(): Promise<void> {
    if (this.supervisor) {
      await this.supervisor.stop();
    } else if (this.worker) {
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
  async processChunk(text: string): Promise<StreamingChunk | null> {
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
    } catch (error) {
      if (error instanceof CircuitOpenError) {
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
  async *redactStream(
    stream: AsyncIterable<string>,
  ): AsyncGenerator<StreamingChunk> {
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
      } catch (error) {
        if (error instanceof CircuitOpenError) {
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
  private async processChunkInternal(
    text: string,
  ): Promise<StreamingChunk | null> {
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
  async flush(): Promise<StreamingChunk | null> {
    if (!this.worker) return null;

    const redactor = this.worker.getRedactor();
    return redactor.flush();
  }

  /**
   * Wait for backpressure to release
   */
  private waitForResume(): Promise<void> {
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
  getStats(): SupervisedStreamingStats {
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
  getCircuitBreaker(): CircuitBreaker {
    return this.circuitBreaker;
  }

  /**
   * Get backpressure queue for advanced control
   */
  getBackpressureQueue(): BackpressureQueue<StreamingChunk> {
    return this.backpressure;
  }

  /**
   * Force reset the circuit breaker
   */
  resetCircuit(): void {
    this.circuitBreaker.reset();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a supervised streaming redactor with sensible defaults
 */
export function createSupervisedStreamingRedactor(
  config?: SupervisedStreamingConfig,
): SupervisedStreamingRedactor {
  return new SupervisedStreamingRedactor({
    bufferSize: 50,
    ...config,
  });
}

/**
 * Check if supervision features are enabled
 */
export function isSupervisionEnabled(): boolean {
  return process.env.VULPES_SUPERVISION !== "0";
}
