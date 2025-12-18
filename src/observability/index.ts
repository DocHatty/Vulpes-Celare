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
