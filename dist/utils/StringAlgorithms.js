"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.soundex = soundex;
exports.levenshtein = levenshtein;
exports.damerauLevenshtein = damerauLevenshtein;
exports.levenshteinSimilarity = levenshteinSimilarity;
exports.isWithinEditDistance = isWithinEditDistance;
exports.jaroSimilarity = jaroSimilarity;
exports.jaroWinklerSimilarity = jaroWinklerSimilarity;
exports.doubleMetaphone = doubleMetaphone;
exports.arePhoneticallySimlar = arePhoneticallySimlar;
/**
 * Soundex algorithm - phonetic algorithm for indexing names by sound
 * Maps names that sound similar to the same code
 *
 * @param str - String to encode
 * @returns 4-character Soundex code
 */
function soundex(str) {
    if (!str || str.length === 0)
        return "0000";
    const s = str.toUpperCase().replace(/[^A-Z]/g, "");
    if (s.length === 0)
        return "0000";
    // Soundex mapping
    const map = {
        B: "1", F: "1", P: "1", V: "1",
        C: "2", G: "2", J: "2", K: "2", Q: "2", S: "2", X: "2", Z: "2",
        D: "3", T: "3",
        L: "4",
        M: "5", N: "5",
        R: "6",
        // A, E, I, O, U, H, W, Y are not coded
    };
    let code = s[0]; // Keep first letter
    let prev = map[s[0]] || "";
    for (let i = 1; i < s.length && code.length < 4; i++) {
        const curr = map[s[i]] || "";
        if (curr && curr !== prev) {
            code += curr;
        }
        prev = curr || prev; // H and W don't break up double letters
    }
    return (code + "0000").substring(0, 4);
}
/**
 * Levenshtein distance - minimum edits to transform one string to another
 * Operations: insert, delete, substitute (all cost 1)
 *
 * @param a - First string
 * @param b - Second string
 * @returns Edit distance (0 = identical)
 */
function levenshtein(a, b) {
    if (a === b)
        return 0;
    if (a.length === 0)
        return b.length;
    if (b.length === 0)
        return a.length;
    // Use single-row optimization for space efficiency
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    let prev = new Array(bLower.length + 1);
    let curr = new Array(bLower.length + 1);
    // Initialize first row
    for (let j = 0; j <= bLower.length; j++) {
        prev[j] = j;
    }
    for (let i = 1; i <= aLower.length; i++) {
        curr[0] = i;
        for (let j = 1; j <= bLower.length; j++) {
            const cost = aLower[i - 1] === bLower[j - 1] ? 0 : 1;
            curr[j] = Math.min(prev[j] + 1, // deletion
            curr[j - 1] + 1, // insertion
            prev[j - 1] + cost // substitution
            );
        }
        [prev, curr] = [curr, prev];
    }
    return prev[bLower.length];
}
/**
 * Damerau-Levenshtein distance - Levenshtein + transposition
 * Operations: insert, delete, substitute, transpose (all cost 1)
 *
 * @param a - First string
 * @param b - Second string
 * @returns Edit distance with transpositions
 */
function damerauLevenshtein(a, b) {
    if (a === b)
        return 0;
    if (a.length === 0)
        return b.length;
    if (b.length === 0)
        return a.length;
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const lenA = aLower.length;
    const lenB = bLower.length;
    // Full matrix needed for transposition
    const d = [];
    for (let i = 0; i <= lenA; i++) {
        d[i] = new Array(lenB + 1);
        d[i][0] = i;
    }
    for (let j = 0; j <= lenB; j++) {
        d[0][j] = j;
    }
    for (let i = 1; i <= lenA; i++) {
        for (let j = 1; j <= lenB; j++) {
            const cost = aLower[i - 1] === bLower[j - 1] ? 0 : 1;
            d[i][j] = Math.min(d[i - 1][j] + 1, // deletion
            d[i][j - 1] + 1, // insertion
            d[i - 1][j - 1] + cost // substitution
            );
            // Transposition
            if (i > 1 &&
                j > 1 &&
                aLower[i - 1] === bLower[j - 2] &&
                aLower[i - 2] === bLower[j - 1]) {
                d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
            }
        }
    }
    return d[lenA][lenB];
}
/**
 * Normalized similarity score (0-1) based on Levenshtein
 *
 * @param a - First string
 * @param b - Second string
 * @returns Similarity score (1 = identical, 0 = completely different)
 */
function levenshteinSimilarity(a, b) {
    if (a === b)
        return 1;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0)
        return 1;
    return 1 - levenshtein(a, b) / maxLen;
}
/**
 * Check if two strings are within edit distance threshold
 *
 * @param a - First string
 * @param b - Second string
 * @param maxDistance - Maximum edit distance
 * @returns True if distance <= maxDistance
 */
function isWithinEditDistance(a, b, maxDistance) {
    // Quick length check - can't be within distance if lengths differ too much
    if (Math.abs(a.length - b.length) > maxDistance) {
        return false;
    }
    return levenshtein(a, b) <= maxDistance;
}
/**
 * Jaro similarity - useful for short strings like names
 * Returns value between 0 (no similarity) and 1 (identical)
 *
 * @param a - First string
 * @param b - Second string
 * @returns Jaro similarity score
 */
function jaroSimilarity(a, b) {
    if (a === b)
        return 1;
    if (a.length === 0 || b.length === 0)
        return 0;
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const matchWindow = Math.floor(Math.max(aLower.length, bLower.length) / 2) - 1;
    const aMatches = new Array(aLower.length).fill(false);
    const bMatches = new Array(bLower.length).fill(false);
    let matches = 0;
    let transpositions = 0;
    // Find matches
    for (let i = 0; i < aLower.length; i++) {
        const start = Math.max(0, i - matchWindow);
        const end = Math.min(i + matchWindow + 1, bLower.length);
        for (let j = start; j < end; j++) {
            if (bMatches[j] || aLower[i] !== bLower[j])
                continue;
            aMatches[i] = true;
            bMatches[j] = true;
            matches++;
            break;
        }
    }
    if (matches === 0)
        return 0;
    // Count transpositions
    let k = 0;
    for (let i = 0; i < aLower.length; i++) {
        if (!aMatches[i])
            continue;
        while (!bMatches[k])
            k++;
        if (aLower[i] !== bLower[k])
            transpositions++;
        k++;
    }
    return ((matches / aLower.length +
        matches / bLower.length +
        (matches - transpositions / 2) / matches) /
        3);
}
/**
 * Jaro-Winkler similarity - Jaro with prefix bonus
 * Better for names where common prefixes indicate similarity
 *
 * @param a - First string
 * @param b - Second string
 * @param prefixScale - Scaling factor for prefix bonus (default 0.1)
 * @returns Jaro-Winkler similarity score
 */
function jaroWinklerSimilarity(a, b, prefixScale = 0.1) {
    const jaro = jaroSimilarity(a, b);
    // Calculate common prefix length (up to 4 characters)
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    let prefixLen = 0;
    const maxPrefix = Math.min(4, Math.min(aLower.length, bLower.length));
    for (let i = 0; i < maxPrefix; i++) {
        if (aLower[i] === bLower[i]) {
            prefixLen++;
        }
        else {
            break;
        }
    }
    return jaro + prefixLen * prefixScale * (1 - jaro);
}
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
function doubleMetaphone(str) {
    // Simplified implementation - for full version use PhoneticMatcher
    // This provides basic phonetic encoding for common cases
    if (!str || str.length === 0)
        return ["", ""];
    const s = str.toUpperCase().replace(/[^A-Z]/g, "");
    if (s.length === 0)
        return ["", ""];
    let primary = "";
    let secondary = "";
    let i = 0;
    // Skip silent letters at start
    if (/^(GN|KN|PN|WR|PS)/.test(s)) {
        i = 1;
    }
    while (i < s.length && primary.length < 4) {
        const char = s[i];
        const next = s[i + 1] || "";
        const prev = s[i - 1] || "";
        switch (char) {
            case "A":
            case "E":
            case "I":
            case "O":
            case "U":
                if (i === 0) {
                    primary += "A";
                    secondary += "A";
                }
                i++;
                break;
            case "B":
                primary += "P";
                secondary += "P";
                i += (next === "B") ? 2 : 1;
                break;
            case "C":
                if (next === "H") {
                    primary += "X";
                    secondary += "X";
                    i += 2;
                }
                else if (next === "I" || next === "E" || next === "Y") {
                    primary += "S";
                    secondary += "S";
                    i++;
                }
                else {
                    primary += "K";
                    secondary += "K";
                    i++;
                }
                break;
            case "D":
                if (next === "G" && /[IEY]/.test(s[i + 2] || "")) {
                    primary += "J";
                    secondary += "J";
                    i += 2;
                }
                else {
                    primary += "T";
                    secondary += "T";
                    i += (next === "D") ? 2 : 1;
                }
                break;
            case "F":
                primary += "F";
                secondary += "F";
                i += (next === "F") ? 2 : 1;
                break;
            case "G":
                if (next === "H") {
                    if (i > 0 && !/[AEIOU]/.test(prev)) {
                        i += 2;
                    }
                    else {
                        primary += "K";
                        secondary += "K";
                        i += 2;
                    }
                }
                else if (next === "N") {
                    primary += "N";
                    secondary += "KN";
                    i += 2;
                }
                else {
                    primary += "K";
                    secondary += "K";
                    i += (next === "G") ? 2 : 1;
                }
                break;
            case "H":
                if (/[AEIOU]/.test(prev) && /[AEIOU]/.test(next)) {
                    i++;
                }
                else if (/[AEIOU]/.test(next)) {
                    primary += "H";
                    secondary += "H";
                    i++;
                }
                else {
                    i++;
                }
                break;
            case "J":
                primary += "J";
                secondary += "J";
                i += (next === "J") ? 2 : 1;
                break;
            case "K":
                primary += "K";
                secondary += "K";
                i += (next === "K") ? 2 : 1;
                break;
            case "L":
                primary += "L";
                secondary += "L";
                i += (next === "L") ? 2 : 1;
                break;
            case "M":
                primary += "M";
                secondary += "M";
                i += (next === "M") ? 2 : 1;
                break;
            case "N":
                primary += "N";
                secondary += "N";
                i += (next === "N") ? 2 : 1;
                break;
            case "P":
                if (next === "H") {
                    primary += "F";
                    secondary += "F";
                    i += 2;
                }
                else {
                    primary += "P";
                    secondary += "P";
                    i += (next === "P") ? 2 : 1;
                }
                break;
            case "Q":
                primary += "K";
                secondary += "K";
                i += (next === "Q") ? 2 : 1;
                break;
            case "R":
                primary += "R";
                secondary += "R";
                i += (next === "R") ? 2 : 1;
                break;
            case "S":
                if (next === "H") {
                    primary += "X";
                    secondary += "X";
                    i += 2;
                }
                else if (next === "I" && (s[i + 2] === "O" || s[i + 2] === "A")) {
                    primary += "X";
                    secondary += "S";
                    i += 3;
                }
                else {
                    primary += "S";
                    secondary += "S";
                    i += (next === "S") ? 2 : 1;
                }
                break;
            case "T":
                if (next === "H") {
                    primary += "0"; // theta
                    secondary += "T";
                    i += 2;
                }
                else if (next === "I" && (s[i + 2] === "O" || s[i + 2] === "A")) {
                    primary += "X";
                    secondary += "X";
                    i += 3;
                }
                else {
                    primary += "T";
                    secondary += "T";
                    i += (next === "T") ? 2 : 1;
                }
                break;
            case "V":
                primary += "F";
                secondary += "F";
                i += (next === "V") ? 2 : 1;
                break;
            case "W":
                if (/[AEIOU]/.test(next)) {
                    primary += "W";
                    secondary += "W";
                }
                i++;
                break;
            case "X":
                primary += "KS";
                secondary += "KS";
                i += (next === "X") ? 2 : 1;
                break;
            case "Y":
                if (/[AEIOU]/.test(next)) {
                    primary += "Y";
                    secondary += "Y";
                }
                i++;
                break;
            case "Z":
                primary += "S";
                secondary += "S";
                i += (next === "Z") ? 2 : 1;
                break;
            default:
                i++;
        }
    }
    return [primary.substring(0, 4), secondary.substring(0, 4)];
}
/**
 * Check if two strings are phonetically similar
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if strings have matching phonetic codes
 */
function arePhoneticallySimlar(a, b) {
    const [aP, aS] = doubleMetaphone(a);
    const [bP, bS] = doubleMetaphone(b);
    // Match if any combination of codes match
    return ((aP.length > 0 && (aP === bP || aP === bS)) ||
        (aS.length > 0 && (aS === bP || aS === bS)));
}
//# sourceMappingURL=StringAlgorithms.js.map