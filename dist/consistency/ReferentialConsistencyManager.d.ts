/**
 * ReferentialConsistencyManager - Cross-Document PHI Token Consistency
 *
 * Ensures the same PHI entity receives the same replacement token across
 * multiple documents in a session or batch. This is critical for:
 *
 * 1. Longitudinal Research: Same patient tracked across multiple documents
 * 2. Data Linkage: Maintaining relationships between de-identified records
 * 3. Audit Trails: Consistent mapping for re-identification if authorized
 *
 * ALGORITHM:
 * 1. Normalize PHI text (case, whitespace, formatting)
 * 2. Generate deterministic token using HMAC-SHA256 with session salt
 * 3. Maintain counter per PHI type for human-readable tokens
 * 4. Store mapping for optional encrypted export
 *
 * SECURITY:
 * - Session salt is cryptographically random and never stored
 * - Token generation is deterministic but not reversible without salt
 * - Mapping export uses AES-256-GCM encryption
 * - Memory-only by default (no persistence)
 *
 * @module consistency
 */
import { FilterType } from "../models/Span";
/**
 * Consistent token information
 */
export interface ConsistentToken {
    /** The replacement token */
    token: string;
    /** Normalized form of original value */
    normalizedValue: string;
    /** PHI type */
    filterType: FilterType;
    /** First occurrence timestamp */
    firstSeen: Date;
    /** Number of occurrences across documents */
    occurrenceCount: number;
    /** Short hash for quick lookup */
    shortHash: string;
}
/**
 * Entity mapping for export/import
 */
export interface EntityMapping {
    /** Version for future compatibility */
    version: number;
    /** Encrypted mapping data */
    encryptedData: string;
    /** IV for AES-GCM */
    iv: string;
    /** Auth tag for AES-GCM */
    authTag: string;
    /** Salt hash for verification (not the actual salt) */
    saltHash: string;
    /** Creation timestamp */
    createdAt: string;
    /** Number of entities */
    entityCount: number;
}
/**
 * Audit log entry (HIPAA requirement)
 *
 * AUDIT (2025-12-19): Added per HIPAA/John Snow Labs audit trail best practices
 */
export interface AuditLogEntry {
    /** Timestamp of the action */
    timestamp: Date;
    /** Type of action */
    action: "token_created" | "token_accessed" | "mapping_exported" | "mapping_imported" | "collision_detected" | "entity_evicted";
    /** PHI type involved */
    filterType?: FilterType;
    /** Token hash (not the actual token or PHI) */
    tokenHash?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Audit log handler interface
 */
export interface AuditLogHandler {
    log(entry: AuditLogEntry): void;
}
/**
 * Default console audit logger
 * Exported for users who want simple console logging
 */
export declare const ConsoleAuditLogger: AuditLogHandler;
/**
 * Configuration for consistency manager
 */
export interface ConsistencyConfig {
    /** Custom session salt (for batch consistency) */
    salt?: string;
    /** Enable strict normalization (more aggressive) */
    strictNormalization?: boolean;
    /** Token format template */
    tokenFormat?: string;
    /** Maximum entities to track (prevents memory bloat) */
    maxEntities?: number;
    /** Enable debug logging */
    debug?: boolean;
    /**
     * PBKDF2 iterations for key derivation (default: 100000)
     * AUDIT (2025-12-19): Added per NIST SP 800-132 recommendations
     */
    pbkdf2Iterations?: number;
    /**
     * Enable audit logging (HIPAA requirement)
     */
    enableAuditLog?: boolean;
    /**
     * Custom audit log handler
     */
    auditLogHandler?: AuditLogHandler;
    /**
     * Enable collision detection for token generation
     */
    enableCollisionDetection?: boolean;
}
/**
 * ReferentialConsistencyManager - Maintains PHI token consistency across documents
 *
 * AUDIT (2025-12-19): Enhanced with:
 * - PBKDF2 key derivation per NIST SP 800-132
 * - Audit logging per HIPAA requirements
 * - Collision detection for token uniqueness
 */
export declare class ReferentialConsistencyManager {
    private config;
    private salt;
    private entityMap;
    private typeCounters;
    private initialized;
    /**
     * Reverse index: token -> entity key
     * Used for collision detection
     * AUDIT (2025-12-19): Added for collision detection per tokenization best practices
     */
    private tokenToEntityMap;
    /**
     * Audit log buffer (if no handler provided)
     */
    private auditLogBuffer;
    /**
     * Collision statistics
     */
    private collisionStats;
    constructor(config?: ConsistencyConfig);
    /**
     * Get consistent token for a PHI value
     *
     * If this value has been seen before (in normalized form), returns the same token.
     * Otherwise, generates a new deterministic token.
     *
     * AUDIT (2025-12-19): Enhanced with audit logging and collision detection
     */
    getConsistentToken(originalValue: string, filterType: FilterType): string;
    /**
     * Check if a value has been seen before
     */
    hasEntity(originalValue: string, filterType: FilterType): boolean;
    /**
     * Get statistics about tracked entities
     */
    getStatistics(): {
        totalEntities: number;
        byType: Record<string, number>;
        totalOccurrences: number;
    };
    /**
     * Export entity mapping (encrypted)
     *
     * The exported mapping can be used to:
     * 1. Resume a session with consistent tokens
     * 2. Re-identify PHI with proper authorization
     * 3. Audit de-identification decisions
     *
     * AUDIT (2025-12-19): Updated to use PBKDF2 key derivation per NIST SP 800-132
     */
    exportMapping(encryptionKey: string): EntityMapping;
    /**
     * Import entity mapping (decrypted)
     *
     * Restores a previous session's entity mappings.
     * Requires the same salt used when the entities were originally tracked.
     *
     * AUDIT (2025-12-19): Updated to support both v1 (SHA256) and v2 (PBKDF2) key derivation
     */
    importMapping(mapping: EntityMapping, encryptionKey: string, sessionSalt?: string): boolean;
    /**
     * Clear all tracked entities
     */
    clear(): void;
    /**
     * Reset with new salt (starts fresh session)
     */
    reset(newSalt?: string): void;
    /**
     * Normalize a value according to its PHI type
     */
    private normalize;
    /**
     * Create lookup key from normalized value and type
     */
    private createKey;
    /**
     * Generate deterministic token for an entity
     *
     * AUDIT (2025-12-19): Updated to support attempt parameter for collision resolution
     */
    private generateToken;
    /**
     * Get next counter for a PHI type
     */
    private getNextCounter;
    /**
     * Evict oldest entity when at capacity
     *
     * AUDIT (2025-12-19): Updated to return evicted entity for audit logging
     */
    private evictOldest;
    /**
     * Generate token with collision detection
     *
     * AUDIT (2025-12-19): Added per tokenization best practices
     * Ensures generated tokens are unique across all entities
     */
    private generateTokenWithCollisionCheck;
    /**
     * Log audit entry
     */
    private logAudit;
    /**
     * Hash token for audit logging (don't log actual tokens)
     */
    private hashForAudit;
    /**
     * Get audit log entries (if buffered)
     */
    getAuditLog(): AuditLogEntry[];
    /**
     * Clear audit log buffer
     */
    clearAuditLog(): void;
    /**
     * Get collision statistics
     */
    getCollisionStats(): {
        detected: number;
        resolved: number;
    };
    /**
     * Get the current session salt hash (for verification, not the actual salt)
     */
    getSaltHash(): string;
    /**
     * Check if manager is initialized
     */
    isInitialized(): boolean;
}
/**
 * Get global consistency manager
 */
export declare function getConsistencyManager(): ReferentialConsistencyManager;
/**
 * Initialize global consistency manager with config
 */
export declare function initializeConsistencyManager(config: ConsistencyConfig): ReferentialConsistencyManager;
/**
 * Reset global consistency manager
 */
export declare function resetConsistencyManager(newSalt?: string): void;
//# sourceMappingURL=ReferentialConsistencyManager.d.ts.map