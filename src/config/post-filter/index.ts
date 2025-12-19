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

import * as fs from "fs";
import * as path from "path";
import { PostFilterTermsSchema } from "./schemas";
import { RadiologyLogger } from "../../utils/RadiologyLogger";

// ============================================================================
// CONFIG DIRECTORY
// ============================================================================

/**
 * Get the config directory path.
 * Works in both development (src/) and production (dist/) environments.
 */
function getConfigDir(): string {
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

const cache = new Map<string, Set<string>>();
const arrayCache = new Map<string, string[]>();
let configLoaded = false;

// ============================================================================
// LOADER FUNCTIONS
// ============================================================================

/**
 * Load terms from a JSON config file
 * @param filename - The config file name (without .json extension)
 * @returns Set of lowercase terms
 */
function loadTermsAsSet(filename: string): Set<string> {
  const cacheKey = `set:${filename}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const configDir = getConfigDir();
  const filePath = path.join(configDir, `${filename}.json`);

  if (!fs.existsSync(filePath)) {
    RadiologyLogger.warn("PostFilterConfig", `Config file not found: ${filePath}`);
    // Return empty set rather than failing - allows graceful degradation
    const emptySet = new Set<string>();
    cache.set(cacheKey, emptySet);
    return emptySet;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const parsed = PostFilterTermsSchema.parse(raw);

    // Normalize to lowercase for case-insensitive matching
    const termSet = new Set(parsed.terms.map((t) => t.toLowerCase()));
    cache.set(cacheKey, termSet);

    return termSet;
  } catch (error) {
    RadiologyLogger.error("PostFilterConfig", `Failed to load ${filename}`, error);
    const emptySet = new Set<string>();
    cache.set(cacheKey, emptySet);
    return emptySet;
  }
}

/**
 * Load terms from a JSON config file as an array (preserves order)
 * @param filename - The config file name (without .json extension)
 * @returns Array of lowercase terms
 */
export function loadTermsAsArray(filename: string): string[] {
  const cacheKey = `array:${filename}`;
  if (arrayCache.has(cacheKey)) {
    return arrayCache.get(cacheKey)!;
  }

  const configDir = getConfigDir();
  const filePath = path.join(configDir, `${filename}.json`);

  if (!fs.existsSync(filePath)) {
    RadiologyLogger.warn("PostFilterConfig", `Config file not found: ${filePath}`);
    const emptyArray: string[] = [];
    arrayCache.set(cacheKey, emptyArray);
    return emptyArray;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const parsed = PostFilterTermsSchema.parse(raw);

    // Normalize to lowercase
    const terms = parsed.terms.map((t) => t.toLowerCase());
    arrayCache.set(cacheKey, terms);

    return terms;
  } catch (error) {
    RadiologyLogger.error("PostFilterConfig", `Failed to load ${filename}`, error);
    const emptyArray: string[] = [];
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
export function preloadAllConfigs(): void {
  if (configLoaded) return;

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
export function clearConfigCache(): void {
  cache.clear();
  arrayCache.clear();
  configLoaded = false;
}

/**
 * Get section headings (multi-word ALL CAPS headings)
 */
export function getSectionHeadings(): Set<string> {
  return loadTermsAsSet("section-headings");
}

/**
 * Get single-word headings (single ALL CAPS words)
 */
export function getSingleWordHeadings(): Set<string> {
  return loadTermsAsSet("single-word-headings");
}

/**
 * Get document structure words
 */
export function getStructureWords(): Set<string> {
  return loadTermsAsSet("structure-words");
}

/**
 * Get medical phrases (clinical terminology)
 */
export function getMedicalPhrases(): Set<string> {
  return loadTermsAsSet("medical-phrases");
}

/**
 * Get geographic terms
 */
export function getGeoTerms(): Set<string> {
  return loadTermsAsSet("geo-terms");
}

/**
 * Get field labels
 */
export function getFieldLabels(): Set<string> {
  return loadTermsAsSet("field-labels");
}

/**
 * Check if a term is a section heading
 */
export function isSectionHeading(term: string): boolean {
  return getSectionHeadings().has(term.toLowerCase());
}

/**
 * Check if a term is a single-word heading
 */
export function isSingleWordHeading(term: string): boolean {
  return getSingleWordHeadings().has(term.toLowerCase());
}

/**
 * Check if a term is a structure word
 */
export function isStructureWord(term: string): boolean {
  return getStructureWords().has(term.toLowerCase());
}

/**
 * Check if a term is a medical phrase
 */
export function isMedicalPhrase(term: string): boolean {
  return getMedicalPhrases().has(term.toLowerCase());
}

/**
 * Check if a term is a geographic term
 */
export function isGeoTerm(term: string): boolean {
  return getGeoTerms().has(term.toLowerCase());
}

/**
 * Check if a term is a field label
 */
export function isFieldLabel(term: string): boolean {
  return getFieldLabels().has(term.toLowerCase());
}
