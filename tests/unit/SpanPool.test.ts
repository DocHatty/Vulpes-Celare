/**
 * SpanPool Unit Tests
 *
 * Comprehensive tests for the object pooling infrastructure that eliminates
 * GC pressure in the PHI redaction pipeline.
 *
 * Tests cover:
 * - Basic acquire/release cycle
 * - Pool reuse verification
 * - PHI security (field clearing before pool return)
 * - Statistics tracking
 * - Pre-warming
 * - Max pool size limits
 * - Debug mode double-release detection
 * - Integration with SpanFactory
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SpanPool } from "../../src/core/SpanPool";
import { SpanFactory } from "../../src/core/SpanFactory";
import { Span, FilterType } from "../../src/models/Span";

describe("SpanPool", () => {
  beforeEach(() => {
    // Clear pool before each test
    SpanPool.clear();
  });

  afterEach(() => {
    // Clean up after each test
    SpanPool.clear();
  });

  describe("acquire/release cycle", () => {
    it("acquires a new span when pool is empty", () => {
      const span = SpanPool.acquire({
        text: "John Smith",
        characterStart: 0,
        characterEnd: 10,
        filterType: FilterType.NAME,
        confidence: 0.95,
      });

      expect(span).toBeDefined();
      expect(span.text).toBe("John Smith");
      expect(span.characterStart).toBe(0);
      expect(span.characterEnd).toBe(10);
      expect(span.filterType).toBe(FilterType.NAME);
      expect(span.confidence).toBe(0.95);
    });

    it("reuses spans after release", () => {
      // Acquire first span
      const span1 = SpanPool.acquire({
        text: "John Smith",
        characterStart: 0,
        characterEnd: 10,
        filterType: FilterType.NAME,
        confidence: 0.95,
      });

      // Get reference to the object
      const span1Ref = span1;

      // Release it
      SpanPool.release(span1);

      // Acquire another - should reuse the same object
      const span2 = SpanPool.acquire({
        text: "Jane Doe",
        characterStart: 20,
        characterEnd: 28,
        filterType: FilterType.NAME,
        confidence: 0.9,
      });

      // Should be the same underlying object
      expect(span2).toBe(span1Ref);

      // But with new values
      expect(span2.text).toBe("Jane Doe");
      expect(span2.characterStart).toBe(20);
      expect(span2.characterEnd).toBe(28);
    });

    it("releases many spans at once", () => {
      const spans = [];
      for (let i = 0; i < 10; i++) {
        spans.push(SpanPool.acquire({
          text: `Name ${i}`,
          characterStart: i * 10,
          characterEnd: i * 10 + 5,
          filterType: FilterType.NAME,
        }));
      }

      expect(SpanPool.size()).toBe(0); // All in use

      SpanPool.releaseMany(spans);

      expect(SpanPool.size()).toBe(10); // All back in pool
    });
  });

  describe("PHI security", () => {
    it("clears all PHI fields before pool return", () => {
      const span = SpanPool.acquire({
        text: "123-45-6789",
        originalValue: "123-45-6789",
        characterStart: 5,
        characterEnd: 16,
        filterType: FilterType.SSN,
        confidence: 0.99,
        context: "SSN: 123-45-6789 was detected",
        pattern: "\\d{3}-\\d{2}-\\d{4}",
        salt: "secret-salt",
        replacement: "[SSN]",
      });

      // Verify initial values
      expect(span.text).toBe("123-45-6789");
      expect(span.context).toBe("SSN: 123-45-6789 was detected");
      expect(span.salt).toBe("secret-salt");

      // Release back to pool
      SpanPool.release(span);

      // Acquire again (same object)
      const reusedSpan = SpanPool.acquire({
        text: "new text",
        characterStart: 0,
        characterEnd: 8,
        filterType: FilterType.NAME,
      });

      // The object was cleared before reuse - check it has new values
      expect(reusedSpan.text).toBe("new text");
      // Old PHI should be gone
      expect(reusedSpan.context).toBe(""); // Cleared but now has new extracted context
      expect(reusedSpan.salt).toBeNull();
      expect(reusedSpan.pattern).toBeNull();
      expect(reusedSpan.replacement).toBeNull();
    });

    it("clears arrays (window, ambiguousWith) before pool return", () => {
      const span = SpanPool.acquire({
        text: "test",
        characterStart: 0,
        characterEnd: 4,
        filterType: FilterType.NAME,
        window: ["previous", "word", "context"],
        ambiguousWith: [FilterType.ADDRESS, FilterType.DATE],
      });

      expect(span.window).toHaveLength(3);
      expect(span.ambiguousWith).toHaveLength(2);

      SpanPool.release(span);

      // Get the same object back
      const reused = SpanPool.acquire({
        text: "new",
        characterStart: 0,
        characterEnd: 3,
        filterType: FilterType.SSN,
      });

      // Arrays should be empty (new ones)
      expect(reused.window).toHaveLength(0);
      expect(reused.ambiguousWith).toHaveLength(0);
    });
  });

  describe("statistics tracking", () => {
    it("tracks acquired, released, and created counts", () => {
      const stats1 = SpanPool.getStats();
      expect(stats1.acquired).toBe(0);
      expect(stats1.released).toBe(0);
      expect(stats1.created).toBe(0);

      // Acquire 3 spans (all new since pool is empty)
      const spans = [
        SpanPool.acquire({ text: "a", characterStart: 0, characterEnd: 1, filterType: FilterType.NAME }),
        SpanPool.acquire({ text: "b", characterStart: 1, characterEnd: 2, filterType: FilterType.NAME }),
        SpanPool.acquire({ text: "c", characterStart: 2, characterEnd: 3, filterType: FilterType.NAME }),
      ];

      const stats2 = SpanPool.getStats();
      expect(stats2.acquired).toBe(3);
      expect(stats2.created).toBe(3);
      expect(stats2.released).toBe(0);

      // Release all
      SpanPool.releaseMany(spans);

      const stats3 = SpanPool.getStats();
      expect(stats3.released).toBe(3);
      expect(stats3.poolSize).toBe(3);

      // Acquire 2 more (should reuse from pool)
      SpanPool.acquire({ text: "d", characterStart: 3, characterEnd: 4, filterType: FilterType.NAME });
      SpanPool.acquire({ text: "e", characterStart: 4, characterEnd: 5, filterType: FilterType.NAME });

      const stats4 = SpanPool.getStats();
      expect(stats4.acquired).toBe(5);
      expect(stats4.created).toBe(3); // Still 3 - reused from pool
      expect(stats4.reuseRate).toBeGreaterThan(0);
    });

    it("calculates reuse rate correctly", () => {
      // Create and release 10 spans to populate pool
      const spans = [];
      for (let i = 0; i < 10; i++) {
        spans.push(SpanPool.acquire({
          text: `span${i}`,
          characterStart: i,
          characterEnd: i + 1,
          filterType: FilterType.NAME,
        }));
      }
      SpanPool.releaseMany(spans);

      // Clear stats but keep pool
      const initialStats = SpanPool.getStats();

      // Acquire 10 more (all should come from pool)
      for (let i = 0; i < 10; i++) {
        SpanPool.acquire({
          text: `reused${i}`,
          characterStart: i,
          characterEnd: i + 1,
          filterType: FilterType.SSN,
        });
      }

      const stats = SpanPool.getStats();
      // 20 total acquired, 10 created = 50% reuse rate
      expect(stats.reuseRate).toBeCloseTo(0.5, 1);
    });
  });

  describe("pre-warming", () => {
    it("pre-warms pool with specified count", () => {
      expect(SpanPool.size()).toBe(0);
      expect(SpanPool.isInitialized()).toBe(false);

      SpanPool.prewarm(100);

      expect(SpanPool.size()).toBe(100);
      expect(SpanPool.isInitialized()).toBe(true);
    });

    it("respects max pool size during prewarm", () => {
      SpanPool.configure({ maxSize: 50 });
      SpanPool.prewarm(100);

      expect(SpanPool.size()).toBe(50);
    });

    it("does not prewarm if pool already at target size", () => {
      SpanPool.prewarm(100);
      const sizeBefore = SpanPool.size();

      SpanPool.prewarm(50); // Request smaller prewarm

      expect(SpanPool.size()).toBe(sizeBefore); // No change
    });
  });

  describe("max pool size", () => {
    it("drops spans when pool is at max capacity", () => {
      SpanPool.configure({ maxSize: 5 });

      // Create and release 10 spans
      const spans = [];
      for (let i = 0; i < 10; i++) {
        spans.push(SpanPool.acquire({
          text: `span${i}`,
          characterStart: i,
          characterEnd: i + 1,
          filterType: FilterType.NAME,
        }));
      }

      SpanPool.releaseMany(spans);

      // Pool should be at max (5), with 5 dropped
      const stats = SpanPool.getStats();
      expect(stats.poolSize).toBe(5);
      expect(stats.dropped).toBe(5);
    });

    it("tracks peak pool size", () => {
      SpanPool.configure({ maxSize: 100 });
      SpanPool.prewarm(50);

      const stats = SpanPool.getStats();
      expect(stats.peakPoolSize).toBe(50);
    });
  });

  describe("debug mode", () => {
    it("detects double-release in debug mode", () => {
      SpanPool.setDebugMode(true);

      const span = SpanPool.acquire({
        text: "test",
        characterStart: 0,
        characterEnd: 4,
        filterType: FilterType.NAME,
      });

      const poolSizeBefore = SpanPool.size();

      // First release should work
      SpanPool.release(span);
      expect(SpanPool.size()).toBe(poolSizeBefore + 1);

      // Second release should be caught (no error thrown, just logged)
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      SpanPool.release(span);

      // Pool size should NOT increase on double-release
      expect(SpanPool.size()).toBe(poolSizeBefore + 1);

      // Warning should be logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Double-release")
      );

      consoleSpy.mockRestore();
      SpanPool.setDebugMode(false);
    });

    it("accepts spans created outside the pool", () => {
      SpanPool.setDebugMode(true);
      SpanPool.clear();

      // Create a span directly, NOT from the pool
      const externalSpan = new Span({
        text: "external",
        originalValue: "external",
        characterStart: 0,
        characterEnd: 8,
        filterType: FilterType.NAME,
        confidence: 0.9,
        priority: 5,
        context: "",
        window: [],
        replacement: null,
        salt: null,
        pattern: null,
        applied: false,
        ignored: false,
        ambiguousWith: [],
        disambiguationScore: null,
      });

      // Should NOT warn when releasing an external span for the first time
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      SpanPool.release(externalSpan);

      // No warning should be logged for first release
      expect(consoleSpy).not.toHaveBeenCalled();

      // Span should be added to pool
      expect(SpanPool.size()).toBe(1);

      // Second release SHOULD warn
      SpanPool.release(externalSpan);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Double-release")
      );

      consoleSpy.mockRestore();
      SpanPool.setDebugMode(false);
    });
  });
});

describe("SpanFactory with SpanPool integration", () => {
  beforeEach(() => {
    SpanPool.clear();
  });

  afterEach(() => {
    SpanPool.clear();
  });

  it("creates spans via pool through fromMatch", () => {
    const text = "Patient SSN is 123-45-6789 here";
    const regex = /\d{3}-\d{2}-\d{4}/g;
    const match = regex.exec(text)!;

    const span = SpanFactory.fromMatch(text, match, FilterType.SSN);

    expect(span.text).toBe("123-45-6789");
    expect(span.filterType).toBe(FilterType.SSN);

    const stats = SpanPool.getStats();
    expect(stats.acquired).toBeGreaterThan(0);
  });

  it("creates spans via pool through fromPosition", () => {
    const text = "Patient John Smith visited today";

    const span = SpanFactory.fromPosition(text, 8, 18, FilterType.NAME);

    expect(span.text).toBe("John Smith");
    expect(span.characterStart).toBe(8);
    expect(span.characterEnd).toBe(18);

    const stats = SpanPool.getStats();
    expect(stats.acquired).toBeGreaterThan(0);
  });

  it("creates spans via pool through fromText", () => {
    const text = "Call Dr. Johnson at 555-1234";

    const span = SpanFactory.fromText(text, "Dr. Johnson", FilterType.NAME);

    expect(span).not.toBeNull();
    expect(span!.text).toBe("Dr. Johnson");
  });

  it("releases spans back to pool via SpanFactory", () => {
    const span = SpanFactory.fromPosition("hello world", 0, 5, FilterType.NAME);

    const sizeBefore = SpanPool.size();
    SpanFactory.release(span);

    expect(SpanPool.size()).toBe(sizeBefore + 1);
  });

  it("exposes pool stats through SpanFactory", () => {
    SpanFactory.fromPosition("test", 0, 4, FilterType.NAME);

    const stats = SpanFactory.getPoolStats();
    expect(stats.acquired).toBeGreaterThan(0);
  });

  it("pre-warms pool through SpanFactory", () => {
    // Reset pool config to default before test
    SpanPool.configure({ maxSize: 10000 });
    SpanPool.clear();

    SpanFactory.prewarmPool(200);

    expect(SpanPool.size()).toBe(200);
    expect(SpanPool.isInitialized()).toBe(true);
  });

  it("clones spans using pool", () => {
    const original = SpanFactory.fromPosition("test", 0, 4, FilterType.NAME, {
      confidence: 0.9,
    });

    const cloned = SpanFactory.clone(original, {
      confidence: 0.95,
    });

    expect(cloned).not.toBe(original);
    expect(cloned.text).toBe(original.text);
    expect(cloned.confidence).toBe(0.95); // Overridden
    expect(cloned.characterStart).toBe(original.characterStart);
  });

  it("creates multiple spans from patterns using pool", () => {
    const text = "Call 555-1234 or 555-5678 today";
    const patterns = [/\d{3}-\d{4}/g];

    const spans = SpanFactory.fromPatterns(text, patterns, FilterType.PHONE);

    expect(spans).toHaveLength(2);
    expect(spans[0].text).toBe("555-1234");
    expect(spans[1].text).toBe("555-5678");

    const stats = SpanPool.getStats();
    expect(stats.acquired).toBe(2);
  });
});

describe("SpanPool performance characteristics", () => {
  beforeEach(() => {
    SpanPool.clear();
  });

  afterEach(() => {
    SpanPool.clear();
  });

  it("handles high-volume acquire/release cycles", () => {
    SpanPool.prewarm(1000);

    const iterations = 10000;
    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
      const span = SpanPool.acquire({
        text: `span${i}`,
        characterStart: i,
        characterEnd: i + 5,
        filterType: FilterType.NAME,
      });
      SpanPool.release(span);
    }

    const elapsed = Date.now() - start;
    const opsPerMs = iterations / elapsed;

    // Should be very fast - at least 100 ops/ms
    expect(opsPerMs).toBeGreaterThan(100);

    const stats = SpanPool.getStats();
    expect(stats.acquired).toBe(iterations);
    expect(stats.released).toBe(iterations);
    // Should have high reuse rate after prewarm
    expect(stats.reuseRate).toBeGreaterThan(0.99);
  });

  it("batch operations are efficient", () => {
    const batchSize = 1000;

    const start = Date.now();

    // Simulate a document processing cycle
    const spans = [];
    for (let i = 0; i < batchSize; i++) {
      spans.push(SpanPool.acquire({
        text: `entity${i}`,
        characterStart: i * 10,
        characterEnd: i * 10 + 8,
        filterType: i % 2 === 0 ? FilterType.NAME : FilterType.SSN,
        confidence: 0.9,
      }));
    }

    // Release all at once
    SpanPool.releaseMany(spans);

    const elapsed = Date.now() - start;

    // Should complete quickly - under 100ms for 1000 spans
    expect(elapsed).toBeLessThan(100);
  });
});

// Import vi for mocking
import { vi } from "vitest";
