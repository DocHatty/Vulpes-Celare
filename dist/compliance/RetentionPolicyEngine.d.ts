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
export type DataType = "audit_logs" | "redaction_records" | "trust_bundles" | "fhir_audit_events" | "security_alerts" | "session_logs" | "analytics";
export type DestructionMethod = "secure_delete" | "crypto_shred" | "standard_delete";
export interface LegalHold {
    id: string;
    name: string;
    reason: string;
    createdAt: string;
    createdBy: string;
    expiresAt?: string;
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
    skippedReasons: Array<{
        recordId: string;
        reason: string;
    }>;
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
export declare class RetentionPolicyEngine {
    private static instance;
    private basePath;
    private archivePath;
    private defaultEncryptionKey;
    private autoArchive;
    private autoPurge;
    private autoOperationInterval;
    private policies;
    private records;
    private legalHolds;
    private autoOperationTimer?;
    private constructor();
    static getInstance(config?: RetentionPolicyEngineConfig): RetentionPolicyEngine;
    /**
     * Create a new retention policy
     */
    createPolicy(policy: Omit<RetentionPolicy, "id" | "createdAt" | "updatedAt" | "version">, createdBy?: string): RetentionPolicy;
    /**
     * Update an existing policy
     */
    updatePolicy(policyId: string, updates: Partial<Omit<RetentionPolicy, "id" | "createdAt" | "createdBy">>, updatedBy: string): RetentionPolicy | null;
    /**
     * Get a policy by ID
     */
    getPolicy(policyId: string): RetentionPolicy | undefined;
    /**
     * Get all policies
     */
    getAllPolicies(): RetentionPolicy[];
    /**
     * Get the default policy
     */
    getDefaultPolicy(): RetentionPolicy;
    /**
     * Register a record for retention management
     */
    registerRecord(filePath: string, dataType: DataType, metadata?: Record<string, unknown>, policyId?: string): Promise<RetentionRecord>;
    /**
     * Get a record by ID
     */
    getRecord(recordId: string): RetentionRecord | undefined;
    /**
     * Get all records
     */
    getAllRecords(): RetentionRecord[];
    /**
     * Get records by data type
     */
    getRecordsByType(dataType: DataType): RetentionRecord[];
    /**
     * Get records that are due for archival
     */
    getRecordsDueForArchival(policyId?: string): RetentionRecord[];
    /**
     * Get records that are due for destruction
     */
    getRecordsDueForDestruction(): RetentionRecord[];
    /**
     * Create a legal hold
     */
    createLegalHold(hold: Omit<LegalHold, "id" | "createdAt" | "status">, createdBy: string): LegalHold;
    /**
     * Release a legal hold
     */
    releaseLegalHold(holdId: string, releasedBy: string): LegalHold | null;
    /**
     * Check if a record is under legal hold
     */
    isUnderLegalHold(record: RetentionRecord): boolean;
    /**
     * Get all active legal holds
     */
    getActiveLegalHolds(): LegalHold[];
    private holdAppliesToPolicy;
    /**
     * Archive a record
     */
    archiveRecord(recordId: string, policyId?: string): Promise<ArchiveResult>;
    /**
     * Archive all records due for archival
     */
    archiveDueRecords(policyId?: string): Promise<ArchiveResult[]>;
    /**
     * Restore a record from archive
     */
    restoreRecord(recordId: string): Promise<string>;
    /**
     * Destroy expired records
     */
    purgeExpiredRecords(executedBy: string, dryRun?: boolean): Promise<PurgeResult>;
    /**
     * Destroy a specific record
     */
    destroyRecord(recordId: string, destroyedBy: string): Promise<DestructionCertificate>;
    /**
     * Secure delete with overwrite
     */
    private secureDelete;
    private encrypt;
    private decrypt;
    private generateDefaultKey;
    private getEncryptionKey;
    private ensureDirectories;
    private loadState;
    private saveState;
    private createDefaultPolicy;
    private startAutoOperations;
    /**
     * Stop automatic operations
     */
    stopAutoOperations(): void;
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
    };
}
export declare const retentionPolicyEngine: RetentionPolicyEngine;
//# sourceMappingURL=RetentionPolicyEngine.d.ts.map