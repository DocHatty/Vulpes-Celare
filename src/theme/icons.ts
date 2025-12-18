/**
 * ============================================================================
 * VULPES CELARE - UNIFIED ICON SYSTEM
 * ============================================================================
 *
 * Refined Unicode icons for consistent visual language across the CLI.
 * Uses Unicode symbols rather than emoji for:
 * - Consistent rendering across terminals
 * - Precise sizing control
 * - Professional appearance
 * - Better accessibility
 */

// ============================================================================
// STATUS ICONS
// ============================================================================

export const status = {
  /** Success/completed */
  success: "\u2713", // ✓
  /** Error/failed */
  error: "\u2717", // ✗
  /** Warning */
  warning: "\u26A0", // ⚠
  /** Info */
  info: "\u2139", // ℹ
  /** Pending/waiting */
  pending: "\u25CB", // ○
  /** In progress */
  progress: "\u25CF", // ●
  /** Skipped */
  skipped: "\u2212", // −
  /** Question/unknown */
  question: "?",
} as const;

// ============================================================================
// NAVIGATION & ARROWS
// ============================================================================

export const arrows = {
  /** Right arrow */
  right: "\u2192", // →
  /** Left arrow */
  left: "\u2190", // ←
  /** Up arrow */
  up: "\u2191", // ↑
  /** Down arrow */
  down: "\u2193", // ↓
  /** Double right (continue) */
  doubleRight: "\u00BB", // »
  /** Double left */
  doubleLeft: "\u00AB", // «
  /** Triangle right (play) */
  play: "\u25B6", // ▶
  /** Triangle down (dropdown) */
  dropdown: "\u25BC", // ▼
} as const;

// ============================================================================
// BULLETS & MARKERS
// ============================================================================

export const bullets = {
  /** Standard bullet */
  dot: "\u2022", // •
  /** Hollow bullet */
  circle: "\u25E6", // ◦
  /** Diamond */
  diamond: "\u25C6", // ◆
  /** Hollow diamond */
  diamondOutline: "\u25C7", // ◇
  /** Star */
  star: "\u2605", // ★
  /** Hollow star */
  starOutline: "\u2606", // ☆
  /** Square */
  square: "\u25A0", // ■
  /** Hollow square */
  squareOutline: "\u25A1", // □
} as const;

// ============================================================================
// BOX DRAWING - ROUNDED
// ============================================================================

export const boxRounded = {
  topLeft: "\u256D", // ╭
  topRight: "\u256E", // ╮
  bottomLeft: "\u2570", // ╰
  bottomRight: "\u256F", // ╯
  horizontal: "\u2500", // ─
  vertical: "\u2502", // │
  teeRight: "\u251C", // ├
  teeLeft: "\u2524", // ┤
  teeDown: "\u252C", // ┬
  teeUp: "\u2534", // ┴
  cross: "\u253C", // ┼
} as const;

// ============================================================================
// BOX DRAWING - SHARP
// ============================================================================

export const boxSharp = {
  topLeft: "\u250C", // ┌
  topRight: "\u2510", // ┐
  bottomLeft: "\u2514", // └
  bottomRight: "\u2518", // ┘
  horizontal: "\u2500", // ─
  vertical: "\u2502", // │
  teeRight: "\u251C", // ├
  teeLeft: "\u2524", // ┤
  teeDown: "\u252C", // ┬
  teeUp: "\u2534", // ┴
  cross: "\u253C", // ┼
} as const;

// ============================================================================
// BOX DRAWING - DOUBLE
// ============================================================================

export const boxDouble = {
  topLeft: "\u2554", // ╔
  topRight: "\u2557", // ╗
  bottomLeft: "\u255A", // ╚
  bottomRight: "\u255D", // ╝
  horizontal: "\u2550", // ═
  vertical: "\u2551", // ║
  teeRight: "\u2560", // ╠
  teeLeft: "\u2563", // ╣
  teeDown: "\u2566", // ╦
  teeUp: "\u2569", // ╩
  cross: "\u256C", // ╬
} as const;

// ============================================================================
// BOX DRAWING - HEAVY
// ============================================================================

export const boxHeavy = {
  topLeft: "\u250F", // ┏
  topRight: "\u2513", // ┓
  bottomLeft: "\u2517", // ┗
  bottomRight: "\u251B", // ┛
  horizontal: "\u2501", // ━
  vertical: "\u2503", // ┃
  teeRight: "\u2523", // ┣
  teeLeft: "\u252B", // ┫
  teeDown: "\u2533", // ┳
  teeUp: "\u253B", // ┻
  cross: "\u254B", // ╋
} as const;

// ============================================================================
// PROGRESS & LOADING
// ============================================================================

export const progress = {
  /** Filled block */
  filled: "\u2588", // █
  /** Light shade */
  light: "\u2591", // ░
  /** Medium shade */
  medium: "\u2592", // ▒
  /** Dark shade */
  dark: "\u2593", // ▓
  /** Empty (for progress bar) */
  empty: "\u2591", // ░
} as const;

/** Spinner frames for animation */
export const spinnerFrames = {
  dots: ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"],
  line: ["-", "\\", "|", "/"],
  circle: ["\u25DC", "\u25DD", "\u25DE", "\u25DF"],
  bounce: ["\u2801", "\u2802", "\u2804", "\u2840", "\u2880", "\u2820", "\u2810", "\u2808"],
} as const;

// ============================================================================
// SEMANTIC ICONS
// ============================================================================

export const semantic = {
  /** Shield (security/protection) */
  shield: "\u229E", // ⊞ (or use 🛡 if emoji acceptable)
  /** Lock */
  lock: "\u2387", // ⎇
  /** Key */
  key: "\u2387", // ⎇
  /** File */
  file: "\u25A1", // □
  /** Folder */
  folder: "\u25A0", // ■
  /** Search/magnifier */
  search: "\u26B2", // ⚲
  /** Settings/gear */
  settings: "\u2699", // ⚙
  /** Redacted block */
  redacted: "\u2588", // █
  /** PHI marker */
  phi: "\u2295", // ⊕
  /** Clock/time */
  clock: "\u23F0", // ⏰
  /** Lightning (fast) */
  lightning: "\u26A1", // ⚡
} as const;

// ============================================================================
// DIVIDERS
// ============================================================================

export const dividers = {
  /** Light horizontal line */
  light: "\u2500", // ─
  /** Heavy horizontal line */
  heavy: "\u2501", // ━
  /** Double horizontal line */
  double: "\u2550", // ═
  /** Dotted */
  dotted: "\u2508", // ┈
  /** Dashed */
  dashed: "\u254C", // ╌
} as const;

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const icons = {
  status,
  arrows,
  bullets,
  boxRounded,
  boxSharp,
  boxDouble,
  boxHeavy,
  progress,
  spinnerFrames,
  semantic,
  dividers,
} as const;

// ============================================================================
// CONVENIENCE SHORTCUTS
// ============================================================================

/** Quick access to common icons */
export const ico = {
  // Status
  ok: status.success,
  err: status.error,
  warn: status.warning,
  info: status.info,

  // Arrows
  arrow: arrows.right,
  play: arrows.play,

  // Bullets
  bullet: bullets.dot,
  diamond: bullets.diamond,

  // Progress
  block: progress.filled,
  shade: progress.light,

  // Semantic
  redacted: semantic.redacted,
  phi: semantic.phi,
} as const;
