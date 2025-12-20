/**
 * Vulpes Celare - Plugin Type Definitions
 *
 * Gold Standard: Strongly typed plugin interfaces based on:
 * - Bifrost LLM Gateway middleware patterns
 * - Anthropic MCP tool/resource types
 * - VSCode Extension Host isolation model
 *
 * @module plugins/types
 */

import { FilterType } from "../models/Span";

// ============================================================================
// CORE PLUGIN TYPES
// ============================================================================

/**
 * Minimal span interface for plugin authors.
 * Avoids exposing internal Span implementation details.
 */
export interface SpanLike {
  /** The detected text */
  text: string;
  /** Start position in original document */
  characterStart: number;
  /** End position in original document */
  characterEnd: number;
  /** PHI type (NAME, SSN, DATE, etc.) */
  filterType: FilterType | string;
  /** Detection confidence 0.0-1.0 */
  confidence: number;
  /** Execution priority (lower = higher priority) */
  priority?: number;
  /** Replacement token (if already assigned) */
  replacement?: string;
  /** Pattern that matched (for debugging) */
  pattern?: string;
  /** Context window before the span */
  windowBefore?: string;
  /** Context window after the span */
  windowAfter?: string;
}

/**
 * Document context passed to plugins.
 * Contains text and metadata without internal pipeline state.
 */
export interface DocumentContext {
  /** The document text (may be modified by earlier plugins) */
  text: string;
  /** Detected document type (admission, discharge, radiology, etc.) */
  documentType?: string;
  /** Document structure information */
  structure?: {
    /** Field labels detected in document */
    fieldLabels?: string[];
    /** Section headings detected */
    sectionHeadings?: string[];
    /** Whether document appears to be OCR'd */
    isOcr?: boolean;
  };
  /** Arbitrary metadata from the redaction context */
  metadata?: Record<string, unknown>;
  /** Session ID for correlation */
  sessionId?: string;
}

/**
 * Result returned after redaction.
 * Plugins can modify this in postRedaction hooks.
 */
export interface RedactionResultLike {
  /** The redacted text with tokens applied */
  text: string;
  /** Spans that were applied */
  appliedSpans: SpanLike[];
  /** Execution report summary */
  report: {
    totalFilters: number;
    filtersExecuted: number;
    totalSpansDetected: number;
    totalExecutionTimeMs: number;
    /** Plugin execution times (added by plugin system) */
    pluginTimes?: Record<string, number>;
  };
}

/**
 * Result for short-circuiting the pipeline.
 * Returned by canShortCircuit hook to skip full processing.
 */
export interface ShortCircuitResult {
  /** The redacted text */
  text: string;
  /** Pre-computed spans to apply */
  spans: SpanLike[];
  /** Reason for short-circuit (for logging/debugging) */
  reason: string;
  /** Confidence in the short-circuit result 0.0-1.0 */
  confidence: number;
  /** Source of the short-circuit (cache, rule, etc.) */
  source: string;
}

// ============================================================================
// PRIORITY GROUPS
// ============================================================================

/**
 * Priority groups for plugin execution order.
 * Lower numbers execute first.
 *
 * @example
 * ```typescript
 * export const myPlugin: VulpesPluginV2 = {
 *   name: 'my-security-plugin',
 *   priority: PluginPriority.SECURITY, // Runs early
 *   hooks: { ... }
 * };
 * ```
 */
export const PluginPriority = {
  /** Security-critical plugins (0-19) - run first */
  SECURITY: 10,
  /** Core functionality plugins (20-39) */
  CORE: 30,
  /** Standard plugins (40-59) - default */
  STANDARD: 50,
  /** Enhancement plugins (60-79) */
  ENHANCEMENT: 70,
  /** Logging/observability plugins (80-99) - run last */
  LOGGING: 90,
} as const;

export type PluginPriorityLevel = (typeof PluginPriority)[keyof typeof PluginPriority];

// ============================================================================
// HOOK INTERFACES (V2 - Typed)
// ============================================================================

/**
 * Typed hook interface for V2 plugins.
 * All hooks are optional and async-compatible.
 */
export interface VulpesPluginHooks {
  /**
   * Called before any processing begins.
   * Can modify the document text or metadata.
   *
   * @param doc - Document context
   * @returns Modified document context (or original if unchanged)
   */
  preProcess?(doc: DocumentContext): Promise<DocumentContext> | DocumentContext;

  /**
   * Check if this plugin can short-circuit the pipeline.
   * If non-null is returned, the pipeline skips to applying spans directly.
   *
   * Use cases:
   * - Cache hits
   * - Known document templates
   * - Pre-computed redactions
   *
   * @param doc - Document context
   * @returns ShortCircuitResult to skip pipeline, or null to continue
   */
  canShortCircuit?(
    doc: DocumentContext
  ): Promise<ShortCircuitResult | null> | ShortCircuitResult | null;

  /**
   * Called after filters detect spans, before disambiguation.
   * Can add, remove, or modify spans.
   *
   * @param spans - Detected spans from all filters
   * @param doc - Document context
   * @returns Modified span array
   */
  postDetection?(
    spans: SpanLike[],
    doc: DocumentContext
  ): Promise<SpanLike[]> | SpanLike[];

  /**
   * Called after all filtering/disambiguation, before token application.
   * Last chance to modify spans before they become replacements.
   *
   * @param spans - Final filtered spans
   * @param doc - Document context
   * @returns Modified span array
   */
  preRedaction?(
    spans: SpanLike[],
    doc: DocumentContext
  ): Promise<SpanLike[]> | SpanLike[];

  /**
   * Called after redaction is complete.
   * Can modify the final result (text, metadata, report).
   *
   * @param result - Redaction result
   * @returns Modified result
   */
  postRedaction?(
    result: RedactionResultLike
  ): Promise<RedactionResultLike> | RedactionResultLike;
}

/**
 * V2 Plugin interface with typed hooks and priority.
 * Replaces the legacy PluginInstance interface for new plugins.
 */
export interface VulpesPluginV2 {
  /** Unique plugin name */
  name: string;

  /** Plugin version (semver) */
  version: string;

  /** Human-readable description */
  description?: string;

  /**
   * Execution priority (0-99).
   * Lower numbers execute earlier.
   * Use PluginPriority constants for standard values.
   * Default: 50 (STANDARD)
   */
  priority?: number;

  /**
   * Hook timeout in milliseconds.
   * Plugin hooks that exceed this will be terminated.
   * Default: 5000ms
   */
  timeoutMs?: number;

  /**
   * Whether this plugin requires isolation (Worker Thread).
   * Default: false (runs in main thread)
   */
  isolated?: boolean;

  /** Plugin lifecycle hooks */
  hooks: VulpesPluginHooks;

  /**
   * Called when plugin is loaded.
   * Use for initialization, resource allocation.
   */
  onLoad?(context: PluginContextV2): Promise<void> | void;

  /**
   * Called when plugin is unloaded.
   * Use for cleanup, resource release.
   */
  onUnload?(): Promise<void> | void;

  /**
   * Called when plugin is enabled.
   */
  onEnable?(): Promise<void> | void;

  /**
   * Called when plugin is disabled.
   */
  onDisable?(): Promise<void> | void;
}

/**
 * Context provided to plugins during initialization.
 */
export interface PluginContextV2 {
  /** Plugin configuration from vulpes config */
  config: Record<string, unknown>;

  /** Vulpes Celare version */
  vulpesVersion: string;

  /** Logger for plugin use */
  logger: {
    debug(message: string, meta?: Record<string, unknown>): void;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
  };

  /** Get a service from the container (for advanced plugins) */
  getService?<T>(serviceId: symbol): T | undefined;
}

// ============================================================================
// PLUGIN METRICS
// ============================================================================

/**
 * Metrics collected for each plugin.
 */
export interface PluginMetrics {
  /** Plugin name */
  name: string;
  /** Total invocations */
  invocations: number;
  /** Total errors */
  errors: number;
  /** Total timeouts */
  timeouts: number;
  /** Average execution time (ms) */
  avgExecutionTimeMs: number;
  /** Max execution time (ms) */
  maxExecutionTimeMs: number;
  /** Min execution time (ms) */
  minExecutionTimeMs: number;
  /** Last error message */
  lastError?: string;
  /** Last error timestamp */
  lastErrorAt?: string;
  /** Short-circuits provided */
  shortCircuits: number;
}

/**
 * Aggregated metrics for all plugins.
 */
export interface PluginSystemMetrics {
  /** Total plugins loaded */
  totalPlugins: number;
  /** Enabled plugins */
  enabledPlugins: number;
  /** Total hook invocations across all plugins */
  totalInvocations: number;
  /** Total errors across all plugins */
  totalErrors: number;
  /** Total timeouts across all plugins */
  totalTimeouts: number;
  /** Per-plugin metrics */
  plugins: Record<string, PluginMetrics>;
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * @deprecated Use VulpesPluginHooks instead.
 * Maintained for backward compatibility with existing plugins.
 */
export interface LegacyHookPlugin {
  beforeRedaction?(text: string): string | Promise<string>;
  afterRedaction?(result: unknown): unknown | Promise<unknown>;
  beforeFilter?(spans: unknown[]): unknown[] | Promise<unknown[]>;
  afterFilter?(spans: unknown[]): unknown[] | Promise<unknown[]>;
}

/**
 * Type guard to check if a plugin uses V2 interface.
 */
export function isPluginV2(plugin: unknown): plugin is VulpesPluginV2 {
  return (
    typeof plugin === "object" &&
    plugin !== null &&
    "hooks" in plugin &&
    typeof (plugin as VulpesPluginV2).hooks === "object"
  );
}

/**
 * Type guard to check if a plugin uses legacy interface.
 */
export function isLegacyPlugin(plugin: unknown): plugin is { hooks: LegacyHookPlugin } {
  return (
    typeof plugin === "object" &&
    plugin !== null &&
    "hooks" in plugin &&
    typeof (plugin as { hooks: LegacyHookPlugin }).hooks === "object" &&
    !isPluginV2(plugin)
  );
}
