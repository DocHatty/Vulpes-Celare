/**
 * AhoCorasick - Efficient Multi-Pattern String Matching
 *
 * Implements the Aho-Corasick algorithm for finding multiple patterns
 * in text in O(n + m + z) time where:
 * - n = text length
 * - m = total pattern length
 * - z = number of matches
 *
 * This replaces O(n × m) linear scanning used in HospitalDictionary.
 *
 * @module utils
 */
/**
 * Match result from Aho-Corasick search
 */
export interface AhoCorasickMatch {
    pattern: string;
    start: number;
    end: number;
}
/**
 * Aho-Corasick automaton for multi-pattern matching
 */
export declare class AhoCorasick {
    private root;
    private built;
    private patterns;
    constructor();
    /**
     * Create a new trie node
     */
    private createNode;
    /**
     * Add a pattern to the automaton
     * Must call build() after adding all patterns
     *
     * @param pattern - Pattern to add (case-insensitive)
     */
    addPattern(pattern: string): void;
    /**
     * Add multiple patterns at once
     *
     * @param patterns - Array of patterns to add
     */
    addPatterns(patterns: string[]): void;
    /**
     * Build the failure links using BFS
     * Must be called after adding all patterns
     */
    build(): void;
    /**
     * Search for all patterns in text
     *
     * @param text - Text to search in
     * @returns Array of matches with pattern, start, and end positions
     */
    search(text: string): AhoCorasickMatch[];
    /**
     * Search and return original-case matches from the input text
     *
     * @param text - Text to search in
     * @returns Array of matches with original text preserved
     */
    searchWithOriginalCase(text: string): Array<AhoCorasickMatch & {
        originalText: string;
    }>;
    /**
     * Check if any pattern exists in text
     *
     * @param text - Text to search in
     * @returns True if any pattern is found
     */
    contains(text: string): boolean;
    /**
     * Get the number of patterns in the automaton
     */
    get patternCount(): number;
    /**
     * Get all patterns (for debugging)
     */
    getPatterns(): string[];
}
/**
 * Factory function to create and build an Aho-Corasick automaton
 *
 * @param patterns - Array of patterns
 * @returns Built automaton ready for searching
 */
export declare function createAhoCorasick(patterns: string[]): AhoCorasick;
//# sourceMappingURL=AhoCorasick.d.ts.map