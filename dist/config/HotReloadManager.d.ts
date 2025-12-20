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
import { ConfigChangeEvent } from "./AtomicConfig";
import { DEFAULT_THRESHOLDS, DEFAULT_FEATURES, DEFAULT_CALIBRATION, DEFAULT_WEIGHTS, DEFAULT_POSTFILTER, type ThresholdsConfig, type FeatureTogglesConfig, type CalibrationConfig, type FilterWeightsConfig, type PostFilterConfig } from "./schemas";
import { EventEmitter } from "events";
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
 * HotReloadManager - Singleton for managing all hot-reloadable configs
 */
declare class HotReloadManagerImpl extends EventEmitter {
    private options;
    private initialized;
    private thresholdsConfig;
    private featuresConfig;
    private calibrationConfig;
    private weightsConfig;
    private postFilterConfig;
    private unifiedConfig;
    private cachedThresholds;
    private cachedFeatures;
    private cachedCalibration;
    private cachedWeights;
    private cachedPostFilter;
    /**
     * Initialize all configurations
     */
    initialize(options?: HotReloadManagerOptions): Promise<void>;
    /**
     * Initialize with a single unified config file
     */
    private initializeUnifiedConfig;
    /**
     * Initialize with separate config files
     */
    private initializeSeparateConfigs;
    /**
     * Get current thresholds (always latest)
     */
    getThresholds(): Readonly<ThresholdsConfig>;
    /**
     * Get current feature toggles
     */
    getFeatures(): Readonly<FeatureTogglesConfig>;
    /**
     * Get current calibration
     */
    getCalibration(): Readonly<CalibrationConfig>;
    /**
     * Get current filter weights
     */
    getWeights(): Readonly<FilterWeightsConfig>;
    /**
     * Get current post-filter config
     */
    getPostFilter(): Readonly<PostFilterConfig>;
    /**
     * Get a specific confidence threshold
     */
    getConfidenceThreshold(level: "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW" | "MINIMUM" | "DROP"): number;
    /**
     * Check if a feature is enabled
     */
    isFeatureEnabled(feature: keyof FeatureTogglesConfig): boolean;
    /**
     * Get calibration for a specific filter
     */
    getFilterCalibration(filterType: string): {
        offset: number;
        scale: number;
    };
    /**
     * Subscribe to any config change
     */
    onAnyChange(callback: (event: ConfigChangeEvent<unknown>) => void): () => void;
    /**
     * Subscribe to threshold changes
     */
    onThresholdsChange(callback: (event: ConfigChangeEvent<ThresholdsConfig>) => void): () => void;
    /**
     * Subscribe to feature changes
     */
    onFeaturesChange(callback: (event: ConfigChangeEvent<FeatureTogglesConfig>) => void): () => void;
    /**
     * Subscribe to calibration changes
     */
    onCalibrationChange(callback: (event: ConfigChangeEvent<CalibrationConfig>) => void): () => void;
    /**
     * Force reload all configs
     */
    reloadAll(): Promise<void>;
    /**
     * Update thresholds programmatically
     */
    updateThresholds(update: Partial<ThresholdsConfig>): Promise<boolean>;
    /**
     * Update features programmatically
     */
    updateFeatures(update: Partial<FeatureTogglesConfig>): Promise<boolean>;
    /**
     * Update calibration programmatically
     */
    updateCalibration(update: Partial<CalibrationConfig>): Promise<boolean>;
    /**
     * Get statistics for all configs
     */
    getStats(): Record<string, unknown>;
    /**
     * Check if manager is initialized
     */
    isInitialized(): boolean;
    /**
     * Shutdown and cleanup
     */
    destroy(): void;
    /**
     * Reset to defaults (for testing)
     */
    reset(): void;
}
/**
 * Global HotReloadManager instance
 */
export declare const HotReloadManager: HotReloadManagerImpl;
/**
 * Export the class for testing
 */
export { HotReloadManagerImpl };
/**
 * Re-export defaults for convenience
 */
export { DEFAULT_THRESHOLDS, DEFAULT_FEATURES, DEFAULT_CALIBRATION, DEFAULT_WEIGHTS, DEFAULT_POSTFILTER, };
//# sourceMappingURL=HotReloadManager.d.ts.map