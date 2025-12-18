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

import { out } from "../utils/VulpesOutput";

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
const FEATURE_TOGGLES: Record<string, FeatureToggle> = {
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
  // ML/SLM Features
  gliner: {
    envVar: "VULPES_USE_GLINER",
    defaultEnabled: false,
    description: "GLiNER ML-based name detection",
    category: "experimental",
  },
  mlConfidence: {
    envVar: "VULPES_USE_ML_CONFIDENCE",
    defaultEnabled: false,
    description: "TinyBERT ML confidence re-ranking",
    category: "experimental",
  },
  mlFPFilter: {
    envVar: "VULPES_USE_ML_FP_FILTER",
    defaultEnabled: false,
    description: "ML-based false positive filtering",
    category: "experimental",
  },
};

/**
 * Check if a feature is enabled
 */
function isEnabled(feature: keyof typeof FEATURE_TOGGLES): boolean {
  const toggle = FEATURE_TOGGLES[feature];
  if (!toggle) return false;

  const envValue = process.env[toggle.envVar];
  if (envValue === undefined) {
    return toggle.defaultEnabled;
  }

  // "1" or "true" means enabled, "0" or "false" means disabled
  if (toggle.defaultEnabled) {
    // Default ON: disabled only if explicitly set to "0" or "false"
    return envValue !== "0" && envValue.toLowerCase() !== "false";
  } else {
    // Default OFF: enabled only if explicitly set to "1" or "true"
    return envValue === "1" || envValue.toLowerCase() === "true";
  }
}

/**
 * Get GPU provider setting
 */
function getGPUProvider(): "directml" | "cuda" | "rocm" | "coreml" | "cpu" {
  const provider = process.env.VULPES_GPU_PROVIDER?.toLowerCase();
  if (provider === "directml") return "directml";
  if (provider === "cuda") return "cuda";
  if (provider === "rocm") return "rocm";
  if (provider === "coreml") return "coreml";
  return "cpu";
}

/**
 * Get all feature statuses
 */
function getAllStatuses(): Record<
  string,
  { enabled: boolean; envVar: string; description: string; category: string }
> {
  const statuses: Record<
    string,
    { enabled: boolean; envVar: string; description: string; category: string }
  > = {};

  for (const [name, toggle] of Object.entries(FEATURE_TOGGLES)) {
    statuses[name] = {
      enabled: isEnabled(name as keyof typeof FEATURE_TOGGLES),
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
function printStatus(): void {
  out.print("╔════════════════════════════════════════════════════════════════╗");
  out.print("║           VULPES CELARE - Feature Status                       ║");
  out.print("╚════════════════════════════════════════════════════════════════╝");
  out.blank();

  const statuses = getAllStatuses();
  const categories = ["core", "acceleration", "experimental", "debug"];

  for (const category of categories) {
    const categoryFeatures = Object.entries(statuses).filter(
      ([, s]) => s.category === category
    );

    if (categoryFeatures.length === 0) continue;

    out.print(`${category.toUpperCase()} FEATURES:`);
    out.print("─".repeat(60));

    for (const [name, status] of categoryFeatures) {
      const indicator = status.enabled ? "[ON] " : "[OFF]";
      const envStatus = process.env[status.envVar] !== undefined ? "*" : " ";
      out.print(
        `  ${indicator} ${name.padEnd(20)} ${envStatus} ${status.description}`
      );
    }
    out.blank();
  }

  out.print(`GPU Provider: ${getGPUProvider()}`);
  out.blank();
  out.print("* = explicitly set via environment variable");
  out.blank();
}

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
function getNameDetectionMode(): NameDetectionMode {
  const mode = process.env.VULPES_NAME_DETECTION_MODE?.toLowerCase();
  if (mode === "gliner") return "gliner";
  if (mode === "rules") return "rules";
  return "hybrid"; // Default
}

/**
 * Get the ML device/execution provider
 */
function getMLDevice(): "cpu" | "cuda" | "directml" | "coreml" {
  const device = process.env.VULPES_ML_DEVICE?.toLowerCase();
  if (device === "cuda") return "cuda";
  if (device === "directml") return "directml";
  if (device === "coreml") return "coreml";
  return "cpu";
}

export const FeatureToggles = {
  // Individual feature checks
  isDatalogEnabled: () => isEnabled("datalog"),
  isDFAScanEnabled: () => isEnabled("dfaScan"),
  isContextFiltersEnabled: () => isEnabled("contextFilters"),
  isCortexEnabled: () => isEnabled("cortex"),
  isContextModifierEnabled: () => isEnabled("contextModifier"),
  isRustAccelEnabled: () => isEnabled("rustAccel"),
  isOptimizedWeightsEnabled: () => isEnabled("optimizedWeights"),

  // ML/SLM feature checks
  isGlinerEnabled: () => isEnabled("gliner"),
  isMLConfidenceEnabled: () => isEnabled("mlConfidence"),
  isMLFPFilterEnabled: () => isEnabled("mlFPFilter"),

  // Shadow mode checks
  isShadowRustNameEnabled: () => isEnabled("shadowRustName"),
  isShadowRustNameFullEnabled: () => isEnabled("shadowRustNameFull"),
  isShadowRustNameSmartEnabled: () => isEnabled("shadowRustNameSmart"),
  isShadowPostfilterEnabled: () => isEnabled("shadowPostfilter"),
  isShadowApplySpansEnabled: () => isEnabled("shadowApplySpans"),

  // GPU provider
  getGPUProvider,

  // ML configuration
  getNameDetectionMode,
  getMLDevice,

  // Status utilities
  getAllStatuses,
  printStatus,

  // Generic check
  isEnabled,

  // Feature toggle definitions (for documentation)
  definitions: FEATURE_TOGGLES,
};

export default FeatureToggles;
