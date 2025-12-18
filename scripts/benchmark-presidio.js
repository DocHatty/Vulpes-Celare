#!/usr/bin/env node
/**
 * Presidio Comparison Benchmark
 * 
 * Runs the same test corpus through both Vulpes Celare and Microsoft Presidio,
 * comparing detection accuracy.
 * 
 * Prerequisites:
 *   pip install presidio-analyzer presidio-anonymizer spacy
 *   python -m spacy download en_core_web_lg
 * 
 * Usage:
 *   npm run benchmark:presidio
 *   npm run benchmark:presidio -- --sample-size 100
 *   npm run benchmark:presidio -- --output results.json
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Check if Python Presidio bridge exists
const PRESIDIO_BRIDGE = path.join(__dirname, 'presidio-bridge.py');

async function checkPrerequisites() {
  console.log('Checking prerequisites...\n');
  
  // Check Python
  try {
    await runCommand('python', ['--version']);
    console.log('✓ Python available');
  } catch {
    console.error('✗ Python not found. Install Python 3.8+');
    process.exit(1);
  }
  
  // Check Presidio
  try {
    await runCommand('python', ['-c', 'import presidio_analyzer; print("ok")']);
    console.log('✓ Presidio installed');
  } catch {
    console.error('✗ Presidio not installed. Run:');
    console.error('  pip install presidio-analyzer presidio-anonymizer spacy');
    console.error('  python -m spacy download en_core_web_lg');
    process.exit(1);
  }
  
  console.log('');
}

function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { shell: true });
    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', d => stdout += d);
    proc.stderr?.on('data', d => stderr += d);
    proc.on('close', code => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `Exit code ${code}`));
    });
  });
}

async function runPresidioBridge(documents) {
  // Write documents to temp file
  const tempInput = path.join(__dirname, '../.temp-presidio-input.json');
  const tempOutput = path.join(__dirname, '../.temp-presidio-output.json');
  
  fs.writeFileSync(tempInput, JSON.stringify(documents));
  
  try {
    await runCommand('python', [PRESIDIO_BRIDGE, tempInput, tempOutput]);
    const results = JSON.parse(fs.readFileSync(tempOutput, 'utf-8'));
    return results;
  } finally {
    // Cleanup
    try { fs.unlinkSync(tempInput); } catch {}
    try { fs.unlinkSync(tempOutput); } catch {}
  }
}

async function main() {
  const args = process.argv.slice(2);
  const sampleSize = parseInt(args.find(a => a.startsWith('--sample-size='))?.split('=')[1] || '100');
  const outputFile = args.find(a => a.startsWith('--output='))?.split('=')[1];
  
  await checkPrerequisites();
  
  console.log(`Running comparison benchmark (sample size: ${sampleSize})...\n`);
  
  // Load Vulpes Celare
  const { VulpesCelare } = require('../dist');
  const engine = new VulpesCelare({ policy: 'maximum' });
  
  // Load test corpus
  const corpusPath = path.join(__dirname, '../tests/master-suite/data');
  const generatorsPath = path.join(__dirname, '../tests/master-suite/generators');
  
  // Generate test documents with known ground truth
  const { generateTestDocument } = require(path.join(generatorsPath, 'phi.js'));
  
  const testDocuments = [];
  for (let i = 0; i < sampleSize; i++) {
    const doc = generateTestDocument({ seed: i });
    testDocuments.push(doc);
  }
  
  console.log(`Generated ${testDocuments.length} test documents\n`);
  
  // Run Vulpes Celare
  console.log('Running Vulpes Celare...');
  const vulpesResults = [];
  const vulpesStart = Date.now();
  
  for (const doc of testDocuments) {
    const result = await engine.process(doc.text);
    vulpesResults.push({
      documentId: doc.id,
      detections: result.spans || [],
      groundTruth: doc.annotations
    });
  }
  
  const vulpesTime = Date.now() - vulpesStart;
  console.log(`  Completed in ${vulpesTime}ms\n`);
  
  // Run Presidio
  console.log('Running Microsoft Presidio...');
  const presidioStart = Date.now();
  const presidioResults = await runPresidioBridge(testDocuments.map(d => ({
    id: d.id,
    text: d.text,
    groundTruth: d.annotations
  })));
  const presidioTime = Date.now() - presidioStart;
  console.log(`  Completed in ${presidioTime}ms\n`);
  
  // Calculate metrics
  const vulpesMetrics = calculateMetrics(vulpesResults);
  const presidioMetrics = calculateMetrics(presidioResults);
  
  // Print results
  console.log('═'.repeat(70));
  console.log('COMPARISON RESULTS');
  console.log('═'.repeat(70));
  console.log('');
  console.log('┌────────────────────┬────────────────┬──────────────┬─────────┐');
  console.log('│ Metric             │ Vulpes Celare  │ Presidio     │ Delta   │');
  console.log('├────────────────────┼────────────────┼──────────────┼─────────┤');
  console.log(`│ Sensitivity        │ ${pct(vulpesMetrics.sensitivity)}       │ ${pct(presidioMetrics.sensitivity)}      │ ${delta(vulpesMetrics.sensitivity, presidioMetrics.sensitivity)}  │`);
  console.log(`│ Precision          │ ${pct(vulpesMetrics.precision)}       │ ${pct(presidioMetrics.precision)}      │ ${delta(vulpesMetrics.precision, presidioMetrics.precision)}  │`);
  console.log(`│ F1 Score           │ ${pct(vulpesMetrics.f1)}       │ ${pct(presidioMetrics.f1)}      │ ${delta(vulpesMetrics.f1, presidioMetrics.f1)}  │`);
  console.log('├────────────────────┼────────────────┼──────────────┼─────────┤');
  console.log(`│ Processing Time    │ ${vulpesTime}ms${' '.repeat(Math.max(0, 10 - String(vulpesTime).length))}│ ${presidioTime}ms${' '.repeat(Math.max(0, 9 - String(presidioTime).length))}│ —       │`);
  console.log('└────────────────────┴────────────────┴──────────────┴─────────┘');
  console.log('');
  
  // By PHI type
  console.log('BY PHI TYPE:');
  console.log('┌─────────────┬────────────────┬──────────────┐');
  console.log('│ Type        │ Vulpes         │ Presidio     │');
  console.log('├─────────────┼────────────────┼──────────────┤');
  
  const phiTypes = ['NAME', 'DATE', 'SSN', 'ADDRESS', 'PHONE', 'EMAIL', 'MRN'];
  for (const type of phiTypes) {
    const v = vulpesMetrics.byType[type] || { sensitivity: 0 };
    const p = presidioMetrics.byType[type] || { sensitivity: 0 };
    console.log(`│ ${type.padEnd(11)} │ ${pct(v.sensitivity)}       │ ${pct(p.sensitivity)}      │`);
  }
  console.log('└─────────────┴────────────────┴──────────────┘');
  
  // Save results if requested
  if (outputFile) {
    const fullResults = {
      timestamp: new Date().toISOString(),
      sampleSize,
      vulpes: vulpesMetrics,
      presidio: presidioMetrics,
      details: { vulpesResults, presidioResults }
    };
    fs.writeFileSync(outputFile, JSON.stringify(fullResults, null, 2));
    console.log(`\nResults saved to ${outputFile}`);
  }
}

function calculateMetrics(results) {
  let tp = 0, fp = 0, fn = 0;
  const byType = {};
  
  for (const result of results) {
    const { detections, groundTruth } = result;
    const matched = new Set();
    
    // Check each detection against ground truth
    for (const det of detections) {
      let found = false;
      for (let i = 0; i < groundTruth.length; i++) {
        if (matched.has(i)) continue;
        const gt = groundTruth[i];
        if (spansOverlap(det, gt, 0.5)) {
          tp++;
          matched.add(i);
          found = true;
          
          // Track by type
          byType[gt.type] = byType[gt.type] || { tp: 0, fp: 0, fn: 0 };
          byType[gt.type].tp++;
          break;
        }
      }
      if (!found) {
        fp++;
        byType[det.type] = byType[det.type] || { tp: 0, fp: 0, fn: 0 };
        byType[det.type].fp++;
      }
    }
    
    // Count false negatives
    for (let i = 0; i < groundTruth.length; i++) {
      if (!matched.has(i)) {
        fn++;
        const gt = groundTruth[i];
        byType[gt.type] = byType[gt.type] || { tp: 0, fp: 0, fn: 0 };
        byType[gt.type].fn++;
      }
    }
  }
  
  const sensitivity = tp / (tp + fn) || 0;
  const precision = tp / (tp + fp) || 0;
  const f1 = 2 * (precision * sensitivity) / (precision + sensitivity) || 0;
  
  // Calculate per-type metrics
  for (const type of Object.keys(byType)) {
    const t = byType[type];
    t.sensitivity = t.tp / (t.tp + t.fn) || 0;
    t.precision = t.tp / (t.tp + t.fp) || 0;
    t.f1 = 2 * (t.precision * t.sensitivity) / (t.precision + t.sensitivity) || 0;
  }
  
  return { tp, fp, fn, sensitivity, precision, f1, byType };
}

function spansOverlap(a, b, threshold) {
  const overlapStart = Math.max(a.start, b.start);
  const overlapEnd = Math.min(a.end, b.end);
  const overlapLen = Math.max(0, overlapEnd - overlapStart);
  const bLen = b.end - b.start;
  return overlapLen / bLen >= threshold;
}

function pct(n) {
  return (n * 100).toFixed(1).padStart(5) + '%';
}

function delta(a, b) {
  const d = (a - b) * 100;
  const sign = d >= 0 ? '+' : '';
  return sign + d.toFixed(1) + '%';
}

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
