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

import { theme } from "../chalk-theme";
import { spinnerFrames, status } from "../icons";

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// SPINNER CLASS
// ============================================================================

export class Spinner {
  private text: string;
  private frames: readonly string[];
  private frameIndex: number = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private color: (text: string) => string;
  private textColor: (text: string) => string;
  private interval: number;
  private stream: NodeJS.WriteStream;
  private hideCursor: boolean;
  private isSpinning: boolean = false;

  constructor(text: string = "", options: SpinnerOptions = {}) {
    const {
      style = "dots",
      color = theme.primary,
      textColor = theme.muted,
      interval = 80,
      stream = process.stderr,
      hideCursor = true,
    } = options;

    this.text = text;
    this.frames = spinnerFrames[style];
    this.color = color;
    this.textColor = textColor;
    this.interval = interval;
    this.stream = stream;
    this.hideCursor = hideCursor;
  }

  /**
   * Start the spinner animation
   */
  start(text?: string): this {
    if (this.isSpinning) return this;

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
  stop(): this {
    if (!this.isSpinning) return this;

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
  update(text: string): this {
    this.text = text;
    if (this.isSpinning) {
      this.render();
    }
    return this;
  }

  /**
   * Stop with success message
   */
  success(text?: string): this {
    this.stop();
    const message = text ?? this.text;
    this.stream.write(`${theme.success(status.success)} ${message}\n`);
    return this;
  }

  /**
   * Stop with error message
   */
  fail(text?: string): this {
    this.stop();
    const message = text ?? this.text;
    this.stream.write(`${theme.error(status.error)} ${message}\n`);
    return this;
  }

  /**
   * Stop with warning message
   */
  warn(text?: string): this {
    this.stop();
    const message = text ?? this.text;
    this.stream.write(`${theme.warning(status.warning)} ${message}\n`);
    return this;
  }

  /**
   * Stop with info message
   */
  info(text?: string): this {
    this.stop();
    const message = text ?? this.text;
    this.stream.write(`${theme.info(status.info)} ${message}\n`);
    return this;
  }

  /**
   * Render current frame
   */
  private render(): void {
    this.clear();
    const frame = this.color(this.frames[this.frameIndex]);
    const text = this.textColor(this.text);
    this.stream.write(`${frame} ${text}`);
  }

  /**
   * Clear the current line
   */
  private clear(): void {
    this.stream.write("\r\x1B[K"); // Return to start and clear line
  }
}

// ============================================================================
// STATIC HELPERS
// ============================================================================

/**
 * Create and start a spinner in one call
 */
export function spin(text: string, options?: SpinnerOptions): Spinner {
  return new Spinner(text, options).start();
}

/**
 * Run an async task with a spinner
 */
export async function withSpinner<T>(
  text: string,
  task: () => Promise<T>,
  options?: SpinnerOptions & {
    successText?: string | ((result: T) => string);
    failText?: string | ((error: Error) => string);
  }
): Promise<T> {
  const spinner = new Spinner(text, options).start();

  try {
    const result = await task();
    const successText = options?.successText
      ? (typeof options.successText === "function" ? options.successText(result) : options.successText)
      : text;
    spinner.success(successText);
    return result;
  } catch (error) {
    const failText = options?.failText
      ? (typeof options.failText === "function" ? options.failText(error as Error) : options.failText)
      : text;
    spinner.fail(failText);
    throw error;
  }
}

/**
 * Static frame for non-animated spinner display
 */
export function spinnerFrame(style: SpinnerStyle = "dots", frameIndex = 0): string {
  const frames = spinnerFrames[style];
  return frames[frameIndex % frames.length];
}

export default Spinner;
