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

import * as path from "path";
import * as fs from "fs";
import { execFile, execFileSync, ExecFileOptions } from "child_process";

/**
 * Validates that a resolved path stays within the allowed base directory.
 * Prevents path traversal attacks using ../ sequences.
 *
 * @param basePath - The allowed base directory
 * @param userPath - The user-provided path (may be relative)
 * @returns The validated absolute path
 * @throws Error if path escapes the base directory
 */
export function validatePath(basePath: string, userPath: string): string {
  // Resolve both paths to absolute
  const resolvedBase = path.resolve(basePath);
  const resolvedFull = path.resolve(basePath, userPath);

  // Normalize to handle different separators on Windows
  const normalizedBase = resolvedBase.toLowerCase().replace(/\\/g, "/");
  const normalizedFull = resolvedFull.toLowerCase().replace(/\\/g, "/");

  // Check if the resolved path starts with the base path
  if (
    !normalizedFull.startsWith(normalizedBase + "/") &&
    normalizedFull !== normalizedBase
  ) {
    throw new Error(
      `Path traversal detected: "${userPath}" escapes base directory`,
    );
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
export function validateFileExists(basePath: string, userPath: string): string {
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
export function validateDirectoryExists(
  basePath: string,
  userPath: string,
): string {
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
export function safeExec(
  command: string,
  args: string[],
  options: ExecFileOptions = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      { ...options, maxBuffer: 10 * 1024 * 1024, encoding: "utf-8" },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${error.message}\n${stderr}`));
        } else {
          resolve(stdout as string);
        }
      },
    );
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
export function safeExecSync(
  command: string,
  args: string[],
  options: ExecFileOptions = {},
): string {
  return execFileSync(command, args, {
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
export async function safeGrep(
  pattern: string,
  searchPath: string,
  options: {
    recursive?: boolean;
    maxResults?: number;
    filePattern?: string;
    cwd?: string;
  } = {},
): Promise<string> {
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
      if (recursive) args.push("/S");
      args.push("/C:" + pattern); // /C: treats pattern as literal string

      if (filePattern) {
        args.push(path.join(searchPath, filePattern));
      } else {
        args.push(path.join(searchPath, "*"));
      }

      const result = await safeExec("findstr", args, {
        cwd,
        timeout: 30000,
      });
      return result.split("\n").slice(0, maxResults).join("\n");
    } else {
      // Use grep on Unix
      const args = ["-n", "--color=never"];
      if (recursive) args.push("-r");
      if (filePattern) args.push(`--include=${filePattern}`);
      args.push("--", pattern); // -- prevents pattern from being interpreted as option
      args.push(searchPath);

      const result = await safeExec("grep", args, {
        cwd,
        timeout: 30000,
      });
      return result.split("\n").slice(0, maxResults).join("\n");
    }
  } catch (error: unknown) {
    // grep returns exit code 1 when no matches found - that's not an error
    if (error instanceof Error && error.message?.includes("exit code 1")) {
      return "No matches found";
    }
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: number }).code === 1) {
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
export function validateEnvironment(
  requiredVars: Record<string, (value: string | undefined) => boolean>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

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
export function validateVulpesEnvironment(): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

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
 * Sanitize a string for safe logging (removes secrets and PHI).
 *
 * HIPAA Safe Harbor Compliance:
 * This function redacts common PHI patterns to prevent Protected Health
 * Information from appearing in diagnostic logs. This is a defense-in-depth
 * measure - ideally, PHI should never reach logging code paths.
 *
 * Patterns covered:
 * - API keys, tokens, passwords (security)
 * - SSN (Social Security Numbers)
 * - Phone numbers (US formats)
 * - Email addresses
 * - MRN (Medical Record Numbers)
 * - Dates (common formats that could be DOB)
 *
 * @param text - Text that may contain secrets or PHI
 * @returns Sanitized text safe for logging
 */
export function sanitizeForLogging(text: string): string {
  if (!text || typeof text !== "string") {
    return text;
  }

  return (
    text
      // ══════════════════════════════════════════════════════════════════════
      // SECURITY: API Keys, Tokens, Passwords
      // ══════════════════════════════════════════════════════════════════════
      .replace(/sk-[a-zA-Z0-9]{20,}/g, "[API_KEY]")
      .replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, "Bearer [TOKEN]")
      .replace(
        /(?:api[_-]?key|apikey|secret|password|token|auth)[=:]\s*["']?[^\s"']{8,}["']?/gi,
        (match) => match.split(/[=:]/)[0] + "=[REDACTED]"
      )

      // ══════════════════════════════════════════════════════════════════════
      // HIPAA PHI: Social Security Numbers
      // ══════════════════════════════════════════════════════════════════════
      // Format: XXX-XX-XXXX or XXXXXXXXX
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN]")
      .replace(/\b\d{9}\b(?!\d)/g, "[SSN]") // 9 consecutive digits not followed by more

      // ══════════════════════════════════════════════════════════════════════
      // HIPAA PHI: Phone Numbers (US formats)
      // ══════════════════════════════════════════════════════════════════════
      // Formats: (XXX) XXX-XXXX, XXX-XXX-XXXX, XXX.XXX.XXXX, +1XXXXXXXXXX
      .replace(/\(\d{3}\)\s*\d{3}[-.\s]?\d{4}\b/g, "[PHONE]")
      .replace(/\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g, "[PHONE]")
      .replace(/\+1\d{10}\b/g, "[PHONE]")

      // ══════════════════════════════════════════════════════════════════════
      // HIPAA PHI: Email Addresses
      // ══════════════════════════════════════════════════════════════════════
      .replace(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        "[EMAIL]"
      )

      // ══════════════════════════════════════════════════════════════════════
      // HIPAA PHI: Medical Record Numbers
      // ══════════════════════════════════════════════════════════════════════
      // Common formats: MRN: 12345, MRN#12345, MRN-ABC123
      .replace(/\bMRN[:\s#-]*[A-Z0-9-]{4,}\b/gi, "[MRN]")
      .replace(/\bPatient\s*(?:ID|#|No\.?)[:\s]*[A-Z0-9-]{4,}\b/gi, "[PATIENT_ID]")

      // ══════════════════════════════════════════════════════════════════════
      // HIPAA PHI: Dates (potential DOB)
      // ══════════════════════════════════════════════════════════════════════
      // Note: Only redact date-like patterns near keywords to avoid over-redaction
      // Formats: MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD
      .replace(
        /\b(?:DOB|birth|born|birthday)[:\s]*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi,
        (match) => match.split(/[:\s]/)[0] + ": [DATE]"
      )
      .replace(
        /\b(?:DOB|birth|born|birthday)[:\s]*\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/gi,
        (match) => match.split(/[:\s]/)[0] + ": [DATE]"
      )

      // ══════════════════════════════════════════════════════════════════════
      // HIPAA PHI: Fax Numbers (often in headers)
      // ══════════════════════════════════════════════════════════════════════
      .replace(/\bFax[:\s]*\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/gi, "Fax: [FAX]")
  );
}

/**
 * Check if a string potentially contains PHI.
 * Useful for conditional logging decisions.
 *
 * @param text - Text to check
 * @returns true if PHI patterns are detected
 */
export function mayContainPHI(text: string): boolean {
  if (!text || typeof text !== "string") {
    return false;
  }

  const phiPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/, // Phone
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i, // Email
    /\bMRN[:\s#-]*[A-Z0-9-]{4,}\b/i, // MRN
  ];

  return phiPatterns.some((pattern) => pattern.test(text));
}
