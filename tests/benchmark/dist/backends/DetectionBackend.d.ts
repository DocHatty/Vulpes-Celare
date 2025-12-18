/**
 * ============================================================================
 * DETECTION BACKEND INTERFACE
 * ============================================================================
 *
 * Unified interface for all PHI detection backends (Rules, Hybrid, GLiNER).
 * This abstraction enables model-agnostic benchmarking and fair comparison.
 *
 * Design follows existing VulpesCelare.redactWithPolicy() signature while
 * adding benchmark-specific metadata and lifecycle management.
 *
 * @module benchmark/backends/DetectionBackend
 */
/**
 * Detected PHI span with confidence and metadata
 */
export interface DetectedSpan {
    /** Start character index (0-based) */
    start: number;
    /** End character index (exclusive) */
    end: number;
    /** Detected text */
    text: string;
    /** PHI type (name, ssn, date, etc.) */
    type: string;
    /** Detection confidence (0-1) */
    confidence: number;
    /** Filter/model that detected this span */
    source: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Standardized document for benchmark evaluation
 */
export interface StandardizedDocument {
    /** Unique document identifier */
    id: string;
    /** Raw document text */
    text: string;
    /** Document category (discharge_summary, progress_note, etc.) */
    category?: string;
    /** OCR error tier (1-4) */
    ocrTier?: 1 | 2 | 3 | 4;
    /** Source corpus (synthetic, mtsamples, etc.) */
    corpus?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Ground truth annotation for evaluation
 */
export interface GroundTruthSpan {
    /** Start character index (0-based) */
    start: number;
    /** End character index (exclusive) */
    end: number;
    /** Expected text */
    text: string;
    /** PHI type */
    type: string;
    /** Annotation confidence (1.0 for human-labeled) */
    confidence?: number;
    /** Annotator ID */
    annotator?: string;
}
/**
 * Backend configuration snapshot for reproducibility
 */
export interface BackendConfiguration {
    /** Backend identifier */
    backendId: string;
    /** Detection mode */
    mode: 'rules' | 'hybrid' | 'gliner';
    /** Environment variables affecting this backend */
    environmentVariables: Record<string, string | undefined>;
    /** Model paths (for ML backends) */
    modelPaths?: Record<string, string>;
    /** Confidence thresholds */
    thresholds?: Record<string, number>;
    /** Feature toggles snapshot */
    featureToggles?: Record<string, boolean>;
    /** Version information */
    version?: string;
}
/**
 * Detection result with timing and metadata
 */
export interface DetectionResult {
    /** Document identifier */
    documentId: string;
    /** Detected PHI spans */
    spans: DetectedSpan[];
    /** Processing time in milliseconds */
    processingTimeMs: number;
    /** Number of filters executed */
    filtersExecuted?: number;
    /** Backend configuration at time of detection */
    configuration: BackendConfiguration;
    /** Any warnings or errors */
    warnings?: string[];
}
/**
 * Backend health status
 */
export interface BackendHealth {
    /** Is the backend ready for detection */
    ready: boolean;
    /** Health check timestamp */
    timestamp: Date;
    /** Detailed status per component */
    components: {
        name: string;
        status: 'healthy' | 'degraded' | 'unhealthy';
        message?: string;
    }[];
    /** Last error if any */
    lastError?: Error;
}
/**
 * Detection backend interface - implemented by Rules, Hybrid, and GLiNER backends
 */
export interface DetectionBackend {
    /**
     * Unique backend identifier
     * Format: "vulpes-{mode}-v{version}"
     */
    readonly id: string;
    /**
     * Human-readable backend name
     */
    readonly name: string;
    /**
     * Backend type for classification
     */
    readonly type: 'rules' | 'hybrid' | 'ml';
    /**
     * Initialize the backend
     * - Load models (for ML backends)
     * - Warm up caches
     * - Validate configuration
     *
     * @throws Error if initialization fails
     */
    initialize(): Promise<void>;
    /**
     * Detect PHI in a document
     *
     * @param document - Standardized document to process
     * @returns Detection result with spans and metadata
     */
    detect(document: StandardizedDocument): Promise<DetectionResult>;
    /**
     * Detect PHI in multiple documents (batch processing)
     *
     * @param documents - Array of documents to process
     * @returns Array of detection results
     */
    detectBatch?(documents: StandardizedDocument[]): Promise<DetectionResult[]>;
    /**
     * Graceful shutdown
     * - Release model resources
     * - Flush caches
     * - Close connections
     */
    shutdown(): Promise<void>;
    /**
     * Get current configuration snapshot
     * Used for reproducibility and audit
     */
    getConfiguration(): BackendConfiguration;
    /**
     * Check backend health
     */
    getHealth(): Promise<BackendHealth>;
    /**
     * Get backend capabilities
     */
    getCapabilities(): BackendCapabilities;
}
/**
 * Backend capabilities for feature detection
 */
export interface BackendCapabilities {
    /** Supports batch processing */
    batchProcessing: boolean;
    /** Supports streaming */
    streaming: boolean;
    /** Supports GPU acceleration */
    gpuAcceleration: boolean;
    /** Supported PHI types */
    supportedPHITypes: string[];
    /** Maximum document length */
    maxDocumentLength?: number;
    /** Estimated throughput (docs/sec) */
    estimatedThroughput?: number;
}
/**
 * Factory function type for creating backends
 */
export type BackendFactory = (config?: Partial<BackendConfiguration>) => DetectionBackend;
/**
 * Registry of available backends
 */
export interface BackendRegistry {
    /** Register a backend factory */
    register(id: string, factory: BackendFactory): void;
    /** Get a backend by ID */
    get(id: string): DetectionBackend | undefined;
    /** Get all registered backend IDs */
    list(): string[];
    /** Create all backends */
    createAll(): DetectionBackend[];
}
/**
 * Default PHI types supported by Vulpes Celare
 */
export declare const SUPPORTED_PHI_TYPES: readonly ["name", "ssn", "phone", "email", "address", "date", "mrn", "ip", "url", "credit_card", "account", "health_plan", "license", "passport", "vehicle", "device", "biometric", "zip", "fax", "age"];
export type PHIType = typeof SUPPORTED_PHI_TYPES[number];
