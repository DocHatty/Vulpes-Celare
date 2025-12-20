"use strict";
/**
 * Vector-Based Disambiguation Service
 *
 * Resolves ambiguous span detections using vector similarity.
 * Based on Phileas's VectorBasedSpanDisambiguationService.
 *
 * MATHEMATICAL FOUNDATION:
 * 1. Cosine Similarity - Standard vector comparison metric
 *    Formula: cos(A, B) = (A · B) / (||A|| * ||B||)
 *    Reference: Salton & McGill (1983) "Introduction to Modern Information Retrieval"
 *
 * 2. L2 Normalization - Unit vector conversion for fair comparison
 *    Formula: v_norm = v / ||v|| where ||v|| = sqrt(sum(v_i^2))
 *
 * 3. TF-IDF Weighting (optional) - Term importance weighting
 *    Formula: tf-idf(t,d) = tf(t,d) * log(N / df(t))
 *    Reference: Sparck Jones (1972) "A statistical interpretation of term specificity"
 *
 * ENSEMBLE EMBEDDINGS (Phase 6):
 * When enabled, uses neural embeddings from Bio_ClinicalBERT, MiniLM-L6, and BioBERT
 * for more accurate semantic disambiguation. Falls back to hash-based vectors
 * when ensemble models are unavailable.
 *
 * Example: "Jordan" could be NAME or ADDRESS
 * - Analyzes context window: ["Dr", "Jordan", "examined", "patient"]
 * - Creates vector from hash of context OR neural embedding
 * - Compares to historical patterns using cosine similarity
 * - Selects most similar filter type
 *
 * @module redaction/services
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
exports.VectorDisambiguationService = void 0;
const Span_1 = require("../models/Span");
const VulpesLogger_1 = require("../utils/VulpesLogger");
const logger = VulpesLogger_1.vulpesLogger.forComponent("VectorDisambiguationService");
/**
 * Stop words to filter from context (common English words)
 */
const STOP_WORDS = new Set([
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "is",
    "was",
    "are",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "should",
    "could",
    "may",
    "might",
    "must",
    "can",
    "this",
    "that",
    "these",
    "those",
    "it",
    "its",
    "they",
    "them",
    "their",
]);
// Lazy import to avoid circular dependencies
let ensembleServicePromise = null;
let ensembleService = null;
async function getEnsembleService() {
    if (ensembleService)
        return ensembleService;
    if (ensembleServicePromise)
        return ensembleServicePromise;
    ensembleServicePromise = (async () => {
        try {
            const { getEnsembleEmbeddingService } = await Promise.resolve().then(() => __importStar(require("../ml/EnsembleEmbeddingService")));
            ensembleService = await getEnsembleEmbeddingService();
            return ensembleService;
        }
        catch (error) {
            logger.debug(`Ensemble embeddings not available: ${error}`);
            return null;
        }
    })();
    return ensembleServicePromise;
}
/**
 * Vector-Based Disambiguation Service
 * Uses hashing + vector similarity to resolve ambiguous spans
 * Optionally uses neural ensemble embeddings for better accuracy
 */
class VectorDisambiguationService {
    config;
    vectorCache = new Map();
    neuralEmbeddingCache = new Map();
    useNeuralEmbeddings = false;
    initialized = false;
    constructor(config = {}) {
        this.config = {
            vectorSize: config.vectorSize ?? 512,
            hashAlgorithm: config.hashAlgorithm ?? "murmur3",
            filterStopWords: config.filterStopWords ?? true,
            minConfidence: config.minConfidence ?? 0.3,
            useEnsembleEmbeddings: config.useEnsembleEmbeddings ?? true,
        };
    }
    /**
     * Initialize the service (loads ensemble embeddings if available)
     */
    async initialize() {
        if (this.initialized)
            return;
        if (this.config.useEnsembleEmbeddings) {
            try {
                const service = await getEnsembleService();
                if (service) {
                    this.useNeuralEmbeddings = true;
                    logger.info("VectorDisambiguationService using neural ensemble embeddings");
                }
            }
            catch (error) {
                logger.debug(`Falling back to hash-based vectors: ${error}`);
            }
        }
        this.initialized = true;
    }
    /**
     * Disambiguate all spans with ambiguous interpretations
     *
     * @param spans - All detected spans
     * @returns Disambiguated spans (ambiguous ones resolved)
     */
    disambiguate(spans) {
        // Find ambiguous span groups (same position, different types)
        const ambiguousGroups = Span_1.SpanUtils.getIdenticalSpanGroups(spans);
        if (ambiguousGroups.length === 0) {
            return spans; // No ambiguity
        }
        const disambiguated = [];
        const processedPositions = new Set();
        for (const span of spans) {
            const posKey = `${span.characterStart}-${span.characterEnd}`;
            if (processedPositions.has(posKey)) {
                continue; // Already processed this position
            }
            // Check if this span is part of an ambiguous group
            const ambiguousGroup = ambiguousGroups.find((group) => group.some((s) => s.isIdenticalTo(span)));
            if (ambiguousGroup && ambiguousGroup.length > 1) {
                // Disambiguate: choose best filter type
                const bestSpan = this.selectBestSpan(ambiguousGroup);
                disambiguated.push(bestSpan);
                processedPositions.add(posKey);
                // Cache this observation
                this.cacheObservation(bestSpan);
            }
            else {
                // Not ambiguous
                disambiguated.push(span);
                processedPositions.add(posKey);
                // Still cache for future disambiguation
                this.cacheObservation(span);
            }
        }
        return disambiguated;
    }
    /**
     * Select best span from ambiguous group using vector similarity
     */
    selectBestSpan(ambiguousGroup) {
        const scores = [];
        for (const span of ambiguousGroup) {
            const score = this.calculateDisambiguationScore(span);
            scores.push({ span, score });
        }
        // Sort by score (descending)
        scores.sort((a, b) => b.score - a.score);
        const bestSpan = scores[0].span;
        bestSpan.disambiguationScore = scores[0].score;
        bestSpan.ambiguousWith = ambiguousGroup
            .filter((s) => s !== bestSpan)
            .map((s) => s.filterType);
        return bestSpan;
    }
    /**
     * Async version of disambiguate that uses neural embeddings
     */
    async disambiguateAsync(spans) {
        // Ensure initialized
        await this.initialize();
        // Find ambiguous span groups (same position, different types)
        const ambiguousGroups = Span_1.SpanUtils.getIdenticalSpanGroups(spans);
        if (ambiguousGroups.length === 0) {
            return spans; // No ambiguity
        }
        const disambiguated = [];
        const processedPositions = new Set();
        for (const span of spans) {
            const posKey = `${span.characterStart}-${span.characterEnd}`;
            if (processedPositions.has(posKey)) {
                continue;
            }
            const ambiguousGroup = ambiguousGroups.find((group) => group.some((s) => s.isIdenticalTo(span)));
            if (ambiguousGroup && ambiguousGroup.length > 1) {
                // Use neural embeddings if available
                const bestSpan = this.useNeuralEmbeddings
                    ? await this.selectBestSpanNeural(ambiguousGroup)
                    : this.selectBestSpan(ambiguousGroup);
                disambiguated.push(bestSpan);
                processedPositions.add(posKey);
                this.cacheObservation(bestSpan);
            }
            else {
                disambiguated.push(span);
                processedPositions.add(posKey);
                this.cacheObservation(span);
            }
        }
        return disambiguated;
    }
    /**
     * Select best span using neural ensemble embeddings
     */
    async selectBestSpanNeural(ambiguousGroup) {
        const service = await getEnsembleService();
        if (!service) {
            // Fallback to hash-based
            return this.selectBestSpan(ambiguousGroup);
        }
        const scores = [];
        for (const span of ambiguousGroup) {
            const score = await this.calculateNeuralDisambiguationScore(span, service);
            scores.push({ span, score });
        }
        scores.sort((a, b) => b.score - a.score);
        const bestSpan = scores[0].span;
        bestSpan.disambiguationScore = scores[0].score;
        bestSpan.ambiguousWith = ambiguousGroup
            .filter((s) => s !== bestSpan)
            .map((s) => s.filterType);
        return bestSpan;
    }
    /**
     * Calculate disambiguation score using neural embeddings
     */
    async calculateNeuralDisambiguationScore(span, service) {
        // Create context text for embedding
        const contextText = this.createContextText(span);
        const cacheKey = `${contextText}:${span.filterType}`;
        // Check cache first
        let embedding = this.neuralEmbeddingCache.get(cacheKey);
        if (!embedding) {
            try {
                const newEmbedding = await service.embed(contextText);
                embedding = newEmbedding;
                this.neuralEmbeddingCache.set(cacheKey, newEmbedding);
                // Limit cache size
                if (this.neuralEmbeddingCache.size > 5000) {
                    const firstKey = this.neuralEmbeddingCache.keys().next().value;
                    if (firstKey)
                        this.neuralEmbeddingCache.delete(firstKey);
                }
            }
            catch (error) {
                logger.warn(`Neural embedding failed: ${error}`);
                return this.calculateDisambiguationScore(span);
            }
        }
        // Get prototype embeddings for this filter type
        const prototypeKey = `prototype:${span.filterType}`;
        let prototypeEmbedding = this.neuralEmbeddingCache.get(prototypeKey);
        if (!prototypeEmbedding) {
            // Create prototype from filter type semantics
            const prototypeText = this.getFilterTypePrototype(span.filterType);
            try {
                const newProtoEmbedding = await service.embed(prototypeText);
                prototypeEmbedding = newProtoEmbedding;
                this.neuralEmbeddingCache.set(prototypeKey, newProtoEmbedding);
            }
            catch (error) {
                return this.calculateDisambiguationScore(span);
            }
        }
        // At this point, both embeddings are guaranteed to be defined
        // Calculate similarity
        const similarity = service.cosineSimilarity(embedding, prototypeEmbedding);
        // Combine with span confidence
        const combinedScore = 0.7 * similarity + 0.3 * span.confidence;
        return Math.max(0, Math.min(1, combinedScore));
    }
    /**
     * Create context text for embedding
     */
    createContextText(span) {
        let window = span.window;
        if (this.config.filterStopWords) {
            window = window.filter((token) => !STOP_WORDS.has(token.toLowerCase()));
        }
        return `${span.text} ${window.join(" ")}`.trim();
    }
    /**
     * Get prototype text for filter type (used for semantic matching)
     */
    getFilterTypePrototype(filterType) {
        const prototypes = {
            [Span_1.FilterType.NAME]: "patient name person individual human identity first last name",
            [Span_1.FilterType.DATE]: "date calendar day month year time birthday anniversary",
            [Span_1.FilterType.PHONE]: "phone number telephone call mobile cell contact",
            [Span_1.FilterType.EMAIL]: "email address electronic mail contact message",
            [Span_1.FilterType.SSN]: "social security number identification government tax",
            [Span_1.FilterType.MRN]: "medical record number patient identifier hospital",
            [Span_1.FilterType.ADDRESS]: "address street city state zip location residence home",
            [Span_1.FilterType.ZIPCODE]: "zip code postal area region geographic",
            [Span_1.FilterType.AGE]: "age years old birthday patient elderly young",
            [Span_1.FilterType.IP]: "IP address network computer internet protocol",
            [Span_1.FilterType.URL]: "URL website link web address internet",
            [Span_1.FilterType.FAX]: "fax facsimile number machine document transmission",
            [Span_1.FilterType.ACCOUNT]: "account number bank financial identifier",
            [Span_1.FilterType.LICENSE]: "license number driver identification state permit",
            [Span_1.FilterType.VEHICLE]: "vehicle identification VIN car automobile",
            [Span_1.FilterType.DEVICE]: "device identifier serial number medical equipment",
            [Span_1.FilterType.HEALTH_PLAN]: "health plan insurance beneficiary policy",
            [Span_1.FilterType.BIOMETRIC]: "biometric fingerprint retina voice face recognition",
            [Span_1.FilterType.CREDIT_CARD]: "credit card payment financial number visa mastercard",
            [Span_1.FilterType.PASSPORT]: "passport travel identification international document",
        };
        return prototypes[filterType] || filterType.toLowerCase();
    }
    /**
     * Calculate disambiguation score for a span
     * Higher score = more confident in this filter type
     */
    calculateDisambiguationScore(span) {
        // Create vector for this span + context
        const spanVector = this.createVector(span);
        // Get cached vectors for this filter type
        const key = this.makeWindowKey(span.window);
        const cachedVectors = this.vectorCache.get(key) || [];
        // Filter to same filter type
        const sameTypeVectors = cachedVectors.filter((v) => v.filterType === span.filterType);
        if (sameTypeVectors.length === 0) {
            // No historical data: use span confidence
            return span.confidence;
        }
        // Calculate average cosine similarity to cached vectors
        let totalSimilarity = 0;
        for (const cached of sameTypeVectors) {
            const similarity = this.cosineSimilarity(spanVector.vector, cached.vector);
            totalSimilarity += similarity;
        }
        const avgSimilarity = totalSimilarity / sameTypeVectors.length;
        // Combine with span confidence (weighted average)
        const combinedScore = 0.6 * avgSimilarity + 0.4 * span.confidence;
        return combinedScore;
    }
    /**
     * Cache span observation for future disambiguation
     */
    cacheObservation(span) {
        const key = this.makeWindowKey(span.window);
        const spanVector = this.createVector(span);
        if (!this.vectorCache.has(key)) {
            this.vectorCache.set(key, []);
        }
        // Add to cache (avoid duplicates)
        const cached = this.vectorCache.get(key);
        const exists = cached.some((v) => v.filterType === spanVector.filterType &&
            v.windowHash === spanVector.windowHash);
        if (!exists) {
            cached.push(spanVector);
            // Limit cache size per key (keep most recent 100)
            if (cached.length > 100) {
                cached.shift();
            }
        }
    }
    /**
     * Create vector representation of span + context
     */
    createVector(span) {
        // Filter stop words if configured
        let window = span.window;
        if (this.config.filterStopWords) {
            window = window.filter((token) => !STOP_WORDS.has(token.toLowerCase()));
        }
        // Create hash-based vector
        const windowText = window.join(" ").toLowerCase();
        const vector = this.hashToVector(windowText);
        const windowHash = this.hashString(windowText).toString();
        return {
            filterType: span.filterType,
            vector,
            windowHash,
        };
    }
    /**
     * Convert text to vector using hashing
     */
    hashToVector(text) {
        const vector = new Array(this.config.vectorSize).fill(0);
        // Hash each word and map to vector dimensions
        const words = text.split(/\s+/);
        for (const word of words) {
            if (word.length === 0)
                continue;
            const hash = this.hashString(word);
            const index = Math.abs(hash) % this.config.vectorSize;
            // Increment that dimension (word frequency)
            vector[index] += 1;
        }
        // Normalize vector (L2 normalization)
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        if (magnitude > 0) {
            for (let i = 0; i < vector.length; i++) {
                vector[i] /= magnitude;
            }
        }
        return vector;
    }
    /**
     * Hash string to integer
     */
    hashString(str) {
        if (this.config.hashAlgorithm === "murmur3") {
            return this.murmur3Hash(str);
        }
        else if (this.config.hashAlgorithm === "djb2") {
            return this.djb2Hash(str);
        }
        else {
            return this.fnv1aHash(str);
        }
    }
    /**
     * MurmurHash3 (32-bit)
     */
    murmur3Hash(str, seed = 0) {
        let h = seed;
        const len = str.length;
        for (let i = 0; i < len; i++) {
            let k = str.charCodeAt(i);
            k = Math.imul(k, 0xcc9e2d51);
            k = (k << 15) | (k >>> 17);
            k = Math.imul(k, 0x1b873593);
            h ^= k;
            h = (h << 13) | (h >>> 19);
            h = Math.imul(h, 5) + 0xe6546b64;
        }
        h ^= len;
        h ^= h >>> 16;
        h = Math.imul(h, 0x85ebca6b);
        h ^= h >>> 13;
        h = Math.imul(h, 0xc2b2ae35);
        h ^= h >>> 16;
        return h >>> 0; // Convert to unsigned
    }
    /**
     * DJB2 hash
     */
    djb2Hash(str) {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) + hash + str.charCodeAt(i);
        }
        return hash >>> 0;
    }
    /**
     * FNV-1a hash
     */
    fnv1aHash(str) {
        let hash = 2166136261;
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }
    /**
     * Calculate cosine similarity between two vectors
     * Formula: cos(A, B) = (A · B) / (||A|| * ||B||)
     *
     * Edge cases handled:
     * - Zero vectors: returns 0 (no similarity can be determined)
     * - Near-zero magnitudes: uses epsilon to prevent division instability
     * - Single non-zero dimension: handled correctly
     *
     * Reference: Salton & McGill (1983)
     */
    cosineSimilarity(vec1, vec2) {
        const EPSILON = 1e-10;
        if (vec1.length !== vec2.length) {
            throw new Error("Vectors must have same length");
        }
        // Handle empty vectors
        if (vec1.length === 0) {
            return 0;
        }
        let dotProduct = 0;
        let mag1Squared = 0;
        let mag2Squared = 0;
        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            mag1Squared += vec1[i] * vec1[i];
            mag2Squared += vec2[i] * vec2[i];
        }
        // Handle zero vectors - no similarity can be determined
        if (mag1Squared < EPSILON || mag2Squared < EPSILON) {
            return 0;
        }
        // Use geometric mean of squared magnitudes for numerical stability
        // cos = dotProduct / sqrt(mag1Squared * mag2Squared)
        const denominator = Math.sqrt(mag1Squared * mag2Squared);
        // Clamp result to [-1, 1] to handle floating point errors
        const similarity = dotProduct / denominator;
        return Math.max(-1, Math.min(1, similarity));
    }
    /**
     * Make cache key from window tokens
     */
    makeWindowKey(window) {
        let tokens = window;
        if (this.config.filterStopWords) {
            tokens = tokens.filter((t) => !STOP_WORDS.has(t.toLowerCase()));
        }
        return tokens.join(" ").toLowerCase();
    }
    /**
     * Check if neural embeddings are being used
     */
    isUsingNeuralEmbeddings() {
        return this.useNeuralEmbeddings;
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        let totalVectors = 0;
        const typeDistribution = {};
        for (const vectors of this.vectorCache.values()) {
            totalVectors += vectors.length;
            for (const vec of vectors) {
                const type = vec.filterType;
                typeDistribution[type] = (typeDistribution[type] || 0) + 1;
            }
        }
        return {
            uniqueContexts: this.vectorCache.size,
            totalVectors,
            typeDistribution,
            avgVectorsPerContext: totalVectors / Math.max(1, this.vectorCache.size),
            neuralEmbeddingsEnabled: this.useNeuralEmbeddings,
            neuralEmbeddingsCached: this.neuralEmbeddingCache.size,
        };
    }
    /**
     * Clear cache
     */
    clearCache() {
        this.vectorCache.clear();
        this.neuralEmbeddingCache.clear();
    }
    /**
     * Export cache to JSON
     */
    exportCache() {
        const entries = [];
        for (const [key, vectors] of this.vectorCache.entries()) {
            entries.push({
                key,
                vectors: vectors.map((v) => ({
                    filterType: v.filterType,
                    windowHash: v.windowHash,
                    vector: v.vector,
                })),
            });
        }
        return {
            config: this.config,
            entries,
            stats: this.getCacheStats(),
        };
    }
    /**
     * Import cache from JSON
     */
    importCache(data) {
        this.clearCache();
        if (data.entries) {
            for (const entry of data.entries) {
                this.vectorCache.set(entry.key, entry.vectors);
            }
        }
    }
}
exports.VectorDisambiguationService = VectorDisambiguationService;
//# sourceMappingURL=VectorDisambiguationService.js.map