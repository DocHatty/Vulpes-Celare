"use strict";
/**
 * Vulpes Celare - OpenTelemetry Integration
 *
 * Full OTel SDK integration for distributed tracing, metrics, and log correlation.
 * Bridges with existing PipelineTracer for seamless integration.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.vulpesTracer = exports.VulpesTracer = exports.MetricsCollector = void 0;
exports.configureTracer = configureTracer;
const events_1 = require("events");
const crypto = __importStar(require("crypto"));
// ============================================================================
// Span Implementation
// ============================================================================
class VulpesSpan {
    name;
    spanId;
    traceId;
    parentSpanId;
    startTime;
    endTime;
    status = "unset";
    statusMessage;
    attributes = {};
    events = [];
    links = [];
    recording = true;
    tracer;
    constructor(tracer, name, traceId, parentSpanId, links, startTime) {
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
    generateSpanId() {
        return crypto.randomBytes(8).toString("hex");
    }
    setAttribute(key, value) {
        if (this.recording) {
            this.attributes[key] = value;
        }
        return this;
    }
    setAttributes(attributes) {
        if (this.recording) {
            Object.assign(this.attributes, attributes);
        }
        return this;
    }
    addEvent(name, attributes) {
        if (this.recording) {
            this.events.push({
                name,
                timestamp: Date.now(),
                attributes,
            });
        }
        return this;
    }
    addLink(link) {
        if (this.recording) {
            this.links.push(link);
        }
        return this;
    }
    setStatus(status, message) {
        if (this.recording) {
            this.status = status;
            this.statusMessage = message;
        }
        return this;
    }
    end(endTime) {
        if (!this.recording)
            return;
        this.endTime = endTime ?? Date.now();
        this.recording = false;
        this.tracer.onSpanEnd(this);
    }
    isRecording() {
        return this.recording;
    }
    getContext() {
        return {
            traceId: this.traceId,
            spanId: this.spanId,
            traceFlags: 1, // sampled
        };
    }
    toJSON() {
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
    contextStack = [];
    getCurrent() {
        return this.contextStack[this.contextStack.length - 1];
    }
    with(context, fn) {
        this.contextStack.push(context);
        try {
            return fn();
        }
        finally {
            this.contextStack.pop();
        }
    }
    async withAsync(context, fn) {
        this.contextStack.push(context);
        try {
            return await fn();
        }
        finally {
            this.contextStack.pop();
        }
    }
    bind(context, fn) {
        return ((...args) => {
            return this.with(context, () => fn(...args));
        });
    }
}
class ConsoleExporter {
    async export(spans) {
        for (const span of spans) {
            const duration = span.endTime
                ? `${span.endTime - span.startTime}ms`
                : "ongoing";
            // Use process.stderr for trace output to avoid polluting stdout
            process.stderr.write(`[TRACE] ${span.name} (${span.spanId}) - ${duration} - ${span.status}\n`);
        }
    }
    async shutdown() {
        // No-op
    }
}
class MemoryExporter {
    spans = [];
    async export(spans) {
        this.spans.push(...spans);
    }
    async shutdown() {
        // No-op
    }
    getSpans() {
        return [...this.spans];
    }
    clear() {
        this.spans = [];
    }
}
class OTLPExporter {
    endpoint;
    headers;
    compression;
    constructor(config) {
        this.endpoint = config.endpoint ?? "http://localhost:4318/v1/traces";
        this.headers = config.headers ?? {};
        this.compression = config.compression ?? "none";
    }
    async export(spans) {
        if (spans.length === 0)
            return;
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
                process.stderr.write(`[VulpesTracer] OTLP export failed: ${response.status} ${response.statusText}\n`);
            }
        }
        catch (error) {
            process.stderr.write(`[VulpesTracer] OTLP export error: ${error}\n`);
        }
    }
    buildOTLPPayload(spans) {
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
    resourceToAttributes() {
        return [
            { key: "service.name", value: { stringValue: "vulpes-celare" } },
            { key: "telemetry.sdk.name", value: { stringValue: "vulpes-tracer" } },
            { key: "telemetry.sdk.language", value: { stringValue: "nodejs" } },
        ];
    }
    spanToOTLP(span) {
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
    toOTLPValue(value) {
        if (typeof value === "string") {
            return { stringValue: value };
        }
        else if (typeof value === "number") {
            return Number.isInteger(value)
                ? { intValue: value }
                : { doubleValue: value };
        }
        else if (typeof value === "boolean") {
            return { boolValue: value };
        }
        else if (Array.isArray(value)) {
            return {
                arrayValue: {
                    values: value.map((v) => this.toOTLPValue(v)),
                },
            };
        }
        return { stringValue: String(value) };
    }
    async shutdown() {
        // Flush any remaining spans
    }
}
class FileExporter {
    filePath;
    buffer = [];
    constructor(config) {
        this.filePath = config.filePath ?? "./traces.jsonl";
    }
    async export(spans) {
        const fs = await Promise.resolve().then(() => __importStar(require("fs"))).then((m) => m.promises);
        const lines = spans.map((span) => JSON.stringify(span.toJSON())).join("\n") + "\n";
        await fs.appendFile(this.filePath, lines, "utf-8");
    }
    async shutdown() {
        // No-op
    }
}
// ============================================================================
// Metrics Collector
// ============================================================================
class MetricsCollector {
    counters = new Map();
    gauges = new Map();
    histograms = new Map();
    incrementCounter(name, value = 1, attributes) {
        const key = this.makeKey(name, attributes);
        this.counters.set(key, (this.counters.get(key) ?? 0) + value);
    }
    setGauge(name, value, attributes) {
        const key = this.makeKey(name, attributes);
        this.gauges.set(key, value);
    }
    recordHistogram(name, value, attributes) {
        const key = this.makeKey(name, attributes);
        const values = this.histograms.get(key) ?? [];
        values.push(value);
        this.histograms.set(key, values);
    }
    makeKey(name, attributes) {
        if (!attributes)
            return name;
        const sortedAttrs = Object.entries(attributes)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join(",");
        return `${name}{${sortedAttrs}}`;
    }
    getMetrics() {
        const metrics = [];
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
    reset() {
        this.counters.clear();
        this.gauges.clear();
        this.histograms.clear();
    }
}
exports.MetricsCollector = MetricsCollector;
// ============================================================================
// VulpesTracer - Main Class
// ============================================================================
class VulpesTracer extends events_1.EventEmitter {
    static instance = null;
    config;
    contextManager;
    exporters = [];
    metrics;
    spanBuffer = [];
    activeSpans = new Map();
    flushTimer;
    isShutdown = false;
    constructor(config) {
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
    static getInstance(config) {
        if (!VulpesTracer.instance) {
            VulpesTracer.instance = new VulpesTracer(config ?? { serviceName: "vulpes-celare" });
        }
        return VulpesTracer.instance;
    }
    static resetInstance() {
        if (VulpesTracer.instance) {
            VulpesTracer.instance.shutdown();
            VulpesTracer.instance = null;
        }
    }
    initializeExporters() {
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
    startFlushTimer() {
        this.flushTimer = setInterval(() => {
            this.flush();
        }, this.config.flushInterval);
        // Don't prevent process exit
        this.flushTimer.unref();
    }
    // ============================================================================
    // Span Creation
    // ============================================================================
    startSpan(name, options) {
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
        const span = new VulpesSpan(this, name, traceId, parentSpanId, options?.links, options?.startTime);
        if (options?.attributes) {
            span.setAttributes(options.attributes);
        }
        this.activeSpans.set(span.spanId, span);
        this.metrics.incrementCounter("vulpes.spans.created");
        return span;
    }
    createNoOpSpan(name) {
        const noOpSpan = {
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
            end: () => { },
            isRecording: () => false,
            getContext: () => ({
                traceId: "00000000000000000000000000000000",
                spanId: "0000000000000000",
                traceFlags: 0,
            }),
        };
        return noOpSpan;
    }
    generateTraceId() {
        return crypto.randomBytes(16).toString("hex");
    }
    // ============================================================================
    // Span Lifecycle
    // ============================================================================
    onSpanEnd(span) {
        this.activeSpans.delete(span.spanId);
        this.spanBuffer.push(span);
        this.metrics.incrementCounter("vulpes.spans.ended");
        const duration = span.endTime - span.startTime;
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
    withSpan(span, fn) {
        const context = {
            traceId: span.traceId,
            spanId: span.spanId,
            sampled: span.isRecording(),
        };
        return this.contextManager.with(context, fn);
    }
    async withSpanAsync(span, fn) {
        const context = {
            traceId: span.traceId,
            spanId: span.spanId,
            sampled: span.isRecording(),
        };
        return this.contextManager.withAsync(context, fn);
    }
    getCurrentContext() {
        return this.contextManager.getCurrent();
    }
    // ============================================================================
    // Log Correlation
    // ============================================================================
    getLogContext() {
        const context = this.contextManager.getCurrent();
        if (!context)
            return null;
        return {
            traceId: context.traceId,
            spanId: context.spanId,
        };
    }
    injectTraceContext(carrier) {
        const context = this.contextManager.getCurrent();
        if (!context)
            return;
        // W3C Trace Context format
        carrier["traceparent"] = `00-${context.traceId}-${context.spanId}-01`;
    }
    extractTraceContext(carrier) {
        const traceparent = carrier["traceparent"];
        if (!traceparent)
            return null;
        const parts = traceparent.split("-");
        if (parts.length < 4)
            return null;
        return {
            traceId: parts[1],
            spanId: parts[2],
            sampled: parts[3] === "01",
        };
    }
    // ============================================================================
    // Pipeline Tracer Integration
    // ============================================================================
    integrateWithPipelineTracer(pipelineTracer) {
        // Bridge PipelineTracer events to OTel spans
        pipelineTracer.on("stageStart", (...args) => {
            const stageName = args[0];
            const span = this.startSpan(`pipeline.${stageName}`, {
                attributes: {
                    "vulpes.stage": stageName,
                    "vulpes.component": "pipeline",
                },
            });
            this.activeSpans.set(`pipeline.${stageName}`, span);
        });
        pipelineTracer.on("stageEnd", (...args) => {
            const stageName = args[0];
            const span = this.activeSpans.get(`pipeline.${stageName}`);
            if (span) {
                span.setStatus("ok");
                span.end();
            }
        });
        pipelineTracer.on("error", (...args) => {
            const stageName = args[0];
            const error = args[1];
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
    async trace(name, fn, options) {
        const span = this.startSpan(name, options);
        try {
            const result = await this.withSpanAsync(span, async () => fn(span));
            span.setStatus("ok");
            return result;
        }
        catch (error) {
            span.setStatus("error", error instanceof Error ? error.message : String(error));
            if (error instanceof Error) {
                span.addEvent("exception", {
                    "exception.type": error.name,
                    "exception.message": error.message,
                    "exception.stacktrace": error.stack ?? "",
                });
            }
            throw error;
        }
        finally {
            span.end();
        }
    }
    traceSync(name, fn, options) {
        const span = this.startSpan(name, options);
        try {
            const result = this.withSpan(span, () => fn(span));
            span.setStatus("ok");
            return result;
        }
        catch (error) {
            span.setStatus("error", error instanceof Error ? error.message : String(error));
            if (error instanceof Error) {
                span.addEvent("exception", {
                    "exception.type": error.name,
                    "exception.message": error.message,
                    "exception.stacktrace": error.stack ?? "",
                });
            }
            throw error;
        }
        finally {
            span.end();
        }
    }
    // ============================================================================
    // PHI-Specific Tracing
    // ============================================================================
    traceRedaction(documentId, fn) {
        return this.trace(`phi.redaction`, fn, {
            attributes: {
                "vulpes.operation": "redaction",
                "vulpes.document.id": documentId,
                "vulpes.phi.processed": true,
            },
        });
    }
    traceDetection(phiType, fn) {
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
    async flush() {
        if (this.spanBuffer.length === 0)
            return;
        const spansToExport = [...this.spanBuffer];
        this.spanBuffer.length = 0;
        await Promise.all(this.exporters.map((exporter) => exporter.export(spansToExport)));
    }
    async shutdown() {
        if (this.isShutdown)
            return;
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
    getMetrics() {
        return this.metrics;
    }
    getActiveSpanCount() {
        return this.activeSpans.size;
    }
    getBufferedSpanCount() {
        return this.spanBuffer.length;
    }
    // ============================================================================
    // Resource Attributes
    // ============================================================================
    getResourceAttributes() {
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
exports.VulpesTracer = VulpesTracer;
// ============================================================================
// Singleton & Exports
// ============================================================================
exports.vulpesTracer = VulpesTracer.getInstance({
    serviceName: "vulpes-celare",
    exporters: [{ type: "memory" }], // Default to memory, configure via env
});
function configureTracer(config) {
    VulpesTracer.resetInstance();
    return VulpesTracer.getInstance(config);
}
//# sourceMappingURL=VulpesTracer.js.map