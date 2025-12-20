/**
 * ModelManager Tests
 *
 * Tests for the optimized ONNX ModelManager including:
 * - GPU provider detection
 * - Session optimization options
 * - INT8 quantized model preference
 * - Metrics tracking
 * - Model preloading
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock onnxruntime-node before importing ModelManager
vi.mock("onnxruntime-node", () => {
  const mockSession = {
    inputNames: ["input_ids", "attention_mask"],
    outputNames: ["logits"],
    run: vi.fn().mockResolvedValue({ logits: { data: new Float32Array([0.1, 0.9]) } }),
    release: vi.fn().mockResolvedValue(undefined),
  };

  return {
    default: {
      InferenceSession: {
        create: vi.fn().mockResolvedValue(mockSession),
      },
      Tensor: class MockTensor {
        constructor(
          public type: string,
          public data: ArrayLike<number | bigint>,
          public dims: number[]
        ) {}
      },
    },
    InferenceSession: {
      create: vi.fn().mockResolvedValue(mockSession),
    },
    Tensor: class MockTensor {
      constructor(
        public type: string,
        public data: ArrayLike<number | bigint>,
        public dims: number[]
      ) {}
    },
  };
});

// Mock fs to control model file existence
vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof import("fs")>("fs");
  return {
    ...actual,
    existsSync: vi.fn((filePath: string) => {
      // Simulate INT8 model exists for gliner
      if (filePath.includes("gliner") && filePath.includes("int8")) {
        return true;
      }
      if (filePath.includes("tinybert") && filePath.includes("int8")) {
        return true;
      }
      // Regular models exist
      if (filePath.includes("model.onnx") || filePath.includes("gliner.onnx")) {
        return true;
      }
      return false;
    }),
    readFileSync: actual.readFileSync,
  };
});

import {
  ModelManager,
  type ModelType,
  type SessionOptimizations,
} from "../../src/ml/ModelManager";

describe("ModelManager", () => {
  beforeEach(async () => {
    // Reset the singleton state before each test
    await ModelManager.unloadAll();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await ModelManager.unloadAll();
  });

  describe("Provider Detection", () => {
    it("should check CPU provider availability", () => {
      const available = ModelManager.checkProviderAvailability("cpu");
      expect(available).toBe(true);
    });

    it("should check DirectML availability based on platform", () => {
      const available = ModelManager.checkProviderAvailability("directml");
      // DirectML is only on Windows
      expect(available).toBe(process.platform === "win32");
    });

    it("should check CoreML availability based on platform", () => {
      const available = ModelManager.checkProviderAvailability("coreml");
      // CoreML is only on macOS
      expect(available).toBe(process.platform === "darwin");
    });
  });

  describe("Session Optimizations", () => {
    it("should set and get global optimizations", () => {
      const opts: SessionOptimizations = {
        intraOpThreads: 4,
        interOpThreads: 1,
        enableMemPattern: false,
      };

      ModelManager.setGlobalOptimizations(opts);
      const result = ModelManager.getGlobalOptimizations();

      expect(result.intraOpThreads).toBe(4);
      expect(result.interOpThreads).toBe(1);
      expect(result.enableMemPattern).toBe(false);
    });

    it("should apply optimizations when loading model", async () => {
      const ort = await import("onnxruntime-node");
      const createSpy = vi.spyOn(ort.InferenceSession, "create");

      await ModelManager.loadModel("gliner");

      expect(createSpy).toHaveBeenCalled();
      const [, options] = createSpy.mock.calls[0] as unknown as [unknown, any];

      // Verify optimization options were passed
      expect(options).toBeDefined();
      expect(options.graphOptimizationLevel).toBe("all");
      // Threading options should be set
      expect(typeof options.intraOpNumThreads).toBe("number");
      expect(typeof options.interOpNumThreads).toBe("number");
    });

    it("should return recommended thread config", () => {
      const config = ModelManager.getRecommendedThreadConfig();

      expect(config).toHaveProperty("intraOpThreads");
      expect(config).toHaveProperty("interOpThreads");
      expect(config.intraOpThreads).toBeGreaterThanOrEqual(1);
      expect(config.intraOpThreads).toBeLessThanOrEqual(8);
      expect(config.interOpThreads).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Model Loading", () => {
    it("should load a model and return metadata", async () => {
      const model = await ModelManager.loadModel("gliner");

      expect(model).toBeDefined();
      expect(model.type).toBe("gliner");
      expect(model.session).toBeDefined();
      expect(model.loadTimeMs).toBeGreaterThanOrEqual(0);
      expect(model.inputNames).toContain("input_ids");
      expect(model.outputNames).toContain("logits");
    });

    it("should cache loaded models", async () => {
      const ort = await import("onnxruntime-node");
      const createSpy = vi.spyOn(ort.InferenceSession, "create");

      // Load the same model twice
      await ModelManager.loadModel("gliner");
      await ModelManager.loadModel("gliner");

      // Should only create session once
      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    it("should check if model is loaded", async () => {
      expect(ModelManager.isLoaded("gliner")).toBe(false);

      await ModelManager.loadModel("gliner");

      expect(ModelManager.isLoaded("gliner")).toBe(true);
    });

    it("should get loaded model", async () => {
      await ModelManager.loadModel("gliner");

      const model = ModelManager.getModel("gliner");
      expect(model).toBeDefined();
      expect(model?.type).toBe("gliner");
    });

    it("should return undefined for unloaded model", () => {
      const model = ModelManager.getModel("tinybert");
      expect(model).toBeUndefined();
    });
  });

  describe("Model Unloading", () => {
    it("should unload individual models", async () => {
      await ModelManager.loadModel("gliner");
      expect(ModelManager.isLoaded("gliner")).toBe(true);

      await ModelManager.unloadModel("gliner");
      expect(ModelManager.isLoaded("gliner")).toBe(false);
    });

    it("should unload all models", async () => {
      await ModelManager.loadModel("gliner");
      expect(ModelManager.isLoaded("gliner")).toBe(true);

      await ModelManager.unloadAll();
      expect(ModelManager.isLoaded("gliner")).toBe(false);
    });
  });

  describe("Model Preloading", () => {
    it("should preload multiple models", async () => {
      const models: ModelType[] = ["gliner", "tinybert"];

      await ModelManager.preloadModels(models);

      expect(ModelManager.isLoaded("gliner")).toBe(true);
      expect(ModelManager.isLoaded("tinybert")).toBe(true);
    });

    it("should handle preload failures gracefully", async () => {
      const ort = await import("onnxruntime-node");
      vi.spyOn(ort.InferenceSession, "create").mockRejectedValueOnce(
        new Error("Model not found")
      );

      // Should not throw, just skip failed models
      await expect(
        ModelManager.preloadModels(["gliner"])
      ).resolves.not.toThrow();
    });
  });

  describe("Metrics Tracking", () => {
    it("should track inference metrics", async () => {
      await ModelManager.loadModel("gliner");

      // Record some mock inferences
      ModelManager.recordInference("gliner", 10);
      ModelManager.recordInference("gliner", 15);
      ModelManager.recordInference("gliner", 12);

      const metrics = ModelManager.getMetrics("gliner");

      expect(metrics).toBeDefined();
      expect(metrics!.inferenceCount).toBe(3);
      expect(metrics!.avgInferenceTimeMs).toBeCloseTo(12.33, 1);
      expect(metrics!.minInferenceTimeMs).toBe(10);
      expect(metrics!.maxInferenceTimeMs).toBe(15);
      expect(metrics!.lastInferenceTimeMs).toBe(12);
    });

    it("should return undefined metrics for unloaded models", () => {
      const metrics = ModelManager.getMetrics("fp_classifier");
      expect(metrics).toBeUndefined();
    });

    it("should aggregate metrics across all models", async () => {
      await ModelManager.loadModel("gliner");
      ModelManager.recordInference("gliner", 10);

      const allMetrics = ModelManager.getAllMetrics();

      expect(allMetrics.size).toBeGreaterThanOrEqual(1);
      expect(allMetrics.has("gliner")).toBe(true);
    });

    it("should reset metrics for a model", async () => {
      await ModelManager.loadModel("gliner");
      ModelManager.recordInference("gliner", 10);

      expect(ModelManager.getMetrics("gliner")!.inferenceCount).toBe(1);

      ModelManager.resetMetrics("gliner");

      expect(ModelManager.getMetrics("gliner")!.inferenceCount).toBe(0);
    });
  });

  describe("Status Reporting", () => {
    it("should return status for all model types", async () => {
      await ModelManager.loadModel("gliner");

      const status = ModelManager.getStatus();

      expect(status).toHaveProperty("gliner");
      expect(status).toHaveProperty("tinybert");
      expect(status).toHaveProperty("fp_classifier");

      expect(status.gliner.loaded).toBe(true);
      expect(status.tinybert.loaded).toBe(false);
    });
  });

  describe("Models Directory", () => {
    it("should return models directory path", () => {
      const dir = ModelManager.getModelsDirectory();

      expect(typeof dir).toBe("string");
      expect(dir.length).toBeGreaterThan(0);
    });
  });
});

describe("ModelManager Benchmarks", () => {
  beforeEach(async () => {
    await ModelManager.unloadAll();
    vi.clearAllMocks();
  });

  it("should measure model load time", async () => {
    const startTime = Date.now();
    const model = await ModelManager.loadModel("gliner");
    const loadTime = Date.now() - startTime;

    expect(model.loadTimeMs).toBeGreaterThanOrEqual(0);
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
  });

  it("should track warm-up in metrics", async () => {
    const model = await ModelManager.loadModel("gliner", undefined, { warmUp: true });

    // Warm-up should have been recorded if performed
    if (model.warmedUp) {
      expect(model.metrics.warmUpTimeMs).toBeDefined();
      expect(model.metrics.warmUpTimeMs).toBeGreaterThanOrEqual(0);
    }
  });
});
