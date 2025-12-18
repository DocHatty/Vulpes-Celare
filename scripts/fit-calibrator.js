#!/usr/bin/env node

/**
 * fit-calibrator.js - CLI tool for fitting the confidence calibrator
 *
 * Usage:
 *   node scripts/fit-calibrator.js [options]
 *
 * Options:
 *   --force          Force recalibration even if fresh calibration exists
 *   --method=NAME    Calibration method (platt, isotonic, beta, temperature)
 *   --min-points=N   Minimum data points required (default: 50)
 *   --verbose        Show detailed output
 *   --status         Show current calibration status only
 *   --clear          Clear existing calibration
 *   --backup         Create backup before recalibration
 *   --list-backups   List available backups
 *   --restore=PATH   Restore from a backup file
 */

const path = require("path");
const fs = require("fs");

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  force: false,
  method: "isotonic",
  minPoints: 50,
  verbose: false,
  statusOnly: false,
  clear: false,
  backup: false,
  listBackups: false,
  restorePath: null,
};

for (const arg of args) {
  if (arg === "--force") options.force = true;
  if (arg === "--verbose") options.verbose = true;
  if (arg === "--status") options.statusOnly = true;
  if (arg === "--clear") options.clear = true;
  if (arg === "--backup") options.backup = true;
  if (arg === "--list-backups") options.listBackups = true;
  if (arg.startsWith("--method=")) {
    options.method = arg.split("=")[1];
  }
  if (arg.startsWith("--min-points=")) {
    options.minPoints = parseInt(arg.split("=")[1]) || 50;
  }
  if (arg.startsWith("--restore=")) {
    options.restorePath = arg.split("=")[1];
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║           VULPES CELARE - CONFIDENCE CALIBRATOR                ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  // Check if we need to build first
  const distPath = path.join(process.cwd(), "dist", "calibration");
  if (!fs.existsSync(distPath)) {
    console.log("⚠️  Calibration module not built. Running npm run build first...\n");
    const { execSync } = require("child_process");
    try {
      execSync("npm run build", { stdio: "inherit" });
      console.log("");
    } catch (error) {
      console.error("❌ Build failed. Please run 'npm run build' manually.");
      process.exit(1);
    }
  }

  // Import the calibration modules
  let AutoCalibrator, CalibrationPersistence, ConfidenceCalibrator;
  try {
    const calibrationModule = require("../dist/calibration");
    AutoCalibrator = calibrationModule.AutoCalibrator;
    CalibrationPersistence = calibrationModule.CalibrationPersistence;
    
    const coreModule = require("../dist/core/ConfidenceCalibrator");
    ConfidenceCalibrator = coreModule.ConfidenceCalibrator;
  } catch (error) {
    console.error("❌ Failed to load calibration modules:", error.message);
    console.error("   Make sure to run 'npm run build' first.");
    process.exit(1);
  }

  const persistence = new CalibrationPersistence();

  // Handle list-backups
  if (options.listBackups) {
    console.log("📁 Available backups:\n");
    const backups = persistence.listBackups();
    if (backups.length === 0) {
      console.log("   No backups found.");
    } else {
      backups.forEach((backup, i) => {
        const stats = fs.statSync(backup);
        console.log(`   ${i + 1}. ${path.basename(backup)} (${formatBytes(stats.size)})`);
      });
    }
    console.log("");
    return;
  }

  // Handle restore
  if (options.restorePath) {
    console.log(`🔄 Restoring from backup: ${options.restorePath}\n`);
    const calibrator = new ConfidenceCalibrator(options.method);
    const success = persistence.restoreFromBackup(options.restorePath, calibrator);
    if (success) {
      console.log("✅ Calibration restored successfully.");
    } else {
      console.log("❌ Failed to restore calibration.");
      process.exit(1);
    }
    return;
  }

  // Handle clear
  if (options.clear) {
    console.log("🗑️  Clearing existing calibration...\n");
    if (options.backup) {
      persistence.backup();
    }
    persistence.clear();
    console.log("✅ Calibration cleared.");
    return;
  }

  // Create auto-calibrator
  const autoCalibrator = new AutoCalibrator({
    minDataPoints: options.minPoints,
    preferredMethod: options.method,
    createBackup: options.backup,
    verbose: options.verbose,
  });

  // Handle status only
  if (options.statusOnly) {
    console.log(autoCalibrator.getReport());
    return;
  }

  // Run calibration
  console.log("🔬 Running auto-calibration...\n");
  console.log(`   Method: ${options.method}`);
  console.log(`   Min data points: ${options.minPoints}`);
  console.log(`   Force: ${options.force}`);
  console.log("");

  let result;
  if (options.force) {
    result = await autoCalibrator.forceRecalibration();
  } else {
    result = await autoCalibrator.runAutoCalibration();
  }

  // Display results
  if (result.success) {
    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║                    CALIBRATION COMPLETE                        ║");
    console.log("╠════════════════════════════════════════════════════════════════╣");
    console.log(`║  ${result.message.padEnd(62)}║`);
    console.log("╠════════════════════════════════════════════════════════════════╣");

    if (result.metrics) {
      console.log("║  Calibration Metrics:                                          ║");
      console.log(`║    ECE (Expected Calibration Error): ${(result.metrics.expectedCalibrationError * 100).toFixed(2).padStart(6)}%               ║`);
      console.log(`║    MCE (Maximum Calibration Error):  ${(result.metrics.maxCalibrationError * 100).toFixed(2).padStart(6)}%               ║`);
      console.log(`║    Brier Score: ${result.metrics.brierScore.toFixed(4).padStart(8)}                                    ║`);
    }

    if (result.filterTypeStats && options.verbose) {
      console.log("╠════════════════════════════════════════════════════════════════╣");
      console.log("║  Data Points by Filter Type:                                   ║");
      for (const [type, count] of result.filterTypeStats) {
        console.log(`║    ${type.padEnd(20)} ${String(count).padStart(6)} points                   ║`);
      }
    }

    console.log("╚════════════════════════════════════════════════════════════════╝");
    console.log("\n✅ Calibration saved to data/calibration/calibration.json");
  } else {
    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║                    CALIBRATION FAILED                          ║");
    console.log("╠════════════════════════════════════════════════════════════════╣");
    console.log(`║  ${result.message.substring(0, 62).padEnd(62)}║`);
    console.log("╠════════════════════════════════════════════════════════════════╣");
    console.log("║  Suggestions:                                                  ║");
    console.log("║    1. Run the test suite to generate calibration data:        ║");
    console.log("║       node tests/master-suite/run.js --log-file               ║");
    console.log("║                                                                ║");
    console.log("║    2. Lower the minimum data point requirement:               ║");
    console.log("║       node scripts/fit-calibrator.js --min-points=20          ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");
    process.exit(1);
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
