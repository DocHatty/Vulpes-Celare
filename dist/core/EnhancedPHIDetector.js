"use strict";
/**
 * EnhancedPHIDetector - Unified Multi-Signal PHI Detection Pipeline
 *
 * RESEARCH BASIS: Integrates multiple SOTA techniques:
 * 1. Ensemble voting (2016 N-GRID winner approach)
 * 2. Document structure awareness (i2b2 research)
 * 3. Fuzzy dictionary matching (proven +5-10% for names)
 * 4. OCR chaos detection (adaptive thresholds)
 *
 * This orchestrator combines all signals for maximum accuracy.
 *
 * @module redaction/core
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
exports.enhancedDetector = exports.EnhancedPHIDetector = void 0;
const EnsembleVoter_1 = require("./EnsembleVoter");
const DocumentStructureAnalyzer_1 = require("../context/DocumentStructureAnalyzer");
const FuzzyDictionaryMatcher_1 = require("../dictionaries/FuzzyDictionaryMatcher");
const OcrChaosDetector_1 = require("../utils/OcrChaosDetector");
const NameDictionary_1 = require("../dictionaries/NameDictionary");
const lru_cache_1 = require("lru-cache");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const VulpesLogger_1 = require("../utils/VulpesLogger");
/**
 * Singleton orchestrator that combines all detection signals
 */
class EnhancedPHIDetector {
    static instance;
    voter;
    firstNameMatcher = null;
    surnameMatcher = null;
    initialized = false;
    // PERFORMANCE FIX: Use LRUCache instead of manual Map with FIFO eviction
    // LRUCache provides O(1) eviction of least-recently-used items with TTL support
    documentCache;
    constructor() {
        this.voter = new EnsembleVoter_1.EnsembleVoter();
        // Initialize LRU cache with proper eviction policy
        this.documentCache = new lru_cache_1.LRUCache({
            max: 100, // Max 100 cached documents
            ttl: 1000 * 60 * 5, // 5 minute TTL
            updateAgeOnGet: true, // Reset TTL on access
            allowStale: false, // Don't return stale entries
        });
    }
    static getInstance() {
        if (!EnhancedPHIDetector.instance) {
            EnhancedPHIDetector.instance = new EnhancedPHIDetector();
        }
        return EnhancedPHIDetector.instance;
    }
    /**
     * Initialize fuzzy dictionaries
     */
    init() {
        if (this.initialized)
            return;
        try {
            // Load first names for fuzzy matching
            const firstNamesPath = path.join(__dirname, "../dictionaries/first-names.txt");
            if (fs.existsSync(firstNamesPath)) {
                const names = fs
                    .readFileSync(firstNamesPath, "utf-8")
                    .split("\n")
                    .map((n) => n.trim())
                    .filter((n) => n.length > 0);
                this.firstNameMatcher = FuzzyDictionaryMatcher_1.FuzzyDictionaryMatcher.forFirstNames(names);
            }
            // Load surnames for fuzzy matching
            const surnamesPath = path.join(__dirname, "../dictionaries/surnames.txt");
            if (fs.existsSync(surnamesPath)) {
                const names = fs
                    .readFileSync(surnamesPath, "utf-8")
                    .split("\n")
                    .map((n) => n.trim())
                    .filter((n) => n.length > 0);
                this.surnameMatcher = FuzzyDictionaryMatcher_1.FuzzyDictionaryMatcher.forSurnames(names);
            }
            this.initialized = true;
        }
        catch (error) {
            VulpesLogger_1.vulpesLogger.error("EnhancedPHIDetector init error", { component: "EnhancedPHIDetector", error: String(error) });
            this.initialized = true; // Mark as initialized to avoid retry loops
        }
    }
    /**
     * Analyze a document once and cache results
     */
    analyzeDocument(text) {
        // Use first 500 chars as cache key
        const cacheKey = text.substring(0, 500);
        // PERFORMANCE FIX: LRUCache handles eviction automatically
        const cached = this.documentCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const profile = DocumentStructureAnalyzer_1.DocumentStructureAnalyzer.analyzeDocument(text);
        const chaos = OcrChaosDetector_1.OcrChaosDetector.analyze(text);
        const result = { profile, chaos };
        // LRUCache automatically evicts least-recently-used entries when max is reached
        this.documentCache.set(cacheKey, result);
        return result;
    }
    /**
     * MAIN METHOD: Evaluate a detection candidate with all signals
     */
    evaluate(candidate, context) {
        if (!this.initialized)
            this.init();
        const signals = [];
        // Get or compute document analysis
        const docAnalysis = context.documentProfile && context.chaosAnalysis
            ? { profile: context.documentProfile, chaos: context.chaosAnalysis }
            : this.analyzeDocument(context.fullText);
        // 1. PATTERN SIGNAL - from the original detector
        signals.push(EnsembleVoter_1.EnsembleVoter.patternSignal(candidate.baseConfidence, candidate.patternName));
        // 2. DICTIONARY SIGNAL - fuzzy name matching
        if (candidate.phiType === "NAME") {
            const dictSignal = this.getDictionarySignal(candidate.text);
            if (dictSignal) {
                signals.push(dictSignal);
            }
        }
        // 3. STRUCTURE SIGNAL - document position context
        const position = DocumentStructureAnalyzer_1.DocumentStructureAnalyzer.getPositionContext(context.fullText, candidate.start, docAnalysis.profile);
        const structureBoost = DocumentStructureAnalyzer_1.DocumentStructureAnalyzer.getContextBoost(position, candidate.phiType);
        if (Math.abs(structureBoost) > 0.05) {
            signals.push(EnsembleVoter_1.EnsembleVoter.structureSignal(0.5 + structureBoost, // Convert boost to confidence
            `${position.sectionType}/${position.fieldContext}`));
        }
        // 4. LABEL SIGNAL - nearby label context
        if (position.nearestLabel && position.labelDistance < 50) {
            const labelRelevance = this.getLabelRelevance(position.nearestLabel, candidate.phiType);
            if (labelRelevance > 0.3) {
                signals.push(EnsembleVoter_1.EnsembleVoter.labelSignal(labelRelevance, position.nearestLabel));
            }
        }
        // 5. CHAOS SIGNAL - adjust for document quality
        const chaosAdjustment = this.getChaosAdjustment(candidate.text, docAnalysis.chaos, candidate.phiType);
        if (Math.abs(chaosAdjustment - 0.5) > 0.1) {
            signals.push(EnsembleVoter_1.EnsembleVoter.chaosSignal(chaosAdjustment, docAnalysis.chaos.quality));
        }
        // 6. CONTEXT SIGNAL - surrounding text patterns
        const contextSignal = this.getContextSignal(candidate, context.fullText);
        if (contextSignal) {
            signals.push(contextSignal);
        }
        // Vote!
        const vote = this.voter.vote(signals);
        return {
            candidate,
            signals,
            finalConfidence: vote.combinedScore,
            recommendation: vote.recommendation,
            explanation: vote.explanation,
        };
    }
    /**
     * Batch evaluate multiple candidates (more efficient)
     */
    evaluateBatch(candidates, fullText) {
        // Analyze document once
        const docAnalysis = this.analyzeDocument(fullText);
        const context = {
            fullText,
            documentProfile: docAnalysis.profile,
            chaosAnalysis: docAnalysis.chaos,
        };
        return candidates.map((candidate) => this.evaluate(candidate, context));
    }
    /**
     * Quick filter: Should this candidate be redacted?
     */
    shouldRedact(candidate, fullText, threshold = 0.65) {
        const result = this.evaluate(candidate, { fullText });
        return result.finalConfidence >= threshold;
    }
    // ============ Private Signal Generators ============
    getDictionarySignal(nameText) {
        if (!this.firstNameMatcher || !this.surnameMatcher) {
            // Fall back to basic NameDictionary
            const confidence = NameDictionary_1.NameDictionary.getNameConfidence(nameText);
            if (confidence > 0) {
                return EnsembleVoter_1.EnsembleVoter.dictionarySignal(confidence, "basic-dict", false);
            }
            return null;
        }
        const words = nameText.trim().split(/\s+/);
        if (words.length < 1)
            return null;
        const firstWord = words[0];
        const lastWord = words[words.length - 1];
        // Check first name with fuzzy matching
        const firstMatch = this.firstNameMatcher.lookup(firstWord);
        const lastMatch = this.surnameMatcher.lookup(lastWord);
        // Calculate combined confidence
        let confidence = 0;
        let isFuzzy = false;
        if (firstMatch.matched && lastMatch.matched) {
            // Both matched
            confidence = (firstMatch.confidence + lastMatch.confidence) / 2;
            isFuzzy =
                firstMatch.matchType !== "EXACT" || lastMatch.matchType !== "EXACT";
        }
        else if (firstMatch.matched) {
            // Only first name matched
            confidence = firstMatch.confidence * 0.7;
            isFuzzy = firstMatch.matchType !== "EXACT";
        }
        else if (lastMatch.matched) {
            // Only last name matched
            confidence = lastMatch.confidence * 0.5;
            isFuzzy = lastMatch.matchType !== "EXACT";
        }
        if (confidence > 0.3) {
            const matchTypes = [
                firstMatch.matched ? firstMatch.matchType : null,
                lastMatch.matched ? lastMatch.matchType : null,
            ]
                .filter(Boolean)
                .join("+");
            return EnsembleVoter_1.EnsembleVoter.dictionarySignal(confidence, `fuzzy-dict (${matchTypes})`, isFuzzy);
        }
        return null;
    }
    getLabelRelevance(label, phiType) {
        const lowerLabel = label.toLowerCase();
        const labelPatterns = {
            NAME: [
                /\b(name|patient|member|client|contact|guardian|parent|spouse|emergency)\b/,
                /\b(first|last|middle|full|legal)\s*name\b/,
            ],
            DATE: [
                /\b(date|dob|birth|born|admission|discharge|visit|service)\b/,
                /\b(effective|expires?|issued)\b/,
            ],
            SSN: [/\b(ssn|social|security|ss#)\b/],
            PHONE: [/\b(phone|tel|telephone|cell|mobile|contact|fax)\b/],
            ADDRESS: [/\b(address|street|city|state|zip|residence|location)\b/],
            MRN: [/\b(mrn|medical\s*record|patient\s*id|chart|account)\b/],
            EMAIL: [/\b(email|e-mail|electronic\s*mail)\b/],
        };
        const patterns = labelPatterns[phiType] || [];
        for (const pattern of patterns) {
            if (pattern.test(lowerLabel)) {
                return 0.85; // High relevance
            }
        }
        // Generic label nearby is still somewhat relevant
        if (/\b(name|date|id|number|#)\b/.test(lowerLabel)) {
            return 0.5;
        }
        return 0.3; // Some label exists but not obviously relevant
    }
    getChaosAdjustment(text, chaos, phiType) {
        // In chaotic documents, be more lenient with detection
        // In clean documents, be stricter
        const weights = OcrChaosDetector_1.OcrChaosDetector.getConfidenceWeights(chaos.score);
        const casePattern = OcrChaosDetector_1.OcrChaosDetector.classifyCasePattern(text);
        let adjustment = weights[casePattern.toLowerCase()] || 0.7;
        // PHI types that are more resilient to OCR errors
        const ocrResilientTypes = ["SSN", "PHONE", "MRN", "EMAIL"]; // Structured patterns
        if (ocrResilientTypes.includes(phiType)) {
            // Don't penalize as much for chaos
            adjustment = Math.max(0.6, adjustment);
        }
        return adjustment;
    }
    getContextSignal(candidate, fullText) {
        const { start, end, phiType, text: _text } = candidate;
        // Get surrounding context (100 chars before and after)
        const contextStart = Math.max(0, start - 100);
        const contextEnd = Math.min(fullText.length, end + 100);
        const surroundingText = fullText
            .substring(contextStart, contextEnd)
            .toLowerCase();
        // PHI-specific context patterns
        const contextPatterns = {
            NAME: {
                positive: [
                    /\b(patient|member|client|contact|mr\.?|mrs\.?|ms\.?)\b/,
                    /\b(signed|witnessed|certified|authorized)\s+by\b/,
                    /\b(guardian|spouse|parent|child|sibling|relative)\b/,
                ],
                negative: [
                    /\b(hospital|clinic|center|institute|university|college)\b/,
                    /\b(medication|drug|diagnosis|procedure|treatment)\b/,
                    /\b(dr\.?|doctor|physician|nurse|provider)\s+/i, // Provider context
                ],
            },
            DATE: {
                positive: [
                    /\b(born|birth|dob|admission|discharge|visit|service)\b/,
                    /\b(effective|expires?|issued|signed|dated)\b/,
                ],
                negative: [
                    /\b(version|revision|updated|page|form)\b/,
                    /\b(copyright|published)\b/,
                ],
            },
            SSN: {
                positive: [
                    /\b(social|security|ssn|ss#)\b/,
                    /\b(identification|identity|verify)\b/,
                ],
                negative: [
                    /\b(phone|fax|tel|ext)\b/,
                    /\b(mrn|medical\s*record|account)\b/,
                ],
            },
        };
        const patterns = contextPatterns[phiType];
        if (!patterns)
            return null;
        let positiveScore = 0;
        let negativeScore = 0;
        for (const pattern of patterns.positive) {
            if (pattern.test(surroundingText))
                positiveScore += 0.15;
        }
        for (const pattern of patterns.negative) {
            if (pattern.test(surroundingText))
                negativeScore += 0.15;
        }
        const netScore = positiveScore - negativeScore;
        if (Math.abs(netScore) > 0.1) {
            return EnsembleVoter_1.EnsembleVoter.contextSignal(0.5 + netScore, // Center around 0.5, adjust by net score
            netScore > 0 ? "positive-context" : "negative-context");
        }
        return null;
    }
    /**
     * Clear document cache
     */
    clearCache() {
        this.documentCache.clear();
    }
}
exports.EnhancedPHIDetector = EnhancedPHIDetector;
// Export singleton accessor
exports.enhancedDetector = EnhancedPHIDetector.getInstance();
//# sourceMappingURL=EnhancedPHIDetector.js.map