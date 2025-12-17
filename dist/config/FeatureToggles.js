"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureToggles = void 0;
const VulpesOutput_1 = require("../utils/VulpesOutput");
/**
 * All feature toggles in the system
 */
const FEATURE_TOGGLES = {
    datalog: {
        envVar: "VULPES_USE_DATALOG",
        defaultEnabled: true,
        description: "Datalog constraint solver for cross-type reasoning",
        category: "core",
    },
    dfaScan: {
        envVar: "VULPES_DFA_SCAN",
        defaultEnabled: false,
        description: "DFA multi-pattern pre-scanning for faster detection",
        category: "acceleration",
    },
    contextFilters: {
        envVar: "VULPES_CONTEXT_FILTERS",
        defaultEnabled: false,
        description: "Context-aware filters (may increase false positives)",
        category: "experimental",
    },
    cortex: {
        envVar: "VULPES_USE_CORTEX",
        defaultEnabled: false,
        description: "Python ML bridge for advanced analysis",
        category: "experimental",
    },
    contextModifier: {
        envVar: "VULPES_CONTEXT_MODIFIER",
        defaultEnabled: true,
        description: "Clinical context confidence modifier",
        category: "core",
    },
    rustAccel: {
        envVar: "VULPES_RUST_ACCEL",
        defaultEnabled: true,
        description: "Rust acceleration for core functions",
        category: "acceleration",
    },
    shadowRustName: {
        envVar: "VULPES_SHADOW_RUST_NAME",
        defaultEnabled: false,
        description: "Shadow mode for Rust name scanner comparison",
        category: "debug",
    },
    shadowRustNameFull: {
        envVar: "VULPES_SHADOW_RUST_NAME_FULL",
        defaultEnabled: false,
        description: "Shadow mode for full Rust name scanner",
        category: "debug",
    },
    shadowRustNameSmart: {
        envVar: "VULPES_SHADOW_RUST_NAME_SMART",
        defaultEnabled: false,
        description: "Shadow mode for smart Rust name scanner",
        category: "debug",
    },
    shadowPostfilter: {
        envVar: "VULPES_SHADOW_POSTFILTER",
        defaultEnabled: false,
        description: "Shadow mode for postfilter comparison",
        category: "debug",
    },
    shadowApplySpans: {
        envVar: "VULPES_SHADOW_APPLY_SPANS",
        defaultEnabled: false,
        description: "Shadow mode for apply spans comparison",
        category: "debug",
    },
    optimizedWeights: {
        envVar: "VULPES_USE_OPTIMIZED_WEIGHTS",
        defaultEnabled: false,
        description: "Use ML-optimized scoring weights",
        category: "experimental",
    },
};
/**
 * Check if a feature is enabled
 */
function isEnabled(feature) {
    const toggle = FEATURE_TOGGLES[feature];
    if (!toggle)
        return false;
    const envValue = process.env[toggle.envVar];
    if (envValue === undefined) {
        return toggle.defaultEnabled;
    }
    // "1" or "true" means enabled, "0" or "false" means disabled
    if (toggle.defaultEnabled) {
        // Default ON: disabled only if explicitly set to "0" or "false"
        return envValue !== "0" && envValue.toLowerCase() !== "false";
    }
    else {
        // Default OFF: enabled only if explicitly set to "1" or "true"
        return envValue === "1" || envValue.toLowerCase() === "true";
    }
}
/**
 * Get GPU provider setting
 */
function getGPUProvider() {
    const provider = process.env.VULPES_GPU_PROVIDER?.toLowerCase();
    if (provider === "directml")
        return "directml";
    if (provider === "cuda")
        return "cuda";
    if (provider === "rocm")
        return "rocm";
    if (provider === "coreml")
        return "coreml";
    return "cpu";
}
/**
 * Get all feature statuses
 */
function getAllStatuses() {
    const statuses = {};
    for (const [name, toggle] of Object.entries(FEATURE_TOGGLES)) {
        statuses[name] = {
            enabled: isEnabled(name),
            envVar: toggle.envVar,
            description: toggle.description,
            category: toggle.category,
        };
    }
    return statuses;
}
/**
 * Print feature status (user-facing output)
 */
function printStatus() {
    VulpesOutput_1.out.print("╔════════════════════════════════════════════════════════════════╗");
    VulpesOutput_1.out.print("║           VULPES CELARE - Feature Status                       ║");
    VulpesOutput_1.out.print("╚════════════════════════════════════════════════════════════════╝");
    VulpesOutput_1.out.blank();
    const statuses = getAllStatuses();
    const categories = ["core", "acceleration", "experimental", "debug"];
    for (const category of categories) {
        const categoryFeatures = Object.entries(statuses).filter(([, s]) => s.category === category);
        if (categoryFeatures.length === 0)
            continue;
        VulpesOutput_1.out.print(`${category.toUpperCase()} FEATURES:`);
        VulpesOutput_1.out.print("─".repeat(60));
        for (const [name, status] of categoryFeatures) {
            const indicator = status.enabled ? "[ON] " : "[OFF]";
            const envStatus = process.env[status.envVar] !== undefined ? "*" : " ";
            VulpesOutput_1.out.print(`  ${indicator} ${name.padEnd(20)} ${envStatus} ${status.description}`);
        }
        VulpesOutput_1.out.blank();
    }
    VulpesOutput_1.out.print(`GPU Provider: ${getGPUProvider()}`);
    VulpesOutput_1.out.blank();
    VulpesOutput_1.out.print("* = explicitly set via environment variable");
    VulpesOutput_1.out.blank();
}
/**
 * Exported FeatureToggles API
 */
exports.FeatureToggles = {
    // Individual feature checks
    isDatalogEnabled: () => isEnabled("datalog"),
    isDFAScanEnabled: () => isEnabled("dfaScan"),
    isContextFiltersEnabled: () => isEnabled("contextFilters"),
    isCortexEnabled: () => isEnabled("cortex"),
    isContextModifierEnabled: () => isEnabled("contextModifier"),
    isRustAccelEnabled: () => isEnabled("rustAccel"),
    isOptimizedWeightsEnabled: () => isEnabled("optimizedWeights"),
    // Shadow mode checks
    isShadowRustNameEnabled: () => isEnabled("shadowRustName"),
    isShadowRustNameFullEnabled: () => isEnabled("shadowRustNameFull"),
    isShadowRustNameSmartEnabled: () => isEnabled("shadowRustNameSmart"),
    isShadowPostfilterEnabled: () => isEnabled("shadowPostfilter"),
    isShadowApplySpansEnabled: () => isEnabled("shadowApplySpans"),
    // GPU provider
    getGPUProvider,
    // Status utilities
    getAllStatuses,
    printStatus,
    // Generic check
    isEnabled,
    // Feature toggle definitions (for documentation)
    definitions: FEATURE_TOGGLES,
};
exports.default = exports.FeatureToggles;
//# sourceMappingURL=FeatureToggles.js.map