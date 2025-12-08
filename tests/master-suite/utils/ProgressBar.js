/**
 * Real-time Progress Bar Utility
 *
 * Provides visual progress indicators with:
 * - Percentage completion
 * - Progress bar visualization
 * - ETA (Estimated Time Remaining)
 * - Current/Total counts
 */

class ProgressBar {
  constructor(total, label = 'Progress') {
    this.total = total;
    this.current = 0;
    this.label = label;
    this.startTime = Date.now();
    this.lastUpdate = 0;
    this.updateInterval = 100; // Update every 100ms minimum
  }

  /**
   * Update progress
   * @param {number} current - Current progress value
   * @param {boolean} force - Force update even if interval hasn't passed
   */
  update(current, force = false) {
    this.current = current;
    const now = Date.now();

    // Only update if enough time has passed or forced
    if (!force && now - this.lastUpdate < this.updateInterval) {
      return;
    }

    this.lastUpdate = now;
    this.render();
  }

  /**
   * Increment progress by 1
   */
  increment() {
    this.update(this.current + 1);
  }

  /**
   * Render the progress bar
   */
  render() {
    const percentage = Math.min(100, Math.round((this.current / this.total) * 100));
    const elapsed = (Date.now() - this.startTime) / 1000;

    // Calculate ETA
    let eta = '';
    if (this.current > 0 && this.current < this.total) {
      const rate = this.current / elapsed;
      const remaining = this.total - this.current;
      const etaSeconds = remaining / rate;
      eta = ` ETA: ${this.formatTime(etaSeconds)}`;
    }

    // Build progress bar
    const barLength = 40;
    const filled = Math.round((percentage / 100) * barLength);
    const empty = barLength - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    // Clear line and write progress
    process.stdout.write('\r');
    process.stdout.write(
      `${this.label}: [${bar}] ${percentage}% (${this.current}/${this.total})${eta}   `
    );
  }

  /**
   * Complete the progress bar
   */
  complete() {
    this.update(this.total, true);
    process.stdout.write('\n');
  }

  /**
   * Format seconds into human-readable time
   */
  formatTime(seconds) {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins}m ${secs}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
  }

  /**
   * Clear the current line
   */
  clear() {
    process.stdout.write('\r' + ' '.repeat(100) + '\r');
  }
}

/**
 * Multi-level progress tracker for nested operations
 */
class MultiProgress {
  constructor() {
    this.bars = [];
    this.activeBar = null;
  }

  /**
   * Create a new progress bar
   */
  create(total, label) {
    const bar = new ProgressBar(total, label);
    this.bars.push(bar);
    this.activeBar = bar;
    return bar;
  }

  /**
   * Update all bars
   */
  renderAll() {
    // Clear previous output
    process.stdout.write('\x1b[?25l'); // Hide cursor

    // Move up to overwrite previous bars
    if (this.bars.length > 0) {
      process.stdout.write(`\x1b[${this.bars.length}A`);
    }

    // Render each bar
    this.bars.forEach(bar => {
      bar.render();
      process.stdout.write('\n');
    });

    process.stdout.write('\x1b[?25h'); // Show cursor
  }

  /**
   * Complete all bars
   */
  completeAll() {
    this.bars.forEach(bar => bar.complete());
    process.stdout.write('\x1b[?25h'); // Show cursor
  }
}

/**
 * Simple spinner for indeterminate progress
 */
class Spinner {
  constructor(label = 'Loading') {
    this.label = label;
    this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.frameIndex = 0;
    this.interval = null;
    this.startTime = Date.now();
  }

  start() {
    this.interval = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
      process.stdout.write(`\r${frame} ${this.label}... (${elapsed}s)   `);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);
  }

  stop(message = 'Done') {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    process.stdout.write(`\r✓ ${message} (${elapsed}s)\n`);
  }

  fail(message = 'Failed') {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write(`\r✗ ${message}\n`);
  }
}

module.exports = { ProgressBar, MultiProgress, Spinner };
