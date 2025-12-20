/**
 * Configuration Module
 *
 * Centralized exports for all configuration-related modules.
 *
 * @module config
 */

// Environment configuration (feature toggles via env vars)
export * from "./EnvironmentConfig";
export * from "./FeatureToggles";
export * from "./RustAccelConfig";

// Centralized thresholds (confidence, context windows, etc.)
export * from "./Thresholds";

// Centralized word lists for false positive filtering
export * from "./WordLists";

// Centralized OCR patterns and character substitutions
export * from "./OcrPatterns";

// Hot-reload configuration (Phase 5: Atomic Config)
export * from "./AtomicConfig";
export * from "./schemas";
export * from "./HotReloadManager";
