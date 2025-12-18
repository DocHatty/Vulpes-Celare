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

import { theme } from "../chalk-theme";
import { status, arrows, bullets } from "../icons";
import { getTerminalWidth } from "../spacing";
import { stripAnsi, truncate } from "../typography";
import { Box } from "./Box";
import { Divider } from "./Divider";
import { Progress } from "./Progress";
import { out } from "../../utils/VulpesOutput";

// ============================================================================
// TYPES
// ============================================================================

export interface RedactionResult {
  text: string;
  redactionCount: number;
  executionTimeMs: number;
  breakdown: Record<string, number>;
}

export interface DisplayOptions {
  /** Show original text */
  showOriginal?: boolean;
  /** Show breakdown by type */
  showBreakdown?: boolean;
  /** Show statistics */
  showStats?: boolean;
  /** Maximum width for text display */
  maxWidth?: number;
  /** Compact mode */
  compact?: boolean;
  /** Highlight redaction markers */
  highlightMarkers?: boolean;
}

// ============================================================================
// PHI TYPE COLORS
// ============================================================================

const PHI_COLORS: Record<string, (text: string) => string> = {
  NAME: theme.phi.name,
  SSN: theme.phi.ssn,
  PHONE: theme.phi.phone,
  EMAIL: theme.phi.email,
  ADDRESS: theme.phi.address,
  DATE: theme.phi.date,
  MRN: theme.phi.mrn,
  DEFAULT: theme.phi.default,
};

function getPhiColor(type: string): (text: string) => string {
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

export class RedactionDisplay {
  /**
   * Show a full redaction result with original comparison
   */
  static show(
    original: string,
    result: RedactionResult,
    options: DisplayOptions = {}
  ): void {
    const {
      showOriginal = true,
      showBreakdown = true,
      showStats = true,
      maxWidth = getTerminalWidth() - 4,
      highlightMarkers = true,
    } = options;

    const dividerWidth = Math.min(70, maxWidth);

    // Header
    out.blank();
    out.print(Divider.titled("REDACTION RESULT", { width: dividerWidth }));
    out.blank();

    // Original text (if showing)
    if (showOriginal) {
      out.print(theme.error.bold("  ORIGINAL:"));
      out.print(this.formatText(original, maxWidth - 4, theme.muted));
      out.blank();
    }

    // Redacted text
    out.print(theme.success.bold("  REDACTED:"));
    const formattedRedacted = highlightMarkers
      ? this.highlightRedactions(result.text)
      : result.text;
    out.print(this.formatText(formattedRedacted, maxWidth - 4));
    out.blank();

    // Statistics
    if (showStats) {
      const statsLine = [
        `${theme.muted("PHI Found:")} ${theme.primary.bold(result.redactionCount.toString())}`,
        `${theme.muted("Time:")} ${theme.secondary(result.executionTimeMs + "ms")}`,
      ].join("  │  ");
      out.print("  " + statsLine);
      out.blank();
    }

    // Breakdown by type
    if (showBreakdown && Object.keys(result.breakdown).length > 0) {
      out.print(theme.muted("  BREAKDOWN BY TYPE:"));
      
      const sortedBreakdown = Object.entries(result.breakdown)
        .sort(([, a], [, b]) => b - a);
      
      const maxTypeLen = Math.max(...sortedBreakdown.map(([t]) => t.length));
      
      for (const [type, count] of sortedBreakdown) {
        const colorFn = getPhiColor(type);
        const paddedType = type.padEnd(maxTypeLen);
        const bar = this.miniBar(count, result.redactionCount, 10);
        out.print(`    ${colorFn(paddedType)}  ${bar}  ${count}`);
      }
      out.blank();
    }

    out.print(Divider.line({ width: dividerWidth, style: "light" }));
  }

  /**
   * Compact single-line redaction display
   */
  static compact(result: RedactionResult): void {
    const phiCount = result.redactionCount;
    const time = result.executionTimeMs;
    
    if (phiCount === 0) {
      out.print(theme.success(`${status.success} No PHI detected`) + theme.muted(` (${time}ms)`));
    } else {
      out.print(
        theme.warning(`${status.warning} ${phiCount} PHI redacted`) + 
        theme.muted(` (${time}ms)`)
      );
    }
  }

  /**
   * Show redaction as a diff
   */
  static diff(original: string, result: RedactionResult): void {
    out.blank();
    out.print(theme.error(`- ${original}`));
    out.print(theme.success(`+ ${result.text}`));
    out.print(theme.muted(`  (${result.redactionCount} PHI, ${result.executionTimeMs}ms)`));
  }

  /**
   * Show inline redaction (original → redacted)
   */
  static inline(original: string, result: RedactionResult): void {
    if (result.redactionCount === 0) {
      out.print(theme.success(original) + theme.muted(" (no PHI)"));
    } else {
      out.print(
        theme.muted(truncate(original, 30)) + 
        ` ${arrows.right} ` + 
        this.highlightRedactions(result.text)
      );
    }
  }

  /**
   * Show redaction statistics as a summary box
   */
  static summary(results: RedactionResult[]): void {
    const totalDocs = results.length;
    const totalPhi = results.reduce((sum, r) => sum + r.redactionCount, 0);
    const totalTime = results.reduce((sum, r) => sum + r.executionTimeMs, 0);
    const avgTime = totalDocs > 0 ? (totalTime / totalDocs).toFixed(1) : "0";
    
    // Aggregate breakdown
    const aggregateBreakdown: Record<string, number> = {};
    for (const r of results) {
      for (const [type, count] of Object.entries(r.breakdown)) {
        aggregateBreakdown[type] = (aggregateBreakdown[type] || 0) + count;
      }
    }

    const content = [
      `${theme.muted("Documents:")}  ${totalDocs}`,
      `${theme.muted("Total PHI:")}  ${theme.primary.bold(totalPhi.toString())}`,
      `${theme.muted("Total Time:")} ${totalTime}ms`,
      `${theme.muted("Avg Time:")}   ${avgTime}ms/doc`,
    ];

    if (Object.keys(aggregateBreakdown).length > 0) {
      content.push("");
      content.push(theme.muted("Top PHI Types:"));
      
      const sorted = Object.entries(aggregateBreakdown)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);
      
      for (const [type, count] of sorted) {
        const colorFn = getPhiColor(type);
        content.push(`  ${colorFn(bullets.dot)} ${type}: ${count}`);
      }
    }

    out.print(Box.vulpes(content, { title: "Redaction Summary" }));
  }

  /**
   * Show a health indicator based on redaction results
   */
  static health(result: RedactionResult, expected?: { minPhi?: number; maxPhi?: number }): void {
    const { minPhi = 0, maxPhi = Infinity } = expected || {};
    const count = result.redactionCount;
    
    let healthStatus: "success" | "warning" | "error";
    let message: string;
    
    if (count >= minPhi && count <= maxPhi) {
      healthStatus = "success";
      message = "Redaction within expected range";
    } else if (count < minPhi) {
      healthStatus = "warning";
      message = `Expected at least ${minPhi} PHI, found ${count}`;
    } else {
      healthStatus = "warning";
      message = `Found ${count} PHI (expected max ${maxPhi})`;
    }
    
    out.print(Progress.health(count / Math.max(maxPhi, 1) * 100));
    out.print(theme[healthStatus](message));
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private static formatText(text: string, maxWidth: number, colorFn?: (s: string) => string): string {
    const lines = text.split("\n");
    const formatted = lines.map(line => {
      const visible = stripAnsi(line);
      if (visible.length > maxWidth) {
        return "  " + truncate(line, maxWidth);
      }
      return "  " + line;
    });
    
    const result = formatted.join("\n");
    return colorFn ? colorFn(result) : result;
  }

  private static highlightRedactions(text: string): string {
    // Highlight [TYPE] style markers
    let result = text.replace(/\[([A-Z_-]+)\]/g, (match) => theme.warning(match));
    
    // Highlight {{TYPE}} style markers
    result = result.replace(/\{\{([^}]+)\}\}/g, (match) => theme.warning(match));
    
    // Highlight ***REDACTED*** style markers
    result = result.replace(/\*{3}[^*]+\*{3}/g, (match) => theme.warning(match));
    
    return result;
  }

  private static miniBar(value: number, total: number, width: number): string {
    if (total === 0) return theme.muted("░".repeat(width));
    
    const filled = Math.round((value / total) * width);
    const empty = width - filled;
    
    return theme.primary("█".repeat(filled)) + theme.muted("░".repeat(empty));
  }
}

export default RedactionDisplay;
