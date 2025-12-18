/**
 * Vulpes Celare - OpenTelemetry Integration
 *
 * Full OTel SDK integration for distributed tracing, metrics, and log correlation.
 * Bridges with existing PipelineTracer for seamless integration.
 */
import { EventEmitter } from "events";
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
declare class VulpesSpan implements Span {
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
    private recording;
    private readonly tracer;
    constructor(tracer: VulpesTracer, name: string, traceId: string, parentSpanId?: string, links?: SpanLink[], startTime?: number);
    private generateSpanId;
    setAttribute(key: string, value: SpanAttributes[keyof SpanAttributes]): this;
    setAttributes(attributes: SpanAttributes): this;
    addEvent(name: string, attributes?: SpanAttributes): this;
    addLink(link: SpanLink): this;
    setStatus(status: SpanStatus, message?: string): this;
    end(endTime?: number): void;
    isRecording(): boolean;
    getContext(): SpanContext;
    toJSON(): object;
}
export declare class MetricsCollector {
    private counters;
    private gauges;
    private histograms;
    incrementCounter(name: string, value?: number, attributes?: SpanAttributes): void;
    setGauge(name: string, value: number, attributes?: SpanAttributes): void;
    recordHistogram(name: string, value: number, attributes?: SpanAttributes): void;
    private makeKey;
    getMetrics(): Metric[];
    reset(): void;
}
export declare class VulpesTracer extends EventEmitter {
    private static instance;
    private readonly config;
    private readonly contextManager;
    private readonly exporters;
    private readonly metrics;
    private readonly spanBuffer;
    private readonly activeSpans;
    private flushTimer?;
    private isShutdown;
    private constructor();
    static getInstance(config?: TracerConfig): VulpesTracer;
    static resetInstance(): void;
    private initializeExporters;
    private startFlushTimer;
    startSpan(name: string, options?: {
        attributes?: SpanAttributes;
        links?: SpanLink[];
        startTime?: number;
    }): Span;
    private createNoOpSpan;
    private generateTraceId;
    onSpanEnd(span: VulpesSpan): void;
    withSpan<T>(span: Span, fn: () => T): T;
    withSpanAsync<T>(span: Span, fn: () => Promise<T>): Promise<T>;
    getCurrentContext(): TraceContext | undefined;
    getLogContext(): {
        traceId: string;
        spanId: string;
    } | null;
    injectTraceContext(carrier: Record<string, string>): void;
    extractTraceContext(carrier: Record<string, string>): TraceContext | null;
    integrateWithPipelineTracer(pipelineTracer: {
        on: (event: string, handler: (...args: unknown[]) => void) => void;
    }): void;
    trace<T>(name: string, fn: (span: Span) => Promise<T>, options?: {
        attributes?: SpanAttributes;
    }): Promise<T>;
    traceSync<T>(name: string, fn: (span: Span) => T, options?: {
        attributes?: SpanAttributes;
    }): T;
    traceRedaction<T>(documentId: string, fn: (span: Span) => Promise<T>): Promise<T>;
    traceDetection(phiType: string, fn: (span: Span) => void): void;
    flush(): Promise<void>;
    shutdown(): Promise<void>;
    getMetrics(): MetricsCollector;
    getActiveSpanCount(): number;
    getBufferedSpanCount(): number;
    getResourceAttributes(): ResourceAttributes;
}
export declare const vulpesTracer: VulpesTracer;
export declare function configureTracer(config: TracerConfig): VulpesTracer;
export {};
//# sourceMappingURL=VulpesTracer.d.ts.map