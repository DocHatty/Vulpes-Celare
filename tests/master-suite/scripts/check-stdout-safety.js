#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  STDOUT SAFETY CHECKER                                                        ║
 * ║  Prevents MCP Protocol Corruption                                             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * This script scans all JS files in the test suite for dangerous stdout usage
 * that would break the MCP JSON-RPC protocol.
 * 
 * FORBIDDEN PATTERNS:
 * - console.log()           → Use console.error() instead
 * - process.stdout.write()  → Use process.stderr.write() instead
 * 
 * WHY THIS MATTERS:
 * MCP uses stdin/stdout for JSON-RPC 2.0 communication. ANY non-JSON output
 * to stdout corrupts the protocol and causes "Unexpected token" errors.
 * 
 * Run this before commits: node scripts/check-stdout-safety.js
 */

const fs = require("fs");
const path = require("path");

const FORBIDDEN_PATTERNS = [
    {
        regex: /console\.log\s*\(/g,
        name: "console.log",
        fix: "console.error",
    },
    {
        regex: /process\.stdout\.write\s*\(/g,
        name: "process.stdout.write",
        fix: "process.stderr.write",
    },
];

// Files/directories to skip
const SKIP_PATTERNS = [
    "node_modules",
    ".git",
    "scripts/check-stdout-safety.js", // This file
    "cortex/mcp/server.js", // Has legitimate interception code
    "run.js", // Standalone CLI - legitimately uses stdout for JSON output (not called from MCP)
];

function shouldSkip(filePath) {
    return SKIP_PATTERNS.some((pattern) => filePath.includes(pattern));
}

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    const violations = [];

    for (const pattern of FORBIDDEN_PATTERNS) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Skip comments
            if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;

            if (pattern.regex.test(line)) {
                violations.push({
                    file: filePath,
                    line: i + 1,
                    content: line.trim(),
                    pattern: pattern.name,
                    fix: pattern.fix,
                });
            }
            // Reset regex lastIndex
            pattern.regex.lastIndex = 0;
        }
    }

    return violations;
}

function scanDirectory(dir) {
    let allViolations = [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (shouldSkip(fullPath)) continue;

        if (entry.isDirectory()) {
            allViolations = allViolations.concat(scanDirectory(fullPath));
        } else if (entry.name.endsWith(".js")) {
            allViolations = allViolations.concat(scanFile(fullPath));
        }
    }

    return allViolations;
}

// Main
const rootDir = path.join(__dirname, "..");
console.error("╔══════════════════════════════════════════════════════════════╗");
console.error("║  STDOUT SAFETY CHECK - MCP Protocol Protection               ║");
console.error("╚══════════════════════════════════════════════════════════════╝\n");

const violations = scanDirectory(rootDir);

if (violations.length === 0) {
    console.error("✅ ALL CLEAR: No dangerous stdout usage detected.\n");
    console.error("   The MCP protocol is protected from corruption.\n");
    process.exit(0);
} else {
    console.error(`❌ DANGER: Found ${violations.length} violation(s) that will break MCP!\n`);

    for (const v of violations) {
        const relativePath = path.relative(rootDir, v.file);
        console.error(`   ${relativePath}:${v.line}`);
        console.error(`   ├─ Found: ${v.pattern}`);
        console.error(`   ├─ Code:  ${v.content.substring(0, 60)}...`);
        console.error(`   └─ Fix:   Replace with ${v.fix}\n`);
    }

    console.error("─".repeat(60));
    console.error("WHY THIS MATTERS:");
    console.error("MCP uses stdout for JSON-RPC. Non-JSON output causes");
    console.error('"Unexpected token" errors like you just experienced.\n');
    console.error("FIX: Replace all console.log with console.error");
    console.error("     Replace all process.stdout.write with process.stderr.write\n");

    process.exit(1);
}
