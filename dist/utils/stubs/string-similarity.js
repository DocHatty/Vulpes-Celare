"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareTwoStrings = compareTwoStrings;
exports.findBestMatch = findBestMatch;
function compareTwoStrings(a, b) {
    if (a === b)
        return 1;
    if (a.length < 2 || b.length < 2)
        return 0;
    return 0.5; // Simplified stub
}
function findBestMatch(s, arr) {
    return { bestMatch: { target: arr[0] || "", rating: 0.5 }, ratings: [] };
}
//# sourceMappingURL=string-similarity.js.map