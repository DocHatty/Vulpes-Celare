"use strict";
/**
 * NameDictionary - First Name and Surname Validation Service
 *
 * Uses Phileas's 30K first names and 162K surnames dictionaries
 * to validate whether detected "names" are actually real names.
 *
 * This dramatically reduces false positives like "Timeline Narrative"
 * being flagged as a name (since "Timeline" is not a first name).
 *
 * Performance: O(1) lookup using Set, loaded once at startup.
 *
 * @module redaction/dictionaries
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
exports.NameDictionary = exports.DictionaryInitError = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const RadiologyLogger_1 = require("../utils/RadiologyLogger");
const PhoneticMatcher_1 = require("../utils/PhoneticMatcher");
/**
 * Dictionary initialization error - thrown when dictionaries cannot be loaded
 */
class DictionaryInitError extends Error {
    constructor(message, dictionaryType, cause) {
        super(message);
        this.dictionaryType = dictionaryType;
        this.cause = cause;
        this.name = "DictionaryInitError";
    }
}
exports.DictionaryInitError = DictionaryInitError;
class NameDictionary {
    static isPhoneticEnabled() {
        // Rust phonetic matching is now DEFAULT (promoted from opt-in).
        // Set VULPES_ENABLE_PHONETIC=0 to disable.
        const val = process.env.VULPES_ENABLE_PHONETIC;
        return val === undefined || val === "1";
    }
    static getPhoneticThreshold() {
        const raw = process.env.VULPES_PHONETIC_THRESHOLD;
        const parsed = raw ? Number(raw) : Number.NaN;
        if (!Number.isFinite(parsed))
            return 0.95;
        return Math.min(1, Math.max(0, parsed));
    }
    /**
     * Initialize dictionaries from files
     * Call once at app startup
     *
     * @throws {DictionaryInitError} If dictionaries cannot be loaded and throwOnError is true
     */
    static init(options = {}) {
        if (this.initialized)
            return;
        const { throwOnError = false } = options;
        this.initErrors = [];
        const dictPath = path.join(__dirname);
        // Load first names (30K entries)
        const firstNamesPath = path.join(dictPath, "first-names.txt");
        try {
            if (fs.existsSync(firstNamesPath)) {
                const firstNamesContent = fs.readFileSync(firstNamesPath, "utf-8");
                this.firstNames = new Set(firstNamesContent
                    .split("\n")
                    .map((name) => name.trim().toLowerCase())
                    .filter((name) => name.length > 0));
                RadiologyLogger_1.RadiologyLogger.info("DICTIONARY", `Loaded ${this.firstNames.size} first names`);
            }
            else {
                const errorMsg = `First names dictionary not found: ${firstNamesPath}`;
                this.initErrors.push(errorMsg);
                RadiologyLogger_1.RadiologyLogger.warn("DICTIONARY", errorMsg);
                this.firstNames = new Set();
                if (throwOnError) {
                    throw new DictionaryInitError(errorMsg, "firstNames");
                }
            }
        }
        catch (error) {
            if (error instanceof DictionaryInitError)
                throw error;
            const errorMsg = `Failed to load first names dictionary: ${error instanceof Error ? error.message : String(error)}`;
            this.initErrors.push(errorMsg);
            RadiologyLogger_1.RadiologyLogger.error("DICTIONARY", errorMsg);
            this.firstNames = new Set();
            if (throwOnError) {
                throw new DictionaryInitError(errorMsg, "firstNames", error instanceof Error ? error : undefined);
            }
        }
        // Load surnames (162K entries)
        const surnamesPath = path.join(dictPath, "surnames.txt");
        try {
            if (fs.existsSync(surnamesPath)) {
                const surnamesContent = fs.readFileSync(surnamesPath, "utf-8");
                this.surnames = new Set(surnamesContent
                    .split("\n")
                    .map((name) => name.trim().toLowerCase())
                    .filter((name) => name.length > 0));
                RadiologyLogger_1.RadiologyLogger.info("DICTIONARY", `Loaded ${this.surnames.size} surnames`);
            }
            else {
                const errorMsg = `Surnames dictionary not found: ${surnamesPath}`;
                this.initErrors.push(errorMsg);
                RadiologyLogger_1.RadiologyLogger.warn("DICTIONARY", errorMsg);
                this.surnames = new Set();
                if (throwOnError) {
                    throw new DictionaryInitError(errorMsg, "surnames");
                }
            }
        }
        catch (error) {
            if (error instanceof DictionaryInitError)
                throw error;
            const errorMsg = `Failed to load surnames dictionary: ${error instanceof Error ? error.message : String(error)}`;
            this.initErrors.push(errorMsg);
            RadiologyLogger_1.RadiologyLogger.error("DICTIONARY", errorMsg);
            this.surnames = new Set();
            if (throwOnError) {
                throw new DictionaryInitError(errorMsg, "surnames", error instanceof Error ? error : undefined);
            }
        }
        this.initialized = true;
        // Phonetic matching is optional (it can shift sensitivity/specificity tradeoffs).
        // Enable via `VULPES_ENABLE_PHONETIC=1` when experimenting/tuning.
        if (this.isPhoneticEnabled()) {
            this.initPhoneticMatcher();
        }
        // Log overall status
        if (this.initErrors.length > 0) {
            RadiologyLogger_1.RadiologyLogger.warn("DICTIONARY", `NameDictionary initialized with ${this.initErrors.length} error(s). Name validation may be degraded.`);
        }
    }
    /**
     * Initialize the phonetic matcher for fuzzy name matching
     * This enables detection of OCR-corrupted names like "PENEL0PE" -> "PENELOPE"
     */
    static initPhoneticMatcher() {
        if (this.phoneticInitialized)
            return;
        try {
            const firstNamesArray = this.firstNames
                ? Array.from(this.firstNames)
                : [];
            const surnamesArray = this.surnames ? Array.from(this.surnames) : [];
            if (firstNamesArray.length > 0 || surnamesArray.length > 0) {
                this.phoneticMatcher = new PhoneticMatcher_1.PhoneticMatcher();
                this.phoneticMatcher.initialize(firstNamesArray, surnamesArray);
                this.phoneticInitialized = true;
                if (this.isPhoneticEnabled()) {
                    RadiologyLogger_1.RadiologyLogger.info("DICTIONARY", `PhoneticMatcher initialized for fuzzy name matching`);
                }
            }
        }
        catch (error) {
            RadiologyLogger_1.RadiologyLogger.warn("DICTIONARY", `Failed to initialize PhoneticMatcher: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Get initialization status
     */
    static getStatus() {
        return {
            initialized: this.initialized,
            firstNamesLoaded: this.firstNames !== null && this.firstNames.size > 0,
            surnamesLoaded: this.surnames !== null && this.surnames.size > 0,
            firstNamesCount: this.firstNames?.size || 0,
            surnamesCount: this.surnames?.size || 0,
            errors: [...this.initErrors],
        };
    }
    /**
     * Check if dictionaries are properly loaded
     */
    static isHealthy() {
        if (!this.initialized)
            return false;
        return (this.firstNames?.size || 0) > 0 && (this.surnames?.size || 0) > 0;
    }
    /**
     * Normalize common OCR errors
     * @ -> a
     * 0 -> o
     * 1 -> l
     * 3 -> e
     * c -> e (common in this dataset: Brcnda -> Brenda, Pctcrson -> Peterson)
     * $ -> s
     * 8 -> b
     * 9 -> g
     * 5 -> s
     * | -> l
     * I -> l (common in names: WiIlliam -> William, EIiz@beth -> Elizabeth)
     */
    static normalizeOCR(text) {
        return (text
            .replace(/@/g, "a")
            .replace(/0/g, "o")
            .replace(/1/g, "l")
            .replace(/3/g, "e")
            .replace(/\$/g, "s")
            .replace(/8/g, "b")
            .replace(/9/g, "g")
            .replace(/5/g, "s")
            .replace(/\|/g, "l")
            .replace(/I/g, "l")
            // Only replace 'c' with 'e' if it makes sense?
            // For now, simple replacement as we are validating against a dictionary.
            // If "Brcnda" becomes "Brenda" (valid), good.
            // If "Cat" becomes "Eat" (not a name), it won't match anyway.
            .replace(/c/g, "e"));
    }
    static deduplicate(text) {
        return text.replace(/(.)\1+/g, "$1");
    }
    /**
     * Check if a word is a known first name
     * Uses exact match, OCR normalization, deduplication, and phonetic matching
     */
    static isFirstName(name) {
        if (!this.initialized)
            this.init();
        if (!this.firstNames)
            return false;
        if (!name)
            return false;
        const lower = name.toLowerCase().trim();
        if (this.firstNames.has(lower))
            return true;
        // Try OCR normalization
        const normalized = this.normalizeOCR(lower);
        if (normalized !== lower && this.firstNames.has(normalized))
            return true;
        // Try deduplication (handle T@yyl0r -> Taylor, WiIlliam -> William)
        const deduplicated = this.deduplicate(normalized);
        if (deduplicated !== normalized && this.firstNames.has(deduplicated))
            return true;
        // Optional: phonetic match for OCR-corrupted names (Rust-accelerated when native is available).
        // Kept opt-in because it can shift sensitivity/specificity tradeoffs on some corpora.
        if (this.isPhoneticEnabled()) {
            if (!this.phoneticInitialized)
                this.initPhoneticMatcher();
            if (this.phoneticMatcher && this.phoneticInitialized) {
                const phoneticMatch = this.phoneticMatcher.matchFirstName(name);
                if (phoneticMatch &&
                    phoneticMatch.confidence >= this.getPhoneticThreshold()) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Check if a word is a known surname
     * Uses exact match, OCR normalization, deduplication, and phonetic matching
     */
    static isSurname(name) {
        if (!this.initialized)
            this.init();
        if (!this.surnames)
            return false;
        if (!name)
            return false;
        const lower = name.toLowerCase().trim();
        if (this.surnames.has(lower))
            return true;
        // Try OCR normalization
        const normalized = this.normalizeOCR(lower);
        if (normalized !== lower && this.surnames.has(normalized))
            return true;
        // Try deduplication
        const deduplicated = this.deduplicate(normalized);
        if (deduplicated !== normalized && this.surnames.has(deduplicated))
            return true;
        if (this.isPhoneticEnabled()) {
            if (!this.phoneticInitialized)
                this.initPhoneticMatcher();
            if (this.phoneticMatcher && this.phoneticInitialized) {
                const phoneticMatch = this.phoneticMatcher.matchSurname(name);
                if (phoneticMatch &&
                    phoneticMatch.confidence >= this.getPhoneticThreshold()) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Get phonetic match details for a name (for debugging/logging)
     */
    static getPhoneticMatch(name) {
        if (!this.isPhoneticEnabled())
            return null;
        if (!this.phoneticInitialized)
            this.initPhoneticMatcher();
        if (!this.phoneticMatcher || !this.phoneticInitialized)
            return null;
        return this.phoneticMatcher.matchAnyName(name);
    }
    /**
     * Check if a two-word phrase is likely a real name
     * Returns confidence score 0.0 - 1.0
     *
     * "John Smith" → first name + surname → 1.0
     * "John Williams" → first name + surname → 1.0
     * "Timeline Narrative" → not first name → 0.0
     * "Rodriguez Garcia" → surname + surname → 0.5 (could be Hispanic name)
     */
    static getNameConfidence(phrase) {
        if (!this.initialized)
            this.init();
        const words = phrase.trim().split(/\s+/);
        if (words.length < 2)
            return 0.0;
        const firstWord = words[0];
        const lastWord = words[words.length - 1];
        const isFirstNameValid = this.isFirstName(firstWord);
        const isLastNameValid = this.isSurname(lastWord);
        // Both match → high confidence
        if (isFirstNameValid && isLastNameValid) {
            return 1.0;
        }
        // First name matches, last name doesn't → medium confidence
        // (could be unusual/foreign surname)
        if (isFirstNameValid && !isLastNameValid) {
            return 0.7;
        }
        // First name doesn't match, last name does → low confidence
        // (could be "Dr. Smith" pattern without the "Dr.")
        if (!isFirstNameValid && isLastNameValid) {
            // Check if first word could be a surname (Hispanic double surname)
            if (this.isSurname(firstWord)) {
                return 0.5;
            }
            return 0.2;
        }
        // Neither match → very low confidence
        // This catches "Timeline Narrative", "Physical Therapy", etc.
        return 0.0;
    }
    /**
     * Quick check: Is this phrase likely a real name?
     * Uses threshold of 0.5
     */
    static isLikelyRealName(phrase) {
        return this.getNameConfidence(phrase) >= 0.5;
    }
    /**
     * Get dictionary stats
     */
    static getStats() {
        if (!this.initialized)
            this.init();
        return {
            firstNames: this.firstNames?.size || 0,
            surnames: this.surnames?.size || 0,
        };
    }
    /**
     * Returns the loaded name dictionaries as arrays (lowercased).
     * Intended for initializing native/Rust accelerators.
     */
    static getNameLists() {
        if (!this.initialized)
            this.init();
        if (this.cachedNameLists)
            return this.cachedNameLists;
        const firstNames = this.firstNames ? Array.from(this.firstNames) : [];
        const surnames = this.surnames ? Array.from(this.surnames) : [];
        this.cachedNameLists = { firstNames, surnames };
        return this.cachedNameLists;
    }
}
exports.NameDictionary = NameDictionary;
NameDictionary.firstNames = null;
NameDictionary.surnames = null;
NameDictionary.initialized = false;
NameDictionary.initErrors = [];
NameDictionary.phoneticMatcher = null;
NameDictionary.phoneticInitialized = false;
NameDictionary.cachedNameLists = null;
//# sourceMappingURL=NameDictionary.js.map