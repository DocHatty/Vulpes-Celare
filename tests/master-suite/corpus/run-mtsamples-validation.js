/**
 * Re-exports the validation runner from the master-suite root.
 * 
 * Primary entry point: tests/master-suite/run-mtsamples-validation.js
 * 
 * Usage:
 *   node tests/master-suite/run-mtsamples-validation.js --quick
 *   node tests/master-suite/run-mtsamples-validation.js --full
 */

// Re-export from the main runner
module.exports = require("../run-mtsamples-validation.js");
