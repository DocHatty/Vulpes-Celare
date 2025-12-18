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
import { ExecFileOptions } from "child_process";
/**
 * Validates that a resolved path stays within the allowed base directory.
 * Prevents path traversal attacks using ../ sequences.
 *
 * @param basePath - The allowed base directory
 * @param userPath - The user-provided path (may be relative)
 * @returns The validated absolute path
 * @throws Error if path escapes the base directory
 */
export declare function validatePath(basePath: string, userPath: string): string;
/**
 * Validates a file path and checks if the file exists.
 *
 * @param basePath - The allowed base directory
 * @param userPath - The user-provided path
 * @returns The validated absolute path
 * @throws Error if path is invalid or file doesn't exist
 */
export declare function validateFileExists(basePath: string, userPath: string): string;
/**
 * Validates a directory path and checks if it exists.
 *
 * @param basePath - The allowed base directory
 * @param userPath - The user-provided path
 * @returns The validated absolute path
 * @throws Error if path is invalid or directory doesn't exist
 */
export declare function validateDirectoryExists(basePath: string, userPath: string): string;
/**
 * Safely execute a command without shell interpolation.
 * Uses execFile which doesn't spawn a shell, preventing command injection.
 *
 * @param command - The command to execute (must be a direct executable)
 * @param args - Array of arguments (not interpolated into a shell string)
 * @param options - Execution options
 * @returns Promise resolving to stdout
 */
export declare function safeExec(command: string, args: string[], options?: ExecFileOptions): Promise<string>;
/**
 * Synchronous version of safeExec.
 *
 * @param command - The command to execute
 * @param args - Array of arguments
 * @param options - Execution options
 * @returns stdout as string
 */
export declare function safeExecSync(command: string, args: string[], options?: ExecFileOptions): string;
/**
 * Safely search for a pattern in files using grep/findstr.
 * Prevents command injection by using execFile with proper argument separation.
 *
 * @param pattern - The search pattern (will be treated as literal, not shell-expanded)
 * @param searchPath - The directory or file to search
 * @param options - Additional options
 * @returns Search results as string
 */
export declare function safeGrep(pattern: string, searchPath: string, options?: {
    recursive?: boolean;
    maxResults?: number;
    filePattern?: string;
    cwd?: string;
}): Promise<string>;
/**
 * Validate that environment variables are properly configured.
 * Call at startup to catch configuration issues early.
 *
 * @param requiredVars - Map of variable names to validation functions
 * @returns Object with validation results
 */
export declare function validateEnvironment(requiredVars: Record<string, (value: string | undefined) => boolean>): {
    valid: boolean;
    errors: string[];
};
/**
 * Validate Vulpes-specific environment variables.
 * Checks paths exist and values are valid.
 */
export declare function validateVulpesEnvironment(): {
    valid: boolean;
    warnings: string[];
};
/**
 * Sanitize a string for safe logging (removes potential secrets).
 *
 * @param text - Text that may contain secrets
 * @returns Sanitized text safe for logging
 */
export declare function sanitizeForLogging(text: string): string;
//# sourceMappingURL=SecurityUtils.d.ts.map