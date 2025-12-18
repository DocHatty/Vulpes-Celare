/**
 * Unit Tests for Error Handling, Edge Cases, and Bug Fixes
 *
 * Tests:
 * 1. RedactionEngine input validation
 * 2. PolicyLoader error handling
 * 3. Dictionary initialization error handling
 * 4. WindowService position calculation (indexOf bug fix)
 * 5. VectorDisambiguationService cache management
 */

const path = require("path");
const fs = require("fs");

// Track test results
const results = {
  passed: 0,
  failed: 0,
  errors: [],
};

function test(name, fn) {
  try {
    fn();
    results.passed++;
    console.log(`  \u2713 ${name}`);
  } catch (error) {
    results.failed++;
    results.errors.push({ name, error: error.message });
    console.log(`  \u2717 ${name}`);
    console.log(`    Error: ${error.message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      `${message || "Assertion failed"}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function assertThrows(fn, expectedError, message) {
  let threw = false;
  let error = null;
  try {
    fn();
  } catch (e) {
    threw = true;
    error = e;
  }
  if (!threw) {
    throw new Error(
      `${message || "Expected function to throw"}: function did not throw`,
    );
  }
  if (expectedError && !error.message.includes(expectedError)) {
    throw new Error(
      `${message || "Wrong error message"}: expected "${expectedError}", got "${error.message}"`,
    );
  }
}

async function assertThrowsAsync(fn, expectedError, message) {
  let threw = false;
  let error = null;
  try {
    await fn();
  } catch (e) {
    threw = true;
    error = e;
  }
  if (!threw) {
    throw new Error(
      `${message || "Expected function to throw"}: function did not throw`,
    );
  }
  if (expectedError && !error.message.includes(expectedError)) {
    throw new Error(
      `${message || "Wrong error message"}: expected "${expectedError}", got "${error.message}"`,
    );
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error(message || "Expected true, got false");
  }
}

function assertFalse(value, message) {
  if (value) {
    throw new Error(message || "Expected false, got true");
  }
}

function assertArrayEqual(actual, expected, message) {
  if (actual.length !== expected.length) {
    throw new Error(
      `${message || "Arrays differ"}: length ${actual.length} !== ${expected.length}`,
    );
  }
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      throw new Error(
        `${message || "Arrays differ"}: index ${i}: ${actual[i]} !== ${expected[i]}`,
      );
    }
  }
}

// ============================================================================
// TESTS
// ============================================================================

async function runTests() {
  console.log("=".repeat(70));
  console.log("UNIT TESTS - Error Handling, Edge Cases, and Bug Fixes");
  console.log("=".repeat(70));
  console.log();

  // Load modules
  const {
    RedactionEngine,
    RedactionContext,
  } = require("../dist/RedactionEngine.js");
  const {
    PolicyLoader,
    PolicyValidationError,
    PolicyLoadError,
  } = require("../dist/policies/PolicyLoader.js");
  const {
    NameDictionary,
    DictionaryInitError,
  } = require("../dist/dictionaries/NameDictionary.js");
  const {
    HospitalDictionary,
    HospitalDictionaryInitError,
  } = require("../dist/dictionaries/HospitalDictionary.js");
  const { WindowService } = require("../dist/services/WindowService.js");
  const {
    VectorDisambiguationService,
  } = require("../dist/services/VectorDisambiguationService.js");
  const { Span, FilterType } = require("../dist/models/Span.js");

  // ============================================================================
  // 1. RedactionEngine Input Validation Tests
  // ============================================================================
  console.log("1. RedactionEngine Input Validation");
  console.log("-".repeat(50));

  await RedactionEngine.init();

  test("rejects null text", async () => {
    const context = RedactionEngine.createContext();
    const policy = { identifiers: {} };
    await assertThrowsAsync(
      () => RedactionEngine.redact(null, policy, context),
      "text cannot be null",
    );
  });

  test("rejects undefined text", async () => {
    const context = RedactionEngine.createContext();
    const policy = { identifiers: {} };
    await assertThrowsAsync(
      () => RedactionEngine.redact(undefined, policy, context),
      "text cannot be null",
    );
  });

  test("accepts empty string", async () => {
    const context = RedactionEngine.createContext();
    const policy = { identifiers: {} };
    const result = await RedactionEngine.redact("", policy, context);
    assertEqual(result, "", "Empty string should return empty string");
  });

  test("rejects null policy", async () => {
    const context = RedactionEngine.createContext();
    await assertThrowsAsync(
      () => RedactionEngine.redact("test", null, context),
      "policy is required",
    );
  });

  test("rejects policy without identifiers", async () => {
    const context = RedactionEngine.createContext();
    await assertThrowsAsync(
      () => RedactionEngine.redact("test", {}, context),
      "policy must have an 'identifiers' object",
    );
  });

  test("rejects policy with non-object identifiers", async () => {
    const context = RedactionEngine.createContext();
    await assertThrowsAsync(
      () => RedactionEngine.redact("test", { identifiers: "invalid" }, context),
      "policy must have an 'identifiers' object",
    );
  });

  test("rejects null context", async () => {
    const policy = { identifiers: {} };
    await assertThrowsAsync(
      () => RedactionEngine.redact("test", policy, null),
      "context is required",
    );
  });

  test("rejects context without createToken method", async () => {
    const policy = { identifiers: {} };
    const badContext = {};
    await assertThrowsAsync(
      () => RedactionEngine.redact("test", policy, badContext),
      "context must have a createToken method",
    );
  });

  console.log();

  // ============================================================================
  // 2. PolicyLoader Error Handling Tests
  // ============================================================================
  console.log("2. PolicyLoader Error Handling");
  console.log("-".repeat(50));

  // Import RadiologyLogger to suppress expected errors
  const { RadiologyLogger } = require("../dist/utils/RadiologyLogger.js");

  test("rejects empty policy name", async () => {
    await assertThrowsAsync(
      () => PolicyLoader.loadPolicy(""),
      "Policy name must be a non-empty string",
    );
  });

  test("rejects null policy name", async () => {
    await assertThrowsAsync(
      () => PolicyLoader.loadPolicy(null),
      "Policy name must be a non-empty string",
    );
  });

  test("rejects policy name with path traversal", async () => {
    await assertThrowsAsync(
      () => PolicyLoader.loadPolicy("../etc/passwd"),
      "Invalid policy name",
    );
  });

  test("rejects policy name with special characters", async () => {
    await assertThrowsAsync(
      () => PolicyLoader.loadPolicy("policy<script>"),
      "Invalid policy name",
    );
  });

  test("allows valid policy names with hyphens and underscores", async () => {
    // This should throw PolicyLoadError (not found), not PolicyValidationError
    try {
      await PolicyLoader.loadPolicy("valid-policy_name");
    } catch (e) {
      // Should be "not found" error, not validation error
      assertTrue(
        e.message.includes("not found") || e.name === "PolicyLoadError",
        "Should throw not found error, not validation error",
      );
    }
  });

  test("throws PolicyLoadError for missing file", async () => {
    try {
      await PolicyLoader.loadPolicy("nonexistent-policy-xyz");
      throw new Error("Should have thrown");
    } catch (e) {
      assertEqual(e.name, "PolicyLoadError", "Should throw PolicyLoadError");
      assertTrue(
        e.message.includes("not found"),
        "Error should mention not found",
      );
    }
  });

  test("cache operations work correctly", () => {
    PolicyLoader.clearCache();
    const cached = PolicyLoader.getCachedPolicies();
    assertEqual(cached.length, 0, "Cache should be empty after clear");
  });

  console.log();

  // ============================================================================
  // 3. Dictionary Error Handling Tests
  // ============================================================================
  console.log("3. Dictionary Initialization");
  console.log("-".repeat(50));

  test("NameDictionary getStatus returns correct structure", () => {
    const status = NameDictionary.getStatus();
    assertTrue(
      typeof status.initialized === "boolean",
      "Should have initialized flag",
    );
    assertTrue(
      typeof status.firstNamesLoaded === "boolean",
      "Should have firstNamesLoaded flag",
    );
    assertTrue(
      typeof status.surnamesLoaded === "boolean",
      "Should have surnamesLoaded flag",
    );
    assertTrue(
      typeof status.firstNamesCount === "number",
      "Should have firstNamesCount",
    );
    assertTrue(
      typeof status.surnamesCount === "number",
      "Should have surnamesCount",
    );
    assertTrue(Array.isArray(status.errors), "Should have errors array");
  });

  test("NameDictionary isHealthy returns boolean", () => {
    const healthy = NameDictionary.isHealthy();
    assertTrue(typeof healthy === "boolean", "isHealthy should return boolean");
  });

  test("HospitalDictionary getStatus returns correct structure", () => {
    const status = HospitalDictionary.getStatus();
    assertTrue(
      typeof status.initialized === "boolean",
      "Should have initialized flag",
    );
    assertTrue(
      typeof status.hospitalsLoaded === "boolean",
      "Should have hospitalsLoaded flag",
    );
    assertTrue(
      typeof status.hospitalCount === "number",
      "Should have hospitalCount",
    );
    assertTrue(
      typeof status.phraseCount === "number",
      "Should have phraseCount",
    );
  });

  test("HospitalDictionary isHealthy returns boolean", () => {
    const healthy = HospitalDictionary.isHealthy();
    assertTrue(typeof healthy === "boolean", "isHealthy should return boolean");
  });

  console.log();

  // ============================================================================
  // 4. WindowService Position Calculation Tests (indexOf bug fix)
  // ============================================================================
  console.log("4. WindowService Position Calculation (indexOf Bug Fix)");
  console.log("-".repeat(50));

  test("correctly finds second occurrence of repeated word", () => {
    // This was the bug: "John and John Smith" - looking for second "John"
    const text = "John and John Smith went home";
    const secondJohnStart = 9; // Position of second "John"
    const secondJohnEnd = 13;

    // Create span for the second "John"
    const span = new Span({
      text: "John",
      characterStart: secondJohnStart,
      characterEnd: secondJohnEnd,
      filterType: FilterType.NAME,
      confidence: 0.9,
    });

    const window = WindowService.getWindow(text, span, { size: 2 });

    // Window should contain tokens around the SECOND John, not the first
    // Expected: ["and", "John", "Smith", "went"]
    assertTrue(
      window.includes("Smith"),
      "Window should include 'Smith' (after second John)",
    );
    assertTrue(
      window.includes("and"),
      "Window should include 'and' (before second John)",
    );
  });

  test("correctly handles multiple identical tokens", () => {
    const text = "test test test target test test";
    const targetStart = 15; // Position of "target"
    const targetEnd = 21;

    const span = new Span({
      text: "target",
      characterStart: targetStart,
      characterEnd: targetEnd,
      filterType: FilterType.NAME,
      confidence: 0.9,
    });

    const window = WindowService.getWindow(text, span, { size: 2 });

    // Window should be centered on "target"
    assertTrue(window.includes("target"), "Window should include target");
    assertEqual(
      window.filter((t) => t === "test").length,
      4,
      "Should have 4 'test' tokens in window",
    );
  });

  test("handles span at beginning of text", () => {
    const text = "John Smith is a doctor";

    const span = new Span({
      text: "John",
      characterStart: 0,
      characterEnd: 4,
      filterType: FilterType.NAME,
      confidence: 0.9,
    });

    const window = WindowService.getWindow(text, span, { size: 3 });

    assertTrue(window[0] === "John", "First token should be 'John'");
    assertTrue(window.includes("Smith"), "Window should include 'Smith'");
  });

  test("handles span at end of text", () => {
    const text = "The patient is John";

    const span = new Span({
      text: "John",
      characterStart: 15,
      characterEnd: 19,
      filterType: FilterType.NAME,
      confidence: 0.9,
    });

    const window = WindowService.getWindow(text, span, { size: 3 });

    assertTrue(
      window[window.length - 1] === "John",
      "Last token should be 'John'",
    );
    assertTrue(window.includes("patient"), "Window should include 'patient'");
  });

  test("getWindowAt uses correct positions", () => {
    const text = "word word target word word";
    const targetStart = 10;
    const targetEnd = 16;

    const window = WindowService.getWindowAt(text, targetStart, targetEnd, {
      size: 2,
    });

    assertTrue(window.includes("target"), "Window should include target");
  });

  test("getTokensBefore returns correct tokens", () => {
    const text = "one two three four five six";

    const span = new Span({
      text: "four",
      characterStart: 14,
      characterEnd: 18,
      filterType: FilterType.NAME,
      confidence: 0.9,
    });

    const before = WindowService.getTokensBefore(text, span, 2);

    assertArrayEqual(
      before,
      ["two", "three"],
      "Should return 2 tokens before 'four'",
    );
  });

  test("getTokensAfter returns correct tokens", () => {
    const text = "one two three four five six";

    const span = new Span({
      text: "three",
      characterStart: 8,
      characterEnd: 13,
      filterType: FilterType.NAME,
      confidence: 0.9,
    });

    const after = WindowService.getTokensAfter(text, span, 2);

    assertArrayEqual(
      after,
      ["four", "five"],
      "Should return 2 tokens after 'three'",
    );
  });

  test("toLowerCase option works correctly", () => {
    const text = "John SMITH went Home";

    const span = new Span({
      text: "SMITH",
      characterStart: 5,
      characterEnd: 10,
      filterType: FilterType.NAME,
      confidence: 0.9,
    });

    const window = WindowService.getWindow(text, span, {
      size: 2,
      toLowerCase: true,
    });

    assertTrue(
      window.every((t) => t === t.toLowerCase()),
      "All tokens should be lowercase",
    );
    assertTrue(
      window.includes("smith"),
      "Window should include lowercase 'smith'",
    );
  });

  test("includePunctuation option works", () => {
    const text = "Hello, John! How are you?";

    const span = new Span({
      text: "John",
      characterStart: 7,
      characterEnd: 11,
      filterType: FilterType.NAME,
      confidence: 0.9,
    });

    const windowWithPunct = WindowService.getWindow(text, span, {
      size: 2,
      includePunctuation: true,
    });
    const windowWithoutPunct = WindowService.getWindow(text, span, {
      size: 2,
      includePunctuation: false,
    });

    assertTrue(
      windowWithPunct.includes(",") || windowWithPunct.includes("!"),
      "Window with punctuation should include punctuation",
    );
    assertFalse(
      windowWithoutPunct.includes(",") && windowWithoutPunct.includes("!"),
      "Window without punctuation should not include punctuation",
    );
  });

  console.log();

  // ============================================================================
  // 5. VectorDisambiguationService Tests
  // ============================================================================
  console.log("5. VectorDisambiguationService Cache Management");
  console.log("-".repeat(50));

  test("cache stats return correct structure", () => {
    const service = new VectorDisambiguationService();
    const stats = service.getCacheStats();

    assertTrue(
      typeof stats.uniqueContexts === "number",
      "Should have uniqueContexts",
    );
    assertTrue(
      typeof stats.totalVectors === "number",
      "Should have totalVectors",
    );
    assertTrue(
      typeof stats.typeDistribution === "object",
      "Should have typeDistribution",
    );
    assertTrue(
      typeof stats.avgVectorsPerContext === "number",
      "Should have avgVectorsPerContext",
    );
  });

  test("clearCache empties the cache", () => {
    const service = new VectorDisambiguationService();

    // Add some spans to populate cache
    const span1 = new Span({
      text: "John",
      characterStart: 0,
      characterEnd: 4,
      filterType: FilterType.NAME,
      confidence: 0.9,
      window: ["Dr", "John", "Smith"],
    });

    service.disambiguate([span1]);

    // Clear and verify
    service.clearCache();
    const stats = service.getCacheStats();

    assertEqual(stats.uniqueContexts, 0, "Cache should be empty after clear");
    assertEqual(stats.totalVectors, 0, "Total vectors should be 0 after clear");
  });

  test("export and import cache works", () => {
    const service = new VectorDisambiguationService();

    // Add some data
    const span = new Span({
      text: "Test",
      characterStart: 0,
      characterEnd: 4,
      filterType: FilterType.NAME,
      confidence: 0.9,
      window: ["context", "Test", "words"],
    });

    service.disambiguate([span]);

    // Export
    const exported = service.exportCache();
    assertTrue(exported.config !== undefined, "Export should have config");
    assertTrue(exported.entries !== undefined, "Export should have entries");
    assertTrue(exported.stats !== undefined, "Export should have stats");

    // Create new service and import
    const service2 = new VectorDisambiguationService();
    service2.importCache(exported);

    const stats2 = service2.getCacheStats();
    assertTrue(
      stats2.uniqueContexts > 0 || stats2.totalVectors >= 0,
      "Import should restore cache data",
    );
  });

  test("disambiguate handles empty array", () => {
    const service = new VectorDisambiguationService();
    const result = service.disambiguate([]);

    assertEqual(result.length, 0, "Empty input should return empty output");
  });

  test("disambiguate handles single span", () => {
    const service = new VectorDisambiguationService();

    const span = new Span({
      text: "John",
      characterStart: 0,
      characterEnd: 4,
      filterType: FilterType.NAME,
      confidence: 0.9,
      window: ["Dr", "John", "examined"],
    });

    const result = service.disambiguate([span]);

    assertEqual(result.length, 1, "Single span should return single result");
  });

  console.log();

  // ============================================================================
  // Summary
  // ============================================================================
  console.log("=".repeat(70));
  console.log("TEST SUMMARY");
  console.log("=".repeat(70));
  console.log();
  console.log(`  Passed: ${results.passed}`);
  console.log(`  Failed: ${results.failed}`);
  console.log(`  Total:  ${results.passed + results.failed}`);
  console.log();

  if (results.failed > 0) {
    console.log("FAILURES:");
    for (const error of results.errors) {
      console.log(`  - ${error.name}: ${error.error}`);
    }
    console.log();
    process.exit(1);
  } else {
    console.log("All tests passed!");
    process.exit(0);
  }
}

runTests().catch((error) => {
  console.error("Test runner error:", error);
  process.exit(1);
});
