"use strict";
/**
 * ============================================================================
 * VULPES CELARE - PROGRESS OUTPUT COMPONENT
 * ============================================================================
 *
 * Elegant progress bars and indicators for CLI output.
 * Supports various styles and semantic coloring.
 *
 * Usage:
 *   import { Progress } from '../theme/output';
 *
 *   console.log(Progress.bar(0.75));
 *   console.log(Progress.stages(['Scan', 'Process', 'Output'], 1));
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Progress = void 0;
const chalk_theme_1 = require("../chalk-theme");
const icons_1 = require("../icons");
// ============================================================================
// PROGRESS CLASS
// ============================================================================
class Progress {
    /**
     * Create a progress bar
     * @param percent - Progress from 0 to 1 (or 0 to 100)
     */
    static bar(percent, options = {}) {
        const { style = "bar", width = 30, showPercent = true, showValue = false, total, fillColor = chalk_theme_1.theme.primary, emptyColor = chalk_theme_1.theme.muted, label, } = options;
        // Normalize percent to 0-1 range
        const normalizedPercent = percent > 1 ? percent / 100 : percent;
        const clampedPercent = Math.max(0, Math.min(1, normalizedPercent));
        // Calculate filled width
        const filledWidth = Math.round(clampedPercent * width);
        const emptyWidth = width - filledWidth;
        // Get characters based on style
        let filledChar;
        let emptyChar;
        switch (style) {
            case "blocks":
                filledChar = icons_1.progress.filled;
                emptyChar = " ";
                break;
            case "dots":
                filledChar = icons_1.bullets.dot;
                emptyChar = icons_1.bullets.circle;
                break;
            case "minimal":
                filledChar = "=";
                emptyChar = "-";
                break;
            default:
                filledChar = icons_1.progress.filled;
                emptyChar = icons_1.progress.empty;
        }
        // Build the bar
        const filled = fillColor(filledChar.repeat(filledWidth));
        const empty = emptyColor(emptyChar.repeat(emptyWidth));
        const bar = `${filled}${empty}`;
        // Build the full string
        const parts = [];
        if (label) {
            parts.push(chalk_theme_1.theme.muted(label));
        }
        parts.push(bar);
        if (showPercent) {
            parts.push(chalk_theme_1.theme.muted(`${Math.round(clampedPercent * 100)}%`));
        }
        if (showValue && total !== undefined) {
            const current = Math.round(clampedPercent * total);
            parts.push(chalk_theme_1.theme.muted(`(${current}/${total})`));
        }
        return parts.join(" ");
    }
    /**
     * Create a minimal inline progress indicator
     */
    static inline(percent, width = 10) {
        const normalizedPercent = percent > 1 ? percent / 100 : percent;
        const clampedPercent = Math.max(0, Math.min(1, normalizedPercent));
        const filled = Math.round(clampedPercent * width);
        return chalk_theme_1.theme.muted("[") +
            chalk_theme_1.theme.primary(icons_1.progress.filled.repeat(filled)) +
            chalk_theme_1.theme.muted(icons_1.progress.empty.repeat(width - filled)) +
            chalk_theme_1.theme.muted("]");
    }
    /**
     * Create a stages/steps indicator
     */
    static stages(stages, currentIndex, options = {}) {
        const { completedColor = chalk_theme_1.theme.success, currentColor = chalk_theme_1.theme.primary.bold, pendingColor = chalk_theme_1.theme.muted, connector = ` ${icons_1.arrows.right} `, showNumbers = true, } = options;
        return stages.map((stage, i) => {
            let icon;
            let colorFn;
            let label = stage;
            if (showNumbers) {
                label = `${i + 1}. ${stage}`;
            }
            if (i < currentIndex) {
                icon = icons_1.status.success;
                colorFn = completedColor;
            }
            else if (i === currentIndex) {
                icon = icons_1.status.progress;
                colorFn = currentColor;
            }
            else {
                icon = icons_1.status.pending;
                colorFn = pendingColor;
            }
            return colorFn(`${icon} ${label}`);
        }).join(connector);
    }
    /**
     * Create a vertical stages list
     */
    static stagesList(stages, currentIndex, options = {}) {
        const { completedColor = chalk_theme_1.theme.success, currentColor = chalk_theme_1.theme.primary.bold, pendingColor = chalk_theme_1.theme.muted, showNumbers = true, } = options;
        return stages.map((stage, i) => {
            let icon;
            let colorFn;
            let prefix = showNumbers ? `${i + 1}. ` : "";
            if (i < currentIndex) {
                icon = icons_1.status.success;
                colorFn = completedColor;
            }
            else if (i === currentIndex) {
                icon = icons_1.arrows.play;
                colorFn = currentColor;
            }
            else {
                icon = icons_1.status.pending;
                colorFn = pendingColor;
            }
            return `  ${colorFn(icon)} ${colorFn(prefix + stage)}`;
        }).join("\n");
    }
    /**
     * Create a percentage display
     */
    static percent(value, options = {}) {
        const normalizedValue = value > 1 ? value : value * 100;
        const colorFn = options.color ?? (normalizedValue >= 90 ? chalk_theme_1.theme.success :
            normalizedValue >= 70 ? chalk_theme_1.theme.warning :
                chalk_theme_1.theme.error);
        return colorFn(`${normalizedValue.toFixed(1)}%`);
    }
    /**
     * Create a ratio display (e.g., 42/100)
     */
    static ratio(current, total, options = {}) {
        const colorFn = options.color ?? chalk_theme_1.theme.muted;
        return colorFn(`${current}/${total}`);
    }
    /**
     * Create a completion indicator with checkmark or X
     */
    static complete(isComplete, label) {
        const icon = isComplete ? icons_1.status.success : icons_1.status.pending;
        const colorFn = isComplete ? chalk_theme_1.theme.success : chalk_theme_1.theme.muted;
        const text = label ? `${icon} ${label}` : icon;
        return colorFn(text);
    }
    /**
     * Create a multi-metric progress display
     */
    static metrics(metrics, options = {}) {
        const { width = 20 } = options;
        const maxLabelLen = Math.max(...metrics.map(m => m.label.length));
        return metrics.map(({ label, value, target }) => {
            const paddedLabel = label.padEnd(maxLabelLen);
            const bar = this.bar(value / 100, {
                width,
                showPercent: true,
                fillColor: target !== undefined
                    ? (value >= target ? chalk_theme_1.theme.success : chalk_theme_1.theme.warning)
                    : chalk_theme_1.theme.primary,
            });
            return `${chalk_theme_1.theme.muted(paddedLabel)}  ${bar}`;
        }).join("\n");
    }
    /**
     * Create a health indicator (good/warning/critical)
     */
    static health(value, thresholds = { good: 90, warning: 70 }) {
        const normalizedValue = value > 1 ? value : value * 100;
        if (normalizedValue >= thresholds.good) {
            return chalk_theme_1.theme.success(`${icons_1.status.success} ${normalizedValue.toFixed(1)}%`);
        }
        else if (normalizedValue >= thresholds.warning) {
            return chalk_theme_1.theme.warning(`${icons_1.status.warning} ${normalizedValue.toFixed(1)}%`);
        }
        else {
            return chalk_theme_1.theme.error(`${icons_1.status.error} ${normalizedValue.toFixed(1)}%`);
        }
    }
}
exports.Progress = Progress;
exports.default = Progress;
//# sourceMappingURL=Progress.js.map