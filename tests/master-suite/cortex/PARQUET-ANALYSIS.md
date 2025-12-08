# Vulpes Parquet Dataset Analysis

**Comprehensive analysis system for external labeled datasets (60k+ documents)**

## Overview

The Parquet Analysis system allows you to validate Vulpes against large external datasets to:

1. ✅ **Expand test coverage** - From 7k to 60k+ documents
2. ✅ **Find missing patterns** - See exactly what Vulpes missed
3. ✅ **Expand dictionaries** - Extract thousands of new names/locations
4. ✅ **Generate adversarial cases** - Find rare edge cases
5. ✅ **Benchmark performance** - Get industry-standard metrics

## Architecture

```
┌─────────────────────────┐
│  Parquet Files          │  ← External labeled dataset (60k docs)
│  (train/val/test)       │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  ParquetLoader          │  ← Python bridge (loads parquet → JSON)
│  (parquet-loader.js)    │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  ParquetAnalyzer        │  ← Main analysis engine
│  (parquet-analyzer.js)  │  • Batched processing (100 docs at a time)
└──────────┬──────────────┘  • Parallel execution (8 workers)
           │                  • Cached results
           │                  • Memory efficient
           ▼
┌─────────────────────────┐
│  Vulpes Engine          │  ← Your existing redaction system
│  (runs on each doc)     │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Comparison Engine      │  ← Compare vs ground truth
│  • Missing patterns     │
│  • Dictionary expansion │
│  • Adversarial cases    │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Comprehensive Report   │  ← Actionable recommendations
└─────────────────────────┘
```

**Key Design Principles:**
- **OPTIONAL** - Doesn't affect normal Vulpes tests
- **NON-BLOCKING** - Runs separately, won't slow down core system
- **CACHED** - Loads data once, reuses
- **BATCHED** - Memory efficient (processes 100 docs at a time)
- **GRACEFUL** - Works even if Python/parquet unavailable

## Quick Start

### Prerequisites

```bash
# Install Python dependencies (one-time setup)
pip install pandas pyarrow
```

### Run Analysis

```bash
# Quick test (100 documents)
npm run test:parquet:quick

# Full validation set (5,000 documents) - RECOMMENDED
npm run test:parquet -- --dir C:\Users\docto\Downloads\Here

# Full training set (50,000 documents) - LONG RUNNING
npm run test:parquet -- --dir C:\Users\docto\Downloads\Here --split train
```

### Expected Output

```
╔══════════════════════════════════════════════════════════════════════╗
║   VULPES PARQUET DATASET ANALYSIS                                    ║
╚══════════════════════════════════════════════════════════════════════╝

[STEP 1] Loading validation dataset...
  ✓ Loaded 5000 documents

[STEP 2] Running Vulpes redaction (batched)...
  Batch 50/50 complete (245.3 docs/sec)
  ✓ Processed 5000 documents

[STEP 3] Analyzing missed patterns...
  ✓ Found 127 unique missed patterns

[STEP 4] Extracting dictionary candidates...
  ✓ Found 8,432 new dictionary entries

[STEP 5] Generating adversarial test cases...
  ✓ Generated 50 adversarial cases

[STEP 6] Calculating performance metrics...
  ✓ Metrics calculated

╔══════════════════════════════════════════════════════════════════════╗
║   ANALYSIS SUMMARY                                                   ║
╚══════════════════════════════════════════════════════════════════════╝

PERFORMANCE METRICS:
  Sensitivity:  99.23%
  Precision:    97.84%
  F1 Score:     98.52%
  Documents:    5000

TOP MISSED PATTERNS:
  • date:NNNN-NN-NN (89 occurrences)
    Example: "2008-11-18"
  • medical_record_number:AANNNNNNNNN (45 occurrences)
    Example: "MED59692151"
  • device_id:NNNNNNNNNNNNNNN (23 occurrences)
    Example: "423253719743645"

DICTIONARY EXPANSION OPPORTUNITIES:
  First names:  +2,341 entries
  Last names:   +3,128 entries
  Locations:    +2,963 entries
  TOTAL:        +8,432 entries

TOP RECOMMENDATIONS:
  [HIGH] Missing Patterns: Add filters or patterns for top missed entity types
  [MEDIUM] Dictionary Expansion: Add 8432 new entries to dictionaries
  [MEDIUM] Adversarial Testing: Add edge cases to test suite

✓ Analysis complete!
```

## Command Reference

### Basic Commands

```bash
# Quick test (100 docs)
npm run test:parquet:quick

# Full analysis with all options
npm run test:parquet -- --dir /path/to/parquet --split validation --output report.json
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--dir <path>` | Directory containing parquet files | `C:\Users\docto\Downloads\Here` |
| `--split <name>` | Dataset split: train/validation/test | `validation` |
| `--limit <number>` | Limit documents to process | All |
| `--skip-cache` | Force reload parquet data | Use cache |
| `--output <file>` | Save report to JSON file | Stdout only |

### Examples

```bash
# Analyze just 100 documents for quick test
npm run test:parquet -- --limit 100

# Analyze validation set (5k docs)
npm run test:parquet -- --split validation

# Analyze full training set (50k docs) - takes ~30 minutes
npm run test:parquet -- --split train

# Save detailed report
npm run test:parquet -- --output analysis-report.json

# Force fresh analysis (skip cache)
npm run test:parquet -- --skip-cache
```

## Output Files

### Report Structure

```json
{
  "summary": {
    "dataset": "validation",
    "totalDocuments": 5000,
    "sensitivity": 99.23,
    "precision": 97.84,
    "f1": 98.52
  },
  "missedPatterns": {
    "total": 127,
    "byType": { ... },
    "topMissed": [ ... ]
  },
  "dictionaryExpansion": {
    "totalNewEntries": 8432,
    "byCategory": { ... }
  },
  "adversarialCases": {
    "total": 50,
    "cases": [ ... ]
  },
  "recommendations": [ ... ]
}
```

### Cache Files

Loaded datasets are cached in `tests/master-suite/cortex/.cache/` for fast re-runs:
- `validation_all.json` (5k docs, ~10MB)
- `train_all.json` (50k docs, ~100MB)
- `test_all.json` (5k docs, ~10MB)

Clear cache: `rm -rf tests/master-suite/cortex/.cache`

## Integration with Cortex

The analysis results can be integrated with the existing Cortex system:

```javascript
const { ParquetAnalyzer } = require('./cortex/parquet-analyzer');

// Run analysis
const analyzer = new ParquetAnalyzer('/path/to/parquet');
const report = await analyzer.analyze({ split: 'validation' });

// Use results
console.log(`Missed ${report.missedPatterns.total} patterns`);
console.log(`Can add ${report.dictionaryExpansion.totalNewEntries} new dictionary entries`);
```

## Performance

### Speed

- **Validation set (5k docs)**: ~2-3 minutes
- **Training set (50k docs)**: ~20-30 minutes
- **Quick test (100 docs)**: ~10-20 seconds

### Memory Usage

- **Batched processing**: 100 docs at a time
- **Peak memory**: ~500MB-1GB
- **Cached datasets**: ~10-100MB on disk

### Optimization

The system is optimized for:
- ✅ Parallel processing (8 workers)
- ✅ Batched execution (memory efficient)
- ✅ Cached results (fast re-runs)
- ✅ Non-blocking (doesn't affect main Vulpes)

## Troubleshooting

### Python/pandas not found

```bash
# Install Python dependencies
pip install pandas pyarrow

# Or use conda
conda install pandas pyarrow
```

### Out of memory

```bash
# Reduce batch size
# Edit parquet-analyzer.js line 21:
batchSize: 50  // instead of 100
```

### Slow performance

```bash
# Test with fewer documents first
npm run test:parquet -- --limit 100

# Use cache for re-runs
# (don't use --skip-cache)
```

## Future Enhancements

Planned improvements:
- [ ] Automatic filter generation from missed patterns
- [ ] One-click dictionary import
- [ ] Interactive web UI for results
- [ ] Integration with CI/CD pipeline
- [ ] Support for additional dataset formats

## Support

Questions or issues:
- 📖 [Main Documentation](../../../README.md)
- 🐛 [Report Issues](https://github.com/DocHatty/Vulpes-Celare/issues)
- 💬 [Discussions](https://github.com/DocHatty/Vulpes-Celare/discussions)

---

**Built to expand, not slow down. 🦊**
