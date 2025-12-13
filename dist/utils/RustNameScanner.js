"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RustNameScanner = void 0;
const binding_1 = require("../native/binding");
const NameDictionary_1 = require("../dictionaries/NameDictionary");
let cachedScanner = undefined;
let cachedInitialized = false;
function getScanner() {
    if (cachedScanner !== undefined)
        return cachedScanner;
    try {
        const binding = (0, binding_1.loadNativeBinding)({ configureOrt: false });
        if (binding.VulpesNameScanner) {
            cachedScanner = new binding.VulpesNameScanner();
            return cachedScanner;
        }
    }
    catch {
        // ignore
    }
    cachedScanner = null;
    return cachedScanner;
}
function ensureInitialized() {
    if (cachedInitialized)
        return;
    const scanner = getScanner();
    if (!scanner)
        return;
    // Load dictionaries once from disk; they already live in src/dictionaries/.
    const { firstNames, surnames } = NameDictionary_1.NameDictionary.getNameLists();
    scanner.initialize(firstNames, surnames);
    cachedInitialized = true;
}
exports.RustNameScanner = {
    isAvailable() {
        return Boolean(getScanner());
    },
    detectLastFirst(text) {
        const scanner = getScanner();
        if (!scanner)
            return [];
        ensureInitialized();
        if (!cachedInitialized)
            return [];
        try {
            return scanner.detectLastFirst(text);
        }
        catch {
            return [];
        }
    },
    detectFirstLast(text) {
        const scanner = getScanner();
        if (!scanner?.detectFirstLast)
            return [];
        ensureInitialized();
        if (!cachedInitialized)
            return [];
        try {
            return scanner.detectFirstLast(text);
        }
        catch {
            return [];
        }
    },
    detectSmart(text) {
        const scanner = getScanner();
        if (!scanner?.detectSmart)
            return [];
        ensureInitialized();
        if (!cachedInitialized)
            return [];
        try {
            return scanner.detectSmart(text);
        }
        catch {
            return [];
        }
    },
};
//# sourceMappingURL=RustNameScanner.js.map