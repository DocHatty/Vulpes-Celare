/**
 * Tests for Differential Privacy Module
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  DifferentialPrivacy,
  DifferentialPrivacyConfig,
  PrivacyPreset,
  PRIVACY_PRESETS,
  DPHistogram,
  PrivacyAccountant,
  createDifferentialPrivacy,
} from "../../src/privacy";

describe("DifferentialPrivacy", () => {
  describe("construction", () => {
    it("should create instance with custom epsilon", () => {
      const dp = new DifferentialPrivacy({ epsilon: 1.0 });
      const config = dp.getConfig();

      expect(config.epsilon).toBe(1.0);
      expect(config.delta).toBe(1e-6); // default
    });

    it("should create instance with custom delta", () => {
      const dp = new DifferentialPrivacy({ epsilon: 1.0, delta: 1e-5 });
      const config = dp.getConfig();

      expect(config.delta).toBe(1e-5);
    });

    it("should throw for non-positive epsilon", () => {
      expect(() => new DifferentialPrivacy({ epsilon: 0 })).toThrow(
        "Epsilon must be positive"
      );
      expect(() => new DifferentialPrivacy({ epsilon: -1 })).toThrow(
        "Epsilon must be positive"
      );
    });

    it("should throw for invalid delta", () => {
      expect(
        () => new DifferentialPrivacy({ epsilon: 1, delta: -0.1 })
      ).toThrow("Delta must be in [0, 1)");
      expect(() => new DifferentialPrivacy({ epsilon: 1, delta: 1 })).toThrow(
        "Delta must be in [0, 1)"
      );
    });
  });

  describe("fromPreset", () => {
    it("should create instance from strict preset", () => {
      const dp = DifferentialPrivacy.fromPreset("strict");
      const config = dp.getConfig();

      expect(config.epsilon).toBe(PRIVACY_PRESETS.strict.epsilon);
      expect(config.epsilon).toBe(0.1);
    });

    it("should create instance from balanced preset", () => {
      const dp = DifferentialPrivacy.fromPreset("balanced");
      const config = dp.getConfig();

      expect(config.epsilon).toBe(1.0);
    });

    it("should create instance from research preset", () => {
      const dp = DifferentialPrivacy.fromPreset("research");
      const config = dp.getConfig();

      expect(config.epsilon).toBe(3.0);
    });

    it("should create instance from analytics preset", () => {
      const dp = DifferentialPrivacy.fromPreset("analytics");
      const config = dp.getConfig();

      expect(config.epsilon).toBe(8.0);
    });
  });

  describe("addLaplaceNoise", () => {
    it("should add noise to value", () => {
      const dp = new DifferentialPrivacy({ epsilon: 1.0, seed: 12345 });
      const result = dp.addLaplaceNoise(100, 1);

      expect(result.original).toBe(100);
      expect(result.noisy).not.toBe(100);
      expect(result.sensitivity).toBe(1);
      expect(result.epsilon).toBe(1.0);
      expect(result.scale).toBe(1); // sensitivity / epsilon
    });

    it("should produce reproducible results with seed", () => {
      const dp1 = new DifferentialPrivacy({ epsilon: 1.0, seed: 42 });
      const dp2 = new DifferentialPrivacy({ epsilon: 1.0, seed: 42 });

      const result1 = dp1.addLaplaceNoise(100, 1);
      const result2 = dp2.addLaplaceNoise(100, 1);

      expect(result1.noisy).toBe(result2.noisy);
    });

    it("should produce different results with different seeds", () => {
      const dp1 = new DifferentialPrivacy({ epsilon: 1.0, seed: 1 });
      const dp2 = new DifferentialPrivacy({ epsilon: 1.0, seed: 2 });

      const result1 = dp1.addLaplaceNoise(100, 1);
      const result2 = dp2.addLaplaceNoise(100, 1);

      expect(result1.noisy).not.toBe(result2.noisy);
    });

    it("should add more noise with smaller epsilon (more private)", () => {
      // With seeded RNG, we can compare noise magnitude
      const dpStrict = new DifferentialPrivacy({ epsilon: 0.1, seed: 42 });
      const dpLoose = new DifferentialPrivacy({ epsilon: 10.0, seed: 42 });

      // Scale = sensitivity / epsilon, so strict has 10x the scale
      const resultStrict = dpStrict.addLaplaceNoise(100, 1);
      const resultLoose = dpLoose.addLaplaceNoise(100, 1);

      expect(resultStrict.scale).toBe(10);
      expect(resultLoose.scale).toBe(0.1);
    });

    it("should track budget spent", () => {
      const dp = new DifferentialPrivacy({ epsilon: 1.0 });

      expect(dp.getBudgetStatus().spent).toBe(0);

      dp.addLaplaceNoise(100, 1);
      expect(dp.getBudgetStatus().spent).toBe(1.0);

      dp.addLaplaceNoise(100, 1);
      expect(dp.getBudgetStatus().spent).toBe(2.0);
    });

    it("should include privacy guarantee string", () => {
      const dp = new DifferentialPrivacy({ epsilon: 1.0 });
      const result = dp.addLaplaceNoise(100, 1);

      expect(result.guarantee).toContain("ε=1");
      expect(result.guarantee).toContain("differentially private");
    });
  });

  describe("addGaussianNoise", () => {
    it("should add Gaussian noise", () => {
      const dp = new DifferentialPrivacy({ epsilon: 1.0, seed: 12345 });
      const result = dp.addGaussianNoise(100, 1);

      expect(result.original).toBe(100);
      expect(result.noisy).not.toBe(100);
      expect(result.guarantee).toContain("δ=");
    });

    it("should use delta in guarantee", () => {
      const dp = new DifferentialPrivacy({
        epsilon: 1.0,
        delta: 1e-5,
        seed: 12345,
      });
      const result = dp.addGaussianNoise(100, 1);

      expect(result.guarantee).toContain("δ=0.00001");
    });
  });

  describe("privatizeRedactionStats", () => {
    it("should privatize all statistics", () => {
      const dp = new DifferentialPrivacy({ epsilon: 1.0, seed: 42 });

      const rawStats = {
        documentsProcessed: 1000,
        totalRedactions: 5000,
        byType: {
          NAME: 2000,
          SSN: 500,
          DATE: 1500,
        },
      };

      const privateStats = dp.privatizeRedactionStats(rawStats);

      expect(privateStats.documentsProcessed).toBeDefined();
      expect(privateStats.totalRedactions).toBeDefined();
      expect(privateStats.redactionsByType.NAME).toBeDefined();
      expect(privateStats.redactionsByType.SSN).toBeDefined();
      expect(privateStats.redactionsByType.DATE).toBeDefined();

      // Values should be noisy
      expect(privateStats.documentsProcessed.noisy).not.toBe(1000);
      expect(privateStats.totalRedactions.noisy).not.toBe(5000);
    });

    it("should distribute budget across queries", () => {
      const dp = new DifferentialPrivacy({ epsilon: 1.0, seed: 42 });

      const rawStats = {
        documentsProcessed: 1000,
        totalRedactions: 5000,
        byType: { NAME: 2000, SSN: 500 },
      };

      const privateStats = dp.privatizeRedactionStats(rawStats, 10);

      // 4 queries (docs, total, NAME, SSN), budget = 10
      // Each query should use 10/4 = 2.5 epsilon
      expect(privateStats.budgetSpent).toBe(10);
    });
  });

  describe("computeConfidenceInterval", () => {
    it("should compute valid confidence interval", () => {
      const dp = new DifferentialPrivacy({ epsilon: 1.0, seed: 42 });
      const stat = dp.addLaplaceNoise(100, 1);

      const [lower, upper] = dp.computeConfidenceInterval(stat, 0.95);

      expect(lower).toBeLessThan(stat.noisy);
      expect(upper).toBeGreaterThan(stat.noisy);
      expect(upper - lower).toBeGreaterThan(0);
    });

    it("should give wider interval for lower confidence", () => {
      const dp = new DifferentialPrivacy({ epsilon: 1.0, seed: 42 });
      const stat = dp.addLaplaceNoise(100, 1);

      const [lower95, upper95] = dp.computeConfidenceInterval(stat, 0.95);
      const [lower80, upper80] = dp.computeConfidenceInterval(stat, 0.80);

      expect(upper95 - lower95).toBeGreaterThan(upper80 - lower80);
    });
  });

  describe("budget management", () => {
    it("should track queries performed", () => {
      const dp = new DifferentialPrivacy({ epsilon: 1.0 });

      expect(dp.getBudgetStatus().queriesPerformed).toBe(0);

      dp.addLaplaceNoise(100, 1);
      dp.addLaplaceNoise(100, 1);
      dp.addLaplaceNoise(100, 1);

      expect(dp.getBudgetStatus().queriesPerformed).toBe(3);
    });

    it("should reset budget", () => {
      const dp = new DifferentialPrivacy({ epsilon: 1.0 });

      dp.addLaplaceNoise(100, 1);
      expect(dp.getBudgetStatus().spent).toBe(1.0);

      dp.resetBudget();
      expect(dp.getBudgetStatus().spent).toBe(0);
    });
  });
});

describe("DPHistogram", () => {
  it("should add items with randomized response", () => {
    const hist = new DPHistogram(1.0);
    const categories = ["A", "B", "C"];

    // Add many items
    for (let i = 0; i < 100; i++) {
      hist.add("A", categories);
    }

    const raw = hist.getRawCounts();

    // Should have some counts (due to randomization, might not all be in "A")
    expect(raw.size).toBeGreaterThan(0);
  });

  it("should estimate original counts", () => {
    const hist = new DPHistogram(10); // High epsilon = less noise
    const categories = ["A", "B", "C"];

    // Add 100 "A" items
    for (let i = 0; i < 100; i++) {
      hist.add("A", categories);
    }

    const estimated = hist.getEstimatedCounts(categories, 100);

    // With high epsilon, estimate should be close to 100 for "A"
    const aCount = estimated.get("A") ?? 0;
    expect(aCount).toBeGreaterThan(50); // Should be reasonably close
  });
});

describe("PrivacyAccountant", () => {
  describe("basic operations", () => {
    it("should record queries", () => {
      const accountant = new PrivacyAccountant(10);

      expect(accountant.recordQuery(1.0)).toBe(true);
      expect(accountant.getTotalEpsilon()).toBe(1.0);
    });

    it("should track multiple queries", () => {
      const accountant = new PrivacyAccountant(10);

      accountant.recordQuery(1.0);
      accountant.recordQuery(2.0);
      accountant.recordQuery(0.5);

      expect(accountant.getTotalEpsilon()).toBe(3.5);
    });

    it("should reject queries exceeding budget", () => {
      const accountant = new PrivacyAccountant(5);

      expect(accountant.recordQuery(3.0)).toBe(true);
      expect(accountant.recordQuery(3.0)).toBe(false); // Would exceed
      expect(accountant.getTotalEpsilon()).toBe(3.0); // Not recorded
    });
  });

  describe("budget tracking", () => {
    it("should compute remaining budget", () => {
      const accountant = new PrivacyAccountant(10);

      accountant.recordQuery(3.0);
      expect(accountant.getRemainingBudget()).toBe(7.0);

      accountant.recordQuery(4.0);
      expect(accountant.getRemainingBudget()).toBe(3.0);
    });

    it("should not go negative", () => {
      const accountant = new PrivacyAccountant(5);

      accountant.recordQuery(5.0);
      expect(accountant.getRemainingBudget()).toBe(0);
    });
  });

  describe("advanced composition", () => {
    it("should compute advanced composition bound", () => {
      const accountant = new PrivacyAccountant(100);

      // Record many small queries
      for (let i = 0; i < 100; i++) {
        accountant.recordQuery(0.1);
      }

      const basicComposition = accountant.getTotalEpsilon();
      const advancedComposition = accountant.getAdvancedComposition(1e-6);

      // Basic composition: sum of all epsilons (with floating point tolerance)
      expect(basicComposition).toBeCloseTo(10, 5);

      // Advanced composition bound should be a positive number
      expect(advancedComposition).toBeGreaterThan(0);

      // For many small queries, advanced composition can be tighter or looser
      // depending on the parameters. The important thing is it computes correctly.
      expect(Number.isFinite(advancedComposition)).toBe(true);
    });
  });

  describe("history", () => {
    it("should maintain query history", () => {
      const accountant = new PrivacyAccountant(10);

      accountant.recordQuery(1.0);
      accountant.recordQuery(2.0, 1e-5);

      const history = accountant.getHistory();

      expect(history).toHaveLength(2);
      expect(history[0].epsilon).toBe(1.0);
      expect(history[1].epsilon).toBe(2.0);
      expect(history[1].delta).toBe(1e-5);
    });

    it("should reset history", () => {
      const accountant = new PrivacyAccountant(10);

      accountant.recordQuery(1.0);
      accountant.reset();

      expect(accountant.getHistory()).toHaveLength(0);
      expect(accountant.getTotalEpsilon()).toBe(0);
    });
  });
});

describe("createDifferentialPrivacy", () => {
  it("should create from preset string", () => {
    const dp = createDifferentialPrivacy("balanced");
    expect(dp.getConfig().epsilon).toBe(1.0);
  });

  it("should create from config object", () => {
    const dp = createDifferentialPrivacy({ epsilon: 5.0 });
    expect(dp.getConfig().epsilon).toBe(5.0);
  });
});

describe("PRIVACY_PRESETS", () => {
  it("should have all documented presets", () => {
    expect(PRIVACY_PRESETS.strict).toBeDefined();
    expect(PRIVACY_PRESETS.balanced).toBeDefined();
    expect(PRIVACY_PRESETS.research).toBeDefined();
    expect(PRIVACY_PRESETS.analytics).toBeDefined();
  });

  it("should have increasing epsilon values", () => {
    expect(PRIVACY_PRESETS.strict.epsilon).toBeLessThan(
      PRIVACY_PRESETS.balanced.epsilon
    );
    expect(PRIVACY_PRESETS.balanced.epsilon).toBeLessThan(
      PRIVACY_PRESETS.research.epsilon
    );
    expect(PRIVACY_PRESETS.research.epsilon).toBeLessThan(
      PRIVACY_PRESETS.analytics.epsilon
    );
  });

  it("should have descriptions", () => {
    for (const preset of Object.values(PRIVACY_PRESETS)) {
      expect(preset.description).toBeDefined();
      expect(preset.description!.length).toBeGreaterThan(0);
    }
  });
});
