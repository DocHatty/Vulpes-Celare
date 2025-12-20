"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AtomicConfig = void 0;
exports.createAtomicConfig = createAtomicConfig;
exports.registerConfig = registerConfig;
exports.getConfig = getConfig;
exports.getAllConfigs = getAllConfigs;
exports.clearConfigs = clearConfigs;
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const events_1 = require("events");
const VulpesLogger_1 = require("../utils/VulpesLogger");
// ============================================================================
// ATOMIC CONFIG CLASS
// ============================================================================
/**
 * AtomicConfig - Thread-safe configuration with hot-reload support
 */
class AtomicConfig extends events_1.EventEmitter {
    config;
    options;
    watcher = null;
    subscribers = new Set();
    debounceTimer = null;
    stats;
    initialized = false;
    constructor(options) {
        super();
        this.options = {
            schema: options.schema,
            defaults: options.defaults,
            filePath: options.filePath,
            watch: options.watch ?? process.env.NODE_ENV !== "test",
            debounceMs: options.debounceMs ?? 500,
            envPrefix: options.envPrefix,
            envPathSeparator: options.envPathSeparator ?? "__",
            name: options.name ?? "config",
        };
        // Start with defaults
        this.config = { ...this.options.defaults };
        this.stats = {
            reloadCount: 0,
            failedReloads: 0,
            subscriberCount: 0,
            lastReloadAt: null,
            lastError: null,
            watchingFile: false,
            configName: this.options.name,
        };
    }
    /**
     * Initialize the config - load from file and start watching
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        // Load from file if specified
        if (this.options.filePath) {
            await this.loadFromFile("initial");
        }
        // Apply environment variable overrides
        if (this.options.envPrefix) {
            this.applyEnvOverrides();
        }
        // Start file watching if enabled and file exists
        if (this.options.watch && this.options.filePath) {
            this.startWatching();
        }
        this.initialized = true;
        VulpesLogger_1.vulpesLogger.info(`AtomicConfig initialized`, {
            component: "AtomicConfig",
            name: this.options.name,
            filePath: this.options.filePath,
            watching: this.stats.watchingFile,
        });
    }
    /**
     * Get current configuration (always returns latest)
     */
    get() {
        return this.config;
    }
    /**
     * Update configuration programmatically
     */
    async set(newConfig) {
        const merged = { ...this.config, ...newConfig };
        const validation = this.validate(merged);
        if (!validation.success) {
            VulpesLogger_1.vulpesLogger.warn(`Config update failed validation`, {
                component: "AtomicConfig",
                name: this.options.name,
                error: validation.error?.message,
            });
            return validation;
        }
        const oldConfig = this.config;
        this.config = validation.data;
        this.notifySubscribers({
            newConfig: this.config,
            oldConfig,
            source: "programmatic",
            timestamp: new Date(),
            configName: this.options.name,
        });
        // Optionally persist to file
        if (this.options.filePath) {
            await this.saveToFile();
        }
        return validation;
    }
    /**
     * Force reload from file
     */
    async reload() {
        if (!this.options.filePath) {
            return {
                success: false,
                error: new Error("No file path configured"),
            };
        }
        return this.loadFromFile("programmatic");
    }
    /**
     * Subscribe to configuration changes
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        this.stats.subscriberCount = this.subscribers.size;
        // Return unsubscribe function
        return () => {
            this.subscribers.delete(callback);
            this.stats.subscriberCount = this.subscribers.size;
        };
    }
    /**
     * Validate a config object against the schema
     */
    validate(config) {
        try {
            const data = this.options.schema.parse(config);
            return { success: true, data };
        }
        catch (error) {
            return {
                success: false,
                error: error,
            };
        }
    }
    /**
     * Get statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Stop file watching and cleanup
     */
    destroy() {
        this.stopWatching();
        this.subscribers.clear();
        this.stats.subscriberCount = 0;
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        VulpesLogger_1.vulpesLogger.info(`AtomicConfig destroyed`, {
            component: "AtomicConfig",
            name: this.options.name,
        });
    }
    // ============================================================================
    // PRIVATE METHODS
    // ============================================================================
    /**
     * Load configuration from file
     */
    async loadFromFile(source) {
        if (!this.options.filePath) {
            return { success: true, data: this.config };
        }
        try {
            // Check if file exists
            await (0, promises_1.stat)(this.options.filePath);
            // Read and parse
            const content = await (0, promises_1.readFile)(this.options.filePath, "utf-8");
            const parsed = JSON.parse(content);
            // Merge with defaults (file may be partial)
            const merged = this.deepMerge(this.options.defaults, parsed);
            // Validate
            const validation = this.validate(merged);
            if (!validation.success) {
                this.stats.failedReloads++;
                this.stats.lastError = validation.error?.message ?? "Validation failed";
                VulpesLogger_1.vulpesLogger.error(`Config file validation failed`, {
                    component: "AtomicConfig",
                    name: this.options.name,
                    filePath: this.options.filePath,
                    error: this.stats.lastError,
                });
                return validation;
            }
            // Atomic swap
            const oldConfig = this.config;
            this.config = validation.data;
            // Update stats
            this.stats.reloadCount++;
            this.stats.lastReloadAt = new Date();
            this.stats.lastError = null;
            // Notify subscribers (skip for initial load unless there are changes)
            if (source !== "initial" || JSON.stringify(oldConfig) !== JSON.stringify(this.config)) {
                this.notifySubscribers({
                    newConfig: this.config,
                    oldConfig,
                    source: source === "initial" ? "initial" : "file",
                    timestamp: new Date(),
                    configName: this.options.name,
                });
            }
            VulpesLogger_1.vulpesLogger.info(`Config reloaded from file`, {
                component: "AtomicConfig",
                name: this.options.name,
                filePath: this.options.filePath,
                reloadCount: this.stats.reloadCount,
            });
            return validation;
        }
        catch (error) {
            if (error.code === "ENOENT") {
                // File doesn't exist - use defaults
                VulpesLogger_1.vulpesLogger.debug(`Config file not found, using defaults`, {
                    component: "AtomicConfig",
                    name: this.options.name,
                    filePath: this.options.filePath,
                });
                return { success: true, data: this.config };
            }
            this.stats.failedReloads++;
            this.stats.lastError = error.message;
            VulpesLogger_1.vulpesLogger.error(`Failed to load config file`, {
                component: "AtomicConfig",
                name: this.options.name,
                filePath: this.options.filePath,
                error: this.stats.lastError,
            });
            return {
                success: false,
                error: error,
            };
        }
    }
    /**
     * Save current config to file
     */
    async saveToFile() {
        if (!this.options.filePath)
            return;
        try {
            const content = JSON.stringify(this.config, null, 2);
            await (0, promises_1.writeFile)(this.options.filePath, content, "utf-8");
            VulpesLogger_1.vulpesLogger.debug(`Config saved to file`, {
                component: "AtomicConfig",
                name: this.options.name,
                filePath: this.options.filePath,
            });
        }
        catch (error) {
            VulpesLogger_1.vulpesLogger.error(`Failed to save config file`, {
                component: "AtomicConfig",
                name: this.options.name,
                filePath: this.options.filePath,
                error: error.message,
            });
        }
    }
    /**
     * Start watching file for changes
     */
    startWatching() {
        if (!this.options.filePath || this.watcher)
            return;
        try {
            this.watcher = (0, fs_1.watch)(this.options.filePath, (eventType) => {
                if (eventType === "change") {
                    this.handleFileChange();
                }
            });
            this.watcher.on("error", (error) => {
                VulpesLogger_1.vulpesLogger.error(`File watcher error`, {
                    component: "AtomicConfig",
                    name: this.options.name,
                    error: error.message,
                });
            });
            this.stats.watchingFile = true;
            VulpesLogger_1.vulpesLogger.debug(`Started watching config file`, {
                component: "AtomicConfig",
                name: this.options.name,
                filePath: this.options.filePath,
            });
        }
        catch (error) {
            VulpesLogger_1.vulpesLogger.warn(`Could not start file watcher`, {
                component: "AtomicConfig",
                name: this.options.name,
                error: error.message,
            });
        }
    }
    /**
     * Stop watching file
     */
    stopWatching() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
            this.stats.watchingFile = false;
        }
    }
    /**
     * Handle file change event with debouncing
     */
    handleFileChange() {
        // Debounce rapid changes
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(async () => {
            this.debounceTimer = null;
            await this.loadFromFile("file");
        }, this.options.debounceMs);
    }
    /**
     * Apply environment variable overrides
     */
    applyEnvOverrides() {
        if (!this.options.envPrefix)
            return;
        const prefix = this.options.envPrefix;
        const separator = this.options.envPathSeparator;
        let hasOverrides = false;
        for (const [key, value] of Object.entries(process.env)) {
            if (!key.startsWith(prefix) || value === undefined)
                continue;
            // Convert env var name to config path
            // e.g., VULPES_CONFIDENCE__MINIMUM -> confidence.minimum
            const path = key
                .slice(prefix.length)
                .toLowerCase()
                .split(separator);
            if (path.length === 0)
                continue;
            // Try to set the value
            try {
                this.setNestedValue(this.config, path, this.parseEnvValue(value));
                hasOverrides = true;
                VulpesLogger_1.vulpesLogger.debug(`Applied env override`, {
                    component: "AtomicConfig",
                    name: this.options.name,
                    envVar: key,
                    path: path.join("."),
                });
            }
            catch {
                VulpesLogger_1.vulpesLogger.warn(`Failed to apply env override`, {
                    component: "AtomicConfig",
                    name: this.options.name,
                    envVar: key,
                });
            }
        }
        if (hasOverrides) {
            // Re-validate after overrides
            const validation = this.validate(this.config);
            if (!validation.success) {
                VulpesLogger_1.vulpesLogger.error(`Config invalid after env overrides, reverting`, {
                    component: "AtomicConfig",
                    name: this.options.name,
                });
                this.config = { ...this.options.defaults };
            }
        }
    }
    /**
     * Parse environment variable value to appropriate type
     */
    parseEnvValue(value) {
        // Try boolean
        if (value.toLowerCase() === "true")
            return true;
        if (value.toLowerCase() === "false")
            return false;
        // Try number
        const num = Number(value);
        if (!isNaN(num))
            return num;
        // Try JSON
        try {
            return JSON.parse(value);
        }
        catch {
            // Return as string
            return value;
        }
    }
    /**
     * Set a nested value in an object using a path array
     */
    setNestedValue(obj, path, value) {
        let current = obj;
        for (let i = 0; i < path.length - 1; i++) {
            const key = path[i];
            if (!(key in current) || typeof current[key] !== "object") {
                current[key] = {};
            }
            current = current[key];
        }
        current[path[path.length - 1]] = value;
    }
    /**
     * Deep merge two objects
     */
    deepMerge(target, source) {
        const result = { ...target };
        for (const key of Object.keys(source)) {
            const sourceValue = source[key];
            const targetValue = result[key];
            if (sourceValue !== undefined &&
                typeof sourceValue === "object" &&
                !Array.isArray(sourceValue) &&
                sourceValue !== null &&
                typeof targetValue === "object" &&
                !Array.isArray(targetValue) &&
                targetValue !== null) {
                result[key] = this.deepMerge(targetValue, sourceValue);
            }
            else if (sourceValue !== undefined) {
                result[key] = sourceValue;
            }
        }
        return result;
    }
    /**
     * Notify all subscribers of a change
     */
    notifySubscribers(event) {
        for (const subscriber of this.subscribers) {
            try {
                subscriber(event);
            }
            catch (error) {
                VulpesLogger_1.vulpesLogger.error(`Subscriber error`, {
                    component: "AtomicConfig",
                    name: this.options.name,
                    error: error.message,
                });
            }
        }
        this.emit("change", event);
    }
}
exports.AtomicConfig = AtomicConfig;
// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================
/**
 * Create an AtomicConfig instance and initialize it
 */
async function createAtomicConfig(options) {
    const config = new AtomicConfig(options);
    await config.initialize();
    return config;
}
// ============================================================================
// CONFIG REGISTRY
// ============================================================================
/**
 * Global registry of AtomicConfig instances
 */
const configRegistry = new Map();
/**
 * Register a config instance
 */
function registerConfig(name, config) {
    configRegistry.set(name, config);
}
/**
 * Get a registered config instance
 */
function getConfig(name) {
    return configRegistry.get(name);
}
/**
 * Get all registered configs
 */
function getAllConfigs() {
    return new Map(configRegistry);
}
/**
 * Clear all registered configs
 */
function clearConfigs() {
    for (const config of configRegistry.values()) {
        config.destroy();
    }
    configRegistry.clear();
}
//# sourceMappingURL=AtomicConfig.js.map