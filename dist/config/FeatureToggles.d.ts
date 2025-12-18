/**
 * FeatureToggles - Centralized Feature Toggle Configuration
 *
 * All feature toggles in Vulpes Celare are controlled through this module.
 * This provides a single place to check feature status and configure behavior.
 *
 * ENVIRONMENT VARIABLES:
 *
 * | Variable                     | Default | Description                              |
 * |------------------------------|---------|------------------------------------------|
 * | VULPES_USE_DATALOG           | ON      | Datalog constraint solver                |
 * | VULPES_DFA_SCAN              | OFF     | DFA multi-pattern pre-scanning           |
 * | VULPES_CONTEXT_FILTERS       | OFF     | Context-aware filters (may add FPs)      |
 * | VULPES_USE_CORTEX            | OFF     | Python ML bridge                         |
 * | VULPES_GPU_PROVIDER          | cpu     | GPU provider (directml/cuda/cpu)         |
 * | VULPES_CONTEXT_MODIFIER      | ON      | Clinical context confidence modifier     |
 * | VULPES_RUST_ACCEL            | ON      | Rust acceleration for core functions     |
 * | VULPES_SHADOW_RUST_NAME      | OFF     | Shadow mode for Rust name scanner        |
 * | VULPES_USE_OPTIMIZED_WEIGHTS | OFF     | Use ML-optimized scoring weights         |
 *
 * @module config/FeatureToggles
 */
/**
 * Feature toggle definition
 */
interface FeatureToggle {
    /** Environment variable name */
    envVar: string;
    /** Whether the feature is enabled by default */
    defaultEnabled: boolean;
    /** Human-readable description */
    description: string;
    /** Category for grouping */
    category: "core" | "acceleration" | "experimental" | "debug";
}
/**
 * All feature toggles in the system
 */
declare const FEATURE_TOGGLES: Record<string, FeatureToggle>;
/**
 * Check if a feature is enabled
 */
declare function isEnabled(feature: keyof typeof FEATURE_TOGGLES): boolean;
/**
 * Get GPU provider setting
 */
declare function getGPUProvider(): "directml" | "cuda" | "rocm" | "coreml" | "cpu";
/**
 * Get all feature statuses
 */
declare function getAllStatuses(): Record<string, {
    enabled: boolean;
    envVar: string;
    description: string;
    category: string;
}>;
/**
 * Print feature status (user-facing output)
 */
declare function printStatus(): void;
/**
 * Exported FeatureToggles API
 */
/**
 * Name detection mode
 */
export type NameDetectionMode = "hybrid" | "gliner" | "rules";
/**
 * Get the name detection mode
 */
declare function getNameDetectionMode(): NameDetectionMode;
/**
 * Get the ML device/execution provider
 */
declare function getMLDevice(): "cpu" | "cuda" | "directml" | "coreml";
export declare const FeatureToggles: {
    isDatalogEnabled: () => boolean;
    isDFAScanEnabled: () => boolean;
    isContextFiltersEnabled: () => boolean;
    isCortexEnabled: () => boolean;
    isContextModifierEnabled: () => boolean;
    isRustAccelEnabled: () => boolean;
    isOptimizedWeightsEnabled: () => boolean;
    isGlinerEnabled: () => boolean;
    isMLConfidenceEnabled: () => boolean;
    isMLFPFilterEnabled: () => boolean;
    isShadowRustNameEnabled: () => boolean;
    isShadowRustNameFullEnabled: () => boolean;
    isShadowRustNameSmartEnabled: () => boolean;
    isShadowPostfilterEnabled: () => boolean;
    isShadowApplySpansEnabled: () => boolean;
    getGPUProvider: typeof getGPUProvider;
    getNameDetectionMode: typeof getNameDetectionMode;
    getMLDevice: typeof getMLDevice;
    getAllStatuses: typeof getAllStatuses;
    printStatus: typeof printStatus;
    isEnabled: typeof isEnabled;
    definitions: Record<string, FeatureToggle>;
};
export default FeatureToggles;
//# sourceMappingURL=FeatureToggles.d.ts.map