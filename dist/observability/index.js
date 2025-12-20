"use strict";
/**
 * Vulpes Celare - Observability Module
 *
 * OpenTelemetry-compatible distributed tracing, metrics, and log correlation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PHIAwareSampler = exports.CompositeSampler = exports.RuleBasedSampler = exports.AdaptiveSampler = exports.LatencyBasedSampler = exports.ErrorBiasedSampler = exports.NeverSampler = exports.AlwaysSampler = exports.ParentBasedSampler = exports.RateSampler = exports.createDefaultSampler = exports.EventNames = exports.MetricNames = exports.SpanNames = exports.AuditAttributes = exports.SessionAttributes = exports.MLAttributes = exports.CacheAttributes = exports.VulpesSpanAttributes = exports.PipelineAttributes = exports.FilterAttributes = exports.DocumentAttributes = exports.PHIAttributes = exports.OSAttributes = exports.HostAttributes = exports.ProcessAttributes = exports.CodeAttributes = exports.ExceptionAttributes = exports.DeploymentAttributes = exports.ServiceAttributes = exports.SemanticConventions = exports.MetricsCollector = exports.configureTracer = exports.vulpesTracer = exports.VulpesTracer = void 0;
var VulpesTracer_1 = require("./VulpesTracer");
Object.defineProperty(exports, "VulpesTracer", { enumerable: true, get: function () { return VulpesTracer_1.VulpesTracer; } });
Object.defineProperty(exports, "vulpesTracer", { enumerable: true, get: function () { return VulpesTracer_1.vulpesTracer; } });
Object.defineProperty(exports, "configureTracer", { enumerable: true, get: function () { return VulpesTracer_1.configureTracer; } });
Object.defineProperty(exports, "MetricsCollector", { enumerable: true, get: function () { return VulpesTracer_1.MetricsCollector; } });
// Semantic Conventions (OTEL + Vulpes-specific)
var SemanticConventions_1 = require("./SemanticConventions");
Object.defineProperty(exports, "SemanticConventions", { enumerable: true, get: function () { return SemanticConventions_1.SemanticConventions; } });
Object.defineProperty(exports, "ServiceAttributes", { enumerable: true, get: function () { return SemanticConventions_1.ServiceAttributes; } });
Object.defineProperty(exports, "DeploymentAttributes", { enumerable: true, get: function () { return SemanticConventions_1.DeploymentAttributes; } });
Object.defineProperty(exports, "ExceptionAttributes", { enumerable: true, get: function () { return SemanticConventions_1.ExceptionAttributes; } });
Object.defineProperty(exports, "CodeAttributes", { enumerable: true, get: function () { return SemanticConventions_1.CodeAttributes; } });
Object.defineProperty(exports, "ProcessAttributes", { enumerable: true, get: function () { return SemanticConventions_1.ProcessAttributes; } });
Object.defineProperty(exports, "HostAttributes", { enumerable: true, get: function () { return SemanticConventions_1.HostAttributes; } });
Object.defineProperty(exports, "OSAttributes", { enumerable: true, get: function () { return SemanticConventions_1.OSAttributes; } });
Object.defineProperty(exports, "PHIAttributes", { enumerable: true, get: function () { return SemanticConventions_1.PHIAttributes; } });
Object.defineProperty(exports, "DocumentAttributes", { enumerable: true, get: function () { return SemanticConventions_1.DocumentAttributes; } });
Object.defineProperty(exports, "FilterAttributes", { enumerable: true, get: function () { return SemanticConventions_1.FilterAttributes; } });
Object.defineProperty(exports, "PipelineAttributes", { enumerable: true, get: function () { return SemanticConventions_1.PipelineAttributes; } });
Object.defineProperty(exports, "VulpesSpanAttributes", { enumerable: true, get: function () { return SemanticConventions_1.SpanAttributes; } });
Object.defineProperty(exports, "CacheAttributes", { enumerable: true, get: function () { return SemanticConventions_1.CacheAttributes; } });
Object.defineProperty(exports, "MLAttributes", { enumerable: true, get: function () { return SemanticConventions_1.MLAttributes; } });
Object.defineProperty(exports, "SessionAttributes", { enumerable: true, get: function () { return SemanticConventions_1.SessionAttributes; } });
Object.defineProperty(exports, "AuditAttributes", { enumerable: true, get: function () { return SemanticConventions_1.AuditAttributes; } });
Object.defineProperty(exports, "SpanNames", { enumerable: true, get: function () { return SemanticConventions_1.SpanNames; } });
Object.defineProperty(exports, "MetricNames", { enumerable: true, get: function () { return SemanticConventions_1.MetricNames; } });
Object.defineProperty(exports, "EventNames", { enumerable: true, get: function () { return SemanticConventions_1.EventNames; } });
// Smart Sampling Strategies
var SmartSampler_1 = require("./SmartSampler");
Object.defineProperty(exports, "createDefaultSampler", { enumerable: true, get: function () { return SmartSampler_1.createDefaultSampler; } });
Object.defineProperty(exports, "RateSampler", { enumerable: true, get: function () { return SmartSampler_1.RateSampler; } });
Object.defineProperty(exports, "ParentBasedSampler", { enumerable: true, get: function () { return SmartSampler_1.ParentBasedSampler; } });
Object.defineProperty(exports, "AlwaysSampler", { enumerable: true, get: function () { return SmartSampler_1.AlwaysSampler; } });
Object.defineProperty(exports, "NeverSampler", { enumerable: true, get: function () { return SmartSampler_1.NeverSampler; } });
Object.defineProperty(exports, "ErrorBiasedSampler", { enumerable: true, get: function () { return SmartSampler_1.ErrorBiasedSampler; } });
Object.defineProperty(exports, "LatencyBasedSampler", { enumerable: true, get: function () { return SmartSampler_1.LatencyBasedSampler; } });
Object.defineProperty(exports, "AdaptiveSampler", { enumerable: true, get: function () { return SmartSampler_1.AdaptiveSampler; } });
Object.defineProperty(exports, "RuleBasedSampler", { enumerable: true, get: function () { return SmartSampler_1.RuleBasedSampler; } });
Object.defineProperty(exports, "CompositeSampler", { enumerable: true, get: function () { return SmartSampler_1.CompositeSampler; } });
Object.defineProperty(exports, "PHIAwareSampler", { enumerable: true, get: function () { return SmartSampler_1.PHIAwareSampler; } });
//# sourceMappingURL=index.js.map