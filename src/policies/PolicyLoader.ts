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
import { RadiologyLogger } from "../utils/RadiologyLogger";

/**
 * Policy validation error - thrown when policy structure is invalid
 */
export class PolicyValidationError extends Error {
  constructor(
    message: string,
    public readonly policyName: string,
  ) {
    super(message);
    this.name = "PolicyValidationError";
  }
}

/**
 * Policy load error - thrown when policy file cannot be read or parsed
 */
export class PolicyLoadError extends Error {
  constructor(
    message: string,
    public readonly policyPath: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "PolicyLoadError";
  }
}

/**
 * Policy Loader - loads and caches redaction policies
 */
export class PolicyLoader {
  private static policyCache: Map<string, any> = new Map();

  /**
   * Load redaction policy from JSON file
   * Caches parsed policies to avoid re-reading on every request
   *
   * @throws {PolicyLoadError} If policy file cannot be read or parsed
   * @throws {PolicyValidationError} If policy structure is invalid
   */
  static async loadPolicy(policyName: string): Promise<any> {
    // Validate policy name
    if (!policyName || typeof policyName !== "string") {
      throw new PolicyValidationError(
        "Policy name must be a non-empty string",
        policyName || "",
      );
    }

    // Sanitize policy name to prevent path traversal
    const sanitizedName = policyName.replace(/[^a-zA-Z0-9_-]/g, "");
    if (sanitizedName !== policyName) {
      throw new PolicyValidationError(
        `Invalid policy name "${policyName}". Policy names may only contain alphanumeric characters, hyphens, and underscores.`,
        policyName,
      );
    }

    // Check cache first
    if (this.policyCache.has(policyName)) {
      return this.policyCache.get(policyName);
    }

    const policyPath = path.join(
      process.cwd(),
      "redaction",
      "policies",
      `${policyName}.json`,
    );

    // Check if file exists
    if (!fs.existsSync(policyPath)) {
      RadiologyLogger.error("POLICY", `Policy file not found: ${policyPath}`);
      throw new PolicyLoadError(
        `Policy file not found: ${policyName}`,
        policyPath,
      );
    }

    let content: string;
    try {
      content = fs.readFileSync(policyPath, "utf-8");
    } catch (error) {
      const message = `Failed to read policy file: ${error instanceof Error ? error.message : String(error)}`;
      RadiologyLogger.error("POLICY", message);
      throw new PolicyLoadError(
        message,
        policyPath,
        error instanceof Error ? error : undefined,
      );
    }

    let policy: any;
    try {
      policy = JSON.parse(content);
    } catch (error) {
      const message = `Invalid JSON in policy file "${policyName}": ${error instanceof Error ? error.message : String(error)}`;
      RadiologyLogger.error("POLICY", message);
      throw new PolicyLoadError(
        message,
        policyPath,
        error instanceof Error ? error : undefined,
      );
    }

    // Validate policy structure
    this.validatePolicy(policy, policyName);

    // Cache for future requests
    this.policyCache.set(policyName, policy);

    RadiologyLogger.info("POLICY", `Loaded and cached policy: ${policyName}`);

    return policy;
  }

  /**
   * Validate policy structure
   *
   * @throws {PolicyValidationError} If policy structure is invalid
   */
  private static validatePolicy(policy: any, policyName: string): void {
    if (!policy || typeof policy !== "object") {
      throw new PolicyValidationError(
        `Policy must be a JSON object, got ${typeof policy}`,
        policyName,
      );
    }

    if (!policy.identifiers) {
      throw new PolicyValidationError(
        "Policy must have an 'identifiers' field",
        policyName,
      );
    }

    if (
      typeof policy.identifiers !== "object" ||
      Array.isArray(policy.identifiers)
    ) {
      throw new PolicyValidationError(
        "Policy 'identifiers' must be an object mapping filter types to configurations",
        policyName,
      );
    }

    // Validate each identifier configuration
    for (const [filterType, config] of Object.entries(policy.identifiers)) {
      if (config !== null && typeof config !== "object") {
        throw new PolicyValidationError(
          `Identifier configuration for '${filterType}' must be an object or null`,
          policyName,
        );
      }
    }
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
