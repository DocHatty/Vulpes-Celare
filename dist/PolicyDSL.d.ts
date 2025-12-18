/**
 * VULPES CELARE - POLICY DSL (Domain-Specific Language)
 *
 * Declarative policy language for PHI redaction rules.
 * Simplifies policy creation for non-developers while maintaining full power.
 *
 * Features:
 * - Human-readable syntax
 * - Policy inheritance (extends)
 * - Conditional rules (where clauses)
 * - Type-safe compilation to JSON
 * - Validation and error reporting
 *
 * @module PolicyDSL
 *
 * @example
 * ```
 * policy RESEARCH_RELAXED {
 *   description "IRB-approved research with temporal analysis"
 *
 *   redact names
 *   redact ssn
 *   redact mrn
 *
 *   keep dates
 *   keep ages
 *   keep locations
 * }
 * ```
 */
export interface PolicyRule {
    type: 'redact' | 'keep';
    identifier: string;
    condition?: string;
}
export interface PolicyDefinition {
    name: string;
    description?: string;
    extends?: string;
    rules: PolicyRule[];
    metadata?: Record<string, any>;
}
export interface CompiledPolicy {
    name: string;
    description?: string;
    filters: Record<string, any>;
    globalThreshold?: number;
    compliance?: any;
}
/**
 * PolicyDSL Compiler
 * Compiles declarative policy language to JSON configuration
 */
export declare class PolicyCompiler {
    private static readonly VALID_IDENTIFIERS;
    /**
     * Compile DSL policy string to JSON configuration
     *
     * @param dsl - Policy DSL string
     * @returns Compiled JSON policy
     *
     * @example
     * ```typescript
     * const policy = PolicyCompiler.compile(`
     *   policy HIPAA_STRICT {
     *     description "Full HIPAA Safe Harbor compliance"
     *     redact names
     *     redact dates
     *     redact addresses
     *     redact all_ages_over 89
     *   }
     * `);
     * ```
     */
    static compile(dsl: string): CompiledPolicy;
    /**
     * Parse DSL string into PolicyDefinition
     */
    private static parse;
    /**
     * Parse individual rule line
     */
    private static parseRule;
    /**
     * Normalize identifier to standard form
     */
    private static normalizeIdentifier;
    /**
     * Transform PolicyDefinition to compiled JSON
     */
    private static transform;
    /**
     * Map identifier to filter name
     */
    private static getFilterName;
    /**
     * Validate compiled policy
     */
    static validate(policy: CompiledPolicy): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Pretty-print compiled policy as JSON
     */
    static toJSON(policy: CompiledPolicy, indent?: number): string;
}
/**
 * Policy DSL Templates
 * Pre-defined policy templates in DSL format
 */
export declare class PolicyTemplates {
    static readonly HIPAA_STRICT: string;
    static readonly RESEARCH_RELAXED: string;
    static readonly RADIOLOGY_DEPT: string;
    static readonly TRAINING: string;
}
//# sourceMappingURL=PolicyDSL.d.ts.map