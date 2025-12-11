/**
 * Image Service Logger and Error Handling
 *
 * Provides structured logging, error boundaries, and debugging mechanisms
 * for all image processing services.
 *
 * @module core/images/logger
 */
import { EventEmitter } from 'events';
/**
 * Log levels
 */
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    FATAL = 4
}
/**
 * Structured log entry
 */
export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    service: string;
    operation: string;
    message: string;
    duration?: number;
    metadata?: Record<string, unknown>;
    error?: Error;
    stack?: string;
}
/**
 * Performance metrics for operations
 */
export interface OperationMetrics {
    service: string;
    operation: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    success: boolean;
    error?: string;
    metadata?: Record<string, unknown>;
}
/**
 * Service health status
 */
export interface ServiceHealth {
    service: string;
    healthy: boolean;
    lastCheck: Date;
    modelsLoaded: boolean;
    lastError?: string;
    metrics: {
        totalOperations: number;
        successfulOperations: number;
        failedOperations: number;
        avgDurationMs: number;
    };
}
/**
 * ImageServiceLogger - Centralized logging for image services
 */
export declare class ImageServiceLogger extends EventEmitter {
    private static instance;
    private logLevel;
    private logs;
    private maxLogs;
    private metrics;
    private healthStatus;
    private constructor();
    static getInstance(): ImageServiceLogger;
    /**
     * Set minimum log level
     */
    setLogLevel(level: LogLevel): void;
    /**
     * Log a debug message
     */
    debug(service: string, operation: string, message: string, metadata?: Record<string, unknown>): void;
    /**
     * Log an info message
     */
    info(service: string, operation: string, message: string, metadata?: Record<string, unknown>): void;
    /**
     * Log a warning
     */
    warn(service: string, operation: string, message: string, metadata?: Record<string, unknown>): void;
    /**
     * Log an error
     */
    error(service: string, operation: string, message: string, error?: Error, metadata?: Record<string, unknown>): void;
    /**
     * Log a fatal error
     */
    fatal(service: string, operation: string, message: string, error?: Error, metadata?: Record<string, unknown>): void;
    private log;
    /**
     * Start timing an operation
     * Returns a function to call when operation completes
     */
    startOperation(service: string, operation: string, metadata?: Record<string, unknown>): (success?: boolean, error?: string) => void;
    /**
     * Update service health status
     */
    private updateServiceHealth;
    /**
     * Get health status for a service
     */
    getServiceHealth(service: string): ServiceHealth | undefined;
    /**
     * Get all service health statuses
     */
    getAllServiceHealth(): ServiceHealth[];
    /**
     * Get recent logs
     */
    getRecentLogs(count?: number, service?: string, level?: LogLevel): LogEntry[];
    /**
     * Get operation metrics
     */
    getOperationMetrics(service: string, operation: string): {
        count: number;
        avgDuration: number;
        successRate: number;
        lastError?: string;
    } | undefined;
    /**
     * Clear all logs and metrics
     */
    clear(): void;
}
/**
 * Error boundary wrapper for async operations
 */
export declare function withErrorBoundary<T>(service: string, operation: string, fn: () => Promise<T>, fallback?: T): Promise<{
    success: boolean;
    result?: T;
    error?: Error;
}>;
/**
 * Retry wrapper with exponential backoff
 */
export declare function withRetry<T>(service: string, operation: string, fn: () => Promise<T>, options?: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffFactor?: number;
}): Promise<T>;
/**
 * Timeout wrapper
 */
export declare function withTimeout<T>(service: string, operation: string, fn: () => Promise<T>, timeoutMs: number): Promise<T>;
export declare const getLogger: () => ImageServiceLogger;
export default ImageServiceLogger;
//# sourceMappingURL=logger.d.ts.map