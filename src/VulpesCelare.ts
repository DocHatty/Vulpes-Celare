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
import { RedactionContext } from "./context/RedactionContext";
import {
  ImageRedactor,
  ImageRedactionResult,
  VisualPolicy,
} from "./core/images";

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
import { NPIFilterSpan } from "./filters/NPIFilterSpan";
import { DEAFilterSpan } from "./filters/DEAFilterSpan";
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
import { UniqueIdentifierFilterSpan } from "./filters/UniqueIdentifierFilterSpan";
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
  | "npi"
  | "dea"
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
  | "unique_id"
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

  static readonly ALL_PHI_TYPES: PHIType[] = [
    "name",
    "ssn",
    "phone",
    "email",
    "address",
    "date",
    "mrn",
    "npi",
    "dea",
    "ip",
    "url",
    "credit_card",
    "account",
    "health_plan",
    "license",
    "passport",
    "vehicle",
    "device",
    "biometric",
    "unique_id",
    "zip",
    "fax",
    "age",
  ];

  static readonly VERSION = "1.0.0";
  static readonly NAME = "Vulpes Celare";
  static readonly VARIANT = "Hatkoff Redaction Engine";

  constructor(
     config: VulpesCelareConfig = {},
     dependencies?: {
       filterProvider?: FilterProvider;
       policyProvider?: PolicyProvider;
     }
  ) {
    this.config = config;

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
    const redactedText = await ParallelRedactionEngine.redactParallel(
      text,
      this.filters,
      this.policy,
      context,
    );
    const report = ParallelRedactionEngine.getLastExecutionReport();
    const breakdown: Record<string, number> = {};
    if (report) {
      for (const r of report.filterResults) {
        if (r.spansDetected > 0) breakdown[r.filterType] = r.spansDetected;
      }
    }
    return {
      text: redactedText,
      redactionCount: report?.totalSpansDetected || 0,
      breakdown,
      executionTimeMs: Date.now() - startTime,
      report: report || undefined,
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
    const filterMap: Record<PHIType, () => SpanBasedFilter[]> = {
      name: () => [
        new SmartNameFilterSpan(),
        new FormattedNameFilterSpan(),
        new TitledNameFilterSpan(),
        new FamilyNameFilterSpan(),
      ],
      ssn: () => [new SSNFilterSpan()],
      passport: () => [new PassportNumberFilterSpan()],
      license: () => [new LicenseNumberFilterSpan()],
      phone: () => [new PhoneFilterSpan()],
      fax: () => [new FaxNumberFilterSpan()],
      email: () => [new EmailFilterSpan()],
      address: () => [new AddressFilterSpan()],
      zip: () => [new ZipCodeFilterSpan()],
      mrn: () => [new MRNFilterSpan()],
      npi: () => [new NPIFilterSpan()],
      dea: () => [new DEAFilterSpan()],
      health_plan: () => [new HealthPlanNumberFilterSpan()],
      // hospital filter removed - hospital names are NOT PHI under HIPAA Safe Harbor
      age: () => [new AgeFilterSpan()],
      date: () => [new DateFilterSpan()],
      credit_card: () => [new CreditCardFilterSpan()],
      account: () => [new AccountNumberFilterSpan()],
      ip: () => [new IPAddressFilterSpan()],
      url: () => [new URLFilterSpan()],
      device: () => [new DeviceIdentifierFilterSpan()],
      vehicle: () => [new VehicleIdentifierFilterSpan()],
      biometric: () => [new BiometricContextFilterSpan()],
      unique_id: () => [new UniqueIdentifierFilterSpan()],
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
