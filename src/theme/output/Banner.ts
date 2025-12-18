/**
 * ============================================================================
 * VULPES CELARE - BANNER OUTPUT COMPONENT
 * ============================================================================
 *
 * Unified banner system for consistent application branding.
 * Includes ASCII art, version display, and responsive layouts.
 *
 * Usage:
 *   import { Banner } from '../theme/output';
 *
 *   console.log(Banner.logo());
 *   console.log(Banner.full({ version: '1.0.0' }));
 */

import { theme } from "../chalk-theme";
// Box drawing imported for potential future enhancements
import { getTerminalWidth } from "../spacing";
import { Box } from "./Box";

// ============================================================================
// ASCII ART
// ============================================================================

/**
 * Compact fox logo (fits in ~30 columns)
 */
const FOX_COMPACT = [
  "  /\\   /\\  ",
  " /  \\_/  \\ ",
  " \\  ' '  / ",
  "  \\ === /  ",
  "   \\   /   ",
];

/**
 * Medium fox logo (~40 columns)
 */
const FOX_MEDIUM = [
  "    /\\      /\\    ",
  "   /  \\    /  \\   ",
  "  /    \\__/    \\  ",
  " |    '    '    | ",
  "  \\    ====    /  ",
  "   \\          /   ",
  "    \\________/    ",
];

/**
 * Large fox logo (~50 columns)
 */
const FOX_LARGE = [
  "      /\\          /\\      ",
  "     /  \\        /  \\     ",
  "    /    \\      /    \\    ",
  "   /      \\____/      \\   ",
  "  |                    |  ",
  "  |     '        '     |  ",
  "   \\                  /   ",
  "    \\     ======     /    ",
  "     \\              /     ",
  "      \\____________/      ",
];

/**
 * Text-only logo
 */
const LOGO_TEXT = "VULPES CELARE";
const TAGLINE = "HIPAA-Compliant PHI Redaction";

// ============================================================================
// BANNER CLASS
// ============================================================================

export interface BannerOptions {
  /** Application version */
  version?: string;
  /** Show the fox ASCII art */
  showArt?: boolean;
  /** Art size preference */
  artSize?: "compact" | "medium" | "large" | "auto";
  /** Show tagline */
  showTagline?: boolean;
  /** Show border around banner */
  bordered?: boolean;
  /** Centered output */
  centered?: boolean;
  /** Custom subtitle */
  subtitle?: string;
}

export class Banner {
  /**
   * Get the fox ASCII art based on terminal width
   */
  static fox(size: "compact" | "medium" | "large" | "auto" = "auto"): string {
    let art: string[];

    if (size === "auto") {
      const width = getTerminalWidth();
      if (width < 40) {
        art = FOX_COMPACT;
      } else if (width < 60) {
        art = FOX_MEDIUM;
      } else {
        art = FOX_LARGE;
      }
    } else {
      art = size === "compact" ? FOX_COMPACT
        : size === "medium" ? FOX_MEDIUM
        : FOX_LARGE;
    }

    return art.map(line => theme.primary(line)).join("\n");
  }

  /**
   * Get the text logo
   */
  static logo(options: { colored?: boolean } = {}): string {
    const { colored = true } = options;
    return colored ? theme.primary.bold(LOGO_TEXT) : LOGO_TEXT;
  }

  /**
   * Get the tagline
   */
  static tagline(options: { colored?: boolean } = {}): string {
    const { colored = true } = options;
    return colored ? theme.muted(TAGLINE) : TAGLINE;
  }

  /**
   * Create a minimal banner (text only)
   */
  static minimal(options: BannerOptions = {}): string {
    const { version, showTagline = false } = options;

    const parts: string[] = [this.logo()];

    if (version) {
      parts[0] += theme.muted(` v${version}`);
    }

    if (showTagline) {
      parts.push(this.tagline());
    }

    return parts.join("\n");
  }

  /**
   * Create a standard banner with optional art
   */
  static standard(options: BannerOptions = {}): string {
    const {
      version,
      showArt = true,
      artSize = "auto",
      showTagline = true,
      centered = true,
    } = options;

    const lines: string[] = [];

    if (showArt) {
      lines.push(this.fox(artSize));
      lines.push("");
    }

    let logoLine = this.logo();
    if (version) {
      logoLine += theme.muted(` v${version}`);
    }
    lines.push(logoLine);

    if (showTagline) {
      lines.push(this.tagline());
    }

    if (centered) {
      const termWidth = getTerminalWidth();
      return lines.map(line => {
        if (!line) return line;
        const lineLines = line.split("\n");
        return lineLines.map(l => {
          const stripped = l.replace(/\x1b\[[0-9;]*m/g, "");
          const padding = Math.max(0, Math.floor((termWidth - stripped.length) / 2));
          return " ".repeat(padding) + l;
        }).join("\n");
      }).join("\n");
    }

    return lines.join("\n");
  }

  /**
   * Create a full banner in a box
   */
  static full(options: BannerOptions = {}): string {
    const {
      version,
      showArt = true,
      artSize = "compact",
      showTagline = true,
      subtitle,
    } = options;

    const content: string[] = [];

    if (showArt) {
      // Use compact art for boxed version
      const art = artSize === "compact" ? FOX_COMPACT
        : artSize === "medium" ? FOX_MEDIUM
        : FOX_COMPACT;
      content.push(...art.map(l => theme.primary(l)));
      content.push("");
    }

    let logoLine = theme.primary.bold(LOGO_TEXT);
    if (version) {
      logoLine += theme.muted(` v${version}`);
    }
    content.push(logoLine);

    if (showTagline) {
      content.push(theme.muted(TAGLINE));
    }

    if (subtitle) {
      content.push("");
      content.push(theme.info(subtitle));
    }

    return Box.vulpes(content, {
      align: "center",
      padding: 2,
    });
  }

  /**
   * Create a compact inline banner
   */
  static inline(version?: string): string {
    const v = version ? theme.muted(` v${version}`) : "";
    return `${theme.primary("\u25C8")} ${theme.primary.bold("Vulpes Celare")}${v}`;
  }

  /**
   * Create a startup banner (shown when CLI starts)
   */
  static startup(options: BannerOptions = {}): string {
    const width = getTerminalWidth();

    // Use minimal banner for narrow terminals
    if (width < 50) {
      return this.minimal(options);
    }

    // Use standard banner for medium terminals
    if (width < 80) {
      return this.standard({
        ...options,
        artSize: "compact",
      });
    }

    // Use full banner for wide terminals
    return this.standard({
      ...options,
      artSize: "medium",
    });
  }

  /**
   * Create a completion banner
   */
  static completion(stats?: {
    duration?: string;
    itemsProcessed?: number;
    redactionsFound?: number;
  }): string {
    const lines: string[] = [
      theme.success.bold("Redaction Complete"),
    ];

    if (stats) {
      if (stats.duration) {
        lines.push(theme.muted(`Duration: ${stats.duration}`));
      }
      if (stats.itemsProcessed !== undefined) {
        lines.push(theme.muted(`Items processed: ${stats.itemsProcessed}`));
      }
      if (stats.redactionsFound !== undefined) {
        lines.push(theme.muted(`Redactions: ${stats.redactionsFound}`));
      }
    }

    return Box.success(lines, { style: "rounded" });
  }

  /**
   * Create an error banner
   */
  static error(message: string, details?: string): string {
    const lines: string[] = [message];

    if (details) {
      lines.push("");
      lines.push(theme.muted(details));
    }

    return Box.error(lines, { style: "rounded" });
  }
}

export default Banner;
