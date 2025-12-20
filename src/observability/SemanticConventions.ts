/**
 * OpenTelemetry Semantic Conventions for PHI Detection
 *
 * Based on OpenTelemetry Semantic Conventions v1.26.0
 * Extended with Vulpes-specific attributes for HIPAA-compliant PHI detection.
 *
 * References:
 * - https://opentelemetry.io/docs/specs/semconv/
 * - https://opentelemetry.io/docs/specs/semconv/attributes-registry/
 * - HIPAA Technical Safeguards (45 CFR 164.312)
 *
 * @module observability/SemanticConventions
 */

// ============================================================================
// Standard OTEL Semantic Conventions
// ============================================================================

/**
 * Service semantic conventions (OTEL standard)
 * @see https://opentelemetry.io/docs/specs/semconv/resource/
 */
export const ServiceAttributes = {
  /** Logical name of the service */
  SERVICE_NAME: "service.name",
  /** Version of the service */
  SERVICE_VERSION: "service.version",
  /** Namespace for the service */
  SERVICE_NAMESPACE: "service.namespace",
  /** Service instance identifier */
  SERVICE_INSTANCE_ID: "service.instance.id",
} as const;

/**
 * Deployment semantic conventions (OTEL standard)
 */
export const DeploymentAttributes = {
  /** Deployment environment (production, staging, development) */
  DEPLOYMENT_ENVIRONMENT: "deployment.environment",
} as const;

/**
 * Exception semantic conventions (OTEL standard)
 * @see https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-spans/
 */
export const ExceptionAttributes = {
  /** Exception type (e.g., "TypeError") */
  EXCEPTION_TYPE: "exception.type",
  /** Exception message */
  EXCEPTION_MESSAGE: "exception.message",
  /** Stack trace as a string */
  EXCEPTION_STACKTRACE: "exception.stacktrace",
  /** Whether the exception escaped the span */
  EXCEPTION_ESCAPED: "exception.escaped",
} as const;

/**
 * Code semantic conventions (OTEL standard)
 * @see https://opentelemetry.io/docs/specs/semconv/attributes-registry/code/
 */
export const CodeAttributes = {
  /** Source code function name */
  CODE_FUNCTION: "code.function",
  /** Source code namespace */
  CODE_NAMESPACE: "code.namespace",
  /** Source code file path */
  CODE_FILEPATH: "code.filepath",
  /** Source code line number */
  CODE_LINENO: "code.lineno",
  /** Source code column number */
  CODE_COLUMN: "code.column",
} as const;

/**
 * Process semantic conventions (OTEL standard)
 * @see https://opentelemetry.io/docs/specs/semconv/resource/process/
 */
export const ProcessAttributes = {
  /** Process identifier */
  PROCESS_PID: "process.pid",
  /** Process executable name */
  PROCESS_EXECUTABLE_NAME: "process.executable.name",
  /** Process command line */
  PROCESS_COMMAND_LINE: "process.command_line",
  /** Process runtime name */
  PROCESS_RUNTIME_NAME: "process.runtime.name",
  /** Process runtime version */
  PROCESS_RUNTIME_VERSION: "process.runtime.version",
} as const;

/**
 * Host semantic conventions (OTEL standard)
 */
export const HostAttributes = {
  /** Host name */
  HOST_NAME: "host.name",
  /** Host type (e.g., "container", "vm") */
  HOST_TYPE: "host.type",
  /** Host architecture (e.g., "amd64", "arm64") */
  HOST_ARCH: "host.arch",
} as const;

/**
 * OS semantic conventions (OTEL standard)
 */
export const OSAttributes = {
  /** OS type (e.g., "linux", "windows", "darwin") */
  OS_TYPE: "os.type",
  /** OS version */
  OS_VERSION: "os.version",
  /** OS name (e.g., "Ubuntu", "Windows 11") */
  OS_NAME: "os.name",
} as const;

// ============================================================================
// Vulpes PHI Detection Semantic Conventions
// ============================================================================

/**
 * PHI operation semantic conventions (Vulpes-specific)
 *
 * Prefix: vulpes.phi.*
 */
export const PHIAttributes = {
  /** Type of PHI operation (detection, redaction, validation) */
  PHI_OPERATION: "vulpes.phi.operation",
  /** PHI type being processed (NAME, SSN, DATE, etc.) */
  PHI_TYPE: "vulpes.phi.type",
  /** Whether PHI was found in the document */
  PHI_DETECTED: "vulpes.phi.detected",
  /** Number of PHI instances found */
  PHI_COUNT: "vulpes.phi.count",
  /** Confidence score (0-1) */
  PHI_CONFIDENCE: "vulpes.phi.confidence",
  /** Whether the span is a true positive */
  PHI_TRUE_POSITIVE: "vulpes.phi.true_positive",
  /** Detection method (pattern, dictionary, ml, ensemble) */
  PHI_DETECTION_METHOD: "vulpes.phi.detection_method",
} as const;

/**
 * Document semantic conventions (Vulpes-specific)
 *
 * Prefix: vulpes.document.*
 */
export const DocumentAttributes = {
  /** Document identifier */
  DOCUMENT_ID: "vulpes.document.id",
  /** Document type (admission_note, discharge_summary, etc.) */
  DOCUMENT_TYPE: "vulpes.document.type",
  /** Document length in characters */
  DOCUMENT_LENGTH: "vulpes.document.length",
  /** Document source system */
  DOCUMENT_SOURCE: "vulpes.document.source",
  /** Document encoding */
  DOCUMENT_ENCODING: "vulpes.document.encoding",
  /** Medical specialty detected */
  DOCUMENT_SPECIALTY: "vulpes.document.specialty",
  /** Document hash (for deduplication) */
  DOCUMENT_HASH: "vulpes.document.hash",
} as const;

/**
 * Filter semantic conventions (Vulpes-specific)
 *
 * Prefix: vulpes.filter.*
 */
export const FilterAttributes = {
  /** Filter name (SmartNameFilter, SSNFilter, etc.) */
  FILTER_NAME: "vulpes.filter.name",
  /** Filter type (NAME, SSN, DATE, etc.) */
  FILTER_TYPE: "vulpes.filter.type",
  /** Filter priority level */
  FILTER_PRIORITY: "vulpes.filter.priority",
  /** Number of spans detected by filter */
  FILTER_SPANS_DETECTED: "vulpes.filter.spans_detected",
  /** Filter execution duration in ms */
  FILTER_DURATION_MS: "vulpes.filter.duration_ms",
  /** Whether filter execution succeeded */
  FILTER_SUCCESS: "vulpes.filter.success",
  /** Filter version */
  FILTER_VERSION: "vulpes.filter.version",
} as const;

/**
 * Pipeline semantic conventions (Vulpes-specific)
 *
 * Prefix: vulpes.pipeline.*
 */
export const PipelineAttributes = {
  /** Pipeline stage name */
  PIPELINE_STAGE: "vulpes.pipeline.stage",
  /** Number of filters in pipeline */
  PIPELINE_FILTER_COUNT: "vulpes.pipeline.filter_count",
  /** Number of filters executed */
  PIPELINE_FILTERS_EXECUTED: "vulpes.pipeline.filters_executed",
  /** Number of filters that failed */
  PIPELINE_FILTERS_FAILED: "vulpes.pipeline.filters_failed",
  /** Total pipeline execution time in ms */
  PIPELINE_EXECUTION_MS: "vulpes.pipeline.execution_ms",
  /** Whether pipeline used cache */
  PIPELINE_CACHE_HIT: "vulpes.pipeline.cache_hit",
} as const;

/**
 * Span/Detection semantic conventions (Vulpes-specific)
 *
 * Prefix: vulpes.span.*
 */
export const SpanAttributes = {
  /** Total spans detected before filtering */
  SPANS_DETECTED: "vulpes.spans.detected",
  /** Spans remaining after filtering */
  SPANS_AFTER_FILTER: "vulpes.spans.after_filter",
  /** Spans actually applied/redacted */
  SPANS_APPLIED: "vulpes.spans.applied",
  /** Spans removed by whitelist */
  SPANS_WHITELISTED: "vulpes.spans.whitelisted",
  /** Spans removed by overlap resolution */
  SPANS_MERGED: "vulpes.spans.merged",
} as const;

/**
 * Cache semantic conventions (Vulpes-specific)
 *
 * Prefix: vulpes.cache.*
 */
export const CacheAttributes = {
  /** Cache operation type (lookup, store) */
  CACHE_OPERATION: "vulpes.cache.operation",
  /** Whether cache hit occurred */
  CACHE_HIT: "vulpes.cache.hit",
  /** Cache key type (exact, structure) */
  CACHE_KEY_TYPE: "vulpes.cache.key_type",
  /** Cache size in entries */
  CACHE_SIZE: "vulpes.cache.size",
  /** Cache hit rate (0-1) */
  CACHE_HIT_RATE: "vulpes.cache.hit_rate",
} as const;

/**
 * ML/Model semantic conventions (Vulpes-specific)
 *
 * Prefix: vulpes.ml.*
 */
export const MLAttributes = {
  /** Model name */
  ML_MODEL_NAME: "vulpes.ml.model_name",
  /** Model version */
  ML_MODEL_VERSION: "vulpes.ml.model_version",
  /** Model precision (fp32, fp16, int8) */
  ML_MODEL_PRECISION: "vulpes.ml.model_precision",
  /** Inference duration in ms */
  ML_INFERENCE_DURATION_MS: "vulpes.ml.inference_duration_ms",
  /** Batch size */
  ML_BATCH_SIZE: "vulpes.ml.batch_size",
  /** Device used (cpu, cuda, directml) */
  ML_DEVICE: "vulpes.ml.device",
} as const;

/**
 * Session semantic conventions (Vulpes-specific)
 *
 * Prefix: vulpes.session.*
 */
export const SessionAttributes = {
  /** Session identifier */
  SESSION_ID: "vulpes.session.id",
  /** User identifier (if available) */
  SESSION_USER_ID: "vulpes.session.user_id",
  /** Purpose of use (treatment, research, marketing) */
  SESSION_PURPOSE: "vulpes.session.purpose",
} as const;

/**
 * HIPAA Audit semantic conventions (Vulpes-specific)
 *
 * Prefix: vulpes.audit.*
 * Based on HIPAA Technical Safeguards (45 CFR 164.312)
 */
export const AuditAttributes = {
  /** Audit event type */
  AUDIT_EVENT_TYPE: "vulpes.audit.event_type",
  /** Actor performing the operation */
  AUDIT_ACTOR: "vulpes.audit.actor",
  /** Action performed (read, write, access) */
  AUDIT_ACTION: "vulpes.audit.action",
  /** Outcome (success, failure) */
  AUDIT_OUTCOME: "vulpes.audit.outcome",
  /** Patient identifier (if applicable, redacted) */
  AUDIT_PATIENT_ID: "vulpes.audit.patient_id",
  /** Timestamp in ISO 8601 format */
  AUDIT_TIMESTAMP: "vulpes.audit.timestamp",
} as const;

// ============================================================================
// Span Names (Standardized)
// ============================================================================

/**
 * Standard span names for Vulpes operations
 */
export const SpanNames = {
  // Pipeline spans
  PIPELINE_ROOT: "phi.redaction.pipeline",
  PIPELINE_CACHE_LOOKUP: "phi.cache.lookup",
  PIPELINE_DFA_PRESCAN: "phi.dfa.prescan",
  PIPELINE_FILTERS_EXECUTE: "phi.filters.execute",
  PIPELINE_WHITELIST: "phi.whitelist.filter",
  PIPELINE_OVERLAP_RESOLVE: "phi.overlap.resolve",
  PIPELINE_POSTFILTER: "phi.postfilter.execute",
  PIPELINE_APPLY_SPANS: "phi.spans.apply",

  // Filter spans (dynamic: phi.filter.{type})
  filterSpan: (filterType: string) => `phi.filter.${filterType.toLowerCase()}`,

  // Detection spans (dynamic: phi.detection.{type})
  detectionSpan: (phiType: string) => `phi.detection.${phiType.toLowerCase()}`,

  // ML spans
  ML_INFERENCE: "phi.ml.inference",
  ML_EMBEDDING: "phi.ml.embedding",
  ML_ENSEMBLE: "phi.ml.ensemble",

  // Cache spans
  CACHE_LOOKUP: "phi.cache.lookup",
  CACHE_STORE: "phi.cache.store",
} as const;

// ============================================================================
// Metric Names (Standardized)
// ============================================================================

/**
 * Standard metric names for Vulpes operations
 */
export const MetricNames = {
  // Span metrics
  SPANS_CREATED: "vulpes.spans.created",
  SPANS_ENDED: "vulpes.spans.ended",
  SPANS_ERRORS: "vulpes.spans.errors",
  SPAN_DURATION: "vulpes.span.duration",

  // Pipeline metrics
  PIPELINE_DURATION: "vulpes.pipeline.duration",
  PIPELINE_DOCUMENTS_PROCESSED: "vulpes.pipeline.documents_processed",
  PIPELINE_FILTER_FAILURES: "vulpes.pipeline.filter_failures",

  // Cache metrics
  CACHE_HITS: "vulpes.cache.hits",
  CACHE_MISSES: "vulpes.cache.misses",
  CACHE_SIZE: "vulpes.cache.size",
  CACHE_EVICTIONS: "vulpes.cache.evictions",

  // PHI metrics
  PHI_DETECTED_TOTAL: "vulpes.phi.detected_total",
  PHI_REDACTED_TOTAL: "vulpes.phi.redacted_total",
  PHI_BY_TYPE: (phiType: string) => `vulpes.phi.by_type.${phiType.toLowerCase()}`,

  // ML metrics
  ML_INFERENCE_DURATION: "vulpes.ml.inference_duration",
  ML_INFERENCE_COUNT: "vulpes.ml.inference_count",
  ML_MODEL_LOAD_TIME: "vulpes.ml.model_load_time",

  // Filter metrics
  FILTER_EXECUTION_TIME: (filterName: string) => `vulpes.filter.${filterName}.duration`,
  FILTER_SPANS_DETECTED: (filterName: string) => `vulpes.filter.${filterName}.spans`,
} as const;

// ============================================================================
// Event Names (Standardized)
// ============================================================================

/**
 * Standard event names for span events
 */
export const EventNames = {
  /** Exception occurred */
  EXCEPTION: "exception",
  /** PHI detected event */
  PHI_DETECTED: "phi.detected",
  /** Cache hit event */
  CACHE_HIT: "cache.hit",
  /** Cache miss event */
  CACHE_MISS: "cache.miss",
  /** Filter completed event */
  FILTER_COMPLETED: "filter.completed",
  /** Validation error event */
  VALIDATION_ERROR: "validation.error",
  /** Configuration change event */
  CONFIG_CHANGE: "config.change",
} as const;

// ============================================================================
// Export All
// ============================================================================

export const SemanticConventions = {
  // Standard OTEL
  Service: ServiceAttributes,
  Deployment: DeploymentAttributes,
  Exception: ExceptionAttributes,
  Code: CodeAttributes,
  Process: ProcessAttributes,
  Host: HostAttributes,
  OS: OSAttributes,

  // Vulpes-specific
  PHI: PHIAttributes,
  Document: DocumentAttributes,
  Filter: FilterAttributes,
  Pipeline: PipelineAttributes,
  Span: SpanAttributes,
  Cache: CacheAttributes,
  ML: MLAttributes,
  Session: SessionAttributes,
  Audit: AuditAttributes,

  // Names
  SpanNames,
  MetricNames,
  EventNames,
} as const;

export default SemanticConventions;
