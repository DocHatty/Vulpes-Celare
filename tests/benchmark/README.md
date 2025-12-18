# Vulpes Celare Benchmark System v3.1

A comprehensive benchmarking framework for evaluating PHI detection performance across different detection backends.

## Overview

The benchmark system provides:

- **Multiple Detection Backends**: Rules-only, Hybrid (Rules + GLiNER), and GLiNER-only
- **Hermetic Test Environment**: Google-style isolation for reproducible results
- **SemEval'13 5-Mode Evaluation**: Industry-standard NER evaluation (strict, exact, partial, type, ent_type)
- **Statistical Testing**: McNemar's test, paired t-test, Wilcoxon, permutation tests
- **Bootstrap Confidence Intervals**: BCa method for robust uncertainty quantification
- **HIPAA Compliance Assessment**: Automatic sensitivity threshold checking

## Quick Start

```bash
# Quick test (10 documents)
npm run benchmark:quick

# Standard rules-only benchmark
npm run benchmark:rules

# Compare all backends
npm run benchmark:compare

# Full benchmark with custom options
npm run benchmark -- --backends=rules,hybrid --count=100 --verbose
```

## Architecture

```
tests/benchmark/
├── backends/           # Detection backend implementations
│   ├── DetectionBackend.ts   # Core interfaces
│   ├── BaseBackend.ts        # Abstract base class
│   ├── RulesOnlyBackend.ts   # Rules-only detection
│   ├── HybridBackend.ts      # Rules + GLiNER hybrid
│   ├── GlinerOnlyBackend.ts  # GLiNER-only detection
│   └── BackendFactory.ts     # Backend creation factory
│
├── evaluation/         # Metrics and evaluation
│   ├── NervaluateAligner.ts  # SemEval'13 5-mode span alignment
│   ├── MetricsCalculator.ts  # Comprehensive metrics (F1, F2, MCC, etc.)
│   └── BenchmarkGrader.ts    # SmartGrader integration
│
├── statistical/        # Statistical testing
│   ├── StatisticalTests.ts   # McNemar, t-test, Wilcoxon, permutation
│   └── BootstrapCI.ts        # BCa confidence intervals
│
├── harness/            # Test infrastructure
│   ├── HermeticEnvironment.ts    # Environment isolation
│   └── BenchmarkOrchestrator.ts  # Test orchestration
│
├── cli/                # Command-line interface
│   └── run-benchmark.js      # Main CLI entry point
│
├── dist/               # Compiled JavaScript
└── tsconfig.json       # TypeScript configuration
```

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--backends=LIST` | Comma-separated backends: rules, hybrid, gliner | rules |
| `--count=N` | Number of documents to test | 20 |
| `--seed=N` | Random seed for reproducibility | 1337 |
| `--profile=NAME` | Grading profile: HIPAA_STRICT, DEVELOPMENT, OCR_TOLERANT | DEVELOPMENT |
| `--verbose, -v` | Show detailed output including pipeline logs | false |
| `--quick, -q` | Quick mode - minimal output, faster | false |
| `--compare` | Compare all backends (sets backends to all) | false |
| `--output=FILE` | Save results to JSON file | - |

## Evaluation Modes

### SemEval'13 5-Mode Alignment

| Mode | Boundary | Type | Use Case |
|------|----------|------|----------|
| **strict** | Exact | Exact | Production assessment |
| **exact** | Exact | Any | Boundary detection quality |
| **partial** | Overlap | Any | Recall-focused analysis |
| **type** | Any | Exact | Type classification accuracy |
| **ent_type** | Overlap | Exact | Balanced evaluation |

## Metrics

### Core Metrics

- **Sensitivity (Recall)**: TP / (TP + FN) - CRITICAL for HIPAA compliance
- **Precision (PPV)**: TP / (TP + FP)
- **F1 Score**: Harmonic mean of precision and recall
- **F2 Score**: Recall-weighted F-score (preferred for PHI detection)

### Advanced Metrics

- **Matthews Correlation Coefficient (MCC)**: Best single metric for imbalanced classes
- **Cohen's Kappa**: Inter-rater agreement
- **Dice Coefficient**: Token overlap measure
- **Jaccard Index**: Set similarity

## Statistical Testing

### Comparison Tests

| Test | Use Case | Assumptions |
|------|----------|-------------|
| **McNemar's** | Paired binary classification | None |
| **Paired t-test** | Parametric mean comparison | Normal distribution |
| **Wilcoxon signed-rank** | Non-parametric comparison | None |
| **Permutation test** | Distribution-free comparison | None |

### Confidence Intervals

- **Percentile Bootstrap**: Basic non-parametric CI
- **BCa (Bias-Corrected and Accelerated)**: Recommended for most cases
- **Stratified Bootstrap**: For heterogeneous samples

## HIPAA Compliance Assessment

The benchmark automatically assesses HIPAA compliance based on sensitivity:

| Sensitivity | Risk Level | Status |
|-------------|------------|--------|
| >= 99% | LOW | COMPLIANT |
| >= 97% | MEDIUM | Review Recommended |
| >= 95% | HIGH | Action Required |
| < 95% | CRITICAL | Immediate Action Required |

## Building

```bash
# Build benchmark TypeScript files
npm run benchmark:build

# Build main project (includes benchmark deps)
npm run build
```

## Programmatic Usage

```typescript
import { RulesOnlyBackend, createRulesOnlyBackend } from './backends';
import { NervaluateAligner, MetricsCalculator } from './evaluation';
import { StatisticalTests, BootstrapCI } from './statistical';

// Create backend
const backend = createRulesOnlyBackend();
await backend.initialize();

// Process document
const result = await backend.detect({
  id: 'doc-001',
  text: 'Patient John Smith, SSN 123-45-6789...',
  category: 'clinical_note',
});

// Evaluate
const aligner = new NervaluateAligner();
const alignment = aligner.align(result.spans, groundTruth);

const calculator = new MetricsCalculator();
const metrics = calculator.calculateAllModes(alignment);
const hipaa = calculator.assessHIPAACompliance(metrics);

console.log(hipaa.meetsHIPAAStandard ? 'COMPLIANT' : 'NON-COMPLIANT');
```

## References

- SemEval-2013 Task 9: Extraction of Drug-Drug Interactions from BioMedical Texts
- nervaluate library: https://github.com/MantisAI/nervaluate
- Berg-Kirkpatrick et al. (2012) "An empirical investigation of statistical significance in NLP"
- Efron & Tibshirani (1993) "An Introduction to the Bootstrap"
- Stubbs & Uzuner (2015) "Annotating longitudinal clinical narratives"

## Version History

- **v3.1** (2025-01): Full implementation with statistical testing and HIPAA assessment
- **v3.0** (2024-12): Initial architecture design
