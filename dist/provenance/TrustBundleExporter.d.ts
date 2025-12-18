/**
 * VULPES CELARE - TRUST BUNDLE EXPORTER
 *
 * Redaction Evidence Document (RED) - Universal Format for Cryptographic Provenance
 *
 * Creates and verifies Trust Bundles that prove redaction occurred, what was redacted,
 * and maintains an auditable chain of custody - all without revealing original PHI.
 *
 * @module TrustBundleExporter
 *
 * @example
 * ```typescript
 * import { VulpesCelare } from 'vulpes-celare';
 * import { TrustBundleExporter } from 'vulpes-celare/provenance';
 *
 * const engine = new VulpesCelare();
 * const result = await engine.process(clinicalNote);
 *
 * // Generate trust bundle
 * const bundle = await TrustBundleExporter.generate(
 *   clinicalNote,
 *   result.text,
 *   result
 * );
 *
 * // Export as .red file
 * await TrustBundleExporter.export(bundle, 'patient-note.red');
 *
 * // Verify bundle
 * const verification = await TrustBundleExporter.verify('patient-note.red');
 * console.log(verification.valid ? '✔ VERIFIED' : '✖ INVALID');
 * ```
 */
import { RedactionResult } from "../VulpesCelare";
/**
 * Trust Bundle format version
 */
export declare const TRUST_BUNDLE_VERSION = "1.0.0";
/**
 * Trust Bundle file extension
 */
export declare const TRUST_BUNDLE_EXTENSION = ".red";
/**
 * Options for Trust Bundle generation
 */
export interface TrustBundleOptions {
    /**
     * Job ID for the redaction operation
     * If not provided, one will be generated
     */
    jobId?: string;
    /**
     * Policy name used for redaction
     */
    policyName?: string;
    /**
     * Organization name for certificate
     */
    organizationName?: string;
    /**
     * Department name for certificate
     */
    departmentName?: string;
    /**
     * Actor ID who performed the redaction
     */
    actorId?: string;
    /**
     * Document ID for tracking
     */
    documentId?: string;
    /**
     * Include provenance log excerpt
     */
    includeProvenance?: boolean;
    /**
     * Additional metadata
     */
    metadata?: Record<string, any>;
}
/**
 * Manifest file structure
 */
export interface TrustBundleManifest {
    version: string;
    format: "RED";
    jobId: string;
    timestamp: string;
    documentId?: string;
    redactorVersion: string;
    policy: string;
    statistics: {
        originalLength: number;
        redactedLength: number;
        phiElementsRemoved: number;
        processingTimeMs: number;
        filterResults?: Array<{
            filter: string;
            matches: number;
        }>;
    };
    integrity: {
        hashAlgorithm: "SHA-256";
        hashOriginal: string;
        hashRedacted: string;
        hashManifest: string;
    };
    actor?: {
        id: string;
        role: string;
    };
    compliance: {
        standard: string;
        identifiersRedacted: string[];
    };
    bundle: {
        files: string[];
        totalSize: number;
        checksums: Record<string, string>;
    };
}
/**
 * Certificate file structure
 */
export interface TrustBundleCertificate {
    version: string;
    certificateId: string;
    issuedAt: string;
    expiresAt: string | null;
    subject: {
        documentId?: string;
        jobId: string;
        description: string;
    };
    issuer: {
        organization?: string;
        department?: string;
        system: string;
        version: string;
    };
    cryptographicProofs: {
        hashChain: {
            algorithm: "SHA-256";
            originalHash: string;
            redactedHash: string;
            manifestHash: string;
            proof: string;
        };
    };
    attestations: {
        redactionPerformed: boolean;
        policyCompliance: string;
        integrityVerified: boolean;
        chainOfCustody: string;
    };
}
/**
 * Policy file structure
 */
export interface TrustBundlePolicy {
    name: string;
    description?: string;
    version: string;
    filters: Record<string, any>;
    globalThreshold?: number;
    compliance?: {
        standard: string;
        identifiersChecked: number;
        strictMode: boolean;
    };
}
/**
 * Complete Trust Bundle structure
 */
export interface TrustBundle {
    manifest: TrustBundleManifest;
    certificate: TrustBundleCertificate;
    redactedDocument: string;
    policy: TrustBundlePolicy;
    auditorInstructions: string;
}
/**
 * Verification result
 */
export interface VerificationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    checks: {
        manifestExists: boolean;
        certificateExists: boolean;
        redactedDocumentExists: boolean;
        policyExists: boolean;
        hashIntegrity: boolean;
        bundleStructure: boolean;
        versionCompatible: boolean;
    };
    manifest?: TrustBundleManifest;
    certificate?: TrustBundleCertificate;
}
/**
 * Trust Bundle Exporter
 *
 * Creates and verifies cryptographic Trust Bundles for redacted documents.
 */
export declare class TrustBundleExporter {
    private static nativeBindingCache;
    private static getNativeBinding;
    private static isZipFile;
    private static sha256Hex;
    private static stableJsonStringify;
    private static buildMerkleRootHex;
    /**
     * Generate a Trust Bundle from redaction results
     *
     * @param originalText - Original text before redaction
     * @param redactedText - Redacted text output
     * @param result - Redaction result with metadata
     * @param options - Additional options for bundle generation
     * @returns Complete Trust Bundle
     *
     * @example
     * ```typescript
     * const bundle = await TrustBundleExporter.generate(
     *   originalNote,
     *   result.text,
     *   result,
     *   { policyName: 'maximum', organizationName: 'General Hospital' }
     * );
     * ```
     */
    static generate(originalText: string, redactedText: string, result: RedactionResult, options?: TrustBundleOptions): Promise<TrustBundle>;
    /**
     * Export Trust Bundle to a .red file
     *
     * @param bundle - Trust Bundle to export
     * @param outputPath - Path for output .red file
     * @returns Path to created file
     *
     * @example
     * ```typescript
     * await TrustBundleExporter.export(bundle, './trust-bundle.red');
     * ```
     */
    static export(bundle: TrustBundle, outputPath: string): Promise<string>;
    /**
     * Verify a Trust Bundle file
     *
     * @param bundlePath - Path to .red file
     * @returns Verification result
     *
     * @example
     * ```typescript
     * const result = await TrustBundleExporter.verify('./trust-bundle.red');
     * if (result.valid) {
     *   console.log('✔ Bundle verified');
     * } else {
     *   console.error('✖ Verification failed:', result.errors);
     * }
     * ```
     */
    static verify(bundlePath: string): Promise<VerificationResult>;
    /**
     * Generate SHA-256 hash of text
     */
    private static generateHash;
    /**
     * Generate random ID for job
     */
    private static generateRandomId;
    /**
     * Generate auditor instructions document
     */
    private static generateAuditorInstructions;
}
//# sourceMappingURL=TrustBundleExporter.d.ts.map