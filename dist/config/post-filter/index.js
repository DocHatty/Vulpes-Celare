"use strict";
/**
 * ============================================================================
 * VULPES CELARE - POST-FILTER CONFIG LOADER
 * ============================================================================
 *
 * Loads and caches post-filter term configurations from JSON files.
 * Provides type-safe access to externalized configuration.
 *
 * @module config/post-filter
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadTermsAsArray = loadTermsAsArray;
exports.preloadAllConfigs = preloadAllConfigs;
exports.clearConfigCache = clearConfigCache;
exports.getSectionHeadings = getSectionHeadings;
exports.getSingleWordHeadings = getSingleWordHeadings;
exports.getStructureWords = getStructureWords;
exports.getMedicalPhrases = getMedicalPhrases;
exports.getGeoTerms = getGeoTerms;
exports.getFieldLabels = getFieldLabels;
exports.isSectionHeading = isSectionHeading;
exports.isSingleWordHeading = isSingleWordHeading;
exports.isStructureWord = isStructureWord;
exports.isMedicalPhrase = isMedicalPhrase;
exports.isGeoTerm = isGeoTerm;
exports.isFieldLabel = isFieldLabel;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const schemas_1 = require("./schemas");
// ============================================================================
// CONFIG DIRECTORY
// ============================================================================
/**
 * Get the config directory path.
 * Works in both development (src/) and production (dist/) environments.
 */
function getConfigDir() {
    // Try dist path first (production)
    const distPath = path.join(__dirname, "..", "..", "..", "config", "post-filter");
    if (fs.existsSync(distPath)) {
        return distPath;
    }
    // Fall back to current directory (if configs are copied alongside compiled JS)
    const localPath = __dirname;
    if (fs.existsSync(path.join(localPath, "section-headings.json"))) {
        return localPath;
    }
    // Try src path (development with ts-node)
    const srcPath = path.join(__dirname, "..", "..", "..", "src", "config", "post-filter");
    if (fs.existsSync(srcPath)) {
        return srcPath;
    }
    // Default to current directory
    return __dirname;
}
// ============================================================================
// CACHE
// ============================================================================
const cache = new Map();
const arrayCache = new Map();
let configLoaded = false;
// ============================================================================
// LOADER FUNCTIONS
// ============================================================================
/**
 * Load terms from a JSON config file
 * @param filename - The config file name (without .json extension)
 * @returns Set of lowercase terms
 */
function loadTermsAsSet(filename) {
    const cacheKey = `set:${filename}`;
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }
    const configDir = getConfigDir();
    const filePath = path.join(configDir, `${filename}.json`);
    if (!fs.existsSync(filePath)) {
        console.warn(`[PostFilterConfig] Config file not found: ${filePath}`);
        // Return empty set rather than failing - allows graceful degradation
        const emptySet = new Set();
        cache.set(cacheKey, emptySet);
        return emptySet;
    }
    try {
        const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const parsed = schemas_1.PostFilterTermsSchema.parse(raw);
        // Normalize to lowercase for case-insensitive matching
        const termSet = new Set(parsed.terms.map((t) => t.toLowerCase()));
        cache.set(cacheKey, termSet);
        return termSet;
    }
    catch (error) {
        console.error(`[PostFilterConfig] Failed to load ${filename}:`, error);
        const emptySet = new Set();
        cache.set(cacheKey, emptySet);
        return emptySet;
    }
}
/**
 * Load terms from a JSON config file as an array (preserves order)
 * @param filename - The config file name (without .json extension)
 * @returns Array of lowercase terms
 */
function loadTermsAsArray(filename) {
    const cacheKey = `array:${filename}`;
    if (arrayCache.has(cacheKey)) {
        return arrayCache.get(cacheKey);
    }
    const configDir = getConfigDir();
    const filePath = path.join(configDir, `${filename}.json`);
    if (!fs.existsSync(filePath)) {
        console.warn(`[PostFilterConfig] Config file not found: ${filePath}`);
        const emptyArray = [];
        arrayCache.set(cacheKey, emptyArray);
        return emptyArray;
    }
    try {
        const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const parsed = schemas_1.PostFilterTermsSchema.parse(raw);
        // Normalize to lowercase
        const terms = parsed.terms.map((t) => t.toLowerCase());
        arrayCache.set(cacheKey, terms);
        return terms;
    }
    catch (error) {
        console.error(`[PostFilterConfig] Failed to load ${filename}:`, error);
        const emptyArray = [];
        arrayCache.set(cacheKey, emptyArray);
        return emptyArray;
    }
}
// ============================================================================
// PUBLIC API
// ============================================================================
/**
 * Preload all config files at startup.
 * This is optional but recommended for production to fail fast.
 */
function preloadAllConfigs() {
    if (configLoaded)
        return;
    const configs = [
        "section-headings",
        "single-word-headings",
        "structure-words",
        "medical-phrases",
        "geo-terms",
        "field-labels",
    ];
    for (const config of configs) {
        loadTermsAsSet(config);
    }
    configLoaded = true;
}
/**
 * Clear the config cache (useful for testing or hot-reloading)
 */
function clearConfigCache() {
    cache.clear();
    arrayCache.clear();
    configLoaded = false;
}
/**
 * Get section headings (multi-word ALL CAPS headings)
 */
function getSectionHeadings() {
    return loadTermsAsSet("section-headings");
}
/**
 * Get single-word headings (single ALL CAPS words)
 */
function getSingleWordHeadings() {
    return loadTermsAsSet("single-word-headings");
}
/**
 * Get document structure words
 */
function getStructureWords() {
    return loadTermsAsSet("structure-words");
}
/**
 * Get medical phrases (clinical terminology)
 */
function getMedicalPhrases() {
    return loadTermsAsSet("medical-phrases");
}
/**
 * Get geographic terms
 */
function getGeoTerms() {
    return loadTermsAsSet("geo-terms");
}
/**
 * Get field labels
 */
function getFieldLabels() {
    return loadTermsAsSet("field-labels");
}
/**
 * Check if a term is a section heading
 */
function isSectionHeading(term) {
    return getSectionHeadings().has(term.toLowerCase());
}
/**
 * Check if a term is a single-word heading
 */
function isSingleWordHeading(term) {
    return getSingleWordHeadings().has(term.toLowerCase());
}
/**
 * Check if a term is a structure word
 */
function isStructureWord(term) {
    return getStructureWords().has(term.toLowerCase());
}
/**
 * Check if a term is a medical phrase
 */
function isMedicalPhrase(term) {
    return getMedicalPhrases().has(term.toLowerCase());
}
/**
 * Check if a term is a geographic term
 */
function isGeoTerm(term) {
    return getGeoTerms().has(term.toLowerCase());
}
/**
 * Check if a term is a field label
 */
function isFieldLabel(term) {
    return getFieldLabels().has(term.toLowerCase());
}
//# sourceMappingURL=index.js.map