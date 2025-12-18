"use strict";
/**
 * ============================================================================
 * VULPES CELARE - STATUS OUTPUT COMPONENT
 * ============================================================================
 *
 * Status message formatting with icons and semantic coloring.
 * Provides consistent status display across the CLI.
 *
 * Usage:
 *   import { Status } from '../theme/output';
 *
 *   console.log(Status.success('Operation complete'));
 *   console.log(Status.error('Failed to process'));
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Status = void 0;
const chalk_theme_1 = require("../chalk-theme");
const icons_1 = require("../icons");
// ============================================================================
// STATUS CLASS
// ============================================================================
class Status {
    /**
     * Create a success status message
     */
    static success(message, options = {}) {
        return this.format("success", message, options);
    }
    /**
     * Create an error status message
     */
    static error(message, options = {}) {
        return this.format("error", message, options);
    }
    /**
     * Create a warning status message
     */
    static warning(message, options = {}) {
        return this.format("warning", message, options);
    }
    /**
     * Create an info status message
     */
    static info(message, options = {}) {
        return this.format("info", message, options);
    }
    /**
     * Create a debug status message
     */
    static debug(message, options = {}) {
        return this.format("debug", message, options);
    }
    /**
     * Create a pending status message
     */
    static pending(message, options = {}) {
        return this.format("pending", message, options);
    }
    /**
     * Generic status formatter
     */
    static format(type, message, options = {}) {
        const { icon = true, customIcon, bold = false, prefix, suffix, indent = 0, } = options;
        const parts = [];
        // Add indentation
        if (indent > 0) {
            parts.push("  ".repeat(indent));
        }
        // Add prefix
        if (prefix) {
            parts.push(chalk_theme_1.theme.muted(prefix));
        }
        // Get icon and color
        const iconChar = customIcon ?? this.getIcon(type);
        const colorFn = this.getColor(type);
        // Add icon
        if (icon) {
            parts.push(colorFn(iconChar));
        }
        // Add message
        const styledMessage = bold ? colorFn.bold?.(message) ?? colorFn(message) : message;
        parts.push(styledMessage);
        // Add suffix
        if (suffix) {
            parts.push(chalk_theme_1.theme.muted(suffix));
        }
        return parts.join(" ");
    }
    /**
     * Get icon for status type
     */
    static getIcon(type) {
        switch (type) {
            case "success": return icons_1.status.success;
            case "error": return icons_1.status.error;
            case "warning": return icons_1.status.warning;
            case "info": return icons_1.status.info;
            case "debug": return icons_1.bullets.diamond;
            case "pending": return icons_1.status.pending;
            default: return icons_1.bullets.dot;
        }
    }
    /**
     * Get color function for status type
     */
    static getColor(type) {
        switch (type) {
            case "success": return chalk_theme_1.theme.success;
            case "error": return chalk_theme_1.theme.error;
            case "warning": return chalk_theme_1.theme.warning;
            case "info": return chalk_theme_1.theme.info;
            case "debug": return chalk_theme_1.theme.debug;
            case "pending": return chalk_theme_1.theme.muted;
            default: return chalk_theme_1.theme.muted;
        }
    }
    // ============================================================================
    // SPECIALIZED STATUS MESSAGES
    // ============================================================================
    /**
     * Create a "done" message
     */
    static done(message) {
        return this.success(message ?? "Done");
    }
    /**
     * Create a "failed" message
     */
    static failed(message) {
        return this.error(message ?? "Failed");
    }
    /**
     * Create a "skipped" message
     */
    static skipped(message) {
        return `${chalk_theme_1.theme.muted(icons_1.status.skipped)} ${chalk_theme_1.theme.muted(message)}`;
    }
    /**
     * Create a "processing" message
     */
    static processing(message) {
        return `${chalk_theme_1.theme.primary(icons_1.status.progress)} ${message}`;
    }
    /**
     * Create a "waiting" message
     */
    static waiting(message) {
        return `${chalk_theme_1.theme.muted(icons_1.status.pending)} ${chalk_theme_1.theme.muted(message)}`;
    }
    // ============================================================================
    // LIST ITEMS
    // ============================================================================
    /**
     * Create a bullet point item
     */
    static bullet(message, options = {}) {
        const { indent = 0, color = chalk_theme_1.theme.muted } = options;
        const indentStr = "  ".repeat(indent);
        return `${indentStr}${color(icons_1.bullets.dot)} ${message}`;
    }
    /**
     * Create an arrow item (for sub-items)
     */
    static arrow(message, options = {}) {
        const { indent = 1 } = options;
        const indentStr = "  ".repeat(indent);
        return `${indentStr}${chalk_theme_1.theme.muted(icons_1.arrows.right)} ${message}`;
    }
    /**
     * Create a numbered item
     */
    static numbered(index, message, options = {}) {
        const { indent = 0, color = chalk_theme_1.theme.muted } = options;
        const indentStr = "  ".repeat(indent);
        return `${indentStr}${color(`${index}.`)} ${message}`;
    }
    // ============================================================================
    // CONTEXTUAL STATUS
    // ============================================================================
    /**
     * Create a PHI-related status (uses shield icon)
     */
    static phi(message, type = "info") {
        return this.format(type, message, { customIcon: icons_1.semantic.phi });
    }
    /**
     * Create a security-related status
     */
    static security(message, type = "success") {
        return this.format(type, message, { customIcon: icons_1.semantic.shield });
    }
    /**
     * Create a redaction status
     */
    static redaction(original, replacement) {
        return `${chalk_theme_1.theme.muted(original)} ${chalk_theme_1.theme.muted(icons_1.arrows.right)} ${chalk_theme_1.theme.success(replacement)}`;
    }
    /**
     * Create a diff-style status (showing change)
     */
    static diff(before, after) {
        return [
            `${chalk_theme_1.theme.error("-")} ${chalk_theme_1.theme.error(before)}`,
            `${chalk_theme_1.theme.success("+")} ${chalk_theme_1.theme.success(after)}`,
        ].join("\n");
    }
    // ============================================================================
    // GROUPED STATUS
    // ============================================================================
    /**
     * Create a status list from multiple items
     */
    static list(items) {
        return items.map(item => this.format(item.type, item.message)).join("\n");
    }
    /**
     * Create a summary of status counts
     */
    static summary(counts) {
        const parts = [];
        if (counts.success !== undefined && counts.success > 0) {
            parts.push(chalk_theme_1.theme.success(`${icons_1.status.success} ${counts.success} passed`));
        }
        if (counts.error !== undefined && counts.error > 0) {
            parts.push(chalk_theme_1.theme.error(`${icons_1.status.error} ${counts.error} failed`));
        }
        if (counts.warning !== undefined && counts.warning > 0) {
            parts.push(chalk_theme_1.theme.warning(`${icons_1.status.warning} ${counts.warning} warnings`));
        }
        if (counts.skipped !== undefined && counts.skipped > 0) {
            parts.push(chalk_theme_1.theme.muted(`${icons_1.status.skipped} ${counts.skipped} skipped`));
        }
        return parts.join("  ");
    }
}
exports.Status = Status;
exports.default = Status;
//# sourceMappingURL=Status.js.map