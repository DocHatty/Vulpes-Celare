/**
 * AtomicConfig - Hot-Reload Configuration with File Watching
 *
 * Enables zero-downtime configuration updates for production deployments.
 * Based on patterns from:
 * - Bifrost's hot-reload configuration
 * - Kubernetes ConfigMap/Secret watching
 * - Node.js fs.watch with debouncing
 *
 * FEATURES:
 * - Atomic swap of configuration objects (no partial updates)
 * - File watching with debounced reloads
 * - Zod schema validation before applying changes
 * - Subscriber notification on changes
 * - Rollback on validation failure
 * - Environment variable override support
 *
 * USAGE:
 * ```typescript
 * const config = new AtomicConfig({
 *   filePath: '/etc/vulpes/thresholds.json',
 *   schema: ThresholdsSchema,
 *   defaults: defaultThresholds,
 * });
 *
 * await config.initialize();
 *
 * // Get current config (always returns latest)
 * const thresholds = config.get();
 *
 * // Subscribe to changes
 * config.subscribe((newConfig, oldConfig) => {
 *   console.log('Thresholds updated!');
 * });
 * ```
 *
 * @module config/AtomicConfig
 */
import { EventEmitter } from "events";
import type { ZodSchema, ZodError } from "zod";
/**
 * Configuration for AtomicConfig
 */
export interface AtomicConfigOptions<T> {
    /** Path to configuration file (JSON) */
    filePath?: string;
    /** Zod schema for validation */
    schema: ZodSchema<T>;
    /** Default values when file doesn't exist */
    defaults: T;
    /** Enable file watching (default: true in non-test environments) */
    watch?: boolean;
    /** Debounce time for file changes in ms (default: 500) */
    debounceMs?: number;
    /** Environment variable prefix for overrides (e.g., "VULPES_") */
    envPrefix?: string;
    /** Nested path separator for env vars (default: "__") */
    envPathSeparator?: string;
    /** Name for logging/debugging */
    name?: string;
}
/**
 * Change event passed to subscribers
 */
export interface ConfigChangeEvent<T> {
    /** New configuration */
    newConfig: T;
    /** Previous configuration */
    oldConfig: T;
    /** Source of the change */
    source: "file" | "programmatic" | "env" | "initial";
    /** Timestamp of the change */
    timestamp: Date;
    /** Config name */
    configName: string;
}
/**
 * Subscriber callback type
 */
export type ConfigSubscriber<T> = (event: ConfigChangeEvent<T>) => void;
/**
 * Validation result
 */
export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    error?: ZodError;
}
/**
 * Config statistics
 */
export interface AtomicConfigStats {
    /** Number of times config was reloaded */
    reloadCount: number;
    /** Number of failed reload attempts */
    failedReloads: number;
    /** Number of subscribers */
    subscriberCount: number;
    /** Last successful reload timestamp */
    lastReloadAt: Date | null;
    /** Last reload error */
    lastError: string | null;
    /** Whether file watching is active */
    watchingFile: boolean;
    /** Config name */
    configName: string;
}
/**
 * AtomicConfig - Thread-safe configuration with hot-reload support
 */
export declare class AtomicConfig<T extends object> extends EventEmitter {
    private config;
    private options;
    private watcher;
    private subscribers;
    private debounceTimer;
    private stats;
    private initialized;
    constructor(options: AtomicConfigOptions<T>);
    /**
     * Initialize the config - load from file and start watching
     */
    initialize(): Promise<void>;
    /**
     * Get current configuration (always returns latest)
     */
    get(): Readonly<T>;
    /**
     * Update configuration programmatically
     */
    set(newConfig: Partial<T>): Promise<ValidationResult<T>>;
    /**
     * Force reload from file
     */
    reload(): Promise<ValidationResult<T>>;
    /**
     * Subscribe to configuration changes
     */
    subscribe(callback: ConfigSubscriber<T>): () => void;
    /**
     * Validate a config object against the schema
     */
    validate(config: unknown): ValidationResult<T>;
    /**
     * Get statistics
     */
    getStats(): AtomicConfigStats;
    /**
     * Stop file watching and cleanup
     */
    destroy(): void;
    /**
     * Load configuration from file
     */
    private loadFromFile;
    /**
     * Save current config to file
     */
    private saveToFile;
    /**
     * Start watching file for changes
     */
    private startWatching;
    /**
     * Stop watching file
     */
    private stopWatching;
    /**
     * Handle file change event with debouncing
     */
    private handleFileChange;
    /**
     * Apply environment variable overrides
     */
    private applyEnvOverrides;
    /**
     * Parse environment variable value to appropriate type
     */
    private parseEnvValue;
    /**
     * Set a nested value in an object using a path array
     */
    private setNestedValue;
    /**
     * Deep merge two objects
     */
    private deepMerge;
    /**
     * Notify all subscribers of a change
     */
    private notifySubscribers;
}
/**
 * Create an AtomicConfig instance and initialize it
 */
export declare function createAtomicConfig<T extends object>(options: AtomicConfigOptions<T>): Promise<AtomicConfig<T>>;
/**
 * Register a config instance
 */
export declare function registerConfig<T extends object>(name: string, config: AtomicConfig<T>): void;
/**
 * Get a registered config instance
 */
export declare function getConfig<T extends object>(name: string): AtomicConfig<T> | undefined;
/**
 * Get all registered configs
 */
export declare function getAllConfigs(): Map<string, AtomicConfig<object>>;
/**
 * Clear all registered configs
 */
export declare function clearConfigs(): void;
//# sourceMappingURL=AtomicConfig.d.ts.map