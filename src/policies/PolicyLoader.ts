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

import * as fs from "fs";
import * as path from "path";

/**
 * Policy Loader - loads and caches redaction policies
 */
export class PolicyLoader {
    private static policyCache: Map<string, any> = new Map();

    /**
     * Load redaction policy from JSON file
     * Caches parsed policies to avoid re-reading on every request
     */
    static async loadPolicy(policyName: string): Promise<any> {
        // Check cache first
        if (this.policyCache.has(policyName)) {
            return this.policyCache.get(policyName);
        }

        const policyPath = path.join(process.cwd(), "redaction", "policies", `${policyName}.json`);

        if (!fs.existsSync(policyPath)) {
            throw new Error(`Policy not found: ${policyPath}`);
        }

        const content = fs.readFileSync(policyPath, "utf-8");
        const policy = JSON.parse(content);

        // Cache for future requests
        this.policyCache.set(policyName, policy);

        return policy;
    }

    /**
     * Clear policy cache (useful for hot-reloading)
     */
    static clearCache(): void {
        this.policyCache.clear();
    }

    /**
     * Remove specific policy from cache
     */
    static invalidatePolicy(policyName: string): void {
        this.policyCache.delete(policyName);
    }

    /**
     * Get all cached policy names
     */
    static getCachedPolicies(): string[] {
        return Array.from(this.policyCache.keys());
    }
}
