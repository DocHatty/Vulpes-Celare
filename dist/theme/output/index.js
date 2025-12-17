"use strict";
/**
 * ============================================================================
 * VULPES CELARE - OUTPUT COMPONENTS
 * ============================================================================
 *
 * Unified output primitives for elegant CLI rendering.
 * Import components from this central location.
 *
 * Usage:
 *   import { Box, Table, Progress, Spinner, Divider, Banner, Status } from '../theme/output';
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.indent = exports.spacing = exports.getTerminalWidth = exports.bullets = exports.arrows = exports.statusIcons = exports.ico = exports.icons = exports.info = exports.warning = exports.error = exports.success = exports.formatStatus = exports.theme = exports.highlightPhi = exports.renderRedactionCompact = exports.renderRedactionResult = exports.RedactionReporter = exports.AnimatedProgress = exports.metricsDashboard = exports.healthIndicator = exports.phiBreakdownWithLegend = exports.phiBreakdownBar = exports.LiveCounter = exports.gauge = exports.sparkline = exports.RedactionDisplay = exports.Status = exports.Banner = exports.Divider = exports.spinnerFrame = exports.withSpinner = exports.spin = exports.Spinner = exports.Progress = exports.Table = exports.Box = void 0;
// ============================================================================
// COMPONENT EXPORTS
// ============================================================================
var Box_1 = require("./Box");
Object.defineProperty(exports, "Box", { enumerable: true, get: function () { return Box_1.Box; } });
var Table_1 = require("./Table");
Object.defineProperty(exports, "Table", { enumerable: true, get: function () { return Table_1.Table; } });
var Progress_1 = require("./Progress");
Object.defineProperty(exports, "Progress", { enumerable: true, get: function () { return Progress_1.Progress; } });
var Spinner_1 = require("./Spinner");
Object.defineProperty(exports, "Spinner", { enumerable: true, get: function () { return Spinner_1.Spinner; } });
Object.defineProperty(exports, "spin", { enumerable: true, get: function () { return Spinner_1.spin; } });
Object.defineProperty(exports, "withSpinner", { enumerable: true, get: function () { return Spinner_1.withSpinner; } });
Object.defineProperty(exports, "spinnerFrame", { enumerable: true, get: function () { return Spinner_1.spinnerFrame; } });
var Divider_1 = require("./Divider");
Object.defineProperty(exports, "Divider", { enumerable: true, get: function () { return Divider_1.Divider; } });
var Banner_1 = require("./Banner");
Object.defineProperty(exports, "Banner", { enumerable: true, get: function () { return Banner_1.Banner; } });
var Status_1 = require("./Status");
Object.defineProperty(exports, "Status", { enumerable: true, get: function () { return Status_1.Status; } });
var RedactionDisplay_1 = require("./RedactionDisplay");
Object.defineProperty(exports, "RedactionDisplay", { enumerable: true, get: function () { return RedactionDisplay_1.RedactionDisplay; } });
var LiveMetrics_1 = require("./LiveMetrics");
Object.defineProperty(exports, "sparkline", { enumerable: true, get: function () { return LiveMetrics_1.sparkline; } });
Object.defineProperty(exports, "gauge", { enumerable: true, get: function () { return LiveMetrics_1.gauge; } });
Object.defineProperty(exports, "LiveCounter", { enumerable: true, get: function () { return LiveMetrics_1.LiveCounter; } });
Object.defineProperty(exports, "phiBreakdownBar", { enumerable: true, get: function () { return LiveMetrics_1.phiBreakdownBar; } });
Object.defineProperty(exports, "phiBreakdownWithLegend", { enumerable: true, get: function () { return LiveMetrics_1.phiBreakdownWithLegend; } });
Object.defineProperty(exports, "healthIndicator", { enumerable: true, get: function () { return LiveMetrics_1.healthIndicator; } });
Object.defineProperty(exports, "metricsDashboard", { enumerable: true, get: function () { return LiveMetrics_1.metricsDashboard; } });
Object.defineProperty(exports, "AnimatedProgress", { enumerable: true, get: function () { return LiveMetrics_1.AnimatedProgress; } });
var RedactionReporter_1 = require("./RedactionReporter");
Object.defineProperty(exports, "RedactionReporter", { enumerable: true, get: function () { return RedactionReporter_1.RedactionReporter; } });
Object.defineProperty(exports, "renderRedactionResult", { enumerable: true, get: function () { return RedactionReporter_1.renderRedactionResult; } });
Object.defineProperty(exports, "renderRedactionCompact", { enumerable: true, get: function () { return RedactionReporter_1.renderRedactionCompact; } });
Object.defineProperty(exports, "highlightPhi", { enumerable: true, get: function () { return RedactionReporter_1.highlightPhi; } });
// ============================================================================
// CONVENIENCE RE-EXPORTS
// ============================================================================
// Re-export commonly used theme utilities for convenience
var chalk_theme_1 = require("../chalk-theme");
Object.defineProperty(exports, "theme", { enumerable: true, get: function () { return chalk_theme_1.theme; } });
Object.defineProperty(exports, "formatStatus", { enumerable: true, get: function () { return chalk_theme_1.formatStatus; } });
Object.defineProperty(exports, "success", { enumerable: true, get: function () { return chalk_theme_1.success; } });
Object.defineProperty(exports, "error", { enumerable: true, get: function () { return chalk_theme_1.error; } });
Object.defineProperty(exports, "warning", { enumerable: true, get: function () { return chalk_theme_1.warning; } });
Object.defineProperty(exports, "info", { enumerable: true, get: function () { return chalk_theme_1.info; } });
var icons_1 = require("../icons");
Object.defineProperty(exports, "icons", { enumerable: true, get: function () { return icons_1.icons; } });
Object.defineProperty(exports, "ico", { enumerable: true, get: function () { return icons_1.ico; } });
Object.defineProperty(exports, "statusIcons", { enumerable: true, get: function () { return icons_1.status; } });
Object.defineProperty(exports, "arrows", { enumerable: true, get: function () { return icons_1.arrows; } });
Object.defineProperty(exports, "bullets", { enumerable: true, get: function () { return icons_1.bullets; } });
var spacing_1 = require("../spacing");
Object.defineProperty(exports, "getTerminalWidth", { enumerable: true, get: function () { return spacing_1.getTerminalWidth; } });
Object.defineProperty(exports, "spacing", { enumerable: true, get: function () { return spacing_1.spacing; } });
Object.defineProperty(exports, "indent", { enumerable: true, get: function () { return spacing_1.indent; } });
//# sourceMappingURL=index.js.map