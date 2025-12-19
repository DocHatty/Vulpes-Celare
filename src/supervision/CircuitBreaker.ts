/**
 * CircuitBreaker - Fault Isolation Pattern
 *
 * Prevents cascading failures by "opening" the circuit when failures exceed
 * a threshold. While open, requests fail fast without attempting the operation.
 *
 * STATES:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Failures exceeded threshold, requests fail immediately
 * - HALF_OPEN: After reset timeout, allow one test request
 *
 * EXAMPLE:
 *   const breaker = new CircuitBreaker({ failureThreshold: 5, resetTimeout: 30000 });
 *
 *   const result = await breaker.execute(async () => {
 *     return await riskyOperation();
 *   });
 *
 * @module redaction/supervision
 */

import { EventEmitter } from "events";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms before attempting reset */
  resetTimeout: number;
  /** Number of successes needed to close circuit from half-open */
  successThreshold?: number;
  /** Optional timeout for each operation */
  operationTimeout?: number;
}

export class CircuitOpenError extends Error {
  constructor(
    message: string = "Circuit breaker is open",
    public readonly nextRetryTime: number
  ) {
    super(message);
    this.name = "CircuitOpenError";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER CLASS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: Required<CircuitBreakerConfig> = {
  failureThreshold: 5,
  resetTimeout: 30000,
  successThreshold: 2,
  operationTimeout: 10000,
};

export class CircuitBreaker extends EventEmitter {
  private config: Required<CircuitBreakerConfig>;
  private state: CircuitState = "closed";
  private failures = 0;
  private successes = 0;
  private nextRetryTime = 0;

  // Statistics
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    rejectedRequests: 0,
    timeouts: 0,
  };

  constructor(config: CircuitBreakerConfig) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.stats.totalRequests++;

    // Check circuit state
    if (this.state === "open") {
      if (Date.now() >= this.nextRetryTime) {
        this.transitionTo("half_open");
      } else {
        this.stats.rejectedRequests++;
        throw new CircuitOpenError(
          `Circuit breaker is open. Next retry at ${new Date(this.nextRetryTime).toISOString()}`,
          this.nextRetryTime
        );
      }
    }

    try {
      // Execute with optional timeout
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.config.operationTimeout) {
      return fn();
    }

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.stats.timeouts++;
        reject(new Error("Operation timeout"));
      }, this.config.operationTimeout);

      fn()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.stats.successfulRequests++;
    this.failures = 0;

    if (this.state === "half_open") {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.transitionTo("closed");
      }
    }

    this.emit("success");
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error): void {
    this.stats.failedRequests++;
    this.failures++;
    this.successes = 0;

    this.emit("failure", error);

    if (this.state === "half_open") {
      // Immediately open on failure in half-open state
      this.transitionTo("open");
    } else if (this.failures >= this.config.failureThreshold) {
      this.transitionTo("open");
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    if (newState === "open") {
      this.nextRetryTime = Date.now() + this.config.resetTimeout;
    } else if (newState === "closed") {
      this.failures = 0;
      this.successes = 0;
    } else if (newState === "half_open") {
      this.successes = 0;
    }

    this.emit("state_change", oldState, newState);
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    // Check if we should transition from open to half-open
    if (this.state === "open" && Date.now() >= this.nextRetryTime) {
      return "half_open";
    }
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): typeof this.stats & {
    state: CircuitState;
    failures: number;
    successes: number;
  } {
    return {
      ...this.stats,
      state: this.getState(),
      failures: this.failures,
      successes: this.successes,
    };
  }

  /**
   * Force the circuit to a specific state (for testing/recovery)
   */
  forceState(state: CircuitState): void {
    this.transitionTo(state);
    this.emit("forced_state", state);
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.state = "closed";
    this.failures = 0;
    this.successes = 0;
    this.nextRetryTime = 0;
    this.emit("reset");
  }
}
