#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║   VULPES CELARE - COMPREHENSIVE PERFORMANCE BENCHMARK                         ║
 * ║   Rigorous validation of the "2-3ms per document" claim                       ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║   This benchmark provides:                                                    ║
 * ║   - High-resolution timing (process.hrtime.bigint)                            ║
 * ║   - Warmup iterations to eliminate cold-start bias                            ║
 * ║   - Statistical analysis (mean, median, p50, p95, p99, std dev)              ║
 * ║   - Multiple document size categories                                         ║
 * ║   - Verifiable, reproducible results                                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const path = require('path');

// Setup environment
process.env.NODE_ENV = 'test';

// Mock electron
global.require = (moduleName) => {
  if (moduleName === 'electron') {
    return {
      ipcRenderer: { invoke: () => Promise.resolve({}), send: () => {}, on: () => {} },
      app: {
        getPath: (type) => type === 'userData' 
          ? path.join(__dirname, '..', 'userData') 
          : __dirname,
        getName: () => 'VulpesTest',
        getVersion: () => '1.0.0'
      }
    };
  }
  return require(moduleName);
};

// ============================================================================
// BENCHMARK CONFIGURATION
// ============================================================================
const CONFIG = {
  WARMUP_ITERATIONS: 50,        // Warmup to eliminate cold start
  BENCHMARK_ITERATIONS: 500,    // Statistical significance
  DOCUMENT_CATEGORIES: {
    tiny:   { minLen: 100,   maxLen: 500 },
    small:  { minLen: 500,   maxLen: 1500 },
    medium: { minLen: 1500,  maxLen: 4000 },
    large:  { minLen: 4000,  maxLen: 8000 },
    xlarge: { minLen: 8000,  maxLen: 15000 }
  }
};

// ============================================================================
// STATISTICAL UTILITIES
// ============================================================================
function calculateStats(timings) {
  if (timings.length === 0) return null;
  
  const sorted = [...timings].sort((a, b) => a - b);
  const sum = timings.reduce((a, b) => a + b, 0);
  const mean = sum / timings.length;
  
  // Variance and standard deviation
  const squaredDiffs = timings.map(t => Math.pow(t - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / timings.length;
  const stdDev = Math.sqrt(variance);
  
  // Percentiles
  const percentile = (arr, p) => {
    const idx = Math.ceil(arr.length * p / 100) - 1;
    return arr[Math.max(0, Math.min(idx, arr.length - 1))];
  };
  
  return {
    count: timings.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    median: percentile(sorted, 50),
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    stdDev,
    sum
  };
}

// ============================================================================
// DOCUMENT GENERATORS
// ============================================================================

// Generate PHI-rich medical documents of varying sizes
function generateMedicalDocument(sizeCategory) {
  const { minLen, maxLen } = CONFIG.DOCUMENT_CATEGORIES[sizeCategory];
  const targetLen = minLen + Math.floor(Math.random() * (maxLen - minLen));
  
  // Realistic PHI elements
  const names = [
    'John Smith', 'Jane Doe', 'Robert Johnson', 'Maria Garcia',
    'Dr. Michael Williams', 'Sarah O\'Connor', 'James Wilson-Harper',
    'Smith, John Robert', 'DOE, JANE MARIE', 'Johnson III, Robert'
  ];
  
  const ssns = [
    '123-45-6789', '987-65-4321', '456 78 9012', '234.56.7890',
    '111-22-3333', '999-88-7777', 'SSN: 555-44-3322'
  ];
  
  const phones = [
    '(555) 123-4567', '555.987.6543', '1-800-555-0199',
    '+1 (555) 000-1111', '555-234-5678 ext 123', '(555)432-1098'
  ];
  
  const emails = [
    'john.smith@email.com', 'patient@hospital.org', 'jane_doe123@gmail.com',
    'contact@healthcare.net', 'info@clinic.edu'
  ];
  
  const dates = [
    '01/15/1985', '03-22-1990', 'January 5, 1978', '12/01/2023',
    'DOB: 05/30/1965', 'Admitted: 11/15/2024', '2024-03-15'
  ];
  
  const mrns = [
    'MRN: 12345678', 'MRN-87654321', 'Medical Record #: 11223344',
    'Patient ID: 99887766', 'Account: ACC-555666777'
  ];
  
  const addresses = [
    '123 Main Street, Anytown, CA 90210',
    '456 Oak Avenue, Suite 100, New York, NY 10001',
    '789 Pine Road, Boston, MA 02101-1234',
    '1000 Healthcare Blvd, Los Angeles, CA 90001'
  ];
  
  const ips = ['192.168.1.100', '10.0.0.50', '172.16.0.1'];
  
  const medicalPhrases = [
    'The patient presents with', 'Chief complaint:', 'History of present illness:',
    'Assessment and Plan:', 'Vital signs stable', 'Labs pending',
    'Follow-up in 2 weeks', 'Diagnosis:', 'Differential includes',
    'Physical examination reveals', 'No acute distress noted',
    'Patient tolerated procedure well', 'Discharge instructions given',
    'Medication reconciliation completed', 'Allergies: NKDA',
    'Cardiovascular: RRR, no murmurs', 'Respiratory: CTA bilaterally',
    'Neurological: A&Ox3, no focal deficits', 'Abdomen: Soft, non-tender'
  ];
  
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  
  let doc = '';
  
  // Build document with mix of PHI and medical content
  while (doc.length < targetLen) {
    const section = Math.random();
    
    if (section < 0.15) {
      doc += `Patient: ${pick(names)}\n`;
    } else if (section < 0.25) {
      doc += `SSN: ${pick(ssns)}\n`;
    } else if (section < 0.35) {
      doc += `Phone: ${pick(phones)}\n`;
    } else if (section < 0.42) {
      doc += `Email: ${pick(emails)}\n`;
    } else if (section < 0.52) {
      doc += `Date: ${pick(dates)}\n`;
    } else if (section < 0.60) {
      doc += `${pick(mrns)}\n`;
    } else if (section < 0.67) {
      doc += `Address: ${pick(addresses)}\n`;
    } else if (section < 0.72) {
      doc += `IP: ${pick(ips)}\n`;
    } else {
      doc += `${pick(medicalPhrases)} `;
      if (Math.random() > 0.7) doc += '\n\n';
    }
  }
  
  return doc.substring(0, targetLen);
}

// ============================================================================
// MAIN BENCHMARK RUNNER
// ============================================================================
async function runBenchmark() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║   VULPES CELARE - PERFORMANCE BENCHMARK                                       ║
║   Validating "2-3ms per document" claim                                       ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`);

  // Load the engine
  console.log('Loading Vulpes Celare engine...');
  const startLoad = process.hrtime.bigint();
  
  let VulpesCelare;
  try {
    const module = require('../dist/VulpesCelare.js');
    VulpesCelare = module.VulpesCelare || module.default;
  } catch (e) {
    console.error('Failed to load engine:', e.message);
    console.error('Make sure to run: npm run build');
    process.exit(1);
  }
  
  const loadTime = Number(process.hrtime.bigint() - startLoad) / 1e6;
  console.log(`Engine loaded in ${loadTime.toFixed(2)}ms\n`);
  
  // Create engine instance
  const engine = new VulpesCelare();
  
  // Results storage
  const results = {};
  const allTimings = [];
  
  // Run benchmark for each document size category
  for (const [category, config] of Object.entries(CONFIG.DOCUMENT_CATEGORIES)) {
    console.log(`\n${'─'.repeat(76)}`);
    console.log(`BENCHMARKING: ${category.toUpperCase()} documents (${config.minLen}-${config.maxLen} chars)`);
    console.log(`${'─'.repeat(76)}`);
    
    // Generate test documents
    const documents = [];
    for (let i = 0; i < CONFIG.BENCHMARK_ITERATIONS; i++) {
      documents.push(generateMedicalDocument(category));
    }
    
    const avgDocLen = documents.reduce((a, d) => a + d.length, 0) / documents.length;
    console.log(`Generated ${documents.length} documents (avg length: ${avgDocLen.toFixed(0)} chars)`);
    
    // WARMUP PHASE
    console.log(`\nWarmup: ${CONFIG.WARMUP_ITERATIONS} iterations...`);
    for (let i = 0; i < CONFIG.WARMUP_ITERATIONS; i++) {
      const doc = documents[i % documents.length];
      await engine.process(doc);
    }
    console.log('Warmup complete.');
    
    // BENCHMARK PHASE
    console.log(`\nBenchmark: ${CONFIG.BENCHMARK_ITERATIONS} iterations...`);
    const timings = [];
    const phiCounts = [];
    
    for (let i = 0; i < CONFIG.BENCHMARK_ITERATIONS; i++) {
      const doc = documents[i];
      
      // High-resolution timing
      const start = process.hrtime.bigint();
      const result = await engine.process(doc);
      const end = process.hrtime.bigint();
      
      const elapsed = Number(end - start) / 1e6; // Convert to milliseconds
      timings.push(elapsed);
      allTimings.push(elapsed);
      phiCounts.push(result.redactionCount);
      
      // Progress indicator
      if ((i + 1) % 100 === 0) {
        process.stdout.write(`  Processed ${i + 1}/${CONFIG.BENCHMARK_ITERATIONS}\r`);
      }
    }
    console.log('');
    
    // Calculate statistics
    const stats = calculateStats(timings);
    const avgPhi = phiCounts.reduce((a, b) => a + b, 0) / phiCounts.length;
    
    results[category] = {
      ...stats,
      avgDocLength: avgDocLen,
      avgPhiDetected: avgPhi
    };
    
    // Display results
    console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│  RESULTS: ${category.toUpperCase().padEnd(67)}│
├─────────────────────────────────────────────────────────────────────────────┤
│  Timing (milliseconds):                                                     │
│    Min:     ${stats.min.toFixed(3).padStart(8)}ms                                                     │
│    Max:     ${stats.max.toFixed(3).padStart(8)}ms                                                     │
│    Mean:    ${stats.mean.toFixed(3).padStart(8)}ms  ◄── Average processing time                       │
│    Median:  ${stats.median.toFixed(3).padStart(8)}ms  ◄── 50th percentile                             │
│    P95:     ${stats.p95.toFixed(3).padStart(8)}ms  ◄── 95th percentile                             │
│    P99:     ${stats.p99.toFixed(3).padStart(8)}ms  ◄── 99th percentile                             │
│    StdDev:  ${stats.stdDev.toFixed(3).padStart(8)}ms                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Throughput:                                                                │
│    ${(1000 / stats.mean).toFixed(1).padStart(8)} documents/second (based on mean)                        │
│    ${(avgDocLen * 1000 / stats.mean / 1000).toFixed(1).padStart(8)} KB/second                                                      │
│    Avg PHI items detected: ${avgPhi.toFixed(1)}                                            │
└─────────────────────────────────────────────────────────────────────────────┘
`);
  }
  
  // ============================================================================
  // OVERALL SUMMARY
  // ============================================================================
  const overallStats = calculateStats(allTimings);
  
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           OVERALL BENCHMARK SUMMARY                           ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   Total documents processed: ${allTimings.length.toString().padStart(6)}                                        ║
║   Total processing time:     ${(overallStats.sum / 1000).toFixed(2).padStart(6)} seconds                                     ║
║                                                                               ║
║   ┌────────────────────────────────────────────────────────────────────────┐  ║
║   │  TIMING STATISTICS (across ALL document sizes)                         │  ║
║   ├────────────────────────────────────────────────────────────────────────┤  ║
║   │    Minimum:     ${overallStats.min.toFixed(3).padStart(8)}ms                                        │  ║
║   │    Maximum:     ${overallStats.max.toFixed(3).padStart(8)}ms                                        │  ║
║   │    Mean:        ${overallStats.mean.toFixed(3).padStart(8)}ms  ◄── THIS IS THE ANSWER               │  ║
║   │    Median:      ${overallStats.median.toFixed(3).padStart(8)}ms                                        │  ║
║   │    P95:         ${overallStats.p95.toFixed(3).padStart(8)}ms                                        │  ║
║   │    P99:         ${overallStats.p99.toFixed(3).padStart(8)}ms                                        │  ║
║   │    Std Dev:     ${overallStats.stdDev.toFixed(3).padStart(8)}ms                                        │  ║
║   └────────────────────────────────────────────────────────────────────────┘  ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                           CLAIM VALIDATION                                    ║
╠═══════════════════════════════════════════════════════════════════════════════╣`);

  // Validate the 2-3ms claim
  const claimValid = overallStats.mean >= 1.0 && overallStats.mean <= 5.0;
  const claimExact = overallStats.mean >= 2.0 && overallStats.mean <= 3.0;
  
  if (claimExact) {
    console.log(`║                                                                               ║
║   ✅ CLAIM "2-3ms per document" is VALIDATED                                  ║
║      Measured mean: ${overallStats.mean.toFixed(3)}ms falls within 2-3ms range                       ║
║                                                                               ║`);
  } else if (claimValid) {
    console.log(`║                                                                               ║
║   ⚠️  CLAIM "2-3ms per document" needs adjustment                              ║
║      Measured mean: ${overallStats.mean.toFixed(3)}ms                                                 ║
║      Recommended claim: "${(Math.floor(overallStats.mean)).toFixed(0)}-${(Math.ceil(overallStats.mean + 1)).toFixed(0)}ms per document"                               ║
║                                                                               ║`);
  } else if (overallStats.mean < 1.0) {
    console.log(`║                                                                               ║
║   🚀 PERFORMANCE EXCEEDS CLAIM                                                ║
║      Measured mean: ${overallStats.mean.toFixed(3)}ms (faster than claimed 2-3ms!)                   ║
║      Consider updating to: "sub-millisecond" or "<${(overallStats.mean * 2).toFixed(1)}ms"                   ║
║                                                                               ║`);
  } else {
    console.log(`║                                                                               ║
║   ❌ CLAIM "2-3ms per document" is NOT VALIDATED                              ║
║      Measured mean: ${overallStats.mean.toFixed(3)}ms exceeds the 2-3ms target                       ║
║      Recommended claim: "${Math.floor(overallStats.mean)}-${Math.ceil(overallStats.mean + 2)}ms per document"                               ║
║                                                                               ║`);
  }
  
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣
║                           BY DOCUMENT SIZE                                    ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║   Size      │ Avg Length │   Mean   │  Median  │   P95    │   P99    │        ║
║   ──────────┼────────────┼──────────┼──────────┼──────────┼──────────┼        ║`);

  for (const [cat, stats] of Object.entries(results)) {
    const catPad = cat.padEnd(10);
    const lenPad = stats.avgDocLength.toFixed(0).padStart(7);
    const meanPad = stats.mean.toFixed(3).padStart(7);
    const medPad = stats.median.toFixed(3).padStart(7);
    const p95Pad = stats.p95.toFixed(3).padStart(7);
    const p99Pad = stats.p99.toFixed(3).padStart(7);
    console.log(`║   ${catPad}│ ${lenPad} ch │ ${meanPad}ms│ ${medPad}ms│ ${p95Pad}ms│ ${p99Pad}ms│        ║`);
  }

  console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝

BENCHMARK METHODOLOGY:
  • High-resolution timing via process.hrtime.bigint() (nanosecond precision)
  • ${CONFIG.WARMUP_ITERATIONS} warmup iterations per size category (eliminates cold-start)
  • ${CONFIG.BENCHMARK_ITERATIONS} measured iterations per size category
  • Documents contain realistic PHI: names, SSNs, phones, emails, dates, MRNs, addresses
  • Results are reproducible and verifiable

This benchmark ran on: ${new Date().toISOString()}
Node.js version: ${process.version}
`);

  // Return results for programmatic use
  return {
    overall: overallStats,
    byCategory: results,
    claimValidated: claimExact,
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// RUN
// ============================================================================
runBenchmark()
  .then(results => {
    // Export raw data
    const jsonPath = path.join(__dirname, 'results', `performance-${Date.now()}.json`);
    try {
      const fs = require('fs');
      fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
      fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
      console.log(`\nRaw results saved to: ${jsonPath}`);
    } catch (e) {
      // Ignore file save errors
    }
    
    process.exit(results.claimValidated ? 0 : 1);
  })
  .catch(err => {
    console.error('Benchmark failed:', err);
    process.exit(2);
  });
