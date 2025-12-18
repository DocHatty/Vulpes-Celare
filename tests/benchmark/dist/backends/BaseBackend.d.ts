/**
 * ============================================================================
 * BASE BACKEND
 * ============================================================================
 *
 * Abstract base class for all detection backends.
 * Provides common functionality and integrates with VulpesCelare core.
 *
 * @module benchmark/backends/BaseBackend
 */
import type { DetectionBackend, DetectedSpan, StandardizedDocument, DetectionResult, BackendConfiguration, BackendHealth, BackendCapabilities } from './DetectionBackend';
/**
 * Abstract base class for detection backends
 */
export declare abstract class BaseBackend implements DetectionBackend {
    abstract readonly id: string;
    abstract readonly name: string;
    abstract readonly type: 'rules' | 'hybrid' | 'ml';
    protected initialized: boolean;
    protected initializationTime: Date | null;
    protected lastError: Error | null;
    /**
     * Get the detection mode for this backend
     */
    protected abstract getDetectionMode(): 'rules' | 'hybrid' | 'gliner';
    /**
     * Initialize the backend
     */
    initialize(): Promise<void>;
    /**
     * Backend-specific initialization (override in subclasses)
     */
    protected doInitialize(): Promise<void>;
    /**
     * Detect PHI in a document
     */
    detect(document: StandardizedDocument): Promise<DetectionResult>;
    /**
     * Extract detected spans from VulpesCelare result
     */
    protected extractSpans(originalText: string, result: any): DetectedSpan[];
    /**
     * Parse redacted text to extract spans by comparing with original
     */
    protected parseRedactedText(original: string, redacted: string): DetectedSpan[];
    /**
     * Normalize PHI type to standard format
     */
    protected normalizeType(type: string): string;
    /**
     * Batch detection (default: sequential)
     */
    detectBatch(documents: StandardizedDocument[]): Promise<DetectionResult[]>;
    /**
     * Shutdown the backend
     */
    shutdown(): Promise<void>;
    /**
     * Get current configuration
     */
    getConfiguration(): BackendConfiguration;
    /**
     * Get feature toggles snapshot
     */
    protected getFeatureToggles(): Record<string, boolean>;
    /**
     * Get version information
     */
    protected getVersion(): string;
    /**
     * Get backend health
     */
    getHealth(): Promise<BackendHealth>;
    /**
     * Get backend capabilities
     */
    getCapabilities(): BackendCapabilities;
}
