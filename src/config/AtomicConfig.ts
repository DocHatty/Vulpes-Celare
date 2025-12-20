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

import { FSWatcher, watch } from "fs";
import { readFile, stat, writeFile } from "fs/promises";
import { EventEmitter } from "events";
import { vulpesLogger as log } from "../utils/VulpesLogger";
import type { ZodSchema, ZodError } from "zod";

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// ATOMIC CONFIG CLASS
// ============================================================================

/**
 * AtomicConfig - Thread-safe configuration with hot-reload support
 */
export class AtomicConfig<T extends object> extends EventEmitter {
  private config: T;
  private options: Required<Omit<AtomicConfigOptions<T>, "filePath" | "envPrefix">> & {
    filePath?: string;
    envPrefix?: string;
  };
  private watcher: FSWatcher | null = null;
  private subscribers: Set<ConfigSubscriber<T>> = new Set();
  private debounceTimer: NodeJS.Timeout | null = null;
  private stats: AtomicConfigStats;
  private initialized: boolean = false;

  constructor(options: AtomicConfigOptions<T>) {
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
  async initialize(): Promise<void> {
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

    log.info(`AtomicConfig initialized`, {
      component: "AtomicConfig",
      name: this.options.name,
      filePath: this.options.filePath,
      watching: this.stats.watchingFile,
    });
  }

  /**
   * Get current configuration (always returns latest)
   */
  get(): Readonly<T> {
    return this.config;
  }

  /**
   * Update configuration programmatically
   */
  async set(newConfig: Partial<T>): Promise<ValidationResult<T>> {
    const merged = { ...this.config, ...newConfig };
    const validation = this.validate(merged);

    if (!validation.success) {
      log.warn(`Config update failed validation`, {
        component: "AtomicConfig",
        name: this.options.name,
        error: validation.error?.message,
      });
      return validation;
    }

    const oldConfig = this.config;
    this.config = validation.data!;

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
  async reload(): Promise<ValidationResult<T>> {
    if (!this.options.filePath) {
      return {
        success: false,
        error: new Error("No file path configured") as unknown as ZodError,
      };
    }

    return this.loadFromFile("programmatic");
  }

  /**
   * Subscribe to configuration changes
   */
  subscribe(callback: ConfigSubscriber<T>): () => void {
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
  validate(config: unknown): ValidationResult<T> {
    try {
      const data = this.options.schema.parse(config);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error as ZodError,
      };
    }
  }

  /**
   * Get statistics
   */
  getStats(): AtomicConfigStats {
    return { ...this.stats };
  }

  /**
   * Stop file watching and cleanup
   */
  destroy(): void {
    this.stopWatching();
    this.subscribers.clear();
    this.stats.subscriberCount = 0;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    log.info(`AtomicConfig destroyed`, {
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
  private async loadFromFile(
    source: "initial" | "file" | "programmatic"
  ): Promise<ValidationResult<T>> {
    if (!this.options.filePath) {
      return { success: true, data: this.config };
    }

    try {
      // Check if file exists
      await stat(this.options.filePath);

      // Read and parse
      const content = await readFile(this.options.filePath, "utf-8");
      const parsed = JSON.parse(content);

      // Merge with defaults (file may be partial)
      const merged = this.deepMerge(this.options.defaults, parsed);

      // Validate
      const validation = this.validate(merged);

      if (!validation.success) {
        this.stats.failedReloads++;
        this.stats.lastError = validation.error?.message ?? "Validation failed";

        log.error(`Config file validation failed`, {
          component: "AtomicConfig",
          name: this.options.name,
          filePath: this.options.filePath,
          error: this.stats.lastError,
        });

        return validation;
      }

      // Atomic swap
      const oldConfig = this.config;
      this.config = validation.data!;

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

      log.info(`Config reloaded from file`, {
        component: "AtomicConfig",
        name: this.options.name,
        filePath: this.options.filePath,
        reloadCount: this.stats.reloadCount,
      });

      return validation;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        // File doesn't exist - use defaults
        log.debug(`Config file not found, using defaults`, {
          component: "AtomicConfig",
          name: this.options.name,
          filePath: this.options.filePath,
        });
        return { success: true, data: this.config };
      }

      this.stats.failedReloads++;
      this.stats.lastError = (error as Error).message;

      log.error(`Failed to load config file`, {
        component: "AtomicConfig",
        name: this.options.name,
        filePath: this.options.filePath,
        error: this.stats.lastError,
      });

      return {
        success: false,
        error: error as ZodError,
      };
    }
  }

  /**
   * Save current config to file
   */
  private async saveToFile(): Promise<void> {
    if (!this.options.filePath) return;

    try {
      const content = JSON.stringify(this.config, null, 2);
      await writeFile(this.options.filePath, content, "utf-8");

      log.debug(`Config saved to file`, {
        component: "AtomicConfig",
        name: this.options.name,
        filePath: this.options.filePath,
      });
    } catch (error) {
      log.error(`Failed to save config file`, {
        component: "AtomicConfig",
        name: this.options.name,
        filePath: this.options.filePath,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Start watching file for changes
   */
  private startWatching(): void {
    if (!this.options.filePath || this.watcher) return;

    try {
      this.watcher = watch(this.options.filePath, (eventType) => {
        if (eventType === "change") {
          this.handleFileChange();
        }
      });

      this.watcher.on("error", (error) => {
        log.error(`File watcher error`, {
          component: "AtomicConfig",
          name: this.options.name,
          error: (error as Error).message,
        });
      });

      this.stats.watchingFile = true;

      log.debug(`Started watching config file`, {
        component: "AtomicConfig",
        name: this.options.name,
        filePath: this.options.filePath,
      });
    } catch (error) {
      log.warn(`Could not start file watcher`, {
        component: "AtomicConfig",
        name: this.options.name,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Stop watching file
   */
  private stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.stats.watchingFile = false;
    }
  }

  /**
   * Handle file change event with debouncing
   */
  private handleFileChange(): void {
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
  private applyEnvOverrides(): void {
    if (!this.options.envPrefix) return;

    const prefix = this.options.envPrefix;
    const separator = this.options.envPathSeparator;
    let hasOverrides = false;

    for (const [key, value] of Object.entries(process.env)) {
      if (!key.startsWith(prefix) || value === undefined) continue;

      // Convert env var name to config path
      // e.g., VULPES_CONFIDENCE__MINIMUM -> confidence.minimum
      const path = key
        .slice(prefix.length)
        .toLowerCase()
        .split(separator);

      if (path.length === 0) continue;

      // Try to set the value
      try {
        this.setNestedValue(this.config, path, this.parseEnvValue(value));
        hasOverrides = true;

        log.debug(`Applied env override`, {
          component: "AtomicConfig",
          name: this.options.name,
          envVar: key,
          path: path.join("."),
        });
      } catch {
        log.warn(`Failed to apply env override`, {
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
        log.error(`Config invalid after env overrides, reverting`, {
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
  private parseEnvValue(value: string): unknown {
    // Try boolean
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;

    // Try number
    const num = Number(value);
    if (!isNaN(num)) return num;

    // Try JSON
    try {
      return JSON.parse(value);
    } catch {
      // Return as string
      return value;
    }
  }

  /**
   * Set a nested value in an object using a path array
   */
  private setNestedValue(obj: T, path: string[], value: unknown): void {
    let current = obj as Record<string, unknown>;

    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!(key in current) || typeof current[key] !== "object") {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    current[path[path.length - 1]] = value;
  }

  /**
   * Deep merge two objects
   */
  private deepMerge<U extends object>(target: U, source: Partial<U>): U {
    const result = { ...target };

    for (const key of Object.keys(source) as (keyof U)[]) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue !== undefined &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue) &&
        sourceValue !== null &&
        typeof targetValue === "object" &&
        !Array.isArray(targetValue) &&
        targetValue !== null
      ) {
        result[key] = this.deepMerge(
          targetValue as object,
          sourceValue as object
        ) as U[keyof U];
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as U[keyof U];
      }
    }

    return result;
  }

  /**
   * Notify all subscribers of a change
   */
  private notifySubscribers(event: ConfigChangeEvent<T>): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(event);
      } catch (error) {
        log.error(`Subscriber error`, {
          component: "AtomicConfig",
          name: this.options.name,
          error: (error as Error).message,
        });
      }
    }

    this.emit("change", event);
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create an AtomicConfig instance and initialize it
 */
export async function createAtomicConfig<T extends object>(
  options: AtomicConfigOptions<T>
): Promise<AtomicConfig<T>> {
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
const configRegistry = new Map<string, AtomicConfig<object>>();

/**
 * Register a config instance
 */
export function registerConfig<T extends object>(
  name: string,
  config: AtomicConfig<T>
): void {
  configRegistry.set(name, config as unknown as AtomicConfig<object>);
}

/**
 * Get a registered config instance
 */
export function getConfig<T extends object>(name: string): AtomicConfig<T> | undefined {
  return configRegistry.get(name) as AtomicConfig<T> | undefined;
}

/**
 * Get all registered configs
 */
export function getAllConfigs(): Map<string, AtomicConfig<object>> {
  return new Map(configRegistry);
}

/**
 * Clear all registered configs
 */
export function clearConfigs(): void {
  for (const config of configRegistry.values()) {
    config.destroy();
  }
  configRegistry.clear();
}
