/**
 * ============================================================================
 * RULES-ONLY BACKEND
 * ============================================================================
 *
 * Detection backend using only regex/dictionary-based rules.
 * No ML models involved - pure pattern matching.
 *
 * Environment: VULPES_NAME_DETECTION_MODE=rules
 *
 * @module benchmark/backends/RulesOnlyBackend
 */
import { BaseBackend } from './BaseBackend';
import type { BackendCapabilities } from './DetectionBackend';
/**
 * Rules-only detection backend
 *
 * Uses Vulpes Celare's 28 span-based filters without any ML enhancement:
 * - SmartNameFilterSpan
 * - SSNFilterSpan
 * - DateFilterSpan
 * - EmailFilterSpan
 * - PhoneFilterSpan
 * - etc.
 *
 * This represents the baseline, deterministic detection approach.
 */
export declare class RulesOnlyBackend extends BaseBackend {
    readonly id = "vulpes-rules-v1";
    readonly name = "Vulpes Celare (Rules Only)";
    readonly type: "rules";
    protected getDetectionMode(): 'rules';
    protected doInitialize(): Promise<void>;
    getCapabilities(): BackendCapabilities;
}
/**
 * Factory function
 */
export declare function createRulesOnlyBackend(): RulesOnlyBackend;
