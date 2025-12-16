# Vulpes Celare - Master Test Suite

## Overview

This is the **authoritative, unbiased test suite** for the Vulpes Celare PHI redaction engine, featuring **Vulpes Cortex** - an intelligent learning system that tracks history, recognizes patterns, and provides recommendations.

### Core Principles

1. **UNBIASED TESTING**: Tests PHI detection without favoring specific implementations
2. **DUAL CORPUS**: Synthetic documents + real MTSamples clinical data
3. **INTELLIGENT LEARNING**: Cortex tracks what works and warns about failed approaches
4. **MULTI-PROFILE GRADING**: HIPAA_STRICT, DEVELOPMENT, RESEARCH profiles
5. **COMPREHENSIVE COVERAGE**: All 18 HIPAA Safe Harbor identifiers + extended (28 filters, 20+ PHI types)

---

## Quick Start

```bash
# Navigate to master-suite
cd tests/master-suite

# Run quick test (20 synthetic documents)
node run.js --quick

# Run full test (200 documents)
node run.js --full

# Run with MTSamples (real clinical documents)
node run.js --mtsamples --quick

# Run hybrid mode (50% synthetic, 50% MTSamples)
node run.js --hybrid

# Get Cortex intelligence report
node run.js --cortex-report
```

---

## Command Line Reference

### Corpus Selection

| Flag | Description |
|------|-------------|
| `--corpus=synthetic` | Generated documents with known PHI (default) |
| `--corpus=mtsamples` | Real clinical documents from MTSamples |
| `--corpus=hybrid` | 50% synthetic, 50% MTSamples for comparison |
| `--mtsamples` | Shortcut for `--corpus=mtsamples` |
| `--hybrid` | Shortcut for `--corpus=hybrid` |

### Document Count

| Flag | Documents | Use Case |
|------|-----------|----------|
| `--quick` | 20 | Fast iteration during development |
| (default) | 50 | Standard test run |
| `--full` | 200 | Comprehensive validation |
| `--thorough` | 500 | Deep regression testing |
| `--count=N` | N | Custom count |

### Grading Profiles

| Flag | Profile | Description |
|------|---------|-------------|
| `--profile=HIPAA_STRICT` | Production | 99% sensitivity required, zero tolerance |
| `--profile=DEVELOPMENT` | Development | Relaxed thresholds, tracks progress |
| `--profile=RESEARCH` | Research | Minimal penalties, focus on analysis |
| `--profile=OCR_TOLERANT` | OCR | Adjusts for OCR error patterns |

### Cortex Intelligence

| Flag | Description |
|------|-------------|
| `--cortex` | Enable Cortex (default) |
| `--no-cortex` | Disable Cortex |
| `--cortex-report` | Show full Cortex analysis report |
| `--cortex-insights` | Show active insights only |

### Output Options

| Flag | Description |
|------|-------------|
| `--verbose` | Show detailed progress |
| `--json-only` | JSON output for CI/CD |
| `--seed=N` | Fixed seed for reproducibility |

---

## Vulpes Cortex

Cortex is an intelligent learning system that makes the test suite smarter over time.

### Features

- **Pattern Recognition**: Identifies failure patterns across runs
- **History Tracking**: Remembers what changes worked or failed
- **Recommendations**: Suggests what to fix next based on evidence
- **A/B Experiments**: Tracks before/after metrics for changes
- **Insight Generation**: Creates actionable insights from patterns

### MCP Server

Start the Cortex MCP server for IDE integration:

```bash
cd tests/master-suite/cortex
node index.js --server
```

**Available Tools:**
- `analyze_test_results` - Analyze results with pattern recognition
- `consult_history` - Get historical context for a PHI type
- `get_recommendation` - Get evidence-based recommendations
- `record_experiment` - Track A/B experiment results

### REST API

```bash
# Start REST API (port 3101)
node tests/master-suite/cortex/api/server.js

# Query endpoints
curl http://localhost:3101/api/insights
curl http://localhost:3101/api/history/NAME
curl http://localhost:3101/api/recommendation
```

---

## Directory Structure

```
master-suite/
├── run.js                    # Unified test runner (all corpus types)
├── run-mtsamples-validation.js  # MTSamples-specific runner
├── index.js                  # Module exports
├── README.md                 # This file
│
├── assessment/
│   └── assessment.js         # Core assessment engine
│
├── cortex/                   # Vulpes Cortex intelligence system
│   ├── index.js              # Cortex entry point
│   ├── core/
│   │   ├── knowledge-base.js # Persistent learning storage
│   │   ├── decision-engine.js # Recommendation logic
│   │   └── console-formatter.js # Beautiful output
│   ├── modules/
│   │   ├── pattern-recognition.js
│   │   ├── history-tracker.js
│   │   ├── hypothesis-engine.js
│   │   └── insight-generator.js
│   ├── mcp/                  # MCP server implementation
│   └── api/                  # REST API server
│
├── corpus/                   # MTSamples corpus system
│   ├── mtsamples-loader.js   # Load MTSamples documents
│   ├── mtsamples-injector.js # PHI injection (500+ lines)
│   └── mtsamples-corpus-generator.js # Generate test corpus
│
├── documents/                # Synthetic document generation
│   ├── templates.js          # Medical document templates
│   └── phi-generator.js      # PHI dataset generator
│
├── generators/               # Low-level generators
│   ├── errors.js             # OCR/typo simulation
│   ├── phi.js                # PHI value generators
│   └── seeded-random.js      # Reproducible randomness
│
├── evolution/                # Smart grading system
│   ├── learning-engine.js    # Legacy learning (pre-Cortex)
│   └── smart-grading.js      # Multi-profile grading
│
├── data/                     # Static data
│   ├── names.js              # Diverse name database
│   ├── locations.js          # Geographic data
│   └── medical.js            # Medical terminology
│
└── utils/
    └── SmartSummary.js       # LLM-optimized output
```

---

## Corpus Types

### Synthetic Corpus (Default)

Generated documents with comprehensive PHI injection:

- **Templates**: H&P, Operative Report, Discharge Summary, Lab Reports, etc.
- **PHI Coverage**: All 20+ PHI types with ground truth tracking
- **Error Simulation**: OCR errors, typos, formatting variations
- **Reproducible**: Seeded random for consistent results

```bash
node run.js --quick              # 20 synthetic docs
node run.js --full               # 200 synthetic docs
```

### MTSamples Corpus

Real clinical documents from MTSamples database:

- **5000+ Documents**: Actual medical transcriptions
- **40+ Specialties**: Cardiology, Radiology, Surgery, etc.
- **PHI Injection**: Realistic PHI added with ground truth
- **Clinical Patterns**: Real-world formatting and terminology

```bash
node run.js --mtsamples --quick  # Quick MTSamples test
node run.js --mtsamples --full   # Full MTSamples validation
```

### Hybrid Mode

Run both corpora for comprehensive validation:

- **Cross-Corpus Comparison**: See how engine performs on both
- **Pattern Divergence**: Identify synthetic-only vs real-world issues
- **Production Readiness**: Validate on both generated and real data

```bash
node run.js --hybrid             # 50% synthetic, 50% MTSamples
```

---

## Grading Profiles

### HIPAA_STRICT (Production)

```bash
node run.js --profile=HIPAA_STRICT
```

- **Sensitivity**: 99%+ required
- **Specificity**: 96%+ required
- **Zero Tolerance**: Any missed PHI is a failure
- **Use Case**: Production deployment validation

### DEVELOPMENT (Default)

```bash
node run.js --profile=DEVELOPMENT
```

- **Sensitivity**: 95%+ acceptable
- **Diminishing Penalties**: First failures hurt more
- **Progress Tracking**: Compares to previous runs
- **Use Case**: Active development iteration

### RESEARCH

```bash
node run.js --profile=RESEARCH
```

- **Minimal Penalties**: Focus on understanding
- **Pattern Analysis**: Deep investigation enabled
- **Use Case**: Analyzing failure modes

---

## PHI Types Tested

**All 18 HIPAA Safe Harbor identifiers + Extended Coverage:**

| Type | Description | Examples |
|------|-------------|----------|
| NAME | Patient/family names | "Smith, John A." |
| SSN | Social Security Numbers | "123-45-6789" |
| DATE | Dates (DOB, admission) | "01/15/1985" |
| PHONE | Phone numbers | "(555) 123-4567" |
| FAX | Fax numbers | "Fax: 555-987-6543" |
| EMAIL | Email addresses | "john@email.com" |
| ADDRESS | Street addresses | "123 Main St" |
| ZIPCODE | ZIP codes | "12345-6789" |
| MRN | Medical record numbers | "MRN-2024-123456" |
| ACCOUNT_NUMBER | Account numbers | "ACCT: 789456123" |
| HEALTH_PLAN_ID | Insurance IDs | "XYZ123456789" |
| CREDIT_CARD | Credit cards | "4111-1111-1111-1111" |
| IP | IP addresses | "192.168.1.100" |
| URL | Patient portal URLs | "portal.com/patient/123" |
| VIN | Vehicle IDs | "1HGBH41JXMN109186" |
| LICENSE_PLATE | License plates | "ABC-1234" |
| AGE_90_PLUS | Ages 90+ | "92 years old" |
| NPI | Provider IDs | "1234567890" |
| DEA | DEA numbers | "AB1234567" |
| DEVICE_ID | Device IDs | "DEV-123456-IOS" |

---

## Error Simulation

Realistic document degradation for OCR testing:

| Level | Description | Distribution |
|-------|-------------|--------------|
| none | Clean data | 5% |
| low | Minor errors | 25% |
| medium | Typical OCR | 40% |
| high | Heavy corruption | 25% |
| extreme | Severe degradation | 5% |

**Error Types:**
- OCR substitutions: O↔0, l↔1↔I, S↔5, B↔8
- Typos: Adjacent key substitutions
- Transpositions: Character swaps
- Case variations: ALL CAPS, lowercase
- Spacing: Word merging/splitting

---

## LLM/AI Operator Guide

When an AI assistant runs tests, follow this workflow:

### 1. Run Test
```bash
node tests/master-suite/run.js --quick
```

### 2. Analyze Failures
The output shows:
- Current metrics (sensitivity, specificity, F1, F2)
- Top failure type with examples
- Recommendations from Cortex

### 3. Fix Top Failure
- Read the relevant filter: `src/filters/*.ts`
- Or dictionary: `src/dictionaries/*.txt`
- Make ONE focused change

### 4. Re-Test
```bash
node tests/master-suite/run.js --quick
```

### 5. Compare Metrics
- **Better?** Keep the change
- **Worse?** Revert: `git checkout <file>`
- **Neutral?** Consider reverting (simpler is better)

### 6. Iterate
Repeat until sensitivity ≥ 99%

---

## CI/CD Integration

```yaml
# GitHub Actions
- name: Run PHI Tests
  run: |
    npm run build
    node tests/master-suite/run.js --json-only --profile=HIPAA_STRICT > results.json

- name: Check Threshold
  run: |
    SENSITIVITY=$(jq '.metrics.sensitivity' results.json)
    if (( $(echo "$SENSITIVITY < 99" | bc -l) )); then
      exit 1
    fi
```

---

## Output Files

Results saved to `tests/results/`:

- `assessment-{timestamp}.json` - Machine-readable metrics
- `assessment-{timestamp}.txt` - Human-readable report
- `cortex-knowledge.json` - Cortex learning data

---

## Changelog

### v4.0.0 (Current)

- **Vulpes Cortex**: Intelligent learning system with MCP server
- **Dual Corpus**: Synthetic + MTSamples validation
- **Unified CLI**: Single entry point with `--corpus` flag
- **Smart Grading**: Multiple profiles (HIPAA_STRICT, DEVELOPMENT, RESEARCH)
- **Pattern Recognition**: Automated failure analysis
- **History Tracking**: Evidence-based recommendations

### v3.0.0

- Clinical-grade strict grading schema
- Multi-pass analysis workflow
- Comprehensive medical document templates

### v2.0.0

- Initial master suite consolidation

---

## Related Documentation

- `MTSAMPLES-INTEGRATION-AUDIT.md` - MTSamples integration details
- `cortex/README.md` - Cortex system documentation
- `corpus/README.md` - Corpus generation guide
