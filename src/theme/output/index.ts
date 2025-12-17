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

// ============================================================================
// COMPONENT EXPORTS
// ============================================================================

export { Box } from "./Box";
export type { BoxStyle, BoxAlign, BoxOptions } from "./Box";

export { Table } from "./Table";
export type { TableStyle, TableAlign, TableOptions } from "./Table";

export { Progress } from "./Progress";
export type { ProgressStyle, ProgressBarOptions, StageOptions } from "./Progress";

export { Spinner, spin, withSpinner, spinnerFrame } from "./Spinner";
export type { SpinnerStyle, SpinnerOptions } from "./Spinner";

export { Divider } from "./Divider";
export type { DividerStyle, DividerAlign, DividerOptions, TitledDividerOptions } from "./Divider";

export { Banner } from "./Banner";
export type { BannerOptions } from "./Banner";

export { Status } from "./Status";
export type { StatusType, StatusOptions } from "./Status";

export { RedactionDisplay } from "./RedactionDisplay";
export type { RedactionResult, DisplayOptions } from "./RedactionDisplay";

export {
  sparkline,
  gauge,
  LiveCounter,
  phiBreakdownBar,
  phiBreakdownWithLegend,
  healthIndicator,
  metricsDashboard,
  AnimatedProgress,
} from "./LiveMetrics";
export type {
  SparklineOptions,
  GaugeOptions,
  PHIBreakdown,
  HealthStatus,
  HealthIndicatorOptions,
  DashboardMetrics,
  AnimatedProgressOptions,
} from "./LiveMetrics";

export {
  RedactionReporter,
  renderRedactionResult,
  renderRedactionCompact,
  highlightPhi,
} from "./RedactionReporter";
export type { RedactionSpan, RedactionResult as ReporterRedactionResult, ReporterOptions } from "./RedactionReporter";

// ============================================================================
// CONVENIENCE RE-EXPORTS
// ============================================================================

// Re-export commonly used theme utilities for convenience
export { theme, formatStatus, success, error, warning, info } from "../chalk-theme";
export { icons, ico, status as statusIcons, arrows, bullets } from "../icons";
export { getTerminalWidth, spacing, indent } from "../spacing";
