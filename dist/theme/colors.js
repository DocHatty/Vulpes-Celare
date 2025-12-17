"use strict";
/**
 * ============================================================================
 * VULPES CELARE - UNIFIED COLOR SYSTEM
 * ============================================================================
 *
 * Sophisticated, cohesive color palette for the entire application.
 * All colors are carefully chosen for:
 * - Visual harmony and brand consistency
 * - Accessibility (WCAG contrast ratios)
 * - Semantic clarity
 * - Terminal compatibility
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.colors = exports.terminal = exports.roles = exports.phi = exports.neutral = exports.semantic = exports.brand = void 0;
// ============================================================================
// BRAND COLORS
// ============================================================================
exports.brand = {
    /** Fox orange - Primary brand color */
    primary: "#FF6B35",
    /** Teal - Secondary accent */
    secondary: "#4ECDC4",
    /** Gold - Highlight/accent */
    accent: "#FFE66D",
    /** Deep orange - Darker variant for contrast */
    primaryDark: "#D63000",
    /** Deep teal - Darker secondary */
    secondaryDark: "#2A9D8F",
};
// ============================================================================
// SEMANTIC COLORS
// ============================================================================
exports.semantic = {
    /** Success - Emerald green */
    success: "#10B981",
    /** Warning - Amber */
    warning: "#F59E0B",
    /** Error - Rose red */
    error: "#EF4444",
    /** Info - Blue */
    info: "#3B82F6",
    /** Debug - Purple */
    debug: "#8B5CF6",
};
// ============================================================================
// NEUTRAL PALETTE
// ============================================================================
exports.neutral = {
    50: "#FAFAFA",
    100: "#F4F4F5",
    200: "#E4E4E7",
    300: "#D4D4D8",
    400: "#A1A1AA",
    500: "#71717A",
    600: "#52525B",
    700: "#3F3F46",
    800: "#27272A",
    900: "#18181B",
    950: "#09090B",
};
// ============================================================================
// PHI TYPE COLORS
// ============================================================================
/**
 * Distinct colors for each PHI type in breakdown displays.
 * Colors chosen for visual distinction while maintaining harmony.
 */
exports.phi = {
    NAME: "#8B5CF6", // Violet
    SSN: "#EF4444", // Red - high sensitivity
    PHONE: "#3B82F6", // Blue
    EMAIL: "#06B6D4", // Cyan
    ADDRESS: "#F59E0B", // Amber
    DATE: "#10B981", // Green
    MRN: "#EC4899", // Pink
    DOB: "#14B8A6", // Teal
    AGE: "#84CC16", // Lime
    ZIP: "#F97316", // Orange
    FAX: "#6366F1", // Indigo
    URL: "#0EA5E9", // Sky
    IP: "#8B5CF6", // Violet
    ACCOUNT: "#A855F7", // Purple
    LICENSE: "#D946EF", // Fuchsia
    VEHICLE: "#64748B", // Slate
    DEVICE: "#78716C", // Stone
    BIOMETRIC: "#DC2626", // Red-600
    PASSPORT: "#7C3AED", // Violet-600
    NPI: "#2563EB", // Blue-600
    DEA: "#059669", // Emerald-600
    CREDIT_CARD: "#B91C1C", // Red-700
    HEALTH_PLAN: "#0891B2", // Cyan-600
    RELATIVE_DATE: "#65A30D", // Lime-600
    UNIQUE_ID: "#9333EA", // Purple-600
    DEFAULT: "#71717A", // Neutral-500
};
// ============================================================================
// ROLE COLORS (for chat/agent interfaces)
// ============================================================================
exports.roles = {
    /** User messages */
    user: "#10B981",
    /** Assistant/AI messages */
    assistant: "#3B82F6",
    /** System messages */
    system: "#71717A",
    /** Agent/orchestrator */
    agent: "#8B5CF6",
    /** Tool calls */
    tool: "#EC4899",
    /** Code blocks */
    code: "#60A5FA",
    /** Orchestrator */
    orchestrator: "#F59E0B",
};
// ============================================================================
// TERMINAL-SPECIFIC
// ============================================================================
exports.terminal = {
    /** Background for code spans in terminal */
    codeBg: "#1E1E2E",
    /** Highlight for search matches */
    highlight: "#FFE66D",
    /** Dimmed text */
    dim: "#71717A",
    /** Link color */
    link: "#4ECDC4",
};
// ============================================================================
// COMBINED EXPORT
// ============================================================================
exports.colors = {
    brand: exports.brand,
    semantic: exports.semantic,
    neutral: exports.neutral,
    phi: exports.phi,
    roles: exports.roles,
    terminal: exports.terminal,
};
//# sourceMappingURL=colors.js.map