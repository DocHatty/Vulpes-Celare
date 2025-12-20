"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferentialConsistencyManager = exports.ConsoleAuditLogger = void 0;
exports.getConsistencyManager = getConsistencyManager;
exports.initializeConsistencyManager = initializeConsistencyManager;
exports.resetConsistencyManager = resetConsistencyManager;
const crypto_1 = require("crypto");
const Span_1 = require("../models/Span");
/**
 * Default console audit logger
 * Exported for users who want simple console logging
 */
exports.ConsoleAuditLogger = {
    log: (entry) => {
        console.log(`[AUDIT] ${entry.timestamp.toISOString()} ${entry.action}`, entry.metadata || "");
    },
};
/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
    salt: "", // Will be generated if empty
    strictNormalization: true,
    tokenFormat: "[{TYPE}-{COUNTER}-{HASH}]",
    maxEntities: 100000,
    debug: false,
    pbkdf2Iterations: 100000, // NIST SP 800-132 minimum
    enableAuditLog: false,
    auditLogHandler: undefined,
    enableCollisionDetection: true,
};
/**
 * Normalization rules per PHI type
 */
const NORMALIZATION_RULES = {
    [Span_1.FilterType.NAME]: (v) => {
        // Normalize names: "SMITH, JOHN" -> "john smith"
        return v
            .toLowerCase()
            .replace(/[,\.]/g, " ")
            .replace(/\s+/g, " ")
            .replace(/^(dr|mr|mrs|ms|miss|prof)\.?\s*/i, "")
            .replace(/\s+(jr|sr|ii|iii|iv|md|phd|do)\.?$/i, "")
            .trim();
    },
    [Span_1.FilterType.DATE]: (v) => {
        // Normalize dates: various formats to YYYY-MM-DD
        const cleaned = v.replace(/[\/\-\.]/g, "-");
        const parts = cleaned.split("-").map((p) => p.padStart(2, "0"));
        if (parts.length === 3) {
            // Try to detect format
            if (parts[0].length === 4) {
                return parts.join("-"); // Already YYYY-MM-DD
            }
            else if (parseInt(parts[2]) > 31) {
                // MM-DD-YYYY or DD-MM-YYYY
                return `${parts[2]}-${parts[0]}-${parts[1]}`;
            }
        }
        return v.toLowerCase().replace(/\s+/g, "");
    },
    [Span_1.FilterType.SSN]: (v) => {
        // Normalize SSN: remove all non-digits
        return v.replace(/\D/g, "");
    },
    [Span_1.FilterType.PHONE]: (v) => {
        // Normalize phone: remove all non-digits
        return v.replace(/\D/g, "");
    },
    [Span_1.FilterType.EMAIL]: (v) => {
        // Normalize email: lowercase
        return v.toLowerCase().trim();
    },
    [Span_1.FilterType.MRN]: (v) => {
        // Normalize MRN: uppercase, remove spaces
        return v.toUpperCase().replace(/\s+/g, "");
    },
    [Span_1.FilterType.ADDRESS]: (v) => {
        // Normalize address: lowercase, standardize abbreviations
        return v
            .toLowerCase()
            .replace(/\bstreet\b/gi, "st")
            .replace(/\bavenue\b/gi, "ave")
            .replace(/\bboulevard\b/gi, "blvd")
            .replace(/\bdrive\b/gi, "dr")
            .replace(/\broad\b/gi, "rd")
            .replace(/\bapartment\b/gi, "apt")
            .replace(/\bsuite\b/gi, "ste")
            .replace(/\s+/g, " ")
            .trim();
    },
};
/**
 * Default normalization for types without specific rules
 */
function defaultNormalization(value) {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
}
/**
 * ReferentialConsistencyManager - Maintains PHI token consistency across documents
 *
 * AUDIT (2025-12-19): Enhanced with:
 * - PBKDF2 key derivation per NIST SP 800-132
 * - Audit logging per HIPAA requirements
 * - Collision detection for token uniqueness
 */
class ReferentialConsistencyManager {
    config;
    salt;
    entityMap;
    typeCounters;
    initialized = false;
    /**
     * Reverse index: token -> entity key
     * Used for collision detection
     * AUDIT (2025-12-19): Added for collision detection per tokenization best practices
     */
    tokenToEntityMap;
    /**
     * Audit log buffer (if no handler provided)
     */
    auditLogBuffer;
    /**
     * Collision statistics
     */
    collisionStats;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.entityMap = new Map();
        this.typeCounters = new Map();
        this.tokenToEntityMap = new Map();
        this.auditLogBuffer = [];
        this.collisionStats = { detected: 0, resolved: 0 };
        // Generate or use provided salt
        if (this.config.salt) {
            this.salt = (0, crypto_1.createHash)("sha256").update(this.config.salt).digest();
        }
        else {
            this.salt = (0, crypto_1.randomBytes)(32);
        }
        this.initialized = true;
    }
    /**
     * Get consistent token for a PHI value
     *
     * If this value has been seen before (in normalized form), returns the same token.
     * Otherwise, generates a new deterministic token.
     *
     * AUDIT (2025-12-19): Enhanced with audit logging and collision detection
     */
    getConsistentToken(originalValue, filterType) {
        // Normalize the value
        const normalized = this.normalize(originalValue, filterType);
        // Create lookup key
        const key = this.createKey(normalized, filterType);
        // Check if we've seen this entity before
        const existing = this.entityMap.get(key);
        if (existing) {
            existing.occurrenceCount++;
            // Audit log: token accessed
            this.logAudit({
                timestamp: new Date(),
                action: "token_accessed",
                filterType,
                tokenHash: this.hashForAudit(existing.token),
                metadata: { occurrenceCount: existing.occurrenceCount },
            });
            return existing.token;
        }
        // Check entity limit
        if (this.entityMap.size >= this.config.maxEntities) {
            // Evict oldest entity
            const evicted = this.evictOldest();
            if (evicted) {
                this.logAudit({
                    timestamp: new Date(),
                    action: "entity_evicted",
                    filterType: evicted.filterType,
                    tokenHash: this.hashForAudit(evicted.token),
                });
            }
        }
        // Generate new token with collision detection
        const token = this.generateTokenWithCollisionCheck(normalized, filterType, key);
        // Store mapping
        this.entityMap.set(key, {
            token,
            normalizedValue: normalized,
            filterType,
            firstSeen: new Date(),
            occurrenceCount: 1,
            shortHash: key.substring(0, 8),
        });
        // Update reverse index for collision detection
        this.tokenToEntityMap.set(token, key);
        // Audit log: token created
        this.logAudit({
            timestamp: new Date(),
            action: "token_created",
            filterType,
            tokenHash: this.hashForAudit(token),
            metadata: { entityCount: this.entityMap.size },
        });
        if (this.config.debug) {
            console.log(`[Consistency] New entity: ${filterType} "${normalized.substring(0, 20)}..." -> ${token}`);
        }
        return token;
    }
    /**
     * Check if a value has been seen before
     */
    hasEntity(originalValue, filterType) {
        const normalized = this.normalize(originalValue, filterType);
        const key = this.createKey(normalized, filterType);
        return this.entityMap.has(key);
    }
    /**
     * Get statistics about tracked entities
     */
    getStatistics() {
        const byType = {};
        let totalOccurrences = 0;
        for (const entity of this.entityMap.values()) {
            byType[entity.filterType] = (byType[entity.filterType] || 0) + 1;
            totalOccurrences += entity.occurrenceCount;
        }
        return {
            totalEntities: this.entityMap.size,
            byType,
            totalOccurrences,
        };
    }
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
    exportMapping(encryptionKey) {
        // Derive encryption key using PBKDF2 (NIST SP 800-132 compliant)
        // Using a fixed salt derived from session salt ensures reproducibility for import
        const keySalt = (0, crypto_1.createHash)("sha256").update(this.salt).update("export-key-derivation").digest();
        const key = (0, crypto_1.pbkdf2Sync)(encryptionKey, keySalt, this.config.pbkdf2Iterations, 32, "sha256");
        const iv = (0, crypto_1.randomBytes)(12); // 96-bit IV for GCM
        // Prepare data for export
        const exportData = {
            entities: Array.from(this.entityMap.entries()).map(([k, v]) => ({
                key: k,
                token: v.token,
                normalized: v.normalizedValue,
                type: v.filterType,
                firstSeen: v.firstSeen.toISOString(),
                count: v.occurrenceCount,
            })),
            counters: Array.from(this.typeCounters.entries()),
            // Include key derivation params for future compatibility
            kdf: {
                algorithm: "pbkdf2",
                iterations: this.config.pbkdf2Iterations,
                hashFunction: "sha256",
            },
        };
        // Encrypt
        const cipher = (0, crypto_1.createCipheriv)("aes-256-gcm", key, iv);
        const jsonData = JSON.stringify(exportData);
        const encrypted = Buffer.concat([
            cipher.update(jsonData, "utf8"),
            cipher.final(),
        ]);
        const authTag = cipher.getAuthTag();
        // Audit log: mapping exported
        this.logAudit({
            timestamp: new Date(),
            action: "mapping_exported",
            metadata: { entityCount: this.entityMap.size },
        });
        return {
            version: 2, // Bumped version for PBKDF2 change
            encryptedData: encrypted.toString("base64"),
            iv: iv.toString("base64"),
            authTag: authTag.toString("base64"),
            saltHash: (0, crypto_1.createHash)("sha256").update(this.salt).digest("hex").substring(0, 16),
            createdAt: new Date().toISOString(),
            entityCount: this.entityMap.size,
        };
    }
    /**
     * Import entity mapping (decrypted)
     *
     * Restores a previous session's entity mappings.
     * Requires the same salt used when the entities were originally tracked.
     *
     * AUDIT (2025-12-19): Updated to support both v1 (SHA256) and v2 (PBKDF2) key derivation
     */
    importMapping(mapping, encryptionKey, sessionSalt) {
        try {
            let key;
            // Determine key derivation method based on version
            if (mapping.version >= 2) {
                // Version 2+: Use PBKDF2 key derivation
                const keySalt = (0, crypto_1.createHash)("sha256").update(this.salt).update("export-key-derivation").digest();
                // Use iterations from embedded KDF params if available, otherwise use config
                const iterations = this.config.pbkdf2Iterations;
                key = (0, crypto_1.pbkdf2Sync)(encryptionKey, keySalt, iterations, 32, "sha256");
            }
            else {
                // Version 1: Legacy SHA256 key derivation (backward compatibility)
                key = (0, crypto_1.createHash)("sha256").update(encryptionKey).digest();
            }
            const iv = Buffer.from(mapping.iv, "base64");
            const authTag = Buffer.from(mapping.authTag, "base64");
            const encryptedData = Buffer.from(mapping.encryptedData, "base64");
            // Decrypt
            const decipher = (0, crypto_1.createDecipheriv)("aes-256-gcm", key, iv);
            decipher.setAuthTag(authTag);
            const decrypted = Buffer.concat([
                decipher.update(encryptedData),
                decipher.final(),
            ]);
            const data = JSON.parse(decrypted.toString("utf8"));
            // Restore entities
            for (const entity of data.entities) {
                this.entityMap.set(entity.key, {
                    token: entity.token,
                    normalizedValue: entity.normalized,
                    filterType: entity.type,
                    firstSeen: new Date(entity.firstSeen),
                    occurrenceCount: entity.count,
                    shortHash: entity.key.substring(0, 8),
                });
                // Restore reverse index
                this.tokenToEntityMap.set(entity.token, entity.key);
            }
            // Restore counters
            for (const [type, count] of data.counters) {
                this.typeCounters.set(type, count);
            }
            // Optionally update salt for continued consistency
            if (sessionSalt) {
                this.salt = (0, crypto_1.createHash)("sha256").update(sessionSalt).digest();
            }
            // Audit log: mapping imported
            this.logAudit({
                timestamp: new Date(),
                action: "mapping_imported",
                metadata: { entityCount: data.entities.length, version: mapping.version },
            });
            return true;
        }
        catch (error) {
            console.error("[Consistency] Import failed:", error);
            return false;
        }
    }
    /**
     * Clear all tracked entities
     */
    clear() {
        this.entityMap.clear();
        this.typeCounters.clear();
        this.tokenToEntityMap.clear();
        // Don't clear audit log - it's persistent for compliance
    }
    /**
     * Reset with new salt (starts fresh session)
     */
    reset(newSalt) {
        this.clear();
        this.collisionStats = { detected: 0, resolved: 0 };
        if (newSalt) {
            this.salt = (0, crypto_1.createHash)("sha256").update(newSalt).digest();
        }
        else {
            this.salt = (0, crypto_1.randomBytes)(32);
        }
    }
    /**
     * Normalize a value according to its PHI type
     */
    normalize(value, filterType) {
        const normalizer = NORMALIZATION_RULES[filterType] || defaultNormalization;
        const normalized = normalizer(value);
        if (this.config.strictNormalization) {
            // Additional strict normalization
            return normalized
                .replace(/[^\w\s@.-]/g, "") // Remove special chars except common ones
                .replace(/\s+/g, " ")
                .trim();
        }
        return normalized;
    }
    /**
     * Create lookup key from normalized value and type
     */
    createKey(normalizedValue, filterType) {
        // Use HMAC for deterministic but non-reversible key
        return (0, crypto_1.createHmac)("sha256", this.salt)
            .update(`${filterType}:${normalizedValue}`)
            .digest("hex");
    }
    /**
     * Generate deterministic token for an entity
     *
     * AUDIT (2025-12-19): Updated to support attempt parameter for collision resolution
     */
    generateToken(normalizedValue, filterType, attempt = 0) {
        // Get or initialize counter for this type
        const counter = this.getNextCounter(filterType);
        // Generate short hash for uniqueness
        // Include attempt in hash for collision resolution
        const hashInput = attempt > 0
            ? `${filterType}:${normalizedValue}:${counter}:attempt${attempt}`
            : `${filterType}:${normalizedValue}:${counter}`;
        const hash = (0, crypto_1.createHmac)("sha256", this.salt)
            .update(hashInput)
            .digest("hex")
            .substring(0, 8)
            .toUpperCase();
        // Format token using template
        return this.config.tokenFormat
            .replace("{TYPE}", filterType.toUpperCase())
            .replace("{COUNTER}", counter.toString())
            .replace("{HASH}", hash);
    }
    /**
     * Get next counter for a PHI type
     */
    getNextCounter(filterType) {
        const current = this.typeCounters.get(filterType) || 0;
        const next = current + 1;
        this.typeCounters.set(filterType, next);
        return next;
    }
    /**
     * Evict oldest entity when at capacity
     *
     * AUDIT (2025-12-19): Updated to return evicted entity for audit logging
     */
    evictOldest() {
        let oldest = null;
        for (const [key, entity] of this.entityMap) {
            if (!oldest || entity.firstSeen < oldest.date) {
                oldest = { key, date: entity.firstSeen };
            }
        }
        if (oldest) {
            const evicted = this.entityMap.get(oldest.key);
            this.entityMap.delete(oldest.key);
            // Clean up reverse index
            if (evicted) {
                this.tokenToEntityMap.delete(evicted.token);
            }
            return evicted || null;
        }
        return null;
    }
    /**
     * Generate token with collision detection
     *
     * AUDIT (2025-12-19): Added per tokenization best practices
     * Ensures generated tokens are unique across all entities
     */
    generateTokenWithCollisionCheck(normalizedValue, filterType, entityKey) {
        let attempt = 0;
        const maxAttempts = 10;
        while (attempt < maxAttempts) {
            // Generate token (with attempt suffix for collision resolution)
            const token = this.generateToken(normalizedValue, filterType, attempt);
            if (!this.config.enableCollisionDetection) {
                return token;
            }
            // Check for collision
            const existingKey = this.tokenToEntityMap.get(token);
            if (!existingKey || existingKey === entityKey) {
                // No collision or same entity
                return token;
            }
            // Collision detected!
            this.collisionStats.detected++;
            this.logAudit({
                timestamp: new Date(),
                action: "collision_detected",
                filterType,
                tokenHash: this.hashForAudit(token),
                metadata: { attempt, existingEntityHash: existingKey.substring(0, 8) },
            });
            attempt++;
        }
        // If we exhausted attempts, add a random suffix
        this.collisionStats.resolved++;
        const fallbackToken = this.generateToken(normalizedValue, filterType, 0) +
            "-" + (0, crypto_1.randomBytes)(4).toString("hex").toUpperCase();
        return fallbackToken;
    }
    /**
     * Log audit entry
     */
    logAudit(entry) {
        if (!this.config.enableAuditLog) {
            return;
        }
        if (this.config.auditLogHandler) {
            this.config.auditLogHandler.log(entry);
        }
        else {
            // Buffer audit entries
            this.auditLogBuffer.push(entry);
            // Limit buffer size
            if (this.auditLogBuffer.length > 10000) {
                this.auditLogBuffer.shift();
            }
        }
    }
    /**
     * Hash token for audit logging (don't log actual tokens)
     */
    hashForAudit(token) {
        return (0, crypto_1.createHash)("sha256").update(token).digest("hex").substring(0, 16);
    }
    /**
     * Get audit log entries (if buffered)
     */
    getAuditLog() {
        return [...this.auditLogBuffer];
    }
    /**
     * Clear audit log buffer
     */
    clearAuditLog() {
        this.auditLogBuffer = [];
    }
    /**
     * Get collision statistics
     */
    getCollisionStats() {
        return { ...this.collisionStats };
    }
    /**
     * Get the current session salt hash (for verification, not the actual salt)
     */
    getSaltHash() {
        return (0, crypto_1.createHash)("sha256").update(this.salt).digest("hex").substring(0, 16);
    }
    /**
     * Check if manager is initialized
     */
    isInitialized() {
        return this.initialized;
    }
}
exports.ReferentialConsistencyManager = ReferentialConsistencyManager;
/**
 * Global consistency manager instance
 */
let globalManager = null;
/**
 * Get global consistency manager
 */
function getConsistencyManager() {
    if (!globalManager) {
        globalManager = new ReferentialConsistencyManager();
    }
    return globalManager;
}
/**
 * Initialize global consistency manager with config
 */
function initializeConsistencyManager(config) {
    globalManager = new ReferentialConsistencyManager(config);
    return globalManager;
}
/**
 * Reset global consistency manager
 */
function resetConsistencyManager(newSalt) {
    if (globalManager) {
        globalManager.reset(newSalt);
    }
    else {
        globalManager = new ReferentialConsistencyManager({ salt: newSalt });
    }
}
//# sourceMappingURL=ReferentialConsistencyManager.js.map