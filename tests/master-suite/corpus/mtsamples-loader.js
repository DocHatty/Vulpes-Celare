/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                    MTSAMPLES CORPUS LOADER                                    ║
 * ║                                                                               ║
 * ║   Loads and parses the MTSamples clinical transcription dataset for          ║
 * ║   PHI injection validation testing.                                          ║
 * ║                                                                               ║
 * ║   Reference: The Validation Void - Composite Validation Schema               ║
 * ║   Source: kaggle.com/tboyle10/medicaltranscriptions (CC0)                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * MTSamples CSV path resolution
 * Checks multiple locations in order of preference:
 * 1. MTSAMPLES_PATH environment variable
 * 2. Project corpora folder (portable)
 * 3. Downloads folder (common install location)
 * 4. Legacy GIT-relative path
 */
function resolveMTSamplesPath() {
  // Check env variable first
  if (process.env.MTSAMPLES_PATH && fs.existsSync(process.env.MTSAMPLES_PATH)) {
    return process.env.MTSAMPLES_PATH;
  }
  
  // Check locations in order of preference
  const candidates = [
    // 1. Project corpora folder (ideal - portable)
    path.join(__dirname, "../corpora/mtsamples/mtsamples.csv"),
    // 2. User Downloads (common download location)
    path.join(os.homedir(), "Downloads", "mtsamples", "mtsamples.csv"),
    // 3. Legacy path (relative to GIT folder)
    path.join(__dirname, "../../../../mtsamples/mtsamples.csv"),
    path.join(__dirname, "../../../../../mtsamples/mtsamples.csv"),
  ];
  
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }
  
  // Return first candidate for error messaging
  return path.resolve(candidates[0]);
}

const DEFAULT_MTSAMPLES_PATH = resolveMTSamplesPath();

/**
 * Parse CSV manually to avoid external dependencies
 * Handles quoted fields with commas and newlines
 */
function parseCSV(content) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++;
      } else if (char === '"') {
        // End of quoted field
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
      } else if (char === ',') {
        // Field separator
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        // Row separator
        currentRow.push(currentField.trim());
        if (currentRow.length > 1 || currentRow[0] !== "") {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
        if (char === '\r') i++;
      } else {
        currentField += char;
      }
    }
  }
  
  // Don't forget the last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.length > 1 || currentRow[0] !== "") {
      rows.push(currentRow);
    }
  }
  
  return rows;
}

/**
 * MTSamples Document structure
 * @typedef {Object} MTSamplesDocument
 * @property {number} index - Original row index
 * @property {string} description - Brief description of the document
 * @property {string} specialty - Medical specialty (e.g., "Cardiovascular / Pulmonary")
 * @property {string} sampleName - Name/type of the sample
 * @property {string} transcription - Full transcription text
 * @property {string[]} keywords - Array of relevant keywords
 * @property {number} wordCount - Word count of transcription
 * @property {number} charCount - Character count of transcription
 */

/**
 * Load and parse the MTSamples dataset
 * @param {string} [csvPath] - Path to mtsamples.csv file
 * @returns {MTSamplesDocument[]} Array of parsed documents
 */
function loadMTSamples(csvPath = DEFAULT_MTSAMPLES_PATH) {
  const resolvedPath = path.resolve(csvPath);
  
  if (!fs.existsSync(resolvedPath)) {
    const searchedPaths = [
      path.join(__dirname, "../corpora/mtsamples/mtsamples.csv"),
      path.join(os.homedir(), "Downloads", "mtsamples", "mtsamples.csv"),
    ].map(p => `  - ${path.resolve(p)}`).join("\n");
    
    throw new Error(
      `MTSamples CSV not found!\n\n` +
      `Searched locations:\n${searchedPaths}\n\n` +
      `Download from: https://www.kaggle.com/tboyle10/medicaltranscriptions\n` +
      `Place in: tests/master-suite/corpora/mtsamples/mtsamples.csv\n` +
      `Or set MTSAMPLES_PATH environment variable`
    );
  }
  
  const content = fs.readFileSync(resolvedPath, "utf-8");
  const rows = parseCSV(content);
  
  // First row is headers: ,description,medical_specialty,sample_name,transcription,keywords
  const headers = rows[0];
  const documents = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 5) continue;
    
    const transcription = row[4] || "";
    
    // Skip empty or very short transcriptions
    if (transcription.length < 100) continue;
    
    documents.push({
      index: parseInt(row[0], 10) || i - 1,
      description: row[1] || "",
      specialty: row[2] || "General",
      sampleName: row[3] || `Sample ${i}`,
      transcription: transcription,
      keywords: (row[5] || "").split(",").map(k => k.trim()).filter(k => k),
      wordCount: transcription.split(/\s+/).length,
      charCount: transcription.length,
    });
  }
  
  console.log(`[MTSamples] Loaded ${documents.length} clinical transcriptions`);
  return documents;
}

/**
 * Get documents filtered by specialty
 * @param {MTSamplesDocument[]} documents - All documents
 * @param {string} specialty - Specialty to filter by (case-insensitive partial match)
 * @returns {MTSamplesDocument[]} Filtered documents
 */
function filterBySpecialty(documents, specialty) {
  const lowerSpecialty = specialty.toLowerCase();
  return documents.filter(doc => 
    doc.specialty.toLowerCase().includes(lowerSpecialty)
  );
}

/**
 * Get unique specialties in the corpus
 * @param {MTSamplesDocument[]} documents - All documents
 * @returns {Map<string, number>} Map of specialty name to document count
 */
function getSpecialtyCounts(documents) {
  const counts = new Map();
  for (const doc of documents) {
    const count = counts.get(doc.specialty) || 0;
    counts.set(doc.specialty, count + 1);
  }
  return counts;
}

/**
 * Get a stratified sample across specialties
 * @param {MTSamplesDocument[]} documents - All documents
 * @param {number} count - Target number of documents
 * @param {function} random - Seeded random function
 * @returns {MTSamplesDocument[]} Stratified sample
 */
function getStratifiedSample(documents, count, random) {
  const bySpecialty = new Map();
  
  // Group by specialty
  for (const doc of documents) {
    if (!bySpecialty.has(doc.specialty)) {
      bySpecialty.set(doc.specialty, []);
    }
    bySpecialty.get(doc.specialty).push(doc);
  }
  
  const specialties = Array.from(bySpecialty.keys());
  const perSpecialty = Math.ceil(count / specialties.length);
  const sample = [];
  
  for (const specialty of specialties) {
    const docs = bySpecialty.get(specialty);
    const toTake = Math.min(perSpecialty, docs.length);
    
    // Shuffle using provided random function
    const shuffled = [...docs].sort(() => random() - 0.5);
    sample.push(...shuffled.slice(0, toTake));
  }
  
  // Shuffle final sample and trim to exact count
  return sample.sort(() => random() - 0.5).slice(0, count);
}

/**
 * Get document complexity score based on content analysis
 * @param {MTSamplesDocument} doc - Document to analyze
 * @returns {number} Complexity score 1-5
 */
function getComplexityScore(doc) {
  let score = 1;
  
  // Length factors
  if (doc.wordCount > 500) score += 1;
  if (doc.wordCount > 1000) score += 1;
  
  // Section indicators (suggests structured document)
  const sectionPatterns = /^(HISTORY|PHYSICAL|ASSESSMENT|PLAN|IMPRESSION|DIAGNOSIS|PROCEDURE|FINDINGS):/gm;
  const sectionMatches = doc.transcription.match(sectionPatterns);
  if (sectionMatches && sectionMatches.length > 3) score += 1;
  
  // Multiple dates/times suggest complex timeline
  const datePatterns = /\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}/g;
  const dateMatches = doc.transcription.match(datePatterns);
  if (dateMatches && dateMatches.length > 2) score += 1;
  
  return Math.min(score, 5);
}

/**
 * Statistics about the loaded corpus
 * @param {MTSamplesDocument[]} documents - All documents
 * @returns {Object} Corpus statistics
 */
function getCorpusStats(documents) {
  const specialtyCounts = getSpecialtyCounts(documents);
  const wordCounts = documents.map(d => d.wordCount);
  const charCounts = documents.map(d => d.charCount);
  
  return {
    totalDocuments: documents.length,
    totalWords: wordCounts.reduce((a, b) => a + b, 0),
    totalChars: charCounts.reduce((a, b) => a + b, 0),
    avgWordCount: Math.round(wordCounts.reduce((a, b) => a + b, 0) / documents.length),
    avgCharCount: Math.round(charCounts.reduce((a, b) => a + b, 0) / documents.length),
    minWordCount: Math.min(...wordCounts),
    maxWordCount: Math.max(...wordCounts),
    specialtyCount: specialtyCounts.size,
    specialties: Object.fromEntries(specialtyCounts),
    complexityDistribution: {
      1: documents.filter(d => getComplexityScore(d) === 1).length,
      2: documents.filter(d => getComplexityScore(d) === 2).length,
      3: documents.filter(d => getComplexityScore(d) === 3).length,
      4: documents.filter(d => getComplexityScore(d) === 4).length,
      5: documents.filter(d => getComplexityScore(d) === 5).length,
    },
  };
}

module.exports = {
  loadMTSamples,
  filterBySpecialty,
  getSpecialtyCounts,
  getStratifiedSample,
  getComplexityScore,
  getCorpusStats,
  DEFAULT_MTSAMPLES_PATH,
};
