/**
 * StringAlgorithms - Centralized String Matching Utilities
 *
 * Consolidates duplicate implementations of:
 * - Soundex (was in 4 places)
 * - Levenshtein/Damerau-Levenshtein (was in 3 places)
 * - Double Metaphone hooks
 *
 * @module utils
 */
/**
 * Soundex algorithm - phonetic algorithm for indexing names by sound
 * Maps names that sound similar to the same code
 *
 * @param str - String to encode
 * @returns 4-character Soundex code
 */
export declare function soundex(str: string): string;
/**
 * Levenshtein distance - minimum edits to transform one string to another
 * Operations: insert, delete, substitute (all cost 1)
 *
 * @param a - First string
 * @param b - Second string
 * @returns Edit distance (0 = identical)
 */
export declare function levenshtein(a: string, b: string): number;
/**
 * Damerau-Levenshtein distance - Levenshtein + transposition
 * Operations: insert, delete, substitute, transpose (all cost 1)
 *
 * @param a - First string
 * @param b - Second string
 * @returns Edit distance with transpositions
 */
export declare function damerauLevenshtein(a: string, b: string): number;
/**
 * Normalized similarity score (0-1) based on Levenshtein
 *
 * @param a - First string
 * @param b - Second string
 * @returns Similarity score (1 = identical, 0 = completely different)
 */
export declare function levenshteinSimilarity(a: string, b: string): number;
/**
 * Check if two strings are within edit distance threshold
 *
 * @param a - First string
 * @param b - Second string
 * @param maxDistance - Maximum edit distance
 * @returns True if distance <= maxDistance
 */
export declare function isWithinEditDistance(a: string, b: string, maxDistance: number): boolean;
/**
 * Jaro similarity - useful for short strings like names
 * Returns value between 0 (no similarity) and 1 (identical)
 *
 * @param a - First string
 * @param b - Second string
 * @returns Jaro similarity score
 */
export declare function jaroSimilarity(a: string, b: string): number;
/**
 * Jaro-Winkler similarity - Jaro with prefix bonus
 * Better for names where common prefixes indicate similarity
 *
 * @param a - First string
 * @param b - Second string
 * @param prefixScale - Scaling factor for prefix bonus (default 0.1)
 * @returns Jaro-Winkler similarity score
 */
export declare function jaroWinklerSimilarity(a: string, b: string, prefixScale?: number): number;
/**
 * Double Metaphone encoding (simplified)
 * Returns primary and secondary codes for better phonetic matching
 *
 * Note: Full implementation is complex. This uses the existing
 * PhoneticMatcher implementation if available.
 *
 * @param str - String to encode
 * @returns [primary, secondary] metaphone codes
 */
export declare function doubleMetaphone(str: string): [string, string];
/**
 * Check if two strings are phonetically similar
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if strings have matching phonetic codes
 */
export declare function arePhoneticallySimlar(a: string, b: string): boolean;
//# sourceMappingURL=StringAlgorithms.d.ts.map