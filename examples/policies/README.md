# Custom Redaction Policies

Vulpes Celare supports **dynamic, customizable redaction policies** that allow you to tailor PHI redaction rules to your organization's specific requirements.

## Policy Structure

A redaction policy is a JSON configuration file that controls which filters are enabled and their sensitivity thresholds:

```json
{
  "name": "my-custom-policy",
  "description": "Custom policy for XYZ Hospital",
  "filters": {
    "names": { "enabled": true, "confidenceThreshold": 0.4 },
    "dates": { "enabled": true },
    "phones": { "enabled": true },
    "emails": { "enabled": true },
    "ssn": { "enabled": true },
    "mrn": { "enabled": true },
    "addresses": { "enabled": true },
    "locations": { "enabled": true },
    "organizations": { "enabled": true },
    "professions": { "enabled": true },
    "ids": { "enabled": true },
    "ages": { "enabled": true }
  },
  "globalThreshold": 0.5
}
```

## Pre-Built Policies

### 1. HIPAA Strict (Default)

**Use Case:** Production deployment, regulatory compliance, zero tolerance for PHI leakage

**File:** `maximum.json`

```json
{
  "name": "maximum",
  "description": "Maximum redaction policy for HIPAA compliance",
  "filters": {
    "names": { "enabled": true, "confidenceThreshold": 0.4 },
    "dates": { "enabled": true },
    "phones": { "enabled": true },
    "emails": { "enabled": true },
    "ssn": { "enabled": true },
    "mrn": { "enabled": true },
    "addresses": { "enabled": true },
    "locations": { "enabled": true },
    "organizations": { "enabled": true },
    "professions": { "enabled": true },
    "ids": { "enabled": true },
    "ages": { "enabled": true }
  },
  "globalThreshold": 0.5
}
```

**What it redacts:**
- ✅ All patient names
- ✅ All dates (except year if <89 years old)
- ✅ All contact information (phone, email, address)
- ✅ All identifiers (SSN, MRN, NPI, etc.)
- ✅ All ages 90+
- ✅ Geographic locations smaller than state
- ✅ Hospital/organization names when used as identifiers

### 2. Research Relaxed

**Use Case:** De-identified datasets for research, IRB-approved studies

**File:** `research-relaxed.json`

```json
{
  "name": "research-relaxed",
  "description": "Relaxed policy for research use cases",
  "filters": {
    "names": { "enabled": true, "confidenceThreshold": 0.4 },
    "dates": { "enabled": false },
    "phones": { "enabled": true },
    "emails": { "enabled": true },
    "ssn": { "enabled": true },
    "mrn": { "enabled": true },
    "addresses": { "enabled": true },
    "locations": { "enabled": false },
    "organizations": { "enabled": false },
    "professions": { "enabled": false },
    "ids": { "enabled": true },
    "ages": { "enabled": false }
  },
  "globalThreshold": 0.5
}
```

**What it preserves:**
- ✅ All dates (preserves temporal patterns)
- ✅ Ages under 90
- ✅ Hospital names
- ✅ Provider names/titles (for workflow research)
- ✅ Geographic location data

**What it redacts:**
- ✅ Patient names
- ✅ Contact information
- ✅ Direct identifiers (SSN, MRN)

### 3. Radiology Department

**Use Case:** Radiology workflow with referring physician preservation

**File:** `radiology-dept.json`

```json
{
  "name": "radiology-dept",
  "description": "Radiology department workflow policy",
  "filters": {
    "names": { "enabled": true, "confidenceThreshold": 0.4 },
    "dates": { "enabled": true },
    "phones": { "enabled": true },
    "emails": { "enabled": true },
    "ssn": { "enabled": true },
    "mrn": { "enabled": false },
    "addresses": { "enabled": true },
    "locations": { "enabled": true },
    "organizations": { "enabled": false },
    "professions": { "enabled": false },
    "ids": { "enabled": true },
    "ages": { "enabled": true }
  },
  "globalThreshold": 0.5
}
```

**Key features:**
- ✅ Keeps MRN for internal workflow tracking
- ✅ Preserves referring physician names
- ✅ Preserves hospital/department names
- ✅ Redacts patient names, contact info, SSN

### 4. Training & Education

**Use Case:** Medical education, resident training, case presentations

**File:** `training-education.json`

```json
{
  "name": "training-education",
  "description": "Policy for educational case presentations",
  "filters": {
    "names": { "enabled": true, "confidenceThreshold": 0.3 },
    "dates": { "enabled": false },
    "phones": { "enabled": true },
    "emails": { "enabled": true },
    "ssn": { "enabled": true },
    "mrn": { "enabled": true },
    "addresses": { "enabled": true },
    "locations": { "enabled": false },
    "organizations": { "enabled": false },
    "professions": { "enabled": false },
    "ids": { "enabled": true },
    "ages": { "enabled": false }
  },
  "globalThreshold": 0.4
}
```

**Optimized for:**
- ✅ Preserves clinical timeline (dates/ages)
- ✅ Preserves provider roles for learning
- ✅ Preserves hospital context
- ✅ Removes direct identifiers

### 5. Trauma Center (Air-Gapped)

**Use Case:** Secure trauma center, no outbound network, maximum security

**File:** `trauma-fortress.json`

```json
{
  "name": "trauma-fortress",
  "description": "Maximum security for air-gapped trauma centers",
  "filters": {
    "names": { "enabled": true, "confidenceThreshold": 0.3 },
    "dates": { "enabled": true },
    "phones": { "enabled": true },
    "emails": { "enabled": true },
    "ssn": { "enabled": true },
    "mrn": { "enabled": true },
    "addresses": { "enabled": true },
    "locations": { "enabled": true },
    "organizations": { "enabled": true },
    "professions": { "enabled": true },
    "ids": { "enabled": true },
    "ages": { "enabled": true }
  },
  "globalThreshold": 0.3,
  "airgapped": true,
  "localOnly": true
}
```

**Features:**
- ✅ Lower confidence threshold (more aggressive)
- ✅ Redacts everything including organization names
- ✅ No network calls
- ✅ All processing on-device

## Custom Policy Examples

### Example 1: Preserve Attending Physicians, Remove Residents

```json
{
  "name": "attending-only",
  "description": "Preserve attending physician names, redact residents",
  "filters": {
    "names": {
      "enabled": true,
      "confidenceThreshold": 0.4,
      "customRules": {
        "preserveAttending": true,
        "redactResidents": true,
        "titlePatterns": ["MD", "DO", "Attending"]
      }
    },
    "professions": { "enabled": false }
  },
  "globalThreshold": 0.5
}
```

> **Note:** This requires custom filter logic implementation. See [Custom Filter Development](../development/custom-filters.md)

### Example 2: Mask Specific ID Types

```json
{
  "name": "accession-numbers",
  "description": "Redact study accession numbers in addition to standard PHI",
  "filters": {
    "ids": {
      "enabled": true,
      "customPatterns": [
        {
          "type": "ACCESSION",
          "pattern": "ACC-\\d{8}",
          "replacement": "[ACCESSION-{counter}]"
        },
        {
          "type": "ROOM_NUMBER",
          "pattern": "Room \\d{3,4}[A-Z]?",
          "replacement": "[ROOM-{counter}]"
        }
      ]
    }
  },
  "globalThreshold": 0.5
}
```

### Example 3: Age Threshold Customization

```json
{
  "name": "age-85-threshold",
  "description": "More conservative age redaction at 85 instead of 90",
  "filters": {
    "ages": {
      "enabled": true,
      "thresholdAge": 85
    }
  },
  "globalThreshold": 0.5
}
```

## Loading Custom Policies

### TypeScript/JavaScript

```typescript
import { VulpesCelare } from 'vulpes-celare';
import * as fs from 'fs';

// Load custom policy
const customPolicy = JSON.parse(
  fs.readFileSync('./policies/my-custom-policy.json', 'utf8')
);

// Create engine with custom policy
const engine = new VulpesCelare({
  policy: customPolicy
});

// Use as normal
const result = await engine.process(clinicalNote);
```

### Environment-Based Policy Selection

```typescript
const policyName = process.env.REDACTION_POLICY || 'maximum';
const policyPath = `./redaction/policies/${policyName}.json`;
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));

const engine = new VulpesCelare({ policy });
```

### Runtime Policy Switching

```typescript
const engine = new VulpesCelare();

// Use strict policy for production
await engine.setPolicy('maximum');
const prodResult = await engine.process(productionNote);

// Switch to research policy for de-identified dataset
await engine.setPolicy('research-relaxed');
const researchResult = await engine.process(researchNote);
```

## Policy Validation

Validate your custom policy before deployment:

```typescript
import { PolicyValidator } from 'vulpes-celare';

const validator = new PolicyValidator();
const result = validator.validate(customPolicy);

if (!result.valid) {
  console.error('Policy validation failed:', result.errors);
} else {
  console.log('Policy is valid');
}
```

## Best Practices

### 1. Start Strict, Relax Gradually

Always start with the `maximum` policy and relax only specific filters based on documented requirements.

### 2. Document Policy Rationale

Include a `rationale` field in your policy explaining why certain filters are disabled:

```json
{
  "name": "my-policy",
  "rationale": "IRB protocol #2024-001 permits date preservation for temporal analysis",
  "filters": {
    "dates": { "enabled": false }
  }
}
```

### 3. Version Control Your Policies

Store policies in version control with approval workflows:

```bash
git add redaction/policies/hospital-xyz-v2.json
git commit -m "Update Hospital XYZ policy: Enable date preservation per IRB-2024-123"
```

### 4. Test Before Deployment

Run validation tests with sample data:

```typescript
import { PolicyTester } from 'vulpes-celare/testing';

const tester = new PolicyTester();
const results = await tester.test(customPolicy, sampleDataset);

console.log(`Sensitivity: ${results.sensitivity}%`);
console.log(`Specificity: ${results.specificity}%`);
console.log(`PHI Leakage: ${results.leakage.count} instances`);
```

### 5. Audit Policy Usage

Log which policy was used for each redaction:

```typescript
const result = await engine.process(note);
console.log(`Redacted using policy: ${result.policyUsed}`);
```

## Regulatory Considerations

### HIPAA Safe Harbor

For HIPAA Safe Harbor compliance, use the `maximum` policy which redacts all 18 PHI identifiers.

### Research Use (Limited Dataset)

For HIPAA Limited Dataset (research exception), use `research-relaxed` which permits:
- Dates
- Geographic subdivision smaller than state (city/county/ZIP)
- Ages (including 90+)

**Requirements:**
- ✅ Data Use Agreement (DUA)
- ✅ IRB approval
- ✅ No direct identifiers (names, SSN, contact info)

### De-identification Expert Determination

For expert determination method, work with a qualified statistician to develop a custom policy with documented risk thresholds.

## Support

For questions about policy customization:
- 📖 [Documentation](https://github.com/DocHatty/Vulpes-Celare/docs)
- 💬 [Discussions](https://github.com/DocHatty/Vulpes-Celare/discussions)
- 🐛 [Issues](https://github.com/DocHatty/Vulpes-Celare/issues)

For compliance consultation, consider engaging a HIPAA attorney or compliance professional.
