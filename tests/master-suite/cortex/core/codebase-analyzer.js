/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║     ██╗   ██╗██╗   ██╗██╗     ██████╗ ███████╗███████╗                        ║
 * ║     ██║   ██║██║   ██║██║     ██╔══██╗██╔════╝██╔════╝                        ║
 * ║     ██║   ██║██║   ██║██║     ██████╔╝█████╗  ███████╗                        ║
 * ║     ╚██╗ ██╔╝██║   ██║██║     ██╔═══╝ ██╔══╝  ╚════██║                        ║
 * ║      ╚████╔╝ ╚██████╔╝███████╗██║     ███████╗███████║                        ║
 * ║       ╚═══╝   ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚══════╝                        ║
 * ║                                                                               ║
 * ║      ██████╗ ██████╗ ██████╗ ████████╗███████╗██╗  ██╗                        ║
 * ║     ██╔════╝██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝╚██╗██╔╝                        ║
 * ║     ██║     ██║   ██║██████╔╝   ██║   █████╗   ╚███╔╝                         ║
 * ║     ██║     ██║   ██║██╔══██╗   ██║   ██╔══╝   ██╔██╗                         ║
 * ║     ╚██████╗╚██████╔╝██║  ██║   ██║   ███████╗██╔╝ ██╗                        ║
 * ║      ╚═════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝                        ║
 * ║                                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║   CODEBASE ANALYZER                                                           ║
 * ║   Deep Awareness of Filter, Dictionary, and Pipeline State                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * This module gives the decision engine FULL SITUATIONAL AWARENESS of:
 *
 * 1. FILTERS: What filters exist, their patterns, configurations
 * 2. DICTIONARIES: What dictionaries are loaded, their sizes, contents
 * 3. PIPELINE: How the redaction pipeline flows, what stages exist
 * 4. CHANGES: What changed between runs in the actual code
 * 5. CAPABILITIES: What the system CAN detect vs what it's MISSING
 *
 * WHY THIS MATTERS:
 * - Can't improve what you don't understand
 * - Decision engine needs to know "we have a DEA filter but it's failing"
 * - Need to track "we added fuzzy matching to SSN filter" → "SSN detection improved"
 * - Must know current state to recommend next steps
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PATHS } = require("./config");

// ============================================================================
// PATHS TO ANALYZE
// ============================================================================

const CODEBASE_PATHS = {
  root: path.join(__dirname, "..", "..", "..", ".."), // Project root
  src: path.join(__dirname, "..", "..", "..", "..", "src"),
  filters: path.join(__dirname, "..", "..", "..", "..", "src", "filters"),
  dictionaries: path.join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "src",
    "dictionaries",
  ),
  core: path.join(__dirname, "..", "..", "..", "..", "src", "core"),
  services: path.join(__dirname, "..", "..", "..", "..", "src", "services"),
  dist: path.join(__dirname, "..", "..", "..", "..", "dist"),
};

// ============================================================================
// CODEBASE ANALYZER CLASS
// ============================================================================

class CodebaseAnalyzer {
  constructor(knowledgeBase = null) {
    this.kb = knowledgeBase;
    this.paths = CODEBASE_PATHS;
    this.stateStoragePath = path.join(PATHS.knowledge, "codebase-states.json");
    this.states = this.loadStates();
  }

  loadStates() {
    try {
      if (fs.existsSync(this.stateStoragePath)) {
        return JSON.parse(fs.readFileSync(this.stateStoragePath, "utf8"));
      }
    } catch (e) {
      console.warn("CodebaseAnalyzer: Starting fresh state tracking");
    }
    return { snapshots: [], current: null };
  }

  saveStates() {
    const dir = path.dirname(this.stateStoragePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      this.stateStoragePath,
      JSON.stringify(this.states, null, 2),
    );
  }

  // ==========================================================================
  // FULL STATE SNAPSHOT
  // ==========================================================================

  /**
   * Take a complete snapshot of the codebase state
   * This captures everything the decision engine needs to know
   */
  takeSnapshot() {
    const snapshot = {
      id: `STATE-${Date.now()}`,
      timestamp: new Date().toISOString(),

      // Filter analysis
      filters: this.analyzeFilters(),

      // Dictionary analysis
      dictionaries: this.analyzeDictionaries(),

      // Pipeline analysis
      pipeline: this.analyzePipeline(),

      // File hashes for change detection
      fileHashes: this.computeFileHashes(),

      // Overall summary
      summary: null, // Filled in below
    };

    // Generate summary
    snapshot.summary = this.generateSummary(snapshot);

    // Store snapshot
    this.states.snapshots.push({
      id: snapshot.id,
      timestamp: snapshot.timestamp,
      filterCount: snapshot.filters.count,
      dictionaryCount: snapshot.dictionaries.count,
      hash: this.computeOverallHash(snapshot.fileHashes),
    });

    // Keep only last 50 snapshots in index
    if (this.states.snapshots.length > 50) {
      this.states.snapshots = this.states.snapshots.slice(-50);
    }

    this.states.current = snapshot;
    this.saveStates();

    return snapshot;
  }

  // ==========================================================================
  // FILTER ANALYSIS
  // ==========================================================================

  analyzeFilters() {
    const result = {
      count: 0,
      filters: [],
      byType: {},
      capabilities: [],
      gaps: [],
    };

    if (!fs.existsSync(this.paths.filters)) {
      result.error = "Filters directory not found";
      return result;
    }

    const filterFiles = fs
      .readdirSync(this.paths.filters)
      .filter((f) => f.endsWith(".ts") && f.includes("Filter"));

    for (const file of filterFiles) {
      const filterInfo = this.analyzeFilterFile(
        path.join(this.paths.filters, file),
      );
      if (filterInfo) {
        result.filters.push(filterInfo);
        result.count++;

        // Group by PHI type
        const phiType = filterInfo.phiType || "UNKNOWN";
        if (!result.byType[phiType]) {
          result.byType[phiType] = [];
        }
        result.byType[phiType].push(filterInfo.name);

        // Track capabilities
        result.capabilities.push(...(filterInfo.capabilities || []));
      }
    }

    // Identify gaps (HIPAA-required types without filters)
    const hipaaTypes = [
      "NAME",
      "SSN",
      "DATE",
      "PHONE",
      "FAX",
      "EMAIL",
      "ADDRESS",
      "ZIPCODE",
      "MRN",
      "HEALTH_PLAN_ID",
      "ACCOUNT_NUMBER",
      "LICENSE",
      "VEHICLE",
      "DEVICE",
      "URL",
      "IP",
      "BIOMETRIC",
      "PHOTO",
    ];

    const coveredTypes = Object.keys(result.byType);
    result.gaps = hipaaTypes.filter((t) => !coveredTypes.includes(t));

    return result;
  }

  analyzeFilterFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const fileName = path.basename(filePath);

      const info = {
        name: fileName.replace(".ts", ""),
        file: fileName,
        path: filePath,
        phiType: this.extractPHIType(content, fileName),
        patterns: this.extractPatterns(content),
        capabilities: [],
        configOptions: this.extractConfigOptions(content),
        complexity: this.assessComplexity(content),
        lastModified: fs.statSync(filePath).mtime.toISOString(),
        size: fs.statSync(filePath).size,
        hash: this.hashContent(content),
      };

      // Determine capabilities based on code analysis
      if (
        content.includes("fuzzy") ||
        content.includes("levenshtein") ||
        content.includes("similarity")
      ) {
        info.capabilities.push("FUZZY_MATCHING");
      }
      if (content.includes("OCR") || content.includes("substitut")) {
        info.capabilities.push("OCR_TOLERANCE");
      }
      if (content.includes("context") || content.includes("window")) {
        info.capabilities.push("CONTEXT_AWARE");
      }
      if (content.includes("confidence")) {
        info.capabilities.push("CONFIDENCE_SCORING");
      }
      if (content.includes("case") && content.includes("insensitive")) {
        info.capabilities.push("CASE_INSENSITIVE");
      }

      return info;
    } catch (e) {
      return { name: path.basename(filePath), error: e.message };
    }
  }

  extractPHIType(content, fileName) {
    // Try to extract from class definition or filename
    const typeMatch = content.match(/phiType\s*[=:]\s*['"](\w+)['"]/);
    if (typeMatch) return typeMatch[1];

    // Infer from filename
    const nameMap = {
      SSN: "SSN",
      Phone: "PHONE",
      Email: "EMAIL",
      Date: "DATE",
      Name: "NAME",
      Address: "ADDRESS",
      MRN: "MRN",
      NPI: "NPI",
      DEA: "DEA",
      CreditCard: "CREDIT_CARD",
      IP: "IP",
      URL: "URL",
      Fax: "FAX",
      ZipCode: "ZIPCODE",
      Account: "ACCOUNT_NUMBER",
      HealthPlan: "HEALTH_PLAN_ID",
      License: "LICENSE",
      Vehicle: "VEHICLE",
      Age: "AGE",
      Biometric: "BIOMETRIC",
      Device: "DEVICE",
      Passport: "PASSPORT",
      UniqueIdentifier: "UNIQUE_ID",
    };

    for (const [key, type] of Object.entries(nameMap)) {
      if (fileName.includes(key)) return type;
    }

    return "UNKNOWN";
  }

  extractPatterns(content) {
    const patterns = [];

    // Find regex patterns
    const regexMatches = content.matchAll(
      /(?:new RegExp\(|\/)[^\/\n]+(?:\/[gimsu]*|\))/g,
    );
    for (const match of regexMatches) {
      if (match[0].length < 200) {
        // Skip very long patterns
        patterns.push({
          type: "regex",
          pattern: match[0].substring(0, 100), // Truncate
        });
      }
    }

    return patterns.slice(0, 10); // Limit to 10 patterns
  }

  extractConfigOptions(content) {
    const options = [];

    // Look for configurable options
    const optionPatterns = [
      /(?:this\.)?(\w+)\s*=\s*(?:options|config)\.(\w+)/g,
      /(?:private|public)\s+(\w+)\s*:\s*\w+\s*=\s*(\w+)/g,
    ];

    for (const pattern of optionPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        options.push(match[1] || match[2]);
      }
    }

    return [...new Set(options)].slice(0, 20);
  }

  assessComplexity(content) {
    const lines = content.split("\n").length;
    const conditionals = (content.match(/if\s*\(/g) || []).length;
    const loops = (
      content.match(/for\s*\(|while\s*\(|\.forEach|\.map|\.filter/g) || []
    ).length;
    const functions = (content.match(/(?:function|=>)/g) || []).length;

    let complexity = "LOW";
    if (lines > 200 || conditionals > 15 || loops > 10) complexity = "HIGH";
    else if (lines > 100 || conditionals > 8 || loops > 5)
      complexity = "MEDIUM";

    return {
      level: complexity,
      lines,
      conditionals,
      loops,
      functions,
    };
  }

  // ==========================================================================
  // DICTIONARY ANALYSIS
  // ==========================================================================

  analyzeDictionaries() {
    const result = {
      count: 0,
      dictionaries: [],
      totalEntries: 0,
      byType: {},
    };

    if (!fs.existsSync(this.paths.dictionaries)) {
      result.error = "Dictionaries directory not found";
      return result;
    }

    const files = fs.readdirSync(this.paths.dictionaries);

    for (const file of files) {
      const filePath = path.join(this.paths.dictionaries, file);
      const stats = fs.statSync(filePath);

      if (stats.isFile()) {
        const dictInfo = this.analyzeDictionaryFile(filePath);
        if (dictInfo) {
          result.dictionaries.push(dictInfo);
          result.count++;
          result.totalEntries += dictInfo.entries || 0;

          // Group by type
          const dictType = dictInfo.type || "OTHER";
          if (!result.byType[dictType]) {
            result.byType[dictType] = { files: [], totalEntries: 0 };
          }
          result.byType[dictType].files.push(dictInfo.name);
          result.byType[dictType].totalEntries += dictInfo.entries || 0;
        }
      }
    }

    return result;
  }

  analyzeDictionaryFile(filePath) {
    try {
      const fileName = path.basename(filePath);
      const ext = path.extname(fileName);
      const stats = fs.statSync(filePath);

      const info = {
        name: fileName,
        path: filePath,
        type: this.inferDictionaryType(fileName),
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
        hash: this.hashFile(filePath),
      };

      // Count entries for text files
      if (ext === ".txt") {
        const content = fs.readFileSync(filePath, "utf8");
        const lines = content.split("\n").filter((l) => l.trim().length > 0);
        info.entries = lines.length;
        info.sampleEntries = lines.slice(0, 5);
      } else if (ext === ".ts" || ext === ".js") {
        // For code files, try to extract dictionary size
        const content = fs.readFileSync(filePath, "utf8");
        const sizeMatch = content.match(/Loaded\s+(\d+)/);
        if (sizeMatch) {
          info.entries = parseInt(sizeMatch[1]);
        }
        info.isCodeFile = true;
      }

      return info;
    } catch (e) {
      return { name: path.basename(filePath), error: e.message };
    }
  }

  inferDictionaryType(fileName) {
    const typeMap = {
      "first-names": "FIRST_NAMES",
      surnames: "SURNAMES",
      hospitals: "HOSPITALS",
      cities: "CITIES",
      streets: "STREETS",
      medical: "MEDICAL_TERMS",
    };

    for (const [key, type] of Object.entries(typeMap)) {
      if (fileName.toLowerCase().includes(key)) return type;
    }
    return "OTHER";
  }

  // ==========================================================================
  // PIPELINE ANALYSIS
  // ==========================================================================

  analyzePipeline() {
    const result = {
      stages: [],
      services: [],
      entryPoint: null,
      flow: [],
    };

    // Find main entry point
    const mainFile = path.join(this.paths.src, "VulpesCelare.ts");
    if (fs.existsSync(mainFile)) {
      result.entryPoint = this.analyzeMainFile(mainFile);
    }

    // Analyze core services
    if (fs.existsSync(this.paths.core)) {
      const coreFiles = fs
        .readdirSync(this.paths.core)
        .filter((f) => f.endsWith(".ts"));

      for (const file of coreFiles) {
        result.stages.push({
          name: file.replace(".ts", ""),
          file,
          type: "CORE",
        });
      }
    }

    // Analyze services
    if (fs.existsSync(this.paths.services)) {
      const serviceFiles = fs
        .readdirSync(this.paths.services)
        .filter((f) => f.endsWith(".ts") && f !== "index.ts");

      for (const file of serviceFiles) {
        result.services.push({
          name: file.replace(".ts", ""),
          file,
          type: "SERVICE",
        });
      }
    }

    // Infer pipeline flow
    result.flow = [
      "Input Text",
      "Field Context Detection",
      "Parallel Filter Execution",
      "Span Collection",
      "Vocabulary Filtering",
      "Confidence Modification",
      "Span Disambiguation",
      "Overlap Resolution",
      "Post-Filter Cleanup",
      "Token Replacement",
      "Output",
    ];

    return result;
  }

  analyzeMainFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf8");

      return {
        file: path.basename(filePath),
        version: this.extractVersion(content),
        filterCount: (content.match(/new \w+Filter/g) || []).length,
        hasParallelProcessing:
          content.includes("parallel") || content.includes("Promise.all"),
        hasLogging:
          content.includes("Logger") || content.includes("console.log"),
      };
    } catch (e) {
      return { error: e.message };
    }
  }

  extractVersion(content) {
    const match = content.match(/VERSION\s*=\s*['"]([^'"]+)['"]/);
    return match ? match[1] : "unknown";
  }

  // ==========================================================================
  // CHANGE DETECTION
  // ==========================================================================

  computeFileHashes() {
    const hashes = {};

    const dirsToHash = [
      this.paths.filters,
      this.paths.dictionaries,
      this.paths.core,
      this.paths.services,
    ];

    for (const dir of dirsToHash) {
      if (!fs.existsSync(dir)) continue;

      const files = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".ts") || f.endsWith(".txt"));
      for (const file of files) {
        const filePath = path.join(dir, file);
        const relativePath = path.relative(this.paths.src, filePath);
        hashes[relativePath] = this.hashFile(filePath);
      }
    }

    // Also hash main entry point
    const mainFile = path.join(this.paths.src, "VulpesCelare.ts");
    if (fs.existsSync(mainFile)) {
      hashes["VulpesCelare.ts"] = this.hashFile(mainFile);
    }

    return hashes;
  }

  hashFile(filePath) {
    try {
      const content = fs.readFileSync(filePath);
      return crypto
        .createHash("md5")
        .update(content)
        .digest("hex")
        .substring(0, 12);
    } catch (e) {
      return "error";
    }
  }

  hashContent(content) {
    return crypto
      .createHash("md5")
      .update(content)
      .digest("hex")
      .substring(0, 12);
  }

  computeOverallHash(fileHashes) {
    const combined = Object.entries(fileHashes)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `${k}:${v}`)
      .join("|");
    return crypto
      .createHash("md5")
      .update(combined)
      .digest("hex")
      .substring(0, 16);
  }

  /**
   * Compare two snapshots and identify what changed
   */
  compareSnapshots(before, after) {
    const changes = {
      timestamp: new Date().toISOString(),
      beforeId: before.id,
      afterId: after.id,
      filesChanged: [],
      filesAdded: [],
      filesRemoved: [],
      filterChanges: [],
      dictionaryChanges: [],
      summary: "",
    };

    // Compare file hashes
    const beforeHashes = before.fileHashes || {};
    const afterHashes = after.fileHashes || {};

    const allFiles = new Set([
      ...Object.keys(beforeHashes),
      ...Object.keys(afterHashes),
    ]);

    for (const file of allFiles) {
      if (!beforeHashes[file]) {
        changes.filesAdded.push(file);
      } else if (!afterHashes[file]) {
        changes.filesRemoved.push(file);
      } else if (beforeHashes[file] !== afterHashes[file]) {
        changes.filesChanged.push(file);
      }
    }

    // Analyze filter changes
    const beforeFilters = new Set(
      before.filters?.filters?.map((f) => f.name) || [],
    );
    const afterFilters = new Set(
      after.filters?.filters?.map((f) => f.name) || [],
    );

    for (const f of afterFilters) {
      if (!beforeFilters.has(f)) {
        changes.filterChanges.push({ filter: f, change: "ADDED" });
      }
    }
    for (const f of beforeFilters) {
      if (!afterFilters.has(f)) {
        changes.filterChanges.push({ filter: f, change: "REMOVED" });
      }
    }

    // Check for filter code changes
    for (const file of changes.filesChanged) {
      if (file.includes("Filter")) {
        const filterName = file.replace(".ts", "");
        changes.filterChanges.push({ filter: filterName, change: "MODIFIED" });
      }
    }

    // Generate summary
    const parts = [];
    if (changes.filesChanged.length > 0) {
      parts.push(`${changes.filesChanged.length} files modified`);
    }
    if (changes.filesAdded.length > 0) {
      parts.push(`${changes.filesAdded.length} files added`);
    }
    if (changes.filterChanges.length > 0) {
      parts.push(`${changes.filterChanges.length} filter changes`);
    }
    changes.summary = parts.join(", ") || "No changes detected";

    return changes;
  }

  // ==========================================================================
  // SUMMARY GENERATION
  // ==========================================================================

  generateSummary(snapshot) {
    return {
      timestamp: snapshot.timestamp,
      filters: {
        total: snapshot.filters.count,
        byType: Object.keys(snapshot.filters.byType).length,
        gaps: snapshot.filters.gaps,
        capabilities: [...new Set(snapshot.filters.capabilities)],
      },
      dictionaries: {
        total: snapshot.dictionaries.count,
        totalEntries: snapshot.dictionaries.totalEntries,
        types: Object.keys(snapshot.dictionaries.byType),
      },
      pipeline: {
        stages: snapshot.pipeline.stages.length,
        services: snapshot.pipeline.services.length,
      },
      codebaseHash: this.computeOverallHash(snapshot.fileHashes),
    };
  }

  /**
   * Get current state for decision engine
   */
  getCurrentState() {
    if (!this.states.current) {
      return this.takeSnapshot();
    }
    return this.states.current;
  }

  /**
   * Export state for LLM context
   */
  exportForLLM() {
    const state = this.getCurrentState();

    return {
      summary: state.summary,

      // What filters exist and what they can do
      filterCapabilities: state.filters.filters.map((f) => ({
        name: f.name,
        phiType: f.phiType,
        capabilities: f.capabilities,
        complexity: f.complexity?.level,
      })),

      // What's missing
      gaps: state.filters.gaps,

      // Dictionary sizes
      dictionaries: state.dictionaries.dictionaries.map((d) => ({
        name: d.name,
        type: d.type,
        entries: d.entries,
      })),

      // Pipeline overview
      pipelineFlow: state.pipeline.flow,

      // Guidance for improvements
      improvementAreas: this.suggestImprovementAreas(state),
    };
  }

  suggestImprovementAreas(state) {
    const suggestions = [];

    // Check for missing capabilities
    const allCapabilities = state.filters.capabilities;
    if (!allCapabilities.includes("FUZZY_MATCHING")) {
      suggestions.push(
        "Consider adding fuzzy matching to improve OCR tolerance",
      );
    }
    if (!allCapabilities.includes("CONTEXT_AWARE")) {
      suggestions.push("Context-aware detection could improve accuracy");
    }

    // Check for gaps
    if (state.filters.gaps.length > 0) {
      suggestions.push(`Missing filters for: ${state.filters.gaps.join(", ")}`);
    }

    // Check dictionary coverage
    if (state.dictionaries.totalEntries < 100000) {
      suggestions.push("Dictionary coverage may be limited");
    }

    return suggestions;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  CodebaseAnalyzer,
  CODEBASE_PATHS,
};
