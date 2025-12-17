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

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// BACKPRESSURE QUEUE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class BackpressureQueue<T> extends EventEmitter {
  private queue: T[] = [];
  private config: Required<BackpressureQueueConfig>;
  private paused = false;

  // Statistics
  private stats = {
    totalPushed: 0,
    totalPulled: 0,
    totalDropped: 0,
    pauseCount: 0,
    resumeCount: 0,
  };

  constructor(config: BackpressureQueueConfig) {
    super();
    this.config = {
      ...config,
      maxSize: config.maxSize || config.highWaterMark * 2,
    };

    if (config.lowWaterMark >= config.highWaterMark) {
      throw new Error("lowWaterMark must be less than highWaterMark");
    }
  }

  /**
   * Push an item to the queue
   * Returns false if backpressure should be applied
   */
  push(item: T): boolean {
    // Reject if at max size
    if (this.queue.length >= this.config.maxSize) {
      this.stats.totalDropped++;
      this.emit("dropped", item);
      return false;
    }

    this.queue.push(item);
    this.stats.totalPushed++;

    // Check if we need to apply backpressure
    if (!this.paused && this.queue.length >= this.config.highWaterMark) {
      this.paused = true;
      this.stats.pauseCount++;
      this.emit("pause");
    }

    return !this.paused;
  }

  /**
   * Push multiple items to the queue
   * Returns number of items successfully pushed
   */
  pushMany(items: T[]): number {
    let pushed = 0;
    for (const item of items) {
      if (this.push(item)) {
        pushed++;
      } else if (this.queue.length >= this.config.maxSize) {
        // Stop if we've hit max size
        break;
      }
    }
    return pushed;
  }

  /**
   * Pull an item from the queue
   */
  pull(): T | undefined {
    const item = this.queue.shift();

    if (item !== undefined) {
      this.stats.totalPulled++;

      // Check if we can resume
      if (this.paused && this.queue.length <= this.config.lowWaterMark) {
        this.paused = false;
        this.stats.resumeCount++;
        this.emit("resume");
      }
    }

    return item;
  }

  /**
   * Pull multiple items from the queue
   */
  pullMany(count: number): T[] {
    const items: T[] = [];
    for (let i = 0; i < count; i++) {
      const item = this.pull();
      if (item === undefined) break;
      items.push(item);
    }
    return items;
  }

  /**
   * Peek at the front item without removing
   */
  peek(): T | undefined {
    return this.queue[0];
  }

  /**
   * Get current queue size
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Check if backpressure is active
   */
  get isPaused(): boolean {
    return this.paused;
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    return {
      size: this.queue.length,
      paused: this.paused,
      ...this.stats,
    };
  }

  /**
   * Clear the queue
   */
  clear(): void {
    const dropped = this.queue.length;
    this.queue = [];
    this.stats.totalDropped += dropped;

    if (this.paused) {
      this.paused = false;
      this.stats.resumeCount++;
      this.emit("resume");
    }

    this.emit("cleared", dropped);
  }

  /**
   * Drain the queue (returns all items and clears)
   */
  drain(): T[] {
    const items = this.queue;
    this.queue = [];
    this.stats.totalPulled += items.length;

    if (this.paused) {
      this.paused = false;
      this.stats.resumeCount++;
      this.emit("resume");
    }

    return items;
  }

  /**
   * Async iterator for consuming the queue
   */
  async *[Symbol.asyncIterator](): AsyncGenerator<T> {
    while (true) {
      const item = this.pull();
      if (item !== undefined) {
        yield item;
      } else {
        // Wait for new items
        await new Promise<void>((resolve) => {
          const handler = () => {
            this.removeListener("push", handler);
            this.removeListener("done", handler);
            resolve();
          };
          this.once("push", handler);
          this.once("done", handler);
        });

        // Check if queue was signaled done
        if (this.isEmpty) break;
      }
    }
  }

  /**
   * Signal that no more items will be pushed
   */
  done(): void {
    this.emit("done");
  }
}
