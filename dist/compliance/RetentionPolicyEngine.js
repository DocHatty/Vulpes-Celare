"use strict";
/**
 * ============================================================================
 * VULPES CELARE - RETENTION POLICY ENGINE
 * ============================================================================
 *
 * HIPAA-compliant data retention management.
 *
 * Features:
 * - Configurable retention periods (default: 6 years per HIPAA)
 * - Legal hold support for investigations
 * - Automated archival to cold storage
 * - Compliant destruction with audit trail
 * - Policy versioning and history
 *
 * HIPAA Requirements Addressed:
 * - § 164.530(j) - Retention requirements (6 years)
 * - § 164.530(j)(2) - Documentation retention
 * - 45 CFR 164.316(b)(2)(i) - Availability requirements
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
exports.retentionPolicyEngine = exports.RetentionPolicyEngine = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const zlib = __importStar(require("zlib"));
const util_1 = require("util");
const VulpesLogger_1 = require("../utils/VulpesLogger");
const gzip = (0, util_1.promisify)(zlib.gzip);
const gunzip = (0, util_1.promisify)(zlib.gunzip);
// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================
const HIPAA_RETENTION_DAYS = 2190; // 6 years
const DEFAULT_ARCHIVE_DAYS = 365; // 1 year
const DEFAULT_POLICY = {
    name: "HIPAA Default",
    description: "Default HIPAA-compliant retention policy (6 years)",
    createdBy: "system",
    retentionDays: HIPAA_RETENTION_DAYS,
    archiveAfterDays: DEFAULT_ARCHIVE_DAYS,
    dataTypes: [
        "audit_logs",
        "redaction_records",
        "trust_bundles",
        "fhir_audit_events",
        "security_alerts",
    ],
    compressArchive: true,
    encryptArchive: true,
    legalHolds: [],
    destructionMethod: "secure_delete",
};
// ============================================================================
// RETENTION POLICY ENGINE
// ============================================================================
class RetentionPolicyEngine {
    static instance;
    basePath;
    archivePath;
    defaultEncryptionKey;
    autoArchive;
    autoPurge;
    autoOperationInterval;
    policies = new Map();
    records = new Map();
    legalHolds = new Map();
    autoOperationTimer;
    constructor(config = {}) {
        this.basePath = config.basePath ?? path.join(process.cwd(), "data", "retention");
        this.archivePath = config.archivePath ?? path.join(this.basePath, "archive");
        this.defaultEncryptionKey = config.defaultEncryptionKey ??
            process.env.VULPES_RETENTION_KEY ??
            this.generateDefaultKey();
        this.autoArchive = config.autoArchive ?? true;
        this.autoPurge = config.autoPurge ?? false; // Require explicit opt-in for auto-purge
        this.autoOperationInterval = config.autoOperationInterval ?? 24 * 60 * 60 * 1000; // Daily
        // Initialize directories
        this.ensureDirectories();
        // Load existing data
        this.loadState();
        // Create default policy if none exists
        if (this.policies.size === 0) {
            this.createDefaultPolicy();
        }
        // Start automatic operations if enabled
        if (this.autoArchive || this.autoPurge) {
            this.startAutoOperations();
        }
        VulpesLogger_1.vulpesLogger.info("RetentionPolicyEngine initialized", {
            component: "RetentionPolicyEngine",
            policies: this.policies.size,
            records: this.records.size,
            legalHolds: this.legalHolds.size,
        });
    }
    static getInstance(config) {
        if (!RetentionPolicyEngine.instance) {
            RetentionPolicyEngine.instance = new RetentionPolicyEngine(config);
        }
        return RetentionPolicyEngine.instance;
    }
    // ============================================================================
    // POLICY MANAGEMENT
    // ============================================================================
    /**
     * Create a new retention policy
     */
    createPolicy(policy, createdBy) {
        const now = new Date().toISOString();
        const newPolicy = {
            ...policy,
            id: `policy_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
            version: 1,
            createdAt: now,
            updatedAt: now,
            createdBy: createdBy ?? policy.createdBy,
            legalHolds: policy.legalHolds ?? [],
        };
        this.policies.set(newPolicy.id, newPolicy);
        this.saveState();
        VulpesLogger_1.vulpesLogger.info("Created retention policy", {
            component: "RetentionPolicyEngine",
            policyId: newPolicy.id,
            policyName: newPolicy.name,
            retentionDays: newPolicy.retentionDays,
        });
        return newPolicy;
    }
    /**
     * Update an existing policy
     */
    updatePolicy(policyId, updates, updatedBy) {
        const existing = this.policies.get(policyId);
        if (!existing)
            return null;
        const updated = {
            ...existing,
            ...updates,
            version: existing.version + 1,
            updatedAt: new Date().toISOString(),
        };
        this.policies.set(policyId, updated);
        this.saveState();
        VulpesLogger_1.vulpesLogger.info("Updated retention policy", {
            component: "RetentionPolicyEngine",
            policyId,
            version: updated.version,
            updatedBy,
        });
        return updated;
    }
    /**
     * Get a policy by ID
     */
    getPolicy(policyId) {
        return this.policies.get(policyId);
    }
    /**
     * Get all policies
     */
    getAllPolicies() {
        return Array.from(this.policies.values());
    }
    /**
     * Get the default policy
     */
    getDefaultPolicy() {
        const policies = this.getAllPolicies();
        return policies.find(p => p.name === "HIPAA Default") ?? policies[0];
    }
    // ============================================================================
    // RECORD MANAGEMENT
    // ============================================================================
    /**
     * Register a record for retention management
     */
    async registerRecord(filePath, dataType, metadata = {}, policyId) {
        const policy = policyId ? this.policies.get(policyId) : this.getDefaultPolicy();
        if (!policy) {
            throw new Error(`Policy not found: ${policyId}`);
        }
        const stats = await fs.promises.stat(filePath);
        const content = await fs.promises.readFile(filePath);
        const checksum = crypto.createHash("sha256").update(content).digest("hex");
        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + policy.retentionDays);
        const record = {
            id: `record_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
            dataType,
            filePath,
            createdAt: now.toISOString(),
            retentionExpiresAt: expiresAt.toISOString(),
            size: stats.size,
            checksum,
            metadata,
            status: "active",
        };
        this.records.set(record.id, record);
        this.saveState();
        VulpesLogger_1.vulpesLogger.debug("Registered retention record", {
            component: "RetentionPolicyEngine",
            recordId: record.id,
            dataType,
            expiresAt: record.retentionExpiresAt,
        });
        return record;
    }
    /**
     * Get a record by ID
     */
    getRecord(recordId) {
        return this.records.get(recordId);
    }
    /**
     * Get all records
     */
    getAllRecords() {
        return Array.from(this.records.values());
    }
    /**
     * Get records by data type
     */
    getRecordsByType(dataType) {
        return this.getAllRecords().filter(r => r.dataType === dataType);
    }
    /**
     * Get records that are due for archival
     */
    getRecordsDueForArchival(policyId) {
        const policy = policyId ? this.policies.get(policyId) : this.getDefaultPolicy();
        if (!policy)
            return [];
        const archiveThreshold = new Date();
        archiveThreshold.setDate(archiveThreshold.getDate() - policy.archiveAfterDays);
        return this.getAllRecords().filter(r => r.status === "active" &&
            new Date(r.createdAt) < archiveThreshold);
    }
    /**
     * Get records that are due for destruction
     */
    getRecordsDueForDestruction() {
        const now = new Date();
        return this.getAllRecords().filter(r => r.status !== "destroyed" &&
            new Date(r.retentionExpiresAt) < now &&
            !this.isUnderLegalHold(r));
    }
    // ============================================================================
    // LEGAL HOLDS
    // ============================================================================
    /**
     * Create a legal hold
     */
    createLegalHold(hold, createdBy) {
        const newHold = {
            ...hold,
            id: `hold_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
            createdAt: new Date().toISOString(),
            createdBy,
            status: "active",
        };
        this.legalHolds.set(newHold.id, newHold);
        // Add to all applicable policies
        this.policies.forEach(policy => {
            if (this.holdAppliesToPolicy(newHold, policy)) {
                policy.legalHolds.push(newHold);
            }
        });
        this.saveState();
        VulpesLogger_1.vulpesLogger.warn("Created legal hold", {
            component: "RetentionPolicyEngine",
            holdId: newHold.id,
            holdName: newHold.name,
            reason: newHold.reason,
        });
        return newHold;
    }
    /**
     * Release a legal hold
     */
    releaseLegalHold(holdId, releasedBy) {
        const hold = this.legalHolds.get(holdId);
        if (!hold || hold.status !== "active")
            return null;
        hold.status = "released";
        hold.releasedAt = new Date().toISOString();
        hold.releasedBy = releasedBy;
        // Remove from policies
        this.policies.forEach(policy => {
            policy.legalHolds = policy.legalHolds.filter(h => h.id !== holdId);
        });
        this.saveState();
        VulpesLogger_1.vulpesLogger.warn("Released legal hold", {
            component: "RetentionPolicyEngine",
            holdId,
            releasedBy,
        });
        return hold;
    }
    /**
     * Check if a record is under legal hold
     */
    isUnderLegalHold(record) {
        const activeHolds = Array.from(this.legalHolds.values()).filter(h => h.status === "active");
        for (const hold of activeHolds) {
            if (hold.scope.allData)
                return true;
            if (hold.scope.dataTypes?.includes(record.dataType))
                return true;
            if (hold.scope.documentIds?.some(id => record.metadata.documentId === id))
                return true;
            if (hold.scope.dateRange) {
                const recordDate = new Date(record.createdAt);
                const start = new Date(hold.scope.dateRange.start);
                const end = new Date(hold.scope.dateRange.end);
                if (recordDate >= start && recordDate <= end)
                    return true;
            }
        }
        return false;
    }
    /**
     * Get all active legal holds
     */
    getActiveLegalHolds() {
        return Array.from(this.legalHolds.values()).filter(h => h.status === "active");
    }
    holdAppliesToPolicy(hold, policy) {
        if (hold.scope.allData)
            return true;
        if (hold.scope.dataTypes?.some(dt => policy.dataTypes.includes(dt)))
            return true;
        return false;
    }
    // ============================================================================
    // ARCHIVAL
    // ============================================================================
    /**
     * Archive a record
     */
    async archiveRecord(recordId, policyId) {
        const record = this.records.get(recordId);
        if (!record)
            throw new Error(`Record not found: ${recordId}`);
        if (record.status !== "active") {
            throw new Error(`Record ${recordId} is not active (status: ${record.status})`);
        }
        const policy = policyId ? this.policies.get(policyId) : this.getDefaultPolicy();
        if (!policy)
            throw new Error(`Policy not found: ${policyId}`);
        // Read original file
        const content = await fs.promises.readFile(record.filePath);
        const originalSize = content.length;
        // Compress if configured
        let processedContent = content;
        if (policy.compressArchive) {
            processedContent = Buffer.from(await gzip(content));
        }
        // Encrypt if configured
        if (policy.encryptArchive) {
            const key = policy.encryptionKeyId
                ? await this.getEncryptionKey(policy.encryptionKeyId)
                : this.defaultEncryptionKey;
            processedContent = this.encrypt(processedContent, key);
        }
        // Write to archive
        const archiveFileName = `${record.id}_${Date.now()}.archive${policy.compressArchive ? ".gz" : ""}${policy.encryptArchive ? ".enc" : ""}`;
        const archivePath = path.join(this.archivePath, record.dataType, archiveFileName);
        await fs.promises.mkdir(path.dirname(archivePath), { recursive: true });
        await fs.promises.writeFile(archivePath, processedContent);
        // Update record
        record.status = "archived";
        record.archivedAt = new Date().toISOString();
        record.archivePath = archivePath;
        this.saveState();
        const result = {
            recordId,
            originalPath: record.filePath,
            archivePath,
            originalSize,
            archivedSize: processedContent.length,
            compressionRatio: processedContent.length / originalSize,
            encrypted: policy.encryptArchive,
            timestamp: record.archivedAt,
        };
        VulpesLogger_1.vulpesLogger.info("Archived record", {
            component: "RetentionPolicyEngine",
            ...result,
        });
        return result;
    }
    /**
     * Archive all records due for archival
     */
    async archiveDueRecords(policyId) {
        const dueRecords = this.getRecordsDueForArchival(policyId);
        const results = [];
        for (const record of dueRecords) {
            try {
                const result = await this.archiveRecord(record.id, policyId);
                results.push(result);
            }
            catch (error) {
                VulpesLogger_1.vulpesLogger.error("Failed to archive record", {
                    component: "RetentionPolicyEngine",
                    recordId: record.id,
                    error: error.message,
                });
            }
        }
        return results;
    }
    /**
     * Restore a record from archive
     */
    async restoreRecord(recordId) {
        const record = this.records.get(recordId);
        if (!record)
            throw new Error(`Record not found: ${recordId}`);
        if (record.status !== "archived" || !record.archivePath) {
            throw new Error(`Record ${recordId} is not archived`);
        }
        const policy = this.getDefaultPolicy();
        // Read archived file
        let content = await fs.promises.readFile(record.archivePath);
        // Decrypt if encrypted
        if (record.archivePath.endsWith(".enc")) {
            const key = policy.encryptionKeyId
                ? await this.getEncryptionKey(policy.encryptionKeyId)
                : this.defaultEncryptionKey;
            content = this.decrypt(content, key);
        }
        // Decompress if compressed
        if (record.archivePath.includes(".gz")) {
            content = Buffer.from(await gunzip(content));
        }
        // Restore to original location
        await fs.promises.mkdir(path.dirname(record.filePath), { recursive: true });
        await fs.promises.writeFile(record.filePath, content);
        // Update record
        record.status = "active";
        record.archivedAt = undefined;
        record.archivePath = undefined;
        this.saveState();
        VulpesLogger_1.vulpesLogger.info("Restored record from archive", {
            component: "RetentionPolicyEngine",
            recordId,
            filePath: record.filePath,
        });
        return record.filePath;
    }
    // ============================================================================
    // DESTRUCTION
    // ============================================================================
    /**
     * Destroy expired records
     */
    async purgeExpiredRecords(executedBy, dryRun = false) {
        const dueRecords = this.getRecordsDueForDestruction();
        const result = {
            recordsProcessed: dueRecords.length,
            recordsDestroyed: 0,
            recordsSkipped: 0,
            skippedReasons: [],
            certificates: [],
            timestamp: new Date().toISOString(),
            executedBy,
        };
        for (const record of dueRecords) {
            // Double-check legal hold
            if (this.isUnderLegalHold(record)) {
                result.recordsSkipped++;
                result.skippedReasons.push({
                    recordId: record.id,
                    reason: "Under legal hold",
                });
                continue;
            }
            if (dryRun) {
                result.recordsDestroyed++;
                continue;
            }
            try {
                const certificate = await this.destroyRecord(record.id, executedBy);
                result.recordsDestroyed++;
                result.certificates.push(certificate);
            }
            catch (error) {
                result.recordsSkipped++;
                result.skippedReasons.push({
                    recordId: record.id,
                    reason: error.message,
                });
            }
        }
        VulpesLogger_1.vulpesLogger.warn("Purge operation completed", {
            component: "RetentionPolicyEngine",
            ...result,
            dryRun,
        });
        return result;
    }
    /**
     * Destroy a specific record
     */
    async destroyRecord(recordId, destroyedBy) {
        const record = this.records.get(recordId);
        if (!record)
            throw new Error(`Record not found: ${recordId}`);
        if (record.status === "destroyed") {
            throw new Error(`Record ${recordId} is already destroyed`);
        }
        if (this.isUnderLegalHold(record)) {
            throw new Error(`Record ${recordId} is under legal hold`);
        }
        const policy = this.getDefaultPolicy();
        const filePath = record.status === "archived" ? record.archivePath : record.filePath;
        // Get checksum before destruction
        let preChecksum = record.checksum;
        if (record.status === "archived" && record.archivePath) {
            const content = await fs.promises.readFile(record.archivePath);
            preChecksum = crypto.createHash("sha256").update(content).digest("hex");
        }
        // Destroy based on method
        switch (policy.destructionMethod) {
            case "secure_delete":
                await this.secureDelete(filePath);
                break;
            case "crypto_shred":
                // For crypto_shred, we just delete the file since we don't have key management
                await fs.promises.unlink(filePath);
                break;
            case "standard_delete":
                await fs.promises.unlink(filePath);
                break;
        }
        // Verify destruction
        let postDestructionVerified = false;
        try {
            await fs.promises.access(filePath);
            postDestructionVerified = false;
        }
        catch {
            postDestructionVerified = true;
        }
        // Create destruction certificate
        const certificate = {
            id: `cert_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
            recordId,
            destroyedAt: new Date().toISOString(),
            destroyedBy,
            method: policy.destructionMethod,
            verification: {
                preDestructionChecksum: preChecksum,
                postDestructionVerified,
            },
        };
        // Update record
        record.status = "destroyed";
        record.destroyedAt = certificate.destroyedAt;
        record.destroyedBy = destroyedBy;
        record.destructionCertificate = certificate;
        this.saveState();
        VulpesLogger_1.vulpesLogger.warn("Record destroyed", {
            component: "RetentionPolicyEngine",
            recordId,
            method: policy.destructionMethod,
            verified: postDestructionVerified,
        });
        return certificate;
    }
    /**
     * Secure delete with overwrite
     */
    async secureDelete(filePath) {
        const stats = await fs.promises.stat(filePath);
        const size = stats.size;
        // Overwrite with random data 3 times (DoD 5220.22-M standard)
        for (let pass = 0; pass < 3; pass++) {
            const randomData = crypto.randomBytes(size);
            await fs.promises.writeFile(filePath, randomData);
        }
        // Final overwrite with zeros
        await fs.promises.writeFile(filePath, Buffer.alloc(size, 0));
        // Delete the file
        await fs.promises.unlink(filePath);
    }
    // ============================================================================
    // ENCRYPTION
    // ============================================================================
    encrypt(data, key) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
        const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
        const authTag = cipher.getAuthTag();
        return Buffer.concat([iv, authTag, encrypted]);
    }
    decrypt(data, key) {
        const iv = data.subarray(0, 16);
        const authTag = data.subarray(16, 32);
        const encrypted = data.subarray(32);
        const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
        decipher.setAuthTag(authTag);
        return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    }
    generateDefaultKey() {
        return crypto.randomBytes(32).toString("hex");
    }
    async getEncryptionKey(keyId) {
        // In production, this would integrate with a key management system
        // For now, use default key
        VulpesLogger_1.vulpesLogger.warn("Using default encryption key (should use KMS in production)", {
            component: "RetentionPolicyEngine",
            keyId,
        });
        return this.defaultEncryptionKey;
    }
    // ============================================================================
    // PERSISTENCE
    // ============================================================================
    ensureDirectories() {
        const dirs = [
            this.basePath,
            this.archivePath,
            path.join(this.basePath, "policies"),
            path.join(this.basePath, "records"),
            path.join(this.basePath, "holds"),
        ];
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
    }
    loadState() {
        try {
            // Load policies
            const policiesPath = path.join(this.basePath, "policies", "policies.json");
            if (fs.existsSync(policiesPath)) {
                const data = JSON.parse(fs.readFileSync(policiesPath, "utf8"));
                data.forEach((p) => this.policies.set(p.id, p));
            }
            // Load records
            const recordsPath = path.join(this.basePath, "records", "records.json");
            if (fs.existsSync(recordsPath)) {
                const data = JSON.parse(fs.readFileSync(recordsPath, "utf8"));
                data.forEach((r) => this.records.set(r.id, r));
            }
            // Load legal holds
            const holdsPath = path.join(this.basePath, "holds", "holds.json");
            if (fs.existsSync(holdsPath)) {
                const data = JSON.parse(fs.readFileSync(holdsPath, "utf8"));
                data.forEach((h) => this.legalHolds.set(h.id, h));
            }
        }
        catch (error) {
            VulpesLogger_1.vulpesLogger.error("Failed to load retention state", {
                component: "RetentionPolicyEngine",
                error: error.message,
            });
        }
    }
    saveState() {
        try {
            // Save policies
            const policiesPath = path.join(this.basePath, "policies", "policies.json");
            fs.writeFileSync(policiesPath, JSON.stringify(Array.from(this.policies.values()), null, 2));
            // Save records
            const recordsPath = path.join(this.basePath, "records", "records.json");
            fs.writeFileSync(recordsPath, JSON.stringify(Array.from(this.records.values()), null, 2));
            // Save legal holds
            const holdsPath = path.join(this.basePath, "holds", "holds.json");
            fs.writeFileSync(holdsPath, JSON.stringify(Array.from(this.legalHolds.values()), null, 2));
        }
        catch (error) {
            VulpesLogger_1.vulpesLogger.error("Failed to save retention state", {
                component: "RetentionPolicyEngine",
                error: error.message,
            });
        }
    }
    createDefaultPolicy() {
        this.createPolicy(DEFAULT_POLICY);
    }
    startAutoOperations() {
        this.autoOperationTimer = setInterval(async () => {
            if (this.autoArchive) {
                await this.archiveDueRecords();
            }
            if (this.autoPurge) {
                await this.purgeExpiredRecords("system_auto");
            }
        }, this.autoOperationInterval);
    }
    /**
     * Stop automatic operations
     */
    stopAutoOperations() {
        if (this.autoOperationTimer) {
            clearInterval(this.autoOperationTimer);
            this.autoOperationTimer = undefined;
        }
    }
    /**
     * Get retention statistics
     */
    getStatistics() {
        const records = this.getAllRecords();
        return {
            totalPolicies: this.policies.size,
            totalRecords: records.length,
            activeRecords: records.filter(r => r.status === "active").length,
            archivedRecords: records.filter(r => r.status === "archived").length,
            destroyedRecords: records.filter(r => r.status === "destroyed").length,
            activeLegalHolds: this.getActiveLegalHolds().length,
            recordsDueForArchival: this.getRecordsDueForArchival().length,
            recordsDueForDestruction: this.getRecordsDueForDestruction().length,
        };
    }
}
exports.RetentionPolicyEngine = RetentionPolicyEngine;
// ============================================================================
// EXPORTS
// ============================================================================
exports.retentionPolicyEngine = RetentionPolicyEngine.getInstance();
//# sourceMappingURL=RetentionPolicyEngine.js.map