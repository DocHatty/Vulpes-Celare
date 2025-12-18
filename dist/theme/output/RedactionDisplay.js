"use strict";
/**
 * ============================================================================
 * VULPES CELARE - REDACTION DISPLAY COMPONENT
 * ============================================================================
 *
 * Elegant display of redaction results with diff-style highlighting,
 * PHI breakdown, and statistics.
 *
 * Usage:
 *   import { RedactionDisplay } from '../theme/output';
 *
 *   RedactionDisplay.show(original, result);
 *   RedactionDisplay.compact(result);
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedactionDisplay = void 0;
const chalk_theme_1 = require("../chalk-theme");
const icons_1 = require("../icons");
const spacing_1 = require("../spacing");
const typography_1 = require("../typography");
const Box_1 = require("./Box");
const Divider_1 = require("./Divider");
const Progress_1 = require("./Progress");
const VulpesOutput_1 = require("../../utils/VulpesOutput");
// ============================================================================
// PHI TYPE COLORS
// ============================================================================
const PHI_COLORS = {
    NAME: chalk_theme_1.theme.phi.name,
    SSN: chalk_theme_1.theme.phi.ssn,
    PHONE: chalk_theme_1.theme.phi.phone,
    EMAIL: chalk_theme_1.theme.phi.email,
    ADDRESS: chalk_theme_1.theme.phi.address,
    DATE: chalk_theme_1.theme.phi.date,
    MRN: chalk_theme_1.theme.phi.mrn,
    DEFAULT: chalk_theme_1.theme.phi.default,
};
function getPhiColor(type) {
    // Check for exact match first
    if (PHI_COLORS[type.toUpperCase()]) {
        return PHI_COLORS[type.toUpperCase()];
    }
    // Check for partial matches
    for (const [key, color] of Object.entries(PHI_COLORS)) {
        if (type.toUpperCase().includes(key)) {
            return color;
        }
    }
    return PHI_COLORS.DEFAULT;
}
// ============================================================================
// REDACTION DISPLAY CLASS
// ============================================================================
class RedactionDisplay {
    /**
     * Show a full redaction result with original comparison
     */
    static show(original, result, options = {}) {
        const { showOriginal = true, showBreakdown = true, showStats = true, maxWidth = (0, spacing_1.getTerminalWidth)() - 4, highlightMarkers = true, } = options;
        const dividerWidth = Math.min(70, maxWidth);
        // Header
        VulpesOutput_1.out.blank();
        VulpesOutput_1.out.print(Divider_1.Divider.titled("REDACTION RESULT", { width: dividerWidth }));
        VulpesOutput_1.out.blank();
        // Original text (if showing)
        if (showOriginal) {
            VulpesOutput_1.out.print(chalk_theme_1.theme.error.bold("  ORIGINAL:"));
            VulpesOutput_1.out.print(this.formatText(original, maxWidth - 4, chalk_theme_1.theme.muted));
            VulpesOutput_1.out.blank();
        }
        // Redacted text
        VulpesOutput_1.out.print(chalk_theme_1.theme.success.bold("  REDACTED:"));
        const formattedRedacted = highlightMarkers
            ? this.highlightRedactions(result.text)
            : result.text;
        VulpesOutput_1.out.print(this.formatText(formattedRedacted, maxWidth - 4));
        VulpesOutput_1.out.blank();
        // Statistics
        if (showStats) {
            const statsLine = [
                `${chalk_theme_1.theme.muted("PHI Found:")} ${chalk_theme_1.theme.primary.bold(result.redactionCount.toString())}`,
                `${chalk_theme_1.theme.muted("Time:")} ${chalk_theme_1.theme.secondary(result.executionTimeMs + "ms")}`,
            ].join("  │  ");
            VulpesOutput_1.out.print("  " + statsLine);
            VulpesOutput_1.out.blank();
        }
        // Breakdown by type
        if (showBreakdown && Object.keys(result.breakdown).length > 0) {
            VulpesOutput_1.out.print(chalk_theme_1.theme.muted("  BREAKDOWN BY TYPE:"));
            const sortedBreakdown = Object.entries(result.breakdown)
                .sort(([, a], [, b]) => b - a);
            const maxTypeLen = Math.max(...sortedBreakdown.map(([t]) => t.length));
            for (const [type, count] of sortedBreakdown) {
                const colorFn = getPhiColor(type);
                const paddedType = type.padEnd(maxTypeLen);
                const bar = this.miniBar(count, result.redactionCount, 10);
                VulpesOutput_1.out.print(`    ${colorFn(paddedType)}  ${bar}  ${count}`);
            }
            VulpesOutput_1.out.blank();
        }
        VulpesOutput_1.out.print(Divider_1.Divider.line({ width: dividerWidth, style: "light" }));
    }
    /**
     * Compact single-line redaction display
     */
    static compact(result) {
        const phiCount = result.redactionCount;
        const time = result.executionTimeMs;
        if (phiCount === 0) {
            VulpesOutput_1.out.print(chalk_theme_1.theme.success(`${icons_1.status.success} No PHI detected`) + chalk_theme_1.theme.muted(` (${time}ms)`));
        }
        else {
            VulpesOutput_1.out.print(chalk_theme_1.theme.warning(`${icons_1.status.warning} ${phiCount} PHI redacted`) +
                chalk_theme_1.theme.muted(` (${time}ms)`));
        }
    }
    /**
     * Show redaction as a diff
     */
    static diff(original, result) {
        VulpesOutput_1.out.blank();
        VulpesOutput_1.out.print(chalk_theme_1.theme.error(`- ${original}`));
        VulpesOutput_1.out.print(chalk_theme_1.theme.success(`+ ${result.text}`));
        VulpesOutput_1.out.print(chalk_theme_1.theme.muted(`  (${result.redactionCount} PHI, ${result.executionTimeMs}ms)`));
    }
    /**
     * Show inline redaction (original → redacted)
     */
    static inline(original, result) {
        if (result.redactionCount === 0) {
            VulpesOutput_1.out.print(chalk_theme_1.theme.success(original) + chalk_theme_1.theme.muted(" (no PHI)"));
        }
        else {
            VulpesOutput_1.out.print(chalk_theme_1.theme.muted((0, typography_1.truncate)(original, 30)) +
                ` ${icons_1.arrows.right} ` +
                this.highlightRedactions(result.text));
        }
    }
    /**
     * Show redaction statistics as a summary box
     */
    static summary(results) {
        const totalDocs = results.length;
        const totalPhi = results.reduce((sum, r) => sum + r.redactionCount, 0);
        const totalTime = results.reduce((sum, r) => sum + r.executionTimeMs, 0);
        const avgTime = totalDocs > 0 ? (totalTime / totalDocs).toFixed(1) : "0";
        // Aggregate breakdown
        const aggregateBreakdown = {};
        for (const r of results) {
            for (const [type, count] of Object.entries(r.breakdown)) {
                aggregateBreakdown[type] = (aggregateBreakdown[type] || 0) + count;
            }
        }
        const content = [
            `${chalk_theme_1.theme.muted("Documents:")}  ${totalDocs}`,
            `${chalk_theme_1.theme.muted("Total PHI:")}  ${chalk_theme_1.theme.primary.bold(totalPhi.toString())}`,
            `${chalk_theme_1.theme.muted("Total Time:")} ${totalTime}ms`,
            `${chalk_theme_1.theme.muted("Avg Time:")}   ${avgTime}ms/doc`,
        ];
        if (Object.keys(aggregateBreakdown).length > 0) {
            content.push("");
            content.push(chalk_theme_1.theme.muted("Top PHI Types:"));
            const sorted = Object.entries(aggregateBreakdown)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5);
            for (const [type, count] of sorted) {
                const colorFn = getPhiColor(type);
                content.push(`  ${colorFn(icons_1.bullets.dot)} ${type}: ${count}`);
            }
        }
        VulpesOutput_1.out.print(Box_1.Box.vulpes(content, { title: "Redaction Summary" }));
    }
    /**
     * Show a health indicator based on redaction results
     */
    static health(result, expected) {
        const { minPhi = 0, maxPhi = Infinity } = expected || {};
        const count = result.redactionCount;
        let healthStatus;
        let message;
        if (count >= minPhi && count <= maxPhi) {
            healthStatus = "success";
            message = "Redaction within expected range";
        }
        else if (count < minPhi) {
            healthStatus = "warning";
            message = `Expected at least ${minPhi} PHI, found ${count}`;
        }
        else {
            healthStatus = "warning";
            message = `Found ${count} PHI (expected max ${maxPhi})`;
        }
        VulpesOutput_1.out.print(Progress_1.Progress.health(count / Math.max(maxPhi, 1) * 100));
        VulpesOutput_1.out.print(chalk_theme_1.theme[healthStatus](message));
    }
    // ============================================================================
    // PRIVATE HELPERS
    // ============================================================================
    static formatText(text, maxWidth, colorFn) {
        const lines = text.split("\n");
        const formatted = lines.map(line => {
            const visible = (0, typography_1.stripAnsi)(line);
            if (visible.length > maxWidth) {
                return "  " + (0, typography_1.truncate)(line, maxWidth);
            }
            return "  " + line;
        });
        const result = formatted.join("\n");
        return colorFn ? colorFn(result) : result;
    }
    static highlightRedactions(text) {
        // Highlight [TYPE] style markers
        let result = text.replace(/\[([A-Z_-]+)\]/g, (match) => chalk_theme_1.theme.warning(match));
        // Highlight {{TYPE}} style markers
        result = result.replace(/\{\{([^}]+)\}\}/g, (match) => chalk_theme_1.theme.warning(match));
        // Highlight ***REDACTED*** style markers
        result = result.replace(/\*{3}[^*]+\*{3}/g, (match) => chalk_theme_1.theme.warning(match));
        return result;
    }
    static miniBar(value, total, width) {
        if (total === 0)
            return chalk_theme_1.theme.muted("░".repeat(width));
        const filled = Math.round((value / total) * width);
        const empty = width - filled;
        return chalk_theme_1.theme.primary("█".repeat(filled)) + chalk_theme_1.theme.muted("░".repeat(empty));
    }
}
exports.RedactionDisplay = RedactionDisplay;
exports.default = RedactionDisplay;
//# sourceMappingURL=RedactionDisplay.js.map