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
/**
 * Load terms from a JSON config file as an array (preserves order)
 * @param filename - The config file name (without .json extension)
 * @returns Array of lowercase terms
 */
export declare function loadTermsAsArray(filename: string): string[];
/**
 * Preload all config files at startup.
 * This is optional but recommended for production to fail fast.
 */
export declare function preloadAllConfigs(): void;
/**
 * Clear the config cache (useful for testing or hot-reloading)
 */
export declare function clearConfigCache(): void;
/**
 * Get section headings (multi-word ALL CAPS headings)
 */
export declare function getSectionHeadings(): Set<string>;
/**
 * Get single-word headings (single ALL CAPS words)
 */
export declare function getSingleWordHeadings(): Set<string>;
/**
 * Get document structure words
 */
export declare function getStructureWords(): Set<string>;
/**
 * Get medical phrases (clinical terminology)
 */
export declare function getMedicalPhrases(): Set<string>;
/**
 * Get geographic terms
 */
export declare function getGeoTerms(): Set<string>;
/**
 * Get field labels
 */
export declare function getFieldLabels(): Set<string>;
/**
 * Check if a term is a section heading
 */
export declare function isSectionHeading(term: string): boolean;
/**
 * Check if a term is a single-word heading
 */
export declare function isSingleWordHeading(term: string): boolean;
/**
 * Check if a term is a structure word
 */
export declare function isStructureWord(term: string): boolean;
/**
 * Check if a term is a medical phrase
 */
export declare function isMedicalPhrase(term: string): boolean;
/**
 * Check if a term is a geographic term
 */
export declare function isGeoTerm(term: string): boolean;
/**
 * Check if a term is a field label
 */
export declare function isFieldLabel(term: string): boolean;
//# sourceMappingURL=index.d.ts.map