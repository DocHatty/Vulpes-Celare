/**
 * ============================================================================
 * VULPES CELARE
 * ============================================================================
 *
 * Hatkoff Redaction Engine
 *
 * A HIPAA Safe Harbor PHI redaction engine.
 *
 * Current validation is synthetic-only; see `docs/BENCHMARKS.md` for the latest
 * evaluation posture and results.
 *
 * This is the MAIN ORCHESTRATOR - your primary integration point.
 *
 * QUICK START:
 *   const safe = await VulpesCelare.redact(medicalDocument);
 *
 * @module VulpesCelare
 * @version 1.0.0
 * @author Hatkoff
 */
import { RedactionExecutionReport } from "./core/ParallelRedactionEngine";
import { SpanBasedFilter } from "./core/SpanBasedFilter";
import { RedactionContext } from "./context/RedactionContext";
import { ImageRedactor, ImageRedactionResult, VisualPolicy } from "./core/images";
export type PHIType = "name" | "ssn" | "phone" | "email" | "address" | "date" | "mrn" | "npi" | "dea" | "ip" | "url" | "credit_card" | "account" | "health_plan" | "license" | "passport" | "vehicle" | "device" | "biometric" | "unique_id" | "zip" | "fax" | "age";
export type ReplacementStyle = "brackets" | "asterisks" | "empty";
export interface VulpesCelareConfig {
    enabledTypes?: PHIType[];
    disabledTypes?: PHIType[];
    replacementStyle?: ReplacementStyle;
    customReplacements?: Partial<Record<PHIType, string>>;
    customFilters?: SpanBasedFilter[];
}
export interface RedactionResult {
    text: string;
    redactionCount: number;
    breakdown: Record<string, number>;
    executionTimeMs: number;
    report?: RedactionExecutionReport;
}
export interface FilterProvider {
    getFilters(config: VulpesCelareConfig): SpanBasedFilter[];
}
export interface PolicyProvider {
    getPolicy(config: VulpesCelareConfig): any;
}
export declare class VulpesCelare {
    private filters;
    private policy;
    private config;
    static readonly ALL_PHI_TYPES: PHIType[];
    static readonly VERSION = "1.0.0";
    static readonly NAME = "Vulpes Celare";
    static readonly VARIANT = "Hatkoff Redaction Engine";
    constructor(config?: VulpesCelareConfig, dependencies?: {
        filterProvider?: FilterProvider;
        policyProvider?: PolicyProvider;
    });
    static redact(text: string): Promise<string>;
    static redactWithDetails(text: string, config?: VulpesCelareConfig): Promise<RedactionResult>;
    /**
     * Low-level orchestrator entrypoint used by legacy `RedactionEngine`.
     *
     * @internal
     */
    static redactWithPolicy(text: string, filters: SpanBasedFilter[], policy: any, context: RedactionContext): Promise<string>;
    /**
     * Redact PHI from an image buffer.
     * Detects faces, extracts text via OCR, and applies black-box redaction.
     *
     * @param imageBuffer - PNG/JPEG image buffer
     * @param options - Optional configuration
     * @returns Redacted image buffer and metadata
     */
    static redactImage(imageBuffer: Buffer, options?: {
        policy?: Partial<VisualPolicy>;
        knownIdentifiers?: string[];
    }): Promise<ImageRedactionResult>;
    /**
     * Create an ImageRedactor instance with optional VulpesCelare text integration.
     * The returned redactor can be reused for multiple images.
     */
    static createImageRedactor(policy?: Partial<VisualPolicy>): Promise<ImageRedactor>;
    process(text: string): Promise<RedactionResult>;
    processBatch(texts: string[]): Promise<RedactionResult[]>;
    getConfig(): VulpesCelareConfig;
    getActiveFilters(): string[];
    getLastReport(): RedactionExecutionReport | null;
    private buildFilters;
    private buildPolicy;
}
export { StreamingRedactor, WebSocketRedactionHandler, } from "./StreamingRedactor";
export type { StreamingRedactorConfig, StreamingChunk, } from "./StreamingRedactor";
export { PolicyCompiler, PolicyTemplates } from "./PolicyDSL";
export type { PolicyRule, PolicyDefinition, CompiledPolicy } from "./PolicyDSL";
export { ImageRedactor, ImageRedactionResult, RedactionRegion, VisualPolicy, } from "./core/images";
export { OCRService, OCRResult } from "./core/images";
export type { VisualDetection } from "./core/images";
export { VisualDetector } from "./core/images";
export { DicomStreamTransformer, HIPAA_DICOM_TAGS, anonymizeDicomBuffer, } from "./core/dicom";
export type { DicomAnonymizationRule, DicomTransformerConfig, } from "./core/dicom";
export { CortexPythonBridge } from "./core/cortex/python/CortexPythonBridge";
export type { CortexTask, CortexTaskRequest, CortexTaskResponse, } from "./core/cortex/python/CortexPythonBridge";
export default VulpesCelare;
//# sourceMappingURL=VulpesCelare.d.ts.map