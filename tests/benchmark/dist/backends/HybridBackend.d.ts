/**
 * ============================================================================
 * HYBRID BACKEND
 * ============================================================================
 *
 * Detection backend combining rules with GLiNER ML model.
 * Best of both worlds: deterministic patterns + ML flexibility.
 *
 * Environment: VULPES_NAME_DETECTION_MODE=hybrid
 *
 * @module benchmark/backends/HybridBackend
 */
import { BaseBackend } from './BaseBackend';
import type { BackendCapabilities } from './DetectionBackend';
/**
 * Hybrid detection backend (Rules + GLiNER)
 *
 * Combines:
 * 1. All 28 rule-based filters (high precision)
 * 2. GLiNER zero-shot NER (high recall for names)
 *
 * GLiNER runs in parallel with rules, and results are merged
 * with priority-based overlap resolution.
 */
export declare class HybridBackend extends BaseBackend {
    readonly id = "vulpes-hybrid-v1";
    readonly name = "Vulpes Celare (Hybrid: Rules + GLiNER)";
    readonly type: "hybrid";
    private glinerModelPath;
    private glinerAvailable;
    protected getDetectionMode(): 'hybrid';
    protected doInitialize(): Promise<void>;
    getCapabilities(): BackendCapabilities;
    /**
     * Check if GPU acceleration is available
     */
    private isGPUAvailable;
    /**
     * Check if GLiNER model is available
     */
    isGlinerAvailable(): boolean;
    /**
     * Get GLiNER model path
     */
    getGlinerModelPath(): string | null;
}
/**
 * Factory function
 */
export declare function createHybridBackend(): HybridBackend;
