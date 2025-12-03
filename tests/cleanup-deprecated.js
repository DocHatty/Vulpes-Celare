#!/usr/bin/env node

/**
 * VULPES CELARE - DEPRECATED TEST FILE CLEANUP
 * 
 * This script removes old test files that have been superseded
 * by the master test suite.
 * 
 * USAGE: node tests/cleanup-deprecated.js
 */

const fs = require("fs");
const path = require("path");

const DEPRECATED_FILES = [
  "comprehensive-200-assessment.js",
  "fresh-200-assessment.js",
  "hipaa-compliant-200-assessment.js",
  "mega-assessment.js",
  "stress-test-200.js",
  "vulpes-realistic-assessment.js",
  "vulpes-assessment.js",
  "vigorous-assessment.js"
];

const testsDir = path.join(__dirname);

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║  VULPES CELARE - DEPRECATED TEST CLEANUP                     ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

console.log("The following test files are deprecated and superseded by");
console.log("the master test suite (tests/master-suite/run.js):\n");

let deletedCount = 0;
let notFoundCount = 0;

for (const file of DEPRECATED_FILES) {
  const filePath = path.join(testsDir, file);
  
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`  ✓ Deleted: ${file}`);
      deletedCount++;
    } catch (err) {
      console.log(`  ✗ Failed to delete: ${file} - ${err.message}`);
    }
  } else {
    console.log(`  - Not found (already deleted): ${file}`);
    notFoundCount++;
  }
}

console.log(`\n────────────────────────────────────────────────────────────────`);
console.log(`  Deleted: ${deletedCount} files`);
console.log(`  Already gone: ${notFoundCount} files`);
console.log(`────────────────────────────────────────────────────────────────`);

console.log(`\nTo run the new master test suite:`);
console.log(`  node tests/master-suite/run.js`);
console.log(`\nFor more options:`);
console.log(`  node tests/master-suite/run.js --help`);
