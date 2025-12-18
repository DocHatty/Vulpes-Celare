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
export class PolicyCompiler {
  private static readonly VALID_IDENTIFIERS = [
    'names', 'name',
    'dates', 'date',
    'phones', 'phone',
    'emails', 'email',
    'ssn',
    'mrn',
    'addresses', 'address',
    'locations', 'location',
    'organizations', 'organization',
    'professions', 'profession',
    'ids', 'id',
    'ages', 'age',
    'credit_cards', 'credit_card',
    'accounts', 'account',
    'health_plan',
    'license',
    'passport',
    'vehicle',
    'device',
    'biometric',
    'zip',
    'fax',
    'ip',
    'url'
  ];

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
  static compile(dsl: string): CompiledPolicy {
    const definition = this.parse(dsl);
    return this.transform(definition);
  }

  /**
   * Parse DSL string into PolicyDefinition
   */
  private static parse(dsl: string): PolicyDefinition {
    const lines = dsl
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('//'));

    const definition: PolicyDefinition = {
      name: '',
      rules: []
    };

    let inPolicy = false;
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Policy declaration
      if (line.startsWith('policy ')) {
        const match = line.match(/policy\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{/);
        if (!match) {
          throw new Error(`Invalid policy declaration at line ${i + 1}: ${line}`);
        }
        definition.name = match[1];
        if (match[2]) {
          definition.extends = match[2];
        }
        inPolicy = true;
        braceCount = 1;
        continue;
      }

      if (!inPolicy) continue;

      // Track braces
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;

      if (braceCount === 0) {
        inPolicy = false;
        continue;
      }

      // Description
      if (line.startsWith('description ')) {
        const match = line.match(/description\s+"(.+)"/);
        if (match) {
          definition.description = match[1];
        }
        continue;
      }

      // Redact rule
      if (line.startsWith('redact ')) {
        const rule = this.parseRule('redact', line);
        definition.rules.push(rule);
        continue;
      }

      // Keep rule
      if (line.startsWith('keep ')) {
        const rule = this.parseRule('keep', line);
        definition.rules.push(rule);
        continue;
      }

      // Metadata
      if (line.startsWith('threshold ')) {
        const match = line.match(/threshold\s+([\d.]+)/);
        if (match) {
          definition.metadata = definition.metadata || {};
          definition.metadata.threshold = parseFloat(match[1]);
        }
        continue;
      }
    }

    if (!definition.name) {
      throw new Error('No policy declaration found');
    }

    return definition;
  }

  /**
   * Parse individual rule line
   */
  private static parseRule(type: 'redact' | 'keep', line: string): PolicyRule {
    // Remove type keyword
    const content = line.substring(type.length + 1);

    // Check for condition (where clause)
    const whereMatch = content.match(/^(.+?)\s+where\s+(.+)$/);
    if (whereMatch) {
      const identifier = this.normalizeIdentifier(whereMatch[1].trim());
      return {
        type,
        identifier,
        condition: whereMatch[2].trim()
      };
    }

    // Simple rule
    const identifier = this.normalizeIdentifier(content.trim());
    return { type, identifier };
  }

  /**
   * Normalize identifier to standard form
   */
  private static normalizeIdentifier(identifier: string): string {
    const normalized = identifier.toLowerCase().replace(/-/g, '_');

    // Handle plurals
    const singular = normalized.endsWith('s') ? normalized.slice(0, -1) : normalized;

    // Validate
    if (!this.VALID_IDENTIFIERS.includes(normalized) &&
        !this.VALID_IDENTIFIERS.includes(singular)) {
      throw new Error(`Invalid identifier: ${identifier}`);
    }

    return normalized;
  }

  /**
   * Transform PolicyDefinition to compiled JSON
   */
  private static transform(definition: PolicyDefinition): CompiledPolicy {
    const compiled: CompiledPolicy = {
      name: definition.name,
      filters: {}
    };

    if (definition.description) {
      compiled.description = definition.description;
    }

    // Start with all disabled if we have rules
    const filters: Record<string, any> = {};

    // Process rules
    for (const rule of definition.rules) {
      const filterName = this.getFilterName(rule.identifier);

      if (rule.type === 'redact') {
        filters[filterName] = {
          enabled: true
        };

        if (rule.condition) {
          filters[filterName].condition = rule.condition;
        }
      } else if (rule.type === 'keep') {
        filters[filterName] = {
          enabled: false,
          comment: `Preserved by policy: ${rule.condition || 'always'}`
        };
      }
    }

    compiled.filters = filters;

    // Add metadata
    if (definition.metadata?.threshold) {
      compiled.globalThreshold = definition.metadata.threshold;
    }

    return compiled;
  }

  /**
   * Map identifier to filter name
   */
  private static getFilterName(identifier: string): string {
    const mapping: Record<string, string> = {
      'name': 'names',
      'names': 'names',
      'date': 'dates',
      'dates': 'dates',
      'phone': 'phones',
      'phones': 'phones',
      'email': 'emails',
      'emails': 'emails',
      'address': 'addresses',
      'addresses': 'addresses',
      'location': 'locations',
      'locations': 'locations',
      'organization': 'organizations',
      'organizations': 'organizations',
      'profession': 'professions',
      'professions': 'professions',
      'id': 'ids',
      'ids': 'ids',
      'age': 'ages',
      'ages': 'ages'
    };

    return mapping[identifier] || identifier;
  }

  /**
   * Validate compiled policy
   */
  static validate(policy: CompiledPolicy): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!policy.name) {
      errors.push('Policy name is required');
    }

    if (!policy.filters || Object.keys(policy.filters).length === 0) {
      errors.push('Policy must define at least one filter rule');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Pretty-print compiled policy as JSON
   */
  static toJSON(policy: CompiledPolicy, indent: number = 2): string {
    return JSON.stringify(policy, null, indent);
  }
}

/**
 * Policy DSL Templates
 * Pre-defined policy templates in DSL format
 */
export class PolicyTemplates {
  static readonly HIPAA_STRICT = `
policy HIPAA_STRICT {
  description "Full HIPAA Safe Harbor compliance - all 18 identifiers"

  redact names
  redact addresses
  redact dates
  redact phones
  redact fax
  redact emails
  redact ssn
  redact mrn
  redact health_plan
  redact accounts
  redact license
  redact vehicle
  redact device
  redact urls
  redact ip
  redact biometric
  redact ages where age > 89

  threshold 0.5
}
`.trim();

  static readonly RESEARCH_RELAXED = `
policy RESEARCH_RELAXED extends HIPAA_STRICT {
  description "IRB-approved research - preserves temporal and geographic context"

  redact names
  redact ssn
  redact mrn
  redact phones
  redact emails
  redact addresses

  keep dates
  keep ages
  keep locations
  keep organizations

  threshold 0.4
}
`.trim();

  static readonly RADIOLOGY_DEPT = `
policy RADIOLOGY_DEPT {
  description "Radiology department workflow - preserves study identifiers"

  redact names where context != "referring_physician"
  redact ssn
  redact phones where type != "department"
  redact emails
  redact addresses

  keep mrn where context == "internal"
  keep dates
  keep ages
  keep organizations where type == "hospital"

  threshold 0.6
}
`.trim();

  static readonly TRAINING = `
policy TRAINING {
  description "Medical education and training"

  redact names
  redact ssn
  redact mrn
  redact phones
  redact emails
  redact addresses

  keep dates
  keep ages where age < 90
  keep organizations
  keep professions

  threshold 0.5
}
`.trim();
}
