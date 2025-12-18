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

// ============================================================================
// Types
// ============================================================================

export type ErrorSeverity = "fatal" | "error" | "warning" | "info";

export type ErrorCategory =
  | "configuration"
  | "validation"
  | "runtime"
  | "network"
  | "filesystem"
  | "security"
  | "compliance"
  | "detection"
  | "pipeline"
  | "integration";

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

// ============================================================================
// Error Codes Registry
// ============================================================================

export const ERROR_CODES = {
  // Configuration Errors (E001-E099)
  CONFIG_INVALID: "VULPES_E001",
  CONFIG_MISSING: "VULPES_E002",
  CONFIG_PARSE_ERROR: "VULPES_E003",
  CONFIG_VALIDATION_FAILED: "VULPES_E004",
  CONFIG_DEPRECATED: "VULPES_E005",

  // Validation Errors (E100-E199)
  VALIDATION_FAILED: "VULPES_E100",
  INVALID_INPUT: "VULPES_E101",
  INVALID_PHI_TYPE: "VULPES_E102",
  INVALID_PATTERN: "VULPES_E103",
  INVALID_THRESHOLD: "VULPES_E104",
  EMPTY_INPUT: "VULPES_E105",

  // Runtime Errors (E200-E299)
  RUNTIME_ERROR: "VULPES_E200",
  TIMEOUT: "VULPES_E201",
  MEMORY_EXCEEDED: "VULPES_E202",
  STACK_OVERFLOW: "VULPES_E203",
  ASYNC_ERROR: "VULPES_E204",

  // Network Errors (E300-E399)
  NETWORK_ERROR: "VULPES_E300",
  CONNECTION_REFUSED: "VULPES_E301",
  TIMEOUT_NETWORK: "VULPES_E302",
  DNS_RESOLUTION_FAILED: "VULPES_E303",
  SSL_ERROR: "VULPES_E304",

  // Filesystem Errors (E400-E499)
  FILE_NOT_FOUND: "VULPES_E400",
  PERMISSION_DENIED: "VULPES_E401",
  DISK_FULL: "VULPES_E402",
  FILE_LOCKED: "VULPES_E403",
  INVALID_PATH: "VULPES_E404",
  FILE_TOO_LARGE: "VULPES_E405",

  // Security Errors (E500-E599)
  SECURITY_VIOLATION: "VULPES_E500",
  UNAUTHORIZED: "VULPES_E501",
  FORBIDDEN: "VULPES_E502",
  AUDIT_FAILURE: "VULPES_E503",
  ENCRYPTION_FAILED: "VULPES_E504",
  DECRYPTION_FAILED: "VULPES_E505",
  INTEGRITY_CHECK_FAILED: "VULPES_E506",

  // Compliance Errors (E600-E699)
  HIPAA_VIOLATION: "VULPES_E600",
  RETENTION_POLICY_VIOLATION: "VULPES_E601",
  LEGAL_HOLD_ACTIVE: "VULPES_E602",
  AUDIT_TRAIL_INCOMPLETE: "VULPES_E603",
  PHI_EXPOSURE_RISK: "VULPES_E604",

  // Detection Errors (E700-E799)
  DETECTION_FAILED: "VULPES_E700",
  FILTER_ERROR: "VULPES_E701",
  PATTERN_COMPILATION_FAILED: "VULPES_E702",
  DICTIONARY_LOAD_FAILED: "VULPES_E703",
  CONFIDENCE_CALCULATION_ERROR: "VULPES_E704",
  SPAN_CONFLICT: "VULPES_E705",

  // Pipeline Errors (E800-E899)
  PIPELINE_ERROR: "VULPES_E800",
  STAGE_FAILED: "VULPES_E801",
  ORCHESTRATION_ERROR: "VULPES_E802",
  PARALLEL_EXECUTION_FAILED: "VULPES_E803",
  POST_FILTER_ERROR: "VULPES_E804",

  // Integration Errors (E900-E999)
  INTEGRATION_ERROR: "VULPES_E900",
  MCP_ERROR: "VULPES_E901",
  FHIR_EXPORT_FAILED: "VULPES_E902",
  BLOCKCHAIN_ANCHOR_FAILED: "VULPES_E903",
  OTEL_EXPORT_FAILED: "VULPES_E904",
  EXTERNAL_SERVICE_ERROR: "VULPES_E905",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ============================================================================
// VulpesError Class
// ============================================================================

export class VulpesError extends Error {
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

  constructor(options: VulpesErrorOptions) {
    super(options.description);

    this.name = "VulpesError";
    this.code = options.code;
    this.title = options.title;
    this.description = options.description;
    this.category = options.category;
    this.severity = options.severity ?? "error";
    this.reason = options.reason;
    this.resolution = options.resolution ?? [];
    this.docUrl = options.docUrl ?? this.generateDocUrl(options.code);
    this.context = options.context ?? {};
    this.cause = options.cause;
    this.recoverable = options.recoverable ?? false;
    this.timestamp = new Date().toISOString();
    this.correlationId = this.generateCorrelationId();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, VulpesError);
    }

    // Chain cause stack trace
    if (this.cause?.stack) {
      this.stack = `${this.stack}\n\nCaused by: ${this.cause.stack}`;
    }
  }

  private generateDocUrl(code: string): string {
    return `https://docs.vulpes-celare.dev/errors/${code.toLowerCase()}`;
  }

  private generateCorrelationId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }

  // ============================================================================
  // Output Formatting
  // ============================================================================

  toHumanReadable(useColor = true): string {
    const c = useColor ? this.getColorFunctions() : this.getNoColorFunctions();
    const lines: string[] = [];

    // Header
    lines.push("");
    lines.push(c.box("╭" + "─".repeat(70) + "╮"));
    lines.push(
      c.box("│") +
        " " +
        c.severity(this.getSeverityIcon()) +
        " " +
        c.code(`[${this.code}]`) +
        " " +
        c.title(this.title) +
        " ".repeat(Math.max(0, 60 - this.code.length - this.title.length)) +
        c.box("│")
    );
    lines.push(c.box("├" + "─".repeat(70) + "┤"));

    // Description
    const descLines = this.wrapText(this.description, 68);
    for (const line of descLines) {
      lines.push(c.box("│") + " " + line + " ".repeat(68 - line.length) + " " + c.box("│"));
    }

    // Reason (if present)
    if (this.reason) {
      lines.push(c.box("│") + " ".repeat(69) + c.box("│"));
      lines.push(c.box("│") + " " + c.label("Why:") + " ".repeat(64) + c.box("│"));
      const reasonLines = this.wrapText(this.reason, 66);
      for (const line of reasonLines) {
        lines.push(c.box("│") + "   " + line + " ".repeat(66 - line.length) + c.box("│"));
      }
    }

    // Resolution steps
    if (this.resolution.length > 0) {
      lines.push(c.box("│") + " ".repeat(69) + c.box("│"));
      lines.push(c.box("│") + " " + c.label("How to fix:") + " ".repeat(57) + c.box("│"));
      for (let i = 0; i < this.resolution.length; i++) {
        const step = `${i + 1}. ${this.resolution[i]}`;
        const stepLines = this.wrapText(step, 66);
        for (const line of stepLines) {
          lines.push(c.box("│") + "   " + c.resolution(line) + " ".repeat(66 - line.length) + c.box("│"));
        }
      }
    }

    // Context (if present and non-empty)
    const contextEntries = Object.entries(this.context).filter(
      ([_, v]) => v !== undefined
    );
    if (contextEntries.length > 0) {
      lines.push(c.box("│") + " ".repeat(69) + c.box("│"));
      lines.push(c.box("│") + " " + c.label("Context:") + " ".repeat(60) + c.box("│"));
      for (const [key, value] of contextEntries) {
        const contextLine = `  ${key}: ${this.formatContextValue(value)}`;
        const truncated =
          contextLine.length > 66
            ? contextLine.substring(0, 63) + "..."
            : contextLine;
        lines.push(
          c.box("│") +
            "   " +
            c.context(truncated) +
            " ".repeat(66 - truncated.length) +
            c.box("│")
        );
      }
    }

    // Documentation link
    if (this.docUrl) {
      lines.push(c.box("│") + " ".repeat(69) + c.box("│"));
      lines.push(
        c.box("│") +
          " " +
          c.label("Docs:") +
          " " +
          c.link(this.docUrl) +
          " ".repeat(Math.max(0, 62 - this.docUrl.length)) +
          c.box("│")
      );
    }

    // Footer
    lines.push(c.box("╰" + "─".repeat(70) + "╯"));
    lines.push("");

    return lines.join("\n");
  }

  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxWidth) {
        currentLine += (currentLine ? " " : "") + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines;
  }

  private formatContextValue(value: unknown): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") return `"${value}"`;
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return "[Object]";
      }
    }
    return String(value);
  }

  private getSeverityIcon(): string {
    switch (this.severity) {
      case "fatal":
        return "💀";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
    }
  }

  private getColorFunctions() {
    // Attempt to use chalk if available, otherwise fall back to ANSI codes
    const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
    const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
    const blue = (s: string) => `\x1b[34m${s}\x1b[0m`;
    const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
    const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
    const gray = (s: string) => `\x1b[90m${s}\x1b[0m`;
    const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
    const underline = (s: string) => `\x1b[4m${s}\x1b[0m`;

    return {
      box: gray,
      code: (s: string) => bold(cyan(s)),
      title: (s: string) => bold(red(s)),
      label: (s: string) => bold(yellow(s)),
      resolution: green,
      context: gray,
      link: (s: string) => underline(blue(s)),
      severity: (s: string) => s,
    };
  }

  private getNoColorFunctions() {
    const identity = (s: string) => s;
    return {
      box: identity,
      code: identity,
      title: identity,
      label: identity,
      resolution: identity,
      context: identity,
      link: identity,
      severity: identity,
    };
  }

  // ============================================================================
  // JSON Serialization
  // ============================================================================

  toJSON(): object {
    return {
      error: true,
      code: this.code,
      title: this.title,
      description: this.description,
      category: this.category,
      severity: this.severity,
      reason: this.reason,
      resolution: this.resolution,
      docUrl: this.docUrl,
      context: this.context,
      recoverable: this.recoverable,
      timestamp: this.timestamp,
      correlationId: this.correlationId,
      stack: this.stack,
      cause: this.cause
        ? {
            name: this.cause.name,
            message: this.cause.message,
            stack: this.cause.stack,
          }
        : undefined,
    };
  }

  toString(): string {
    return `${this.code}: ${this.title} - ${this.description}`;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  withContext(additionalContext: ErrorContext): VulpesError {
    return new VulpesError({
      code: this.code,
      title: this.title,
      description: this.description,
      category: this.category,
      severity: this.severity,
      reason: this.reason,
      resolution: this.resolution,
      docUrl: this.docUrl,
      context: { ...this.context, ...additionalContext },
      cause: this.cause,
      recoverable: this.recoverable,
    });
  }

  withResolution(steps: string[]): VulpesError {
    return new VulpesError({
      code: this.code,
      title: this.title,
      description: this.description,
      category: this.category,
      severity: this.severity,
      reason: this.reason,
      resolution: [...this.resolution, ...steps],
      docUrl: this.docUrl,
      context: this.context,
      cause: this.cause,
      recoverable: this.recoverable,
    });
  }

  static isVulpesError(error: unknown): error is VulpesError {
    return error instanceof VulpesError;
  }

  static fromError(error: Error, defaults?: Partial<VulpesErrorOptions>): VulpesError {
    if (VulpesError.isVulpesError(error)) {
      return error;
    }

    return new VulpesError({
      code: defaults?.code ?? ERROR_CODES.RUNTIME_ERROR,
      title: defaults?.title ?? error.name,
      description: error.message,
      category: defaults?.category ?? "runtime",
      severity: defaults?.severity ?? "error",
      reason: defaults?.reason,
      resolution: defaults?.resolution,
      context: defaults?.context,
      cause: error,
      recoverable: defaults?.recoverable ?? false,
    });
  }
}

// ============================================================================
// Error Factory Functions
// ============================================================================

export function createConfigError(
  message: string,
  options?: Partial<VulpesErrorOptions>
): VulpesError {
  return new VulpesError({
    code: ERROR_CODES.CONFIG_INVALID,
    title: "Configuration Error",
    description: message,
    category: "configuration",
    severity: "error",
    resolution: [
      "Check your configuration file syntax",
      "Verify all required fields are present",
      "Run 'vulpes diagnose' to validate configuration",
    ],
    ...options,
  });
}

export function createValidationError(
  message: string,
  options?: Partial<VulpesErrorOptions>
): VulpesError {
  return new VulpesError({
    code: ERROR_CODES.VALIDATION_FAILED,
    title: "Validation Error",
    description: message,
    category: "validation",
    severity: "error",
    resolution: [
      "Check the input data format",
      "Ensure all required fields are provided",
    ],
    ...options,
  });
}

export function createFileError(
  message: string,
  filePath: string,
  options?: Partial<VulpesErrorOptions>
): VulpesError {
  return new VulpesError({
    code: ERROR_CODES.FILE_NOT_FOUND,
    title: "File Error",
    description: message,
    category: "filesystem",
    severity: "error",
    context: { file: filePath },
    resolution: [
      `Verify the file exists at: ${filePath}`,
      "Check file permissions",
      "Ensure the path is correct",
    ],
    ...options,
  });
}

export function createSecurityError(
  message: string,
  options?: Partial<VulpesErrorOptions>
): VulpesError {
  return new VulpesError({
    code: ERROR_CODES.SECURITY_VIOLATION,
    title: "Security Violation",
    description: message,
    category: "security",
    severity: "fatal",
    resolution: [
      "Review security configuration",
      "Check audit logs for suspicious activity",
      "Contact your security administrator",
    ],
    ...options,
  });
}

export function createComplianceError(
  message: string,
  options?: Partial<VulpesErrorOptions>
): VulpesError {
  return new VulpesError({
    code: ERROR_CODES.HIPAA_VIOLATION,
    title: "HIPAA Compliance Error",
    description: message,
    category: "compliance",
    severity: "fatal",
    resolution: [
      "Review HIPAA compliance requirements",
      "Check retention policy configuration",
      "Ensure all PHI is properly protected",
      "Contact your compliance officer",
    ],
    ...options,
  });
}

export function createDetectionError(
  message: string,
  phiType?: string,
  options?: Partial<VulpesErrorOptions>
): VulpesError {
  return new VulpesError({
    code: ERROR_CODES.DETECTION_FAILED,
    title: "PHI Detection Error",
    description: message,
    category: "detection",
    severity: "error",
    context: phiType ? { phiType } : undefined,
    resolution: [
      "Check filter configuration",
      "Verify pattern definitions",
      "Run diagnostics to identify the issue",
    ],
    ...options,
  });
}

export function createPipelineError(
  message: string,
  stage?: string,
  options?: Partial<VulpesErrorOptions>
): VulpesError {
  return new VulpesError({
    code: ERROR_CODES.PIPELINE_ERROR,
    title: "Pipeline Error",
    description: message,
    category: "pipeline",
    severity: "error",
    context: stage ? { stage } : undefined,
    resolution: [
      "Check pipeline configuration",
      "Enable tracing with VULPES_TRACE=1 for detailed logs",
      "Review stage-specific error messages",
    ],
    ...options,
  });
}

export function createIntegrationError(
  message: string,
  service: string,
  options?: Partial<VulpesErrorOptions>
): VulpesError {
  return new VulpesError({
    code: ERROR_CODES.INTEGRATION_ERROR,
    title: "Integration Error",
    description: message,
    category: "integration",
    severity: "error",
    context: { service },
    resolution: [
      `Check ${service} service configuration`,
      `Verify ${service} is accessible`,
      "Review integration credentials",
    ],
    ...options,
  });
}

// ============================================================================
// Error Aggregator
// ============================================================================

export class ErrorAggregator {
  private errors: VulpesError[] = [];

  add(error: VulpesError): void {
    this.errors.push(error);
  }

  addFromError(error: Error, defaults?: Partial<VulpesErrorOptions>): void {
    this.errors.push(VulpesError.fromError(error, defaults));
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  hasFatalErrors(): boolean {
    return this.errors.some((e) => e.severity === "fatal");
  }

  getErrors(): VulpesError[] {
    return [...this.errors];
  }

  getByCategory(category: ErrorCategory): VulpesError[] {
    return this.errors.filter((e) => e.category === category);
  }

  getBySeverity(severity: ErrorSeverity): VulpesError[] {
    return this.errors.filter((e) => e.severity === severity);
  }

  clear(): void {
    this.errors = [];
  }

  toSummary(): string {
    if (this.errors.length === 0) {
      return "No errors";
    }

    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const error of this.errors) {
      byCategory[error.category] = (byCategory[error.category] ?? 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] ?? 0) + 1;
    }

    const lines = [`${this.errors.length} error(s) occurred:`];
    lines.push(`  By severity: ${JSON.stringify(bySeverity)}`);
    lines.push(`  By category: ${JSON.stringify(byCategory)}`);

    return lines.join("\n");
  }

  toJSON(): object[] {
    return this.errors.map((e) => e.toJSON());
  }
}
