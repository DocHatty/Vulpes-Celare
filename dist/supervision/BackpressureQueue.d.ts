/**
 * BackpressureQueue - Flow Control for Streaming Pipelines
 *
 * Implements backpressure to prevent memory exhaustion when producers
 * are faster than consumers. Uses high/low water marks to pause and
 * resume the producer.
 *
 * FLOW CONTROL:
 * - When queue reaches highWaterMark, emit "pause" event
 * - When queue drops to lowWaterMark, emit "resume" event
 * - Producer should respect these events to avoid OOM
 *
 * EXAMPLE:
 *   const queue = new BackpressureQueue<Chunk>({ highWaterMark: 1000, lowWaterMark: 100 });
 *
 *   queue.on("pause", () => producer.pause());
 *   queue.on("resume", () => producer.resume());
 *
 *   // Producer side
 *   if (!queue.push(chunk)) {
 *     // Queue is full, wait for "resume"
 *   }
 *
 *   // Consumer side
 *   const chunk = queue.pull();
 *
 * @module redaction/supervision
 */
import { EventEmitter } from "events";
export interface BackpressureQueueConfig {
    /** Queue size that triggers pause */
    highWaterMark: number;
    /** Queue size that triggers resume */
    lowWaterMark: number;
    /** Maximum queue size (items rejected beyond this) */
    maxSize?: number;
}
export interface QueueStats {
    size: number;
    paused: boolean;
    totalPushed: number;
    totalPulled: number;
    totalDropped: number;
    pauseCount: number;
    resumeCount: number;
}
export declare class BackpressureQueue<T> extends EventEmitter {
    private queue;
    private config;
    private paused;
    private stats;
    constructor(config: BackpressureQueueConfig);
    /**
     * Push an item to the queue
     * Returns false if backpressure should be applied
     */
    push(item: T): boolean;
    /**
     * Push multiple items to the queue
     * Returns number of items successfully pushed
     */
    pushMany(items: T[]): number;
    /**
     * Pull an item from the queue
     */
    pull(): T | undefined;
    /**
     * Pull multiple items from the queue
     */
    pullMany(count: number): T[];
    /**
     * Peek at the front item without removing
     */
    peek(): T | undefined;
    /**
     * Get current queue size
     */
    get size(): number;
    /**
     * Check if queue is empty
     */
    get isEmpty(): boolean;
    /**
     * Check if backpressure is active
     */
    get isPaused(): boolean;
    /**
     * Get queue statistics
     */
    getStats(): QueueStats;
    /**
     * Clear the queue
     */
    clear(): void;
    /**
     * Drain the queue (returns all items and clears)
     */
    drain(): T[];
    /**
     * Async iterator for consuming the queue
     */
    [Symbol.asyncIterator](): AsyncGenerator<T>;
    /**
     * Signal that no more items will be pushed
     */
    done(): void;
}
//# sourceMappingURL=BackpressureQueue.d.ts.map