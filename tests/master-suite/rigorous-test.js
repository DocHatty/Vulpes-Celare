#!/usr/bin/env node

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    RIGOROUS STATISTICAL TESTING SYSTEM                       ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  This system ensures we TRULY KNOW whether changes help or hurt.             ║
 * ║                                                                              ║
 * ║  PRINCIPLES:                                                                 ║
 * ║  1. Multiple runs (different seeds) for statistical significance             ║
 * ║  2. Root cause analysis - WHY each failure occurred                          ║
 * ║  3. A/B comparison - isolated impact measurement                             ║
 * ║  4. Variance analysis - distinguish signal from noise                        ║
 * ║  5. Failure pattern clustering - find systemic issues                        ║
 * ║  6. PARALLEL EXECUTION - run multiple tests simultaneously                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
const os = require("os");

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate optimal parallel workers based on system resources
 * - Uses ~25% of CPUs to leave headroom for the system
 * - Minimum 2 workers for parallelism benefit
 * - Maximum 8 workers (diminishing returns beyond this)
 * - Scales down if memory is limited (<8GB = serial mode)
 */
function calculateOptimalWorkers() {
  const cpus = os.cpus().length;
  const totalMemGB = os.totalmem() / 1024 / 1024 / 1024;
  
  // Low memory systems should avoid parallel execution
  if (totalMemGB < 8) {
    return 1; // Serial mode
  }
  
  // Calculate based on CPU count (~25% utilization, clamped 2-8)
  const cpuBasedWorkers = Math.max(2, Math.min(8, Math.floor(cpus * 0.25)));
  
  // Further limit if memory is constrained (each worker needs ~2GB headroom)
  const memoryBasedWorkers = Math.floor(totalMemGB / 4);
  
  return Math.min(cpuBasedWorkers, memoryBasedWorkers);
}

const CONFIG = {
  // Statistical significance requires multiple runs
  numRuns: 5,                    // Number of test runs per configuration
  docsPerRun: 50,                // Documents per run (50 = fast, 200 = thorough)
  seeds: [1337, 42, 7777, 9999, 12345], // Different seeds for variance
  
  // Parallel execution - dynamic based on system resources
  maxParallelWorkers: calculateOptimalWorkers(),
  
  // Significance thresholds
  minSignificantDelta: 0.5,     // Minimum % change to be considered significant
  confidenceLevel: 0.95,         // 95% confidence interval
  
  // Output paths
  resultsDir: path.join(__dirname, "..", "results", "rigorous"),
  baselineFile: path.join(__dirname, "..", "results", "rigorous", "baseline.json"),
};

// ═══════════════════════════════════════════════════════════════════════════════
// WORKER THREAD LOGIC (runs tests in parallel)
// ═══════════════════════════════════════════════════════════════════════════════

if (!isMainThread) {
  // This code runs in worker threads
  const { seed, docs, envOverrides, projectRoot } = workerData;
  
  runTestInWorker(seed, docs, envOverrides, projectRoot)
    .then(result => parentPort.postMessage({ success: true, result }))
    .catch(error => parentPort.postMessage({ success: false, error: error.message }));
}

async function runTestInWorker(seed, docs, envOverrides, projectRoot) {
  const env = { ...process.env, ...envOverrides };
  
  const cmd = `node tests/master-suite/run.js --seed=${seed} --docs=${docs} --json-only 2>&1`;
  
  const output = execSync(cmd, {
    cwd: projectRoot,
    env,
    maxBuffer: 50 * 1024 * 1024,
    timeout: 300000,
  }).toString();
  
  // Find the JSON result file
  const jsonMatch = output.match(/JSON: (.+\.json)/);
  if (!jsonMatch) {
    throw new Error("Could not find JSON result file in output");
  }
  
  const jsonPath = jsonMatch[1];
  const result = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  
  // Map failures to expected format (JSON has 'failures' with 'phiType', not 'missedPHI' with 'type')
  const failures = (result.failures || []).map(f => ({
    type: f.phiType || f.type,
    value: f.value,
    source: f.source,
    context: f.context,
    docId: f.docId,
    errorLevel: f.errorLevel,
  }));
  
  // Build byType stats from the failures
  const byType = {};
  if (result.metrics?.byType) {
    for (const [type, data] of Object.entries(result.metrics.byType)) {
      byType[type] = {
        detected: data.detected || 0,
        total: data.total || 0,
      };
    }
  }
  
  return {
    seed,
    docs,
    metrics: {
      sensitivity: result.metrics?.sensitivity || 0,
      specificity: result.metrics?.specificity || 0,
      f1: result.metrics?.f1Score || 0,
      f2: result.metrics?.f2Score || 0,
      precision: result.metrics?.precision || 0,
    },
    failures,
    overRedactions: result.overRedactions || [],
    byType,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICAL UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr) {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const squareDiffs = arr.map(x => Math.pow(x - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function confidenceInterval(arr, level = 0.95) {
  const alpha = 1 - level;
  const lower = percentile(arr, alpha / 2);
  const upper = percentile(arr, 1 - alpha / 2);
  return { lower, upper, mean: mean(arr), stdDev: stdDev(arr) };
}

// Welch's t-test for comparing two samples with potentially different variances
function welchTTest(sample1, sample2) {
  const n1 = sample1.length;
  const n2 = sample2.length;
  const mean1 = mean(sample1);
  const mean2 = mean(sample2);
  const var1 = Math.pow(stdDev(sample1), 2);
  const var2 = Math.pow(stdDev(sample2), 2);
  
  if (var1 === 0 && var2 === 0) {
    return { t: mean1 === mean2 ? 0 : Infinity, significant: mean1 !== mean2 };
  }
  
  const se = Math.sqrt(var1 / n1 + var2 / n2);
  if (se === 0) {
    return { t: 0, significant: false, meanDiff: 0 };
  }
  const t = (mean1 - mean2) / se;
  
  // Degrees of freedom (Welch-Satterthwaite)
  const df = Math.pow(var1 / n1 + var2 / n2, 2) / 
    (Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1));
  
  // For 95% confidence with df >= 4, critical t is approximately 2.78
  const criticalT = 2.78;
  const significant = Math.abs(t) > criticalT;
  
  return { t, df, significant, meanDiff: mean1 - mean2 };
}

// Effect size (Cohen's d)
function cohensD(sample1, sample2) {
  const pooledStd = Math.sqrt((Math.pow(stdDev(sample1), 2) + Math.pow(stdDev(sample2), 2)) / 2);
  if (pooledStd === 0) return 0;
  return (mean(sample1) - mean(sample2)) / pooledStd;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT CAUSE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Categorizes WHY a PHI item was missed
 */
function categorizeFailure(phi) {
  const value = phi.value;
  const type = phi.type;
  
  const analysis = {
    phi,
    rootCause: "UNKNOWN",
    subCategory: null,
    confidence: 0,
    details: {},
  };
  
  // Check for OCR corruption patterns
  const hasSpaceInNumber = /\d\s+\d/.test(value);
  const hasOcrSubstitution = /[O0][0O]|[1lI][1lI]|[5S][5S]/.test(value);
  const hasWeirdChars = /[!@#$%^&*]/.test(value);
  const hasSpaceBeforePunct = /\s+[-\/]/.test(value) || /[-\/]\s+/.test(value);
  
  const ocrScore = [hasSpaceInNumber, hasOcrSubstitution, hasWeirdChars, hasSpaceBeforePunct]
    .filter(Boolean).length;
  
  if (ocrScore >= 1) {
    analysis.rootCause = "OCR_CORRUPTION";
    analysis.confidence = 0.7 + ocrScore * 0.1;
    if (hasSpaceInNumber) analysis.subCategory = "SPACE_IN_NUMBER";
    else if (hasOcrSubstitution) analysis.subCategory = "CHAR_SUBSTITUTION";
    else if (hasWeirdChars) analysis.subCategory = "SYMBOL_NOISE";
    else analysis.subCategory = "SPACE_AROUND_PUNCT";
    return analysis;
  }
  
  // Type-specific analysis
  if (type === "NAME") {
    if (value.includes(",")) {
      const parts = value.split(",").map(s => s.trim());
      if (parts.length === 2 && parts[0].length > 0 && parts[1].length > 0) {
        analysis.rootCause = "FORMAT_VARIATION";
        analysis.subCategory = "LAST_COMMA_FIRST";
        analysis.confidence = 0.9;
        return analysis;
      }
    }
    if (value === value.toUpperCase() && value.length > 3) {
      analysis.rootCause = "FORMAT_VARIATION";
      analysis.subCategory = "ALL_CAPS";
      analysis.confidence = 0.9;
      return analysis;
    }
    if (value.includes("'")) {
      analysis.rootCause = "SPECIAL_CHARACTERS";
      analysis.subCategory = "APOSTROPHE";
      analysis.confidence = 0.85;
      return analysis;
    }
    if (value.includes("-")) {
      analysis.rootCause = "SPECIAL_CHARACTERS";
      analysis.subCategory = "HYPHEN";
      analysis.confidence = 0.85;
      return analysis;
    }
    if (/\b(Jr|Sr|II|III|IV|V|MD|PhD|DO|RN|NP|PA)\b/i.test(value)) {
      analysis.rootCause = "FORMAT_VARIATION";
      analysis.subCategory = "WITH_SUFFIX";
      analysis.confidence = 0.9;
      return analysis;
    }
    if (value.split(/\s+/).length >= 3) {
      analysis.rootCause = "FORMAT_VARIATION";
      analysis.subCategory = "MULTI_PART_NAME";
      analysis.confidence = 0.85;
      return analysis;
    }
    // Check for typos/OCR in name
    if (/[0-9]/.test(value)) {
      analysis.rootCause = "OCR_CORRUPTION";
      analysis.subCategory = "DIGIT_IN_NAME";
      analysis.confidence = 0.9;
      return analysis;
    }
  }
  
  if (type === "DATE") {
    if (/\s+/.test(value.replace(/^\s+|\s+$/g, ""))) {
      analysis.rootCause = "OCR_CORRUPTION";
      analysis.subCategory = "SPACE_INSERTION";
      analysis.confidence = 0.9;
      return analysis;
    }
    if (/[!|]/.test(value)) {
      analysis.rootCause = "OCR_CORRUPTION";
      analysis.subCategory = "CHAR_SUBSTITUTION";
      analysis.confidence = 0.85;
      return analysis;
    }
  }
  
  if (type === "ADDRESS") {
    if (!value.match(/\d+/)) {
      analysis.rootCause = "FORMAT_VARIATION";
      analysis.subCategory = "NO_STREET_NUMBER";
      analysis.confidence = 0.7;
      return analysis;
    }
    const words = value.split(/\s+/);
    if (words.length <= 2) {
      analysis.rootCause = "FORMAT_VARIATION";
      analysis.subCategory = "TOO_SHORT";
      analysis.confidence = 0.75;
      return analysis;
    }
  }
  
  if (type === "AGE_90_PLUS") {
    const ageNum = parseInt(value.replace(/\D/g, ""), 10);
    if (ageNum >= 90 && ageNum <= 120) {
      analysis.rootCause = "DETECTION_GAP";
      analysis.subCategory = "AGE_NOT_FLAGGED";
      analysis.confidence = 0.95;
      return analysis;
    }
  }
  
  if (type === "SSN") {
    if (!/^\d{3}-?\d{2}-?\d{4}$/.test(value.replace(/\s/g, ""))) {
      analysis.rootCause = "OCR_CORRUPTION";
      analysis.subCategory = "SSN_CORRUPTED";
      analysis.confidence = 0.9;
      return analysis;
    }
  }
  
  if (type === "LICENSE_PLATE") {
    if (/undefined|null/i.test(value)) {
      analysis.rootCause = "DATA_GENERATION_BUG";
      analysis.subCategory = "INVALID_TEST_DATA";
      analysis.confidence = 0.99;
      return analysis;
    }
  }
  
  // Default: pattern not in filter
  analysis.rootCause = "PATTERN_MISSING";
  analysis.subCategory = "UNKNOWN_FORMAT";
  analysis.confidence = 0.5;
  return analysis;
}

/**
 * Cluster failures by root cause
 */
function clusterFailures(failures) {
  const clusters = {};
  
  for (const failure of failures) {
    const key = `${failure.phi.type}|${failure.rootCause}|${failure.subCategory || "NONE"}`;
    if (!clusters[key]) {
      clusters[key] = {
        type: failure.phi.type,
        rootCause: failure.rootCause,
        subCategory: failure.subCategory,
        count: 0,
        examples: [],
        totalConfidence: 0,
      };
    }
    clusters[key].count++;
    if (clusters[key].examples.length < 5) {
      clusters[key].examples.push(failure.phi.value);
    }
    clusters[key].totalConfidence += failure.confidence;
  }
  
  // Calculate average confidence and sort
  const result = Object.values(clusters).map(c => ({
    ...c,
    avgConfidence: c.totalConfidence / c.count,
  }));
  
  return result.sort((a, b) => b.count - a.count);
}

/**
 * Generate actionable fix recommendations
 */
function generateRecommendations(clusters) {
  const recommendations = [];
  
  for (const cluster of clusters.slice(0, 10)) {
    const rec = {
      priority: cluster.count >= 10 ? "HIGH" : cluster.count >= 5 ? "MEDIUM" : "LOW",
      type: cluster.type,
      issue: `${cluster.rootCause}/${cluster.subCategory}`,
      count: cluster.count,
      examples: cluster.examples,
      action: "",
      file: "",
    };
    
    // Generate specific action based on root cause
    if (cluster.rootCause === "OCR_CORRUPTION") {
      rec.action = `Add OCR-tolerant patterns to handle ${cluster.subCategory}`;
      rec.file = `src/filters/${cluster.type}FilterSpan.ts or src/utils/OcrNormalizer.ts`;
    } else if (cluster.rootCause === "FORMAT_VARIATION") {
      rec.action = `Add regex pattern for ${cluster.subCategory} format`;
      rec.file = `src/filters/${cluster.type === "NAME" ? "SmartName" : cluster.type}FilterSpan.ts`;
    } else if (cluster.rootCause === "SPECIAL_CHARACTERS") {
      rec.action = `Update regex to handle ${cluster.subCategory} in ${cluster.type}`;
      rec.file = `src/filters/${cluster.type === "NAME" ? "SmartName" : cluster.type}FilterSpan.ts`;
    } else if (cluster.rootCause === "DETECTION_GAP") {
      rec.action = `Ensure ${cluster.type} detection covers this case`;
      rec.file = `src/filters/${cluster.type.replace(/_/g, "")}FilterSpan.ts`;
    } else if (cluster.rootCause === "DATA_GENERATION_BUG") {
      rec.action = `Fix test data generator - producing invalid ${cluster.type} values`;
      rec.file = `tests/master-suite/generators/`;
    } else {
      rec.action = `Investigate ${cluster.type} detection for pattern: ${cluster.examples[0]}`;
      rec.file = `src/filters/`;
    }
    
    recommendations.push(rec);
  }
  
  return recommendations;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARALLEL TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

function runTestWorker(seed, docs, envOverrides) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, {
      workerData: {
        seed,
        docs,
        envOverrides,
        projectRoot: path.join(__dirname, "..", ".."),
      },
    });
    
    worker.on("message", (msg) => {
      if (msg.success) {
        resolve({ success: true, ...msg.result });
      } else {
        resolve({ success: false, seed, docs, error: msg.error });
      }
    });
    
    worker.on("error", (err) => {
      resolve({ success: false, seed, docs, error: err.message });
    });
    
    worker.on("exit", (code) => {
      if (code !== 0) {
        resolve({ success: false, seed, docs, error: `Worker exited with code ${code}` });
      }
    });
  });
}

async function runSingleTestSerial(seed, docs, envOverrides = {}) {
  const env = { ...process.env, ...envOverrides };
  
  const cmd = `node tests/master-suite/run.js --seed=${seed} --docs=${docs} --json-only 2>&1`;
  
  try {
    const output = execSync(cmd, {
      cwd: path.join(__dirname, "..", ".."),
      env,
      maxBuffer: 50 * 1024 * 1024,
      timeout: 300000,
    }).toString();
    
    const jsonMatch = output.match(/JSON: (.+\.json)/);
    if (!jsonMatch) {
      throw new Error("Could not find JSON result file");
    }
    
    const result = JSON.parse(fs.readFileSync(jsonMatch[1], "utf-8"));
    
    // Map failures to expected format
    const failures = (result.failures || []).map(f => ({
      type: f.phiType || f.type,
      value: f.value,
      source: f.source,
      context: f.context,
      docId: f.docId,
      errorLevel: f.errorLevel,
    }));
    
    // Build byType stats
    const byType = {};
    if (result.metrics?.byType) {
      for (const [type, data] of Object.entries(result.metrics.byType)) {
        byType[type] = {
          detected: data.detected || 0,
          total: data.total || 0,
        };
      }
    }
    
    return {
      success: true,
      seed,
      docs,
      metrics: {
        sensitivity: result.metrics?.sensitivity || 0,
        specificity: result.metrics?.specificity || 0,
        f1: result.metrics?.f1Score || 0,
        f2: result.metrics?.f2Score || 0,
        precision: result.metrics?.precision || 0,
      },
      failures,
      overRedactions: result.overRedactions || [],
      byType,
    };
  } catch (error) {
    return { success: false, seed, docs, error: error.message };
  }
}

async function runMultipleTestsParallel(config, envOverrides = {}, useParallel = true) {
  console.log(`\n${"═".repeat(80)}`);
  console.log(`  Running ${config.numRuns} tests with ${config.docsPerRun} docs each`);
  console.log(`  Mode: ${useParallel ? `PARALLEL (${config.maxParallelWorkers} workers)` : "SERIAL"}`);
  console.log(`${"═".repeat(80)}\n`);
  
  const startTime = Date.now();
  
  if (useParallel) {
    // Run tests in parallel batches
    const results = [];
    const tasks = config.seeds.slice(0, config.numRuns).map((seed, i) => ({
      seed: seed || Math.floor(Math.random() * 100000),
      index: i,
    }));
    
    // Process in batches
    for (let i = 0; i < tasks.length; i += config.maxParallelWorkers) {
      const batch = tasks.slice(i, i + config.maxParallelWorkers);
      console.log(`  Batch ${Math.floor(i / config.maxParallelWorkers) + 1}: Running ${batch.length} tests in parallel...`);
      
      const batchPromises = batch.map(task => 
        runTestWorker(task.seed, config.docsPerRun, envOverrides)
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      for (const result of batchResults) {
        results.push(result);
        const status = result.success 
          ? `✓ Sens=${result.metrics.sensitivity.toFixed(2)}% Spec=${result.metrics.specificity.toFixed(2)}%`
          : `✗ ${result.error}`;
        console.log(`    seed=${result.seed}: ${status}`);
      }
    }
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n  Completed ${results.length} tests in ${elapsed}s`);
    return results;
    
  } else {
    // Serial execution
    const results = [];
    for (let i = 0; i < config.numRuns; i++) {
      const seed = config.seeds[i] || Math.floor(Math.random() * 100000);
      process.stdout.write(`  Run ${i + 1}/${config.numRuns} (seed=${seed})... `);
      
      const result = await runSingleTestSerial(seed, config.docsPerRun, envOverrides);
      results.push(result);
      
      if (result.success) {
        console.log(`✓ Sens=${result.metrics.sensitivity.toFixed(2)}% Spec=${result.metrics.specificity.toFixed(2)}%`);
      } else {
        console.log(`✗ ${result.error}`);
      }
    }
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n  Completed ${results.length} tests in ${elapsed}s`);
    return results;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYSIS ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function analyzeResults(results, label = "Results") {
  const successful = results.filter(r => r.success);
  if (successful.length === 0) {
    return { error: "No successful runs", label };
  }
  
  const metrics = {
    sensitivity: successful.map(r => r.metrics.sensitivity),
    specificity: successful.map(r => r.metrics.specificity),
    f1: successful.map(r => r.metrics.f1),
    f2: successful.map(r => r.metrics.f2),
    precision: successful.map(r => r.metrics.precision),
  };
  
  // Calculate statistics
  const stats = {};
  for (const [key, values] of Object.entries(metrics)) {
    stats[key] = confidenceInterval(values, CONFIG.confidenceLevel);
  }
  
  // Aggregate failures for root cause analysis
  const allFailures = [];
  for (const result of successful) {
    for (const phi of result.failures) {
      const analysis = categorizeFailure(phi);
      allFailures.push(analysis);
    }
  }
  
  const failureClusters = clusterFailures(allFailures);
  const recommendations = generateRecommendations(failureClusters);
  
  // Aggregate by type
  const byType = {};
  for (const result of successful) {
    for (const [type, data] of Object.entries(result.byType)) {
      if (!byType[type]) {
        byType[type] = { detected: [], total: [], rate: [] };
      }
      byType[type].detected.push(data.detected || 0);
      byType[type].total.push(data.total || 0);
      if (data.total > 0) {
        byType[type].rate.push((data.detected / data.total) * 100);
      }
    }
  }
  
  const byTypeStats = {};
  for (const [type, data] of Object.entries(byType)) {
    byTypeStats[type] = {
      meanRate: mean(data.rate),
      stdDev: stdDev(data.rate),
      meanMissed: mean(data.total) - mean(data.detected),
      ci: confidenceInterval(data.rate),
    };
  }
  
  return {
    label,
    numRuns: successful.length,
    failedRuns: results.length - successful.length,
    stats,
    failureClusters,
    recommendations,
    byTypeStats,
    totalFailures: allFailures.length,
    avgFailuresPerRun: allFailures.length / successful.length,
    raw: successful,
  };
}

function compareResults(baseline, experimental) {
  const comparison = {
    label: `${baseline.label} vs ${experimental.label}`,
    metrics: {},
    overallSignificant: false,
    recommendation: "",
    details: [],
  };
  
  for (const metric of ["sensitivity", "specificity", "f1", "f2", "precision"]) {
    const baselineValues = baseline.raw.map(r => r.metrics[metric]);
    const experimentalValues = experimental.raw.map(r => r.metrics[metric]);
    
    const ttest = welchTTest(experimentalValues, baselineValues);
    const effectSize = cohensD(experimentalValues, baselineValues);
    const baselineCI = confidenceInterval(baselineValues);
    const experimentalCI = confidenceInterval(experimentalValues);
    
    comparison.metrics[metric] = {
      baseline: baselineCI,
      experimental: experimentalCI,
      delta: experimentalCI.mean - baselineCI.mean,
      deltaPercent: baselineCI.mean !== 0 
        ? ((experimentalCI.mean - baselineCI.mean) / baselineCI.mean) * 100 
        : 0,
      significant: ttest.significant,
      tStatistic: ttest.t,
      effectSize,
      effectMagnitude: Math.abs(effectSize) < 0.2 ? "negligible" :
                       Math.abs(effectSize) < 0.5 ? "small" :
                       Math.abs(effectSize) < 0.8 ? "medium" : "large",
      direction: experimentalCI.mean > baselineCI.mean + 0.01 ? "BETTER" : 
                 experimentalCI.mean < baselineCI.mean - 0.01 ? "WORSE" : "SAME",
    };
    
    if (ttest.significant) {
      comparison.overallSignificant = true;
    }
  }
  
  // Generate detailed recommendation
  const sens = comparison.metrics.sensitivity;
  const spec = comparison.metrics.specificity;
  const f2 = comparison.metrics.f2;
  
  if (sens.significant && sens.direction === "WORSE") {
    comparison.recommendation = "REJECT";
    comparison.details.push("❌ CRITICAL: Sensitivity regression detected");
    comparison.details.push(`   Sensitivity dropped by ${Math.abs(sens.delta).toFixed(2)}% (${sens.effectMagnitude} effect)`);
  } else if (sens.significant && sens.direction === "BETTER") {
    if (spec.significant && spec.direction === "WORSE" && Math.abs(spec.delta) > 2) {
      comparison.recommendation = "REVIEW";
      comparison.details.push("⚠️ Mixed results: Sensitivity improved but specificity dropped significantly");
      comparison.details.push(`   Sensitivity: +${sens.delta.toFixed(2)}%, Specificity: ${spec.delta.toFixed(2)}%`);
    } else {
      comparison.recommendation = "ACCEPT";
      comparison.details.push("✅ Sensitivity improved");
      comparison.details.push(`   +${sens.delta.toFixed(2)}% (${sens.effectMagnitude} effect)`);
    }
  } else if (f2.significant && f2.direction === "BETTER") {
    comparison.recommendation = "ACCEPT";
    comparison.details.push("✅ F2 score improved (HIPAA standard metric)");
  } else if (spec.significant && spec.direction === "BETTER" && 
             (!sens.significant || sens.direction !== "WORSE")) {
    comparison.recommendation = "ACCEPT";
    comparison.details.push("✅ Specificity improved without sensitivity regression");
  } else if (!comparison.overallSignificant) {
    comparison.recommendation = "NO_EFFECT";
    comparison.details.push("○ No statistically significant difference detected");
    comparison.details.push("  The change has no measurable impact on metrics");
  } else {
    comparison.recommendation = "REVIEW";
    comparison.details.push("⚠️ Mixed or unclear results - manual review needed");
  }
  
  return comparison;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTING
// ═══════════════════════════════════════════════════════════════════════════════

function printAnalysis(analysis) {
  if (analysis.error) {
    console.log(`\n  ERROR: ${analysis.error}\n`);
    return;
  }
  
  console.log(`\n${"═".repeat(80)}`);
  console.log(`  ${analysis.label.toUpperCase()}`);
  console.log(`  ${analysis.numRuns} successful runs, ${analysis.failedRuns} failed`);
  console.log(`${"═".repeat(80)}\n`);
  
  // Metrics summary
  console.log("  AGGREGATE METRICS (95% CI):");
  console.log(`  ${"─".repeat(76)}`);
  for (const [metric, stat] of Object.entries(analysis.stats)) {
    const ci = `[${stat.lower.toFixed(2)}, ${stat.upper.toFixed(2)}]`;
    const bar = "█".repeat(Math.floor(stat.mean / 5)) + "░".repeat(20 - Math.floor(stat.mean / 5));
    console.log(`    ${metric.padEnd(12)} ${bar} ${stat.mean.toFixed(2)}% ± ${stat.stdDev.toFixed(2)}%  ${ci}`);
  }
  
  // Detection by type
  console.log(`\n  DETECTION BY PHI TYPE:`);
  console.log(`  ${"─".repeat(76)}`);
  const sortedTypes = Object.entries(analysis.byTypeStats)
    .sort((a, b) => a[1].meanRate - b[1].meanRate);
  for (const [type, stat] of sortedTypes) {
    const bar = "█".repeat(Math.floor(stat.meanRate / 5)) + "░".repeat(20 - Math.floor(stat.meanRate / 5));
    const status = stat.meanRate >= 99.5 ? "✓" : stat.meanRate >= 95 ? "○" : "✗";
    const missed = stat.meanMissed.toFixed(1);
    console.log(`    ${status} ${type.padEnd(15)} ${bar} ${stat.meanRate.toFixed(1)}% (±${stat.stdDev.toFixed(1)}%, ~${missed}/run missed)`);
  }
  
  // Root cause analysis
  if (analysis.failureClusters.length > 0) {
    console.log(`\n  ROOT CAUSE ANALYSIS (${analysis.totalFailures} total failures, ${analysis.avgFailuresPerRun.toFixed(1)}/run):`);
    console.log(`  ${"─".repeat(76)}`);
    for (const cluster of analysis.failureClusters.slice(0, 10)) {
      const pct = ((cluster.count / analysis.totalFailures) * 100).toFixed(1);
      console.log(`    [${cluster.count.toString().padStart(3)} | ${pct.padStart(5)}%] ${cluster.type}/${cluster.rootCause}/${cluster.subCategory || "-"}`);
      console.log(`             Examples: ${cluster.examples.slice(0, 3).map(e => `"${e}"`).join(", ")}`);
    }
  }
  
  // Actionable recommendations
  if (analysis.recommendations.length > 0) {
    console.log(`\n  ACTIONABLE RECOMMENDATIONS:`);
    console.log(`  ${"─".repeat(76)}`);
    for (const rec of analysis.recommendations.slice(0, 5)) {
      const icon = rec.priority === "HIGH" ? "🔴" : rec.priority === "MEDIUM" ? "🟡" : "🟢";
      console.log(`    ${icon} [${rec.priority}] ${rec.type}: ${rec.issue} (${rec.count} cases)`);
      console.log(`       Action: ${rec.action}`);
      console.log(`       File:   ${rec.file}`);
    }
  }
}

function printComparison(comparison) {
  console.log(`\n${"═".repeat(80)}`);
  console.log(`  A/B COMPARISON`);
  console.log(`${"═".repeat(80)}\n`);
  
  // Recommendation banner
  const bannerChar = comparison.recommendation === "ACCEPT" ? "✅" :
                     comparison.recommendation === "REJECT" ? "❌" :
                     comparison.recommendation === "NO_EFFECT" ? "○" : "⚠️";
  
  console.log(`  ${bannerChar} RECOMMENDATION: ${comparison.recommendation}`);
  for (const detail of comparison.details) {
    console.log(`     ${detail}`);
  }
  
  // Detailed metrics table
  console.log(`\n  METRIC COMPARISON:`);
  console.log(`  ${"─".repeat(76)}`);
  console.log(`    ${"Metric".padEnd(12)} ${"Baseline".padEnd(22)} ${"Experimental".padEnd(22)} ${"Delta".padEnd(12)} ${"Sig?"}`);
  console.log(`  ${"─".repeat(76)}`);
  
  for (const [metric, data] of Object.entries(comparison.metrics)) {
    const baseStr = `${data.baseline.mean.toFixed(2)}% ±${data.baseline.stdDev.toFixed(2)}`;
    const expStr = `${data.experimental.mean.toFixed(2)}% ±${data.experimental.stdDev.toFixed(2)}`;
    const deltaStr = `${data.delta >= 0 ? "+" : ""}${data.delta.toFixed(2)}%`;
    const sigStr = data.significant 
      ? (data.direction === "BETTER" ? "✓ BETTER" : data.direction === "WORSE" ? "✗ WORSE" : "= SAME")
      : "- N/S";
    
    console.log(`    ${metric.padEnd(12)} ${baseStr.padEnd(22)} ${expStr.padEnd(22)} ${deltaStr.padEnd(12)} ${sigStr}`);
  }
  
  // Effect sizes
  console.log(`\n  EFFECT SIZES (Cohen's d):`);
  console.log(`  ${"─".repeat(76)}`);
  for (const [metric, data] of Object.entries(comparison.metrics)) {
    if (data.significant) {
      console.log(`    ${metric.padEnd(12)} d=${data.effectSize.toFixed(3)} (${data.effectMagnitude})`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CLI
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  // Only run main logic in main thread
  if (!isMainThread) return;
  
  const args = process.argv.slice(2);
  const command = args[0] || "help";
  
  // Parse flags
  const useSerial = args.includes("--serial");
  const useParallel = !useSerial;
  
  // Ensure results directory exists
  if (!fs.existsSync(CONFIG.resultsDir)) {
    fs.mkdirSync(CONFIG.resultsDir, { recursive: true });
  }
  
  switch (command) {
    case "baseline": {
      console.log("\n  📊 Capturing BASELINE metrics...");
      console.log("  This will be used for future comparisons.\n");
      
      const results = await runMultipleTestsParallel(CONFIG, {}, useParallel);
      const analysis = analyzeResults(results, "BASELINE");
      
      printAnalysis(analysis);
      
      // Save baseline
      const saveData = {
        timestamp: new Date().toISOString(),
        config: CONFIG,
        analysis,
      };
      fs.writeFileSync(CONFIG.baselineFile, JSON.stringify(saveData, null, 2));
      console.log(`\n  💾 Baseline saved to: ${CONFIG.baselineFile}`);
      break;
    }
    
    case "compare": {
      if (!fs.existsSync(CONFIG.baselineFile)) {
        console.error("\n  ❌ ERROR: No baseline found. Run 'baseline' command first.\n");
        process.exit(1);
      }
      
      const savedBaseline = JSON.parse(fs.readFileSync(CONFIG.baselineFile, "utf-8"));
      console.log(`\n  📊 Comparing against baseline from ${savedBaseline.timestamp}`);
      
      const results = await runMultipleTestsParallel(CONFIG, {}, useParallel);
      const experimental = analyzeResults(results, "CURRENT");
      
      printAnalysis(experimental);
      
      const comparison = compareResults(savedBaseline.analysis, experimental);
      printComparison(comparison);
      
      // Save comparison
      const compFile = path.join(CONFIG.resultsDir, `comparison-${Date.now()}.json`);
      fs.writeFileSync(compFile, JSON.stringify({ 
        baseline: savedBaseline, 
        experimental, 
        comparison,
        timestamp: new Date().toISOString(),
      }, null, 2));
      console.log(`\n  💾 Comparison saved to: ${compFile}`);
      break;
    }
    
    case "analyze": {
      console.log("\n  📊 Analyzing current system state...\n");
      
      const results = await runMultipleTestsParallel(CONFIG, {}, useParallel);
      const analysis = analyzeResults(results, "CURRENT STATE");
      
      printAnalysis(analysis);
      break;
    }
    
    case "ab": {
      const envVar = args[1];
      const valA = args[2];
      const valB = args[3];
      
      if (!envVar || valA === undefined || valB === undefined) {
        console.log("\n  Usage: rigorous-test.js ab <ENV_VAR> <VALUE_A> <VALUE_B>");
        console.log("  Example: rigorous-test.js ab VULPES_USE_DATALOG 1 0\n");
        process.exit(1);
      }
      
      console.log(`\n  🔬 A/B Testing: ${envVar}`);
      console.log(`     Variant A: ${envVar}=${valA}`);
      console.log(`     Variant B: ${envVar}=${valB}\n`);
      
      // Run A
      console.log(`  Running Variant A (${envVar}=${valA})...`);
      const resultsA = await runMultipleTestsParallel(CONFIG, { [envVar]: valA }, useParallel);
      const analysisA = analyzeResults(resultsA, `${envVar}=${valA}`);
      
      // Run B
      console.log(`\n  Running Variant B (${envVar}=${valB})...`);
      const resultsB = await runMultipleTestsParallel(CONFIG, { [envVar]: valB }, useParallel);
      const analysisB = analyzeResults(resultsB, `${envVar}=${valB}`);
      
      printAnalysis(analysisA);
      printAnalysis(analysisB);
      
      const comparison = compareResults(analysisA, analysisB);
      printComparison(comparison);
      break;
    }
    
    case "quick": {
      console.log("\n  ⚡ Quick single-run analysis...\n");
      
      const result = await runSingleTestSerial(1337, 50);
      
      if (!result.success) {
        console.error(`  ❌ ERROR: ${result.error}\n`);
        process.exit(1);
      }
      
      console.log(`  METRICS:`);
      console.log(`    Sensitivity: ${result.metrics.sensitivity.toFixed(2)}%`);
      console.log(`    Specificity: ${result.metrics.specificity.toFixed(2)}%`);
      console.log(`    F1: ${result.metrics.f1.toFixed(2)}`);
      console.log(`    F2: ${result.metrics.f2.toFixed(2)}`);
      
      // Root cause analysis
      const failures = result.failures.map(phi => categorizeFailure(phi));
      const clusters = clusterFailures(failures);
      const recommendations = generateRecommendations(clusters);
      
      console.log(`\n  ROOT CAUSE ANALYSIS (${failures.length} failures):`);
      for (const cluster of clusters.slice(0, 10)) {
        console.log(`    [${cluster.count.toString().padStart(3)}] ${cluster.type}/${cluster.rootCause}/${cluster.subCategory || "-"}`);
        console.log(`         ${cluster.examples.slice(0, 3).map(e => `"${e}"`).join(", ")}`);
      }
      
      if (recommendations.length > 0) {
        console.log(`\n  TOP RECOMMENDATIONS:`);
        for (const rec of recommendations.slice(0, 3)) {
          console.log(`    🔴 ${rec.type}: ${rec.action}`);
          console.log(`       File: ${rec.file}`);
        }
      }
      break;
    }
    
    default:
      console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    RIGOROUS STATISTICAL TESTING SYSTEM                       ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Ensures we TRULY KNOW whether changes improve or regress the system.        ║
╚══════════════════════════════════════════════════════════════════════════════╝

COMMANDS:
  baseline              Capture baseline metrics (required before 'compare')
  compare               Compare current state against saved baseline
  analyze               Analyze current state (no comparison)
  ab <VAR> <A> <B>      A/B test with environment variable
  quick                 Fast single-run with root cause analysis

FLAGS:
  --serial              Run tests serially (default: parallel)

EXAMPLES:
  node rigorous-test.js baseline           # Save baseline before making changes
  # ... make code changes ...
  node rigorous-test.js compare            # See if changes helped or hurt
  
  node rigorous-test.js ab VULPES_USE_DATALOG 1 0   # Test feature toggle impact
  node rigorous-test.js quick              # Fast debugging analysis

WHAT THIS DOES:
  • Runs ${CONFIG.numRuns} tests with different random seeds
  • Calculates mean, std dev, and 95% confidence intervals
  • Uses Welch's t-test to determine statistical significance
  • Calculates Cohen's d effect size for practical significance
  • Clusters failures by ROOT CAUSE to explain WHY things fail
  • Generates actionable recommendations with specific files to edit

INTERPRETING RESULTS:
  • "ACCEPT" = Change improved metrics with statistical significance
  • "REJECT" = Change caused regression (especially sensitivity)
  • "NO_EFFECT" = No statistically significant difference (noise)
  • "REVIEW" = Mixed results, needs human judgment
`);
  }
}

main().catch(console.error);
