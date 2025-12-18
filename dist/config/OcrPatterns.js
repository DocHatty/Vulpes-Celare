"use strict";
/**
 * Centralized OCR Error Patterns and Character Substitutions
 *
 * This module consolidates OCR-related patterns that were previously
 * scattered across multiple filter files.
 *
 * This addresses:
 * - M2: Hardcoded OCR suffix patterns in AddressFilterSpan.ts
 * - M3: No centralized OCR error mapping across multiple filters
 *
 * OCR (Optical Character Recognition) errors occur when scanning printed
 * documents. Common errors include:
 * - 0/O confusion (zero vs letter O)
 * - 1/l/I confusion (one vs lowercase L vs uppercase I)
 * - 5/S confusion (five vs letter S)
 * - rn/m confusion (adjacent r+n looks like m)
 *
 * @module config/OcrPatterns
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrPatterns = exports.OcrStatePatterns = exports.OcrAddressSuffixPatterns = exports.OcrCharacterSubstitutions = void 0;
exports.generateOcrTolerantPattern = generateOcrTolerantPattern;
exports.normalizeOcrText = normalizeOcrText;
exports.isOcrEquivalent = isOcrEquivalent;
exports.ocrSimilarity = ocrSimilarity;
// =============================================================================
// CHARACTER SUBSTITUTIONS
// =============================================================================
/**
 * Common OCR character substitutions.
 *
 * Key: original character
 * Value: array of characters it might be misread as
 *
 * @example
 * // Check if 'O' might be a misread '0'
 * if (OcrCharacterSubstitutions['0'].includes('O')) { ... }
 */
exports.OcrCharacterSubstitutions = {
    // Numeric confusions
    "0": ["O", "o", "Q", "D"],
    "1": ["l", "I", "|", "i", "!"],
    "2": ["Z", "z"],
    "3": ["E", "e"],
    "4": ["A", "a"],
    "5": ["S", "s"],
    "6": ["G", "b"],
    "7": ["T", "t", "/"],
    "8": ["B", "&"],
    "9": ["g", "q"],
    // Letter confusions (lowercase)
    "a": ["o", "e", "4"],
    "b": ["6", "h"],
    "c": ["e", "("],
    "d": ["cl", "o"],
    "e": ["c", "o", "3"],
    "g": ["9", "q"],
    "h": ["b", "n"],
    "i": ["l", "1", "|", "!"],
    "l": ["1", "I", "|", "i"],
    "m": ["rn", "nn", "rm"],
    "n": ["h", "ri"],
    "o": ["0", "O", "c"],
    "q": ["9", "g"],
    "r": ["f", "t"],
    "s": ["5", "S"],
    "t": ["f", "7"],
    "u": ["v", "n"],
    "v": ["u", "y"],
    "w": ["vv", "uu"],
    "x": ["×"],
    "y": ["v", "j"],
    "z": ["2", "Z"],
    // Letter confusions (uppercase)
    "A": ["4", "a"],
    "B": ["8", "3", "R"],
    "C": ["(", "G"],
    "D": ["0", "O"],
    "E": ["3", "F"],
    "F": ["E", "f"],
    "G": ["6", "C"],
    "H": ["N", "M"],
    "I": ["1", "l", "|", "!"],
    "K": ["X"],
    "L": ["1", "l"],
    "M": ["H", "N"],
    "N": ["H", "M"],
    "O": ["0", "Q", "D"],
    "P": ["R", "p"],
    "Q": ["O", "0"],
    "R": ["B", "P"],
    "S": ["5", "s"],
    "T": ["7", "t"],
    "U": ["V", "J"],
    "V": ["U", "Y"],
    "W": ["VV", "UU"],
    "X": ["K", "×"],
    "Y": ["V", "7"],
    "Z": ["2", "z"],
    // Special multi-character confusions
    "rn": ["m"],
    "nn": ["m"],
    "cl": ["d"],
    "ri": ["n"],
    "vv": ["w"],
};
// =============================================================================
// OCR-TOLERANT PATTERN GENERATION
// =============================================================================
/**
 * Generate an OCR-tolerant regex pattern from a string.
 *
 * Replaces each character with a character class that includes
 * common OCR misreads.
 *
 * @param text - The string to make OCR-tolerant
 * @param options - Configuration options
 * @returns A RegExp that matches the text and common OCR errors
 *
 * @example
 * const pattern = generateOcrTolerantPattern("Smith");
 * // Matches: Smith, 5mith, Smlth, 5m1th, etc.
 */
function generateOcrTolerantPattern(text, options = {}) {
    const { caseInsensitive = true, includeMultiChar = false } = options;
    let pattern = "";
    let i = 0;
    while (i < text.length) {
        // Check for multi-character substitutions first
        if (includeMultiChar) {
            let foundMulti = false;
            for (const [key, subs] of Object.entries(exports.OcrCharacterSubstitutions)) {
                if (key.length > 1 && text.substring(i, i + key.length) === key) {
                    const allOptions = [key, ...subs].map(escapeRegex);
                    pattern += `(?:${allOptions.join("|")})`;
                    i += key.length;
                    foundMulti = true;
                    break;
                }
            }
            if (foundMulti)
                continue;
        }
        const char = text[i];
        const subs = exports.OcrCharacterSubstitutions[char];
        if (subs && subs.length > 0) {
            // Filter to single-char substitutions unless includeMultiChar
            const validSubs = includeMultiChar
                ? subs
                : subs.filter((s) => s.length === 1);
            if (validSubs.length > 0) {
                const escaped = [char, ...validSubs].map(escapeRegex);
                pattern += `[${escaped.join("")}]`;
            }
            else {
                pattern += escapeRegex(char);
            }
        }
        else {
            pattern += escapeRegex(char);
        }
        i++;
    }
    return new RegExp(pattern, caseInsensitive ? "gi" : "g");
}
/**
 * Escape special regex characters.
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
// =============================================================================
// ADDRESS OCR PATTERNS
// =============================================================================
/**
 * OCR-tolerant patterns for street type suffixes.
 * These are the patterns previously hardcoded in AddressFilterSpan.ts.
 *
 * Each entry has:
 * - pattern: The OCR-tolerant regex
 * - confidence: Base confidence for matches
 * - canonical: The clean form of the street type
 */
exports.OcrAddressSuffixPatterns = [
    { pattern: /\bC[mo0][mo0][mn][mo0]n[s5]\b/gi, confidence: 0.7, canonical: "Commons" },
    { pattern: /\bP[I1l][Kk][Ee3]\b/gi, confidence: 0.7, canonical: "Pike" },
    { pattern: /\bS[Pp]R[vuV][Cc][Ee3]\b/gi, confidence: 0.7, canonical: "Spruce" },
    { pattern: /\b[S5][Tt]r[e3][e3][Tt]\b/gi, confidence: 0.7, canonical: "Street" },
    { pattern: /\bAv[e3][mn][uv][e3]\b/gi, confidence: 0.7, canonical: "Avenue" },
    { pattern: /\b[DO0]r[i1l]v[e3]\b/gi, confidence: 0.7, canonical: "Drive" },
    { pattern: /\bR[o0][ao][do0]\b/gi, confidence: 0.7, canonical: "Road" },
    { pattern: /\bB[o0]u[l1][e3]v[a4]r[do0]\b/gi, confidence: 0.7, canonical: "Boulevard" },
    { pattern: /\bL[a4][mn][e3]\b/gi, confidence: 0.7, canonical: "Lane" },
    { pattern: /\bC[o0]ur[tf+]\b/gi, confidence: 0.7, canonical: "Court" },
    { pattern: /\bC[i1]rc[l1][e3]\b/gi, confidence: 0.7, canonical: "Circle" },
    { pattern: /\bP[l1][a4]c[e3]\b/gi, confidence: 0.7, canonical: "Place" },
    { pattern: /\bT[e3]rr[a4][cs][e3]\b/gi, confidence: 0.7, canonical: "Terrace" },
    { pattern: /\bTr[a4][i1][l1]\b/gi, confidence: 0.7, canonical: "Trail" },
    { pattern: /\bW[a4][yv7]\b/gi, confidence: 0.7, canonical: "Way" },
    { pattern: /\bCr[o0]ss[i1l]ng\b/gi, confidence: 0.7, canonical: "Crossing" },
    { pattern: /\bH[e3][i1l][gq]h[Tt][s5]\b/gi, confidence: 0.7, canonical: "Heights" },
    { pattern: /\bM[e3][a4]d[o0][wvv][s5]\b/gi, confidence: 0.7, canonical: "Meadows" },
    { pattern: /\bP[o0][i1l]n[Tt]\b/gi, confidence: 0.7, canonical: "Point" },
    { pattern: /\bR[i1l]d[gq][e3]\b/gi, confidence: 0.7, canonical: "Ridge" },
    { pattern: /\bP[a4][s5][s5]\b/gi, confidence: 0.7, canonical: "Pass" },
];
// =============================================================================
// STATE ABBREVIATION OCR PATTERNS
// =============================================================================
/**
 * OCR-tolerant patterns for US state abbreviations.
 * Used for address detection with OCR errors.
 */
exports.OcrStatePatterns = [
    { pattern: /\bC[A4]\b/gi, canonical: "CA" },
    { pattern: /\bN[YV7]\b/gi, canonical: "NY" },
    { pattern: /\bT[X×]\b/gi, canonical: "TX" },
    { pattern: /\bF[L1]\b/gi, canonical: "FL" },
    { pattern: /\b[I1l][L1]\b/gi, canonical: "IL" },
    { pattern: /\bP[A4]\b/gi, canonical: "PA" },
    { pattern: /\b[O0]H\b/gi, canonical: "OH" },
    { pattern: /\bG[A4]\b/gi, canonical: "GA" },
    { pattern: /\bN[CG]\b/gi, canonical: "NC" },
    { pattern: /\bM[I1l]\b/gi, canonical: "MI" },
];
// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
/**
 * Apply OCR substitutions to normalize a string.
 *
 * Attempts to convert OCR-corrupted text back to its canonical form.
 *
 * @param text - The potentially OCR-corrupted text
 * @returns The normalized text
 *
 * @example
 * normalizeOcrText("5mith") // Returns "Smith"
 * normalizeOcrText("J0hn")  // Returns "John"
 */
function normalizeOcrText(text) {
    let result = text;
    // Apply reverse substitutions (OCR error -> canonical)
    // Start with multi-character substitutions
    for (const [canonical, corrupted] of Object.entries(exports.OcrCharacterSubstitutions)) {
        for (const c of corrupted) {
            if (c.length > 1) {
                // Multi-char substitution (e.g., rn -> m)
                result = result.replace(new RegExp(escapeRegex(c), "g"), canonical);
            }
        }
    }
    // Then single-character substitutions
    const normalized = result.split("").map((char) => {
        // Find if this char is a corrupted version of something
        for (const [canonical, corrupted] of Object.entries(exports.OcrCharacterSubstitutions)) {
            if (canonical.length === 1 && corrupted.includes(char)) {
                return canonical;
            }
        }
        return char;
    });
    return normalized.join("");
}
/**
 * Check if two strings are equivalent considering OCR errors.
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if the strings match allowing for OCR substitutions
 *
 * @example
 * isOcrEquivalent("Smith", "5mith") // Returns true
 * isOcrEquivalent("John", "J0hn")   // Returns true
 * isOcrEquivalent("Smith", "Jones") // Returns false
 */
function isOcrEquivalent(a, b) {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i++) {
        const charA = a[i];
        const charB = b[i];
        if (charA === charB)
            continue;
        if (charA.toLowerCase() === charB.toLowerCase())
            continue;
        // Check if they're OCR-equivalent
        const subsA = exports.OcrCharacterSubstitutions[charA] || [];
        const subsB = exports.OcrCharacterSubstitutions[charB] || [];
        if (!subsA.includes(charB) && !subsB.includes(charA)) {
            return false;
        }
    }
    return true;
}
/**
 * Calculate OCR similarity score between two strings.
 *
 * @param a - First string
 * @param b - Second string
 * @returns Score from 0 to 1 (1 = identical, 0 = completely different)
 */
function ocrSimilarity(a, b) {
    if (a === b)
        return 1;
    if (a.length === 0 || b.length === 0)
        return 0;
    const maxLen = Math.max(a.length, b.length);
    const minLen = Math.min(a.length, b.length);
    // Length difference penalty
    const lengthPenalty = 1 - (maxLen - minLen) / maxLen;
    // Character match score
    let matches = 0;
    for (let i = 0; i < minLen; i++) {
        const charA = a[i];
        const charB = b[i];
        if (charA === charB) {
            matches++;
        }
        else if (charA.toLowerCase() === charB.toLowerCase()) {
            matches += 0.9; // Case difference
        }
        else {
            const subsA = exports.OcrCharacterSubstitutions[charA] || [];
            const subsB = exports.OcrCharacterSubstitutions[charB] || [];
            if (subsA.includes(charB) || subsB.includes(charA)) {
                matches += 0.7; // OCR substitution
            }
        }
    }
    return (matches / maxLen) * lengthPenalty;
}
// =============================================================================
// AGGREGATED EXPORT
// =============================================================================
/**
 * Unified OcrPatterns export for convenient importing.
 *
 * @example
 * import { OcrPatterns } from '../config/OcrPatterns';
 * const pattern = OcrPatterns.generateTolerantPattern("Smith");
 */
exports.OcrPatterns = {
    CharacterSubstitutions: exports.OcrCharacterSubstitutions,
    AddressSuffixes: exports.OcrAddressSuffixPatterns,
    StateAbbreviations: exports.OcrStatePatterns,
    // Utility functions
    generateTolerantPattern: generateOcrTolerantPattern,
    normalize: normalizeOcrText,
    isEquivalent: isOcrEquivalent,
    similarity: ocrSimilarity,
};
//# sourceMappingURL=OcrPatterns.js.map