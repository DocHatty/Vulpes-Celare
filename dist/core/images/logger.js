"use strict";
/**
 * Image Service Logger and Error Handling
 *
 * Provides structured logging, error boundaries, and debugging mechanisms
 * for all image processing services.
 *
 * @module core/images/logger
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogger = exports.ImageServiceLogger = exports.LogLevel = void 0;
exports.withErrorBoundary = withErrorBoundary;
exports.withRetry = withRetry;
exports.withTimeout = withTimeout;
const events_1 = require("events");
/**
 * Log levels
 */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["FATAL"] = 4] = "FATAL";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * ImageServiceLogger - Centralized logging for image services
 */
class ImageServiceLogger extends events_1.EventEmitter {
    static instance;
    logLevel = LogLevel.INFO;
    logs = [];
    maxLogs = 1000;
    metrics = new Map();
    healthStatus = new Map();
    constructor() {
        super();
    }
    static getInstance() {
        if (!ImageServiceLogger.instance) {
            ImageServiceLogger.instance = new ImageServiceLogger();
        }
        return ImageServiceLogger.instance;
    }
    /**
     * Set minimum log level
     */
    setLogLevel(level) {
        this.logLevel = level;
    }
    /**
     * Log a debug message
     */
    debug(service, operation, message, metadata) {
        this.log(LogLevel.DEBUG, service, operation, message, metadata);
    }
    /**
     * Log an info message
     */
    info(service, operation, message, metadata) {
        this.log(LogLevel.INFO, service, operation, message, metadata);
    }
    /**
     * Log a warning
     */
    warn(service, operation, message, metadata) {
        this.log(LogLevel.WARN, service, operation, message, metadata);
    }
    /**
     * Log an error
     */
    error(service, operation, message, error, metadata) {
        this.log(LogLevel.ERROR, service, operation, message, metadata, error);
    }
    /**
     * Log a fatal error
     */
    fatal(service, operation, message, error, metadata) {
        this.log(LogLevel.FATAL, service, operation, message, metadata, error);
    }
    log(level, service, operation, message, metadata, error) {
        if (level < this.logLevel)
            return;
        const entry = {
            timestamp: new Date(),
            level,
            service,
            operation,
            message,
            metadata,
            error,
            stack: error?.stack,
        };
        this.logs.push(entry);
        // Trim old logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
        // Emit event for external handlers
        this.emit('log', entry);
        // Console output with formatting
        const levelName = LogLevel[level];
        const prefix = `[${entry.timestamp.toISOString()}] [${levelName}] [${service}:${operation}]`;
        const consoleMsg = `${prefix} ${message}`;
        switch (level) {
            case LogLevel.DEBUG:
                console.debug(consoleMsg, metadata || '');
                break;
            case LogLevel.INFO:
                console.info(consoleMsg, metadata || '');
                break;
            case LogLevel.WARN:
                console.warn(consoleMsg, metadata || '');
                break;
            case LogLevel.ERROR:
            case LogLevel.FATAL:
                console.error(consoleMsg, metadata || '', error || '');
                break;
        }
    }
    /**
     * Start timing an operation
     * Returns a function to call when operation completes
     */
    startOperation(service, operation, metadata) {
        const metrics = {
            service,
            operation,
            startTime: Date.now(),
            success: false,
            metadata,
        };
        const key = `${service}:${operation}`;
        if (!this.metrics.has(key)) {
            this.metrics.set(key, []);
        }
        return (success = true, error) => {
            metrics.endTime = Date.now();
            metrics.duration = metrics.endTime - metrics.startTime;
            metrics.success = success;
            metrics.error = error;
            this.metrics.get(key).push(metrics);
            // Keep only last 100 operations per type
            const ops = this.metrics.get(key);
            if (ops.length > 100) {
                this.metrics.set(key, ops.slice(-100));
            }
            // Update health status
            this.updateServiceHealth(service, success, error);
            // Log completion
            if (success) {
                this.debug(service, operation, `Completed in ${metrics.duration}ms`, metadata);
            }
            else {
                this.error(service, operation, `Failed after ${metrics.duration}ms: ${error}`, undefined, metadata);
            }
        };
    }
    /**
     * Update service health status
     */
    updateServiceHealth(service, success, error) {
        const existing = this.healthStatus.get(service) || {
            service,
            healthy: true,
            lastCheck: new Date(),
            modelsLoaded: false,
            metrics: {
                totalOperations: 0,
                successfulOperations: 0,
                failedOperations: 0,
                avgDurationMs: 0,
            },
        };
        existing.lastCheck = new Date();
        existing.metrics.totalOperations++;
        if (success) {
            existing.metrics.successfulOperations++;
        }
        else {
            existing.metrics.failedOperations++;
            existing.lastError = error;
        }
        // Calculate success rate
        const successRate = existing.metrics.successfulOperations / existing.metrics.totalOperations;
        existing.healthy = successRate >= 0.95 && existing.metrics.failedOperations < 5;
        this.healthStatus.set(service, existing);
    }
    /**
     * Get health status for a service
     */
    getServiceHealth(service) {
        return this.healthStatus.get(service);
    }
    /**
     * Get all service health statuses
     */
    getAllServiceHealth() {
        return Array.from(this.healthStatus.values());
    }
    /**
     * Get recent logs
     */
    getRecentLogs(count = 50, service, level) {
        let filtered = this.logs;
        if (service) {
            filtered = filtered.filter(l => l.service === service);
        }
        if (level !== undefined) {
            filtered = filtered.filter(l => l.level >= level);
        }
        return filtered.slice(-count);
    }
    /**
     * Get operation metrics
     */
    getOperationMetrics(service, operation) {
        const key = `${service}:${operation}`;
        const ops = this.metrics.get(key);
        if (!ops || ops.length === 0)
            return undefined;
        const successful = ops.filter(o => o.success);
        const failed = ops.filter(o => !o.success);
        return {
            count: ops.length,
            avgDuration: ops.reduce((sum, o) => sum + (o.duration || 0), 0) / ops.length,
            successRate: successful.length / ops.length,
            lastError: failed.length > 0 ? failed[failed.length - 1].error : undefined,
        };
    }
    /**
     * Clear all logs and metrics
     */
    clear() {
        this.logs = [];
        this.metrics.clear();
        this.healthStatus.clear();
    }
}
exports.ImageServiceLogger = ImageServiceLogger;
/**
 * Error boundary wrapper for async operations
 */
async function withErrorBoundary(service, operation, fn, fallback) {
    const logger = ImageServiceLogger.getInstance();
    const complete = logger.startOperation(service, operation);
    try {
        const result = await fn();
        complete(true);
        return { success: true, result };
    }
    catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        complete(false, err.message);
        logger.error(service, operation, `Operation failed: ${err.message}`, err);
        if (fallback !== undefined) {
            return { success: false, result: fallback, error: err };
        }
        return { success: false, error: err };
    }
}
/**
 * Retry wrapper with exponential backoff
 */
async function withRetry(service, operation, fn, options = {}) {
    const logger = ImageServiceLogger.getInstance();
    const { maxRetries = 3, initialDelayMs = 100, maxDelayMs = 5000, backoffFactor = 2, } = options;
    let delay = initialDelayMs;
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt === maxRetries) {
                logger.error(service, operation, `All ${maxRetries} retries failed`, lastError);
                throw lastError;
            }
            logger.warn(service, operation, `Attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms`, {
                error: lastError.message,
            });
            await new Promise(resolve => setTimeout(resolve, delay));
            delay = Math.min(delay * backoffFactor, maxDelayMs);
        }
    }
    throw lastError;
}
/**
 * Timeout wrapper
 */
async function withTimeout(service, operation, fn, timeoutMs) {
    const logger = ImageServiceLogger.getInstance();
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            const timeoutError = new Error(`Operation timed out after ${timeoutMs}ms`);
            logger.error(service, operation, timeoutError.message, timeoutError);
            reject(timeoutError);
        }, timeoutMs);
        fn()
            .then(result => {
            clearTimeout(timer);
            resolve(result);
        })
            .catch(error => {
            clearTimeout(timer);
            reject(error);
        });
    });
}
// Export singleton instance getter
const getLogger = () => ImageServiceLogger.getInstance();
exports.getLogger = getLogger;
exports.default = ImageServiceLogger;
//# sourceMappingURL=logger.js.map