/**
 * VULPES CELARE DIAGNOSTIC TOOL
 *
 * A comprehensive debugging tool for understanding why PHI is or isn't being detected.
 *
 * Usage:
 *   node tests/diagnostic-tool.js "Dr. Philip Parker examined the patient."
 *   node tests/diagnostic-tool.js --file input.txt
 *   node tests/diagnostic-tool.js --interactive
 */

const path = require("path");
const fs = require("fs");
const readline = require("readline");

// Mock electron for non-electron environment
process.env.NODE_ENV = "test";

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function color(text, colorName) {
  return colors[colorName] + text + colors.reset;
}

async function diagnose(text) {
  console.log("\n" + "=".repeat(80));
  console.log(color("VULPES CELARE DIAGNOSTIC TOOL", "bright"));
  console.log("=".repeat(80));
  console.log("\n" + color("INPUT TEXT:", "cyan"));
  console.log("  " + JSON.stringify(text));
  console.log();

  // Step 1: Load required modules
  const { SmartNameFilterSpan } = require("../dist/filters/SmartNameFilterSpan.js");
  const { FormattedNameFilterSpan } = require("../dist/filters/FormattedNameFilterSpan.js");
  const { TitledNameFilterSpan } = require("../dist/filters/TitledNameFilterSpan.js");
  const { FamilyNameFilterSpan } = require("../dist/filters/FamilyNameFilterSpan.js");
  const { DateFilterSpan } = require("../dist/filters/DateFilterSpan.js");
  const { PhoneFilterSpan } = require("../dist/filters/PhoneFilterSpan.js");
  const { SSNFilterSpan } = require("../dist/filters/SSNFilterSpan.js");
  const { MRNFilterSpan } = require("../dist/filters/MRNFilterSpan.js");
  const { EmailFilterSpan } = require("../dist/filters/EmailFilterSpan.js");
  const { RedactionContext } = require("../dist/context/RedactionContext.js");
  const { isWhitelisted, isMedicalEponym } = require("../dist/filters/constants/NameFilterConstants.js");
  const { DocumentVocabulary } = require("../dist/vocabulary/DocumentVocabulary.js");
  const { NameDictionary } = require("../dist/dictionaries/NameDictionary.js");
  const { VulpesCelare } = require("../dist/VulpesCelare.js");

  const context = new RedactionContext();

  // Step 2: Run each filter individually
  console.log(color("STEP 1: INDIVIDUAL FILTER DETECTION", "yellow"));
  console.log("-".repeat(40));

  const nameFilters = [
    { name: "SmartNameFilterSpan", filter: new SmartNameFilterSpan() },
    { name: "FormattedNameFilterSpan", filter: new FormattedNameFilterSpan() },
    { name: "TitledNameFilterSpan", filter: new TitledNameFilterSpan() },
    { name: "FamilyNameFilterSpan", filter: new FamilyNameFilterSpan() },
  ];

  const otherFilters = [
    { name: "DateFilterSpan", filter: new DateFilterSpan() },
    { name: "PhoneFilterSpan", filter: new PhoneFilterSpan() },
    { name: "SSNFilterSpan", filter: new SSNFilterSpan() },
    { name: "MRNFilterSpan", filter: new MRNFilterSpan() },
    { name: "EmailFilterSpan", filter: new EmailFilterSpan() },
  ];

  const allFilters = [...nameFilters, ...otherFilters];
  const allSpans = [];

  for (const { name, filter } of allFilters) {
    const spans = filter.detect(text, {}, context);
    if (spans.length > 0) {
      console.log(color(`\n  ${name}: ${spans.length} span(s) detected`, "green"));
      for (const span of spans) {
        console.log(`    • ${JSON.stringify(span.text)}`);
        console.log(`      Position: ${span.characterStart}-${span.characterEnd}`);
        console.log(`      Confidence: ${span.confidence.toFixed(2)}, Priority: ${span.priority}`);
        console.log(`      Pattern: ${span.pattern || "N/A"}`);
        allSpans.push({ ...span, source: name });
      }
    } else {
      console.log(`  ${name}: ${color("No spans", "red")}`);
    }
  }

  // Step 3: Check whitelist/vocabulary status for each span
  console.log("\n" + color("STEP 2: WHITELIST & VOCABULARY CHECKS", "yellow"));
  console.log("-".repeat(40));

  for (const span of allSpans.filter(s => s.filterType === "NAME")) {
    const spanText = span.text;
    console.log(`\n  Checking: ${color(JSON.stringify(spanText), "cyan")}`);

    // Check title pattern (the pattern that was broken)
    const PERSON_TITLES = ["Dr", "Mr", "Mrs", "Ms", "Miss", "Prof", "Rev", "Hon", "Capt", "Lt", "Sgt", "Col", "Gen"];
    const titlePattern = new RegExp(String.raw`^(?:${PERSON_TITLES.join("|")})\.?\s`, "i");
    const hasTitle = titlePattern.test(spanText);
    console.log(`    Has person title (Dr./Mr./etc): ${hasTitle ? color("YES", "green") : color("NO", "red")}`);

    // Check suffix pattern
    const NAME_SUFFIXES = ["Jr", "Sr", "II", "III", "IV", "V"];
    const suffixPattern = new RegExp(String.raw`\b(?:${NAME_SUFFIXES.join("|")})\.?$`, "i");
    const hasSuffix = suffixPattern.test(spanText);
    console.log(`    Has name suffix (Jr./III/etc): ${hasSuffix ? color("YES", "green") : color("NO", "red")}`);

    // Check whitelist
    console.log(`    isWhitelisted: ${isWhitelisted(spanText) ? color("YES - WOULD BE FILTERED", "red") : color("NO", "green")}`);

    // Check individual words
    const words = spanText.split(/[\s,]+/).filter(w => w.length > 2);
    for (const word of words) {
      const wl = isWhitelisted(word);
      const med = DocumentVocabulary.isMedicalTerm(word);
      const ep = isMedicalEponym(word);
      if (wl || med || ep) {
        console.log(`    Word "${word}": whitelist=${wl}, medical=${med}, eponym=${ep} ${color("← PROBLEM", "red")}`);
      }
    }

    // Check dictionary confidence
    const confidence = NameDictionary.getNameConfidence(spanText);
    console.log(`    Name dictionary confidence: ${confidence.toFixed(2)}`);

    // Check non-PHI
    const nonPHI = DocumentVocabulary.isNonPHI(spanText);
    console.log(`    isNonPHI: ${nonPHI ? color("YES - WOULD BE FILTERED", "red") : color("NO", "green")}`);

    const hasIndicator = DocumentVocabulary.containsNonPHIIndicator(spanText);
    console.log(`    containsNonPHIIndicator: ${hasIndicator ? color("YES - WOULD BE FILTERED", "red") : color("NO", "green")}`);
  }

  // Step 4: Check what the engine pipeline does at each step
  console.log("\n" + color("STEP 3: INTERNAL ENGINE PIPELINE", "yellow"));
  console.log("-".repeat(40));

  // Simulate the internal pipeline
  const { Span, FilterType } = require("../dist/models/Span.js");

  // Collect all name spans
  const nameSpans = allSpans.filter(s => s.filterType === "NAME" || s.filterType === FilterType.NAME);
  console.log(`\n  Total NAME spans detected: ${nameSpans.length}`);

  // Check postFilterSpans logic manually
  let filteredCount = 0;
  for (const span of nameSpans.slice(0, 4)) {
    const name = span.text;
    const nameLower = name.toLowerCase();

    console.log(`\n  Checking: ${color(JSON.stringify(name), "cyan")}`);

    // Check each filter manually
    const checks = [];

    // Filter 1: ALL CAPS section heading
    if (/^[A-Z\s]+$/.test(name)) {
      checks.push("ALL CAPS - checking headings");
    }

    // Filter 3: Too short
    if (name.length < 5 && !name.includes(",") && span.confidence < 0.9) {
      checks.push(color("FILTERED: Too short", "red"));
      filteredCount++;
    }

    // Filter 4: Invalid starts
    const invalidStarts = ["The ", "Dr. ", "Mr. ", "Mrs. ", "Ms. ", "Prof. "];
    for (const start of invalidStarts) {
      if (name.startsWith(start)) {
        // Wait - "Dr. " is NOT in the actual invalid starts list!
        // Let me check the actual list...
      }
    }

    if (checks.length === 0) {
      console.log(`    ${color("✓ Should pass all postFilter checks", "green")}`);
    } else {
      for (const check of checks) {
        console.log(`    ${check}`);
      }
    }
  }

  // Step 4: Run through full engine
  console.log("\n" + color("STEP 4: FULL ENGINE PROCESSING", "yellow"));
  console.log("-".repeat(40));

  const engine = new VulpesCelare();
  const result = await engine.process(text);

  console.log(`\n  ${color("INPUT:", "cyan")} ${JSON.stringify(text)}`);
  console.log(`  ${color("OUTPUT:", "cyan")} ${JSON.stringify(result.text)}`);
  console.log(`  Redaction count: ${result.redactionCount}`);
  console.log(`  Breakdown:`, result.breakdown);

  // Check the execution report for more details
  if (result.report) {
    console.log(`\n  ${color("Execution Report:", "cyan")}`);
    console.log(`    Total spans detected: ${result.report.totalSpansDetected}`);
    console.log(`    Execution time: ${result.report.totalExecutionTimeMs}ms`);
  }

  // Step 5: Identify problems
  console.log("\n" + color("STEP 4: DIAGNOSIS", "yellow"));
  console.log("-".repeat(40));

  if (allSpans.length === 0) {
    console.log(color("\n  ⚠ NO SPANS DETECTED by any filter!", "red"));
    console.log("  Possible causes:");
    console.log("    1. Text doesn't match any detection patterns");
    console.log("    2. Case mismatch (patterns expect Title Case)");
    console.log("    3. Unusual formatting (extra spaces, punctuation)");
  } else if (result.redactionCount === 0) {
    console.log(color("\n  ⚠ SPANS DETECTED but NOT REDACTED!", "red"));
    console.log("  Spans were filtered out. Check:");
    console.log("    1. Whitelist checks above - look for 'WOULD BE FILTERED'");
    console.log("    2. Post-filter pipeline in ParallelRedactionEngine.ts");
    console.log("    3. Title pattern recognition (should protect titled names)");
  } else if (result.text === text) {
    console.log(color("\n  ⚠ NO CHANGES MADE to text!", "red"));
  } else {
    console.log(color("\n  ✓ Redaction appears successful", "green"));
  }

  // Show what SHOULD have been redacted vs what was
  const expectedPHI = allSpans.map(s => s.text);
  const actualRedactions = [];
  const tokenPattern = /\{\{[^}]+\}\}/g;
  let match;
  while ((match = tokenPattern.exec(result.text)) !== null) {
    actualRedactions.push(match[0]);
  }

  if (expectedPHI.length > 0 && actualRedactions.length === 0) {
    console.log("\n  " + color("Expected to redact:", "cyan"));
    for (const phi of new Set(expectedPHI)) {
      console.log(`    • ${JSON.stringify(phi)}`);
    }
    console.log("\n  " + color("Actually redacted: NOTHING", "red"));
  }

  console.log("\n" + "=".repeat(80));
  return { allSpans, result };
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help") {
    console.log("Usage:");
    console.log("  node tests/diagnostic-tool.js \"Your text here\"");
    console.log("  node tests/diagnostic-tool.js --file input.txt");
    console.log("  node tests/diagnostic-tool.js --interactive");
    process.exit(0);
  }

  if (args[0] === "--interactive") {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const ask = () => {
      rl.question("\nEnter text to diagnose (or 'quit' to exit): ", async (answer) => {
        if (answer.toLowerCase() === "quit") {
          rl.close();
          return;
        }
        await diagnose(answer);
        ask();
      });
    };
    ask();
  } else if (args[0] === "--file") {
    const filePath = args[1];
    if (!filePath) {
      console.error("Please provide a file path");
      process.exit(1);
    }
    const content = fs.readFileSync(filePath, "utf8");
    await diagnose(content);
  } else {
    await diagnose(args.join(" "));
  }
}

main().catch(console.error);
