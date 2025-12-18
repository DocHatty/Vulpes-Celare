# Vulpes Celare: Elite Output & Observability Masterplan

## Executive Summary

This document provides a comprehensive, research-informed masterplan for elevating Vulpes Celare's output, logging, and observability to elite status. Based on deep analysis of the current codebase and 2025 industry best practices.

---

## Part 1: HIPAA Audit Reassessment

### What We Actually Have (Excellent Foundation!)

After deep analysis, **Vulpes Celare already has a sophisticated HIPAA audit system**:

| Component | Status | Quality |
|-----------|--------|---------|
| **FHIRAuditEventExporter** | ✅ Implemented | Elite - HL7 FHIR R5 compliant |
| **BlockchainAnchor** | ✅ Implemented | Elite - OpenTimestamps Bitcoin anchoring |
| **TrustBundleExporter** | ✅ Implemented | Elite - Cryptographic provenance with .red files |
| **PipelineAudit** | ✅ Implemented | Good - System state tracking |
| **RedactionContext** | ✅ Implemented | Good - Session management with tokens |

### FHIR AuditEvent Capabilities (Already Elite)

```
src/provenance/FHIRAuditEventExporter.ts (716 lines)
├── FHIR R5 compliant AuditEvent generation
├── IHE-ATNA (Audit Trail and Node Authentication)
├── DICOM Audit Message Part 15 compliance
├── RFC 3881 Security Audit compatibility
├── Actor/agent tracking
├── Network address capture
├── Purpose of use codes (HIPAA authorization)
├── Policy URI tracking
├── Patient/encounter references
├── Organization tracking
├── PHI type breakdown with statistics
└── NDJSON/Bundle export for bulk FHIR operations
```

### Blockchain Anchoring (Already Elite)

```
src/provenance/BlockchainAnchor.ts (803 lines)
├── OpenTimestamps protocol integration
├── Bitcoin blockchain timestamping
├── Merkle root computation
├── Multi-calendar server submission
├── Proof verification
├── Anchor upgrade (pending → confirmed)
├── .ots file import/export
└── Tamper-evident audit trails
```

### Trust Bundle System (Already Elite)

```
src/provenance/TrustBundleExporter.ts (850 lines)
├── Redaction Evidence Document (.red) format
├── SHA-256 hash chains
├── Merkle proof generation
├── Certificate issuance
├── Auditor instructions generation
├── HIPAA Safe Harbor compliance attestation
├── ZIP archive with structured files
└── Verification API
```

### What's Actually Missing (Minor Gaps)

| Gap | Severity | Effort |
|-----|----------|--------|
| Automated alerting for suspicious patterns | Medium | Medium |
| Retention policy configuration | Low | Low |
| Device fingerprinting beyond network address | Low | Low |

**Bottom Line: HIPAA audit capabilities are 95% complete. Only minor enhancements needed.**

---

## Part 2: Remaining Critical Gaps

### Gap 1: OpenTelemetry Integration (CRITICAL)

**Current State**: No distributed tracing, no correlation IDs, no OTel integration
**Impact**: Cannot trace operations across the pipeline, poor debugging in production

### Gap 2: Structured Error Messages (HIGH)

**Current State**: Ad-hoc error strings
**Impact**: Users cannot self-diagnose problems

### Gap 3: CI/TTY Detection (HIGH)

**Current State**: No environment detection
**Impact**: Output breaks in CI/CD pipelines

### Gap 4: Console.* Scatter (MEDIUM)

**Current State**: 128 direct console calls across 26 files
**Impact**: Inconsistent output, can't filter/redirect

### Gap 5: CLI Output Controls (MEDIUM)

**Current State**: No --json/--quiet/--verbose flags
**Impact**: Poor scripting/automation experience

### Gap 6: NO_COLOR Support (MEDIUM)

**Current State**: No support for NO_COLOR environment variable
**Impact**: Accessibility issues, breaks piping

---

## Part 3: Elite Masterplan

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ELITE OUTPUT & OBSERVABILITY ARCHITECTURE                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     LAYER 1: ENVIRONMENT DETECTION                   │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │    │
│  │  │  CI Detect   │  │  TTY Check   │  │  NO_COLOR / FORCE_COLOR  │   │    │
│  │  │  (ci-info)   │  │  (isTTY)     │  │  Environment Vars        │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     LAYER 2: OUTPUT CONTEXT                          │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │  VulpesOutputContext                                          │   │    │
│  │  │  • isInteractive: boolean                                     │   │    │
│  │  │  • supportsColor: boolean                                     │   │    │
│  │  │  • isCI: boolean                                              │   │    │
│  │  │  • ciName: string | null                                      │   │    │
│  │  │  • outputMode: 'human' | 'json' | 'quiet'                     │   │    │
│  │  │  • verbosity: 'quiet' | 'normal' | 'verbose' | 'debug'        │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     LAYER 3: UNIFIED OUTPUT SYSTEM                   │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │    │
│  │  │ VulpesOut  │  │ VulpesErr  │  │ VulpesLog  │  │ VulpesSpan │    │    │
│  │  │ (stdout)   │  │ (stderr)   │  │ (logger)   │  │ (OTel)     │    │    │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     LAYER 4: ERROR SYSTEM                            │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │  VulpesError                                                  │   │    │
│  │  │  • code: "VULPES_E001"                                        │   │    │
│  │  │  • title: "Redaction Failed"                                  │   │    │
│  │  │  • description: "Unable to process document"                  │   │    │
│  │  │  • reason: "File format not supported"                        │   │    │
│  │  │  • resolution: ["Convert to text", "Use --force"]             │   │    │
│  │  │  • docUrl: "https://docs.vulpes.io/errors/E001"               │   │    │
│  │  │  • context: { filename, format }                              │   │    │
│  │  │  • correlationId: "trace-abc123"                              │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     LAYER 5: OPENTELEMETRY                           │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │    │
│  │  │  Tracer    │  │  Meter     │  │  Logger    │  │  Context   │    │    │
│  │  │  (spans)   │  │  (metrics) │  │  (logs)    │  │  (propagate)│   │    │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘    │    │
│  │                         │                                            │    │
│  │                         ▼                                            │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │  OTel Collector (optional) → Backend (Jaeger/Tempo/etc)      │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 4: Implementation Specifications

### 4.1 Environment Detection Module

**File**: `src/utils/VulpesEnvironment.ts`

```typescript
/**
 * VulpesEnvironment - Elite Environment Detection
 *
 * Detects runtime environment to adapt output behavior:
 * - CI detection (GitHub Actions, Jenkins, etc.)
 * - TTY detection (interactive terminal vs pipe)
 * - Color support (NO_COLOR, FORCE_COLOR, terminal capabilities)
 * - Verbosity settings (quiet, normal, verbose, debug)
 */

import ci from 'ci-info';

export interface VulpesEnvironmentConfig {
  /** Force interactive mode even in CI */
  forceInteractive?: boolean;
  /** Force color output */
  forceColor?: boolean;
  /** Force no color output */
  noColor?: boolean;
  /** Verbosity level */
  verbosity?: 'quiet' | 'normal' | 'verbose' | 'debug';
  /** Output format */
  outputFormat?: 'human' | 'json' | 'logfmt';
}

export class VulpesEnvironment {
  private static instance: VulpesEnvironment;

  // Detected state
  readonly isCI: boolean;
  readonly ciName: string | null;
  readonly isTTY: boolean;
  readonly isInteractive: boolean;
  readonly supportsColor: boolean;
  readonly colorDepth: number;

  // Configured state
  verbosity: 'quiet' | 'normal' | 'verbose' | 'debug';
  outputFormat: 'human' | 'json' | 'logfmt';

  private constructor(config: VulpesEnvironmentConfig = {}) {
    // CI Detection
    this.isCI = ci.isCI;
    this.ciName = ci.name ?? null;

    // TTY Detection
    this.isTTY = process.stdout.isTTY ?? false;

    // Interactive = TTY + not CI (unless forced)
    this.isInteractive = config.forceInteractive ?? (this.isTTY && !this.isCI);

    // Color Detection (respects NO_COLOR standard)
    const noColor = config.noColor ??
                    process.env.NO_COLOR !== undefined ??
                    process.env.TERM === 'dumb';
    const forceColor = config.forceColor ??
                       process.env.FORCE_COLOR !== undefined;

    this.supportsColor = forceColor || (!noColor && this.isTTY);
    this.colorDepth = this.detectColorDepth();

    // Configuration
    this.verbosity = config.verbosity ??
                     this.parseVerbosityFromEnv() ??
                     'normal';
    this.outputFormat = config.outputFormat ??
                        (this.isInteractive ? 'human' : 'json');
  }

  static getInstance(config?: VulpesEnvironmentConfig): VulpesEnvironment {
    if (!this.instance) {
      this.instance = new VulpesEnvironment(config);
    }
    return this.instance;
  }

  static configure(config: VulpesEnvironmentConfig): void {
    this.instance = new VulpesEnvironment(config);
  }

  private detectColorDepth(): number {
    if (!this.supportsColor) return 0;

    // Check for 24-bit color support
    if (process.env.COLORTERM === 'truecolor' ||
        process.env.COLORTERM === '24bit') {
      return 24;
    }

    // Check for 256 color support
    if (process.env.TERM?.includes('256color')) {
      return 8;
    }

    // Basic 16 color support
    return 4;
  }

  private parseVerbosityFromEnv(): 'quiet' | 'normal' | 'verbose' | 'debug' | undefined {
    const level = process.env.VULPES_VERBOSITY?.toLowerCase();
    if (level === 'quiet' || level === 'q') return 'quiet';
    if (level === 'verbose' || level === 'v') return 'verbose';
    if (level === 'debug' || level === 'd') return 'debug';
    if (process.env.DEBUG) return 'debug';
    return undefined;
  }

  // Helper methods
  shouldShowSpinners(): boolean {
    return this.isInteractive && this.verbosity !== 'quiet';
  }

  shouldShowProgress(): boolean {
    return this.verbosity !== 'quiet';
  }

  shouldShowDebug(): boolean {
    return this.verbosity === 'debug';
  }

  shouldUseColor(): boolean {
    return this.supportsColor;
  }
}

// Convenience exports
export const env = VulpesEnvironment.getInstance();
export const isCI = () => env.isCI;
export const isInteractive = () => env.isInteractive;
export const supportsColor = () => env.supportsColor;
```

### 4.2 Structured Error System

**File**: `src/errors/VulpesError.ts`

```typescript
/**
 * VulpesError - Elite Structured Error System
 *
 * Every error answers two questions:
 * 1. What went wrong?
 * 2. How do I fix it?
 *
 * Based on:
 * - PatternFly Error UX Guidelines
 * - Google Technical Writing Error Messages
 * - clig.dev CLI UX Guidelines
 */

export interface VulpesErrorOptions {
  /** Error code (e.g., "VULPES_E001") */
  code: string;
  /** Short title (e.g., "Redaction Failed") */
  title: string;
  /** Detailed description of what went wrong */
  description: string;
  /** Why it went wrong (optional but helpful) */
  reason?: string;
  /** How to fix it (array of actionable steps) */
  resolution?: string[];
  /** Link to documentation */
  docUrl?: string;
  /** Additional context (file, line, etc.) */
  context?: Record<string, unknown>;
  /** Original error (for chaining) */
  cause?: Error;
  /** Correlation ID for tracing */
  correlationId?: string;
  /** Severity level */
  severity?: 'critical' | 'error' | 'warning' | 'info';
  /** Is this error recoverable? */
  recoverable?: boolean;
  /** Suggested exit code for CLI */
  exitCode?: number;
}

export class VulpesError extends Error {
  readonly code: string;
  readonly title: string;
  readonly description: string;
  readonly reason?: string;
  readonly resolution: string[];
  readonly docUrl?: string;
  readonly context: Record<string, unknown>;
  readonly correlationId?: string;
  readonly severity: 'critical' | 'error' | 'warning' | 'info';
  readonly recoverable: boolean;
  readonly exitCode: number;
  readonly timestamp: string;

  constructor(options: VulpesErrorOptions) {
    // Construct human-readable message
    const message = `[${options.code}] ${options.title}: ${options.description}`;
    super(message, { cause: options.cause });

    this.name = 'VulpesError';
    this.code = options.code;
    this.title = options.title;
    this.description = options.description;
    this.reason = options.reason;
    this.resolution = options.resolution ?? [];
    this.docUrl = options.docUrl;
    this.context = options.context ?? {};
    this.correlationId = options.correlationId;
    this.severity = options.severity ?? 'error';
    this.recoverable = options.recoverable ?? false;
    this.exitCode = options.exitCode ?? 1;
    this.timestamp = new Date().toISOString();

    // Capture stack trace
    Error.captureStackTrace(this, VulpesError);
  }

  /**
   * Format for human-readable CLI output
   */
  toHumanReadable(useColor: boolean = true): string {
    const c = useColor ? {
      error: (s: string) => `\x1b[31m${s}\x1b[0m`,
      warning: (s: string) => `\x1b[33m${s}\x1b[0m`,
      dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
      bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
      cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
    } : {
      error: (s: string) => s,
      warning: (s: string) => s,
      dim: (s: string) => s,
      bold: (s: string) => s,
      cyan: (s: string) => s,
    };

    const lines: string[] = [];

    // Title line
    lines.push(c.error(`✖ ${this.title}`));
    lines.push('');

    // Description
    lines.push(c.bold('What happened:'));
    lines.push(`  ${this.description}`);

    // Reason (if provided)
    if (this.reason) {
      lines.push('');
      lines.push(c.bold('Why:'));
      lines.push(`  ${this.reason}`);
    }

    // Resolution steps
    if (this.resolution.length > 0) {
      lines.push('');
      lines.push(c.bold('How to fix:'));
      this.resolution.forEach((step, i) => {
        lines.push(`  ${i + 1}. ${step}`);
      });
    }

    // Documentation link
    if (this.docUrl) {
      lines.push('');
      lines.push(c.dim(`Documentation: ${c.cyan(this.docUrl)}`));
    }

    // Error code and correlation ID
    lines.push('');
    lines.push(c.dim(`Error: ${this.code}${this.correlationId ? ` | Trace: ${this.correlationId}` : ''}`));

    return lines.join('\n');
  }

  /**
   * Format for JSON output (logging, APIs)
   */
  toJSON(): Record<string, unknown> {
    return {
      error: true,
      code: this.code,
      title: this.title,
      description: this.description,
      reason: this.reason,
      resolution: this.resolution,
      docUrl: this.docUrl,
      context: this.context,
      correlationId: this.correlationId,
      severity: this.severity,
      recoverable: this.recoverable,
      exitCode: this.exitCode,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

// ============================================================================
// ERROR CATALOG
// ============================================================================

export const ErrorCodes = {
  // Input errors (E001-E099)
  INVALID_INPUT: 'VULPES_E001',
  FILE_NOT_FOUND: 'VULPES_E002',
  UNSUPPORTED_FORMAT: 'VULPES_E003',
  EMPTY_INPUT: 'VULPES_E004',

  // Configuration errors (E100-E199)
  INVALID_CONFIG: 'VULPES_E100',
  MISSING_CONFIG: 'VULPES_E101',
  INVALID_POLICY: 'VULPES_E102',

  // Processing errors (E200-E299)
  REDACTION_FAILED: 'VULPES_E200',
  FILTER_ERROR: 'VULPES_E201',
  TIMEOUT: 'VULPES_E202',
  MEMORY_EXCEEDED: 'VULPES_E203',

  // External errors (E300-E399)
  RUST_BINDING_UNAVAILABLE: 'VULPES_E300',
  MODEL_LOAD_FAILED: 'VULPES_E301',
  NETWORK_ERROR: 'VULPES_E302',

  // Audit errors (E400-E499)
  AUDIT_EXPORT_FAILED: 'VULPES_E400',
  TRUST_BUNDLE_INVALID: 'VULPES_E401',
  BLOCKCHAIN_ANCHOR_FAILED: 'VULPES_E402',
} as const;

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createFileNotFoundError(filepath: string, cause?: Error): VulpesError {
  return new VulpesError({
    code: ErrorCodes.FILE_NOT_FOUND,
    title: 'File Not Found',
    description: `The file "${filepath}" does not exist or cannot be accessed.`,
    reason: 'The path may be incorrect, or the file may have been moved or deleted.',
    resolution: [
      'Verify the file path is correct',
      'Check that the file exists: ls -la ' + filepath,
      'Ensure you have read permissions for the file',
    ],
    context: { filepath },
    cause,
    exitCode: 66, // EX_NOINPUT
  });
}

export function createUnsupportedFormatError(format: string, supportedFormats: string[]): VulpesError {
  return new VulpesError({
    code: ErrorCodes.UNSUPPORTED_FORMAT,
    title: 'Unsupported File Format',
    description: `The format "${format}" is not supported for redaction.`,
    reason: `Vulpes Celare currently supports: ${supportedFormats.join(', ')}`,
    resolution: [
      'Convert the file to a supported format',
      `Use --force-text to treat as plain text`,
    ],
    context: { format, supportedFormats },
    exitCode: 65, // EX_DATAERR
  });
}

export function createRedactionError(details: string, cause?: Error): VulpesError {
  return new VulpesError({
    code: ErrorCodes.REDACTION_FAILED,
    title: 'Redaction Failed',
    description: details,
    resolution: [
      'Check the input text for unusual characters or encoding',
      'Try with --verbose to see detailed processing information',
      'Report this issue with the error details if it persists',
    ],
    cause,
    exitCode: 70, // EX_SOFTWARE
  });
}
```

### 4.3 OpenTelemetry Integration

**File**: `src/observability/VulpesTracer.ts`

```typescript
/**
 * VulpesTracer - Elite OpenTelemetry Integration
 *
 * Provides distributed tracing with:
 * - Automatic span creation for redaction operations
 * - Correlation IDs in all logs
 * - HIPAA-compliant attribute filtering
 * - Configurable export (console, OTLP, Jaeger)
 */

import {
  trace,
  context,
  SpanKind,
  SpanStatusCode,
  Span,
  Tracer,
  Context as OTelContext
} from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION
} from '@opentelemetry/semantic-conventions';
import { VERSION } from '../meta';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface VulpesTracerConfig {
  /** Service name for traces */
  serviceName?: string;
  /** Service version */
  serviceVersion?: string;
  /** Enable tracing (default: true if OTEL_EXPORTER_OTLP_ENDPOINT set) */
  enabled?: boolean;
  /** Export destination */
  exporter?: 'console' | 'otlp' | 'none';
  /** OTLP endpoint URL */
  otlpEndpoint?: string;
  /** Sampling ratio (0.0 - 1.0) */
  samplingRatio?: number;
  /** Attributes to always redact from spans */
  redactAttributes?: string[];
}

// ============================================================================
// VULPES TRACER
// ============================================================================

export class VulpesTracer {
  private static instance: VulpesTracer;
  private sdk: NodeSDK | null = null;
  private tracer: Tracer;
  private enabled: boolean;
  private redactAttributes: Set<string>;

  private constructor(config: VulpesTracerConfig = {}) {
    const {
      serviceName = 'vulpes-celare',
      serviceVersion = VERSION,
      enabled = process.env.OTEL_EXPORTER_OTLP_ENDPOINT !== undefined ||
                process.env.VULPES_TRACING === '1',
      exporter = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ? 'otlp' : 'console',
      otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      redactAttributes = ['phi', 'ssn', 'patient', 'name', 'email', 'phone'],
    } = config;

    this.enabled = enabled;
    this.redactAttributes = new Set(redactAttributes.map(a => a.toLowerCase()));

    if (enabled && exporter !== 'none') {
      this.initializeSDK(serviceName, serviceVersion, exporter, otlpEndpoint);
    }

    this.tracer = trace.getTracer(serviceName, serviceVersion);
  }

  private initializeSDK(
    serviceName: string,
    serviceVersion: string,
    exporter: 'console' | 'otlp',
    otlpEndpoint?: string
  ): void {
    const traceExporter = exporter === 'otlp' && otlpEndpoint
      ? new OTLPTraceExporter({ url: otlpEndpoint })
      : new ConsoleSpanExporter();

    this.sdk = new NodeSDK({
      resource: new Resource({
        [SEMRESATTRS_SERVICE_NAME]: serviceName,
        [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
      }),
      traceExporter,
    });

    this.sdk.start();

    // Graceful shutdown
    process.on('SIGTERM', () => this.sdk?.shutdown());
  }

  static getInstance(config?: VulpesTracerConfig): VulpesTracer {
    if (!this.instance) {
      this.instance = new VulpesTracer(config);
    }
    return this.instance;
  }

  // ============================================================================
  // SPAN MANAGEMENT
  // ============================================================================

  /**
   * Start a new span
   */
  startSpan(name: string, attributes?: Record<string, string | number | boolean>): Span {
    const sanitizedAttrs = this.sanitizeAttributes(attributes);
    return this.tracer.startSpan(name, {
      kind: SpanKind.INTERNAL,
      attributes: sanitizedAttrs,
    });
  }

  /**
   * Execute a function within a span
   */
  async withSpan<T>(
    name: string,
    attributes: Record<string, string | number | boolean>,
    fn: (span: Span) => Promise<T>
  ): Promise<T> {
    const span = this.startSpan(name, attributes);

    try {
      const result = await context.with(
        trace.setSpan(context.active(), span),
        () => fn(span)
      );
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Execute a synchronous function within a span
   */
  withSpanSync<T>(
    name: string,
    attributes: Record<string, string | number | boolean>,
    fn: (span: Span) => T
  ): T {
    const span = this.startSpan(name, attributes);

    try {
      const result = fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Get current span from context
   */
  getCurrentSpan(): Span | undefined {
    return trace.getSpan(context.active());
  }

  /**
   * Get correlation ID from current span
   */
  getCorrelationId(): string | undefined {
    const span = this.getCurrentSpan();
    if (!span) return undefined;

    const ctx = span.spanContext();
    return `${ctx.traceId.slice(-8)}-${ctx.spanId.slice(-4)}`;
  }

  // ============================================================================
  // HIPAA-COMPLIANT ATTRIBUTE SANITIZATION
  // ============================================================================

  private sanitizeAttributes(
    attributes?: Record<string, string | number | boolean>
  ): Record<string, string | number | boolean> | undefined {
    if (!attributes) return undefined;

    const sanitized: Record<string, string | number | boolean> = {};

    for (const [key, value] of Object.entries(attributes)) {
      const lowerKey = key.toLowerCase();

      // Check if attribute should be redacted
      if (this.shouldRedact(lowerKey)) {
        // Redact sensitive values but keep key for debugging
        if (typeof value === 'string') {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = value; // Keep numbers/booleans
        }
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private shouldRedact(key: string): boolean {
    for (const pattern of this.redactAttributes) {
      if (key.includes(pattern)) return true;
    }
    return false;
  }

  // ============================================================================
  // SHUTDOWN
  // ============================================================================

  async shutdown(): Promise<void> {
    await this.sdk?.shutdown();
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const tracer = VulpesTracer.getInstance();

/**
 * Decorator for tracing async methods
 */
export function Traced(name?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const spanName = name ?? `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return tracer.withSpan(spanName, {}, async () => {
        return originalMethod.apply(this, args);
      });
    };

    return descriptor;
  };
}
```

### 4.4 CLI Global Flags

**File**: Update `src/cli/CLI.ts` to add global flags

```typescript
// Add these options to the main program definition

program
  .option('--no-color', 'Disable colored output')
  .option('--color', 'Force colored output')
  .option('-q, --quiet', 'Suppress non-essential output')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--debug', 'Enable debug output')
  .option('--json', 'Output in JSON format (for scripting)')
  .option('--trace', 'Enable OpenTelemetry tracing')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();

    // Configure environment based on flags
    VulpesEnvironment.configure({
      noColor: opts.noColor,
      forceColor: opts.color,
      verbosity: opts.debug ? 'debug'
               : opts.verbose ? 'verbose'
               : opts.quiet ? 'quiet'
               : 'normal',
      outputFormat: opts.json ? 'json' : 'human',
    });

    // Enable tracing if requested
    if (opts.trace) {
      process.env.VULPES_TRACING = '1';
    }
  });
```

---

## Part 5: Implementation Roadmap

### Phase 1: Foundation (Days 1-3)

| Task | Priority | Complexity | File |
|------|----------|------------|------|
| Create VulpesEnvironment module | HIGH | Low | `src/utils/VulpesEnvironment.ts` |
| Create VulpesError class | HIGH | Medium | `src/errors/VulpesError.ts` |
| Add ci-info dependency | HIGH | Trivial | `package.json` |
| Add global CLI flags | HIGH | Low | `src/cli/CLI.ts` |
| Update VulpesLogger to use environment | HIGH | Medium | `src/utils/VulpesLogger.ts` |

### Phase 2: Console Migration (Days 4-6)

| Task | Priority | Complexity | Files |
|------|----------|------------|-------|
| Audit all console.* calls | MEDIUM | Low | All 26 files |
| Create migration script | MEDIUM | Low | `scripts/migrate-console.ts` |
| Replace console calls systematically | MEDIUM | High | 26 files |
| Test output in CI/TTY modes | MEDIUM | Low | Tests |

### Phase 3: OpenTelemetry (Days 7-10)

| Task | Priority | Complexity | File |
|------|----------|------------|------|
| Add OTel dependencies | CRITICAL | Trivial | `package.json` |
| Create VulpesTracer | CRITICAL | Medium | `src/observability/VulpesTracer.ts` |
| Instrument ParallelRedactionEngine | CRITICAL | Medium | Core |
| Instrument filter stages | HIGH | Medium | Filters |
| Add correlation IDs to VulpesLogger | HIGH | Low | Logger |
| Configure HIPAA-safe attribute filtering | HIGH | Low | Tracer |

### Phase 4: Polish (Days 11-14)

| Task | Priority | Complexity | Notes |
|------|----------|------------|-------|
| Add error catalog documentation | MEDIUM | Low | Docs |
| Add --help improvements | LOW | Low | CLI |
| Add spinner TTY adaptation | MEDIUM | Low | Spinners |
| Test all CI environments | HIGH | Medium | GH Actions |
| Update README with new flags | MEDIUM | Low | Docs |

---

## Part 6: Dependencies

```json
{
  "dependencies": {
    "@opentelemetry/api": "^1.7.0",
    "@opentelemetry/sdk-node": "^0.52.0",
    "@opentelemetry/sdk-trace-node": "^1.25.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.52.0",
    "@opentelemetry/resources": "^1.25.0",
    "@opentelemetry/semantic-conventions": "^1.25.0",
    "ci-info": "^4.0.0"
  }
}
```

---

## Part 7: Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Direct console.* calls | 128 | 0 | Static analysis |
| CI environments supported | 0 | 10+ | ci-info coverage |
| Error self-resolution rate | Unknown | 80%+ | User feedback |
| OTel span coverage | 0% | 90%+ | Trace inspection |
| CLI flags implemented | ~40% | 100% | clig.dev checklist |
| NO_COLOR compliance | ❌ | ✅ | Standard test |
| JSON output mode | ❌ | ✅ | Flag test |

---

## Part 8: References

### Research Sources
- [OpenTelemetry Node.js Getting Started](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/)
- [OpenTelemetry Instrumentation](https://opentelemetry.io/docs/languages/js/instrumentation/)
- [Redacting Sensitive Data with OTel Collector](https://betterstack.com/community/guides/observability/redacting-sensitive-data-opentelemetry/)
- [OpenTelemetry Handling Sensitive Data](https://opentelemetry.io/docs/security/handling-sensitive-data/)
- [ci-info npm Package](https://www.npmjs.com/package/ci-info)
- [Command Line Interface Guidelines](https://clig.dev/)
- [Google Technical Writing - Error Messages](https://developers.google.com/tech-writing/error-messages)
- [PatternFly Error UX Guidelines](https://www.patternfly.org/ux-writing/error-messages/)
- [TypeScript Error Handling Patterns](https://engineering.udacity.com/handling-errors-like-a-pro-in-typescript-d7a314ad4991)

---

## Conclusion

**Vulpes Celare's HIPAA audit capabilities are already elite** (FHIR R5, blockchain anchoring, trust bundles). The remaining work focuses on:

1. **OpenTelemetry integration** - Adding distributed tracing with correlation IDs
2. **Structured errors** - Making errors actionable with title/description/resolution
3. **Environment detection** - Adapting output for CI/TTY/color support
4. **Console migration** - Centralizing all output through the logging system
5. **CLI flags** - Adding --json/--quiet/--verbose/--no-color

**Estimated effort**: 2 weeks for a single developer
**Risk**: Low - mostly additive changes, not refactoring
**ROI**: High - dramatically improves developer experience and production debugging
