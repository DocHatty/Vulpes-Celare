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
import { StreamingChunk, StreamingRedactorConfig } from "./StreamingRedactor";
import { CircuitBreaker, CircuitBreakerConfig } from "./supervision/CircuitBreaker";
import { BackpressureQueue, BackpressureQueueConfig } from "./supervision/BackpressureQueue";
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
export declare class SupervisedStreamingRedactor extends EventEmitter {
    private config;
    private circuitBreaker;
    private backpressure;
    private supervisor;
    private worker;
    private startTime;
    private stats;
    constructor(config?: SupervisedStreamingConfig);
    private setupEventForwarding;
    private initializeSupervisor;
    /**
     * Start the supervised streaming redactor
     */
    start(): Promise<void>;
    /**
     * Stop the supervised streaming redactor
     */
    stop(): Promise<void>;
    /**
     * Process a single chunk with circuit breaker protection
     */
    processChunk(text: string): Promise<StreamingChunk | null>;
    /**
     * Redact a stream with full supervision
     */
    redactStream(stream: AsyncIterable<string>): AsyncGenerator<StreamingChunk>;
    /**
     * Internal chunk processing
     */
    private processChunkInternal;
    /**
     * Flush any buffered content
     */
    flush(): Promise<StreamingChunk | null>;
    /**
     * Wait for backpressure to release
     */
    private waitForResume;
    /**
     * Get comprehensive statistics
     */
    getStats(): SupervisedStreamingStats;
    /**
     * Get circuit breaker instance for advanced control
     */
    getCircuitBreaker(): CircuitBreaker;
    /**
     * Get backpressure queue for advanced control
     */
    getBackpressureQueue(): BackpressureQueue<StreamingChunk>;
    /**
     * Force reset the circuit breaker
     */
    resetCircuit(): void;
}
/**
 * Create a supervised streaming redactor with sensible defaults
 */
export declare function createSupervisedStreamingRedactor(config?: SupervisedStreamingConfig): SupervisedStreamingRedactor;
/**
 * Check if supervision features are enabled
 */
export declare function isSupervisionEnabled(): boolean;
//# sourceMappingURL=SupervisedStreamingRedactor.d.ts.map