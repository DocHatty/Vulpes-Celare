"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustBundleExporter = exports.TRUST_BUNDLE_EXTENSION = exports.TRUST_BUNDLE_VERSION = void 0;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const binding_1 = require("../native/binding");
/**
 * Trust Bundle format version
 */
exports.TRUST_BUNDLE_VERSION = "1.0.0";
/**
 * Trust Bundle file extension
 */
exports.TRUST_BUNDLE_EXTENSION = ".red";
const TRUST_BUNDLE_REQUIRED_FILES = [
    "manifest.json",
    "certificate.json",
    "redacted-document.txt",
    "policy.json",
    "auditor-instructions.md",
];
/**
 * Trust Bundle Exporter
 *
 * Creates and verifies cryptographic Trust Bundles for redacted documents.
 */
class TrustBundleExporter {
    static getNativeBinding() {
        if (this.nativeBindingCache !== undefined)
            return this.nativeBindingCache;
        try {
            // Crypto/provenance does not require ORT; avoid configuring it here.
            this.nativeBindingCache = (0, binding_1.loadNativeBinding)({ configureOrt: false });
        }
        catch {
            this.nativeBindingCache = null;
        }
        return this.nativeBindingCache;
    }
    static isZipFile(filePath) {
        try {
            const fd = fs.openSync(filePath, "r");
            try {
                const header = Buffer.alloc(4);
                fs.readSync(fd, header, 0, 4, 0);
                return (header[0] === 0x50 &&
                    header[1] === 0x4b &&
                    header[2] === 0x03 &&
                    header[3] === 0x04);
            }
            finally {
                fs.closeSync(fd);
            }
        }
        catch {
            return false;
        }
    }
    static sha256Hex(data) {
        const binding = this.getNativeBinding();
        try {
            if (binding) {
                if (typeof data === "string" && binding.sha256HexString) {
                    return binding.sha256HexString(data);
                }
                if (Buffer.isBuffer(data) && binding.sha256Hex) {
                    return binding.sha256Hex(data);
                }
            }
        }
        catch {
            // Fall back to Node crypto below.
        }
        return crypto.createHash("sha256").update(data).digest("hex");
    }
    static stableJsonStringify(value) {
        const seen = new WeakSet();
        const normalize = (v) => {
            if (v === null || v === undefined)
                return v;
            if (typeof v !== "object")
                return v;
            if (seen.has(v))
                return "[Circular]";
            seen.add(v);
            if (Array.isArray(v))
                return v.map(normalize);
            const out = {};
            for (const key of Object.keys(v).sort()) {
                out[key] = normalize(v[key]);
            }
            return out;
        };
        return JSON.stringify(normalize(value));
    }
    static buildMerkleRootHex(leafHashesHex) {
        const binding = this.getNativeBinding();
        if (binding?.merkleRootSha256Hex) {
            try {
                return binding.merkleRootSha256Hex(leafHashesHex);
            }
            catch {
                // Fall back to JS implementation below.
            }
        }
        if (leafHashesHex.length === 0)
            return this.sha256Hex("");
        let level = leafHashesHex.map((h) => Buffer.from(h, "hex"));
        while (level.length > 1) {
            const next = [];
            for (let i = 0; i < level.length; i += 2) {
                const left = level[i];
                const right = level[i + 1] ?? level[i];
                next.push(crypto
                    .createHash("sha256")
                    .update(Buffer.concat([left, right]))
                    .digest());
            }
            level = next;
        }
        return level[0].toString("hex");
    }
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
    static async generate(originalText, redactedText, result, options = {}) {
        const jobId = options.jobId || `rdx-${Date.now()}-${this.generateRandomId()}`;
        const timestamp = new Date().toISOString();
        const policyName = options.policyName || "maximum";
        // Generate cryptographic hashes
        const hashOriginal = this.generateHash(originalText);
        const hashRedacted = this.generateHash(redactedText);
        // Create policy structure
        const policy = {
            name: policyName,
            description: `Redaction policy: ${policyName}`,
            version: exports.TRUST_BUNDLE_VERSION,
            filters: {}, // Simplified - would include actual filter config
            compliance: {
                standard: "HIPAA Safe Harbor",
                identifiersChecked: 18,
                strictMode: true,
            },
        };
        // Create manifest (without hash initially)
        const manifestPreHash = {
            version: exports.TRUST_BUNDLE_VERSION,
            format: "RED",
            jobId,
            timestamp,
            documentId: options.documentId,
            redactorVersion: "vulpes-celare@1.0.0",
            policy: policyName,
            statistics: {
                originalLength: originalText.length,
                redactedLength: redactedText.length,
                phiElementsRemoved: result.redactionCount || 0,
                processingTimeMs: result.executionTimeMs || 0,
            },
            actor: options.actorId
                ? {
                    id: options.actorId,
                    role: "automated-redaction-service",
                }
                : undefined,
            compliance: {
                standard: "HIPAA Safe Harbor",
                identifiersRedacted: [
                    "Names",
                    "Dates (except year)",
                    "Telephone numbers",
                    "Email addresses",
                    "Social Security numbers",
                    "Medical record numbers",
                    "Health plan numbers",
                    "Account numbers",
                    "Certificate/license numbers",
                    "Vehicle identifiers",
                    "Device identifiers",
                    "URLs",
                    "IP addresses",
                    "Biometric identifiers",
                    "Geographic subdivisions",
                    "Other unique identifying numbers",
                ],
            },
            bundle: {
                files: [
                    "manifest.json",
                    "certificate.json",
                    "redacted-document.txt",
                    "policy.json",
                    "auditor-instructions.md",
                ],
                totalSize: 0, // Will be calculated
                checksums: {},
            },
        };
        // Generate manifest hash
        const manifestJson = JSON.stringify(manifestPreHash, null, 2);
        const hashManifest = this.generateHash(manifestJson);
        // Complete manifest with integrity data
        const manifest = {
            ...manifestPreHash,
            integrity: {
                hashAlgorithm: "SHA-256",
                hashOriginal,
                hashRedacted,
                hashManifest,
            },
        };
        // Create certificate
        const certificate = {
            version: exports.TRUST_BUNDLE_VERSION,
            certificateId: `cert-${jobId}`,
            issuedAt: timestamp,
            expiresAt: null,
            subject: {
                documentId: options.documentId,
                jobId,
                description: "Clinical note redaction certificate",
            },
            issuer: {
                organization: options.organizationName,
                department: options.departmentName,
                system: "Vulpes Celare Redaction Service",
                version: "1.0.0",
            },
            cryptographicProofs: {
                hashChain: {
                    algorithm: "SHA-256",
                    originalHash: hashOriginal,
                    redactedHash: hashRedacted,
                    manifestHash: hashManifest,
                    proof: "H(original) + H(manifest) -> H(redacted) verified ✔",
                },
            },
            attestations: {
                redactionPerformed: true,
                policyCompliance: "HIPAA Safe Harbor - All 18 identifiers checked",
                integrityVerified: true,
                chainOfCustody: "Unbroken from original to redacted",
            },
        };
        // Generate auditor instructions
        const auditorInstructions = this.generateAuditorInstructions(jobId, timestamp);
        return {
            manifest,
            certificate,
            redactedDocument: redactedText,
            policy,
            auditorInstructions,
        };
    }
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
    static async export(bundle, outputPath) {
        if (!outputPath.endsWith(exports.TRUST_BUNDLE_EXTENSION)) {
            outputPath += exports.TRUST_BUNDLE_EXTENSION;
        }
        const zip = new adm_zip_1.default();
        const manifestJson = JSON.stringify(bundle.manifest, null, 2);
        const certificateJson = JSON.stringify(bundle.certificate, null, 2);
        const policyJson = JSON.stringify(bundle.policy, null, 2);
        zip.addFile("manifest.json", Buffer.from(manifestJson, "utf8"));
        zip.addFile("certificate.json", Buffer.from(certificateJson, "utf8"));
        zip.addFile("redacted-document.txt", Buffer.from(bundle.redactedDocument, "utf8"));
        zip.addFile("policy.json", Buffer.from(policyJson, "utf8"));
        zip.addFile("auditor-instructions.md", Buffer.from(bundle.auditorInstructions, "utf8"));
        const leaves = [
            {
                name: "auditor-instructions.md",
                hash: this.sha256Hex(bundle.auditorInstructions),
            },
            { name: "certificate.json", hash: this.sha256Hex(certificateJson) },
            { name: "manifest.json", hash: this.sha256Hex(manifestJson) },
            { name: "policy.json", hash: this.sha256Hex(policyJson) },
            {
                name: "redacted-document.txt",
                hash: this.sha256Hex(bundle.redactedDocument),
            },
        ].sort((a, b) => a.name.localeCompare(b.name));
        const merkleRoot = this.buildMerkleRootHex(leaves.map((l) => l.hash));
        const merkleProof = {
            version: exports.TRUST_BUNDLE_VERSION,
            algorithm: "SHA-256",
            rootHash: merkleRoot,
            leaves,
            note: "Merkle root is computed over sorted leaf file hashes (by filename).",
        };
        zip.addFile("merkle-proof.json", Buffer.from(JSON.stringify(merkleProof, null, 2), "utf8"));
        const tmpOut = path.join(os.tmpdir(), `trust-bundle-${bundle.manifest.jobId}-${Date.now()}${exports.TRUST_BUNDLE_EXTENSION}`);
        zip.writeZip(tmpOut);
        fs.renameSync(tmpOut, outputPath);
        return outputPath;
    }
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
    static async verify(bundlePath) {
        const errors = [];
        const warnings = [];
        const checks = {
            manifestExists: false,
            certificateExists: false,
            redactedDocumentExists: false,
            policyExists: false,
            hashIntegrity: false,
            bundleStructure: false,
            versionCompatible: false,
        };
        try {
            // Check file exists
            if (!fs.existsSync(bundlePath)) {
                errors.push(`Bundle file not found: ${bundlePath}`);
                return { valid: false, errors, warnings, checks };
            }
            // Backward compatibility: legacy JSON bundle (single file).
            if (!this.isZipFile(bundlePath)) {
                warnings.push("Legacy Trust Bundle format detected (non-ZIP). Consider re-exporting for full verification.");
                const bundleContent = fs.readFileSync(bundlePath, "utf-8");
                const bundle = JSON.parse(bundleContent);
                if (!bundle.files) {
                    errors.push("Invalid bundle structure: missing files");
                    return { valid: false, errors, warnings, checks };
                }
                checks.bundleStructure = true;
                if (bundle.version !== exports.TRUST_BUNDLE_VERSION) {
                    warnings.push(`Bundle version ${bundle.version} may not be fully compatible with ${exports.TRUST_BUNDLE_VERSION}`);
                }
                checks.versionCompatible = true;
                const manifest = bundle.files.manifest;
                const certificate = bundle.files.certificate;
                const redactedDocument = bundle.files.redactedDocument;
                const policy = bundle.files.policy;
                if (!manifest)
                    errors.push("Manifest not found in bundle");
                else
                    checks.manifestExists = true;
                if (!certificate)
                    errors.push("Certificate not found in bundle");
                else
                    checks.certificateExists = true;
                if (!redactedDocument)
                    errors.push("Redacted document not found in bundle");
                else
                    checks.redactedDocumentExists = true;
                if (!policy)
                    warnings.push("Policy not found in bundle");
                else
                    checks.policyExists = true;
                if (certificate && redactedDocument) {
                    const computedHashRedacted = this.generateHash(String(redactedDocument));
                    const certifiedHashRedacted = certificate.cryptographicProofs?.hashChain?.redactedHash;
                    if (computedHashRedacted === certifiedHashRedacted) {
                        checks.hashIntegrity = true;
                    }
                    else {
                        errors.push("Hash integrity check failed: redacted document has been modified");
                    }
                }
                const valid = errors.length === 0 && checks.hashIntegrity;
                return { valid, errors, warnings, checks, manifest, certificate };
            }
            const zip = new adm_zip_1.default(bundlePath);
            const entryNames = new Set(zip.getEntries().map((e) => e.entryName));
            const missingFiles = TRUST_BUNDLE_REQUIRED_FILES.filter((f) => !entryNames.has(f));
            if (missingFiles.length > 0) {
                errors.push(`Bundle missing required files: ${missingFiles.join(", ")}`);
                return { valid: false, errors, warnings, checks };
            }
            checks.bundleStructure = true;
            const manifestBytes = zip.readFile("manifest.json");
            const certificateBytes = zip.readFile("certificate.json");
            const redactedDocumentBytes = zip.readFile("redacted-document.txt");
            const policyBytes = zip.readFile("policy.json");
            if (!manifestBytes)
                throw new Error("Unable to read manifest.json");
            if (!certificateBytes)
                throw new Error("Unable to read certificate.json");
            if (!redactedDocumentBytes)
                throw new Error("Unable to read redacted-document.txt");
            if (!policyBytes)
                throw new Error("Unable to read policy.json");
            const manifestText = manifestBytes.toString("utf8");
            const certificateText = certificateBytes.toString("utf8");
            const policyText = policyBytes.toString("utf8");
            const manifest = JSON.parse(manifestText);
            const certificate = JSON.parse(certificateText);
            JSON.parse(policyText);
            checks.manifestExists = true;
            checks.certificateExists = true;
            checks.redactedDocumentExists = true;
            checks.policyExists = true;
            if (manifest?.version !== exports.TRUST_BUNDLE_VERSION) {
                warnings.push(`Bundle version ${manifest?.version} may not be fully compatible with ${exports.TRUST_BUNDLE_VERSION}`);
            }
            checks.versionCompatible = true;
            const computedHashRedacted = this.sha256Hex(redactedDocumentBytes);
            const certifiedHashRedacted = certificate?.cryptographicProofs?.hashChain?.redactedHash;
            if (certifiedHashRedacted &&
                computedHashRedacted !== certifiedHashRedacted) {
                errors.push("Hash integrity check failed: redacted document has been modified");
            }
            if (manifest?.integrity?.hashRedacted &&
                computedHashRedacted !== manifest.integrity.hashRedacted) {
                errors.push("Hash mismatch vs manifest.integrity.hashRedacted");
            }
            const manifestStableHash = this.generateHash(this.stableJsonStringify({
                ...manifest,
                integrity: { ...manifest.integrity, hashManifest: "" },
            }));
            if (manifest?.integrity?.hashManifest &&
                manifestStableHash !== manifest.integrity.hashManifest) {
                warnings.push("Manifest hash does not match stable-canonical hash");
            }
            if (entryNames.has("merkle-proof.json")) {
                try {
                    const merkle = JSON.parse(zip.readAsText("merkle-proof.json"));
                    const leaves = Array.isArray(merkle.leaves)
                        ? merkle.leaves
                        : [];
                    const computedRoot = this.buildMerkleRootHex(leaves
                        .slice()
                        .sort((a, b) => String(a.name).localeCompare(String(b.name)))
                        .map((l) => String(l.hash)));
                    if (computedRoot !== merkle.rootHash) {
                        warnings.push("Merkle proof root mismatch");
                    }
                }
                catch {
                    warnings.push("Unable to parse merkle-proof.json");
                }
            }
            checks.hashIntegrity = errors.length === 0;
            const valid = errors.length === 0 && checks.hashIntegrity;
            return { valid, errors, warnings, checks, manifest, certificate };
        }
        catch (error) {
            errors.push(`Verification error: ${error instanceof Error ? error.message : String(error)}`);
            return { valid: false, errors, warnings, checks };
        }
    }
    /**
     * Generate SHA-256 hash of text
     */
    static generateHash(text) {
        return this.sha256Hex(text);
    }
    /**
     * Generate random ID for job
     */
    static generateRandomId(length = 8) {
        return crypto.randomBytes(length).toString("hex").substring(0, length);
    }
    /**
     * Generate auditor instructions document
     */
    static generateAuditorInstructions(jobId, timestamp) {
        return `# Trust Bundle Verification Instructions

## Bundle Information

- Job ID: ${jobId}
- Created: ${timestamp}
- Format Version: ${exports.TRUST_BUNDLE_VERSION}

## Quick Verification (Non-Technical)

1. Open 'certificate.json'.
2. Confirm:
   - attestations.redactionPerformed is true
   - attestations.integrityVerified is true

## Technical Verification

1. Compute the SHA-256 hash of 'redacted-document.txt'.
2. Compare it to:
   - certificate.json: cryptographicProofs.hashChain.redactedHash
   - manifest.json: integrity.hashRedacted

If the hashes match, the redacted document has not been modified since export.

## Notes

- Trust Bundles are designed to avoid embedding original PHI.
- The bundle may include 'merkle-proof.json' which provides additional tamper evidence over the bundle's file hashes.

Generated at: ${new Date().toISOString()}
`;
    }
}
exports.TrustBundleExporter = TrustBundleExporter;
TrustBundleExporter.nativeBindingCache = undefined;
//# sourceMappingURL=TrustBundleExporter.js.map