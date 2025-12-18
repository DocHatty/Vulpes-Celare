"use strict";
/**
 * ============================================================================
 * VULPES CELARE - SPINNER OUTPUT COMPONENT
 * ============================================================================
 *
 * Animated spinner for CLI loading states.
 * Integrates with theme colors for consistent styling.
 *
 * Usage:
 *   import { Spinner } from '../theme/output';
 *
 *   const spinner = new Spinner('Loading...');
 *   spinner.start();
 *   // ... do work ...
 *   spinner.success('Done!');
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spinner = void 0;
exports.spin = spin;
exports.withSpinner = withSpinner;
exports.spinnerFrame = spinnerFrame;
const chalk_theme_1 = require("../chalk-theme");
const icons_1 = require("../icons");
// ============================================================================
// SPINNER CLASS
// ============================================================================
class Spinner {
    text;
    frames;
    frameIndex = 0;
    intervalId = null;
    color;
    textColor;
    interval;
    stream;
    hideCursor;
    isSpinning = false;
    constructor(text = "", options = {}) {
        const { style = "dots", color = chalk_theme_1.theme.primary, textColor = chalk_theme_1.theme.muted, interval = 80, stream = process.stderr, hideCursor = true, } = options;
        this.text = text;
        this.frames = icons_1.spinnerFrames[style];
        this.color = color;
        this.textColor = textColor;
        this.interval = interval;
        this.stream = stream;
        this.hideCursor = hideCursor;
    }
    /**
     * Start the spinner animation
     */
    start(text) {
        if (this.isSpinning)
            return this;
        if (text !== undefined) {
            this.text = text;
        }
        this.isSpinning = true;
        if (this.hideCursor) {
            this.stream.write("\x1B[?25l"); // Hide cursor
        }
        this.render();
        this.intervalId = setInterval(() => {
            this.frameIndex = (this.frameIndex + 1) % this.frames.length;
            this.render();
        }, this.interval);
        return this;
    }
    /**
     * Stop the spinner
     */
    stop() {
        if (!this.isSpinning)
            return this;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.clear();
        if (this.hideCursor) {
            this.stream.write("\x1B[?25h"); // Show cursor
        }
        this.isSpinning = false;
        return this;
    }
    /**
     * Update the spinner text
     */
    update(text) {
        this.text = text;
        if (this.isSpinning) {
            this.render();
        }
        return this;
    }
    /**
     * Stop with success message
     */
    success(text) {
        this.stop();
        const message = text ?? this.text;
        this.stream.write(`${chalk_theme_1.theme.success(icons_1.status.success)} ${message}\n`);
        return this;
    }
    /**
     * Stop with error message
     */
    fail(text) {
        this.stop();
        const message = text ?? this.text;
        this.stream.write(`${chalk_theme_1.theme.error(icons_1.status.error)} ${message}\n`);
        return this;
    }
    /**
     * Stop with warning message
     */
    warn(text) {
        this.stop();
        const message = text ?? this.text;
        this.stream.write(`${chalk_theme_1.theme.warning(icons_1.status.warning)} ${message}\n`);
        return this;
    }
    /**
     * Stop with info message
     */
    info(text) {
        this.stop();
        const message = text ?? this.text;
        this.stream.write(`${chalk_theme_1.theme.info(icons_1.status.info)} ${message}\n`);
        return this;
    }
    /**
     * Render current frame
     */
    render() {
        this.clear();
        const frame = this.color(this.frames[this.frameIndex]);
        const text = this.textColor(this.text);
        this.stream.write(`${frame} ${text}`);
    }
    /**
     * Clear the current line
     */
    clear() {
        this.stream.write("\r\x1B[K"); // Return to start and clear line
    }
}
exports.Spinner = Spinner;
// ============================================================================
// STATIC HELPERS
// ============================================================================
/**
 * Create and start a spinner in one call
 */
function spin(text, options) {
    return new Spinner(text, options).start();
}
/**
 * Run an async task with a spinner
 */
async function withSpinner(text, task, options) {
    const spinner = new Spinner(text, options).start();
    try {
        const result = await task();
        const successText = options?.successText
            ? (typeof options.successText === "function" ? options.successText(result) : options.successText)
            : text;
        spinner.success(successText);
        return result;
    }
    catch (error) {
        const failText = options?.failText
            ? (typeof options.failText === "function" ? options.failText(error) : options.failText)
            : text;
        spinner.fail(failText);
        throw error;
    }
}
/**
 * Static frame for non-animated spinner display
 */
function spinnerFrame(style = "dots", frameIndex = 0) {
    const frames = icons_1.spinnerFrames[style];
    return frames[frameIndex % frames.length];
}
exports.default = Spinner;
//# sourceMappingURL=Spinner.js.map