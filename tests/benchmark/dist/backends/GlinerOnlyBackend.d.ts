/**
 * ============================================================================
 * GLINER-ONLY BACKEND
 * ============================================================================
 *
 * Detection backend using only GLiNER ML model (no rules).
 * Pure ML-based zero-shot named entity recognition.
 *
 * Environment: VULPES_NAME_DETECTION_MODE=gliner
 *
 * @module benchmark/backends/GlinerOnlyBackend
 */
import { BaseBackend } from './BaseBackend';
import type { BackendCapabilities } from './DetectionBackend';
/**
 * GLiNER-only detection backend
 *
 * Uses GLiNER zero-shot NER for all PHI detection.
 * This tests pure ML performance without rule assistance.
 *
 * GLiNER entity labels:
 * - patient_name
 * - provider_name
 * - person_name
 * - family_member
 * - location
 * - date
 * - phone_number
 * - email
 * - ssn
 * - medical_record_number
 */
export declare class GlinerOnlyBackend extends BaseBackend {
    readonly id = "vulpes-gliner-v1";
    readonly name = "Vulpes Celare (GLiNER Only)";
    readonly type: "ml";
    private glinerModelPath;
    private glinerAvailable;
    protected getDetectionMode(): 'gliner';
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
    /**
     * Get GPU execution provider being used
     */
    getExecutionProvider(): string;
}
/**
 * Factory function
 */
export declare function createGlinerOnlyBackend(): GlinerOnlyBackend;
