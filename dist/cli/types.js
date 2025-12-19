"use strict";
/**
 * ============================================================================
 * VULPES CELARE - CLI TYPE DEFINITIONS
 * ============================================================================
 *
 * Strongly typed interfaces for CLI commands, tool inputs/outputs, and options.
 * Eliminates critical `any` usage and provides type safety across CLI modules.
 *
 * @module cli/types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidAgentBackend = isValidAgentBackend;
exports.isRedactTextInput = isRedactTextInput;
exports.isReadFileInput = isReadFileInput;
exports.isWriteFileInput = isWriteFileInput;
exports.isRunCommandInput = isRunCommandInput;
exports.isListFilesInput = isListFilesInput;
exports.isSearchCodeInput = isSearchCodeInput;
exports.isRunTestsInput = isRunTestsInput;
/**
 * Type guard to validate backend value
 */
function isValidAgentBackend(value) {
    return (typeof value === "string" &&
        ["claude", "codex", "copilot", "native"].includes(value));
}
// ============================================================================
// TYPE GUARDS
// ============================================================================
/**
 * Type guard for RedactTextToolInput
 */
function isRedactTextInput(input) {
    return (typeof input === "object" &&
        input !== null &&
        "text" in input &&
        typeof input.text === "string");
}
/**
 * Type guard for ReadFileToolInput
 */
function isReadFileInput(input) {
    return (typeof input === "object" &&
        input !== null &&
        "path" in input &&
        typeof input.path === "string");
}
/**
 * Type guard for WriteFileToolInput
 */
function isWriteFileInput(input) {
    return (typeof input === "object" &&
        input !== null &&
        "path" in input &&
        "content" in input &&
        typeof input.path === "string" &&
        typeof input.content === "string");
}
/**
 * Type guard for RunCommandToolInput
 */
function isRunCommandInput(input) {
    return (typeof input === "object" &&
        input !== null &&
        "command" in input &&
        typeof input.command === "string");
}
/**
 * Type guard for ListFilesToolInput
 */
function isListFilesInput(input) {
    return (typeof input === "object" &&
        input !== null &&
        "directory" in input &&
        typeof input.directory === "string");
}
/**
 * Type guard for SearchCodeToolInput
 */
function isSearchCodeInput(input) {
    return (typeof input === "object" &&
        input !== null &&
        "pattern" in input &&
        typeof input.pattern === "string");
}
/**
 * Type guard for RunTestsToolInput
 */
function isRunTestsInput(input) {
    return typeof input === "object" && input !== null;
}
//# sourceMappingURL=types.js.map