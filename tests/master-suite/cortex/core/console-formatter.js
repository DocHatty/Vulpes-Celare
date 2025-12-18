/**
 * Console Formatter - Beautiful, Glitch-Free Terminal Output
 *
 * Provides perfectly aligned box-drawing output for terminal/console logging.
 * All boxes use a consistent 80-character width with proper UTF-8 box characters.
 */

const BOX_WIDTH = 80;
const INNER_WIDTH = BOX_WIDTH - 4; // Account for "║  " and "  ║"

/**
 * Box-drawing characters (UTF-8)
 */
const BOX = {
  TL: "\u2554", // ╔ Top-left
  TR: "\u2557", // ╗ Top-right
  BL: "\u255A", // ╚ Bottom-left
  BR: "\u255D", // ╝ Bottom-right
  H: "\u2550", // ═ Horizontal
  V: "\u2551", // ║ Vertical
  ML: "\u2560", // ╠ Middle-left
  MR: "\u2563", // ╣ Middle-right
  // Single-line alternatives
  SH: "\u2500", // ─ Single horizontal
  SV: "\u2502", // │ Single vertical
};

/**
 * Create a horizontal line
 */
function horizontalLine(char = BOX.H, width = BOX_WIDTH - 2) {
  return char.repeat(width);
}

/**
 * Pad a string to exact width (handles multi-byte UTF-8 correctly)
 */
function padToWidth(str, width, align = "left") {
  // Get actual display width (ASCII chars = 1, most Unicode = 1-2)
  const displayWidth = getDisplayWidth(str);
  const padding = Math.max(0, width - displayWidth);

  if (align === "center") {
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return " ".repeat(leftPad) + str + " ".repeat(rightPad);
  } else if (align === "right") {
    return " ".repeat(padding) + str;
  } else {
    return str + " ".repeat(padding);
  }
}

/**
 * Get the display width of a string (accounting for wide chars)
 */
function getDisplayWidth(str) {
  // Simple implementation - count characters
  // Most terminal emulators treat box-drawing chars as width 1
  return str.length;
}

/**
 * Format a line to fit inside the box with proper padding
 */
function boxLine(content, align = "left") {
  const padded = padToWidth(content, INNER_WIDTH, align);
  return `${BOX.V} ${padded} ${BOX.V}`;
}

/**
 * Create a top border
 */
function topBorder() {
  return `${BOX.TL}${horizontalLine()}${BOX.TR}`;
}

/**
 * Create a bottom border
 */
function bottomBorder() {
  return `${BOX.BL}${horizontalLine()}${BOX.BR}`;
}

/**
 * Create a middle separator
 */
function middleSeparator() {
  return `${BOX.ML}${horizontalLine()}${BOX.MR}`;
}

/**
 * Create a single-line separator (thin)
 */
function thinSeparator() {
  return `${BOX.V} ${BOX.SH.repeat(INNER_WIDTH)} ${BOX.V}`;
}

/**
 * Create a simple divider line (no box chars)
 */
function divider(char = BOX.H, width = BOX_WIDTH) {
  return char.repeat(width);
}

/**
 * Format a key-value pair for display in a box
 */
function keyValue(key, value, keyWidth = 14) {
  const formattedKey = padToWidth(key + ":", keyWidth, "left");
  return `${formattedKey} ${value}`;
}

/**
 * Create a complete box with title and optional content
 */
function box(title, lines = [], options = {}) {
  const { titleAlign = "left", subtitle = null } = options;

  const output = [];

  // Top border
  output.push(topBorder());

  // Title
  output.push(boxLine(title, titleAlign));

  // Subtitle if provided
  if (subtitle) {
    output.push(boxLine(subtitle, titleAlign));
  }

  // If we have content lines, add separator and content
  if (lines.length > 0) {
    output.push(middleSeparator());
    for (const line of lines) {
      output.push(boxLine(line));
    }
  }

  // Bottom border
  output.push(bottomBorder());

  return output.join("\n");
}

/**
 * Create a header box (title only, centered)
 */
function headerBox(title, subtitle = null) {
  const output = [];
  output.push(topBorder());
  output.push(boxLine(title, "center"));
  if (subtitle) {
    output.push(boxLine(subtitle, "center"));
  }
  output.push(bottomBorder());
  return output.join("\n");
}

/**
 * Create a status box for server info
 */
function statusBox(title, statusItems, footerMessage = null) {
  const output = [];

  // Top border and title
  output.push(topBorder());
  output.push(boxLine(title));
  output.push(middleSeparator());

  // Status items (key-value pairs)
  for (const item of statusItems) {
    if (typeof item === "string") {
      output.push(boxLine(item));
    } else {
      output.push(boxLine(keyValue(item.key, item.value, item.keyWidth || 14)));
    }
  }

  // Footer if provided
  if (footerMessage) {
    output.push(middleSeparator());
    output.push(boxLine(footerMessage));
  }

  // Bottom border
  output.push(bottomBorder());

  return output.join("\n");
}

/**
 * Create a grade display box (centered, compact)
 */
function gradeBox(grade, score) {
  const gradeStr = String(grade).padStart(2);
  const scoreStr = `${score}/100`;

  const innerWidth = 15;
  const output = [];

  output.push(`${BOX.TL}${BOX.H.repeat(innerWidth)}${BOX.TR}`);
  output.push(`${BOX.V}${padToWidth(gradeStr, innerWidth, "center")}${BOX.V}`);
  output.push(`${BOX.V}${padToWidth(scoreStr, innerWidth, "center")}${BOX.V}`);
  output.push(`${BOX.BL}${BOX.H.repeat(innerWidth)}${BOX.BR}`);

  return output.map((line) => padToWidth(line, BOX_WIDTH, "center")).join("\n");
}

/**
 * Create a section header (no box, just decorated text)
 */
function sectionHeader(title) {
  return `\n${title}\n${BOX.SH.repeat(BOX_WIDTH)}`;
}

/**
 * Create a tool call log entry
 */
function toolCallHeader(toolName, timestamp = null) {
  const ts = timestamp || new Date().toISOString().split("T")[1].split(".")[0];
  return `[${ts}] ${divider(BOX.H, 40)}\n[${ts}] TOOL CALL: ${toolName}`;
}

/**
 * Create a tool call result footer
 */
function toolCallFooter(timestamp = null, success = true, duration = null) {
  const ts = timestamp || new Date().toISOString().split("T")[1].split(".")[0];
  const status = success ? "\u2713" : "\u2717"; // ✓ or ✗
  let msg = `[${ts}] ${status} COMPLETED`;
  if (duration) {
    msg += ` in ${duration}s`;
  }
  return `${msg}\n[${ts}] ${divider(BOX.H, 40)}`;
}

/**
 * Format a progress indicator
 */
function progress(current, total, label = "Progress") {
  const pct = Math.round((current / total) * 100);
  return `${label}: ${current}/${total} (${pct}%)`;
}

/**
 * Create the server running banner
 */
function serverBanner(name, port, pid, healthUrl) {
  const portStr = String(port);
  const pidStr = String(pid);

  return statusBox(
    `${name} - RUNNING`,
    [
      { key: "Status", value: "ACTIVE" },
      { key: "Port", value: portStr },
      { key: "PID", value: pidStr },
      { key: "Health", value: healthUrl },
    ],
    "Server will stay running until manually stopped (Ctrl+C)",
  );
}

/**
 * Create an assessment header banner
 */
function assessmentBanner(documentCount, engineName, engineVersion) {
  const output = [];
  output.push("");
  output.push(
    headerBox(
      `VULPES CELARE - RIGOROUS ASSESSMENT (${documentCount} Documents)`,
    ),
  );
  output.push("");
  output.push(`Engine: ${engineName} v${engineVersion}`);
  output.push(`Processing ${documentCount} documents...`);
  output.push("");
  return output.join("\n");
}

/**
 * Create a phase header
 */
function phaseHeader(phaseNumber, title) {
  return headerBox(`PHASE ${phaseNumber}: ${title}`);
}

/**
 * Create a final report header
 */
function reportHeader() {
  return headerBox("VULPES CELARE - ASSESSMENT REPORT");
}

/**
 * Create a section within the report
 */
function reportSection(title) {
  return `\n${title}\n${BOX.SH.repeat(BOX_WIDTH)}`;
}

/**
 * Create an emphasis box for important notices
 */
function emphasisBox(title, lines = []) {
  const output = [];
  output.push("");
  output.push(divider(BOX.H));
  output.push(padToWidth(title, BOX_WIDTH, "center"));
  output.push(divider(BOX.H));
  for (const line of lines) {
    output.push(padToWidth(line, BOX_WIDTH, "center"));
  }
  output.push(divider(BOX.H));
  output.push("");
  return output.join("\n");
}

/**
 * Create a warning box
 */
function warningBox(title, message) {
  return box(`\u26A0\uFE0F  ${title}`, [message]);
}

// ============================================================================
// MAIN ASCII ART BANNERS
// ============================================================================

/**
 * The main VULPES CELARE ASCII art logo
 */
const VULPES_ASCII = `
    ██╗   ██╗██╗   ██╗██╗     ██████╗ ███████╗███████╗
    ██║   ██║██║   ██║██║     ██╔══██╗██╔════╝██╔════╝
    ██║   ██║██║   ██║██║     ██████╔╝█████╗  ███████╗
    ╚██╗ ██╔╝██║   ██║██║     ██╔═══╝ ██╔══╝  ╚════██║
     ╚████╔╝ ╚██████╔╝███████╗██║     ███████╗███████║
      ╚═══╝   ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚══════╝`;

const CELARE_ASCII = `
     ██████╗███████╗██╗      █████╗ ██████╗ ███████╗
    ██╔════╝██╔════╝██║     ██╔══██╗██╔══██╗██╔════╝
    ██║     █████╗  ██║     ███████║██████╔╝█████╗
    ██║     ██╔══╝  ██║     ██╔══██║██╔══██╗██╔══╝
    ╚██████╗███████╗███████╗██║  ██║██║  ██║███████╗
     ╚═════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝`;

const CORTEX_ASCII = `
     ██████╗ ██████╗ ██████╗ ████████╗███████╗██╗  ██╗
    ██╔════╝██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝╚██╗██╔╝
    ██║     ██║   ██║██████╔╝   ██║   █████╗   ╚███╔╝
    ██║     ██║   ██║██╔══██╗   ██║   ██╔══╝   ██╔██╗
    ╚██████╗╚██████╔╝██║  ██║   ██║   ███████╗██╔╝ ██╗
     ╚═════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝`;

/**
 * Create the main application banner with ASCII art
 * @param {string} subtitle - Optional subtitle text
 * @param {string[]} features - Optional feature list
 */
function mainBanner(subtitle = null, features = []) {
  const output = [];
  output.push(topBorder());
  output.push(boxLine(""));

  // Add VULPES ASCII art (centered)
  for (const line of VULPES_ASCII.split("\n")) {
    if (line.trim()) {
      output.push(boxLine(line, "center"));
    }
  }

  // Add CELARE ASCII art (centered)
  for (const line of CELARE_ASCII.split("\n")) {
    if (line.trim()) {
      output.push(boxLine(line, "center"));
    }
  }

  output.push(boxLine(""));

  // Subtitle
  if (subtitle) {
    output.push(boxLine(subtitle, "center"));
    output.push(boxLine(""));
  }

  // Features
  if (features.length > 0) {
    output.push(boxLine(features.join("  •  "), "center"));
    output.push(boxLine(""));
  }

  output.push(bottomBorder());
  return output.join("\n");
}

/**
 * Create the Cortex banner with ASCII art
 * @param {string} subtitle - Optional subtitle text
 */
function cortexBanner(subtitle = null) {
  const output = [];
  output.push(topBorder());
  output.push(boxLine(""));

  // Add VULPES ASCII art (centered)
  for (const line of VULPES_ASCII.split("\n")) {
    if (line.trim()) {
      output.push(boxLine(line, "center"));
    }
  }

  // Add CORTEX ASCII art (centered)
  for (const line of CORTEX_ASCII.split("\n")) {
    if (line.trim()) {
      output.push(boxLine(line, "center"));
    }
  }

  output.push(boxLine(""));

  // Subtitle
  if (subtitle) {
    output.push(boxLine(subtitle, "center"));
    output.push(boxLine(""));
  }

  output.push(bottomBorder());
  return output.join("\n");
}

/**
 * Create the test runner banner
 */
function testRunnerBanner() {
  return mainBanner("E V O L U T I O N A R Y   T E S T   S U I T E", [
    "Self-Learning",
    "Pattern Recognition",
    "Smart Grading",
  ]);
}

/**
 * Create the MCP server banner
 */
function mcpServerBanner() {
  return cortexBanner("M C P   S E R V E R");
}

/**
 * Create a compact assessment banner with ASCII art
 */
function assessmentBannerFull(documentCount, engineName, engineVersion) {
  const output = [];
  output.push(topBorder());
  output.push(boxLine(""));

  // Add VULPES ASCII art (centered)
  for (const line of VULPES_ASCII.split("\n")) {
    if (line.trim()) {
      output.push(boxLine(line, "center"));
    }
  }

  // Add CELARE ASCII art (centered)
  for (const line of CELARE_ASCII.split("\n")) {
    if (line.trim()) {
      output.push(boxLine(line, "center"));
    }
  }

  output.push(boxLine(""));
  output.push(boxLine("A S S E S S M E N T   E N G I N E", "center"));
  output.push(boxLine(""));
  output.push(middleSeparator());
  output.push(boxLine(`Engine: ${engineName} v${engineVersion}`, "center"));
  output.push(boxLine(`Processing ${documentCount} documents...`, "center"));
  output.push(bottomBorder());

  return output.join("\n");
}

/**
 * Create the experiment runner banner
 */
function experimentBanner() {
  return cortexBanner("A / B   E X P E R I M E N T   R U N N E R");
}

/**
 * Create an action checklist box
 */
function actionChecklist(title, items, status = "REQUIRED") {
  const output = [];
  output.push(topBorder());
  output.push(boxLine(""));
  output.push(boxLine(`${title}`, "center"));
  output.push(boxLine(""));
  output.push(middleSeparator());

  for (const item of items) {
    if (typeof item === "string") {
      output.push(boxLine(item));
    } else if (item.header) {
      output.push(boxLine(""));
      output.push(boxLine(item.header));
      output.push(boxLine(divider(BOX.SH, INNER_WIDTH)));
    } else if (item.indent) {
      output.push(boxLine(`    ${item.indent}`));
    }
  }

  output.push(boxLine(""));
  output.push(bottomBorder());
  return output.join("\n");
}

/**
 * Create a metrics summary box
 */
function metricsBox(metrics) {
  const output = [];
  output.push(topBorder());
  output.push(boxLine("CURRENT METRICS", "center"));
  output.push(middleSeparator());
  output.push(
    boxLine(
      `Sensitivity: ${metrics.sensitivity}%     Specificity: ${metrics.specificity}%`,
    ),
  );
  output.push(
    boxLine(
      `F1 Score:    ${metrics.f1}       F2 Score:    ${metrics.f2}  (HIPAA standard)`,
    ),
  );
  output.push(boxLine(`Grade:       ${metrics.grade}`));
  output.push(bottomBorder());
  return output.join("\n");
}

module.exports = {
  // Constants
  BOX_WIDTH,
  INNER_WIDTH,
  BOX,

  // Primitives
  horizontalLine,
  padToWidth,
  getDisplayWidth,
  boxLine,
  topBorder,
  bottomBorder,
  middleSeparator,
  thinSeparator,
  divider,
  keyValue,

  // Composite elements
  box,
  headerBox,
  statusBox,
  gradeBox,
  sectionHeader,
  toolCallHeader,
  toolCallFooter,
  progress,

  // Pre-built banners
  serverBanner,
  assessmentBanner,
  phaseHeader,
  reportHeader,
  reportSection,
  emphasisBox,
  warningBox,

  // ASCII Art banners
  VULPES_ASCII,
  CELARE_ASCII,
  CORTEX_ASCII,
  mainBanner,
  cortexBanner,
  testRunnerBanner,
  mcpServerBanner,
  assessmentBannerFull,
  experimentBanner,
  actionChecklist,
  metricsBox,
};
