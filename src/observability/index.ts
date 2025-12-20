/**
 * Vulpes Celare - Observability Module
 *
 * OpenTelemetry-compatible distributed tracing, metrics, and log correlation.
 */

export {
  VulpesTracer,
  vulpesTracer,
  configureTracer,
  MetricsCollector,
  type Span,
  type SpanContext,
  type SpanAttributes,
  type SpanEvent,
  type SpanLink,
  type SpanStatus,
  type TracerConfig,
  type ExporterConfig,
  type ExporterType,
  type TraceContext,
  type Metric,
  type MetricValue,
  type ResourceAttributes,
} from "./VulpesTracer";

// Semantic Conventions (OTEL + Vulpes-specific)
export {
  SemanticConventions,
  ServiceAttributes,
  DeploymentAttributes,
  ExceptionAttributes,
  CodeAttributes,
  ProcessAttributes,
  HostAttributes,
  OSAttributes,
  PHIAttributes,
  DocumentAttributes,
  FilterAttributes,
  PipelineAttributes,
  SpanAttributes as VulpesSpanAttributes,
  CacheAttributes,
  MLAttributes,
  SessionAttributes,
  AuditAttributes,
  SpanNames,
  MetricNames,
  EventNames,
} from "./SemanticConventions";

// Smart Sampling Strategies
export {
  createDefaultSampler,
  RateSampler,
  ParentBasedSampler,
  AlwaysSampler,
  NeverSampler,
  ErrorBiasedSampler,
  LatencyBasedSampler,
  AdaptiveSampler,
  RuleBasedSampler,
  CompositeSampler,
  PHIAwareSampler,
  type Sampler,
  type SamplingContext,
  type SamplingDecision,
  type SamplingReason,
  type SamplingRule,
} from "./SmartSampler";
