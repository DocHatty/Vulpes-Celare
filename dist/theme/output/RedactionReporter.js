"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedactionReporter = void 0;
exports.renderRedactionResult = renderRedactionResult;
exports.renderRedactionCompact = renderRedactionCompact;
exports.highlightPhi = highlightPhi;
const index_1 = require("../index");
const icons_1 = require("../icons");
const Box_1 = require("./Box");
const LiveMetrics_1 = require("./LiveMetrics");
// ============================================================================
// PHI TYPE STYLING
// ============================================================================
const PHI_STYLES = {
    NAME: { color: index_1.theme.warning, icon: "👤" },
    SSN: { color: index_1.theme.error, icon: "🔢" },
    DATE: { color: index_1.theme.info, icon: "📅" },
    PHONE: { color: index_1.theme.secondary, icon: "📞" },
    EMAIL: { color: index_1.theme.primary, icon: "📧" },
    ADDRESS: { color: index_1.theme.muted, icon: "🏠" },
    MRN: { color: index_1.theme.accent, icon: "🏥" },
    AGE: { color: index_1.theme.success, icon: "🎂" },
    ACCOUNT: { color: index_1.theme.warning, icon: "💳" },
    LICENSE: { color: index_1.theme.secondary, icon: "🪪" },
    IP: { color: index_1.theme.info, icon: "🌐" },
    URL: { color: index_1.theme.primary, icon: "🔗" },
    ZIPCODE: { color: index_1.theme.muted, icon: "📍" },
    DEFAULT: { color: index_1.theme.muted, icon: "•" },
};
function getPhiStyle(type) {
    return PHI_STYLES[type] || PHI_STYLES.DEFAULT;
}
// ============================================================================
// CONFIDENCE VISUALIZATION
// ============================================================================
function confidenceIndicator(confidence) {
    const pct = Math.round(confidence * 100);
    let color;
    let indicator;
    if (confidence >= 0.95) {
        color = index_1.theme.success;
        indicator = "●●●";
    }
    else if (confidence >= 0.8) {
        color = index_1.theme.warning;
        indicator = "●●○";
    }
    else if (confidence >= 0.6) {
        color = index_1.theme.warning;
        indicator = "●○○";
    }
    else {
        color = index_1.theme.error;
        indicator = "○○○";
    }
    return color(`${indicator} ${pct}%`);
}
function confidenceMini(confidence) {
    if (confidence >= 0.95)
        return index_1.theme.success("●");
    if (confidence >= 0.8)
        return index_1.theme.warning("◐");
    if (confidence >= 0.6)
        return index_1.theme.warning("○");
    return index_1.theme.error("○");
}
// ============================================================================
// DIFF RENDERING
// ============================================================================
/**
 * Render inline diff with strikethrough original and highlighted replacement
 */
function renderInlineDiff(result) {
    const { originalText, spans } = result;
    if (spans.length === 0)
        return originalText;
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
        const original = index_1.theme.strikethrough(index_1.theme.muted(span.original));
        const replacement = style.color(span.replacement);
        output += `${original}${icons_1.arrows.right}${replacement}`;
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
function renderUnifiedDiff(result, contextChars = 30) {
    const { spans } = result;
    if (spans.length === 0)
        return index_1.theme.muted("(no changes)");
    const lines = [];
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
        lines.push(index_1.theme.error(`- ${prefixDisplay}`) + index_1.theme.error.bold(span.original) + index_1.theme.error(suffixDisplay));
        // Added line
        lines.push(index_1.theme.success(`+ ${prefixDisplay}`) + style.color.bold(span.replacement) + index_1.theme.success(suffixDisplay));
        // Separator
        if (sortedSpans.indexOf(span) < sortedSpans.length - 1) {
            lines.push(index_1.theme.muted("  ---"));
        }
    }
    return lines.join("\n");
}
/**
 * Render side-by-side comparison
 */
function renderSideBySide(result, width = 40) {
    const { originalText, redactedText } = result;
    // Split into lines and pad
    const origLines = wrapText(originalText, width);
    const redLines = wrapText(redactedText, width);
    const maxLines = Math.max(origLines.length, redLines.length);
    const lines = [];
    // Header
    lines.push(index_1.theme.error.bold("ORIGINAL".padEnd(width)) +
        "  │  " +
        index_1.theme.success.bold("REDACTED".padEnd(width)));
    lines.push(index_1.theme.muted("─".repeat(width) + "──┼──" + "─".repeat(width)));
    // Content
    for (let i = 0; i < maxLines; i++) {
        const orig = (origLines[i] || "").padEnd(width);
        const red = (redLines[i] || "").padEnd(width);
        lines.push(`${orig}  │  ${red}`);
    }
    return lines.join("\n");
}
function wrapText(text, width) {
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = "";
    for (const word of words) {
        if (currentLine.length + word.length + 1 <= width) {
            currentLine += (currentLine ? " " : "") + word;
        }
        else {
            if (currentLine)
                lines.push(currentLine);
            currentLine = word;
        }
    }
    if (currentLine)
        lines.push(currentLine);
    return lines;
}
// ============================================================================
// SPAN DETAILS TABLE
// ============================================================================
function renderSpanDetails(spans) {
    if (spans.length === 0)
        return index_1.theme.muted("  No PHI detected");
    const lines = [];
    // Header
    lines.push(index_1.theme.muted("  TYPE          ORIGINAL                    CONF   FILTER"));
    lines.push(index_1.theme.muted("  " + "─".repeat(70)));
    // Sort by position
    const sorted = [...spans].sort((a, b) => a.start - b.start);
    for (const span of sorted) {
        const style = getPhiStyle(span.type);
        const typeCol = style.color(span.type.padEnd(12));
        const origCol = truncate(span.original, 25).padEnd(27);
        const confCol = confidenceMini(span.confidence) + ` ${Math.round(span.confidence * 100)}%`.padStart(4);
        const filterCol = index_1.theme.muted(span.filter || "-");
        lines.push(`  ${typeCol} ${origCol} ${confCol}  ${filterCol}`);
    }
    return lines.join("\n");
}
function truncate(text, maxLen) {
    if (text.length <= maxLen)
        return text;
    return text.slice(0, maxLen - 1) + "…";
}
// ============================================================================
// SUMMARY STATISTICS
// ============================================================================
function renderSummary(result) {
    const { spans, processingTimeMs } = result;
    const lines = [];
    // PHI breakdown
    const breakdown = {};
    for (const span of spans) {
        breakdown[span.type] = (breakdown[span.type] || 0) + 1;
    }
    // Stats line
    const totalPhi = spans.length;
    const avgConfidence = spans.length > 0
        ? spans.reduce((a, b) => a + b.confidence, 0) / spans.length
        : 0;
    const uniqueTypes = Object.keys(breakdown).length;
    lines.push(index_1.theme.muted("  ") + icons_1.bullets.dot + ` ${index_1.theme.primary.bold(totalPhi.toString())} PHI instances detected`);
    lines.push(index_1.theme.muted("  ") + icons_1.bullets.dot + ` ${index_1.theme.secondary(uniqueTypes.toString())} unique types`);
    lines.push(index_1.theme.muted("  ") + icons_1.bullets.dot + ` ${confidenceIndicator(avgConfidence)} avg confidence`);
    if (processingTimeMs !== undefined) {
        const timeStr = processingTimeMs < 1000
            ? `${processingTimeMs.toFixed(0)}ms`
            : `${(processingTimeMs / 1000).toFixed(2)}s`;
        lines.push(index_1.theme.muted("  ") + icons_1.bullets.dot + ` ${index_1.theme.muted("Processed in")} ${index_1.theme.success(timeStr)}`);
    }
    // Mini breakdown bar
    if (Object.keys(breakdown).length > 0) {
        lines.push("");
        lines.push("  " + (0, LiveMetrics_1.phiBreakdownBar)(breakdown, 50));
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
class RedactionReporter {
    options;
    constructor(options = {}) {
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
    render(result) {
        const sections = [];
        // Header
        const headerIcon = result.spans.length > 0 ? icons_1.status.success : icons_1.status.info;
        const headerText = result.spans.length > 0
            ? `Redacted ${result.spans.length} PHI instance${result.spans.length !== 1 ? "s" : ""}`
            : "No PHI detected";
        sections.push(Box_1.Box.vulpes([
            index_1.theme.primary.bold("REDACTION REPORT"),
            "",
            `${headerIcon} ${headerText}`,
        ], { title: result.documentId || "Result" }));
        // Diff view
        if (this.options.diffStyle !== "none" && result.spans.length > 0) {
            sections.push("");
            sections.push(index_1.theme.secondary.bold("  CHANGES"));
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
            sections.push(index_1.theme.error.bold("  ORIGINAL"));
            sections.push("");
            const truncatedOrig = this.truncateIfNeeded(result.originalText);
            sections.push("  " + index_1.theme.muted(truncatedOrig));
        }
        // Redacted text
        if (this.options.showRedacted) {
            sections.push("");
            sections.push(index_1.theme.success.bold("  REDACTED"));
            sections.push("");
            const truncatedRed = this.truncateIfNeeded(result.redactedText);
            sections.push("  " + truncatedRed);
        }
        // Span details
        if (this.options.showSpanDetails && result.spans.length > 0 && !this.options.compact) {
            sections.push("");
            sections.push(index_1.theme.secondary.bold("  DETECTED PHI"));
            sections.push("");
            sections.push(renderSpanDetails(result.spans));
        }
        // Summary
        if (this.options.showSummary) {
            sections.push("");
            sections.push(index_1.theme.secondary.bold("  SUMMARY"));
            sections.push("");
            sections.push(renderSummary(result));
        }
        sections.push("");
        return sections.join("\n");
    }
    /**
     * Render compact single-line summary
     */
    renderCompact(result) {
        const icon = result.spans.length > 0 ? index_1.theme.success(icons_1.status.success) : index_1.theme.info(icons_1.status.info);
        const count = result.spans.length;
        const types = [...new Set(result.spans.map(s => s.type))].length;
        let summary = `${icon} ${count} PHI`;
        if (types > 0) {
            summary += ` (${types} type${types !== 1 ? "s" : ""})`;
        }
        if (result.processingTimeMs !== undefined) {
            summary += index_1.theme.muted(` [${result.processingTimeMs.toFixed(0)}ms]`);
        }
        return summary;
    }
    /**
     * Render just the diff
     */
    renderDiff(result) {
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
    truncateIfNeeded(text) {
        if (text.length <= this.options.maxTextLength)
            return text;
        return text.slice(0, this.options.maxTextLength) + index_1.theme.muted("... (truncated)");
    }
}
exports.RedactionReporter = RedactionReporter;
// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================
/**
 * Quick render a redaction result
 */
function renderRedactionResult(result, options) {
    const reporter = new RedactionReporter(options);
    return reporter.render(result);
}
/**
 * Render a compact redaction summary
 */
function renderRedactionCompact(result) {
    const reporter = new RedactionReporter({ compact: true });
    return reporter.renderCompact(result);
}
/**
 * Highlight PHI in text (for display purposes)
 */
function highlightPhi(text, spans) {
    if (spans.length === 0)
        return text;
    const sorted = [...spans].sort((a, b) => a.start - b.start);
    let output = "";
    let lastEnd = 0;
    for (const span of sorted) {
        if (span.start > lastEnd) {
            output += text.slice(lastEnd, span.start);
        }
        const style = getPhiStyle(span.type);
        // Use chalk's inverse directly, then apply the PHI color
        output += index_1.theme.raw.inverse(style.color(` ${span.original} `));
        lastEnd = span.end;
    }
    if (lastEnd < text.length) {
        output += text.slice(lastEnd);
    }
    return output;
}
//# sourceMappingURL=RedactionReporter.js.map