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

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as zlib from "zlib";
import { promisify } from "util";
import { vulpesLogger as log } from "../utils/VulpesLogger";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// ============================================================================
// TYPES
// ============================================================================

export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;

  /** Retention period in days (default: 2190 = 6 years for HIPAA) */
  retentionDays: number;

  /** Days after which to archive (move to cold storage) */
  archiveAfterDays: number;

  /** Data types this policy applies to */
  dataTypes: DataType[];

  /** Whether to compress archived data */
  compressArchive: boolean;

  /** Whether to encrypt archived data */
  encryptArchive: boolean;

  /** Encryption key ID (if encryptArchive is true) */
  encryptionKeyId?: string;

  /** Active legal holds that prevent deletion */
  legalHolds: LegalHold[];

  /** Destruction method */
  destructionMethod: DestructionMethod;
}

export type DataType =
  | "audit_logs"
  | "redaction_records"
  | "trust_bundles"
  | "fhir_audit_events"
  | "security_alerts"
  | "session_logs"
  | "analytics";

export type DestructionMethod =
  | "secure_delete"    // Overwrite with random data
  | "crypto_shred"     // Delete encryption keys
  | "standard_delete"; // Normal file deletion

export interface LegalHold {
  id: string;
  name: string;
  reason: string;
  createdAt: string;
  createdBy: string;
  expiresAt?: string;  // null = indefinite
  scope: LegalHoldScope;
  status: "active" | "released";
  releasedAt?: string;
  releasedBy?: string;
}

export interface LegalHoldScope {
  /** Date range of records to hold */
  dateRange?: {
    start: string;
    end: string;
  };
  /** Specific document IDs */
  documentIds?: string[];
  /** PHI types to hold */
  phiTypes?: string[];
  /** Data types to hold */
  dataTypes?: DataType[];
  /** All data (nuclear option) */
  allData?: boolean;
}

export interface RetentionRecord {
  id: string;
  dataType: DataType;
  filePath: string;
  createdAt: string;
  archivedAt?: string;
  archivePath?: string;
  retentionExpiresAt: string;
  size: number;
  checksum: string;
  metadata: Record<string, unknown>;
  status: "active" | "archived" | "destroyed";
  destroyedAt?: string;
  destroyedBy?: string;
  destructionCertificate?: DestructionCertificate;
}

export interface DestructionCertificate {
  id: string;
  recordId: string;
  destroyedAt: string;
  destroyedBy: string;
  method: DestructionMethod;
  verification: {
    preDestructionChecksum: string;
    postDestructionVerified: boolean;
  };
  witness?: string;
  notes?: string;
}

export interface ArchiveResult {
  recordId: string;
  originalPath: string;
  archivePath: string;
  originalSize: number;
  archivedSize: number;
  compressionRatio: number;
  encrypted: boolean;
  timestamp: string;
}

export interface PurgeResult {
  recordsProcessed: number;
  recordsDestroyed: number;
  recordsSkipped: number;
  skippedReasons: Array<{ recordId: string; reason: string }>;
  certificates: DestructionCertificate[];
  timestamp: string;
  executedBy: string;
}

export interface RetentionPolicyEngineConfig {
  /** Base directory for retention data */
  basePath?: string;
  /** Directory for archived data */
  archivePath?: string;
  /** Default encryption key for archives */
  defaultEncryptionKey?: string;
  /** Enable automatic archival */
  autoArchive?: boolean;
  /** Enable automatic purge of expired records */
  autoPurge?: boolean;
  /** Interval for automatic operations (ms) */
  autoOperationInterval?: number;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const HIPAA_RETENTION_DAYS = 2190; // 6 years
const DEFAULT_ARCHIVE_DAYS = 365;  // 1 year

const DEFAULT_POLICY: Omit<RetentionPolicy, "id" | "createdAt" | "updatedAt" | "version"> = {
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

export class RetentionPolicyEngine {
  private static instance: RetentionPolicyEngine;

  private basePath: string;
  private archivePath: string;
  private defaultEncryptionKey: string;
  private autoArchive: boolean;
  private autoPurge: boolean;
  private autoOperationInterval: number;

  private policies: Map<string, RetentionPolicy> = new Map();
  private records: Map<string, RetentionRecord> = new Map();
  private legalHolds: Map<string, LegalHold> = new Map();

  private autoOperationTimer?: NodeJS.Timeout;

  private constructor(config: RetentionPolicyEngineConfig = {}) {
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

    log.info("RetentionPolicyEngine initialized", {
      component: "RetentionPolicyEngine",
      policies: this.policies.size,
      records: this.records.size,
      legalHolds: this.legalHolds.size,
    });
  }

  static getInstance(config?: RetentionPolicyEngineConfig): RetentionPolicyEngine {
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
  createPolicy(
    policy: Omit<RetentionPolicy, "id" | "createdAt" | "updatedAt" | "version">,
    createdBy?: string
  ): RetentionPolicy {
    const now = new Date().toISOString();
    const newPolicy: RetentionPolicy = {
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

    log.info("Created retention policy", {
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
  updatePolicy(
    policyId: string,
    updates: Partial<Omit<RetentionPolicy, "id" | "createdAt" | "createdBy">>,
    updatedBy: string
  ): RetentionPolicy | null {
    const existing = this.policies.get(policyId);
    if (!existing) return null;

    const updated: RetentionPolicy = {
      ...existing,
      ...updates,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };

    this.policies.set(policyId, updated);
    this.saveState();

    log.info("Updated retention policy", {
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
  getPolicy(policyId: string): RetentionPolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Get all policies
   */
  getAllPolicies(): RetentionPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get the default policy
   */
  getDefaultPolicy(): RetentionPolicy {
    const policies = this.getAllPolicies();
    return policies.find(p => p.name === "HIPAA Default") ?? policies[0];
  }

  // ============================================================================
  // RECORD MANAGEMENT
  // ============================================================================

  /**
   * Register a record for retention management
   */
  async registerRecord(
    filePath: string,
    dataType: DataType,
    metadata: Record<string, unknown> = {},
    policyId?: string
  ): Promise<RetentionRecord> {
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

    const record: RetentionRecord = {
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

    log.debug("Registered retention record", {
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
  getRecord(recordId: string): RetentionRecord | undefined {
    return this.records.get(recordId);
  }

  /**
   * Get all records
   */
  getAllRecords(): RetentionRecord[] {
    return Array.from(this.records.values());
  }

  /**
   * Get records by data type
   */
  getRecordsByType(dataType: DataType): RetentionRecord[] {
    return this.getAllRecords().filter(r => r.dataType === dataType);
  }

  /**
   * Get records that are due for archival
   */
  getRecordsDueForArchival(policyId?: string): RetentionRecord[] {
    const policy = policyId ? this.policies.get(policyId) : this.getDefaultPolicy();
    if (!policy) return [];

    const archiveThreshold = new Date();
    archiveThreshold.setDate(archiveThreshold.getDate() - policy.archiveAfterDays);

    return this.getAllRecords().filter(r =>
      r.status === "active" &&
      new Date(r.createdAt) < archiveThreshold
    );
  }

  /**
   * Get records that are due for destruction
   */
  getRecordsDueForDestruction(): RetentionRecord[] {
    const now = new Date();
    return this.getAllRecords().filter(r =>
      r.status !== "destroyed" &&
      new Date(r.retentionExpiresAt) < now &&
      !this.isUnderLegalHold(r)
    );
  }

  // ============================================================================
  // LEGAL HOLDS
  // ============================================================================

  /**
   * Create a legal hold
   */
  createLegalHold(
    hold: Omit<LegalHold, "id" | "createdAt" | "status">,
    createdBy: string
  ): LegalHold {
    const newHold: LegalHold = {
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

    log.warn("Created legal hold", {
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
  releaseLegalHold(holdId: string, releasedBy: string): LegalHold | null {
    const hold = this.legalHolds.get(holdId);
    if (!hold || hold.status !== "active") return null;

    hold.status = "released";
    hold.releasedAt = new Date().toISOString();
    hold.releasedBy = releasedBy;

    // Remove from policies
    this.policies.forEach(policy => {
      policy.legalHolds = policy.legalHolds.filter(h => h.id !== holdId);
    });

    this.saveState();

    log.warn("Released legal hold", {
      component: "RetentionPolicyEngine",
      holdId,
      releasedBy,
    });

    return hold;
  }

  /**
   * Check if a record is under legal hold
   */
  isUnderLegalHold(record: RetentionRecord): boolean {
    const activeHolds = Array.from(this.legalHolds.values()).filter(h => h.status === "active");

    for (const hold of activeHolds) {
      if (hold.scope.allData) return true;

      if (hold.scope.dataTypes?.includes(record.dataType)) return true;

      if (hold.scope.documentIds?.some(id => record.metadata.documentId === id)) return true;

      if (hold.scope.dateRange) {
        const recordDate = new Date(record.createdAt);
        const start = new Date(hold.scope.dateRange.start);
        const end = new Date(hold.scope.dateRange.end);
        if (recordDate >= start && recordDate <= end) return true;
      }
    }

    return false;
  }

  /**
   * Get all active legal holds
   */
  getActiveLegalHolds(): LegalHold[] {
    return Array.from(this.legalHolds.values()).filter(h => h.status === "active");
  }

  private holdAppliesToPolicy(hold: LegalHold, policy: RetentionPolicy): boolean {
    if (hold.scope.allData) return true;
    if (hold.scope.dataTypes?.some(dt => policy.dataTypes.includes(dt))) return true;
    return false;
  }

  // ============================================================================
  // ARCHIVAL
  // ============================================================================

  /**
   * Archive a record
   */
  async archiveRecord(recordId: string, policyId?: string): Promise<ArchiveResult> {
    const record = this.records.get(recordId);
    if (!record) throw new Error(`Record not found: ${recordId}`);

    if (record.status !== "active") {
      throw new Error(`Record ${recordId} is not active (status: ${record.status})`);
    }

    const policy = policyId ? this.policies.get(policyId) : this.getDefaultPolicy();
    if (!policy) throw new Error(`Policy not found: ${policyId}`);

    // Read original file
    const content = await fs.promises.readFile(record.filePath);
    const originalSize = content.length;

    // Compress if configured
    let processedContent: Buffer = content;
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

    const result: ArchiveResult = {
      recordId,
      originalPath: record.filePath,
      archivePath,
      originalSize,
      archivedSize: processedContent.length,
      compressionRatio: processedContent.length / originalSize,
      encrypted: policy.encryptArchive,
      timestamp: record.archivedAt,
    };

    log.info("Archived record", {
      component: "RetentionPolicyEngine",
      ...result,
    });

    return result;
  }

  /**
   * Archive all records due for archival
   */
  async archiveDueRecords(policyId?: string): Promise<ArchiveResult[]> {
    const dueRecords = this.getRecordsDueForArchival(policyId);
    const results: ArchiveResult[] = [];

    for (const record of dueRecords) {
      try {
        const result = await this.archiveRecord(record.id, policyId);
        results.push(result);
      } catch (error) {
        log.error("Failed to archive record", {
          component: "RetentionPolicyEngine",
          recordId: record.id,
          error: (error as Error).message,
        });
      }
    }

    return results;
  }

  /**
   * Restore a record from archive
   */
  async restoreRecord(recordId: string): Promise<string> {
    const record = this.records.get(recordId);
    if (!record) throw new Error(`Record not found: ${recordId}`);

    if (record.status !== "archived" || !record.archivePath) {
      throw new Error(`Record ${recordId} is not archived`);
    }

    const policy = this.getDefaultPolicy();

    // Read archived file
    let content: Buffer = await fs.promises.readFile(record.archivePath);

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

    log.info("Restored record from archive", {
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
  async purgeExpiredRecords(executedBy: string, dryRun: boolean = false): Promise<PurgeResult> {
    const dueRecords = this.getRecordsDueForDestruction();
    const result: PurgeResult = {
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
      } catch (error) {
        result.recordsSkipped++;
        result.skippedReasons.push({
          recordId: record.id,
          reason: (error as Error).message,
        });
      }
    }

    log.warn("Purge operation completed", {
      component: "RetentionPolicyEngine",
      ...result,
      dryRun,
    });

    return result;
  }

  /**
   * Destroy a specific record
   */
  async destroyRecord(recordId: string, destroyedBy: string): Promise<DestructionCertificate> {
    const record = this.records.get(recordId);
    if (!record) throw new Error(`Record not found: ${recordId}`);

    if (record.status === "destroyed") {
      throw new Error(`Record ${recordId} is already destroyed`);
    }

    if (this.isUnderLegalHold(record)) {
      throw new Error(`Record ${recordId} is under legal hold`);
    }

    const policy = this.getDefaultPolicy();
    const filePath = record.status === "archived" ? record.archivePath! : record.filePath;

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
    } catch {
      postDestructionVerified = true;
    }

    // Create destruction certificate
    const certificate: DestructionCertificate = {
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

    log.warn("Record destroyed", {
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
  private async secureDelete(filePath: string): Promise<void> {
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

  private encrypt(data: Buffer, key: string): Buffer {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]);
  }

  private decrypt(data: Buffer, key: string): Buffer {
    const iv = data.subarray(0, 16);
    const authTag = data.subarray(16, 32);
    const encrypted = data.subarray(32);
    const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  private generateDefaultKey(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  private async getEncryptionKey(keyId: string): Promise<string> {
    // In production, this would integrate with a key management system
    // For now, use default key
    log.warn("Using default encryption key (should use KMS in production)", {
      component: "RetentionPolicyEngine",
      keyId,
    });
    return this.defaultEncryptionKey;
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  private ensureDirectories(): void {
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

  private loadState(): void {
    try {
      // Load policies
      const policiesPath = path.join(this.basePath, "policies", "policies.json");
      if (fs.existsSync(policiesPath)) {
        const data = JSON.parse(fs.readFileSync(policiesPath, "utf8"));
        data.forEach((p: RetentionPolicy) => this.policies.set(p.id, p));
      }

      // Load records
      const recordsPath = path.join(this.basePath, "records", "records.json");
      if (fs.existsSync(recordsPath)) {
        const data = JSON.parse(fs.readFileSync(recordsPath, "utf8"));
        data.forEach((r: RetentionRecord) => this.records.set(r.id, r));
      }

      // Load legal holds
      const holdsPath = path.join(this.basePath, "holds", "holds.json");
      if (fs.existsSync(holdsPath)) {
        const data = JSON.parse(fs.readFileSync(holdsPath, "utf8"));
        data.forEach((h: LegalHold) => this.legalHolds.set(h.id, h));
      }
    } catch (error) {
      log.error("Failed to load retention state", {
        component: "RetentionPolicyEngine",
        error: (error as Error).message,
      });
    }
  }

  private saveState(): void {
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
    } catch (error) {
      log.error("Failed to save retention state", {
        component: "RetentionPolicyEngine",
        error: (error as Error).message,
      });
    }
  }

  private createDefaultPolicy(): void {
    this.createPolicy(DEFAULT_POLICY);
  }

  private startAutoOperations(): void {
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
  stopAutoOperations(): void {
    if (this.autoOperationTimer) {
      clearInterval(this.autoOperationTimer);
      this.autoOperationTimer = undefined;
    }
  }

  /**
   * Get retention statistics
   */
  getStatistics(): {
    totalPolicies: number;
    totalRecords: number;
    activeRecords: number;
    archivedRecords: number;
    destroyedRecords: number;
    activeLegalHolds: number;
    recordsDueForArchival: number;
    recordsDueForDestruction: number;
  } {
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

// ============================================================================
// EXPORTS
// ============================================================================

export const retentionPolicyEngine = RetentionPolicyEngine.getInstance();
