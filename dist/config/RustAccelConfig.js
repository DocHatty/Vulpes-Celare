"use strict";
/**
 * RustAccelConfig
 *
 * Centralizes environment-variable handling for Rust accelerators.
 *
 * New consolidated control:
 * - `VULPES_RUST_ACCEL`: 0=off, 1=basic, 2=full
 *
 * Backward compatibility:
 * - Per-accelerator `VULPES_*_ACCEL` vars still work and override the global
 *   level when explicitly set.
 * - Name acceleration keeps its legacy multi-level mode via `VULPES_NAME_ACCEL`
 *   (0-3), with `VULPES_RUST_ACCEL` providing a coarse default when set.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RustAccelConfig = void 0;
function parseRustAccelLevel(raw) {
    if (raw === undefined)
        return null;
    if (raw === "0")
        return 0;
    if (raw === "1")
        return 1;
    if (raw === "2")
        return 2;
    return null;
}
function parseNameAccelMode(raw) {
    if (raw === undefined)
        return null;
    if (raw === "0")
        return 0;
    if (raw === "1")
        return 1;
    if (raw === "2")
        return 2;
    if (raw === "3")
        return 3;
    return null;
}
function envEnabledDefaultTrue(raw) {
    if (raw === undefined)
        return null;
    return raw === "1";
}
function resolveEnabledDefaultTrue(featureEnvVar, requiredLevel = 1) {
    const featureRaw = process.env[featureEnvVar];
    const featureOverride = envEnabledDefaultTrue(featureRaw);
    if (featureOverride !== null)
        return featureOverride;
    const globalLevel = parseRustAccelLevel(process.env.VULPES_RUST_ACCEL);
    if (globalLevel !== null)
        return globalLevel >= requiredLevel;
    return true;
}
exports.RustAccelConfig = {
    getLevel() {
        return parseRustAccelLevel(process.env.VULPES_RUST_ACCEL);
    },
    /**
     * Name accelerator mode:
     * - 0: off (TS only)
     * - 1: Last,First only
     * - 2: + First Last
     * - 3: full smart scanner (if available)
     */
    getNameAccelMode() {
        const explicit = parseNameAccelMode(process.env.VULPES_NAME_ACCEL);
        if (explicit !== null)
            return explicit;
        const globalLevel = parseRustAccelLevel(process.env.VULPES_RUST_ACCEL);
        if (globalLevel === 0)
            return 0;
        if (globalLevel === 2)
            return 3;
        if (globalLevel === 1)
            return 2;
        // Preserve existing default behavior when neither is set.
        return 2;
    },
    isScanKernelEnabled() {
        return resolveEnabledDefaultTrue("VULPES_SCAN_ACCEL", 1);
    },
    isIntervalTreeEnabled() {
        return resolveEnabledDefaultTrue("VULPES_INTERVAL_ACCEL", 1);
    },
    isApplySpansEnabled() {
        return resolveEnabledDefaultTrue("VULPES_APPLY_SPANS_ACCEL", 1);
    },
    isSpanOpsEnabled() {
        return resolveEnabledDefaultTrue("VULPES_SPAN_ACCEL", 1);
    },
    isTextAccelEnabled() {
        return resolveEnabledDefaultTrue("VULPES_TEXT_ACCEL", 1);
    },
    /**
     * Some helpers intentionally only use native code when explicitly enabled,
     * to avoid forcing the native addon in otherwise JS-only deployments.
     */
    isTextAccelExplicitlyEnabled() {
        const explicit = envEnabledDefaultTrue(process.env.VULPES_TEXT_ACCEL);
        if (explicit !== null)
            return explicit;
        const globalLevel = parseRustAccelLevel(process.env.VULPES_RUST_ACCEL);
        if (globalLevel !== null)
            return globalLevel >= 1;
        return false;
    },
    isFuzzyEnabled() {
        return resolveEnabledDefaultTrue("VULPES_FUZZY_ACCEL", 1);
    },
    isChaosEnabled() {
        return resolveEnabledDefaultTrue("VULPES_CHAOS_ACCEL", 1);
    },
    isPostFilterEnabled() {
        return resolveEnabledDefaultTrue("VULPES_POSTFILTER_ACCEL", 1);
    },
    // Shadow/reporting toggles (do not change behavior).
    isShadowRustNameSmartEnabled() {
        return process.env.VULPES_SHADOW_RUST_NAME_SMART === "1";
    },
};
//# sourceMappingURL=RustAccelConfig.js.map