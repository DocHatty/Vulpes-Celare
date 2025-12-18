/**
 * Vulpes Celare - Structured Error System
 *
 * Elite-level error handling with:
 * - Unique error codes (VULPES_E###)
 * - Human-readable messages with context
 * - Actionable resolution steps
 * - Documentation links
 * - Machine-parseable JSON output
 */
export type ErrorSeverity = "fatal" | "error" | "warning" | "info";
export type ErrorCategory = "configuration" | "validation" | "runtime" | "network" | "filesystem" | "security" | "compliance" | "detection" | "pipeline" | "integration";
export interface ErrorContext {
    [key: string]: unknown;
    file?: string;
    line?: number;
    column?: number;
    input?: string;
    expected?: string;
    actual?: string;
    phiType?: string;
    stage?: string;
    filter?: string;
}
export interface VulpesErrorOptions {
    code: string;
    title: string;
    description: string;
    category: ErrorCategory;
    severity?: ErrorSeverity;
    reason?: string;
    resolution?: string[];
    docUrl?: string;
    context?: ErrorContext;
    cause?: Error;
    recoverable?: boolean;
}
export declare const ERROR_CODES: {
    readonly CONFIG_INVALID: "VULPES_E001";
    readonly CONFIG_MISSING: "VULPES_E002";
    readonly CONFIG_PARSE_ERROR: "VULPES_E003";
    readonly CONFIG_VALIDATION_FAILED: "VULPES_E004";
    readonly CONFIG_DEPRECATED: "VULPES_E005";
    readonly VALIDATION_FAILED: "VULPES_E100";
    readonly INVALID_INPUT: "VULPES_E101";
    readonly INVALID_PHI_TYPE: "VULPES_E102";
    readonly INVALID_PATTERN: "VULPES_E103";
    readonly INVALID_THRESHOLD: "VULPES_E104";
    readonly EMPTY_INPUT: "VULPES_E105";
    readonly RUNTIME_ERROR: "VULPES_E200";
    readonly TIMEOUT: "VULPES_E201";
    readonly MEMORY_EXCEEDED: "VULPES_E202";
    readonly STACK_OVERFLOW: "VULPES_E203";
    readonly ASYNC_ERROR: "VULPES_E204";
    readonly NETWORK_ERROR: "VULPES_E300";
    readonly CONNECTION_REFUSED: "VULPES_E301";
    readonly TIMEOUT_NETWORK: "VULPES_E302";
    readonly DNS_RESOLUTION_FAILED: "VULPES_E303";
    readonly SSL_ERROR: "VULPES_E304";
    readonly FILE_NOT_FOUND: "VULPES_E400";
    readonly PERMISSION_DENIED: "VULPES_E401";
    readonly DISK_FULL: "VULPES_E402";
    readonly FILE_LOCKED: "VULPES_E403";
    readonly INVALID_PATH: "VULPES_E404";
    readonly FILE_TOO_LARGE: "VULPES_E405";
    readonly SECURITY_VIOLATION: "VULPES_E500";
    readonly UNAUTHORIZED: "VULPES_E501";
    readonly FORBIDDEN: "VULPES_E502";
    readonly AUDIT_FAILURE: "VULPES_E503";
    readonly ENCRYPTION_FAILED: "VULPES_E504";
    readonly DECRYPTION_FAILED: "VULPES_E505";
    readonly INTEGRITY_CHECK_FAILED: "VULPES_E506";
    readonly HIPAA_VIOLATION: "VULPES_E600";
    readonly RETENTION_POLICY_VIOLATION: "VULPES_E601";
    readonly LEGAL_HOLD_ACTIVE: "VULPES_E602";
    readonly AUDIT_TRAIL_INCOMPLETE: "VULPES_E603";
    readonly PHI_EXPOSURE_RISK: "VULPES_E604";
    readonly DETECTION_FAILED: "VULPES_E700";
    readonly FILTER_ERROR: "VULPES_E701";
    readonly PATTERN_COMPILATION_FAILED: "VULPES_E702";
    readonly DICTIONARY_LOAD_FAILED: "VULPES_E703";
    readonly CONFIDENCE_CALCULATION_ERROR: "VULPES_E704";
    readonly SPAN_CONFLICT: "VULPES_E705";
    readonly PIPELINE_ERROR: "VULPES_E800";
    readonly STAGE_FAILED: "VULPES_E801";
    readonly ORCHESTRATION_ERROR: "VULPES_E802";
    readonly PARALLEL_EXECUTION_FAILED: "VULPES_E803";
    readonly POST_FILTER_ERROR: "VULPES_E804";
    readonly INTEGRATION_ERROR: "VULPES_E900";
    readonly MCP_ERROR: "VULPES_E901";
    readonly FHIR_EXPORT_FAILED: "VULPES_E902";
    readonly BLOCKCHAIN_ANCHOR_FAILED: "VULPES_E903";
    readonly OTEL_EXPORT_FAILED: "VULPES_E904";
    readonly EXTERNAL_SERVICE_ERROR: "VULPES_E905";
};
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
export declare class VulpesError extends Error {
    readonly code: string;
    readonly title: string;
    readonly description: string;
    readonly category: ErrorCategory;
    readonly severity: ErrorSeverity;
    readonly reason?: string;
    readonly resolution: string[];
    readonly docUrl?: string;
    readonly context: ErrorContext;
    readonly cause?: Error;
    readonly recoverable: boolean;
    readonly timestamp: string;
    readonly correlationId: string;
    constructor(options: VulpesErrorOptions);
    private generateDocUrl;
    private generateCorrelationId;
    toHumanReadable(useColor?: boolean): string;
    private wrapText;
    private formatContextValue;
    private getSeverityIcon;
    private getColorFunctions;
    private getNoColorFunctions;
    toJSON(): object;
    toString(): string;
    withContext(additionalContext: ErrorContext): VulpesError;
    withResolution(steps: string[]): VulpesError;
    static isVulpesError(error: unknown): error is VulpesError;
    static fromError(error: Error, defaults?: Partial<VulpesErrorOptions>): VulpesError;
}
export declare function createConfigError(message: string, options?: Partial<VulpesErrorOptions>): VulpesError;
export declare function createValidationError(message: string, options?: Partial<VulpesErrorOptions>): VulpesError;
export declare function createFileError(message: string, filePath: string, options?: Partial<VulpesErrorOptions>): VulpesError;
export declare function createSecurityError(message: string, options?: Partial<VulpesErrorOptions>): VulpesError;
export declare function createComplianceError(message: string, options?: Partial<VulpesErrorOptions>): VulpesError;
export declare function createDetectionError(message: string, phiType?: string, options?: Partial<VulpesErrorOptions>): VulpesError;
export declare function createPipelineError(message: string, stage?: string, options?: Partial<VulpesErrorOptions>): VulpesError;
export declare function createIntegrationError(message: string, service: string, options?: Partial<VulpesErrorOptions>): VulpesError;
export declare class ErrorAggregator {
    private errors;
    add(error: VulpesError): void;
    addFromError(error: Error, defaults?: Partial<VulpesErrorOptions>): void;
    hasErrors(): boolean;
    hasFatalErrors(): boolean;
    getErrors(): VulpesError[];
    getByCategory(category: ErrorCategory): VulpesError[];
    getBySeverity(severity: ErrorSeverity): VulpesError[];
    clear(): void;
    toSummary(): string;
    toJSON(): object[];
}
//# sourceMappingURL=VulpesError.d.ts.map