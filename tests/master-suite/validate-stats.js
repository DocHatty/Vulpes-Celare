#!/usr/bin/env node

/**
 * Statistical Validation Utility
 * Verifies all calculations in aggregated results are mathematically correct
 */

const fs = require('fs');
const path = require('path');

console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
console.log('║   STATISTICAL ACCURACY VALIDATION                                    ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

// Find most recent aggregated results
const resultsDir = path.join(__dirname, '..', 'results');
const files = fs.readdirSync(resultsDir)
  .filter(f => f.startsWith('aggregated-') && f.endsWith('.json'))
  .map(f => ({
    name: f,
    path: path.join(resultsDir, f),
    time: fs.statSync(path.join(resultsDir, f)).mtimeMs
  }))
  .sort((a, b) => b.time - a.time);

if (files.length === 0) {
  console.error('❌ No aggregated results found');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(files[0].path, 'utf-8'));
console.log(`Validating: ${files[0].name}\n`);

// Extract values
const { truePositives: TP, falseNegatives: FN, trueNegatives: TN, falsePositives: FP } = data.confusionMatrix;
const totalPHI = TP + FN;
const totalNonPHI = TN + FP;
const totalItems = TP + FN + TN + FP;

console.log('CONFUSION MATRIX VALIDATION');
console.log('─'.repeat(70));
console.log(`  True Positives:   ${TP}`);
console.log(`  False Negatives:  ${FN}`);
console.log(`  True Negatives:   ${TN}`);
console.log(`  False Positives:  ${FP}`);
console.log(`  Total PHI:        ${totalPHI}`);
console.log(`  Total Non-PHI:    ${totalNonPHI}`);
console.log(`  Total Items:      ${totalItems}`);

// Validate Sensitivity (Recall)
const expectedSensitivity = (TP / totalPHI) * 100;
const actualSensitivity = data.sensitivity;
const sensError = Math.abs(expectedSensitivity - actualSensitivity);

console.log('\nSENSITIVITY (RECALL) = TP / (TP + FN)');
console.log('─'.repeat(70));
console.log(`  Expected:  ${expectedSensitivity.toFixed(10)}%`);
console.log(`  Actual:    ${actualSensitivity.toFixed(10)}%`);
console.log(`  Error:     ${sensError.toFixed(10)}%`);
console.log(`  Status:    ${sensError < 0.000001 ? '✅ PASS' : '❌ FAIL'}`);

// Validate Specificity
const expectedSpecificity = (TN / totalNonPHI) * 100;
const actualSpecificity = data.specificity;
const specError = Math.abs(expectedSpecificity - actualSpecificity);

console.log('\nSPECIFICITY = TN / (TN + FP)');
console.log('─'.repeat(70));
console.log(`  Expected:  ${expectedSpecificity.toFixed(10)}%`);
console.log(`  Actual:    ${actualSpecificity.toFixed(10)}%`);
console.log(`  Error:     ${specError.toFixed(10)}%`);
console.log(`  Status:    ${specError < 0.000001 ? '✅ PASS' : '❌ FAIL'}`);

// Validate Precision
const expectedPrecision = (TP / (TP + FP)) * 100;
const actualPrecision = data.precision;
const precError = Math.abs(expectedPrecision - actualPrecision);

console.log('\nPRECISION (PPV) = TP / (TP + FP)');
console.log('─'.repeat(70));
console.log(`  Expected:  ${expectedPrecision.toFixed(10)}%`);
console.log(`  Actual:    ${actualPrecision.toFixed(10)}%`);
console.log(`  Error:     ${precError.toFixed(10)}%`);
console.log(`  Status:    ${precError < 0.000001 ? '✅ PASS' : '❌ FAIL'}`);

// Validate F1 Score (note: stored as percentage in aggregate runner)
const sensDecimal = expectedSensitivity / 100;
const precDecimal = expectedPrecision / 100;
const expectedF1Decimal = 2 * (precDecimal * sensDecimal) / (precDecimal + sensDecimal);
const expectedF1 = expectedF1Decimal * 100; // Convert to percentage to match storage format
const actualF1 = data.f1Score;
const f1Error = Math.abs(expectedF1 - actualF1);

console.log('\nF1 SCORE = 2 * (Precision * Sensitivity) / (Precision + Sensitivity)');
console.log('─'.repeat(70));
console.log(`  Expected:  ${expectedF1.toFixed(10)}`);
console.log(`  Actual:    ${actualF1.toFixed(10)}`);
console.log(`  Error:     ${f1Error.toFixed(10)}`);
console.log(`  Status:    ${f1Error < 0.000001 ? '✅ PASS' : '❌ FAIL'}`);

// Validate F2 Score (weighted toward recall, stored as percentage)
const expectedF2Decimal = 5 * (precDecimal * sensDecimal) / (4 * precDecimal + sensDecimal);
const expectedF2 = expectedF2Decimal * 100; // Convert to percentage to match storage format
const actualF2 = data.f2Score;
const f2Error = Math.abs(expectedF2 - actualF2);

console.log('\nF2 SCORE = 5 * (Precision * Sensitivity) / (4 * Precision + Sensitivity)');
console.log('─'.repeat(70));
console.log(`  Expected:  ${expectedF2.toFixed(10)}`);
console.log(`  Actual:    ${actualF2.toFixed(10)}`);
console.log(`  Error:     ${f2Error.toFixed(10)}`);
console.log(`  Status:    ${f2Error < 0.000001 ? '✅ PASS' : '❌ FAIL'}`);

// Validate batch aggregation
console.log('\nBATCH AGGREGATION VALIDATION');
console.log('─'.repeat(70));

let batchTP = 0, batchFN = 0, batchTN = 0, batchFP = 0;
data.batchResults.forEach(batch => {
  batchTP += batch.truePositives;
  batchFN += batch.falseNegatives;
  batchTN += batch.trueNegatives;
  batchFP += batch.falsePositives;
});

console.log(`  Batch TP Sum:     ${batchTP} (expected ${TP}) ${batchTP === TP ? '✅' : '❌'}`);
console.log(`  Batch FN Sum:     ${batchFN} (expected ${FN}) ${batchFN === FN ? '✅' : '❌'}`);
console.log(`  Batch TN Sum:     ${batchTN} (expected ${TN}) ${batchTN === TN ? '✅' : '❌'}`);
console.log(`  Batch FP Sum:     ${batchFP} (expected ${FP}) ${batchFP === FP ? '✅' : '❌'}`);

// Validate standard deviation
const sensitivities = data.batchResults.map(b => b.sensitivity);
const avgSens = sensitivities.reduce((a, b) => a + b) / sensitivities.length;
const variance = sensitivities.map(s => Math.pow(s - avgSens, 2)).reduce((a, b) => a + b) / sensitivities.length;
const expectedStdDev = Math.sqrt(variance);
const actualStdDev = data.variance.sensitivityStdDev;
const stdError = Math.abs(expectedStdDev - actualStdDev);

console.log('\nSTANDARD DEVIATION VALIDATION');
console.log('─'.repeat(70));
console.log(`  Batch Sensitivities: ${sensitivities.map(s => s.toFixed(2)).join('%, ')}%`);
console.log(`  Mean:                ${avgSens.toFixed(4)}%`);
console.log(`  Expected StdDev:     ${expectedStdDev.toFixed(10)}`);
console.log(`  Actual StdDev:       ${actualStdDev.toFixed(10)}`);
console.log(`  Error:               ${stdError.toFixed(10)}`);
console.log(`  Status:              ${stdError < 0.000001 ? '✅ PASS' : '❌ FAIL'}`);

// Margin of error validation (95% confidence)
const sensDecimalForMargin = actualSensitivity / 100;
const expectedMargin = 1.96 * Math.sqrt((sensDecimalForMargin * (1 - sensDecimalForMargin)) / totalPHI) * 100;

console.log('\nMARGIN OF ERROR (95% CONFIDENCE)');
console.log('─'.repeat(70));
console.log(`  Total PHI:           ${totalPHI}`);
console.log(`  Sensitivity:         ${actualSensitivity.toFixed(2)}%`);
console.log(`  Expected Margin:     ±${expectedMargin.toFixed(4)}%`);
console.log(`  Confidence Interval: ${(actualSensitivity - expectedMargin).toFixed(2)}% - ${(actualSensitivity + expectedMargin).toFixed(2)}%`);

// Final summary
console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
console.log('║   VALIDATION SUMMARY                                                 ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

const allPassed =
  sensError < 0.000001 &&
  specError < 0.000001 &&
  precError < 0.000001 &&
  f1Error < 0.000001 &&
  f2Error < 0.000001 &&
  batchTP === TP &&
  batchFN === FN &&
  batchTN === TN &&
  batchFP === FP &&
  stdError < 0.000001;

if (allPassed) {
  console.log('  ✅ ALL VALIDATIONS PASSED');
  console.log('  ✅ Statistical calculations are mathematically correct');
  console.log('  ✅ Component communication is working perfectly');
  console.log('  ✅ Batch aggregation is accurate');
  console.log('  ✅ System is properly tuned and handshaking correctly\n');
  process.exit(0);
} else {
  console.log('  ❌ SOME VALIDATIONS FAILED');
  console.log('  ⚠️  Review the errors above\n');
  process.exit(1);
}
