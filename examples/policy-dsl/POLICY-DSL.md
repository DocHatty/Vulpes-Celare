# Policy DSL - Declarative Redaction Rules

**Simplified policy creation for non-developers**

The Policy DSL provides a human-readable, declarative language for defining PHI redaction policies. No JSON required.

## Table of Contents

- [Quick Start](#quick-start)
- [Syntax Reference](#syntax-reference)
- [Policy Inheritance](#policy-inheritance)
- [Conditional Rules](#conditional-rules)
- [Complete Examples](#complete-examples)
- [Migration from JSON](#migration-from-json)

---

## Quick Start

### Basic Policy

```typescript
import { PolicyCompiler } from 'vulpes-celare';

const dsl = `
policy HIPAA_STRICT {
  description "Full HIPAA Safe Harbor compliance"

  redact names
  redact dates
  redact addresses
  redact ssn
  redact phones

  threshold 0.5
}
`;

// Compile to JSON
const policy = PolicyCompiler.compile(dsl);

// Use with VulpesCelare
import { VulpesCelare } from 'vulpes-celare';
const engine = new VulpesCelare();
const result = await engine.processWithPolicy(text, policy);
```

### Using Templates

```typescript
import { PolicyTemplates, PolicyCompiler } from 'vulpes-celare';

// Use pre-defined template
const policy = PolicyCompiler.compile(PolicyTemplates.HIPAA_STRICT);

// Or customize a template
const customPolicy = `
policy MY_POLICY extends HIPAA_STRICT {
  keep dates
  keep ages where age < 90
}
`;

const compiled = PolicyCompiler.compile(customPolicy);
```

---

## Syntax Reference

### Policy Declaration

```
policy POLICY_NAME {
  // rules here
}
```

**With Description:**
```
policy RADIOLOGY {
  description "Radiology department workflow policy"

  redact names
  redact ssn
}
```

**With Inheritance:**
```
policy RESEARCH extends HIPAA_STRICT {
  keep dates
  keep locations
}
```

### Redaction Rules

**Redact (remove PHI):**
```
redact names
redact ssn
redact dates
redact phones
redact emails
redact addresses
```

**Keep (preserve data):**
```
keep dates
keep ages
keep organizations
keep locations
```

### Supported Identifiers

| Identifier | Description | HIPAA Category |
|------------|-------------|----------------|
| `names` | Personal names | Direct identifier |
| `dates` | All date formats | Direct identifier |
| `phones` | Phone numbers | Direct identifier |
| `fax` | Fax numbers | Direct identifier |
| `emails` | Email addresses | Direct identifier |
| `ssn` | Social Security Numbers | Direct identifier |
| `mrn` | Medical Record Numbers | Direct identifier |
| `health_plan` | Health plan numbers | Direct identifier |
| `accounts` | Account numbers | Direct identifier |
| `license` | License/certificate numbers | Direct identifier |
| `vehicle` | Vehicle identifiers | Direct identifier |
| `device` | Device identifiers | Direct identifier |
| `urls` | Web URLs | Direct identifier |
| `ip` | IP addresses | Direct identifier |
| `biometric` | Biometric identifiers | Direct identifier |
| `unique_id` | Other unique IDs | Direct identifier |
| `addresses` | Geographic locations | Direct identifier |
| `ages` | Ages (especially >89) | HIPAA special case |
| `zip` | ZIP codes | Geographic identifier |
| `locations` | Geographic context | Geographic identifier |
| `organizations` | Hospital/org names | Not PHI per HIPAA |
| `professions` | Provider roles | Not PHI per HIPAA |

### Thresholds

```
policy MY_POLICY {
  redact names

  threshold 0.5  // 0.0 = permissive, 1.0 = strict
}
```

---

## Policy Inheritance

**Extend existing policies to avoid repetition:**

```typescript
// Base policy
policy HIPAA_STRICT {
  description "Full HIPAA compliance"

  redact names
  redact dates
  redact addresses
  redact ssn
  redact phones
  redact emails
  redact mrn

  threshold 0.5
}

// Research policy extends base
policy RESEARCH_RELAXED extends HIPAA_STRICT {
  description "IRB-approved research with temporal context"

  // Override: keep dates for temporal analysis
  keep dates
  keep ages
  keep locations

  // Lower threshold for research
  threshold 0.4
}
```

**Compilation automatically merges rules from parent policies.**

---

## Conditional Rules

**Apply rules based on context (future feature):**

```typescript
policy RADIOLOGY {
  // Redact patient names, but keep referring physician names
  redact names where context != "referring_physician"

  // Keep internal MRNs, redact external ones
  keep mrn where context == "internal"
  redact mrn where context == "external"

  // Keep department phones, redact patient phones
  keep phones where type == "department"
  redact phones where type == "patient"
}
```

**Note:** Conditional evaluation requires runtime context. See [Advanced Usage](#advanced-usage) for implementation.

---

## Complete Examples

### 1. HIPAA Safe Harbor (Strict)

```typescript
const hipaa = `
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
  redact unique_id
  redact ages where age > 89

  threshold 0.5
}
`;

const policy = PolicyCompiler.compile(hipaa);
```

### 2. Research (Limited Dataset)

```typescript
const research = `
policy RESEARCH_RELAXED extends HIPAA_STRICT {
  description "IRB-approved research - preserves temporal and geographic context"

  // Redact direct identifiers
  redact names
  redact ssn
  redact mrn
  redact phones
  redact emails
  redact addresses

  // Keep for research analysis
  keep dates
  keep ages
  keep locations
  keep organizations

  threshold 0.4
}
`;

const policy = PolicyCompiler.compile(research);
```

### 3. Radiology Department

```typescript
const radiology = `
policy RADIOLOGY_DEPT {
  description "Radiology workflow - preserves study identifiers"

  // Redact patient identifiers
  redact names
  redact ssn
  redact phones
  redact emails
  redact addresses

  // Keep for internal workflow
  keep mrn
  keep dates
  keep ages
  keep organizations

  threshold 0.6
}
`;

const policy = PolicyCompiler.compile(radiology);
```

### 4. Medical Education

```typescript
const training = `
policy TRAINING {
  description "Medical education and training cases"

  // Remove all direct identifiers
  redact names
  redact ssn
  redact mrn
  redact phones
  redact emails
  redact addresses

  // Keep clinical context
  keep dates
  keep ages where age < 90
  keep organizations
  keep professions

  threshold 0.5
}
`;

const policy = PolicyCompiler.compile(training);
```

### 5. Air-Gapped Fortress

```typescript
const fortress = `
policy TRAUMA_FORTRESS {
  description "Maximum security for trauma centers and DoD facilities"

  // Redact EVERYTHING
  redact names
  redact dates
  redact addresses
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
  redact unique_id
  redact ages
  redact locations
  redact organizations

  threshold 0.7
}
`;

const policy = PolicyCompiler.compile(fortress);
```

---

## Migration from JSON

**Before (JSON):**
```json
{
  "name": "research-relaxed",
  "filters": {
    "names": { "enabled": true },
    "dates": { "enabled": false, "comment": "Preserved" },
    "ssn": { "enabled": true },
    "mrn": { "enabled": true },
    "ages": { "enabled": false, "comment": "Preserved" }
  },
  "globalThreshold": 0.4
}
```

**After (DSL):**
```typescript
policy RESEARCH_RELAXED {
  description "IRB-approved research"

  redact names
  redact ssn
  redact mrn

  keep dates
  keep ages

  threshold 0.4
}
```

**Migration is automatic:**
```typescript
import { PolicyCompiler } from 'vulpes-celare';

// Compile DSL to JSON
const compiled = PolicyCompiler.compile(dslString);

// Use anywhere JSON policies are accepted
const engine = new VulpesCelare();
await engine.processWithPolicy(text, compiled);
```

---

## Validation

**Compile-time validation:**

```typescript
import { PolicyCompiler } from 'vulpes-celare';

try {
  const policy = PolicyCompiler.compile(dsl);

  // Validate compiled policy
  const validation = PolicyCompiler.validate(policy);

  if (!validation.valid) {
    console.error('Policy errors:', validation.errors);
  } else {
    console.log('Policy is valid!');
  }
} catch (error) {
  console.error('Compilation failed:', error.message);
}
```

**Common errors:**
- Invalid identifier names
- Missing policy declaration
- Unbalanced braces
- Invalid threshold values

---

## CLI Tool

**Compile DSL policies from command line:**

```bash
# Compile DSL to JSON
npx vulpes-celare compile-policy policy.dsl > policy.json

# Validate policy
npx vulpes-celare validate-policy policy.dsl

# Use template
npx vulpes-celare generate-policy --template HIPAA_STRICT > hipaa.dsl
```

---

## Advanced Usage

### Runtime Policy Generation

```typescript
function generatePolicyForDepartment(dept: string): string {
  if (dept === 'radiology') {
    return `
      policy ${dept.toUpperCase()} {
        description "Auto-generated for ${dept}"
        redact names
        keep mrn
        keep dates
        threshold 0.6
      }
    `;
  }

  // Default policy
  return PolicyTemplates.HIPAA_STRICT;
}

const policy = PolicyCompiler.compile(generatePolicyForDepartment('radiology'));
```

### Policy Composition

```typescript
const base = PolicyTemplates.HIPAA_STRICT;
const custom = `
policy CUSTOM extends HIPAA_STRICT {
  keep dates
  keep ages where age < 90
}
`;

const policy = PolicyCompiler.compile(custom);
```

### Integration with VulpesCelare

```typescript
import { VulpesCelare, PolicyCompiler, PolicyTemplates } from 'vulpes-celare';

// Method 1: Use template
const policy1 = PolicyCompiler.compile(PolicyTemplates.RESEARCH_RELAXED);

// Method 2: Custom DSL
const policy2 = PolicyCompiler.compile(`
  policy MY_POLICY {
    redact names
    redact ssn
    keep dates
  }
`);

// Method 3: Load from file
import { readFileSync } from 'fs';
const dsl = readFileSync('./policies/my-policy.dsl', 'utf-8');
const policy3 = PolicyCompiler.compile(dsl);

// Use with engine
const engine = new VulpesCelare();
const result = await engine.processWithPolicy(clinicalText, policy1);
```

---

## File Format

**Save policies as `.dsl` files:**

```
policies/
├── hipaa-strict.dsl
├── research.dsl
├── radiology.dsl
└── training.dsl
```

**Example `research.dsl`:**
```
policy RESEARCH {
  description "IRB-approved research protocol"

  redact names
  redact ssn
  keep dates
  keep ages

  threshold 0.4
}
```

**Load and use:**
```typescript
import { readFileSync } from 'fs';
import { PolicyCompiler } from 'vulpes-celare';

const dsl = readFileSync('./policies/research.dsl', 'utf-8');
const policy = PolicyCompiler.compile(dsl);
```

---

## Best Practices

### 1. Use Inheritance

```typescript
// ✅ Good: DRY with inheritance
policy BASE {
  redact names
  redact ssn
  redact mrn
}

policy RESEARCH extends BASE {
  keep dates
  keep ages
}

// ❌ Bad: Repetitive
policy RESEARCH {
  redact names
  redact ssn
  redact mrn
  keep dates
  keep ages
}
```

### 2. Document Your Policies

```typescript
// ✅ Good: Clear description
policy RADIOLOGY {
  description "Radiology dept workflow - preserves internal IDs for PACS integration"

  redact names
  keep mrn
}

// ❌ Bad: No context
policy RADIOLOGY {
  redact names
  keep mrn
}
```

### 3. Use Appropriate Thresholds

```typescript
// Research: Lower threshold (0.3-0.4)
policy RESEARCH {
  threshold 0.4
}

// Clinical production: Medium threshold (0.5-0.6)
policy CLINICAL {
  threshold 0.5
}

// Maximum security: High threshold (0.7+)
policy FORTRESS {
  threshold 0.7
}
```

---

## Support

For questions or issues:
- 📖 [Main Documentation](../../README.md)
- 💬 [Discussions](https://github.com/DocHatty/Vulpes-Celare/discussions)
- 🐛 [Report Issues](https://github.com/DocHatty/Vulpes-Celare/issues)

---

**Policies made simple. Compliance made easy. 🦊**
