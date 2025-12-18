"use strict";
/**
 * Policy Loader
 *
 * Loads and caches redaction policies:
 * - JSON policy file loading
 * - Policy caching for performance
 * - Policy validation
 *
 * @module redaction/policies
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
exports.PolicyLoader = exports.PolicyLoadError = exports.PolicyValidationError = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const RadiologyLogger_1 = require("../utils/RadiologyLogger");
/**
 * Policy validation error - thrown when policy structure is invalid
 */
class PolicyValidationError extends Error {
    policyName;
    constructor(message, policyName) {
        super(message);
        this.policyName = policyName;
        this.name = "PolicyValidationError";
    }
}
exports.PolicyValidationError = PolicyValidationError;
/**
 * Policy load error - thrown when policy file cannot be read or parsed
 */
class PolicyLoadError extends Error {
    policyPath;
    cause;
    constructor(message, policyPath, cause) {
        super(message);
        this.policyPath = policyPath;
        this.cause = cause;
        this.name = "PolicyLoadError";
    }
}
exports.PolicyLoadError = PolicyLoadError;
/**
 * Policy Loader - loads and caches redaction policies
 */
class PolicyLoader {
    static policyCache = new Map();
    /**
     * Load redaction policy from JSON file
     * Caches parsed policies to avoid re-reading on every request
     *
     * @throws {PolicyLoadError} If policy file cannot be read or parsed
     * @throws {PolicyValidationError} If policy structure is invalid
     */
    static async loadPolicy(policyName) {
        // Validate policy name
        if (!policyName || typeof policyName !== "string") {
            throw new PolicyValidationError("Policy name must be a non-empty string", policyName || "");
        }
        // Sanitize policy name to prevent path traversal
        const sanitizedName = policyName.replace(/[^a-zA-Z0-9_-]/g, "");
        if (sanitizedName !== policyName) {
            throw new PolicyValidationError(`Invalid policy name "${policyName}". Policy names may only contain alphanumeric characters, hyphens, and underscores.`, policyName);
        }
        // Check cache first
        if (this.policyCache.has(policyName)) {
            return this.policyCache.get(policyName);
        }
        const policyPath = path.join(process.cwd(), "redaction", "policies", `${policyName}.json`);
        // Check if file exists
        if (!fs.existsSync(policyPath)) {
            RadiologyLogger_1.RadiologyLogger.error("POLICY", `Policy file not found: ${policyPath}`);
            throw new PolicyLoadError(`Policy file not found: ${policyName}`, policyPath);
        }
        let content;
        try {
            content = fs.readFileSync(policyPath, "utf-8");
        }
        catch (error) {
            const message = `Failed to read policy file: ${error instanceof Error ? error.message : String(error)}`;
            RadiologyLogger_1.RadiologyLogger.error("POLICY", message);
            throw new PolicyLoadError(message, policyPath, error instanceof Error ? error : undefined);
        }
        let policy;
        try {
            policy = JSON.parse(content);
        }
        catch (error) {
            const message = `Invalid JSON in policy file "${policyName}": ${error instanceof Error ? error.message : String(error)}`;
            RadiologyLogger_1.RadiologyLogger.error("POLICY", message);
            throw new PolicyLoadError(message, policyPath, error instanceof Error ? error : undefined);
        }
        // Validate policy structure
        this.validatePolicy(policy, policyName);
        // Cache for future requests
        this.policyCache.set(policyName, policy);
        RadiologyLogger_1.RadiologyLogger.info("POLICY", `Loaded and cached policy: ${policyName}`);
        return policy;
    }
    /**
     * Validate policy structure
     *
     * @throws {PolicyValidationError} If policy structure is invalid
     */
    static validatePolicy(policy, policyName) {
        if (!policy || typeof policy !== "object") {
            throw new PolicyValidationError(`Policy must be a JSON object, got ${typeof policy}`, policyName);
        }
        if (!policy.identifiers) {
            throw new PolicyValidationError("Policy must have an 'identifiers' field", policyName);
        }
        if (typeof policy.identifiers !== "object" ||
            Array.isArray(policy.identifiers)) {
            throw new PolicyValidationError("Policy 'identifiers' must be an object mapping filter types to configurations", policyName);
        }
        // Validate each identifier configuration
        for (const [filterType, config] of Object.entries(policy.identifiers)) {
            if (config !== null && typeof config !== "object") {
                throw new PolicyValidationError(`Identifier configuration for '${filterType}' must be an object or null`, policyName);
            }
        }
    }
    /**
     * Clear policy cache (useful for hot-reloading)
     */
    static clearCache() {
        this.policyCache.clear();
    }
    /**
     * Remove specific policy from cache
     */
    static invalidatePolicy(policyName) {
        this.policyCache.delete(policyName);
    }
    /**
     * Get all cached policy names
     */
    static getCachedPolicies() {
        return Array.from(this.policyCache.keys());
    }
}
exports.PolicyLoader = PolicyLoader;
//# sourceMappingURL=PolicyLoader.js.map