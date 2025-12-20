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
/**
 * Service semantic conventions (OTEL standard)
 * @see https://opentelemetry.io/docs/specs/semconv/resource/
 */
export declare const ServiceAttributes: {
    /** Logical name of the service */
    readonly SERVICE_NAME: "service.name";
    /** Version of the service */
    readonly SERVICE_VERSION: "service.version";
    /** Namespace for the service */
    readonly SERVICE_NAMESPACE: "service.namespace";
    /** Service instance identifier */
    readonly SERVICE_INSTANCE_ID: "service.instance.id";
};
/**
 * Deployment semantic conventions (OTEL standard)
 */
export declare const DeploymentAttributes: {
    /** Deployment environment (production, staging, development) */
    readonly DEPLOYMENT_ENVIRONMENT: "deployment.environment";
};
/**
 * Exception semantic conventions (OTEL standard)
 * @see https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-spans/
 */
export declare const ExceptionAttributes: {
    /** Exception type (e.g., "TypeError") */
    readonly EXCEPTION_TYPE: "exception.type";
    /** Exception message */
    readonly EXCEPTION_MESSAGE: "exception.message";
    /** Stack trace as a string */
    readonly EXCEPTION_STACKTRACE: "exception.stacktrace";
    /** Whether the exception escaped the span */
    readonly EXCEPTION_ESCAPED: "exception.escaped";
};
/**
 * Code semantic conventions (OTEL standard)
 * @see https://opentelemetry.io/docs/specs/semconv/attributes-registry/code/
 */
export declare const CodeAttributes: {
    /** Source code function name */
    readonly CODE_FUNCTION: "code.function";
    /** Source code namespace */
    readonly CODE_NAMESPACE: "code.namespace";
    /** Source code file path */
    readonly CODE_FILEPATH: "code.filepath";
    /** Source code line number */
    readonly CODE_LINENO: "code.lineno";
    /** Source code column number */
    readonly CODE_COLUMN: "code.column";
};
/**
 * Process semantic conventions (OTEL standard)
 * @see https://opentelemetry.io/docs/specs/semconv/resource/process/
 */
export declare const ProcessAttributes: {
    /** Process identifier */
    readonly PROCESS_PID: "process.pid";
    /** Process executable name */
    readonly PROCESS_EXECUTABLE_NAME: "process.executable.name";
    /** Process command line */
    readonly PROCESS_COMMAND_LINE: "process.command_line";
    /** Process runtime name */
    readonly PROCESS_RUNTIME_NAME: "process.runtime.name";
    /** Process runtime version */
    readonly PROCESS_RUNTIME_VERSION: "process.runtime.version";
};
/**
 * Host semantic conventions (OTEL standard)
 */
export declare const HostAttributes: {
    /** Host name */
    readonly HOST_NAME: "host.name";
    /** Host type (e.g., "container", "vm") */
    readonly HOST_TYPE: "host.type";
    /** Host architecture (e.g., "amd64", "arm64") */
    readonly HOST_ARCH: "host.arch";
};
/**
 * OS semantic conventions (OTEL standard)
 */
export declare const OSAttributes: {
    /** OS type (e.g., "linux", "windows", "darwin") */
    readonly OS_TYPE: "os.type";
    /** OS version */
    readonly OS_VERSION: "os.version";
    /** OS name (e.g., "Ubuntu", "Windows 11") */
    readonly OS_NAME: "os.name";
};
/**
 * PHI operation semantic conventions (Vulpes-specific)
 *
 * Prefix: vulpes.phi.*
 */
export declare const PHIAttributes: {
    /** Type of PHI operation (detection, redaction, validation) */
    readonly PHI_OPERATION: "vulpes.phi.operation";
    /** PHI type being processed (NAME, SSN, DATE, etc.) */
    readonly PHI_TYPE: "vulpes.phi.type";
    /** Whether PHI was found in the document */
    readonly PHI_DETECTED: "vulpes.phi.detected";
    /** Number of PHI instances found */
    readonly PHI_COUNT: "vulpes.phi.count";
    /** Confidence score (0-1) */
    readonly PHI_CONFIDENCE: "vulpes.phi.confidence";
    /** Whether the span is a true positive */
    readonly PHI_TRUE_POSITIVE: "vulpes.phi.true_positive";
    /** Detection method (pattern, dictionary, ml, ensemble) */
    readonly PHI_DETECTION_METHOD: "vulpes.phi.detection_method";
};
/**
 * Document semantic conventions (Vulpes-specific)
 *
 * Prefix: vulpes.document.*
 */
export declare const DocumentAttributes: {
    /** Document identifier */
    readonly DOCUMENT_ID: "vulpes.document.id";
    /** Document type (admission_note, discharge_summary, etc.) */
    readonly DOCUMENT_TYPE: "vulpes.document.type";
    /** Document length in characters */
    readonly DOCUMENT_LENGTH: "vulpes.document.length";
    /** Document source system */
    readonly DOCUMENT_SOURCE: "vulpes.document.source";
    /** Document encoding */
    readonly DOCUMENT_ENCODING: "vulpes.document.encoding";
    /** Medical specialty detected */
    readonly DOCUMENT_SPECIALTY: "vulpes.document.specialty";
    /** Document hash (for deduplication) */
    readonly DOCUMENT_HASH: "vulpes.document.hash";
};
/**
 * Filter semantic conventions (Vulpes-specific)
 *
 * Prefix: vulpes.filter.*
 */
export declare const FilterAttributes: {
    /** Filter name (SmartNameFilter, SSNFilter, etc.) */
    readonly FILTER_NAME: "vulpes.filter.name";
    /** Filter type (NAME, SSN, DATE, etc.) */
    readonly FILTER_TYPE: "vulpes.filter.type";
    /** Filter priority level */
    readonly FILTER_PRIORITY: "vulpes.filter.priority";
    /** Number of spans detected by filter */
    readonly FILTER_SPANS_DETECTED: "vulpes.filter.spans_detected";
    /** Filter execution duration in ms */
    readonly FILTER_DURATION_MS: "vulpes.filter.duration_ms";
    /** Whether filter execution succeeded */
    readonly FILTER_SUCCESS: "vulpes.filter.success";
    /** Filter version */
    readonly FILTER_VERSION: "vulpes.filter.version";
};
/**
 * Pipeline semantic conventions (Vulpes-specific)
 *
 * Prefix: vulpes.pipeline.*
 */
export declare const PipelineAttributes: {
    /** Pipeline stage name */
    readonly PIPELINE_STAGE: "vulpes.pipeline.stage";
    /** Number of filters in pipeline */
    readonly PIPELINE_FILTER_COUNT: "vulpes.pipeline.filter_count";
    /** Number of filters executed */
    readonly PIPELINE_FILTERS_EXECUTED: "vulpes.pipeline.filters_executed";
    /** Number of filters that failed */
    readonly PIPELINE_FILTERS_FAILED: "vulpes.pipeline.filters_failed";
    /** Total pipeline execution time in ms */
    readonly PIPELINE_EXECUTION_MS: "vulpes.pipeline.execution_ms";
    /** Whether pipeline used cache */
    readonly PIPELINE_CACHE_HIT: "vulpes.pipeline.cache_hit";
};
/**
 * Span/Detection semantic conventions (Vulpes-specific)
 *
 * Prefix: vulpes.span.*
 */
export declare const SpanAttributes: {
    /** Total spans detected before filtering */
    readonly SPANS_DETECTED: "vulpes.spans.detected";
    /** Spans remaining after filtering */
    readonly SPANS_AFTER_FILTER: "vulpes.spans.after_filter";
    /** Spans actually applied/redacted */
    readonly SPANS_APPLIED: "vulpes.spans.applied";
    /** Spans removed by whitelist */
    readonly SPANS_WHITELISTED: "vulpes.spans.whitelisted";
    /** Spans removed by overlap resolution */
    readonly SPANS_MERGED: "vulpes.spans.merged";
};
/**
 * Cache semantic conventions (Vulpes-specific)
 *
 * Prefix: vulpes.cache.*
 */
export declare const CacheAttributes: {
    /** Cache operation type (lookup, store) */
    readonly CACHE_OPERATION: "vulpes.cache.operation";
    /** Whether cache hit occurred */
    readonly CACHE_HIT: "vulpes.cache.hit";
    /** Cache key type (exact, structure) */
    readonly CACHE_KEY_TYPE: "vulpes.cache.key_type";
    /** Cache size in entries */
    readonly CACHE_SIZE: "vulpes.cache.size";
    /** Cache hit rate (0-1) */
    readonly CACHE_HIT_RATE: "vulpes.cache.hit_rate";
};
/**
 * ML/Model semantic conventions (Vulpes-specific)
 *
 * Prefix: vulpes.ml.*
 */
export declare const MLAttributes: {
    /** Model name */
    readonly ML_MODEL_NAME: "vulpes.ml.model_name";
    /** Model version */
    readonly ML_MODEL_VERSION: "vulpes.ml.model_version";
    /** Model precision (fp32, fp16, int8) */
    readonly ML_MODEL_PRECISION: "vulpes.ml.model_precision";
    /** Inference duration in ms */
    readonly ML_INFERENCE_DURATION_MS: "vulpes.ml.inference_duration_ms";
    /** Batch size */
    readonly ML_BATCH_SIZE: "vulpes.ml.batch_size";
    /** Device used (cpu, cuda, directml) */
    readonly ML_DEVICE: "vulpes.ml.device";
};
/**
 * Session semantic conventions (Vulpes-specific)
 *
 * Prefix: vulpes.session.*
 */
export declare const SessionAttributes: {
    /** Session identifier */
    readonly SESSION_ID: "vulpes.session.id";
    /** User identifier (if available) */
    readonly SESSION_USER_ID: "vulpes.session.user_id";
    /** Purpose of use (treatment, research, marketing) */
    readonly SESSION_PURPOSE: "vulpes.session.purpose";
};
/**
 * HIPAA Audit semantic conventions (Vulpes-specific)
 *
 * Prefix: vulpes.audit.*
 * Based on HIPAA Technical Safeguards (45 CFR 164.312)
 */
export declare const AuditAttributes: {
    /** Audit event type */
    readonly AUDIT_EVENT_TYPE: "vulpes.audit.event_type";
    /** Actor performing the operation */
    readonly AUDIT_ACTOR: "vulpes.audit.actor";
    /** Action performed (read, write, access) */
    readonly AUDIT_ACTION: "vulpes.audit.action";
    /** Outcome (success, failure) */
    readonly AUDIT_OUTCOME: "vulpes.audit.outcome";
    /** Patient identifier (if applicable, redacted) */
    readonly AUDIT_PATIENT_ID: "vulpes.audit.patient_id";
    /** Timestamp in ISO 8601 format */
    readonly AUDIT_TIMESTAMP: "vulpes.audit.timestamp";
};
/**
 * Standard span names for Vulpes operations
 */
export declare const SpanNames: {
    readonly PIPELINE_ROOT: "phi.redaction.pipeline";
    readonly PIPELINE_CACHE_LOOKUP: "phi.cache.lookup";
    readonly PIPELINE_DFA_PRESCAN: "phi.dfa.prescan";
    readonly PIPELINE_FILTERS_EXECUTE: "phi.filters.execute";
    readonly PIPELINE_WHITELIST: "phi.whitelist.filter";
    readonly PIPELINE_OVERLAP_RESOLVE: "phi.overlap.resolve";
    readonly PIPELINE_POSTFILTER: "phi.postfilter.execute";
    readonly PIPELINE_APPLY_SPANS: "phi.spans.apply";
    readonly filterSpan: (filterType: string) => string;
    readonly detectionSpan: (phiType: string) => string;
    readonly ML_INFERENCE: "phi.ml.inference";
    readonly ML_EMBEDDING: "phi.ml.embedding";
    readonly ML_ENSEMBLE: "phi.ml.ensemble";
    readonly CACHE_LOOKUP: "phi.cache.lookup";
    readonly CACHE_STORE: "phi.cache.store";
};
/**
 * Standard metric names for Vulpes operations
 */
export declare const MetricNames: {
    readonly SPANS_CREATED: "vulpes.spans.created";
    readonly SPANS_ENDED: "vulpes.spans.ended";
    readonly SPANS_ERRORS: "vulpes.spans.errors";
    readonly SPAN_DURATION: "vulpes.span.duration";
    readonly PIPELINE_DURATION: "vulpes.pipeline.duration";
    readonly PIPELINE_DOCUMENTS_PROCESSED: "vulpes.pipeline.documents_processed";
    readonly PIPELINE_FILTER_FAILURES: "vulpes.pipeline.filter_failures";
    readonly CACHE_HITS: "vulpes.cache.hits";
    readonly CACHE_MISSES: "vulpes.cache.misses";
    readonly CACHE_SIZE: "vulpes.cache.size";
    readonly CACHE_EVICTIONS: "vulpes.cache.evictions";
    readonly PHI_DETECTED_TOTAL: "vulpes.phi.detected_total";
    readonly PHI_REDACTED_TOTAL: "vulpes.phi.redacted_total";
    readonly PHI_BY_TYPE: (phiType: string) => string;
    readonly ML_INFERENCE_DURATION: "vulpes.ml.inference_duration";
    readonly ML_INFERENCE_COUNT: "vulpes.ml.inference_count";
    readonly ML_MODEL_LOAD_TIME: "vulpes.ml.model_load_time";
    readonly FILTER_EXECUTION_TIME: (filterName: string) => string;
    readonly FILTER_SPANS_DETECTED: (filterName: string) => string;
};
/**
 * Standard event names for span events
 */
export declare const EventNames: {
    /** Exception occurred */
    readonly EXCEPTION: "exception";
    /** PHI detected event */
    readonly PHI_DETECTED: "phi.detected";
    /** Cache hit event */
    readonly CACHE_HIT: "cache.hit";
    /** Cache miss event */
    readonly CACHE_MISS: "cache.miss";
    /** Filter completed event */
    readonly FILTER_COMPLETED: "filter.completed";
    /** Validation error event */
    readonly VALIDATION_ERROR: "validation.error";
    /** Configuration change event */
    readonly CONFIG_CHANGE: "config.change";
};
export declare const SemanticConventions: {
    readonly Service: {
        /** Logical name of the service */
        readonly SERVICE_NAME: "service.name";
        /** Version of the service */
        readonly SERVICE_VERSION: "service.version";
        /** Namespace for the service */
        readonly SERVICE_NAMESPACE: "service.namespace";
        /** Service instance identifier */
        readonly SERVICE_INSTANCE_ID: "service.instance.id";
    };
    readonly Deployment: {
        /** Deployment environment (production, staging, development) */
        readonly DEPLOYMENT_ENVIRONMENT: "deployment.environment";
    };
    readonly Exception: {
        /** Exception type (e.g., "TypeError") */
        readonly EXCEPTION_TYPE: "exception.type";
        /** Exception message */
        readonly EXCEPTION_MESSAGE: "exception.message";
        /** Stack trace as a string */
        readonly EXCEPTION_STACKTRACE: "exception.stacktrace";
        /** Whether the exception escaped the span */
        readonly EXCEPTION_ESCAPED: "exception.escaped";
    };
    readonly Code: {
        /** Source code function name */
        readonly CODE_FUNCTION: "code.function";
        /** Source code namespace */
        readonly CODE_NAMESPACE: "code.namespace";
        /** Source code file path */
        readonly CODE_FILEPATH: "code.filepath";
        /** Source code line number */
        readonly CODE_LINENO: "code.lineno";
        /** Source code column number */
        readonly CODE_COLUMN: "code.column";
    };
    readonly Process: {
        /** Process identifier */
        readonly PROCESS_PID: "process.pid";
        /** Process executable name */
        readonly PROCESS_EXECUTABLE_NAME: "process.executable.name";
        /** Process command line */
        readonly PROCESS_COMMAND_LINE: "process.command_line";
        /** Process runtime name */
        readonly PROCESS_RUNTIME_NAME: "process.runtime.name";
        /** Process runtime version */
        readonly PROCESS_RUNTIME_VERSION: "process.runtime.version";
    };
    readonly Host: {
        /** Host name */
        readonly HOST_NAME: "host.name";
        /** Host type (e.g., "container", "vm") */
        readonly HOST_TYPE: "host.type";
        /** Host architecture (e.g., "amd64", "arm64") */
        readonly HOST_ARCH: "host.arch";
    };
    readonly OS: {
        /** OS type (e.g., "linux", "windows", "darwin") */
        readonly OS_TYPE: "os.type";
        /** OS version */
        readonly OS_VERSION: "os.version";
        /** OS name (e.g., "Ubuntu", "Windows 11") */
        readonly OS_NAME: "os.name";
    };
    readonly PHI: {
        /** Type of PHI operation (detection, redaction, validation) */
        readonly PHI_OPERATION: "vulpes.phi.operation";
        /** PHI type being processed (NAME, SSN, DATE, etc.) */
        readonly PHI_TYPE: "vulpes.phi.type";
        /** Whether PHI was found in the document */
        readonly PHI_DETECTED: "vulpes.phi.detected";
        /** Number of PHI instances found */
        readonly PHI_COUNT: "vulpes.phi.count";
        /** Confidence score (0-1) */
        readonly PHI_CONFIDENCE: "vulpes.phi.confidence";
        /** Whether the span is a true positive */
        readonly PHI_TRUE_POSITIVE: "vulpes.phi.true_positive";
        /** Detection method (pattern, dictionary, ml, ensemble) */
        readonly PHI_DETECTION_METHOD: "vulpes.phi.detection_method";
    };
    readonly Document: {
        /** Document identifier */
        readonly DOCUMENT_ID: "vulpes.document.id";
        /** Document type (admission_note, discharge_summary, etc.) */
        readonly DOCUMENT_TYPE: "vulpes.document.type";
        /** Document length in characters */
        readonly DOCUMENT_LENGTH: "vulpes.document.length";
        /** Document source system */
        readonly DOCUMENT_SOURCE: "vulpes.document.source";
        /** Document encoding */
        readonly DOCUMENT_ENCODING: "vulpes.document.encoding";
        /** Medical specialty detected */
        readonly DOCUMENT_SPECIALTY: "vulpes.document.specialty";
        /** Document hash (for deduplication) */
        readonly DOCUMENT_HASH: "vulpes.document.hash";
    };
    readonly Filter: {
        /** Filter name (SmartNameFilter, SSNFilter, etc.) */
        readonly FILTER_NAME: "vulpes.filter.name";
        /** Filter type (NAME, SSN, DATE, etc.) */
        readonly FILTER_TYPE: "vulpes.filter.type";
        /** Filter priority level */
        readonly FILTER_PRIORITY: "vulpes.filter.priority";
        /** Number of spans detected by filter */
        readonly FILTER_SPANS_DETECTED: "vulpes.filter.spans_detected";
        /** Filter execution duration in ms */
        readonly FILTER_DURATION_MS: "vulpes.filter.duration_ms";
        /** Whether filter execution succeeded */
        readonly FILTER_SUCCESS: "vulpes.filter.success";
        /** Filter version */
        readonly FILTER_VERSION: "vulpes.filter.version";
    };
    readonly Pipeline: {
        /** Pipeline stage name */
        readonly PIPELINE_STAGE: "vulpes.pipeline.stage";
        /** Number of filters in pipeline */
        readonly PIPELINE_FILTER_COUNT: "vulpes.pipeline.filter_count";
        /** Number of filters executed */
        readonly PIPELINE_FILTERS_EXECUTED: "vulpes.pipeline.filters_executed";
        /** Number of filters that failed */
        readonly PIPELINE_FILTERS_FAILED: "vulpes.pipeline.filters_failed";
        /** Total pipeline execution time in ms */
        readonly PIPELINE_EXECUTION_MS: "vulpes.pipeline.execution_ms";
        /** Whether pipeline used cache */
        readonly PIPELINE_CACHE_HIT: "vulpes.pipeline.cache_hit";
    };
    readonly Span: {
        /** Total spans detected before filtering */
        readonly SPANS_DETECTED: "vulpes.spans.detected";
        /** Spans remaining after filtering */
        readonly SPANS_AFTER_FILTER: "vulpes.spans.after_filter";
        /** Spans actually applied/redacted */
        readonly SPANS_APPLIED: "vulpes.spans.applied";
        /** Spans removed by whitelist */
        readonly SPANS_WHITELISTED: "vulpes.spans.whitelisted";
        /** Spans removed by overlap resolution */
        readonly SPANS_MERGED: "vulpes.spans.merged";
    };
    readonly Cache: {
        /** Cache operation type (lookup, store) */
        readonly CACHE_OPERATION: "vulpes.cache.operation";
        /** Whether cache hit occurred */
        readonly CACHE_HIT: "vulpes.cache.hit";
        /** Cache key type (exact, structure) */
        readonly CACHE_KEY_TYPE: "vulpes.cache.key_type";
        /** Cache size in entries */
        readonly CACHE_SIZE: "vulpes.cache.size";
        /** Cache hit rate (0-1) */
        readonly CACHE_HIT_RATE: "vulpes.cache.hit_rate";
    };
    readonly ML: {
        /** Model name */
        readonly ML_MODEL_NAME: "vulpes.ml.model_name";
        /** Model version */
        readonly ML_MODEL_VERSION: "vulpes.ml.model_version";
        /** Model precision (fp32, fp16, int8) */
        readonly ML_MODEL_PRECISION: "vulpes.ml.model_precision";
        /** Inference duration in ms */
        readonly ML_INFERENCE_DURATION_MS: "vulpes.ml.inference_duration_ms";
        /** Batch size */
        readonly ML_BATCH_SIZE: "vulpes.ml.batch_size";
        /** Device used (cpu, cuda, directml) */
        readonly ML_DEVICE: "vulpes.ml.device";
    };
    readonly Session: {
        /** Session identifier */
        readonly SESSION_ID: "vulpes.session.id";
        /** User identifier (if available) */
        readonly SESSION_USER_ID: "vulpes.session.user_id";
        /** Purpose of use (treatment, research, marketing) */
        readonly SESSION_PURPOSE: "vulpes.session.purpose";
    };
    readonly Audit: {
        /** Audit event type */
        readonly AUDIT_EVENT_TYPE: "vulpes.audit.event_type";
        /** Actor performing the operation */
        readonly AUDIT_ACTOR: "vulpes.audit.actor";
        /** Action performed (read, write, access) */
        readonly AUDIT_ACTION: "vulpes.audit.action";
        /** Outcome (success, failure) */
        readonly AUDIT_OUTCOME: "vulpes.audit.outcome";
        /** Patient identifier (if applicable, redacted) */
        readonly AUDIT_PATIENT_ID: "vulpes.audit.patient_id";
        /** Timestamp in ISO 8601 format */
        readonly AUDIT_TIMESTAMP: "vulpes.audit.timestamp";
    };
    readonly SpanNames: {
        readonly PIPELINE_ROOT: "phi.redaction.pipeline";
        readonly PIPELINE_CACHE_LOOKUP: "phi.cache.lookup";
        readonly PIPELINE_DFA_PRESCAN: "phi.dfa.prescan";
        readonly PIPELINE_FILTERS_EXECUTE: "phi.filters.execute";
        readonly PIPELINE_WHITELIST: "phi.whitelist.filter";
        readonly PIPELINE_OVERLAP_RESOLVE: "phi.overlap.resolve";
        readonly PIPELINE_POSTFILTER: "phi.postfilter.execute";
        readonly PIPELINE_APPLY_SPANS: "phi.spans.apply";
        readonly filterSpan: (filterType: string) => string;
        readonly detectionSpan: (phiType: string) => string;
        readonly ML_INFERENCE: "phi.ml.inference";
        readonly ML_EMBEDDING: "phi.ml.embedding";
        readonly ML_ENSEMBLE: "phi.ml.ensemble";
        readonly CACHE_LOOKUP: "phi.cache.lookup";
        readonly CACHE_STORE: "phi.cache.store";
    };
    readonly MetricNames: {
        readonly SPANS_CREATED: "vulpes.spans.created";
        readonly SPANS_ENDED: "vulpes.spans.ended";
        readonly SPANS_ERRORS: "vulpes.spans.errors";
        readonly SPAN_DURATION: "vulpes.span.duration";
        readonly PIPELINE_DURATION: "vulpes.pipeline.duration";
        readonly PIPELINE_DOCUMENTS_PROCESSED: "vulpes.pipeline.documents_processed";
        readonly PIPELINE_FILTER_FAILURES: "vulpes.pipeline.filter_failures";
        readonly CACHE_HITS: "vulpes.cache.hits";
        readonly CACHE_MISSES: "vulpes.cache.misses";
        readonly CACHE_SIZE: "vulpes.cache.size";
        readonly CACHE_EVICTIONS: "vulpes.cache.evictions";
        readonly PHI_DETECTED_TOTAL: "vulpes.phi.detected_total";
        readonly PHI_REDACTED_TOTAL: "vulpes.phi.redacted_total";
        readonly PHI_BY_TYPE: (phiType: string) => string;
        readonly ML_INFERENCE_DURATION: "vulpes.ml.inference_duration";
        readonly ML_INFERENCE_COUNT: "vulpes.ml.inference_count";
        readonly ML_MODEL_LOAD_TIME: "vulpes.ml.model_load_time";
        readonly FILTER_EXECUTION_TIME: (filterName: string) => string;
        readonly FILTER_SPANS_DETECTED: (filterName: string) => string;
    };
    readonly EventNames: {
        /** Exception occurred */
        readonly EXCEPTION: "exception";
        /** PHI detected event */
        readonly PHI_DETECTED: "phi.detected";
        /** Cache hit event */
        readonly CACHE_HIT: "cache.hit";
        /** Cache miss event */
        readonly CACHE_MISS: "cache.miss";
        /** Filter completed event */
        readonly FILTER_COMPLETED: "filter.completed";
        /** Validation error event */
        readonly VALIDATION_ERROR: "validation.error";
        /** Configuration change event */
        readonly CONFIG_CHANGE: "config.change";
    };
};
export default SemanticConventions;
//# sourceMappingURL=SemanticConventions.d.ts.map