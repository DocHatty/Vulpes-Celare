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
export type SpinnerStyle = "dots" | "line" | "circle" | "bounce";
export interface SpinnerOptions {
    /** Spinner animation style */
    style?: SpinnerStyle;
    /** Spinner color function */
    color?: (text: string) => string;
    /** Text color function */
    textColor?: (text: string) => string;
    /** Update interval in ms */
    interval?: number;
    /** Stream to write to */
    stream?: NodeJS.WriteStream;
    /** Hide cursor while spinning */
    hideCursor?: boolean;
}
export declare class Spinner {
    private text;
    private frames;
    private frameIndex;
    private intervalId;
    private color;
    private textColor;
    private interval;
    private stream;
    private hideCursor;
    private isSpinning;
    constructor(text?: string, options?: SpinnerOptions);
    /**
     * Start the spinner animation
     */
    start(text?: string): this;
    /**
     * Stop the spinner
     */
    stop(): this;
    /**
     * Update the spinner text
     */
    update(text: string): this;
    /**
     * Stop with success message
     */
    success(text?: string): this;
    /**
     * Stop with error message
     */
    fail(text?: string): this;
    /**
     * Stop with warning message
     */
    warn(text?: string): this;
    /**
     * Stop with info message
     */
    info(text?: string): this;
    /**
     * Render current frame
     */
    private render;
    /**
     * Clear the current line
     */
    private clear;
}
/**
 * Create and start a spinner in one call
 */
export declare function spin(text: string, options?: SpinnerOptions): Spinner;
/**
 * Run an async task with a spinner
 */
export declare function withSpinner<T>(text: string, task: () => Promise<T>, options?: SpinnerOptions & {
    successText?: string | ((result: T) => string);
    failText?: string | ((error: Error) => string);
}): Promise<T>;
/**
 * Static frame for non-animated spinner display
 */
export declare function spinnerFrame(style?: SpinnerStyle, frameIndex?: number): string;
export default Spinner;
//# sourceMappingURL=Spinner.d.ts.map