"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = exports.CircuitOpenError = void 0;
const events_1 = require("events");
class CircuitOpenError extends Error {
    nextRetryTime;
    constructor(message = "Circuit breaker is open", nextRetryTime) {
        super(message);
        this.nextRetryTime = nextRetryTime;
        this.name = "CircuitOpenError";
    }
}
exports.CircuitOpenError = CircuitOpenError;
// ═══════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER CLASS
// ═══════════════════════════════════════════════════════════════════════════
const DEFAULT_CONFIG = {
    failureThreshold: 5,
    resetTimeout: 30000,
    successThreshold: 2,
    operationTimeout: 10000,
};
class CircuitBreaker extends events_1.EventEmitter {
    config;
    state = "closed";
    failures = 0;
    successes = 0;
    lastFailure = 0;
    nextRetryTime = 0;
    // Statistics
    stats = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        rejectedRequests: 0,
        timeouts: 0,
    };
    constructor(config) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Execute a function with circuit breaker protection
     */
    async execute(fn) {
        this.stats.totalRequests++;
        // Check circuit state
        if (this.state === "open") {
            if (Date.now() >= this.nextRetryTime) {
                this.transitionTo("half_open");
            }
            else {
                this.stats.rejectedRequests++;
                throw new CircuitOpenError(`Circuit breaker is open. Next retry at ${new Date(this.nextRetryTime).toISOString()}`, this.nextRetryTime);
            }
        }
        try {
            // Execute with optional timeout
            const result = await this.executeWithTimeout(fn);
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure(error);
            throw error;
        }
    }
    /**
     * Execute with timeout
     */
    async executeWithTimeout(fn) {
        if (!this.config.operationTimeout) {
            return fn();
        }
        return new Promise((resolve, reject) => {
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
    onSuccess() {
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
    onFailure(error) {
        this.stats.failedRequests++;
        this.failures++;
        this.lastFailure = Date.now();
        this.successes = 0;
        this.emit("failure", error);
        if (this.state === "half_open") {
            // Immediately open on failure in half-open state
            this.transitionTo("open");
        }
        else if (this.failures >= this.config.failureThreshold) {
            this.transitionTo("open");
        }
    }
    /**
     * Transition to a new state
     */
    transitionTo(newState) {
        const oldState = this.state;
        this.state = newState;
        if (newState === "open") {
            this.nextRetryTime = Date.now() + this.config.resetTimeout;
        }
        else if (newState === "closed") {
            this.failures = 0;
            this.successes = 0;
        }
        else if (newState === "half_open") {
            this.successes = 0;
        }
        this.emit("state_change", oldState, newState);
    }
    /**
     * Get current state
     */
    getState() {
        // Check if we should transition from open to half-open
        if (this.state === "open" && Date.now() >= this.nextRetryTime) {
            return "half_open";
        }
        return this.state;
    }
    /**
     * Get circuit breaker statistics
     */
    getStats() {
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
    forceState(state) {
        this.transitionTo(state);
        this.emit("forced_state", state);
    }
    /**
     * Reset the circuit breaker
     */
    reset() {
        this.state = "closed";
        this.failures = 0;
        this.successes = 0;
        this.lastFailure = 0;
        this.nextRetryTime = 0;
        this.emit("reset");
    }
}
exports.CircuitBreaker = CircuitBreaker;
//# sourceMappingURL=CircuitBreaker.js.map