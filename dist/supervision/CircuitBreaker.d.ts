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
export declare class CircuitOpenError extends Error {
    readonly nextRetryTime: number;
    constructor(message: string | undefined, nextRetryTime: number);
}
export declare class CircuitBreaker extends EventEmitter {
    private config;
    private state;
    private failures;
    private successes;
    private lastFailure;
    private nextRetryTime;
    private stats;
    constructor(config: CircuitBreakerConfig);
    /**
     * Execute a function with circuit breaker protection
     */
    execute<T>(fn: () => Promise<T>): Promise<T>;
    /**
     * Execute with timeout
     */
    private executeWithTimeout;
    /**
     * Handle successful execution
     */
    private onSuccess;
    /**
     * Handle failed execution
     */
    private onFailure;
    /**
     * Transition to a new state
     */
    private transitionTo;
    /**
     * Get current state
     */
    getState(): CircuitState;
    /**
     * Get circuit breaker statistics
     */
    getStats(): typeof this.stats & {
        state: CircuitState;
        failures: number;
        successes: number;
    };
    /**
     * Force the circuit to a specific state (for testing/recovery)
     */
    forceState(state: CircuitState): void;
    /**
     * Reset the circuit breaker
     */
    reset(): void;
}
//# sourceMappingURL=CircuitBreaker.d.ts.map