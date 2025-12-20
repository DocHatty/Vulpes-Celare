"use strict";
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
exports.CortexPythonBridge = exports.anonymizeDicomBuffer = exports.HIPAA_DICOM_TAGS = exports.DicomStreamTransformer = exports.VisualDetector = exports.OCRService = exports.ImageRedactor = exports.PolicyTemplates = exports.PolicyCompiler = exports.WebSocketRedactionHandler = exports.StreamingRedactor = exports.VulpesCelare = void 0;
const ParallelRedactionEngine_1 = require("./core/ParallelRedactionEngine");
const SpanPool_1 = require("./core/SpanPool");
const RedactionContext_1 = require("./context/RedactionContext");
const images_1 = require("./core/images");
const SupervisedStreamingRedactor_1 = require("./SupervisedStreamingRedactor");
const meta_1 = require("./meta");
const TrustBundleExporter_1 = require("./provenance/TrustBundleExporter");
// ============================================================================
// FILTER IMPORTS - Organized by Category
// ============================================================================
// Identity Filters
const SmartNameFilterSpan_1 = require("./filters/SmartNameFilterSpan");
const FormattedNameFilterSpan_1 = require("./filters/FormattedNameFilterSpan");
const TitledNameFilterSpan_1 = require("./filters/TitledNameFilterSpan");
const FamilyNameFilterSpan_1 = require("./filters/FamilyNameFilterSpan");
// Government ID Filters
const SSNFilterSpan_1 = require("./filters/SSNFilterSpan");
const PassportNumberFilterSpan_1 = require("./filters/PassportNumberFilterSpan");
const LicenseNumberFilterSpan_1 = require("./filters/LicenseNumberFilterSpan");
// Contact Filters
const PhoneFilterSpan_1 = require("./filters/PhoneFilterSpan");
const FaxNumberFilterSpan_1 = require("./filters/FaxNumberFilterSpan");
const EmailFilterSpan_1 = require("./filters/EmailFilterSpan");
const AddressFilterSpan_1 = require("./filters/AddressFilterSpan");
const ZipCodeFilterSpan_1 = require("./filters/ZipCodeFilterSpan");
// Medical Identifier Filters
const MRNFilterSpan_1 = require("./filters/MRNFilterSpan");
const HealthPlanNumberFilterSpan_1 = require("./filters/HealthPlanNumberFilterSpan");
// HospitalFilterSpan removed - hospital names are NOT PHI under HIPAA Safe Harbor
const AgeFilterSpan_1 = require("./filters/AgeFilterSpan");
const DateFilterSpan_1 = require("./filters/DateFilterSpan");
// Financial Filters
const CreditCardFilterSpan_1 = require("./filters/CreditCardFilterSpan");
const AccountNumberFilterSpan_1 = require("./filters/AccountNumberFilterSpan");
// Technical Identifier Filters
const IPAddressFilterSpan_1 = require("./filters/IPAddressFilterSpan");
const URLFilterSpan_1 = require("./filters/URLFilterSpan");
const DeviceIdentifierFilterSpan_1 = require("./filters/DeviceIdentifierFilterSpan");
const VehicleIdentifierFilterSpan_1 = require("./filters/VehicleIdentifierFilterSpan");
const BiometricContextFilterSpan_1 = require("./filters/BiometricContextFilterSpan");
// Context-Aware Filters - OPTIONAL, enabled via VULPES_CONTEXT_FILTERS=1
// The ContextualConfidenceModifier in the pipeline provides the WIN-WIN effect
// These filters add additional context-based detection but may increase false positives
const ContextAwareNameFilter_1 = require("./filters/ContextAwareNameFilter");
const RelativeDateFilterSpan_1 = require("./filters/RelativeDateFilterSpan");
const ContextAwareAddressFilter_1 = require("./filters/ContextAwareAddressFilter");
/**
 * Check if context-aware filters are enabled via environment variable
 */
function isContextFiltersEnabled() {
    return process.env.VULPES_CONTEXT_FILTERS === "1";
}
class VulpesCelare {
    filters;
    policy;
    config;
    // Default PHI types enabled for HIPAA Safe Harbor compliance
    // Note: credit_card and passport are available but not enabled by default
    // (credit_card is PCI-DSS, passport is not in HIPAA 18 identifiers)
    static ALL_PHI_TYPES = [
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
    static OPTIONAL_PHI_TYPES = [
        "credit_card",
        "passport",
    ];
    static VERSION = meta_1.VERSION;
    static NAME = meta_1.ENGINE_NAME;
    static VARIANT = meta_1.VARIANT;
    constructor(config = {}, dependencies) {
        this.config = config;
        // Pre-warm span pool for optimal first-request performance
        // Pool eliminates GC pressure by reusing Span objects
        if (!SpanPool_1.SpanPool.isInitialized()) {
            SpanPool_1.SpanPool.prewarm(500);
        }
        // Use injected providers or fall back to internal implementations
        if (dependencies?.filterProvider) {
            this.filters = dependencies.filterProvider.getFilters(config);
        }
        else {
            this.filters = this.buildFilters(config);
        }
        if (dependencies?.policyProvider) {
            this.policy = dependencies.policyProvider.getPolicy(config);
        }
        else {
            this.policy = this.buildPolicy(config);
        }
    }
    static async redact(text) {
        return (await new VulpesCelare().process(text)).text;
    }
    static async redactWithDetails(text, config) {
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
    static async redactWithProvenance(text, options = {}) {
        const instance = new VulpesCelare();
        const result = await instance.process(text);
        // Generate Trust Bundle with cryptographic proofs
        const trustBundle = await TrustBundleExporter_1.TrustBundleExporter.generate(text, result.text, result, options);
        // Auto-export if path provided
        if (options.exportPath) {
            await TrustBundleExporter_1.TrustBundleExporter.export(trustBundle, options.exportPath);
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
    static async verifyTrustBundle(bundlePath) {
        return TrustBundleExporter_1.TrustBundleExporter.verify(bundlePath);
    }
    /**
     * Export a Trust Bundle to a .red file.
     *
     * @param bundle - Trust Bundle to export
     * @param outputPath - Output path (will add .red extension if missing)
     * @returns Path to created file
     */
    static async exportTrustBundle(bundle, outputPath) {
        return TrustBundleExporter_1.TrustBundleExporter.export(bundle, outputPath);
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
    static async processBatchGPU(documents, config) {
        // Dynamic import to avoid loading GPU module when not needed
        const { processBatch } = await Promise.resolve().then(() => __importStar(require("./gpu")));
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
    static async redactWithPolicy(text, filters, policy, context) {
        return ParallelRedactionEngine_1.ParallelRedactionEngine.redactParallel(text, filters, policy, context);
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
    static createSupervisedStreamingRedactor(config) {
        return (0, SupervisedStreamingRedactor_1.createSupervisedStreamingRedactor)(config);
    }
    /**
     * Redact PHI from an image buffer.
     * Detects faces, extracts text via OCR, and applies black-box redaction.
     *
     * @param imageBuffer - PNG/JPEG image buffer
     * @param options - Optional configuration
     * @returns Redacted image buffer and metadata
     */
    static async redactImage(imageBuffer, options) {
        const redactor = new images_1.ImageRedactor(options?.policy);
        await redactor.initialize();
        return redactor.redact(imageBuffer, {
            knownIdentifiers: options?.knownIdentifiers,
        });
    }
    /**
     * Create an ImageRedactor instance with optional VulpesCelare text integration.
     * The returned redactor can be reused for multiple images.
     */
    static async createImageRedactor(policy) {
        const redactor = new images_1.ImageRedactor(policy);
        await redactor.initialize();
        // Integrate text redaction
        redactor.setTextRedactor(async (text) => {
            const result = await VulpesCelare.redactWithDetails(text);
            const matches = [];
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
    async process(text) {
        const startTime = Date.now();
        const context = new RedactionContext_1.RedactionContext();
        // Use thread-safe V2 API that returns all data directly
        const result = await ParallelRedactionEngine_1.ParallelRedactionEngine.redactParallelV2(text, this.filters, this.policy, context);
        const breakdown = {};
        for (const r of result.report.filterResults) {
            if (r.spansDetected > 0)
                breakdown[r.filterType] = r.spansDetected;
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
    async processBatch(texts) {
        return Promise.all(texts.map((t) => this.process(t)));
    }
    getConfig() {
        return { ...this.config };
    }
    getActiveFilters() {
        return this.filters.map((f) => f.constructor.name);
    }
    getLastReport() {
        return ParallelRedactionEngine_1.ParallelRedactionEngine.getLastExecutionReport();
    }
    buildFilters(config) {
        const contextFiltersEnabled = isContextFiltersEnabled();
        const filterMap = {
            name: () => {
                const filters = [
                    new SmartNameFilterSpan_1.SmartNameFilterSpan(),
                    new FormattedNameFilterSpan_1.FormattedNameFilterSpan(),
                    new TitledNameFilterSpan_1.TitledNameFilterSpan(),
                    new FamilyNameFilterSpan_1.FamilyNameFilterSpan(),
                ];
                // ContextAwareNameFilter - optional, enabled via VULPES_CONTEXT_FILTERS=1
                if (contextFiltersEnabled) {
                    filters.push(new ContextAwareNameFilter_1.ContextAwareNameFilter());
                }
                return filters;
            },
            ssn: () => [new SSNFilterSpan_1.SSNFilterSpan()],
            passport: () => [new PassportNumberFilterSpan_1.PassportNumberFilterSpan()],
            license: () => [new LicenseNumberFilterSpan_1.LicenseNumberFilterSpan()],
            phone: () => [new PhoneFilterSpan_1.PhoneFilterSpan()],
            fax: () => [new FaxNumberFilterSpan_1.FaxNumberFilterSpan()],
            email: () => [new EmailFilterSpan_1.EmailFilterSpan()],
            address: () => {
                const filters = [new AddressFilterSpan_1.AddressFilterSpan()];
                // ContextAwareAddressFilter - optional, enabled via VULPES_CONTEXT_FILTERS=1
                if (contextFiltersEnabled) {
                    filters.push(new ContextAwareAddressFilter_1.ContextAwareAddressFilter());
                }
                return filters;
            },
            zip: () => [new ZipCodeFilterSpan_1.ZipCodeFilterSpan()],
            mrn: () => [new MRNFilterSpan_1.MRNFilterSpan()],
            health_plan: () => [new HealthPlanNumberFilterSpan_1.HealthPlanNumberFilterSpan()],
            // hospital filter removed - hospital names are NOT PHI under HIPAA Safe Harbor
            age: () => [new AgeFilterSpan_1.AgeFilterSpan()],
            date: () => {
                const filters = [new DateFilterSpan_1.DateFilterSpan()];
                // RelativeDateFilterSpan - optional, enabled via VULPES_CONTEXT_FILTERS=1
                if (contextFiltersEnabled) {
                    filters.push(new RelativeDateFilterSpan_1.RelativeDateFilterSpan());
                }
                return filters;
            },
            credit_card: () => [new CreditCardFilterSpan_1.CreditCardFilterSpan()],
            account: () => [new AccountNumberFilterSpan_1.AccountNumberFilterSpan()],
            ip: () => [new IPAddressFilterSpan_1.IPAddressFilterSpan()],
            url: () => [new URLFilterSpan_1.URLFilterSpan()],
            device: () => [new DeviceIdentifierFilterSpan_1.DeviceIdentifierFilterSpan()],
            vehicle: () => [new VehicleIdentifierFilterSpan_1.VehicleIdentifierFilterSpan()],
            biometric: () => [new BiometricContextFilterSpan_1.BiometricContextFilterSpan()],
        };
        let types = config.enabledTypes || VulpesCelare.ALL_PHI_TYPES;
        if (config.disabledTypes)
            types = types.filter((t) => !config.disabledTypes.includes(t));
        const filters = [];
        for (const t of types)
            if (filterMap[t])
                filters.push(...filterMap[t]());
        if (config.customFilters)
            filters.push(...config.customFilters);
        return filters;
    }
    buildPolicy(config) {
        const style = config.replacementStyle || "brackets";
        const custom = config.customReplacements || {};
        const getReplacement = (type) => {
            if (custom[type])
                return custom[type];
            const label = type.toUpperCase().replace(/_/g, "-");
            if (style === "brackets")
                return "[" + label + "]";
            if (style === "asterisks")
                return "****";
            return "";
        };
        const identifiers = {};
        for (const type of VulpesCelare.ALL_PHI_TYPES) {
            identifiers[type] = { enabled: true, replacement: getReplacement(type) };
        }
        return { identifiers };
    }
}
exports.VulpesCelare = VulpesCelare;
// Export streaming redactor
var StreamingRedactor_1 = require("./StreamingRedactor");
Object.defineProperty(exports, "StreamingRedactor", { enumerable: true, get: function () { return StreamingRedactor_1.StreamingRedactor; } });
Object.defineProperty(exports, "WebSocketRedactionHandler", { enumerable: true, get: function () { return StreamingRedactor_1.WebSocketRedactionHandler; } });
// Export policy DSL
var PolicyDSL_1 = require("./PolicyDSL");
Object.defineProperty(exports, "PolicyCompiler", { enumerable: true, get: function () { return PolicyDSL_1.PolicyCompiler; } });
Object.defineProperty(exports, "PolicyTemplates", { enumerable: true, get: function () { return PolicyDSL_1.PolicyTemplates; } });
// Export image redaction services (Step 17: Photo/Image PHI)
var images_2 = require("./core/images");
Object.defineProperty(exports, "ImageRedactor", { enumerable: true, get: function () { return images_2.ImageRedactor; } });
var images_3 = require("./core/images");
Object.defineProperty(exports, "OCRService", { enumerable: true, get: function () { return images_3.OCRService; } });
var images_4 = require("./core/images");
Object.defineProperty(exports, "VisualDetector", { enumerable: true, get: function () { return images_4.VisualDetector; } });
// Export DICOM services (The "DICOM Firewall")
var dicom_1 = require("./core/dicom");
Object.defineProperty(exports, "DicomStreamTransformer", { enumerable: true, get: function () { return dicom_1.DicomStreamTransformer; } });
Object.defineProperty(exports, "HIPAA_DICOM_TAGS", { enumerable: true, get: function () { return dicom_1.HIPAA_DICOM_TAGS; } });
Object.defineProperty(exports, "anonymizeDicomBuffer", { enumerable: true, get: function () { return dicom_1.anonymizeDicomBuffer; } });
// Export Cortex Python Bridge (The "Brain")
var CortexPythonBridge_1 = require("./core/cortex/python/CortexPythonBridge");
Object.defineProperty(exports, "CortexPythonBridge", { enumerable: true, get: function () { return CortexPythonBridge_1.CortexPythonBridge; } });
exports.default = VulpesCelare;
//# sourceMappingURL=VulpesCelare.js.map