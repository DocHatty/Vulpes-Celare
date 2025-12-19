/**
 * Vulpes Celare - OpenTelemetry Integration
 *
 * Full OTel SDK integration for distributed tracing, metrics, and log correlation.
 * Bridges with existing PipelineTracer for seamless integration.
 */

import { EventEmitter } from "events";
import * as crypto from "crypto";

// ============================================================================
// Types
// ============================================================================

export type SpanStatus = "unset" | "ok" | "error";

export interface SpanAttributes {
  [key: string]: string | number | boolean | string[] | number[] | boolean[];
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: SpanAttributes;
}

export interface SpanLink {
  traceId: string;
  spanId: string;
  attributes?: SpanAttributes;
}

export interface SpanContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
  traceState?: string;
}

export interface Span {
  readonly name: string;
  readonly spanId: string;
  readonly traceId: string;
  readonly parentSpanId?: string;
  readonly startTime: number;
  endTime?: number;
  status: SpanStatus;
  statusMessage?: string;
  attributes: SpanAttributes;
  events: SpanEvent[];
  links: SpanLink[];

  // Methods
  setAttribute(key: string, value: SpanAttributes[keyof SpanAttributes]): this;
  setAttributes(attributes: SpanAttributes): this;
  addEvent(name: string, attributes?: SpanAttributes): this;
  addLink(link: SpanLink): this;
  setStatus(status: SpanStatus, message?: string): this;
  end(endTime?: number): void;
  isRecording(): boolean;
  getContext(): SpanContext;
}

export interface TracerConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  exporters?: ExporterConfig[];
  samplingRate?: number;
  maxSpansPerTrace?: number;
  flushInterval?: number;
}

export type ExporterType = "otlp" | "console" | "memory" | "file";

export interface ExporterConfig {
  type: ExporterType;
  endpoint?: string;
  headers?: Record<string, string>;
  filePath?: string;
  compression?: "gzip" | "none";
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
}

export interface MetricValue {
  value: number;
  timestamp: number;
  attributes?: SpanAttributes;
}

export interface Metric {
  name: string;
  description?: string;
  unit?: string;
  type: "counter" | "gauge" | "histogram";
  values: MetricValue[];
}

export interface ResourceAttributes {
  "service.name": string;
  "service.version"?: string;
  "service.namespace"?: string;
  "deployment.environment"?: string;
  "host.name"?: string;
  "os.type"?: string;
  "process.pid"?: number;
  "telemetry.sdk.name": string;
  "telemetry.sdk.version": string;
  "telemetry.sdk.language": string;
  [key: string]: string | number | boolean | undefined;
}

// ============================================================================
// Span Implementation
// ============================================================================

class VulpesSpan implements Span {
  readonly name: string;
  readonly spanId: string;
  readonly traceId: string;
  readonly parentSpanId?: string;
  readonly startTime: number;
  endTime?: number;
  status: SpanStatus = "unset";
  statusMessage?: string;
  attributes: SpanAttributes = {};
  events: SpanEvent[] = [];
  links: SpanLink[] = [];

  private recording = true;
  private readonly tracer: VulpesTracer;

  constructor(
    tracer: VulpesTracer,
    name: string,
    traceId: string,
    parentSpanId?: string,
    links?: SpanLink[],
    startTime?: number
  ) {
    this.tracer = tracer;
    this.name = name;
    this.traceId = traceId;
    this.spanId = this.generateSpanId();
    this.parentSpanId = parentSpanId;
    this.startTime = startTime ?? Date.now();
    if (links) {
      this.links = links;
    }
  }

  private generateSpanId(): string {
    return crypto.randomBytes(8).toString("hex");
  }

  setAttribute(key: string, value: SpanAttributes[keyof SpanAttributes]): this {
    if (this.recording) {
      this.attributes[key] = value;
    }
    return this;
  }

  setAttributes(attributes: SpanAttributes): this {
    if (this.recording) {
      Object.assign(this.attributes, attributes);
    }
    return this;
  }

  addEvent(name: string, attributes?: SpanAttributes): this {
    if (this.recording) {
      this.events.push({
        name,
        timestamp: Date.now(),
        attributes,
      });
    }
    return this;
  }

  addLink(link: SpanLink): this {
    if (this.recording) {
      this.links.push(link);
    }
    return this;
  }

  setStatus(status: SpanStatus, message?: string): this {
    if (this.recording) {
      this.status = status;
      this.statusMessage = message;
    }
    return this;
  }

  end(endTime?: number): void {
    if (!this.recording) return;

    this.endTime = endTime ?? Date.now();
    this.recording = false;
    this.tracer.onSpanEnd(this);
  }

  isRecording(): boolean {
    return this.recording;
  }

  getContext(): SpanContext {
    return {
      traceId: this.traceId,
      spanId: this.spanId,
      traceFlags: 1, // sampled
    };
  }

  toJSON(): object {
    return {
      name: this.name,
      traceId: this.traceId,
      spanId: this.spanId,
      parentSpanId: this.parentSpanId,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.endTime ? this.endTime - this.startTime : undefined,
      status: this.status,
      statusMessage: this.statusMessage,
      attributes: this.attributes,
      events: this.events,
      links: this.links,
    };
  }
}

// ============================================================================
// Context Management
// ============================================================================

class ContextManager {
  private contextStack: TraceContext[] = [];

  getCurrent(): TraceContext | undefined {
    return this.contextStack[this.contextStack.length - 1];
  }

  with<T>(context: TraceContext, fn: () => T): T {
    this.contextStack.push(context);
    try {
      return fn();
    } finally {
      this.contextStack.pop();
    }
  }

  async withAsync<T>(context: TraceContext, fn: () => Promise<T>): Promise<T> {
    this.contextStack.push(context);
    try {
      return await fn();
    } finally {
      this.contextStack.pop();
    }
  }

  bind<T extends (...args: unknown[]) => unknown>(
    context: TraceContext,
    fn: T
  ): T {
    return ((...args: Parameters<T>) => {
      return this.with(context, () => fn(...args));
    }) as T;
  }
}

// ============================================================================
// Exporters
// ============================================================================

interface SpanExporter {
  export(spans: VulpesSpan[]): Promise<void>;
  shutdown(): Promise<void>;
}

class ConsoleExporter implements SpanExporter {
  async export(spans: VulpesSpan[]): Promise<void> {
    for (const span of spans) {
      const duration = span.endTime
        ? `${span.endTime - span.startTime}ms`
        : "ongoing";
      // Use process.stderr for trace output to avoid polluting stdout
      process.stderr.write(
        `[TRACE] ${span.name} (${span.spanId}) - ${duration} - ${span.status}\n`
      );
    }
  }

  async shutdown(): Promise<void> {
    // No-op
  }
}

class MemoryExporter implements SpanExporter {
  private spans: VulpesSpan[] = [];

  async export(spans: VulpesSpan[]): Promise<void> {
    this.spans.push(...spans);
  }

  async shutdown(): Promise<void> {
    // No-op
  }

  getSpans(): VulpesSpan[] {
    return [...this.spans];
  }

  clear(): void {
    this.spans = [];
  }
}

class OTLPExporter implements SpanExporter {
  private readonly endpoint: string;
  private readonly headers: Record<string, string>;
  private readonly compression: "gzip" | "none";

  constructor(config: ExporterConfig) {
    this.endpoint = config.endpoint ?? "http://localhost:4318/v1/traces";
    this.headers = config.headers ?? {};
    this.compression = config.compression ?? "none";
  }

  async export(spans: VulpesSpan[]): Promise<void> {
    if (spans.length === 0) return;

    const payload = this.buildOTLPPayload(spans);

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.headers,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        process.stderr.write(
          `[VulpesTracer] OTLP export failed: ${response.status} ${response.statusText}\n`
        );
      }
    } catch (error) {
      process.stderr.write(`[VulpesTracer] OTLP export error: ${error}\n`);
    }
  }

  private buildOTLPPayload(spans: VulpesSpan[]): object {
    return {
      resourceSpans: [
        {
          resource: {
            attributes: this.resourceToAttributes(),
          },
          scopeSpans: [
            {
              scope: {
                name: "vulpes-celare",
                version: "1.0.0",
              },
              spans: spans.map((span) => this.spanToOTLP(span)),
            },
          ],
        },
      ],
    };
  }

  private resourceToAttributes(): object[] {
    return [
      { key: "service.name", value: { stringValue: "vulpes-celare" } },
      { key: "telemetry.sdk.name", value: { stringValue: "vulpes-tracer" } },
      { key: "telemetry.sdk.language", value: { stringValue: "nodejs" } },
    ];
  }

  private spanToOTLP(span: VulpesSpan): object {
    return {
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      name: span.name,
      kind: 1, // INTERNAL
      startTimeUnixNano: span.startTime * 1_000_000,
      endTimeUnixNano: span.endTime ? span.endTime * 1_000_000 : undefined,
      attributes: Object.entries(span.attributes).map(([key, value]) => ({
        key,
        value: this.toOTLPValue(value),
      })),
      events: span.events.map((event) => ({
        name: event.name,
        timeUnixNano: event.timestamp * 1_000_000,
        attributes: event.attributes
          ? Object.entries(event.attributes).map(([key, value]) => ({
              key,
              value: this.toOTLPValue(value),
            }))
          : [],
      })),
      status: {
        code: span.status === "error" ? 2 : span.status === "ok" ? 1 : 0,
        message: span.statusMessage,
      },
    };
  }

  private toOTLPValue(
    value: SpanAttributes[keyof SpanAttributes]
  ): object {
    if (typeof value === "string") {
      return { stringValue: value };
    } else if (typeof value === "number") {
      return Number.isInteger(value)
        ? { intValue: value }
        : { doubleValue: value };
    } else if (typeof value === "boolean") {
      return { boolValue: value };
    } else if (Array.isArray(value)) {
      return {
        arrayValue: {
          values: value.map((v) => this.toOTLPValue(v as string | number | boolean)),
        },
      };
    }
    return { stringValue: String(value) };
  }

  async shutdown(): Promise<void> {
    // Flush any remaining spans
  }
}

class FileExporter implements SpanExporter {
  private readonly filePath: string;
  private buffer: VulpesSpan[] = [];

  constructor(config: ExporterConfig) {
    this.filePath = config.filePath ?? "./traces.jsonl";
  }

  async export(spans: VulpesSpan[]): Promise<void> {
    const fs = await import("fs").then((m) => m.promises);

    const lines = spans.map((span) => JSON.stringify(span.toJSON())).join("\n") + "\n";

    await fs.appendFile(this.filePath, lines, "utf-8");
  }

  async shutdown(): Promise<void> {
    // No-op
  }
}

// ============================================================================
// Metrics Collector
// ============================================================================

export class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  incrementCounter(name: string, value = 1, attributes?: SpanAttributes): void {
    const key = this.makeKey(name, attributes);
    this.counters.set(key, (this.counters.get(key) ?? 0) + value);
  }

  setGauge(name: string, value: number, attributes?: SpanAttributes): void {
    const key = this.makeKey(name, attributes);
    this.gauges.set(key, value);
  }

  recordHistogram(name: string, value: number, attributes?: SpanAttributes): void {
    const key = this.makeKey(name, attributes);
    const values = this.histograms.get(key) ?? [];
    values.push(value);
    this.histograms.set(key, values);
  }

  private makeKey(name: string, attributes?: SpanAttributes): string {
    if (!attributes) return name;
    const sortedAttrs = Object.entries(attributes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(",");
    return `${name}{${sortedAttrs}}`;
  }

  getMetrics(): Metric[] {
    const metrics: Metric[] = [];

    for (const [key, value] of this.counters) {
      metrics.push({
        name: key,
        type: "counter",
        values: [{ value, timestamp: Date.now() }],
      });
    }

    for (const [key, value] of this.gauges) {
      metrics.push({
        name: key,
        type: "gauge",
        values: [{ value, timestamp: Date.now() }],
      });
    }

    for (const [key, values] of this.histograms) {
      metrics.push({
        name: key,
        type: "histogram",
        values: values.map((v) => ({ value: v, timestamp: Date.now() })),
      });
    }

    return metrics;
  }

  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

// ============================================================================
// VulpesTracer - Main Class
// ============================================================================

export class VulpesTracer extends EventEmitter {
  private static instance: VulpesTracer | null = null;

  private readonly config: Required<TracerConfig>;
  private readonly contextManager: ContextManager;
  private readonly exporters: SpanExporter[] = [];
  private readonly metrics: MetricsCollector;
  private readonly spanBuffer: VulpesSpan[] = [];
  private readonly activeSpans: Map<string, VulpesSpan> = new Map();

  private flushTimer?: NodeJS.Timeout;
  private isShutdown = false;

  private constructor(config: TracerConfig) {
    super();

    this.config = {
      serviceName: config.serviceName,
      serviceVersion: config.serviceVersion ?? "1.0.0",
      environment: config.environment ?? process.env.NODE_ENV ?? "development",
      exporters: config.exporters ?? [{ type: "console" }],
      samplingRate: config.samplingRate ?? 1.0,
      maxSpansPerTrace: config.maxSpansPerTrace ?? 1000,
      flushInterval: config.flushInterval ?? 5000,
    };

    this.contextManager = new ContextManager();
    this.metrics = new MetricsCollector();

    this.initializeExporters();
    this.startFlushTimer();
  }

  static getInstance(config?: TracerConfig): VulpesTracer {
    if (!VulpesTracer.instance) {
      VulpesTracer.instance = new VulpesTracer(
        config ?? { serviceName: "vulpes-celare" }
      );
    }
    return VulpesTracer.instance;
  }

  static resetInstance(): void {
    if (VulpesTracer.instance) {
      VulpesTracer.instance.shutdown();
      VulpesTracer.instance = null;
    }
  }

  private initializeExporters(): void {
    for (const exporterConfig of this.config.exporters) {
      switch (exporterConfig.type) {
        case "console":
          this.exporters.push(new ConsoleExporter());
          break;
        case "memory":
          this.exporters.push(new MemoryExporter());
          break;
        case "otlp":
          this.exporters.push(new OTLPExporter(exporterConfig));
          break;
        case "file":
          this.exporters.push(new FileExporter(exporterConfig));
          break;
      }
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);

    // Don't prevent process exit
    this.flushTimer.unref();
  }

  // ============================================================================
  // Span Creation
  // ============================================================================

  startSpan(
    name: string,
    options?: {
      attributes?: SpanAttributes;
      links?: SpanLink[];
      startTime?: number;
    }
  ): Span {
    if (this.isShutdown) {
      throw new Error("Tracer has been shut down");
    }

    // Sampling decision
    if (Math.random() > this.config.samplingRate) {
      // Return a no-op span
      return this.createNoOpSpan(name);
    }

    const currentContext = this.contextManager.getCurrent();
    const traceId = currentContext?.traceId ?? this.generateTraceId();
    const parentSpanId = currentContext?.spanId;

    const span = new VulpesSpan(
      this,
      name,
      traceId,
      parentSpanId,
      options?.links,
      options?.startTime
    );

    if (options?.attributes) {
      span.setAttributes(options.attributes);
    }

    this.activeSpans.set(span.spanId, span);
    this.metrics.incrementCounter("vulpes.spans.created");

    return span;
  }

  private createNoOpSpan(name: string): Span {
    const noOpSpan: Span = {
      name,
      spanId: "0000000000000000",
      traceId: "00000000000000000000000000000000",
      startTime: Date.now(),
      status: "unset",
      attributes: {},
      events: [],
      links: [],
      setAttribute: () => noOpSpan,
      setAttributes: () => noOpSpan,
      addEvent: () => noOpSpan,
      addLink: () => noOpSpan,
      setStatus: () => noOpSpan,
      end: () => {},
      isRecording: () => false,
      getContext: () => ({
        traceId: "00000000000000000000000000000000",
        spanId: "0000000000000000",
        traceFlags: 0,
      }),
    };
    return noOpSpan;
  }

  private generateTraceId(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  // ============================================================================
  // Span Lifecycle
  // ============================================================================

  onSpanEnd(span: VulpesSpan): void {
    this.activeSpans.delete(span.spanId);
    this.spanBuffer.push(span);
    this.metrics.incrementCounter("vulpes.spans.ended");

    const duration = span.endTime! - span.startTime;
    this.metrics.recordHistogram("vulpes.span.duration", duration, {
      name: span.name,
    });

    if (span.status === "error") {
      this.metrics.incrementCounter("vulpes.spans.errors", 1, {
        name: span.name,
      });
    }

    this.emit("spanEnd", span);
  }

  // ============================================================================
  // Context Propagation
  // ============================================================================

  withSpan<T>(span: Span, fn: () => T): T {
    const context: TraceContext = {
      traceId: span.traceId,
      spanId: span.spanId,
      sampled: span.isRecording(),
    };
    return this.contextManager.with(context, fn);
  }

  async withSpanAsync<T>(span: Span, fn: () => Promise<T>): Promise<T> {
    const context: TraceContext = {
      traceId: span.traceId,
      spanId: span.spanId,
      sampled: span.isRecording(),
    };
    return this.contextManager.withAsync(context, fn);
  }

  getCurrentContext(): TraceContext | undefined {
    return this.contextManager.getCurrent();
  }

  // ============================================================================
  // Log Correlation
  // ============================================================================

  getLogContext(): { traceId: string; spanId: string } | null {
    const context = this.contextManager.getCurrent();
    if (!context) return null;

    return {
      traceId: context.traceId,
      spanId: context.spanId,
    };
  }

  injectTraceContext(carrier: Record<string, string>): void {
    const context = this.contextManager.getCurrent();
    if (!context) return;

    // W3C Trace Context format
    carrier["traceparent"] = `00-${context.traceId}-${context.spanId}-01`;
  }

  extractTraceContext(carrier: Record<string, string>): TraceContext | null {
    const traceparent = carrier["traceparent"];
    if (!traceparent) return null;

    const parts = traceparent.split("-");
    if (parts.length < 4) return null;

    return {
      traceId: parts[1],
      spanId: parts[2],
      sampled: parts[3] === "01",
    };
  }

  // ============================================================================
  // Pipeline Tracer Integration
  // ============================================================================

  integrateWithPipelineTracer(pipelineTracer: {
    on: (event: string, handler: (...args: unknown[]) => void) => void;
  }): void {
    // Bridge PipelineTracer events to OTel spans
    pipelineTracer.on("stageStart", (...args: unknown[]) => {
      const stageName = args[0] as string;
      const span = this.startSpan(`pipeline.${stageName}`, {
        attributes: {
          "vulpes.stage": stageName,
          "vulpes.component": "pipeline",
        },
      });
      this.activeSpans.set(`pipeline.${stageName}`, span as VulpesSpan);
    });

    pipelineTracer.on("stageEnd", (...args: unknown[]) => {
      const stageName = args[0] as string;
      const span = this.activeSpans.get(`pipeline.${stageName}`);
      if (span) {
        span.setStatus("ok");
        span.end();
      }
    });

    pipelineTracer.on("error", (...args: unknown[]) => {
      const stageName = args[0] as string;
      const error = args[1] as Error;
      const span = this.activeSpans.get(`pipeline.${stageName}`);
      if (span) {
        span.setStatus("error", error.message);
        span.addEvent("exception", {
          "exception.type": error.name,
          "exception.message": error.message,
          "exception.stacktrace": error.stack ?? "",
        });
        span.end();
      }
    });
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  async trace<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: { attributes?: SpanAttributes }
  ): Promise<T> {
    const span = this.startSpan(name, options);

    try {
      const result = await this.withSpanAsync(span, async () => fn(span));
      span.setStatus("ok");
      return result;
    } catch (error) {
      span.setStatus("error", error instanceof Error ? error.message : String(error));
      if (error instanceof Error) {
        span.addEvent("exception", {
          "exception.type": error.name,
          "exception.message": error.message,
          "exception.stacktrace": error.stack ?? "",
        });
      }
      throw error;
    } finally {
      span.end();
    }
  }

  traceSync<T>(
    name: string,
    fn: (span: Span) => T,
    options?: { attributes?: SpanAttributes }
  ): T {
    const span = this.startSpan(name, options);

    try {
      const result = this.withSpan(span, () => fn(span));
      span.setStatus("ok");
      return result;
    } catch (error) {
      span.setStatus("error", error instanceof Error ? error.message : String(error));
      if (error instanceof Error) {
        span.addEvent("exception", {
          "exception.type": error.name,
          "exception.message": error.message,
          "exception.stacktrace": error.stack ?? "",
        });
      }
      throw error;
    } finally {
      span.end();
    }
  }

  // ============================================================================
  // PHI-Specific Tracing
  // ============================================================================

  traceRedaction<T>(
    documentId: string,
    fn: (span: Span) => Promise<T>
  ): Promise<T> {
    return this.trace(`phi.redaction`, fn, {
      attributes: {
        "vulpes.operation": "redaction",
        "vulpes.document.id": documentId,
        "vulpes.phi.processed": true,
      },
    });
  }

  traceDetection(
    phiType: string,
    fn: (span: Span) => void
  ): void {
    this.traceSync(`phi.detection.${phiType}`, fn, {
      attributes: {
        "vulpes.operation": "detection",
        "vulpes.phi.type": phiType,
      },
    });
  }

  // ============================================================================
  // Export & Shutdown
  // ============================================================================

  async flush(): Promise<void> {
    if (this.spanBuffer.length === 0) return;

    const spansToExport = [...this.spanBuffer];
    this.spanBuffer.length = 0;

    await Promise.all(
      this.exporters.map((exporter) => exporter.export(spansToExport))
    );
  }

  async shutdown(): Promise<void> {
    if (this.isShutdown) return;

    this.isShutdown = true;

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // End all active spans
    for (const span of this.activeSpans.values()) {
      span.setStatus("error", "Tracer shutdown");
      span.end();
    }

    // Final flush
    await this.flush();

    // Shutdown exporters
    await Promise.all(this.exporters.map((e) => e.shutdown()));

    this.emit("shutdown");
  }

  // ============================================================================
  // Metrics Access
  // ============================================================================

  getMetrics(): MetricsCollector {
    return this.metrics;
  }

  getActiveSpanCount(): number {
    return this.activeSpans.size;
  }

  getBufferedSpanCount(): number {
    return this.spanBuffer.length;
  }

  // ============================================================================
  // Resource Attributes
  // ============================================================================

  getResourceAttributes(): ResourceAttributes {
    return {
      "service.name": this.config.serviceName,
      "service.version": this.config.serviceVersion,
      "deployment.environment": this.config.environment,
      "host.name": require("os").hostname(),
      "os.type": require("os").platform(),
      "process.pid": process.pid,
      "telemetry.sdk.name": "vulpes-tracer",
      "telemetry.sdk.version": "1.0.0",
      "telemetry.sdk.language": "nodejs",
    };
  }
}

// ============================================================================
// Singleton & Exports
// ============================================================================

export const vulpesTracer = VulpesTracer.getInstance({
  serviceName: "vulpes-celare",
  exporters: [{ type: "memory" }], // Default to memory, configure via env
});

export function configureTracer(config: TracerConfig): VulpesTracer {
  VulpesTracer.resetInstance();
  return VulpesTracer.getInstance(config);
}
