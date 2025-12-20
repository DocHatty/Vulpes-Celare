/**
 * HotReloadManager - Centralized Hot-Reload Configuration Management
 *
 * Manages all AtomicConfig instances and provides a unified interface for:
 * - Initializing all configs from files/environment
 * - Subscribing to changes across all configs
 * - Graceful reload of all configurations
 * - Integration with existing Vulpes systems
 *
 * USAGE:
 * ```typescript
 * // Initialize at startup
 * await HotReloadManager.initialize({
 *   configDir: '/etc/vulpes',
 *   watchFiles: true,
 * });
 *
 * // Get current thresholds (always latest)
 * const thresholds = HotReloadManager.getThresholds();
 *
 * // Subscribe to any config change
 * HotReloadManager.onAnyChange((event) => {
 *   console.log(`Config ${event.configName} changed`);
 * });
 * ```
 *
 * @module config/HotReloadManager
 */

import { join } from "path";
import { AtomicConfig, createAtomicConfig, ConfigChangeEvent } from "./AtomicConfig";
import {
  ThresholdsConfigSchema,
  FeatureTogglesConfigSchema,
  CalibrationConfigSchema,
  FilterWeightsConfigSchema,
  PostFilterConfigSchema,
  VulpesConfigSchema,
  DEFAULT_THRESHOLDS,
  DEFAULT_FEATURES,
  DEFAULT_CALIBRATION,
  DEFAULT_WEIGHTS,
  DEFAULT_POSTFILTER,
  DEFAULT_CONFIG,
  type ThresholdsConfig,
  type FeatureTogglesConfig,
  type CalibrationConfig,
  type FilterWeightsConfig,
  type PostFilterConfig,
  type VulpesConfig,
} from "./schemas";
import { vulpesLogger as log } from "../utils/VulpesLogger";
import { EventEmitter } from "events";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Hot-reload manager options
 */
export interface HotReloadManagerOptions {
  /** Base directory for config files */
  configDir?: string;
  /** Whether to watch files for changes */
  watchFiles?: boolean;
  /** Debounce time for file changes (ms) */
  debounceMs?: number;
  /** Environment variable prefix for overrides */
  envPrefix?: string;
  /** Use unified config file vs separate files */
  unifiedConfig?: boolean;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<HotReloadManagerOptions> = {
  configDir: process.env.VULPES_CONFIG_DIR || "./config",
  watchFiles: process.env.NODE_ENV !== "test",
  debounceMs: 500,
  envPrefix: "VULPES_",
  unifiedConfig: false,
};

// ============================================================================
// HOT RELOAD MANAGER
// ============================================================================

/**
 * HotReloadManager - Singleton for managing all hot-reloadable configs
 */
class HotReloadManagerImpl extends EventEmitter {
  private options: Required<HotReloadManagerOptions> = DEFAULT_OPTIONS;
  private initialized: boolean = false;

  // Config instances
  private thresholdsConfig: AtomicConfig<ThresholdsConfig> | null = null;
  private featuresConfig: AtomicConfig<FeatureTogglesConfig> | null = null;
  private calibrationConfig: AtomicConfig<CalibrationConfig> | null = null;
  private weightsConfig: AtomicConfig<FilterWeightsConfig> | null = null;
  private postFilterConfig: AtomicConfig<PostFilterConfig> | null = null;
  private unifiedConfig: AtomicConfig<VulpesConfig> | null = null;

  // Cached values for fast access
  private cachedThresholds: ThresholdsConfig = DEFAULT_THRESHOLDS;
  private cachedFeatures: FeatureTogglesConfig = DEFAULT_FEATURES;
  private cachedCalibration: CalibrationConfig = DEFAULT_CALIBRATION;
  private cachedWeights: FilterWeightsConfig = DEFAULT_WEIGHTS;
  private cachedPostFilter: PostFilterConfig = DEFAULT_POSTFILTER;

  /**
   * Initialize all configurations
   */
  async initialize(options: HotReloadManagerOptions = {}): Promise<void> {
    if (this.initialized) {
      log.warn("HotReloadManager already initialized", {
        component: "HotReloadManager",
      });
      return;
    }

    this.options = { ...DEFAULT_OPTIONS, ...options };

    log.info("Initializing HotReloadManager", {
      component: "HotReloadManager",
      configDir: this.options.configDir,
      watchFiles: this.options.watchFiles,
      unifiedConfig: this.options.unifiedConfig,
    });

    if (this.options.unifiedConfig) {
      await this.initializeUnifiedConfig();
    } else {
      await this.initializeSeparateConfigs();
    }

    this.initialized = true;

    log.info("HotReloadManager initialized successfully", {
      component: "HotReloadManager",
    });
  }

  /**
   * Initialize with a single unified config file
   */
  private async initializeUnifiedConfig(): Promise<void> {
    const filePath = join(this.options.configDir, "vulpes.json");

    this.unifiedConfig = await createAtomicConfig({
      filePath,
      schema: VulpesConfigSchema,
      defaults: DEFAULT_CONFIG,
      watch: this.options.watchFiles,
      debounceMs: this.options.debounceMs,
      envPrefix: this.options.envPrefix,
      name: "vulpes",
    });

    // Update cached values (use defaults for optional fields)
    const config = this.unifiedConfig.get();
    this.cachedThresholds = config.thresholds ?? DEFAULT_THRESHOLDS;
    this.cachedFeatures = config.features ?? DEFAULT_FEATURES;
    this.cachedCalibration = config.calibration ?? DEFAULT_CALIBRATION;
    this.cachedWeights = config.weights ?? DEFAULT_WEIGHTS;
    this.cachedPostFilter = config.postFilter ?? DEFAULT_POSTFILTER;

    // Subscribe to changes
    this.unifiedConfig.subscribe((event) => {
      const newConfig = event.newConfig;
      this.cachedThresholds = newConfig.thresholds ?? DEFAULT_THRESHOLDS;
      this.cachedFeatures = newConfig.features ?? DEFAULT_FEATURES;
      this.cachedCalibration = newConfig.calibration ?? DEFAULT_CALIBRATION;
      this.cachedWeights = newConfig.weights ?? DEFAULT_WEIGHTS;
      this.cachedPostFilter = newConfig.postFilter ?? DEFAULT_POSTFILTER;

      this.emit("change", event);
      this.emit("thresholds:change", {
        ...event,
        newConfig: newConfig.thresholds,
        oldConfig: event.oldConfig.thresholds,
      });
      this.emit("features:change", {
        ...event,
        newConfig: newConfig.features,
        oldConfig: event.oldConfig.features,
      });
    });
  }

  /**
   * Initialize with separate config files
   */
  private async initializeSeparateConfigs(): Promise<void> {
    // Thresholds config
    this.thresholdsConfig = await createAtomicConfig({
      filePath: join(this.options.configDir, "thresholds.json"),
      schema: ThresholdsConfigSchema,
      defaults: DEFAULT_THRESHOLDS,
      watch: this.options.watchFiles,
      debounceMs: this.options.debounceMs,
      envPrefix: `${this.options.envPrefix}THRESHOLD_`,
      name: "thresholds",
    });

    this.cachedThresholds = this.thresholdsConfig.get();
    this.thresholdsConfig.subscribe((event) => {
      this.cachedThresholds = event.newConfig;
      this.emit("thresholds:change", event);
      this.emit("change", event);
    });

    // Features config
    this.featuresConfig = await createAtomicConfig({
      filePath: join(this.options.configDir, "features.json"),
      schema: FeatureTogglesConfigSchema,
      defaults: DEFAULT_FEATURES,
      watch: this.options.watchFiles,
      debounceMs: this.options.debounceMs,
      envPrefix: `${this.options.envPrefix}FEATURE_`,
      name: "features",
    });

    this.cachedFeatures = this.featuresConfig.get();
    this.featuresConfig.subscribe((event) => {
      this.cachedFeatures = event.newConfig;
      this.emit("features:change", event);
      this.emit("change", event);
    });

    // Calibration config
    this.calibrationConfig = await createAtomicConfig({
      filePath: join(this.options.configDir, "calibration.json"),
      schema: CalibrationConfigSchema,
      defaults: DEFAULT_CALIBRATION,
      watch: this.options.watchFiles,
      debounceMs: this.options.debounceMs,
      envPrefix: `${this.options.envPrefix}CALIBRATION_`,
      name: "calibration",
    });

    this.cachedCalibration = this.calibrationConfig.get();
    this.calibrationConfig.subscribe((event) => {
      this.cachedCalibration = event.newConfig;
      this.emit("calibration:change", event);
      this.emit("change", event);
    });

    // Filter weights config
    this.weightsConfig = await createAtomicConfig({
      filePath: join(this.options.configDir, "weights.json"),
      schema: FilterWeightsConfigSchema,
      defaults: DEFAULT_WEIGHTS,
      watch: this.options.watchFiles,
      debounceMs: this.options.debounceMs,
      envPrefix: `${this.options.envPrefix}WEIGHT_`,
      name: "weights",
    });

    this.cachedWeights = this.weightsConfig.get();
    this.weightsConfig.subscribe((event) => {
      this.cachedWeights = event.newConfig;
      this.emit("weights:change", event);
      this.emit("change", event);
    });

    // Post-filter config
    this.postFilterConfig = await createAtomicConfig({
      filePath: join(this.options.configDir, "postfilter.json"),
      schema: PostFilterConfigSchema,
      defaults: DEFAULT_POSTFILTER,
      watch: this.options.watchFiles,
      debounceMs: this.options.debounceMs,
      envPrefix: `${this.options.envPrefix}POSTFILTER_`,
      name: "postfilter",
    });

    this.cachedPostFilter = this.postFilterConfig.get();
    this.postFilterConfig.subscribe((event) => {
      this.cachedPostFilter = event.newConfig;
      this.emit("postfilter:change", event);
      this.emit("change", event);
    });
  }

  // ============================================================================
  // GETTERS (Fast, no async)
  // ============================================================================

  /**
   * Get current thresholds (always latest)
   */
  getThresholds(): Readonly<ThresholdsConfig> {
    return this.cachedThresholds;
  }

  /**
   * Get current feature toggles
   */
  getFeatures(): Readonly<FeatureTogglesConfig> {
    return this.cachedFeatures;
  }

  /**
   * Get current calibration
   */
  getCalibration(): Readonly<CalibrationConfig> {
    return this.cachedCalibration;
  }

  /**
   * Get current filter weights
   */
  getWeights(): Readonly<FilterWeightsConfig> {
    return this.cachedWeights;
  }

  /**
   * Get current post-filter config
   */
  getPostFilter(): Readonly<PostFilterConfig> {
    return this.cachedPostFilter;
  }

  // ============================================================================
  // CONVENIENCE ACCESSORS
  // ============================================================================

  /**
   * Get a specific confidence threshold
   */
  getConfidenceThreshold(
    level: "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW" | "MINIMUM" | "DROP"
  ): number {
    return this.cachedThresholds.confidence[level];
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: keyof FeatureTogglesConfig): boolean {
    const value = this.cachedFeatures[feature];
    return typeof value === "boolean" ? value : false;
  }

  /**
   * Get calibration for a specific filter
   */
  getFilterCalibration(filterType: string): { offset: number; scale: number } {
    const entry = this.cachedCalibration.filters[filterType];
    if (entry) {
      return { offset: entry.offset, scale: entry.scale };
    }
    return {
      offset: this.cachedCalibration.globalOffset,
      scale: this.cachedCalibration.globalScale,
    };
  }

  // ============================================================================
  // SUBSCRIBERS
  // ============================================================================

  /**
   * Subscribe to any config change
   */
  onAnyChange(
    callback: (event: ConfigChangeEvent<unknown>) => void
  ): () => void {
    this.on("change", callback);
    return () => this.off("change", callback);
  }

  /**
   * Subscribe to threshold changes
   */
  onThresholdsChange(
    callback: (event: ConfigChangeEvent<ThresholdsConfig>) => void
  ): () => void {
    this.on("thresholds:change", callback);
    return () => this.off("thresholds:change", callback);
  }

  /**
   * Subscribe to feature changes
   */
  onFeaturesChange(
    callback: (event: ConfigChangeEvent<FeatureTogglesConfig>) => void
  ): () => void {
    this.on("features:change", callback);
    return () => this.off("features:change", callback);
  }

  /**
   * Subscribe to calibration changes
   */
  onCalibrationChange(
    callback: (event: ConfigChangeEvent<CalibrationConfig>) => void
  ): () => void {
    this.on("calibration:change", callback);
    return () => this.off("calibration:change", callback);
  }

  // ============================================================================
  // MANAGEMENT
  // ============================================================================

  /**
   * Force reload all configs
   */
  async reloadAll(): Promise<void> {
    log.info("Reloading all configurations", {
      component: "HotReloadManager",
    });

    if (this.unifiedConfig) {
      await this.unifiedConfig.reload();
    } else {
      await Promise.all([
        this.thresholdsConfig?.reload(),
        this.featuresConfig?.reload(),
        this.calibrationConfig?.reload(),
        this.weightsConfig?.reload(),
        this.postFilterConfig?.reload(),
      ]);
    }
  }

  /**
   * Update thresholds programmatically
   */
  async updateThresholds(update: Partial<ThresholdsConfig>): Promise<boolean> {
    if (this.unifiedConfig) {
      const current = this.unifiedConfig.get();
      const result = await this.unifiedConfig.set({
        ...current,
        thresholds: { ...current.thresholds, ...update },
      });
      return result.success;
    } else if (this.thresholdsConfig) {
      const result = await this.thresholdsConfig.set(update);
      return result.success;
    }
    return false;
  }

  /**
   * Update features programmatically
   */
  async updateFeatures(update: Partial<FeatureTogglesConfig>): Promise<boolean> {
    if (this.unifiedConfig) {
      const current = this.unifiedConfig.get();
      const currentFeatures = current.features ?? DEFAULT_FEATURES;
      const result = await this.unifiedConfig.set({
        ...current,
        features: { ...currentFeatures, ...update },
      });
      return result.success;
    } else if (this.featuresConfig) {
      const result = await this.featuresConfig.set(update);
      return result.success;
    }
    return false;
  }

  /**
   * Update calibration programmatically
   */
  async updateCalibration(update: Partial<CalibrationConfig>): Promise<boolean> {
    if (this.unifiedConfig) {
      const current = this.unifiedConfig.get();
      const currentCalibration = current.calibration ?? DEFAULT_CALIBRATION;
      const result = await this.unifiedConfig.set({
        ...current,
        calibration: { ...currentCalibration, ...update },
      });
      return result.success;
    } else if (this.calibrationConfig) {
      const result = await this.calibrationConfig.set(update);
      return result.success;
    }
    return false;
  }

  /**
   * Get statistics for all configs
   */
  getStats(): Record<string, unknown> {
    const stats: Record<string, unknown> = {
      initialized: this.initialized,
      unifiedMode: this.options.unifiedConfig,
    };

    if (this.unifiedConfig) {
      stats.unified = this.unifiedConfig.getStats();
    } else {
      stats.thresholds = this.thresholdsConfig?.getStats();
      stats.features = this.featuresConfig?.getStats();
      stats.calibration = this.calibrationConfig?.getStats();
      stats.weights = this.weightsConfig?.getStats();
      stats.postFilter = this.postFilterConfig?.getStats();
    }

    return stats;
  }

  /**
   * Check if manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Shutdown and cleanup
   */
  destroy(): void {
    this.unifiedConfig?.destroy();
    this.thresholdsConfig?.destroy();
    this.featuresConfig?.destroy();
    this.calibrationConfig?.destroy();
    this.weightsConfig?.destroy();
    this.postFilterConfig?.destroy();

    this.unifiedConfig = null;
    this.thresholdsConfig = null;
    this.featuresConfig = null;
    this.calibrationConfig = null;
    this.weightsConfig = null;
    this.postFilterConfig = null;

    this.initialized = false;
    this.removeAllListeners();

    log.info("HotReloadManager destroyed", {
      component: "HotReloadManager",
    });
  }

  /**
   * Reset to defaults (for testing)
   */
  reset(): void {
    this.destroy();
    this.cachedThresholds = DEFAULT_THRESHOLDS;
    this.cachedFeatures = DEFAULT_FEATURES;
    this.cachedCalibration = DEFAULT_CALIBRATION;
    this.cachedWeights = DEFAULT_WEIGHTS;
    this.cachedPostFilter = DEFAULT_POSTFILTER;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Global HotReloadManager instance
 */
export const HotReloadManager = new HotReloadManagerImpl();

/**
 * Export the class for testing
 */
export { HotReloadManagerImpl };

/**
 * Re-export defaults for convenience
 */
export {
  DEFAULT_THRESHOLDS,
  DEFAULT_FEATURES,
  DEFAULT_CALIBRATION,
  DEFAULT_WEIGHTS,
  DEFAULT_POSTFILTER,
};
