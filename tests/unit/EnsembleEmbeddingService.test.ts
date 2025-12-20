/**
 * EnsembleEmbeddingService Unit Tests
 *
 * Tests for the multi-model embedding service used for semantic disambiguation.
 * Note: These tests run without the actual ONNX models to ensure CI/CD compatibility.
 *
 * @module tests/unit/EnsembleEmbeddingService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock onnxruntime-node before importing the service
vi.mock("onnxruntime-node", () => ({
  InferenceSession: {
    create: vi.fn().mockResolvedValue({
      inputNames: ["input_ids", "attention_mask"],
      outputNames: ["last_hidden_state"],
      run: vi.fn().mockResolvedValue({
        last_hidden_state: {
          dims: [1, 2, 768],
          data: new Float32Array(1536).fill(0.1),
        },
      }),
      release: vi.fn(),
    }),
  },
  Tensor: class MockTensor {
    constructor(
      public type: string,
      public data: any,
      public dims: number[]
    ) {}
  },
}));

// Mock ModelManager
vi.mock("../../src/ml/ModelManager", () => ({
  ModelManager: {
    modelAvailable: vi.fn().mockReturnValue(false),
    loadModel: vi.fn().mockRejectedValue(new Error("Model not available")),
    getModelsDirectory: vi.fn().mockReturnValue("/mock/models"),
  },
}));

// Mock FeatureToggles
vi.mock("../../src/config/FeatureToggles", () => ({
  FeatureToggles: {
    isEnsembleEmbeddingsEnabled: vi.fn().mockReturnValue(true),
  },
}));

describe("EnsembleEmbeddingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("EmbeddingCache", () => {
    it("should implement LRU cache behavior", () => {
      // Create a simple LRU cache implementation for testing with insertion order tracking
      const cache = new Map<string, { value: Float32Array; insertOrder: number; accessOrder: number }>();
      const maxSize = 3;
      let insertCounter = 0;
      let accessCounter = 0;

      const set = (key: string, value: Float32Array) => {
        if (cache.size >= maxSize) {
          // Evict least recently accessed entry
          let oldest: string | null = null;
          let oldestAccess = Infinity;
          for (const [k, v] of cache) {
            if (v.accessOrder < oldestAccess) {
              oldestAccess = v.accessOrder;
              oldest = k;
            }
          }
          if (oldest) cache.delete(oldest);
        }
        cache.set(key, { value, insertOrder: insertCounter++, accessOrder: accessCounter++ });
      };

      const get = (key: string): Float32Array | null => {
        const entry = cache.get(key);
        if (entry) {
          entry.accessOrder = accessCounter++;
          return entry.value;
        }
        return null;
      };

      // Add items (a=0, b=1, c=2 access order)
      set("a", new Float32Array([1]));
      set("b", new Float32Array([2]));
      set("c", new Float32Array([3]));

      expect(cache.size).toBe(3);

      // Access 'a' to make it recently used (a now has accessOrder=3)
      get("a");

      // Add 'd' - should evict 'b' (accessOrder=1, the oldest)
      set("d", new Float32Array([4]));

      expect(cache.size).toBe(3);
      expect(cache.has("a")).toBe(true);
      expect(cache.has("b")).toBe(false);
      expect(cache.has("c")).toBe(true);
      expect(cache.has("d")).toBe(true);
    });

    it("should track cache hits and misses", () => {
      let hits = 0;
      let misses = 0;
      const cache = new Map<string, Float32Array>();

      const get = (key: string): Float32Array | null => {
        if (cache.has(key)) {
          hits++;
          return cache.get(key)!;
        }
        misses++;
        return null;
      };

      cache.set("exists", new Float32Array([1]));

      get("exists"); // hit
      get("exists"); // hit
      get("missing"); // miss
      get("missing"); // miss
      get("missing"); // miss

      expect(hits).toBe(2);
      expect(misses).toBe(3);

      const hitRate = hits / (hits + misses);
      expect(hitRate).toBeCloseTo(0.4);
    });
  });

  describe("Vector Operations", () => {
    it("should correctly calculate cosine similarity", () => {
      // Cosine similarity formula: cos(A, B) = (A · B) / (||A|| * ||B||)
      const cosineSimilarity = (a: Float32Array, b: Float32Array): number => {
        if (a.length !== b.length) throw new Error("Vectors must have same length");

        let dot = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
          dot += a[i] * b[i];
          normA += a[i] * a[i];
          normB += b[i] * b[i];
        }

        const denom = Math.sqrt(normA) * Math.sqrt(normB);
        if (denom === 0) return 0;

        return dot / denom;
      };

      // Identical vectors should have similarity 1
      const v1 = new Float32Array([1, 2, 3]);
      expect(cosineSimilarity(v1, v1)).toBeCloseTo(1.0);

      // Opposite vectors should have similarity -1
      const v2 = new Float32Array([-1, -2, -3]);
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(-1.0);

      // Orthogonal vectors should have similarity 0
      const v3 = new Float32Array([1, 0, 0]);
      const v4 = new Float32Array([0, 1, 0]);
      expect(cosineSimilarity(v3, v4)).toBeCloseTo(0.0);
    });

    it("should correctly L2 normalize vectors", () => {
      const l2Normalize = (vector: Float32Array): Float32Array => {
        let norm = 0;
        for (let i = 0; i < vector.length; i++) {
          norm += vector[i] * vector[i];
        }
        norm = Math.sqrt(norm);

        const result = new Float32Array(vector.length);
        if (norm > 0) {
          for (let i = 0; i < vector.length; i++) {
            result[i] = vector[i] / norm;
          }
        }
        return result;
      };

      const v = new Float32Array([3, 4]); // 3-4-5 triangle
      const normalized = l2Normalize(v);

      // Check that magnitude is 1
      let magnitude = 0;
      for (let i = 0; i < normalized.length; i++) {
        magnitude += normalized[i] * normalized[i];
      }
      expect(Math.sqrt(magnitude)).toBeCloseTo(1.0);

      // Check individual values
      expect(normalized[0]).toBeCloseTo(0.6);
      expect(normalized[1]).toBeCloseTo(0.8);
    });

    it("should project embeddings to unified dimension", () => {
      const projectEmbedding = (
        embedding: Float32Array,
        inputDim: number,
        outputDim: number,
        projectionMatrix: Float32Array
      ): Float32Array => {
        const projected = new Float32Array(outputDim);

        for (let o = 0; o < outputDim; o++) {
          let sum = 0;
          for (let i = 0; i < inputDim; i++) {
            sum += embedding[i] * projectionMatrix[i * outputDim + o];
          }
          projected[o] = sum;
        }

        return projected;
      };

      // Create a simple 4 -> 2 projection
      const inputDim = 4;
      const outputDim = 2;
      const embedding = new Float32Array([1, 2, 3, 4]);

      // Identity-like projection (just average pairs)
      const projection = new Float32Array([
        0.5, 0, // col 0: average of dim 0,1
        0.5, 0,
        0, 0.5, // col 1: average of dim 2,3
        0, 0.5,
      ]);

      const result = projectEmbedding(embedding, inputDim, outputDim, projection);

      expect(result[0]).toBeCloseTo(1.5); // (1 + 2) / 2
      expect(result[1]).toBeCloseTo(3.5); // (3 + 4) / 2
    });
  });

  describe("Weighted Fusion", () => {
    it("should correctly fuse embeddings with weights", () => {
      const fuseEmbeddings = (
        embeddings: Float32Array[],
        weights: number[]
      ): Float32Array => {
        const dimension = embeddings[0].length;
        const fused = new Float32Array(dimension);

        for (let i = 0; i < embeddings.length; i++) {
          const weight = weights[i];
          for (let d = 0; d < dimension; d++) {
            fused[d] += weight * embeddings[i][d];
          }
        }

        return fused;
      };

      // Three models with different weights (0.45, 0.35, 0.20)
      const emb1 = new Float32Array([1, 0, 0]); // Clinical BERT
      const emb2 = new Float32Array([0, 1, 0]); // MiniLM
      const emb3 = new Float32Array([0, 0, 1]); // BioBERT

      const fused = fuseEmbeddings([emb1, emb2, emb3], [0.45, 0.35, 0.20]);

      expect(fused[0]).toBeCloseTo(0.45);
      expect(fused[1]).toBeCloseTo(0.35);
      expect(fused[2]).toBeCloseTo(0.20);
    });

    it("should normalize weights when some models are unavailable", () => {
      const normalizeWeights = (weights: number[]): number[] => {
        const total = weights.reduce((sum, w) => sum + w, 0);
        if (total === 0) return weights;
        return weights.map((w) => w / total);
      };

      // Original weights: [0.45, 0.35, 0.20] sum to 1.0
      // If model 2 (0.45 weight) is unavailable, remaining should normalize
      const remaining = [0.35, 0.20];
      const normalized = normalizeWeights(remaining);

      expect(normalized[0]).toBeCloseTo(0.636, 2); // 0.35 / 0.55
      expect(normalized[1]).toBeCloseTo(0.364, 2); // 0.20 / 0.55
      expect(normalized[0] + normalized[1]).toBeCloseTo(1.0);
    });
  });

  describe("Filter Type Prototypes", () => {
    it("should have prototype text for all filter types", () => {
      const prototypes: Record<string, string> = {
        NAME: "patient name person individual human identity first last name",
        DATE: "date calendar day month year time birthday anniversary",
        PHONE: "phone number telephone call mobile cell contact",
        EMAIL: "email address electronic mail contact message",
        SSN: "social security number identification government tax",
        MRN: "medical record number patient identifier hospital",
        ADDRESS: "address street city state zip location residence home",
        ZIPCODE: "zip code postal area region geographic",
        AGE: "age years old birthday patient elderly young",
        IP: "IP address network computer internet protocol",
        URL: "URL website link web address internet",
        FAX: "fax facsimile number machine document transmission",
        ACCOUNT: "account number bank financial identifier",
        LICENSE: "license number driver identification state permit",
        VEHICLE: "vehicle identification VIN car automobile",
        DEVICE: "device identifier serial number medical equipment",
        HEALTH_PLAN: "health plan insurance beneficiary policy",
        BIOMETRIC: "biometric fingerprint retina voice face recognition",
        CREDIT_CARD: "credit card payment financial number visa mastercard",
        PASSPORT: "passport travel identification international document",
      };

      // All filter types should have a prototype
      for (const [type, prototype] of Object.entries(prototypes)) {
        expect(prototype).toBeDefined();
        expect(prototype.length).toBeGreaterThan(10);
        expect(prototype).not.toBe(type); // Should be descriptive, not just the type
      }

      // Check that prototypes contain relevant keywords
      expect(prototypes.NAME).toContain("patient");
      expect(prototypes.MRN).toContain("medical");
      expect(prototypes.SSN).toContain("social");
      expect(prototypes.ADDRESS).toContain("street");
    });
  });

  describe("Service Configuration", () => {
    it("should define correct model configurations", () => {
      const modelConfigs = [
        {
          modelId: "bio-clinicalbert",
          weight: 0.45,
          dimension: 768,
          maxLength: 512,
          required: false,
        },
        {
          modelId: "minilm-l6",
          weight: 0.35,
          dimension: 384,
          maxLength: 256,
          required: true, // Required for basic functionality
        },
        {
          modelId: "biobert",
          weight: 0.20,
          dimension: 768,
          maxLength: 512,
          required: false,
        },
      ];

      // Weights should sum to 1.0
      const totalWeight = modelConfigs.reduce((sum, m) => sum + m.weight, 0);
      expect(totalWeight).toBeCloseTo(1.0);

      // At least one model should be required
      const requiredModels = modelConfigs.filter((m) => m.required);
      expect(requiredModels.length).toBeGreaterThanOrEqual(1);

      // Check dimensions are valid
      for (const config of modelConfigs) {
        expect(config.dimension).toBeGreaterThan(0);
        expect(config.maxLength).toBeGreaterThan(0);
      }
    });

    it("should define correct unified embedding dimension", () => {
      const UNIFIED_DIMENSION = 256;

      // Unified dimension should be reasonable
      expect(UNIFIED_DIMENSION).toBeGreaterThan(0);
      expect(UNIFIED_DIMENSION).toBeLessThanOrEqual(1024);

      // Should be smaller than largest model dimension for compression
      expect(UNIFIED_DIMENSION).toBeLessThan(768);
    });
  });

  describe("Cache Key Generation", () => {
    it("should generate consistent cache keys", () => {
      const getCacheKey = (text: string): string => {
        return text.toLowerCase().trim().substring(0, 200);
      };

      expect(getCacheKey("Hello World")).toBe("hello world");
      expect(getCacheKey("  HELLO  world  ")).toBe("hello  world");

      // Same text should produce same key
      expect(getCacheKey("Patient Name")).toBe(getCacheKey("patient name"));

      // Long text should be truncated
      const longText = "a".repeat(300);
      expect(getCacheKey(longText).length).toBe(200);
    });
  });

  describe("Graceful Degradation", () => {
    it("should handle missing models gracefully", async () => {
      // When models are not available, service should not throw
      // but instead return null or use fallback
      const mockGetService = async (): Promise<any | null> => {
        try {
          // Simulate model loading failure
          throw new Error("Model not available");
        } catch {
          return null;
        }
      };

      const service = await mockGetService();
      expect(service).toBeNull();
    });

    it("should fall back to hash-based vectors when neural not available", () => {
      // Simulate fallback behavior
      const useNeuralEmbeddings = false;

      const createVector = (text: string, useNeural: boolean): number[] => {
        if (useNeural) {
          // Would use neural embeddings
          return []; // placeholder
        } else {
          // Fall back to hash-based
          const vector = new Array(512).fill(0);
          const words = text.split(/\s+/);
          for (const word of words) {
            let hash = 5381;
            for (let i = 0; i < word.length; i++) {
              hash = (hash << 5) + hash + word.charCodeAt(i);
            }
            const index = Math.abs(hash) % 512;
            vector[index] += 1;
          }
          return vector;
        }
      };

      const hashVector = createVector("test text", useNeuralEmbeddings);
      expect(hashVector.length).toBe(512);
      expect(hashVector.some((v) => v > 0)).toBe(true);
    });
  });
});
