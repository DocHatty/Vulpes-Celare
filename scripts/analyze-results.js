#!/usr/bin/env node
/**
 * Vulpes Celare - Test Results Analyzer
 * Self-correcting script that avoids shell escaping issues
 */

const fs = require('fs');
const path = require('path');

const resultsDir = path.join(__dirname, '..', 'tests', 'results');

function loadLatestResults(count = 7) {
  const files = fs.readdirSync(resultsDir)
    .filter(f => f.startsWith('assessment-') && f.endsWith('.json'))
    .sort()
    .slice(-count);

  return files.map(f => JSON.parse(fs.readFileSync(path.join(resultsDir, f))));
}

function aggregateResults(results) {
  const agg = {
    totalDocs: results.length * 200,
    tp: 0, fn: 0, fp: 0, tn: 0,
    byPHIType: {},
    byErrorLevel: {},
    failures: [],
    overRedactions: []
  };

  results.forEach(data => {
    const cm = data.metrics.confusionMatrix;
    agg.tp += cm.truePositives;
    agg.fn += cm.falseNegatives;
    agg.fp += cm.falsePositives;
    agg.tn += cm.trueNegatives;

    // Aggregate by PHI type
    Object.entries(data.metrics.byPHIType).forEach(([type, stats]) => {
      if (!agg.byPHIType[type]) {
        agg.byPHIType[type] = { tp: 0, fn: 0, total: 0 };
      }
      agg.byPHIType[type].tp += stats.tp;
      agg.byPHIType[type].fn += stats.fn;
      agg.byPHIType[type].total += stats.total;
    });

    // Aggregate by error level
    Object.entries(data.metrics.byErrorLevel).forEach(([level, stats]) => {
      if (!agg.byErrorLevel[level]) {
        agg.byErrorLevel[level] = { tp: 0, fn: 0, tn: 0, fp: 0 };
      }
      agg.byErrorLevel[level].tp += stats.tp;
      agg.byErrorLevel[level].fn += stats.fn;
      agg.byErrorLevel[level].tn += stats.tn;
      agg.byErrorLevel[level].fp += stats.fp;
    });

    agg.failures.push(...data.failures);
    agg.overRedactions.push(...data.overRedactions);
  });

  agg.sensitivity = agg.tp / (agg.tp + agg.fn) * 100;
  agg.specificity = agg.tn / (agg.tn + agg.fp) * 100;
  agg.precision = agg.tp / (agg.tp + agg.fp) * 100;
  agg.f1 = 2 * (agg.precision * agg.sensitivity) / (agg.precision + agg.sensitivity);
  agg.f2 = 5 * (agg.precision * agg.sensitivity) / (4 * agg.precision + agg.sensitivity);

  return agg;
}

function categorizePattern(value, type) {
  const v = value;

  if (type === 'DATE') {
    if (/--/.test(v)) return 'double_separator';
    if (/\d{4}-\s/.test(v) || /\s-\d/.test(v)) return 'space_around_dash';
    if (/\/\s+/.test(v) || /\s+\//.test(v)) return 'space_around_slash';
    if (/[A-Za-z]/.test(v) && /\d/.test(v)) return 'ocr_letter_substitution';
    if (/\/\//.test(v)) return 'double_slash';
    if (/^\d{1,2}\/\d{3,}$/.test(v)) return 'malformed_year';
    return 'other_date';
  }

  if (type === 'NAME') {
    if (/\d/.test(v)) return 'ocr_digit_in_name';
    if (/[A-Z]\.\s/.test(v)) return 'middle_initial';
    if (/,\s*[A-Z]/.test(v)) return 'lastname_first_format';
    if (/\s{2,}/.test(v)) return 'extra_spaces';
    if (v === v.toUpperCase() && v.length > 5) return 'all_caps';
    if (v === v.toLowerCase()) return 'all_lowercase';
    if (/[@!0-9]/.test(v)) return 'ocr_special_chars';
    return 'other_name';
  }

  if (type === 'SSN') {
    if (/[xX\*]/.test(v)) return 'masked_ssn';
    if (/[A-Za-z]/.test(v)) return 'ocr_letter_substitution';
    if (/\s{2,}/.test(v)) return 'extra_spaces';
    return 'other_ssn';
  }

  if (type === 'MRN') {
    if (/^[A-Z]{2,4}[:\s]/.test(v)) return 'prefix_variation';
    if (/\s/.test(v)) return 'spaces_in_mrn';
    if (/[|]/.test(v)) return 'ocr_pipe_char';
    return 'other_mrn';
  }

  return 'uncategorized';
}

function analyzeFailurePatterns(failures) {
  const patterns = {};

  failures.forEach(f => {
    const category = categorizePattern(f.value, f.phiType);
    const key = `${f.phiType}:${category}`;

    if (!patterns[key]) {
      patterns[key] = { count: 0, examples: [] };
    }
    patterns[key].count++;
    if (patterns[key].examples.length < 5) {
      patterns[key].examples.push(f.value);
    }
  });

  return Object.entries(patterns)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([key, data]) => ({
      pattern: key,
      type: key.split(':')[0],
      category: key.split(':')[1],
      count: data.count,
      examples: [...new Set(data.examples)]
    }));
}

function generateReport(agg) {
  const line = '='.repeat(80);
  const subline = '-'.repeat(80);

  console.log(line);
  console.log('VULPES CELARE - FORMAL EVALUATION REPORT');
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log(`Documents Analyzed: ${agg.totalDocs}`);
  console.log(line);

  console.log('\n1. EXECUTIVE SUMMARY\n' + subline);
  console.log(`   Sensitivity: ${agg.sensitivity.toFixed(2)}% (Target: >=99%) Gap: ${(99 - agg.sensitivity).toFixed(2)}%`);
  console.log(`   Specificity: ${agg.specificity.toFixed(2)}% (Target: >=96%) Gap: ${(96 - agg.specificity).toFixed(2)}%`);
  console.log(`   Precision:   ${agg.precision.toFixed(2)}%`);
  console.log(`   F1 Score:    ${agg.f1.toFixed(2)}`);
  console.log(`   F2 Score:    ${agg.f2.toFixed(2)} (HIPAA standard)`);
  console.log(`\n   Status: ${agg.sensitivity >= 99 && agg.specificity >= 96 ? 'PASSING' : 'NEEDS IMPROVEMENT'}`);

  console.log('\n2. CONFUSION MATRIX\n' + subline);
  console.log(`   True Positives (PHI caught):     ${agg.tp}`);
  console.log(`   False Negatives (PHI MISSED):    ${agg.fn} <- CRITICAL`);
  console.log(`   False Positives (over-redacted): ${agg.fp}`);
  console.log(`   True Negatives (correct):        ${agg.tn}`);

  console.log('\n3. PERFORMANCE BY PHI TYPE\n' + subline);
  const types = Object.entries(agg.byPHIType)
    .map(([type, stats]) => ({
      type,
      ...stats,
      rate: stats.tp / stats.total * 100
    }))
    .sort((a, b) => a.rate - b.rate);

  console.log('   ' + 'Type'.padEnd(18) + 'Rate'.padStart(8) + 'Missed'.padStart(10) + 'Total'.padStart(10) + '  Status');
  types.forEach(t => {
    const status = t.rate >= 99 ? 'PASS' : t.rate >= 97 ? 'CLOSE' : 'FAIL';
    console.log('   ' + t.type.padEnd(18) + (t.rate.toFixed(1) + '%').padStart(8) + t.fn.toString().padStart(10) + t.total.toString().padStart(10) + '  ' + status);
  });

  console.log('\n4. PERFORMANCE BY ERROR LEVEL (OCR Simulation)\n' + subline);
  const levels = ['none', 'low', 'medium', 'high', 'extreme'];
  levels.forEach(level => {
    const s = agg.byErrorLevel[level];
    if (s) {
      const sens = (s.tp / (s.tp + s.fn) * 100).toFixed(1);
      const spec = (s.tn / (s.tn + s.fp) * 100).toFixed(1);
      console.log(`   ${level.toUpperCase().padEnd(10)} Sens: ${sens}%  Spec: ${spec}%  (Missed: ${s.fn})`);
    }
  });

  console.log('\n5. FAILURE PATTERN ANALYSIS\n' + subline);
  const patterns = analyzeFailurePatterns(agg.failures);
  patterns.slice(0, 15).forEach((p, i) => {
    console.log(`   ${(i+1).toString().padStart(2)}. ${p.pattern} (${p.count} failures)`);
    p.examples.slice(0, 3).forEach(ex => console.log(`       "${ex}"`));
  });

  console.log('\n6. OVER-REDACTION ANALYSIS\n' + subline);
  const overByType = {};
  agg.overRedactions.forEach(o => {
    if (!overByType[o.type]) overByType[o.type] = 0;
    overByType[o.type]++;
  });
  Object.entries(overByType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`   ${type.padEnd(20)} ${count} over-redactions`);
    });

  console.log('\n7. PRIORITY RECOMMENDATIONS\n' + subline);
  const criticalTypes = types.filter(t => t.rate < 97 && t.fn > 10);
  criticalTypes.forEach((t, i) => {
    const patternInfo = patterns.filter(p => p.type === t.type).slice(0, 3);
    console.log(`   ${i+1}. FIX ${t.type} (${t.fn} missed, ${t.rate.toFixed(1)}% rate)`);
    patternInfo.forEach(p => {
      console.log(`      - ${p.category}: ${p.count} failures`);
    });
  });

  console.log('\n' + line);
  console.log('END OF REPORT');
  console.log(line);

  // Save aggregated data
  const outPath = path.join(resultsDir, 'aggregated-analysis.json');
  fs.writeFileSync(outPath, JSON.stringify(agg, null, 2));
  console.log(`\nAggregated data saved to: ${outPath}`);
}

// Main execution
const results = loadLatestResults(7);
console.log(`Loaded ${results.length} result files\n`);
const aggregated = aggregateResults(results);
generateReport(aggregated);
