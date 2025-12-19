"use strict";
/**
 * ============================================================================
 * SECURITY UTILITIES - Safe Command Execution & Path Validation
 * ============================================================================
 *
 * Provides secure alternatives to dangerous patterns:
 * - Command injection prevention via execFile (no shell)
 * - Path traversal prevention via path validation
 * - Input sanitization utilities
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePath = validatePath;
exports.validateFileExists = validateFileExists;
exports.validateDirectoryExists = validateDirectoryExists;
exports.safeExec = safeExec;
exports.safeExecSync = safeExecSync;
exports.safeGrep = safeGrep;
exports.validateEnvironment = validateEnvironment;
exports.validateVulpesEnvironment = validateVulpesEnvironment;
exports.sanitizeForLogging = sanitizeForLogging;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
/**
 * Validates that a resolved path stays within the allowed base directory.
 * Prevents path traversal attacks using ../ sequences.
 *
 * @param basePath - The allowed base directory
 * @param userPath - The user-provided path (may be relative)
 * @returns The validated absolute path
 * @throws Error if path escapes the base directory
 */
function validatePath(basePath, userPath) {
    // Resolve both paths to absolute
    const resolvedBase = path.resolve(basePath);
    const resolvedFull = path.resolve(basePath, userPath);
    // Normalize to handle different separators on Windows
    const normalizedBase = resolvedBase.toLowerCase().replace(/\\/g, "/");
    const normalizedFull = resolvedFull.toLowerCase().replace(/\\/g, "/");
    // Check if the resolved path starts with the base path
    if (!normalizedFull.startsWith(normalizedBase + "/") &&
        normalizedFull !== normalizedBase) {
        throw new Error(`Path traversal detected: "${userPath}" escapes base directory`);
    }
    return resolvedFull;
}
/**
 * Validates a file path and checks if the file exists.
 *
 * @param basePath - The allowed base directory
 * @param userPath - The user-provided path
 * @returns The validated absolute path
 * @throws Error if path is invalid or file doesn't exist
 */
function validateFileExists(basePath, userPath) {
    const validPath = validatePath(basePath, userPath);
    if (!fs.existsSync(validPath)) {
        throw new Error(`File not found: ${userPath}`);
    }
    return validPath;
}
/**
 * Validates a directory path and checks if it exists.
 *
 * @param basePath - The allowed base directory
 * @param userPath - The user-provided path
 * @returns The validated absolute path
 * @throws Error if path is invalid or directory doesn't exist
 */
function validateDirectoryExists(basePath, userPath) {
    const validPath = validatePath(basePath, userPath);
    if (!fs.existsSync(validPath) || !fs.statSync(validPath).isDirectory()) {
        throw new Error(`Directory not found: ${userPath}`);
    }
    return validPath;
}
/**
 * Safely execute a command without shell interpolation.
 * Uses execFile which doesn't spawn a shell, preventing command injection.
 *
 * @param command - The command to execute (must be a direct executable)
 * @param args - Array of arguments (not interpolated into a shell string)
 * @param options - Execution options
 * @returns Promise resolving to stdout
 */
function safeExec(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        (0, child_process_1.execFile)(command, args, { ...options, maxBuffer: 10 * 1024 * 1024, encoding: "utf-8" }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Command failed: ${error.message}\n${stderr}`));
            }
            else {
                resolve(stdout);
            }
        });
    });
}
/**
 * Synchronous version of safeExec.
 *
 * @param command - The command to execute
 * @param args - Array of arguments
 * @param options - Execution options
 * @returns stdout as string
 */
function safeExecSync(command, args, options = {}) {
    return (0, child_process_1.execFileSync)(command, args, {
        ...options,
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
    });
}
/**
 * Safely search for a pattern in files using grep/findstr.
 * Prevents command injection by using execFile with proper argument separation.
 *
 * @param pattern - The search pattern (will be treated as literal, not shell-expanded)
 * @param searchPath - The directory or file to search
 * @param options - Additional options
 * @returns Search results as string
 */
async function safeGrep(pattern, searchPath, options = {}) {
    const { recursive = true, maxResults = 50, filePattern, cwd } = options;
    // Validate the search path if cwd is provided
    if (cwd) {
        validatePath(cwd, searchPath);
    }
    const isWindows = process.platform === "win32";
    try {
        if (isWindows) {
            // Use findstr on Windows
            const args = ["/N"]; // Show line numbers
            if (recursive)
                args.push("/S");
            args.push("/C:" + pattern); // /C: treats pattern as literal string
            if (filePattern) {
                args.push(path.join(searchPath, filePattern));
            }
            else {
                args.push(path.join(searchPath, "*"));
            }
            const result = await safeExec("findstr", args, {
                cwd,
                timeout: 30000,
            });
            return result.split("\n").slice(0, maxResults).join("\n");
        }
        else {
            // Use grep on Unix
            const args = ["-n", "--color=never"];
            if (recursive)
                args.push("-r");
            if (filePattern)
                args.push(`--include=${filePattern}`);
            args.push("--", pattern); // -- prevents pattern from being interpreted as option
            args.push(searchPath);
            const result = await safeExec("grep", args, {
                cwd,
                timeout: 30000,
            });
            return result.split("\n").slice(0, maxResults).join("\n");
        }
    }
    catch (error) {
        // grep returns exit code 1 when no matches found - that's not an error
        if (error instanceof Error && error.message?.includes("exit code 1")) {
            return "No matches found";
        }
        if (typeof error === "object" && error !== null && "code" in error && error.code === 1) {
            return "No matches found";
        }
        throw error;
    }
}
/**
 * Validate that environment variables are properly configured.
 * Call at startup to catch configuration issues early.
 *
 * @param requiredVars - Map of variable names to validation functions
 * @returns Object with validation results
 */
function validateEnvironment(requiredVars) {
    const errors = [];
    for (const [name, validator] of Object.entries(requiredVars)) {
        const value = process.env[name];
        if (!validator(value)) {
            errors.push(`Invalid or missing environment variable: ${name}`);
        }
    }
    return { valid: errors.length === 0, errors };
}
/**
 * Validate Vulpes-specific environment variables.
 * Checks paths exist and values are valid.
 */
function validateVulpesEnvironment() {
    const warnings = [];
    // Check VULPES_ORT_PATH if set
    const ortPath = process.env.VULPES_ORT_PATH;
    if (ortPath && !fs.existsSync(ortPath)) {
        warnings.push(`VULPES_ORT_PATH does not exist: ${ortPath}`);
    }
    // Validate accelerator flags
    const accelVars = [
        "VULPES_TEXT_ACCEL",
        "VULPES_NAME_ACCEL",
        "VULPES_APPLY_ACCEL",
        "VULPES_POSTFILTER_ACCEL",
        "VULPES_PHONETIC_ACCEL",
    ];
    for (const varName of accelVars) {
        const value = process.env[varName];
        if (value !== undefined && value !== "0" && value !== "1") {
            warnings.push(`${varName} should be "0" or "1", got: "${value}"`);
        }
    }
    return { valid: warnings.length === 0, warnings };
}
/**
 * Sanitize a string for safe logging (removes potential secrets).
 *
 * @param text - Text that may contain secrets
 * @returns Sanitized text safe for logging
 */
function sanitizeForLogging(text) {
    // Redact common secret patterns
    return text
        .replace(/sk-[a-zA-Z0-9]{20,}/g, "sk-***REDACTED***")
        .replace(/(?:api[_-]?key|apikey|secret|password|token)[=:]\s*["']?[^"'\s]+["']?/gi, "$1=***REDACTED***")
        .replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, "Bearer ***REDACTED***");
}
//# sourceMappingURL=SecurityUtils.js.map