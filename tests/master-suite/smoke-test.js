/**
 * Quick smoke test - verifies all modules load correctly
 */
console.log("Testing MTSamples integration...\n");

try {
  // Test 1: Seeded Random
  console.log("[1/5] Testing seeded-random...");
  const { setSeed, random, randomInt, chance } = require("./generators/seeded-random");
  setSeed(12345);
  console.log("      ✓ Seeded random: " + random().toFixed(4));
  
  // Test 2: Errors
  console.log("[2/5] Testing errors...");
  const { applyErrors } = require("./generators/errors");
  const result = applyErrors("John Smith", "low");
  console.log("      ✓ Error simulation: " + result.text);
  
  // Test 3: PHI Generators
  console.log("[3/5] Testing PHI generators...");
  const { generatePatientName, generateSSN, generateMRN, generateDate } = require("./generators/phi");
  console.log("      ✓ Name: " + generatePatientName().formatted);
  console.log("      ✓ SSN: " + generateSSN());
  console.log("      ✓ MRN: " + generateMRN());
  console.log("      ✓ Date: " + generateDate());
  
  // Test 4: MTSamples Loader
  console.log("[4/5] Testing MTSamples loader...");
  const { loadMTSamples, getCorpusStats } = require("./corpus/mtsamples-loader");
  const docs = loadMTSamples();
  const stats = getCorpusStats(docs);
  console.log("      ✓ Loaded " + docs.length + " documents");
  console.log("      ✓ Specialties: " + stats.specialtyCount);
  console.log("      ✓ Avg word count: " + stats.avgWordCount);
  
  // Test 5: Injector (quick test)
  console.log("[5/5] Testing PHI injector...");
  const { injectPHI } = require("./corpus/mtsamples-injector");
  const testDoc = docs[0];
  const injected = injectPHI(testDoc, { seed: 42, maxInjections: 5 });
  console.log("      ✓ Injected " + injected.annotations.length + " PHI items");
  console.log("      ✓ Sample PHI: " + (injected.annotations[0]?.text || "N/A"));
  
  console.log("\n╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  ✅ ALL TESTS PASSED - MTSamples integration is working!      ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  console.log("\nReady to run:");
  console.log("  node run-mtsamples-validation.js --quick");
  
} catch (e) {
  console.error("\n❌ ERROR: " + e.message);
  console.error(e.stack);
  process.exit(1);
}
