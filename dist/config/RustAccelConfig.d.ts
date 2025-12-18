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
export type RustAccelLevel = 0 | 1 | 2;
export type NameAccelMode = 0 | 1 | 2 | 3;
export declare const RustAccelConfig: {
    getLevel(): RustAccelLevel | null;
    /**
     * Name accelerator mode:
     * - 0: off (TS only)
     * - 1: Last,First only
     * - 2: + First Last
     * - 3: full smart scanner (if available)
     */
    getNameAccelMode(): NameAccelMode;
    isScanKernelEnabled(): boolean;
    isIntervalTreeEnabled(): boolean;
    isApplySpansEnabled(): boolean;
    isSpanOpsEnabled(): boolean;
    isTextAccelEnabled(): boolean;
    /**
     * Some helpers intentionally only use native code when explicitly enabled,
     * to avoid forcing the native addon in otherwise JS-only deployments.
     */
    isTextAccelExplicitlyEnabled(): boolean;
    isFuzzyEnabled(): boolean;
    isChaosEnabled(): boolean;
    isPostFilterEnabled(): boolean;
    isShadowRustNameSmartEnabled(): boolean;
};
//# sourceMappingURL=RustAccelConfig.d.ts.map