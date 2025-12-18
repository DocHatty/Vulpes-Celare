/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                    MTSAMPLES VALIDATION CORPUS GENERATOR                      ║
 * ║                                                                               ║
 * ║   Generates a validation corpus from MTSamples with injected PHI and          ║
 * ║   ground truth annotations for Vulpes Celare testing.                         ║
 * ║                                                                               ║
 * ║   Implements the "Composite Validation Schema" methodology:                   ║
 * ║   - PHI Injection Corpus (MTSamples + synthetic PHI)                          ║
 * ║   - Perfect ground truth via controlled injection                             ║
 * ║   - All 18 HIPAA identifiers + extended types                                 ║
 * ║   - Adversarial edge cases for stress testing                                 ║
 * ║                                                                               ║
 * ║   Reference: "The Validation Void" research document                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const fs = require("fs");
const path = require("path");

const { loadMTSamples, getStratifiedSample, getCorpusStats } = require("./mtsamples-loader");
const { batchInjectPHI, injectPHI, injectAdversarialPHI } = require("./mtsamples-injector");
const { setSeed, random } = require("../generators/seeded-random");

/**
 * HIPAA 18 Identifier Types for coverage tracking
 */
const HIPAA_18_TYPES = {
  NAME: "Names",
  ADDRESS: "Geographic data (address, city, zip)",
  DATE: "Dates (except year)",
  PHONE: "Phone numbers",
  FAX: "Fax numbers", 
  EMAIL: "Email addresses",
  SSN: "Social Security numbers",
  MRN: "Medical record numbers",
  HEALTH_PLAN_ID: "Health plan beneficiary numbers",
  ACCOUNT_NUMBER: "Account numbers",
  LICENSE_NUMBER: "Certificate/license numbers",
  VIN: "Vehicle identifiers (VIN)",
  DEVICE_ID: "Device identifiers/serials",
  URL: "Web URLs",
  IP: "IP addresses",
  BIOMETRIC: "Biometric identifiers",
  PHOTO: "Full-face photographs",
  OTHER: "Any other unique identifier",
};

/**
 * Corpus generation configuration
 */
const DEFAULT_CONFIG = {
  // Corpus size
  documentCount: 200,
  stratified: true,
  
  // PHI injection settings
  minInjections: 5,
  maxInjections: 25,
  ensureAllTypes: true,
  additionalPHIProbability: 0.4,
  
  // Adversarial testing
  adversarialPercentage: 0.2,
  ambiguityLevel: "standard",
  
  // Reproducibility  
  baseSeed: 42,
  
  // Output options
  outputDir: null,
  includeOriginal: false,
  generateStats: true,
};

/**
 * Generate the validation corpus
 * @param {Object} userConfig - User configuration overrides
 * @returns {Object} Complete corpus with documents, annotations, and statistics
 */
function generateCorpus(userConfig = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...userConfig };
  
  console.log("╔═══════════════════════════════════════════════════════════════════════╗");
  console.log("║              MTSAMPLES VALIDATION CORPUS GENERATOR                    ║");
  console.log("╚═══════════════════════════════════════════════════════════════════════╝");
  console.log();
  
  // Set master seed
  setSeed(cfg.baseSeed);
  
  // Load MTSamples
  console.log("[1/5] Loading MTSamples dataset...");
  const allDocs = loadMTSamples();
  const corpusStats = getCorpusStats(allDocs);
  console.log(`      Loaded ${allDocs.length} documents across ${corpusStats.specialtyCount} specialties`);
  console.log();
  
  // Select documents
  console.log("[2/5] Selecting documents...");
  let selectedDocs;
  if (cfg.stratified) {
    selectedDocs = getStratifiedSample(allDocs, cfg.documentCount, random);
    console.log(`      Stratified sample: ${selectedDocs.length} documents`);
  } else {
    selectedDocs = allDocs.sort(() => random() - 0.5).slice(0, cfg.documentCount);
    console.log(`      Random sample: ${selectedDocs.length} documents`);
  }
  console.log();
  
  // Split for adversarial
  console.log("[3/5] Injecting PHI...");
  const adversarialCount = Math.floor(selectedDocs.length * cfg.adversarialPercentage);
  const standardCount = selectedDocs.length - adversarialCount;
  console.log(`      Standard documents: ${standardCount}`);
  console.log(`      Adversarial documents: ${adversarialCount}`);
  
  // Split documents for standard vs adversarial processing
  const standardDocs = selectedDocs.slice(0, standardCount);
  const adversarialDocs = selectedDocs.slice(standardCount);
  
  // Inject PHI into standard documents
  const injectedStandard = batchInjectPHI(standardDocs, {
    baseSeed: cfg.baseSeed,
    minInjections: cfg.minInjections,
    maxInjections: cfg.maxInjections,
    ensureAllTypes: cfg.ensureAllTypes,
    additionalPHIProbability: cfg.additionalPHIProbability,
    ambiguityLevel: cfg.ambiguityLevel,
    adversarial: false,
  });
  
  // Inject PHI into adversarial documents
  const injectedAdversarial = batchInjectPHI(adversarialDocs, {
    baseSeed: cfg.baseSeed + standardCount,
    minInjections: cfg.minInjections,
    maxInjections: cfg.maxInjections,
    ensureAllTypes: cfg.ensureAllTypes,
    additionalPHIProbability: cfg.additionalPHIProbability,
    ambiguityLevel: "high",
    adversarial: true,
  });
  
  const allInjected = [...injectedStandard, ...injectedAdversarial];
  console.log();
  
  // Calculate corpus statistics
  console.log("[4/5] Calculating corpus statistics...");
  const statistics = calculateCorpusStatistics(allInjected);
  
  console.log(`      Total PHI items: ${statistics.totalPHI}`);
  console.log(`      PHI types covered: ${Object.keys(statistics.phiTypeCounts).length}`);
  console.log(`      Avg PHI per document: ${statistics.avgPHIPerDocument.toFixed(1)}`);
  console.log();
  
  // HIPAA coverage check
  const hipaaCoverage = checkHIPAACoverage(statistics.phiTypeCounts);
  console.log(`      HIPAA 18 coverage: ${hipaaCoverage.coveragePercentage}%`);
  if (hipaaCoverage.missing.length > 0) {
    console.log(`      Missing types: ${hipaaCoverage.missing.join(", ")}`);
  }
  console.log();
  
  // Build corpus object
  const corpus = {
    meta: {
      name: "MTSamples Validation Corpus",
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      generator: "vulpes-celare/mtsamples-corpus-generator",
      methodology: "PHI Injection (Composite Validation Schema)",
      references: [
        "South et al. (2014) - MTSamples validation precedent",
        "The Validation Void - Composite Validation Schema",
      ],
    },
    config: cfg,
    statistics: {
      ...statistics,
      hipaaCoverage,
      sourceCorpusStats: corpusStats,
    },
    documents: cfg.includeOriginal 
      ? allInjected 
      : allInjected.map(doc => ({
          id: doc.id,
          sourceCorpus: doc.sourceCorpus,
          specialty: doc.specialty,
          sampleName: doc.sampleName,
          injectedText: doc.injectedText,
          annotations: doc.annotations,
          phiCounts: doc.phiCounts,
          injectionConfig: doc.injectionConfig,
        })),
  };
  
  // Save if output directory specified
  if (cfg.outputDir) {
    console.log("[5/5] Saving corpus...");
    saveCorpus(corpus, cfg.outputDir);
  } else {
    console.log("[5/5] Skipping save (no output directory specified)");
  }
  
  console.log();
  console.log("╔═══════════════════════════════════════════════════════════════════════╗");
  console.log("║                      CORPUS GENERATION COMPLETE                       ║");
  console.log("╚═══════════════════════════════════════════════════════════════════════╝");
  console.log();
  
  return corpus;
}

/**
 * Calculate comprehensive corpus statistics
 */
function calculateCorpusStatistics(documents) {
  const phiTypeCounts = {};
  const errorLevelCounts = { none: 0, low: 0, medium: 0, high: 0, extreme: 0 };
  const injectionMethodCounts = {};
  const specialtyCounts = {};
  let totalPHI = 0;
  let totalChars = 0;
  let totalWords = 0;
  
  for (const doc of documents) {
    totalChars += doc.injectedText.length;
    totalWords += doc.injectedText.split(/\s+/).length;
    
    // Specialty distribution
    specialtyCounts[doc.specialty] = (specialtyCounts[doc.specialty] || 0) + 1;
    
    for (const ann of doc.annotations) {
      totalPHI++;
      
      // PHI type counts
      phiTypeCounts[ann.type] = (phiTypeCounts[ann.type] || 0) + 1;
      
      // Error level distribution
      if (ann.errorLevel && errorLevelCounts.hasOwnProperty(ann.errorLevel)) {
        errorLevelCounts[ann.errorLevel]++;
      }
      
      // Injection method distribution
      const method = ann.injectionMethod || "unknown";
      injectionMethodCounts[method] = (injectionMethodCounts[method] || 0) + 1;
    }
  }
  
  // Calculate per-type statistics
  const phiTypeStats = {};
  for (const [type, count] of Object.entries(phiTypeCounts)) {
    phiTypeStats[type] = {
      count,
      percentage: ((count / totalPHI) * 100).toFixed(2),
      avgPerDocument: (count / documents.length).toFixed(2),
    };
  }
  
  return {
    documentCount: documents.length,
    totalPHI,
    totalChars,
    totalWords,
    avgPHIPerDocument: totalPHI / documents.length,
    avgCharsPerDocument: totalChars / documents.length,
    avgWordsPerDocument: totalWords / documents.length,
    phiTypeCounts,
    phiTypeStats,
    errorLevelDistribution: errorLevelCounts,
    injectionMethodDistribution: injectionMethodCounts,
    specialtyDistribution: specialtyCounts,
  };
}

/**
 * Check HIPAA 18 coverage
 */
function checkHIPAACoverage(phiTypeCounts) {
  const hipaaTypes = Object.keys(HIPAA_18_TYPES);
  const covered = [];
  const missing = [];
  
  for (const type of hipaaTypes) {
    if (phiTypeCounts[type] && phiTypeCounts[type] > 0) {
      covered.push(type);
    } else {
      missing.push(type);
    }
  }
  
  return {
    covered,
    missing,
    coveragePercentage: ((covered.length / hipaaTypes.length) * 100).toFixed(1),
    isFull18Coverage: missing.length === 0,
  };
}

/**
 * Save corpus to disk
 */
function saveCorpus(corpus, outputDir) {
  const resolvedDir = path.resolve(outputDir);
  
  // Create output directory
  if (!fs.existsSync(resolvedDir)) {
    fs.mkdirSync(resolvedDir, { recursive: true });
  }
  
  // Save full corpus JSON
  const corpusPath = path.join(resolvedDir, "mtsamples-corpus.json");
  fs.writeFileSync(corpusPath, JSON.stringify(corpus, null, 2));
  console.log(`      Corpus JSON: ${corpusPath}`);
  
  // Save individual document annotations for easier processing
  const annotationsDir = path.join(resolvedDir, "annotations");
  if (!fs.existsSync(annotationsDir)) {
    fs.mkdirSync(annotationsDir, { recursive: true });
  }
  
  for (const doc of corpus.documents) {
    const annotationFile = path.join(annotationsDir, `${doc.id}.json`);
    fs.writeFileSync(annotationFile, JSON.stringify({
      id: doc.id,
      specialty: doc.specialty,
      annotations: doc.annotations,
      phiCounts: doc.phiCounts,
    }, null, 2));
  }
  console.log(`      Annotations: ${annotationsDir}/ (${corpus.documents.length} files)`);
  
  // Save statistics summary
  const statsPath = path.join(resolvedDir, "corpus-statistics.json");
  fs.writeFileSync(statsPath, JSON.stringify(corpus.statistics, null, 2));
  console.log(`      Statistics: ${statsPath}`);
  
  // Save human-readable summary
  const summaryPath = path.join(resolvedDir, "CORPUS-SUMMARY.md");
  fs.writeFileSync(summaryPath, generateSummaryMarkdown(corpus));
  console.log(`      Summary: ${summaryPath}`);
  
  // Save NER-format annotations for model training/evaluation
  const nerPath = path.join(resolvedDir, "ner-format.jsonl");
  fs.writeFileSync(nerPath, generateNERFormat(corpus));
  console.log(`      NER Format: ${nerPath}`);
}

/**
 * Generate human-readable markdown summary
 */
function generateSummaryMarkdown(corpus) {
  const { statistics: stats, config, meta } = corpus;
  
  let md = `# MTSamples Validation Corpus Summary

Generated: ${meta.generatedAt}
Generator: ${meta.generator}
Methodology: ${meta.methodology}

## Corpus Overview

| Metric | Value |
|--------|-------|
| Total Documents | ${stats.documentCount} |
| Total PHI Items | ${stats.totalPHI} |
| Avg PHI/Document | ${stats.avgPHIPerDocument.toFixed(1)} |
| Total Words | ${stats.totalWords.toLocaleString()} |
| Total Characters | ${stats.totalChars.toLocaleString()} |

## HIPAA 18 Coverage

**Coverage: ${stats.hipaaCoverage.coveragePercentage}%**

`;

  if (stats.hipaaCoverage.isFull18Coverage) {
    md += `✅ All 18 HIPAA identifier types are represented in this corpus.\n\n`;
  } else {
    md += `⚠️ Missing types: ${stats.hipaaCoverage.missing.join(", ")}\n\n`;
  }

  md += `### PHI Type Distribution

| Type | Count | % of Total | Avg/Doc |
|------|-------|------------|---------|
`;

  for (const [type, data] of Object.entries(stats.phiTypeStats).sort((a, b) => b[1].count - a[1].count)) {
    md += `| ${type} | ${data.count} | ${data.percentage}% | ${data.avgPerDocument} |\n`;
  }

  md += `
## Error Level Distribution

| Level | Count | Description |
|-------|-------|-------------|
| none | ${stats.errorLevelDistribution.none} | Clean, no errors |
| low | ${stats.errorLevelDistribution.low} | Minor typos |
| medium | ${stats.errorLevelDistribution.medium} | Realistic OCR errors |
| high | ${stats.errorLevelDistribution.high} | Heavy corruption |
| extreme | ${stats.errorLevelDistribution.extreme} | Severe degradation |

## Specialty Distribution

| Specialty | Documents |
|-----------|-----------|
`;

  for (const [specialty, count] of Object.entries(stats.specialtyDistribution).sort((a, b) => b[1] - a[1])) {
    md += `| ${specialty} | ${count} |\n`;
  }

  md += `
## Configuration Used

\`\`\`json
${JSON.stringify(config, null, 2)}
\`\`\`

## References

${meta.references.map(r => `- ${r}`).join('\n')}

---

*For validation methodology details, see docs/VALIDATION-METHODOLOGY.md*
`;

  return md;
}

/**
 * Generate NER format (JSONL) for model training/evaluation
 */
function generateNERFormat(corpus) {
  const lines = [];
  
  for (const doc of corpus.documents) {
    const nerDoc = {
      id: doc.id,
      text: doc.injectedText,
      entities: doc.annotations.map(ann => ({
        start: ann.start,
        end: ann.end,
        label: ann.type,
        text: ann.text,
      })),
    };
    lines.push(JSON.stringify(nerDoc));
  }
  
  return lines.join('\n');
}

/**
 * Load a previously saved corpus
 */
function loadCorpus(corpusPath) {
  const resolvedPath = path.resolve(corpusPath);
  const content = fs.readFileSync(resolvedPath, "utf-8");
  return JSON.parse(content);
}

/**
 * Quick generation for testing
 */
function quickGenerate(count = 50) {
  return generateCorpus({
    documentCount: count,
    baseSeed: 1337,
    ensureAllTypes: true,
    adversarialPercentage: 0.1,
  });
}

/**
 * Full generation for validation
 */
function fullGenerate(outputDir = null) {
  return generateCorpus({
    documentCount: 500,
    baseSeed: 42,
    ensureAllTypes: true,
    adversarialPercentage: 0.2,
    ambiguityLevel: "high",
    outputDir,
  });
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
MTSamples Corpus Generator

Usage:
  node mtsamples-corpus-generator.js [options]

Options:
  --quick          Generate small corpus (50 docs) for testing
  --full           Generate full corpus (500 docs) for validation  
  --count N        Generate N documents (default: 200)
  --output DIR     Save corpus to directory
  --seed N         Base random seed (default: 42)
  --adversarial P  Adversarial percentage 0-1 (default: 0.2)
  --help, -h       Show this help

Examples:
  node mtsamples-corpus-generator.js --quick
  node mtsamples-corpus-generator.js --full --output ./validation-corpus
  node mtsamples-corpus-generator.js --count 100 --seed 12345
`);
    process.exit(0);
  }
  
  const config = { ...DEFAULT_CONFIG };
  
  if (args.includes("--quick")) {
    config.documentCount = 50;
  } else if (args.includes("--full")) {
    config.documentCount = 500;
    config.adversarialPercentage = 0.2;
    config.ambiguityLevel = "high";
  }
  
  const countIdx = args.indexOf("--count");
  if (countIdx !== -1 && args[countIdx + 1]) {
    config.documentCount = parseInt(args[countIdx + 1], 10);
  }
  
  const outputIdx = args.indexOf("--output");
  if (outputIdx !== -1 && args[outputIdx + 1]) {
    config.outputDir = args[outputIdx + 1];
  }
  
  const seedIdx = args.indexOf("--seed");
  if (seedIdx !== -1 && args[seedIdx + 1]) {
    config.baseSeed = parseInt(args[seedIdx + 1], 10);
  }
  
  const advIdx = args.indexOf("--adversarial");
  if (advIdx !== -1 && args[advIdx + 1]) {
    config.adversarialPercentage = parseFloat(args[advIdx + 1]);
  }
  
  generateCorpus(config);
}

module.exports = {
  generateCorpus,
  loadCorpus,
  quickGenerate,
  fullGenerate,
  calculateCorpusStatistics,
  checkHIPAACoverage,
  DEFAULT_CONFIG,
  HIPAA_18_TYPES,
};
