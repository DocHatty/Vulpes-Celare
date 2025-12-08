#!/usr/bin/env node
/**
 * VULPES PARQUET DATASET ANALYSIS - CLI RUNNER
 *
 * Run comprehensive analysis on external parquet datasets
 * Completely OPTIONAL - doesn't affect normal Vulpes tests
 *
 * Usage:
 *   node run-parquet-analysis.js --dir /path/to/parquet --split validation
 *   node run-parquet-analysis.js --help
 */

const { ParquetAnalyzer } = require('./parquet-analyzer');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        dir: null,
        split: 'validation', // Start with validation (5k) not train (50k)
        limit: null,
        skipCache: false,
        output: null
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--dir':
                options.dir = args[++i];
                break;
            case '--split':
                options.split = args[++i];
                break;
            case '--limit':
                options.limit = parseInt(args[++i]);
                break;
            case '--skip-cache':
                options.skipCache = true;
                break;
            case '--output':
                options.output = args[++i];
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
        }
    }

    return options;
}

function showHelp() {
    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║   VULPES PARQUET DATASET ANALYSIS                                    ║
╚══════════════════════════════════════════════════════════════════════╝

Usage:
  node run-parquet-analysis.js [options]

Options:
  --dir <path>        Path to directory containing parquet files
                      (Default: C:\\Users\\docto\\Downloads\\Here)

  --split <split>     Dataset split to analyze: train/validation/test
                      (Default: validation - 5k docs)

  --limit <number>    Limit number of documents to process
                      (Default: all documents in split)

  --skip-cache        Skip cache and reload parquet data
                      (Default: use cache if available)

  --output <file>     Save report to JSON file
                      (Default: stdout only)

  --help, -h          Show this help message

Examples:
  # Analyze validation set (5k docs) - RECOMMENDED FIRST RUN
  node run-parquet-analysis.js --dir C:\\Users\\docto\\Downloads\\Here

  # Analyze just 100 documents for quick test
  node run-parquet-analysis.js --dir C:\\Users\\docto\\Downloads\\Here --limit 100

  # Analyze full training set (50k docs) - LONG RUNNING
  node run-parquet-analysis.js --dir C:\\Users\\docto\\Downloads\\Here --split train

  # Save report to file
  node run-parquet-analysis.js --dir C:\\Users\\docto\\Downloads\\Here --output report.json

Output:
  - Comprehensive performance metrics
  - Missed pattern analysis
  - Dictionary expansion recommendations
  - Adversarial test cases
  - Actionable improvement recommendations
`);
}

async function main() {
    const options = parseArgs();

    // Default to the Here folder
    if (!options.dir) {
        options.dir = 'C:\\Users\\docto\\Downloads\\Here';
    }

    // Validate directory
    if (!fs.existsSync(options.dir)) {
        console.error(`\n❌ Error: Directory not found: ${options.dir}`);
        console.error('   Use --dir to specify parquet directory\n');
        process.exit(1);
    }

    // Check if parquet files exist
    const parquetFiles = fs.readdirSync(options.dir).filter(f => f.endsWith('.parquet'));
    if (parquetFiles.length === 0) {
        console.error(`\n❌ Error: No parquet files found in ${options.dir}`);
        console.error('   Make sure parquet files are in the directory\n');
        process.exit(1);
    }

    console.log(`\nFound parquet files: ${parquetFiles.join(', ')}\n`);

    // Create analyzer
    const analyzer = new ParquetAnalyzer(options.dir, {
        batchSize: 100,
        parallel: 8
    });

    try {
        // Run analysis
        const report = await analyzer.analyze({
            split: options.split,
            limit: options.limit,
            skipCache: options.skipCache
        });

        if (!report) {
            console.error('\n⚠️  Analysis could not be completed');
            console.error('   Check that Python and pandas are installed\n');
            process.exit(1);
        }

        // Print summary
        printSummary(report);

        // Save to file if requested
        if (options.output) {
            fs.writeFileSync(options.output, JSON.stringify(report, null, 2));
            console.log(`\n✓ Full report saved to: ${options.output}`);
        }

        console.log('\n✓ Analysis complete!\n');

    } catch (error) {
        console.error(`\n❌ Error during analysis: ${error.message}\n`);
        if (process.env.DEBUG) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

function printSummary(report) {
    console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║   ANALYSIS SUMMARY                                                   ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

    // Metrics
    console.log('PERFORMANCE METRICS:');
    console.log(`  Sensitivity:  ${report.summary.sensitivity.toFixed(2)}%`);
    console.log(`  Precision:    ${report.summary.precision.toFixed(2)}%`);
    console.log(`  F1 Score:     ${report.summary.f1.toFixed(2)}%`);
    console.log(`  Documents:    ${report.summary.totalDocuments}`);

    // Missed patterns
    console.log('\nTOP MISSED PATTERNS:');
    const topMissed = report.missedPatterns.topMissed.slice(0, 5);
    for (const missed of topMissed) {
        console.log(`  • ${missed.pattern} (${missed.count} occurrences)`);
        if (missed.examples[0]) {
            console.log(`    Example: "${missed.examples[0].entity}"`);
        }
    }

    // Dictionary expansion
    console.log('\nDICTIONARY EXPANSION OPPORTUNITIES:');
    const dict = report.dictionaryExpansion;
    console.log(`  First names:  +${dict.byCategory.first_names} entries`);
    console.log(`  Last names:   +${dict.byCategory.last_names} entries`);
    console.log(`  Locations:    +${dict.byCategory.locations} entries`);
    console.log(`  TOTAL:        +${dict.totalNewEntries} entries`);

    // Recommendations
    console.log('\nTOP RECOMMENDATIONS:');
    for (const rec of report.recommendations.slice(0, 3)) {
        console.log(`  [${rec.priority}] ${rec.category}: ${rec.action}`);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('\n❌ Fatal error:', error.message);
        process.exit(1);
    });
}

module.exports = { main };
