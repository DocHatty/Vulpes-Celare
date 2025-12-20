/**
 * EnsembleEmbeddingService - Multi-Model Embedding Fusion
 *
 * Generates high-quality semantic embeddings by combining multiple
 * transformer models specialized for different aspects:
 * - Bio_ClinicalBERT: Clinical/medical domain understanding
 * - MiniLM-L6-v2: Fast general semantic similarity
 * - BioBERT: Biomedical entity recognition
 *
 * Features:
 * - Weighted fusion of embeddings from multiple models
 * - LRU cache for computed embeddings
 * - Graceful degradation if models unavailable
 * - Batch inference for efficiency
 *
 * @module ml/EnsembleEmbeddingService
 */
import { ONNXInference } from "./ONNXInference";
/**
 * Ensemble Embedding Service
 *
 * Combines multiple transformer models to generate high-quality
 * embeddings for PHI disambiguation and semantic analysis.
 */
export declare class EnsembleEmbeddingService extends ONNXInference {
    private models;
    private cache;
    private projectionMatrices;
    private initialized;
    private constructor();
    /**
     * Create and initialize the ensemble service
     */
    static create(): Promise<EnsembleEmbeddingService>;
    /**
     * Check if ensemble embeddings are enabled
     */
    static isEnabled(): boolean;
    /**
     * Initialize all available models
     */
    private initialize;
    /**
     * Load a single model
     */
    private loadModel;
    /**
     * Normalize weights based on loaded models
     */
    private normalizeWeights;
    /**
     * Initialize projection matrices for dimension reduction
     */
    private initializeProjections;
    /**
     * Generate random orthogonal projection matrix
     * Uses Gram-Schmidt orthogonalization
     */
    private generateRandomProjection;
    /**
     * Get embedding for a single text
     */
    embed(text: string): Promise<Float32Array>;
    /**
     * Get embeddings for multiple texts (batch)
     */
    embedBatch(texts: string[]): Promise<Float32Array[]>;
    /**
     * Compute embeddings using the ensemble
     */
    private computeEmbeddings;
    /**
     * Run inference on a single model
     */
    private runModelInference;
    /**
     * Extract embeddings from model output
     */
    private extractEmbeddings;
    /**
     * Project embedding to unified dimension
     */
    private projectEmbedding;
    /**
     * Fuse embeddings from multiple models
     */
    private fuseEmbeddings;
    /**
     * L2 normalize a vector in-place
     */
    private l2Normalize;
    /**
     * Compute cosine similarity between two embeddings
     */
    cosineSimilarity(a: Float32Array, b: Float32Array): number;
    /**
     * Find most similar embedding from a set
     */
    findMostSimilar(query: Float32Array, candidates: Float32Array[], topK?: number): Array<{
        index: number;
        similarity: number;
    }>;
    /**
     * Generate cache key for text
     */
    private getCacheKey;
    /**
     * Get default vocabulary (fallback)
     */
    private getDefaultVocab;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        hits: number;
        misses: number;
        hitRate: number;
    };
    /**
     * Clear embedding cache
     */
    clearCache(): void;
    /**
     * Get list of loaded models
     */
    getLoadedModels(): string[];
    /**
     * Get embedding dimension
     */
    getEmbeddingDimension(): number;
    /**
     * Dispose of all resources
     */
    dispose(): Promise<void>;
}
/**
 * Get or create the EnsembleEmbeddingService singleton
 */
export declare function getEnsembleEmbeddingService(): Promise<EnsembleEmbeddingService | null>;
/**
 * Reset singleton (for testing)
 */
export declare function resetEnsembleEmbeddingService(): void;
export default EnsembleEmbeddingService;
//# sourceMappingURL=EnsembleEmbeddingService.d.ts.map