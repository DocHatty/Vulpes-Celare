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
/**
 * Policy validation error - thrown when policy structure is invalid
 */
export declare class PolicyValidationError extends Error {
    readonly policyName: string;
    constructor(message: string, policyName: string);
}
/**
 * Policy load error - thrown when policy file cannot be read or parsed
 */
export declare class PolicyLoadError extends Error {
    readonly policyPath: string;
    readonly cause?: Error | undefined;
    constructor(message: string, policyPath: string, cause?: Error | undefined);
}
/**
 * Policy Loader - loads and caches redaction policies
 */
export declare class PolicyLoader {
    private static policyCache;
    /**
     * Load redaction policy from JSON file
     * Caches parsed policies to avoid re-reading on every request
     *
     * @throws {PolicyLoadError} If policy file cannot be read or parsed
     * @throws {PolicyValidationError} If policy structure is invalid
     */
    static loadPolicy(policyName: string): Promise<any>;
    /**
     * Validate policy structure
     *
     * @throws {PolicyValidationError} If policy structure is invalid
     */
    private static validatePolicy;
    /**
     * Clear policy cache (useful for hot-reloading)
     */
    static clearCache(): void;
    /**
     * Remove specific policy from cache
     */
    static invalidatePolicy(policyName: string): void;
    /**
     * Get all cached policy names
     */
    static getCachedPolicies(): string[];
}
//# sourceMappingURL=PolicyLoader.d.ts.map