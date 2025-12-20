/**
 * ============================================================================
 * VULPES CELARE
 * ============================================================================
 *
 * Hatkoff Redaction Engine
 *
 * A HIPAA Safe Harbor PHI redaction engine.
 *
 * Current validation is synthetic-only; see `docs/BENCHMARKS.md` for the latest
 * evaluation posture and results.
 *
 * This is the MAIN ORCHESTRATOR - your primary integration point.
 *
 * QUICK START:
 *   const safe = await VulpesCelare.redact(medicalDocument);
 *
 * @module VulpesCelare
 * @version 1.0.0
 * @author Hatkoff
 */

import {
  ParallelRedactionEngine,
  RedactionExecutionReport,
} from "./core/ParallelRedactionEngine";
import { SpanBasedFilter } from "./core/SpanBasedFilter";
import { Span } from "./models/Span";
import { SpanPool } from "./core/SpanPool";
import { RedactionContext } from "./context/RedactionContext";
import {
  ImageRedactor,
  ImageRedactionResult,
  VisualPolicy,
} from "./core/images";
import {
  SupervisedStreamingRedactor,
  SupervisedStreamingConfig,
  createSupervisedStreamingRedactor,
} from "./SupervisedStreamingRedactor";
import {
  ENGINE_NAME,
  VARIANT as ENGINE_VARIANT,
  VERSION as PACKAGE_VERSION,
} from "./meta";
import {
  TrustBundleExporter,
  TrustBundle,
  TrustBundleOptions,
  VerificationResult,
} from "./provenance/TrustBundleExporter";

// ============================================================================
// FILTER IMPORTS - Organized by Category
// ============================================================================

// Identity Filters
import { SmartNameFilterSpan } from "./filters/SmartNameFilterSpan";
import { FormattedNameFilterSpan } from "./filters/FormattedNameFilterSpan";
import { TitledNameFilterSpan } from "./filters/TitledNameFilterSpan";
import { FamilyNameFilterSpan } from "./filters/FamilyNameFilterSpan";

// Government ID Filters
import { SSNFilterSpan } from "./filters/SSNFilterSpan";
import { PassportNumberFilterSpan } from "./filters/PassportNumberFilterSpan";
import { LicenseNumberFilterSpan } from "./filters/LicenseNumberFilterSpan";

// Contact Filters
import { PhoneFilterSpan } from "./filters/PhoneFilterSpan";
import { FaxNumberFilterSpan } from "./filters/FaxNumberFilterSpan";
import { EmailFilterSpan } from "./filters/EmailFilterSpan";
import { AddressFilterSpan } from "./filters/AddressFilterSpan";
import { ZipCodeFilterSpan } from "./filters/ZipCodeFilterSpan";

// Medical Identifier Filters
import { MRNFilterSpan } from "./filters/MRNFilterSpan";
import { HealthPlanNumberFilterSpan } from "./filters/HealthPlanNumberFilterSpan";
// HospitalFilterSpan removed - hospital names are NOT PHI under HIPAA Safe Harbor
import { AgeFilterSpan } from "./filters/AgeFilterSpan";
import { DateFilterSpan } from "./filters/DateFilterSpan";

// Financial Filters
import { CreditCardFilterSpan } from "./filters/CreditCardFilterSpan";
import { AccountNumberFilterSpan } from "./filters/AccountNumberFilterSpan";

// Technical Identifier Filters
import { IPAddressFilterSpan } from "./filters/IPAddressFilterSpan";
import { URLFilterSpan } from "./filters/URLFilterSpan";
import { DeviceIdentifierFilterSpan } from "./filters/DeviceIdentifierFilterSpan";
import { VehicleIdentifierFilterSpan } from "./filters/VehicleIdentifierFilterSpan";
import { BiometricContextFilterSpan } from "./filters/BiometricContextFilterSpan";

// Context-Aware Filters - OPTIONAL, enabled via VULPES_CONTEXT_FILTERS=1
// The ContextualConfidenceModifier in the pipeline provides the WIN-WIN effect
// These filters add additional context-based detection but may increase false positives
import { ContextAwareNameFilter } from "./filters/ContextAwareNameFilter";
import { RelativeDateFilterSpan } from "./filters/RelativeDateFilterSpan";
import { ContextAwareAddressFilter } from "./filters/ContextAwareAddressFilter";

/**
 * Check if context-aware filters are enabled via environment variable
 */
function isContextFiltersEnabled(): boolean {
  return process.env.VULPES_CONTEXT_FILTERS === "1";
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type PHIType =
  | "name"
  | "ssn"
  | "phone"
  | "email"
  | "address"
  | "date"
  | "mrn"
  | "ip"
  | "url"
  | "credit_card"
  | "account"
  | "health_plan"
  | "license"
  | "passport"
  | "vehicle"
  | "device"
  | "biometric"
  | "zip"
  | "fax"
  | "age";

export type ReplacementStyle = "brackets" | "asterisks" | "empty";

export interface VulpesCelareConfig {
  enabledTypes?: PHIType[];
  disabledTypes?: PHIType[];
  replacementStyle?: ReplacementStyle;
  customReplacements?: Partial<Record<PHIType, string>>;
  customFilters?: SpanBasedFilter[];
}

export interface RedactionResult {
  text: string;
  redactionCount: number;
  breakdown: Record<string, number>;
  executionTimeMs: number;
  report?: RedactionExecutionReport;
  /**
   * The spans that were applied during redaction.
   * Use with ExplanationGenerator for audit trails.
   */
  spans?: Span[];
}

/**
 * Extended redaction result that includes cryptographic provenance
 */
export interface RedactionResultWithProvenance extends RedactionResult {
  /**
   * Trust Bundle containing cryptographic proof of redaction
   * Can be exported to a .red file for audit purposes
   */
  trustBundle: TrustBundle;
}

/**
 * Options for provenance-enabled redaction
 */
export interface ProvenanceOptions extends TrustBundleOptions {
  /**
   * If provided, automatically export Trust Bundle to this path
   */
  exportPath?: string;
}

// ============================================================================
// MAIN CLASS
// ============================================================================

export interface FilterProvider {
  getFilters(config: VulpesCelareConfig): SpanBasedFilter[];
}

export interface PolicyProvider {
  getPolicy(config: VulpesCelareConfig): any;
}

export class VulpesCelare {
  private filters: SpanBasedFilter[];
  private policy: any;
  private config: VulpesCelareConfig;

  // Default PHI types enabled for HIPAA Safe Harbor compliance
  // Note: credit_card and passport are available but not enabled by default
  // (credit_card is PCI-DSS, passport is not in HIPAA 18 identifiers)
  static readonly ALL_PHI_TYPES: PHIType[] = [
    "name",
    "ssn",
    "phone",
    "email",
    "address",
    "date",
    "mrn",
    "ip",
    "url",
    "account",
    "health_plan",
    "license",
    "vehicle",
    "device",
    "biometric",
    "zip",
    "fax",
    "age",
  ];

  // Optional PHI types (not enabled by default)
  // - credit_card: PCI-DSS compliance, not HIPAA
  // - passport: Not in HIPAA Safe Harbor 18 identifiers
  static readonly OPTIONAL_PHI_TYPES: PHIType[] = [
    "credit_card",
    "passport",
  ];

  static readonly VERSION = PACKAGE_VERSION;
  static readonly NAME = ENGINE_NAME;
  static readonly VARIANT = ENGINE_VARIANT;

  constructor(
    config: VulpesCelareConfig = {},
    dependencies?: {
      filterProvider?: FilterProvider;
      policyProvider?: PolicyProvider;
    },
  ) {
    this.config = config;

    // Pre-warm span pool for optimal first-request performance
    // Pool eliminates GC pressure by reusing Span objects
    if (!SpanPool.isInitialized()) {
      SpanPool.prewarm(500);
    }

    // Use injected providers or fall back to internal implementations
    if (dependencies?.filterProvider) {
      this.filters = dependencies.filterProvider.getFilters(config);
    } else {
      this.filters = this.buildFilters(config);
    }

    if (dependencies?.policyProvider) {
      this.policy = dependencies.policyProvider.getPolicy(config);
    } else {
      this.policy = this.buildPolicy(config);
    }
  }

  static async redact(text: string): Promise<string> {
    return (await new VulpesCelare().process(text)).text;
  }

  static async redactWithDetails(
    text: string,
    config?: VulpesCelareConfig,
  ): Promise<RedactionResult> {
    return new VulpesCelare(config).process(text);
  }

  /**
   * Redact PHI with full cryptographic provenance.
   *
   * This method generates a Trust Bundle that provides:
   * - SHA-256 hash of original document (without storing original)
   * - SHA-256 hash of redacted document
   * - Merkle proof for tamper detection
   * - Certificate with attestations
   * - Policy configuration used
   *
   * The Trust Bundle can be exported to a .red file for auditing.
   *
   * @param text - Original text to redact
   * @param options - Provenance and bundle options
   * @returns Redaction result with embedded Trust Bundle
   *
   * @example
   * ```typescript
   * // Redact with provenance
   * const result = await VulpesCelare.redactWithProvenance(clinicalNote, {
   *   policyName: 'hipaa-strict',
   *   documentId: 'doc-12345',
   *   actorId: 'system',
   *   exportPath: './audit/patient-note.red'
   * });
   *
   * console.log(result.text); // Redacted text
   * console.log(result.trustBundle.certificate.cryptographicProofs);
   * ```
   */
  static async redactWithProvenance(
    text: string,
    options: ProvenanceOptions = {},
  ): Promise<RedactionResultWithProvenance> {
    const instance = new VulpesCelare();
    const result = await instance.process(text);

    // Generate Trust Bundle with cryptographic proofs
    const trustBundle = await TrustBundleExporter.generate(
      text,
      result.text,
      result,
      options,
    );

    // Auto-export if path provided
    if (options.exportPath) {
      await TrustBundleExporter.export(trustBundle, options.exportPath);
    }

    return {
      ...result,
      trustBundle,
    };
  }

  /**
   * Verify a Trust Bundle (.red file) for audit purposes.
   *
   * Checks:
   * - All required files exist
   * - Hash integrity (document hasn't been modified)
   * - Merkle proof consistency
   * - Certificate validity
   *
   * @param bundlePath - Path to .red file
   * @returns Verification result with detailed checks
   *
   * @example
   * ```typescript
   * const verification = await VulpesCelare.verifyTrustBundle('./audit/note.red');
   * if (verification.valid) {
   *   console.log('✔ Bundle verified - document integrity confirmed');
   * } else {
   *   console.error('✖ Verification failed:', verification.errors);
   * }
   * ```
   */
  static async verifyTrustBundle(bundlePath: string): Promise<VerificationResult> {
    return TrustBundleExporter.verify(bundlePath);
  }

  /**
   * Export a Trust Bundle to a .red file.
   *
   * @param bundle - Trust Bundle to export
   * @param outputPath - Output path (will add .red extension if missing)
   * @returns Path to created file
   */
  static async exportTrustBundle(
    bundle: TrustBundle,
    outputPath: string,
  ): Promise<string> {
    return TrustBundleExporter.export(bundle, outputPath);
  }

  /**
   * Process multiple documents in parallel using WebGPU batch processing.
   * Falls back to CPU parallel processing if WebGPU is unavailable.
   *
   * Optimal for processing 10+ documents simultaneously.
   *
   * @param documents - Array of text documents to redact
   * @param config - Optional redaction configuration
   * @returns Array of redaction results with batch statistics
   */
  static async processBatchGPU(
    documents: string[],
    config?: VulpesCelareConfig,
  ): Promise<{
    results: RedactionResult[];
    stats: {
      totalDocuments: number;
      totalTimeMs: number;
      throughputDocsPerSec: number;
      method: "webgpu" | "cpu-parallel" | "cpu-sequential";
    };
  }> {
    // Dynamic import to avoid loading GPU module when not needed
    const { processBatch } = await import("./gpu");

    const batchResult = await processBatch(documents, {
      redactionConfig: config,
    });

    return {
      results: batchResult.results.map((r) => ({
        text: r.redactedText,
        redactionCount: r.statistics.totalRedactions,
        breakdown: {},
        executionTimeMs: r.statistics.processingTimeMs,
      })),
      stats: {
        totalDocuments: batchResult.stats.totalDocuments,
        totalTimeMs: batchResult.stats.totalTimeMs,
        throughputDocsPerSec: batchResult.stats.throughputDocsPerSec,
        method: batchResult.stats.method,
      },
    };
  }

  /**
   * Low-level orchestrator entrypoint used by legacy `RedactionEngine`.
   *
   * @internal
   */
  static async redactWithPolicy(
    text: string,
    filters: SpanBasedFilter[],
    policy: any,
    context: RedactionContext,
  ): Promise<string> {
    return ParallelRedactionEngine.redactParallel(
      text,
      filters,
      policy,
      context,
    );
  }

  /**
   * Create a fault-tolerant streaming redactor with Elixir-style supervision.
   *
   * Features:
   * - Circuit breaker pattern for failure isolation
   * - Backpressure queue for flow control
   * - Automatic recovery from transient failures
   * - Health monitoring and metrics
   *
   * Ideal for:
   * - Real-time dictation systems
   * - High-volume streaming APIs
   * - Production environments requiring fault tolerance
   *
   * @param config - Optional supervision configuration
   * @returns SupervisedStreamingRedactor instance
   *
   * @example
   * ```typescript
   * const redactor = VulpesCelare.createSupervisedStreamingRedactor();
   * redactor.on('redacted', (chunk) => console.log(chunk.text));
   * redactor.on('error', (err) => console.error(err));
   * await redactor.start();
   * redactor.write('Patient John Smith...');
   * ```
   */
  static createSupervisedStreamingRedactor(
    config?: Partial<SupervisedStreamingConfig>,
  ): SupervisedStreamingRedactor {
    return createSupervisedStreamingRedactor(config);
  }

  /**
   * Redact PHI from an image buffer.
   * Detects faces, extracts text via OCR, and applies black-box redaction.
   *
   * @param imageBuffer - PNG/JPEG image buffer
   * @param options - Optional configuration
   * @returns Redacted image buffer and metadata
   */
  static async redactImage(
    imageBuffer: Buffer,
    options?: {
      policy?: Partial<VisualPolicy>;
      knownIdentifiers?: string[];
    },
  ): Promise<ImageRedactionResult> {
    const redactor = new ImageRedactor(options?.policy);
    await redactor.initialize();
    return redactor.redact(imageBuffer, {
      knownIdentifiers: options?.knownIdentifiers,
    });
  }

  /**
   * Create an ImageRedactor instance with optional VulpesCelare text integration.
   * The returned redactor can be reused for multiple images.
   */
  static async createImageRedactor(
    policy?: Partial<VisualPolicy>,
  ): Promise<ImageRedactor> {
    const redactor = new ImageRedactor(policy);
    await redactor.initialize();

    // Integrate text redaction
    redactor.setTextRedactor(async (text: string) => {
      const result = await VulpesCelare.redactWithDetails(text);
      const matches: string[] = [];
      // Extract matched text from report
      if (result.report) {
        for (const fr of result.report.filterResults) {
          if (fr.spansDetected > 0) {
            matches.push(...Array(fr.spansDetected).fill(fr.filterType));
          }
        }
      }
      return { redacted: result.text, matches };
    });

    return redactor;
  }

  async process(text: string): Promise<RedactionResult> {
    const startTime = Date.now();
    const context = new RedactionContext();

    // Use thread-safe V2 API that returns all data directly
    const result = await ParallelRedactionEngine.redactParallelV2(
      text,
      this.filters,
      this.policy,
      context,
    );

    const breakdown: Record<string, number> = {};
    for (const r of result.report.filterResults) {
      if (r.spansDetected > 0) breakdown[r.filterType] = r.spansDetected;
    }

    return {
      text: result.text,
      redactionCount: result.report.totalSpansDetected,
      breakdown,
      executionTimeMs: Date.now() - startTime,
      report: result.report,
      spans: result.appliedSpans,
    };
  }

  async processBatch(texts: string[]): Promise<RedactionResult[]> {
    return Promise.all(texts.map((t) => this.process(t)));
  }

  getConfig(): VulpesCelareConfig {
    return { ...this.config };
  }
  getActiveFilters(): string[] {
    return this.filters.map((f) => f.constructor.name);
  }
  getLastReport(): RedactionExecutionReport | null {
    return ParallelRedactionEngine.getLastExecutionReport();
  }
  private buildFilters(config: VulpesCelareConfig): SpanBasedFilter[] {
    const contextFiltersEnabled = isContextFiltersEnabled();
    const filterMap: Record<PHIType, () => SpanBasedFilter[]> = {
      name: () => {
        const filters: SpanBasedFilter[] = [
          new SmartNameFilterSpan(),
          new FormattedNameFilterSpan(),
          new TitledNameFilterSpan(),
          new FamilyNameFilterSpan(),
        ];
        // ContextAwareNameFilter - optional, enabled via VULPES_CONTEXT_FILTERS=1
        if (contextFiltersEnabled) {
          filters.push(new ContextAwareNameFilter());
        }
        return filters;
      },
      ssn: () => [new SSNFilterSpan()],
      passport: () => [new PassportNumberFilterSpan()],
      license: () => [new LicenseNumberFilterSpan()],
      phone: () => [new PhoneFilterSpan()],
      fax: () => [new FaxNumberFilterSpan()],
      email: () => [new EmailFilterSpan()],
      address: () => {
        const filters: SpanBasedFilter[] = [new AddressFilterSpan()];
        // ContextAwareAddressFilter - optional, enabled via VULPES_CONTEXT_FILTERS=1
        if (contextFiltersEnabled) {
          filters.push(new ContextAwareAddressFilter());
        }
        return filters;
      },
      zip: () => [new ZipCodeFilterSpan()],
      mrn: () => [new MRNFilterSpan()],
      health_plan: () => [new HealthPlanNumberFilterSpan()],
      // hospital filter removed - hospital names are NOT PHI under HIPAA Safe Harbor
      age: () => [new AgeFilterSpan()],
      date: () => {
        const filters: SpanBasedFilter[] = [new DateFilterSpan()];
        // RelativeDateFilterSpan - optional, enabled via VULPES_CONTEXT_FILTERS=1
        if (contextFiltersEnabled) {
          filters.push(new RelativeDateFilterSpan());
        }
        return filters;
      },
      credit_card: () => [new CreditCardFilterSpan()],
      account: () => [new AccountNumberFilterSpan()],
      ip: () => [new IPAddressFilterSpan()],
      url: () => [new URLFilterSpan()],
      device: () => [new DeviceIdentifierFilterSpan()],
      vehicle: () => [new VehicleIdentifierFilterSpan()],
      biometric: () => [new BiometricContextFilterSpan()],
    };
    let types = config.enabledTypes || VulpesCelare.ALL_PHI_TYPES;
    if (config.disabledTypes)
      types = types.filter((t) => !config.disabledTypes!.includes(t));
    const filters: SpanBasedFilter[] = [];
    for (const t of types) if (filterMap[t]) filters.push(...filterMap[t]());
    if (config.customFilters) filters.push(...config.customFilters);
    return filters;
  }

  private buildPolicy(config: VulpesCelareConfig): any {
    const style = config.replacementStyle || "brackets";
    const custom = config.customReplacements || {};
    const getReplacement = (type: string): string => {
      if (custom[type as PHIType]) return custom[type as PHIType]!;
      const label = type.toUpperCase().replace(/_/g, "-");
      if (style === "brackets") return "[" + label + "]";
      if (style === "asterisks") return "****";
      return "";
    };
    const identifiers: Record<string, any> = {};
    for (const type of VulpesCelare.ALL_PHI_TYPES) {
      identifiers[type] = { enabled: true, replacement: getReplacement(type) };
    }
    return { identifiers };
  }
}

// Export streaming redactor
export {
  StreamingRedactor,
  WebSocketRedactionHandler,
} from "./StreamingRedactor";
export type {
  StreamingRedactorConfig,
  StreamingChunk,
} from "./StreamingRedactor";

// Export policy DSL
export { PolicyCompiler, PolicyTemplates } from "./PolicyDSL";
export type { PolicyRule, PolicyDefinition, CompiledPolicy } from "./PolicyDSL";

// Export image redaction services (Step 17: Photo/Image PHI)
export {
  ImageRedactor,
  ImageRedactionResult,
  RedactionRegion,
  VisualPolicy,
} from "./core/images";
export { OCRService, OCRResult } from "./core/images";
export type { VisualDetection } from "./core/images";
export { VisualDetector } from "./core/images";

// Export DICOM services (The "DICOM Firewall")
export {
  DicomStreamTransformer,
  HIPAA_DICOM_TAGS,
  anonymizeDicomBuffer,
} from "./core/dicom";
export type {
  DicomAnonymizationRule,
  DicomTransformerConfig,
} from "./core/dicom";

// Export Cortex Python Bridge (The "Brain")
export { CortexPythonBridge } from "./core/cortex/python/CortexPythonBridge";
export type {
  CortexTask,
  CortexTaskRequest,
  CortexTaskResponse,
} from "./core/cortex/python/CortexPythonBridge";

export default VulpesCelare;
