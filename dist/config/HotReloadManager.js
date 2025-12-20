"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_POSTFILTER = exports.DEFAULT_WEIGHTS = exports.DEFAULT_CALIBRATION = exports.DEFAULT_FEATURES = exports.DEFAULT_THRESHOLDS = exports.HotReloadManagerImpl = exports.HotReloadManager = void 0;
const path_1 = require("path");
const AtomicConfig_1 = require("./AtomicConfig");
const schemas_1 = require("./schemas");
Object.defineProperty(exports, "DEFAULT_THRESHOLDS", { enumerable: true, get: function () { return schemas_1.DEFAULT_THRESHOLDS; } });
Object.defineProperty(exports, "DEFAULT_FEATURES", { enumerable: true, get: function () { return schemas_1.DEFAULT_FEATURES; } });
Object.defineProperty(exports, "DEFAULT_CALIBRATION", { enumerable: true, get: function () { return schemas_1.DEFAULT_CALIBRATION; } });
Object.defineProperty(exports, "DEFAULT_WEIGHTS", { enumerable: true, get: function () { return schemas_1.DEFAULT_WEIGHTS; } });
Object.defineProperty(exports, "DEFAULT_POSTFILTER", { enumerable: true, get: function () { return schemas_1.DEFAULT_POSTFILTER; } });
const VulpesLogger_1 = require("../utils/VulpesLogger");
const events_1 = require("events");
/**
 * Default options
 */
const DEFAULT_OPTIONS = {
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
class HotReloadManagerImpl extends events_1.EventEmitter {
    options = DEFAULT_OPTIONS;
    initialized = false;
    // Config instances
    thresholdsConfig = null;
    featuresConfig = null;
    calibrationConfig = null;
    weightsConfig = null;
    postFilterConfig = null;
    unifiedConfig = null;
    // Cached values for fast access
    cachedThresholds = schemas_1.DEFAULT_THRESHOLDS;
    cachedFeatures = schemas_1.DEFAULT_FEATURES;
    cachedCalibration = schemas_1.DEFAULT_CALIBRATION;
    cachedWeights = schemas_1.DEFAULT_WEIGHTS;
    cachedPostFilter = schemas_1.DEFAULT_POSTFILTER;
    /**
     * Initialize all configurations
     */
    async initialize(options = {}) {
        if (this.initialized) {
            VulpesLogger_1.vulpesLogger.warn("HotReloadManager already initialized", {
                component: "HotReloadManager",
            });
            return;
        }
        this.options = { ...DEFAULT_OPTIONS, ...options };
        VulpesLogger_1.vulpesLogger.info("Initializing HotReloadManager", {
            component: "HotReloadManager",
            configDir: this.options.configDir,
            watchFiles: this.options.watchFiles,
            unifiedConfig: this.options.unifiedConfig,
        });
        if (this.options.unifiedConfig) {
            await this.initializeUnifiedConfig();
        }
        else {
            await this.initializeSeparateConfigs();
        }
        this.initialized = true;
        VulpesLogger_1.vulpesLogger.info("HotReloadManager initialized successfully", {
            component: "HotReloadManager",
        });
    }
    /**
     * Initialize with a single unified config file
     */
    async initializeUnifiedConfig() {
        const filePath = (0, path_1.join)(this.options.configDir, "vulpes.json");
        this.unifiedConfig = await (0, AtomicConfig_1.createAtomicConfig)({
            filePath,
            schema: schemas_1.VulpesConfigSchema,
            defaults: schemas_1.DEFAULT_CONFIG,
            watch: this.options.watchFiles,
            debounceMs: this.options.debounceMs,
            envPrefix: this.options.envPrefix,
            name: "vulpes",
        });
        // Update cached values (use defaults for optional fields)
        const config = this.unifiedConfig.get();
        this.cachedThresholds = config.thresholds ?? schemas_1.DEFAULT_THRESHOLDS;
        this.cachedFeatures = config.features ?? schemas_1.DEFAULT_FEATURES;
        this.cachedCalibration = config.calibration ?? schemas_1.DEFAULT_CALIBRATION;
        this.cachedWeights = config.weights ?? schemas_1.DEFAULT_WEIGHTS;
        this.cachedPostFilter = config.postFilter ?? schemas_1.DEFAULT_POSTFILTER;
        // Subscribe to changes
        this.unifiedConfig.subscribe((event) => {
            const newConfig = event.newConfig;
            this.cachedThresholds = newConfig.thresholds ?? schemas_1.DEFAULT_THRESHOLDS;
            this.cachedFeatures = newConfig.features ?? schemas_1.DEFAULT_FEATURES;
            this.cachedCalibration = newConfig.calibration ?? schemas_1.DEFAULT_CALIBRATION;
            this.cachedWeights = newConfig.weights ?? schemas_1.DEFAULT_WEIGHTS;
            this.cachedPostFilter = newConfig.postFilter ?? schemas_1.DEFAULT_POSTFILTER;
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
    async initializeSeparateConfigs() {
        // Thresholds config
        this.thresholdsConfig = await (0, AtomicConfig_1.createAtomicConfig)({
            filePath: (0, path_1.join)(this.options.configDir, "thresholds.json"),
            schema: schemas_1.ThresholdsConfigSchema,
            defaults: schemas_1.DEFAULT_THRESHOLDS,
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
        this.featuresConfig = await (0, AtomicConfig_1.createAtomicConfig)({
            filePath: (0, path_1.join)(this.options.configDir, "features.json"),
            schema: schemas_1.FeatureTogglesConfigSchema,
            defaults: schemas_1.DEFAULT_FEATURES,
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
        this.calibrationConfig = await (0, AtomicConfig_1.createAtomicConfig)({
            filePath: (0, path_1.join)(this.options.configDir, "calibration.json"),
            schema: schemas_1.CalibrationConfigSchema,
            defaults: schemas_1.DEFAULT_CALIBRATION,
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
        this.weightsConfig = await (0, AtomicConfig_1.createAtomicConfig)({
            filePath: (0, path_1.join)(this.options.configDir, "weights.json"),
            schema: schemas_1.FilterWeightsConfigSchema,
            defaults: schemas_1.DEFAULT_WEIGHTS,
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
        this.postFilterConfig = await (0, AtomicConfig_1.createAtomicConfig)({
            filePath: (0, path_1.join)(this.options.configDir, "postfilter.json"),
            schema: schemas_1.PostFilterConfigSchema,
            defaults: schemas_1.DEFAULT_POSTFILTER,
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
    getThresholds() {
        return this.cachedThresholds;
    }
    /**
     * Get current feature toggles
     */
    getFeatures() {
        return this.cachedFeatures;
    }
    /**
     * Get current calibration
     */
    getCalibration() {
        return this.cachedCalibration;
    }
    /**
     * Get current filter weights
     */
    getWeights() {
        return this.cachedWeights;
    }
    /**
     * Get current post-filter config
     */
    getPostFilter() {
        return this.cachedPostFilter;
    }
    // ============================================================================
    // CONVENIENCE ACCESSORS
    // ============================================================================
    /**
     * Get a specific confidence threshold
     */
    getConfidenceThreshold(level) {
        return this.cachedThresholds.confidence[level];
    }
    /**
     * Check if a feature is enabled
     */
    isFeatureEnabled(feature) {
        const value = this.cachedFeatures[feature];
        return typeof value === "boolean" ? value : false;
    }
    /**
     * Get calibration for a specific filter
     */
    getFilterCalibration(filterType) {
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
    onAnyChange(callback) {
        this.on("change", callback);
        return () => this.off("change", callback);
    }
    /**
     * Subscribe to threshold changes
     */
    onThresholdsChange(callback) {
        this.on("thresholds:change", callback);
        return () => this.off("thresholds:change", callback);
    }
    /**
     * Subscribe to feature changes
     */
    onFeaturesChange(callback) {
        this.on("features:change", callback);
        return () => this.off("features:change", callback);
    }
    /**
     * Subscribe to calibration changes
     */
    onCalibrationChange(callback) {
        this.on("calibration:change", callback);
        return () => this.off("calibration:change", callback);
    }
    // ============================================================================
    // MANAGEMENT
    // ============================================================================
    /**
     * Force reload all configs
     */
    async reloadAll() {
        VulpesLogger_1.vulpesLogger.info("Reloading all configurations", {
            component: "HotReloadManager",
        });
        if (this.unifiedConfig) {
            await this.unifiedConfig.reload();
        }
        else {
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
    async updateThresholds(update) {
        if (this.unifiedConfig) {
            const current = this.unifiedConfig.get();
            const result = await this.unifiedConfig.set({
                ...current,
                thresholds: { ...current.thresholds, ...update },
            });
            return result.success;
        }
        else if (this.thresholdsConfig) {
            const result = await this.thresholdsConfig.set(update);
            return result.success;
        }
        return false;
    }
    /**
     * Update features programmatically
     */
    async updateFeatures(update) {
        if (this.unifiedConfig) {
            const current = this.unifiedConfig.get();
            const currentFeatures = current.features ?? schemas_1.DEFAULT_FEATURES;
            const result = await this.unifiedConfig.set({
                ...current,
                features: { ...currentFeatures, ...update },
            });
            return result.success;
        }
        else if (this.featuresConfig) {
            const result = await this.featuresConfig.set(update);
            return result.success;
        }
        return false;
    }
    /**
     * Update calibration programmatically
     */
    async updateCalibration(update) {
        if (this.unifiedConfig) {
            const current = this.unifiedConfig.get();
            const currentCalibration = current.calibration ?? schemas_1.DEFAULT_CALIBRATION;
            const result = await this.unifiedConfig.set({
                ...current,
                calibration: { ...currentCalibration, ...update },
            });
            return result.success;
        }
        else if (this.calibrationConfig) {
            const result = await this.calibrationConfig.set(update);
            return result.success;
        }
        return false;
    }
    /**
     * Get statistics for all configs
     */
    getStats() {
        const stats = {
            initialized: this.initialized,
            unifiedMode: this.options.unifiedConfig,
        };
        if (this.unifiedConfig) {
            stats.unified = this.unifiedConfig.getStats();
        }
        else {
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
    isInitialized() {
        return this.initialized;
    }
    /**
     * Shutdown and cleanup
     */
    destroy() {
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
        VulpesLogger_1.vulpesLogger.info("HotReloadManager destroyed", {
            component: "HotReloadManager",
        });
    }
    /**
     * Reset to defaults (for testing)
     */
    reset() {
        this.destroy();
        this.cachedThresholds = schemas_1.DEFAULT_THRESHOLDS;
        this.cachedFeatures = schemas_1.DEFAULT_FEATURES;
        this.cachedCalibration = schemas_1.DEFAULT_CALIBRATION;
        this.cachedWeights = schemas_1.DEFAULT_WEIGHTS;
        this.cachedPostFilter = schemas_1.DEFAULT_POSTFILTER;
    }
}
exports.HotReloadManagerImpl = HotReloadManagerImpl;
// ============================================================================
// SINGLETON EXPORT
// ============================================================================
/**
 * Global HotReloadManager instance
 */
exports.HotReloadManager = new HotReloadManagerImpl();
//# sourceMappingURL=HotReloadManager.js.map