/**
 * ============================================================================
 * VULPES CELARE - REDACTION REPORTER
 * ============================================================================
 *
 * Beautiful, informative redaction result display with:
 * - Diff-style highlighting (before/after)
 * - Inline span visualization
 * - PHI type coloring
 * - Confidence indicators
 * - Summary statistics
 *
 * Makes redaction results immediately understandable at a glance.
 */

import { theme, ChainableColor } from "../index";
import { status as statusIcons, arrows, bullets } from "../icons";
import { Box } from "./Box";
import { phiBreakdownBar } from "./LiveMetrics";

// ============================================================================
// TYPES
// ============================================================================

export interface RedactionSpan {
  start: number;
  end: number;
  type: string;
  original: string;
  replacement: string;
  confidence: number;
  filter?: string;
}

export interface RedactionResult {
  originalText: string;
  redactedText: string;
  spans: RedactionSpan[];
  processingTimeMs?: number;
  documentId?: string;
}

export interface ReporterOptions {
  /** Show original text with highlights */
  showOriginal?: boolean;
  /** Show redacted text */
  showRedacted?: boolean;
  /** Show diff view (side by side or inline) */
  diffStyle?: "inline" | "sideBySide" | "unified" | "none";
  /** Show span details table */
  showSpanDetails?: boolean;
  /** Show summary statistics */
  showSummary?: boolean;
  /** Maximum text length before truncation */
  maxTextLength?: number;
  /** Context characters around each span */
  contextChars?: number;
  /** Compact mode (less verbose) */
  compact?: boolean;
}

// ============================================================================
// PHI TYPE STYLING
// ============================================================================

const PHI_STYLES: Record<string, { color: ChainableColor; icon: string }> = {
  NAME: { color: theme.warning, icon: "👤" },
  SSN: { color: theme.error, icon: "🔢" },
  DATE: { color: theme.info, icon: "📅" },
  PHONE: { color: theme.secondary, icon: "📞" },
  EMAIL: { color: theme.primary, icon: "📧" },
  ADDRESS: { color: theme.muted, icon: "🏠" },
  MRN: { color: theme.accent, icon: "🏥" },
  AGE: { color: theme.success, icon: "🎂" },
  ACCOUNT: { color: theme.warning, icon: "💳" },
  LICENSE: { color: theme.secondary, icon: "🪪" },
  IP: { color: theme.info, icon: "🌐" },
  URL: { color: theme.primary, icon: "🔗" },
  ZIPCODE: { color: theme.muted, icon: "📍" },
  DEFAULT: { color: theme.muted, icon: "•" },
};

function getPhiStyle(type: string): { color: ChainableColor; icon: string } {
  return PHI_STYLES[type] || PHI_STYLES.DEFAULT;
}

// ============================================================================
// CONFIDENCE VISUALIZATION
// ============================================================================

function confidenceIndicator(confidence: number): string {
  const pct = Math.round(confidence * 100);
  let color: (s: string) => string;
  let indicator: string;

  if (confidence >= 0.95) {
    color = theme.success;
    indicator = "●●●";
  } else if (confidence >= 0.8) {
    color = theme.warning;
    indicator = "●●○";
  } else if (confidence >= 0.6) {
    color = theme.warning;
    indicator = "●○○";
  } else {
    color = theme.error;
    indicator = "○○○";
  }

  return color(`${indicator} ${pct}%`);
}

function confidenceMini(confidence: number): string {
  if (confidence >= 0.95) return theme.success("●");
  if (confidence >= 0.8) return theme.warning("◐");
  if (confidence >= 0.6) return theme.warning("○");
  return theme.error("○");
}

// ============================================================================
// DIFF RENDERING
// ============================================================================

/**
 * Render inline diff with strikethrough original and highlighted replacement
 */
function renderInlineDiff(result: RedactionResult): string {
  const { originalText, spans } = result;
  if (spans.length === 0) return originalText;

  // Sort spans by start position
  const sortedSpans = [...spans].sort((a, b) => a.start - b.start);
  
  let output = "";
  let lastEnd = 0;

  for (const span of sortedSpans) {
    // Text before this span
    if (span.start > lastEnd) {
      output += originalText.slice(lastEnd, span.start);
    }

    // The span itself
    const style = getPhiStyle(span.type);
    const original = theme.strikethrough(theme.muted(span.original));
    const replacement = style.color(span.replacement);
    output += `${original}${arrows.right}${replacement}`;

    lastEnd = span.end;
  }

  // Text after last span
  if (lastEnd < originalText.length) {
    output += originalText.slice(lastEnd);
  }

  return output;
}

/**
 * Render unified diff style (like git diff)
 */
function renderUnifiedDiff(result: RedactionResult, contextChars: number = 30): string {
  const { spans } = result;
  if (spans.length === 0) return theme.muted("(no changes)");

  const lines: string[] = [];
  const sortedSpans = [...spans].sort((a, b) => a.start - b.start);

  for (const span of sortedSpans) {
    const style = getPhiStyle(span.type);
    
    // Context before
    const contextStart = Math.max(0, span.start - contextChars);
    const prefix = result.originalText.slice(contextStart, span.start);
    const prefixDisplay = contextStart > 0 ? "..." + prefix : prefix;

    // Context after
    const contextEnd = Math.min(result.originalText.length, span.end + contextChars);
    const suffix = result.originalText.slice(span.end, contextEnd);
    const suffixDisplay = contextEnd < result.originalText.length ? suffix + "..." : suffix;

    // Removed line
    lines.push(theme.error(`- ${prefixDisplay}`) + theme.error.bold(span.original) + theme.error(suffixDisplay));
    
    // Added line
    lines.push(theme.success(`+ ${prefixDisplay}`) + style.color.bold(span.replacement) + theme.success(suffixDisplay));
    
    // Separator
    if (sortedSpans.indexOf(span) < sortedSpans.length - 1) {
      lines.push(theme.muted("  ---"));
    }
  }

  return lines.join("\n");
}

/**
 * Render side-by-side comparison
 */
function renderSideBySide(result: RedactionResult, width: number = 40): string {
  const { originalText, redactedText } = result;
  
  // Split into lines and pad
  const origLines = wrapText(originalText, width);
  const redLines = wrapText(redactedText, width);
  const maxLines = Math.max(origLines.length, redLines.length);

  const lines: string[] = [];
  
  // Header
  lines.push(
    theme.error.bold("ORIGINAL".padEnd(width)) + 
    "  │  " + 
    theme.success.bold("REDACTED".padEnd(width))
  );
  lines.push(theme.muted("─".repeat(width) + "──┼──" + "─".repeat(width)));

  // Content
  for (let i = 0; i < maxLines; i++) {
    const orig = (origLines[i] || "").padEnd(width);
    const red = (redLines[i] || "").padEnd(width);
    lines.push(`${orig}  │  ${red}`);
  }

  return lines.join("\n");
}

function wrapText(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= width) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

// ============================================================================
// SPAN DETAILS TABLE
// ============================================================================

function renderSpanDetails(spans: RedactionSpan[]): string {
  if (spans.length === 0) return theme.muted("  No PHI detected");

  const lines: string[] = [];
  
  // Header
  lines.push(theme.muted("  TYPE          ORIGINAL                    CONF   FILTER"));
  lines.push(theme.muted("  " + "─".repeat(70)));

  // Sort by position
  const sorted = [...spans].sort((a, b) => a.start - b.start);

  for (const span of sorted) {
    const style = getPhiStyle(span.type);
    
    const typeCol = style.color(span.type.padEnd(12));
    const origCol = truncate(span.original, 25).padEnd(27);
    const confCol = confidenceMini(span.confidence) + ` ${Math.round(span.confidence * 100)}%`.padStart(4);
    const filterCol = theme.muted(span.filter || "-");

    lines.push(`  ${typeCol} ${origCol} ${confCol}  ${filterCol}`);
  }

  return lines.join("\n");
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

// ============================================================================
// SUMMARY STATISTICS
// ============================================================================

function renderSummary(result: RedactionResult): string {
  const { spans, processingTimeMs } = result;
  const lines: string[] = [];

  // PHI breakdown
  const breakdown: Record<string, number> = {};
  for (const span of spans) {
    breakdown[span.type] = (breakdown[span.type] || 0) + 1;
  }

  // Stats line
  const totalPhi = spans.length;
  const avgConfidence = spans.length > 0 
    ? spans.reduce((a, b) => a + b.confidence, 0) / spans.length 
    : 0;
  const uniqueTypes = Object.keys(breakdown).length;

  lines.push(theme.muted("  ") + bullets.dot + ` ${theme.primary.bold(totalPhi.toString())} PHI instances detected`);
  lines.push(theme.muted("  ") + bullets.dot + ` ${theme.secondary(uniqueTypes.toString())} unique types`);
  lines.push(theme.muted("  ") + bullets.dot + ` ${confidenceIndicator(avgConfidence)} avg confidence`);
  
  if (processingTimeMs !== undefined) {
    const timeStr = processingTimeMs < 1000 
      ? `${processingTimeMs.toFixed(0)}ms`
      : `${(processingTimeMs / 1000).toFixed(2)}s`;
    lines.push(theme.muted("  ") + bullets.dot + ` ${theme.muted("Processed in")} ${theme.success(timeStr)}`);
  }

  // Mini breakdown bar
  if (Object.keys(breakdown).length > 0) {
    lines.push("");
    lines.push("  " + phiBreakdownBar(breakdown, 50));
    
    // Legend
    const legend = Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => {
        const style = getPhiStyle(type);
        return style.color("■") + ` ${type}:${count}`;
      })
      .join("  ");
    lines.push("  " + legend);
  }

  return lines.join("\n");
}

// ============================================================================
// MAIN REPORTER CLASS
// ============================================================================

export class RedactionReporter {
  private options: Required<ReporterOptions>;

  constructor(options: ReporterOptions = {}) {
    this.options = {
      showOriginal: options.showOriginal ?? false,
      showRedacted: options.showRedacted ?? true,
      diffStyle: options.diffStyle ?? "inline",
      showSpanDetails: options.showSpanDetails ?? true,
      showSummary: options.showSummary ?? true,
      maxTextLength: options.maxTextLength ?? 500,
      contextChars: options.contextChars ?? 30,
      compact: options.compact ?? false,
    };
  }

  /**
   * Render a complete redaction report
   */
  render(result: RedactionResult): string {
    const sections: string[] = [];

    // Header
    const headerIcon = result.spans.length > 0 ? statusIcons.success : statusIcons.info;
    const headerText = result.spans.length > 0 
      ? `Redacted ${result.spans.length} PHI instance${result.spans.length !== 1 ? "s" : ""}`
      : "No PHI detected";
    
    sections.push(Box.vulpes([
      theme.primary.bold("REDACTION REPORT"),
      "",
      `${headerIcon} ${headerText}`,
    ], { title: result.documentId || "Result" }));

    // Diff view
    if (this.options.diffStyle !== "none" && result.spans.length > 0) {
      sections.push("");
      sections.push(theme.secondary.bold("  CHANGES"));
      sections.push("");
      
      switch (this.options.diffStyle) {
        case "inline":
          const inlineText = renderInlineDiff(result);
          const truncatedInline = this.truncateIfNeeded(inlineText);
          sections.push("  " + truncatedInline.split("\n").join("\n  "));
          break;
        case "unified":
          sections.push(renderUnifiedDiff(result, this.options.contextChars));
          break;
        case "sideBySide":
          sections.push(renderSideBySide(result));
          break;
      }
    }

    // Original text
    if (this.options.showOriginal && !this.options.compact) {
      sections.push("");
      sections.push(theme.error.bold("  ORIGINAL"));
      sections.push("");
      const truncatedOrig = this.truncateIfNeeded(result.originalText);
      sections.push("  " + theme.muted(truncatedOrig));
    }

    // Redacted text
    if (this.options.showRedacted) {
      sections.push("");
      sections.push(theme.success.bold("  REDACTED"));
      sections.push("");
      const truncatedRed = this.truncateIfNeeded(result.redactedText);
      sections.push("  " + truncatedRed);
    }

    // Span details
    if (this.options.showSpanDetails && result.spans.length > 0 && !this.options.compact) {
      sections.push("");
      sections.push(theme.secondary.bold("  DETECTED PHI"));
      sections.push("");
      sections.push(renderSpanDetails(result.spans));
    }

    // Summary
    if (this.options.showSummary) {
      sections.push("");
      sections.push(theme.secondary.bold("  SUMMARY"));
      sections.push("");
      sections.push(renderSummary(result));
    }

    sections.push("");

    return sections.join("\n");
  }

  /**
   * Render compact single-line summary
   */
  renderCompact(result: RedactionResult): string {
    const icon = result.spans.length > 0 ? theme.success(statusIcons.success) : theme.info(statusIcons.info);
    const count = result.spans.length;
    const types = [...new Set(result.spans.map(s => s.type))].length;
    
    let summary = `${icon} ${count} PHI`;
    if (types > 0) {
      summary += ` (${types} type${types !== 1 ? "s" : ""})`;
    }
    if (result.processingTimeMs !== undefined) {
      summary += theme.muted(` [${result.processingTimeMs.toFixed(0)}ms]`);
    }
    
    return summary;
  }

  /**
   * Render just the diff
   */
  renderDiff(result: RedactionResult): string {
    switch (this.options.diffStyle) {
      case "inline":
        return renderInlineDiff(result);
      case "unified":
        return renderUnifiedDiff(result, this.options.contextChars);
      case "sideBySide":
        return renderSideBySide(result);
      default:
        return "";
    }
  }

  private truncateIfNeeded(text: string): string {
    if (text.length <= this.options.maxTextLength) return text;
    return text.slice(0, this.options.maxTextLength) + theme.muted("... (truncated)");
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick render a redaction result
 */
export function renderRedactionResult(result: RedactionResult, options?: ReporterOptions): string {
  const reporter = new RedactionReporter(options);
  return reporter.render(result);
}

/**
 * Render a compact redaction summary
 */
export function renderRedactionCompact(result: RedactionResult): string {
  const reporter = new RedactionReporter({ compact: true });
  return reporter.renderCompact(result);
}

/**
 * Highlight PHI in text (for display purposes)
 */
export function highlightPhi(text: string, spans: RedactionSpan[]): string {
  if (spans.length === 0) return text;

  const sorted = [...spans].sort((a, b) => a.start - b.start);
  let output = "";
  let lastEnd = 0;

  for (const span of sorted) {
    if (span.start > lastEnd) {
      output += text.slice(lastEnd, span.start);
    }

    const style = getPhiStyle(span.type);
    // Use chalk's inverse directly, then apply the PHI color
    output += theme.raw.inverse(style.color(` ${span.original} `));
    lastEnd = span.end;
  }

  if (lastEnd < text.length) {
    output += text.slice(lastEnd);
  }

  return output;
}
