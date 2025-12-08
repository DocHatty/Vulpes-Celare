#!/usr/bin/env node

/**
 * Aggregate Test Runner
 *
 * Runs multiple test batches and aggregates results automatically.
 * Solves the timeout problem by running smaller batches.
 *
 * Usage:
 *   node tests/master-suite/run-aggregate.js --batches 4 --size 50
 *   node tests/master-suite/run-aggregate.js --batches 10 --size 20
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { ProgressBar } = require('./utils/ProgressBar');
const { SmartSummary } = require('./utils/SmartSummary');

// Parse arguments
const args = process.argv.slice(2);
const batchesIndex = args.indexOf('--batches');
const sizeIndex = args.indexOf('--size');

const numBatches = batchesIndex >= 0 ? parseInt(args[batchesIndex + 1]) : 4;
const batchSize = sizeIndex >= 0 ? parseInt(args[sizeIndex + 1]) : 50;
const totalDocs = numBatches * batchSize;

console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
console.log('║   VULPES AGGREGATE TEST RUNNER                                       ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
console.log(`Running ${numBatches} batches of ${batchSize} documents = ${totalDocs} total\n`);

const results = [];
const startTime = Date.now();

// Create overall progress bar
const overallProgress = new ProgressBar(numBatches, 'Overall Progress');
console.log(''); // Add spacing

// Run each batch
for (let i = 1; i <= numBatches; i++) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`BATCH ${i}/${numBatches} - Processing ${batchSize} documents`);
  console.log('='.repeat(70));

  const batchStart = Date.now();
  overallProgress.update(i - 1);

  try {
    // Run test for this batch
    const output = execSync(
      `node tests/master-suite/run.js --count ${batchSize} --json-only`,
      {
        encoding: 'utf-8',
        timeout: 120000, // 2 minute timeout per batch
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      }
    );

    // Find the most recent JSON result
    const resultsDir = path.join(__dirname, '..', 'results');
    const files = fs.readdirSync(resultsDir)
      .filter(f => f.startsWith('assessment-') && f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(resultsDir, f),
        time: fs.statSync(path.join(resultsDir, f)).mtimeMs
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 0) {
      const resultData = JSON.parse(fs.readFileSync(files[0].path, 'utf-8'));
      const metrics = resultData.metrics;
      const cm = metrics.confusionMatrix;

      results.push({
        batch: i,
        documents: batchSize,
        sensitivity: metrics.sensitivity,
        specificity: metrics.specificity,
        precision: metrics.precision,
        f1Score: metrics.f1Score,
        f2Score: metrics.f2Score,
        truePositives: cm.truePositives,
        falseNegatives: cm.falseNegatives,
        trueNegatives: cm.trueNegatives,
        falsePositives: cm.falsePositives
      });

      const batchTime = ((Date.now() - batchStart) / 1000).toFixed(1);
      overallProgress.update(i);
      console.log(`\n✓ Batch ${i} complete in ${batchTime}s`);
      // Note: metrics are already in percentage form (0-100), not decimal (0-1)
      console.log(`  Sensitivity: ${resultData.metrics.sensitivity.toFixed(2)}%`);
      console.log(`  Specificity: ${resultData.metrics.specificity.toFixed(2)}%`);
    }

  } catch (error) {
    console.error(`✗ Batch ${i} failed:`, error.message);
    overallProgress.clear();
    process.exit(1);
  }
}

// Complete progress bar
overallProgress.complete();

// Aggregate results
console.log('\n\n╔══════════════════════════════════════════════════════════════════════╗');
console.log('║   AGGREGATED RESULTS                                                 ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

// Calculate weighted averages (by TP+FN for sensitivity)
let totalTP = 0, totalFN = 0, totalFP = 0, totalTN = 0;

results.forEach(r => {
  totalTP += r.truePositives || 0;
  totalFN += r.falseNegatives || 0;
  totalFP += r.falsePositives || 0;
  totalTN += r.trueNegatives || 0;
});

const aggregated = {
  totalDocuments: totalDocs,
  totalBatches: numBatches,
  totalTime: totalTime,

  // Recalculated from aggregated confusion matrix (in percentage form 0-100)
  sensitivity: (totalTP / (totalTP + totalFN)) * 100,
  specificity: (totalTN / (totalTN + totalFP)) * 100,
  precision: (totalTP / (totalTP + totalFP)) * 100,

  confusionMatrix: {
    truePositives: totalTP,
    falseNegatives: totalFN,
    falsePositives: totalFP,
    trueNegatives: totalTN
  },

  // Variance analysis
  variance: {
    sensitivityStdDev: calculateStdDev(results.map(r => r.sensitivity)),
    specificityStdDev: calculateStdDev(results.map(r => r.specificity)),
  },

  batchResults: results
};

// Calculate F1 and F2
aggregated.f1Score = 2 * (aggregated.precision * aggregated.sensitivity) / (aggregated.precision + aggregated.sensitivity);
aggregated.f2Score = 5 * (aggregated.precision * aggregated.sensitivity) / (4 * aggregated.precision + aggregated.sensitivity);

// Display results
console.log('OVERALL METRICS');
console.log('─'.repeat(70));
console.log(`Documents Tested:     ${totalDocs} (${numBatches} batches × ${batchSize})`);
console.log(`Total Time:           ${totalTime}s (${(totalTime/60).toFixed(1)} minutes)`);
console.log(`Avg Time per Doc:     ${(totalTime / totalDocs * 1000).toFixed(0)}ms`);
console.log('');
console.log(`Sensitivity:          ${aggregated.sensitivity.toFixed(2)}% ± ${(aggregated.variance.sensitivityStdDev).toFixed(2)}%`);
console.log(`Specificity:          ${aggregated.specificity.toFixed(2)}% ± ${(aggregated.variance.specificityStdDev).toFixed(2)}%`);
console.log(`Precision:            ${aggregated.precision.toFixed(2)}%`);
console.log(`F1 Score:             ${aggregated.f1Score.toFixed(4)}`);
console.log(`F2 Score:             ${aggregated.f2Score.toFixed(4)}`);
console.log('');
console.log('CONFUSION MATRIX');
console.log('─'.repeat(70));
console.log(`True Positives:       ${totalTP} (PHI correctly redacted)`);
console.log(`False Negatives:      ${totalFN} (PHI missed) ← CRITICAL`);
console.log(`False Positives:      ${totalFP} (over-redactions)`);
console.log(`True Negatives:       ${totalTN} (non-PHI preserved)`);
console.log('');

// Calculate margin of error (95% confidence)
const totalPHI = totalTP + totalFN;
const sensitivityDecimal = aggregated.sensitivity / 100; // Convert to 0-1 range for calculation
const marginOfError = 1.96 * Math.sqrt((sensitivityDecimal * (1 - sensitivityDecimal)) / totalPHI) * 100;
console.log('STATISTICAL CONFIDENCE');
console.log('─'.repeat(70));
console.log(`Total PHI Items:      ${totalPHI}`);
console.log(`Margin of Error:      ±${marginOfError.toFixed(2)}% (95% confidence)`);
console.log(`Confidence Interval:  ${(aggregated.sensitivity - marginOfError).toFixed(2)}% - ${(aggregated.sensitivity + marginOfError).toFixed(2)}%`);
console.log('');

// Batch consistency check
const sensitivities = results.map(r => r.sensitivity);
const minSens = Math.min(...sensitivities);
const maxSens = Math.max(...sensitivities);
const range = maxSens - minSens;

console.log('BATCH CONSISTENCY');
console.log('─'.repeat(70));
console.log(`Sensitivity Range:    ${minSens.toFixed(2)}% - ${maxSens.toFixed(2)}%`);
console.log(`Variance:             ${range.toFixed(2)}% ${range < 2 ? '✓ Consistent' : '⚠ High variance'}`);
console.log('');

// Grade
const grade = aggregated.sensitivity >= 99 ? 'A+' :
              aggregated.sensitivity >= 98 ? 'A' :
              aggregated.sensitivity >= 97 ? 'A-' :
              aggregated.sensitivity >= 96 ? 'B+' :
              aggregated.sensitivity >= 95 ? 'B' : 'C';

console.log('FINAL GRADE');
console.log('─'.repeat(70));
console.log(`                         ${grade}                         `);
console.log(`                    ${aggregated.sensitivity.toFixed(2)}%                    `);
console.log('─'.repeat(70));
console.log('');

// Save aggregated results
const outputPath = path.join(__dirname, '..', 'results', `aggregated-${Date.now()}.json`);
fs.writeFileSync(outputPath, JSON.stringify(aggregated, null, 2));
console.log(`Results saved to: ${outputPath}\n`);

// Generate smart summary for LLMs
const smartSummary = new SmartSummary();
const summaryResults = {
  metrics: {
    sensitivity: aggregated.sensitivity,
    specificity: aggregated.specificity,
    precision: aggregated.precision,
    f1Score: aggregated.f1Score,
    f2Score: aggregated.f2Score,
    confusionMatrix: aggregated.confusionMatrix,
    byPHIType: {} // Not tracked in aggregate mode
  },
  documents: totalDocs,
  processingTime: `${totalTime}s`
};

console.log('\n' + '═'.repeat(70));
console.log('SMART SUMMARY (LLM-OPTIMIZED)');
console.log('═'.repeat(70) + '\n');
console.log(smartSummary.generate(summaryResults, {
  compact: false,
  showComparison: true,
  showRecommendations: true
}));
console.log('\n');

// Helper function
function calculateStdDev(values) {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

process.exit(0);
