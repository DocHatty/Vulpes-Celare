"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AhoCorasick = void 0;
exports.createAhoCorasick = createAhoCorasick;
/**
 * Aho-Corasick automaton for multi-pattern matching
 */
class AhoCorasick {
    root;
    built = false;
    patterns = [];
    constructor() {
        this.root = this.createNode(0);
    }
    /**
     * Create a new trie node
     */
    createNode(depth) {
        return {
            children: new Map(),
            fail: null,
            output: [],
            depth,
        };
    }
    /**
     * Add a pattern to the automaton
     * Must call build() after adding all patterns
     *
     * @param pattern - Pattern to add (case-insensitive)
     */
    addPattern(pattern) {
        if (this.built) {
            throw new Error("Cannot add patterns after build()");
        }
        const normalizedPattern = pattern.toLowerCase();
        this.patterns.push(normalizedPattern);
        let node = this.root;
        for (const char of normalizedPattern) {
            if (!node.children.has(char)) {
                node.children.set(char, this.createNode(node.depth + 1));
            }
            node = node.children.get(char);
        }
        node.output.push(normalizedPattern);
    }
    /**
     * Add multiple patterns at once
     *
     * @param patterns - Array of patterns to add
     */
    addPatterns(patterns) {
        for (const pattern of patterns) {
            if (pattern && pattern.length > 0) {
                this.addPattern(pattern);
            }
        }
    }
    /**
     * Build the failure links using BFS
     * Must be called after adding all patterns
     */
    build() {
        if (this.built)
            return;
        const queue = [];
        // Initialize failure links for depth-1 nodes to root
        for (const child of this.root.children.values()) {
            child.fail = this.root;
            queue.push(child);
        }
        // BFS to build failure links
        while (queue.length > 0) {
            const current = queue.shift();
            for (const [char, child] of current.children) {
                queue.push(child);
                // Find failure link
                let fail = current.fail;
                while (fail !== null && !fail.children.has(char)) {
                    fail = fail.fail;
                }
                child.fail = fail ? fail.children.get(char) : this.root;
                // Merge output from failure link
                if (child.fail !== this.root) {
                    child.output = [...child.output, ...child.fail.output];
                }
            }
        }
        this.built = true;
    }
    /**
     * Search for all patterns in text
     *
     * @param text - Text to search in
     * @returns Array of matches with pattern, start, and end positions
     */
    search(text) {
        if (!this.built) {
            throw new Error("Must call build() before search()");
        }
        const matches = [];
        const normalizedText = text.toLowerCase();
        let node = this.root;
        for (let i = 0; i < normalizedText.length; i++) {
            const char = normalizedText[i];
            // Follow failure links until we find a match or reach root
            while (node !== this.root && !node.children.has(char)) {
                node = node.fail;
            }
            node = node.children.get(char) || this.root;
            // Report all patterns that end at this position
            for (const pattern of node.output) {
                matches.push({
                    pattern,
                    start: i - pattern.length + 1,
                    end: i + 1,
                });
            }
        }
        return matches;
    }
    /**
     * Search and return original-case matches from the input text
     *
     * @param text - Text to search in
     * @returns Array of matches with original text preserved
     */
    searchWithOriginalCase(text) {
        const matches = this.search(text);
        return matches.map((match) => ({
            ...match,
            originalText: text.substring(match.start, match.end),
        }));
    }
    /**
     * Check if any pattern exists in text
     *
     * @param text - Text to search in
     * @returns True if any pattern is found
     */
    contains(text) {
        if (!this.built) {
            throw new Error("Must call build() before contains()");
        }
        const normalizedText = text.toLowerCase();
        let node = this.root;
        for (const char of normalizedText) {
            while (node !== this.root && !node.children.has(char)) {
                node = node.fail;
            }
            node = node.children.get(char) || this.root;
            if (node.output.length > 0) {
                return true;
            }
        }
        return false;
    }
    /**
     * Get the number of patterns in the automaton
     */
    get patternCount() {
        return this.patterns.length;
    }
    /**
     * Get all patterns (for debugging)
     */
    getPatterns() {
        return [...this.patterns];
    }
}
exports.AhoCorasick = AhoCorasick;
/**
 * Factory function to create and build an Aho-Corasick automaton
 *
 * @param patterns - Array of patterns
 * @returns Built automaton ready for searching
 */
function createAhoCorasick(patterns) {
    const ac = new AhoCorasick();
    ac.addPatterns(patterns);
    ac.build();
    return ac;
}
//# sourceMappingURL=AhoCorasick.js.map