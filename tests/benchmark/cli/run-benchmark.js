#!/usr/bin/env node

/**
 * ============================================================================
 * BENCHMARK CLI v3.1
 * ============================================================================
 *
 * Command-line interface for running Vulpes Celare benchmarks.
 *
 * Usage:
 *   node tests/benchmark/cli/run-benchmark.js [options]
 *
 * Options:
 *   --backends=rules,hybrid,gliner   Backends to test (default: rules)
 *   --count=N                        Number of documents (default: 20)
 *   --seed=N                         Random seed (default: 1337)
 *   --profile=NAME                   Grading profile (default: DEVELOPMENT)
 *   --verbose                        Show detailed output
 *   --compare                        Compare all backends
 *   --quick                          Quick mode (less output, faster)
 *   --output=FILE                    Save results to JSON file
 *
 * @module benchmark/cli/run-benchmark
 */

const path = require('path');
const fs = require('fs');

// Ensure we're running from project root
process.chdir(path.join(__dirname, '..', '..', '..'));

// Suppress Vulpes logging in non-verbose mode
let originalConsoleLog = console.log;
let originalConsoleInfo = console.info;
let originalStdoutWrite = process.stdout.write.bind(process.stdout);

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = {
    backends: ['rules'],
    count: 20,
    seed: 1337,
    profile: 'DEVELOPMENT',
    verbose: false,
    compare: false,
    quick: false,
    output: null,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--backends=')) {
      args.backends = arg.split('=')[1].split(',');
    } else if (arg.startsWith('--count=')) {
      args.count = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--seed=')) {
      args.seed = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--profile=')) {
      args.profile = arg.split('=')[1];
    } else if (arg.startsWith('--output=')) {
      args.output = arg.split('=')[1];
    } else if (arg === '--verbose' || arg === '-v') {
      args.verbose = true;
    } else if (arg === '--quick' || arg === '-q') {
      args.quick = true;
    } else if (arg === '--compare') {
      args.compare = true;
      args.backends = ['rules', 'hybrid', 'gliner'];
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  }

  return args;
}

function showHelp() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           VULPES CELARE BENCHMARK SYSTEM v3.1                    ║
╚══════════════════════════════════════════════════════════════════╝

Usage:
  node tests/benchmark/cli/run-benchmark.js [options]

Options:
  --backends=LIST    Comma-separated backends: rules,hybrid,gliner (default: rules)
  --count=N          Number of documents (default: 20)
  --seed=N           Random seed for reproducibility (default: 1337)
  --profile=NAME     Grading profile: HIPAA_STRICT, DEVELOPMENT, OCR_TOLERANT
  --verbose, -v      Show detailed output including pipeline logs
  --quick, -q        Quick mode - minimal output, faster
  --compare          Compare all backends (sets backends to rules,hybrid,gliner)
  --output=FILE      Save results to JSON file
  --help, -h         Show this help

Examples:
  # Quick rules-only test
  node tests/benchmark/cli/run-benchmark.js --count=10 --quick

  # Verbose rules benchmark
  node tests/benchmark/cli/run-benchmark.js --backends=rules --count=50 --verbose

  # Compare rules vs hybrid (requires GLiNER model)
  node tests/benchmark/cli/run-benchmark.js --backends=rules,hybrid --count=100

  # Full comparison with output file
  node tests/benchmark/cli/run-benchmark.js --compare --count=200 --output=results.json

Profiles:
  HIPAA_STRICT  - Production readiness (strict penalties)
  DEVELOPMENT   - Development progress (balanced)
  OCR_TOLERANT  - High OCR error tolerance

Output:
  The benchmark outputs metrics including:
  - Sensitivity (Recall) - CRITICAL for HIPAA
  - Precision (PPV)
  - F1/F2 Scores
  - Throughput (docs/sec)
`);
}

/**
 * Generate test documents with ground truth
 */
function generateTestDocuments(count, seed) {
  const documents = [];
  const groundTruth = new Map();

  // Simple PRNG for reproducibility
  let random = seed;
  const nextRandom = () => {
    random = (random * 1103515245 + 12345) & 0x7fffffff;
    return random / 0x7fffffff;
  };

  const firstNames = ['John', 'Jane', 'Robert', 'Maria', 'Michael', 'Sarah', 'David', 'Lisa'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  const templates = [
    { template: 'Patient {name} was seen in clinic today. DOB: {date}. SSN: {ssn}. Phone: {phone}.', types: ['name', 'date', 'ssn', 'phone'] },
    { template: 'Discharge summary for {name}. Contact: {phone}. Email: {email}.', types: ['name', 'phone', 'email'] },
    { template: 'Lab results for {name} ({mrn}). Collected on {date}.', types: ['name', 'mrn', 'date'] },
    { template: '{name} presents with symptoms. Address: {address}. Phone: {phone}.', types: ['name', 'address', 'phone'] },
  ];

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(nextRandom() * firstNames.length)];
    const lastName = lastNames[Math.floor(nextRandom() * lastNames.length)];
    const templateData = templates[Math.floor(nextRandom() * templates.length)];

    const name = `${firstName} ${lastName}`;
    const date = `${Math.floor(nextRandom() * 12) + 1}/${Math.floor(nextRandom() * 28) + 1}/${1950 + Math.floor(nextRandom() * 70)}`;
    const ssn = `${Math.floor(100 + nextRandom() * 899)}-${Math.floor(10 + nextRandom() * 89)}-${Math.floor(1000 + nextRandom() * 8999)}`;
    const phone = `(${Math.floor(200 + nextRandom() * 799)}) ${Math.floor(100 + nextRandom() * 899)}-${Math.floor(1000 + nextRandom() * 8999)}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`;
    const mrn = `MRN${Math.floor(100000 + nextRandom() * 899999)}`;
    const address = `${Math.floor(100 + nextRandom() * 9900)} Main St, City, ST ${Math.floor(10000 + nextRandom() * 89999)}`;

    const values = { name, date, ssn, phone, email, mrn, address };
    let text = templateData.template;
    const gtSpans = [];

    // Track ground truth spans
    for (const type of templateData.types) {
      const placeholder = `{${type}}`;
      const value = values[type];
      const start = text.indexOf(placeholder);
      if (start !== -1) {
        gtSpans.push({
          start,
          end: start + value.length,
          text: value,
          type,
        });
        text = text.replace(placeholder, value);
      }
    }

    const docId = `doc-${i.toString().padStart(4, '0')}`;
    documents.push({
      id: docId,
      text,
      category: 'clinical_note',
      ocrTier: 1,
      corpus: 'synthetic',
    });
    groundTruth.set(docId, gtSpans);
  }

  return { documents, groundTruth };
}

/**
 * Suppress logging when not verbose
 */
function suppressLogging(verbose) {
  if (!verbose) {
    // Suppress stdout JSON logs from Vulpes
    process.stdout.write = (chunk, encoding, callback) => {
      const str = typeof chunk === 'string' ? chunk : chunk.toString();
      // Skip JSON log lines from Vulpes (they start with {)
      if (str.startsWith('{') && str.includes('"level"')) {
        if (callback) callback();
        return true;
      }
      return originalStdoutWrite(chunk, encoding, callback);
    };

    console.log = (...args) => {
      // Only show our benchmark messages (starting with specific patterns)
      const msg = args[0];
      if (typeof msg === 'string') {
        // Skip JSON log lines from Vulpes
        if (msg.startsWith('{') && msg.includes('"level"')) {
          return;
        }
        // Show benchmark UI output
        if (
          msg.includes('╔') || msg.includes('╚') || msg.includes('║') ||
          msg.includes('═') || msg.includes('┌') || msg.includes('└') ||
          msg.includes('│') || msg.includes('├') ||
          msg.includes('[RULES]') || msg.includes('[HYBRID]') || msg.includes('[GLINER]') ||
          msg.includes('Configuration') || msg.includes('Backends') ||
          msg.includes('Documents') || msg.includes('Seed') ||
          msg.includes('Generating') || msg.includes('Generated') ||
          msg.includes('Running') || msg.includes('Completed') ||
          msg.includes('Throughput') || msg.includes('Errors') ||
          msg.includes('Benchmark') || msg.includes('SUMMARY') ||
          msg.includes('Sensitivity') || msg.includes('Precision') ||
          msg.includes('F1') || msg.includes('F2') ||
          msg.includes('HIPAA') || msg.includes('✓') || msg.includes('✗') ||
          msg.includes('Winner') || msg.includes('complete!')
        ) {
          originalConsoleLog.apply(console, args);
        }
      }
    };
    console.info = () => {};
  }
}

/**
 * Restore logging
 */
function restoreLogging() {
  console.log = originalConsoleLog;
  console.info = originalConsoleInfo;
  process.stdout.write = originalStdoutWrite;
}

/**
 * Run benchmark for a single backend
 */
async function runBackend(backendType, documents, groundTruth, verbose) {
  // Set environment for this backend
  if (backendType === 'rules') {
    process.env.VULPES_NAME_DETECTION_MODE = 'rules';
    process.env.VULPES_USE_GLINER = '0';
  } else if (backendType === 'hybrid') {
    process.env.VULPES_NAME_DETECTION_MODE = 'hybrid';
    process.env.VULPES_USE_GLINER = '1';
  } else if (backendType === 'gliner') {
    process.env.VULPES_NAME_DETECTION_MODE = 'gliner';
    process.env.VULPES_USE_GLINER = '1';
  }

  // Clear module cache for fresh config
  Object.keys(require.cache).forEach(key => {
    if (key.includes('dist/config') || key.includes('dist/VulpesCelare')) {
      delete require.cache[key];
    }
  });

  const startTime = Date.now();
  let totalSpans = 0;
  let errors = 0;
  let tp = 0, fp = 0, fn = 0;

  const { VulpesCelare } = require('../../../dist/VulpesCelare.js');

  for (const doc of documents) {
    try {
      const result = await VulpesCelare.redactWithDetails(doc.text);
      const detectedCount = result.redactionCount || 0;
      totalSpans += detectedCount;

      // Compare with ground truth
      const gt = groundTruth.get(doc.id) || [];
      const detected = detectedCount;
      const expected = gt.length;

      // Simple TP/FP/FN estimation
      const matched = Math.min(detected, expected);
      tp += matched;
      fp += Math.max(0, detected - expected);
      fn += Math.max(0, expected - detected);

      if (verbose && detectedCount > 0) {
        originalConsoleLog(`    ${doc.id}: ${detectedCount} spans (expected: ${expected})`);
      }
    } catch (err) {
      errors++;
      if (verbose) {
        originalConsoleLog(`    ${doc.id}: ERROR - ${err.message}`);
      }
    }
  }

  const elapsed = Date.now() - startTime;

  // Calculate metrics
  const sensitivity = tp + fn > 0 ? tp / (tp + fn) : 0;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const f1 = precision + sensitivity > 0 ? 2 * precision * sensitivity / (precision + sensitivity) : 0;
  const f2 = 4 * precision + sensitivity > 0 ? 5 * precision * sensitivity / (4 * precision + sensitivity) : 0;

  return {
    backend: backendType,
    documents: documents.length,
    totalSpans,
    elapsed,
    throughput: documents.length / (elapsed / 1000),
    errors,
    metrics: {
      tp, fp, fn,
      sensitivity,
      precision,
      f1,
      f2,
    },
  };
}

/**
 * Print results summary
 */
function printSummary(results, profile) {
  console.log('\n' + '═'.repeat(70));
  console.log('BENCHMARK SUMMARY');
  console.log('═'.repeat(70));
  console.log('');

  // Results table
  console.log('┌──────────────┬───────────┬───────────┬───────────┬───────────┬──────────┐');
  console.log('│ Backend      │ Sensitiv. │ Precision │ F1 Score  │ F2 Score  │ Docs/sec │');
  console.log('├──────────────┼───────────┼───────────┼───────────┼───────────┼──────────┤');

  for (const r of results) {
    const m = r.metrics;
    const backend = r.backend.toUpperCase().padEnd(12);
    const sens = (m.sensitivity * 100).toFixed(1).padStart(8) + '%';
    const prec = (m.precision * 100).toFixed(1).padStart(8) + '%';
    const f1 = m.f1.toFixed(3).padStart(9);
    const f2 = m.f2.toFixed(3).padStart(9);
    const throughput = r.throughput.toFixed(1).padStart(8);
    console.log(`│ ${backend} │${sens} │${prec} │${f1} │${f2} │${throughput} │`);
  }

  console.log('└──────────────┴───────────┴───────────┴───────────┴───────────┴──────────┘');
  console.log('');

  // HIPAA Assessment
  const bestResult = results.reduce((a, b) => a.metrics.sensitivity > b.metrics.sensitivity ? a : b);
  const hipaaCompliant = bestResult.metrics.sensitivity >= 0.99;

  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                    HIPAA COMPLIANCE ASSESSMENT                       ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');

  const status = hipaaCompliant ? '✓ COMPLIANT' : '✗ NON-COMPLIANT';
  const riskLevel = bestResult.metrics.sensitivity >= 0.99 ? '🟢 LOW' :
                    bestResult.metrics.sensitivity >= 0.97 ? '🟡 MEDIUM' :
                    bestResult.metrics.sensitivity >= 0.95 ? '🟠 HIGH' : '🔴 CRITICAL';

  console.log(`║  Status:      ${status.padEnd(55)} ║`);
  console.log(`║  Risk Level:  ${riskLevel.padEnd(55)} ║`);
  console.log(`║  Best Backend: ${bestResult.backend.toUpperCase().padEnd(54)} ║`);
  console.log(`║  Sensitivity: ${(bestResult.metrics.sensitivity * 100).toFixed(2)}%${' '.repeat(54)} ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('');

  if (results.length > 1) {
    // Winner declaration
    const winner = bestResult;
    console.log(`Winner: ${winner.backend.toUpperCase()} (sensitivity: ${(winner.metrics.sensitivity * 100).toFixed(2)}%)`);
  }
}

/**
 * Main function
 */
async function main() {
  const args = parseArgs();

  // Suppress logging in quick/non-verbose mode
  suppressLogging(args.verbose);

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           VULPES CELARE BENCHMARK SYSTEM v3.1                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Configuration:`);
  console.log(`  Backends:  ${args.backends.join(', ')}`);
  console.log(`  Documents: ${args.count}`);
  console.log(`  Seed:      ${args.seed}`);
  console.log(`  Profile:   ${args.profile}`);
  console.log('');

  // Generate test documents
  console.log('Generating test documents...');
  const { documents, groundTruth } = generateTestDocuments(args.count, args.seed);
  console.log(`  Generated ${documents.length} documents with ground truth`);
  console.log('');

  console.log('Running benchmarks...');
  console.log('═'.repeat(70));

  const results = [];

  for (const backendType of args.backends) {
    console.log(`\n[${backendType.toUpperCase()}] Running...`);

    try {
      const result = await runBackend(backendType, documents, groundTruth, args.verbose);
      results.push(result);

      console.log(`  Completed: ${result.documents} docs, ${result.totalSpans} spans, ${result.elapsed}ms`);
      console.log(`  Throughput: ${result.throughput.toFixed(1)} docs/sec`);
      console.log(`  Metrics: Sens=${(result.metrics.sensitivity * 100).toFixed(1)}% Prec=${(result.metrics.precision * 100).toFixed(1)}% F1=${result.metrics.f1.toFixed(3)}`);
      if (result.errors > 0) {
        console.log(`  Errors: ${result.errors}`);
      }
    } catch (err) {
      console.log(`  FAILED: ${err.message}`);
      if (args.verbose) {
        console.error(err.stack);
      }
    }
  }

  // Print summary
  if (results.length > 0) {
    printSummary(results, args.profile);

    // Save to file if requested
    if (args.output) {
      const outputData = {
        timestamp: new Date().toISOString(),
        configuration: args,
        results: results,
      };
      fs.writeFileSync(args.output, JSON.stringify(outputData, null, 2));
      console.log(`Results saved to: ${args.output}`);
    }
  }

  restoreLogging();
  console.log('\nBenchmark complete!');
}

main().catch(err => {
  restoreLogging();
  console.error('Fatal error:', err);
  process.exit(1);
});
