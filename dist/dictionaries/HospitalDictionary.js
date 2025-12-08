"use strict";
/**
 * HospitalDictionary - Healthcare Facility Name Lookup Service
 *
 * Provides O(1) lookup for 7,389 healthcare facility names including:
 * - Hospitals
 * - Medical centers
 * - Health systems
 * - Clinics
 * - Indian Health Service facilities
 *
 * Used to detect organization names that could identify patient location.
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
exports.HospitalDictionary = exports.HospitalDictionaryInitError = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const RadiologyLogger_1 = require("../utils/RadiologyLogger");
/**
 * Hospital dictionary initialization error
 */
class HospitalDictionaryInitError extends Error {
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = "HospitalDictionaryInitError";
    }
}
exports.HospitalDictionaryInitError = HospitalDictionaryInitError;
class HospitalDictionary {
    /**
     * Initialize the hospital dictionary from file
     *
     * @throws {HospitalDictionaryInitError} If throwOnError is true and loading fails
     */
    static init(options = {}) {
        if (this.initialized)
            return;
        const { throwOnError = false } = options;
        this.initError = null;
        const hospitalsPath = path.join(__dirname, "hospitals.txt");
        try {
            if (fs.existsSync(hospitalsPath)) {
                const content = fs.readFileSync(hospitalsPath, "utf-8");
                const entries = content
                    .split("\n")
                    .map((line) => line.trim().toLowerCase())
                    .filter((line) => line.length > 0);
                this.hospitals = new Set(entries);
                // Keep array for multi-word phrase matching
                this.hospitalPhrases = entries.filter((e) => e.includes(" "));
                RadiologyLogger_1.RadiologyLogger.info("DICTIONARY", `Loaded ${this.hospitals.size} hospitals (${this.hospitalPhrases.length} phrases)`);
            }
            else {
                const errorMsg = `Hospital dictionary not found: ${hospitalsPath}`;
                this.initError = errorMsg;
                RadiologyLogger_1.RadiologyLogger.warn("DICTIONARY", errorMsg);
                this.hospitals = new Set();
                this.hospitalPhrases = [];
                if (throwOnError) {
                    throw new HospitalDictionaryInitError(errorMsg);
                }
            }
        }
        catch (error) {
            if (error instanceof HospitalDictionaryInitError)
                throw error;
            const errorMsg = `Failed to load hospital dictionary: ${error instanceof Error ? error.message : String(error)}`;
            this.initError = errorMsg;
            RadiologyLogger_1.RadiologyLogger.error("DICTIONARY", errorMsg);
            this.hospitals = new Set();
            this.hospitalPhrases = [];
            if (throwOnError) {
                throw new HospitalDictionaryInitError(errorMsg, error instanceof Error ? error : undefined);
            }
        }
        this.initialized = true;
        if (this.initError) {
            RadiologyLogger_1.RadiologyLogger.warn("DICTIONARY", "HospitalDictionary initialized with errors. Hospital name detection may be degraded.");
        }
    }
    /**
     * Get initialization status
     */
    static getStatus() {
        return {
            initialized: this.initialized,
            hospitalsLoaded: this.hospitals !== null && this.hospitals.size > 0,
            hospitalCount: this.hospitals?.size || 0,
            phraseCount: this.hospitalPhrases?.length || 0,
            error: this.initError,
        };
    }
    /**
     * Check if dictionary is properly loaded
     */
    static isHealthy() {
        if (!this.initialized)
            this.init();
        return (this.hospitals?.size || 0) > 0;
    }
    /**
     * Force initialization with error throwing (for tests/startup validation)
     */
    static initStrict() {
        this.init({ throwOnError: true });
    }
    /**
     * Check if a phrase is a known hospital name
     * @param phrase - The phrase to check (case-insensitive)
     * @returns true if the phrase matches a hospital name
     */
    static isHospital(phrase) {
        if (!this.initialized)
            this.init();
        if (!this.hospitals)
            return false;
        const normalized = phrase.toLowerCase().trim();
        return this.hospitals.has(normalized);
    }
    /**
     * Find all hospital names in a text
     * @param text - The text to search
     * @returns Array of matches with position and matched text
     */
    static findHospitalsInText(text) {
        if (!this.initialized)
            this.init();
        if (!this.hospitalPhrases || this.hospitalPhrases.length === 0)
            return [];
        const matches = [];
        const lowerText = text.toLowerCase();
        // Search for multi-word hospital names
        for (const hospital of this.hospitalPhrases) {
            let searchStart = 0;
            let index;
            while ((index = lowerText.indexOf(hospital, searchStart)) !== -1) {
                // Verify word boundaries
                const charBefore = index > 0 ? lowerText[index - 1] : " ";
                const charAfter = index + hospital.length < lowerText.length
                    ? lowerText[index + hospital.length]
                    : " ";
                const isWordBoundaryBefore = /[\s.,;:\-\n\r(]/.test(charBefore);
                const isWordBoundaryAfter = /[\s.,;:\-\n\r)]/.test(charAfter);
                if (isWordBoundaryBefore && isWordBoundaryAfter) {
                    // Get original case from text
                    const originalText = text.substring(index, index + hospital.length);
                    matches.push({
                        text: originalText,
                        start: index,
                        end: index + hospital.length,
                    });
                }
                searchStart = index + 1;
            }
        }
        // Sort by position and remove overlaps
        matches.sort((a, b) => a.start - b.start);
        const nonOverlapping = [];
        for (const match of matches) {
            const lastMatch = nonOverlapping[nonOverlapping.length - 1];
            if (!lastMatch || match.start >= lastMatch.end) {
                nonOverlapping.push(match);
            }
            else if (match.text.length > lastMatch.text.length) {
                // Prefer longer match
                nonOverlapping[nonOverlapping.length - 1] = match;
            }
        }
        return nonOverlapping;
    }
    /**
     * Get total count of hospitals in dictionary
     */
    static getCount() {
        if (!this.initialized)
            this.init();
        return this.hospitals?.size || 0;
    }
    /**
     * Check if a text contains any hospital-related keywords
     * (faster pre-filter before full dictionary search)
     */
    static hasHospitalKeywords(text) {
        const keywords = [
            "hospital",
            "medical center",
            "health center",
            "healthcare",
            "health care",
            "clinic",
            "infirmary",
            "memorial",
            "regional",
            "community",
            "general",
        ];
        const lowerText = text.toLowerCase();
        return keywords.some((kw) => lowerText.includes(kw));
    }
    /**
     * WHITELIST CHECK: Check if a potential name match is actually part of a hospital name.
     * This is used to PROTECT hospital name components from being redacted as patient names.
     *
     * Hospital names are NOT patient PHI under HIPAA Safe Harbor.
     *
     * @param potentialName - The potential name to check (e.g., "Johns", "Hopkins")
     * @param context - The surrounding text to check for hospital patterns
     * @returns true if this text is part of a hospital name and should NOT be redacted
     */
    static isPartOfHospitalName(potentialName, context) {
        if (!this.initialized)
            this.init();
        // Quick check: does context contain hospital keywords?
        if (!this.hasHospitalKeywords(context)) {
            return false;
        }
        // Find all hospital names in the context
        const hospitalMatches = this.findHospitalsInText(context);
        if (hospitalMatches.length === 0) {
            return false;
        }
        // Check if the potential name appears within any hospital name
        const potentialLower = potentialName.toLowerCase().trim();
        for (const match of hospitalMatches) {
            const hospitalLower = match.text.toLowerCase();
            if (hospitalLower.includes(potentialLower)) {
                return true; // This "name" is part of a hospital name - WHITELIST it
            }
        }
        return false;
    }
}
exports.HospitalDictionary = HospitalDictionary;
HospitalDictionary.hospitals = null;
HospitalDictionary.hospitalPhrases = null;
HospitalDictionary.initialized = false;
HospitalDictionary.initError = null;
//# sourceMappingURL=HospitalDictionary.js.map