/**
 * ============================================================================
 * VULPES CELARE - SPACING SYSTEM
 * ============================================================================
 *
 * Consistent spacing scale for padding, margins, and gaps.
 * Based on a 4px base unit for harmonious proportions.
 */
/**
 * Spacing scale in terminal columns/characters.
 * For CLI, 1 unit = 1 character width.
 */
export declare const spacing: {
    /** 0 - No spacing */
    readonly none: 0;
    /** 1 character */
    readonly xs: 1;
    /** 2 characters */
    readonly sm: 2;
    /** 4 characters */
    readonly md: 4;
    /** 6 characters */
    readonly lg: 6;
    /** 8 characters */
    readonly xl: 8;
    /** 12 characters */
    readonly "2xl": 12;
    /** 16 characters */
    readonly "3xl": 16;
    /** 24 characters */
    readonly "4xl": 24;
};
export declare const padding: {
    /** No padding */
    readonly none: {
        readonly top: 0;
        readonly right: 0;
        readonly bottom: 0;
        readonly left: 0;
    };
    /** Compact padding (1 char horizontal, 0 vertical) */
    readonly compact: {
        readonly top: 0;
        readonly right: 1;
        readonly bottom: 0;
        readonly left: 1;
    };
    /** Small padding */
    readonly sm: {
        readonly top: 0;
        readonly right: 2;
        readonly bottom: 0;
        readonly left: 2;
    };
    /** Medium padding */
    readonly md: {
        readonly top: 1;
        readonly right: 4;
        readonly bottom: 1;
        readonly left: 4;
    };
    /** Large padding */
    readonly lg: {
        readonly top: 2;
        readonly right: 6;
        readonly bottom: 2;
        readonly left: 6;
    };
};
export declare const indent: {
    /** No indent */
    readonly none: "";
    /** Single level (2 spaces) */
    readonly single: "  ";
    /** Double level (4 spaces) */
    readonly double: "    ";
    /** Triple level (6 spaces) */
    readonly triple: "      ";
    /** Quad level (8 spaces) */
    readonly quad: "        ";
};
/**
 * Generate indentation string
 */
export declare function indentStr(level: number, char?: string, width?: number): string;
export declare const lineSpacing: {
    /** No extra lines */
    readonly none: 0;
    /** Single blank line */
    readonly single: 1;
    /** Double blank lines */
    readonly double: 2;
};
/**
 * Generate blank lines
 */
export declare function blankLines(count: number): string;
/**
 * Get terminal width with fallback
 */
export declare function getTerminalWidth(fallback?: number): number;
/**
 * Calculate content width accounting for padding
 */
export declare function getContentWidth(padding: {
    left: number;
    right: number;
}, terminalWidth?: number): number;
/**
 * Common width presets
 */
export declare const widths: {
    /** Narrow content (50 chars or 60% of terminal) */
    readonly narrow: () => number;
    /** Medium content (70 chars or 80% of terminal) */
    readonly medium: () => number;
    /** Wide content (90 chars or 95% of terminal) */
    readonly wide: () => number;
    /** Full terminal width */
    readonly full: () => number;
};
export declare const spacingSystem: {
    readonly spacing: {
        /** 0 - No spacing */
        readonly none: 0;
        /** 1 character */
        readonly xs: 1;
        /** 2 characters */
        readonly sm: 2;
        /** 4 characters */
        readonly md: 4;
        /** 6 characters */
        readonly lg: 6;
        /** 8 characters */
        readonly xl: 8;
        /** 12 characters */
        readonly "2xl": 12;
        /** 16 characters */
        readonly "3xl": 16;
        /** 24 characters */
        readonly "4xl": 24;
    };
    readonly padding: {
        /** No padding */
        readonly none: {
            readonly top: 0;
            readonly right: 0;
            readonly bottom: 0;
            readonly left: 0;
        };
        /** Compact padding (1 char horizontal, 0 vertical) */
        readonly compact: {
            readonly top: 0;
            readonly right: 1;
            readonly bottom: 0;
            readonly left: 1;
        };
        /** Small padding */
        readonly sm: {
            readonly top: 0;
            readonly right: 2;
            readonly bottom: 0;
            readonly left: 2;
        };
        /** Medium padding */
        readonly md: {
            readonly top: 1;
            readonly right: 4;
            readonly bottom: 1;
            readonly left: 4;
        };
        /** Large padding */
        readonly lg: {
            readonly top: 2;
            readonly right: 6;
            readonly bottom: 2;
            readonly left: 6;
        };
    };
    readonly indent: {
        /** No indent */
        readonly none: "";
        /** Single level (2 spaces) */
        readonly single: "  ";
        /** Double level (4 spaces) */
        readonly double: "    ";
        /** Triple level (6 spaces) */
        readonly triple: "      ";
        /** Quad level (8 spaces) */
        readonly quad: "        ";
    };
    readonly lineSpacing: {
        /** No extra lines */
        readonly none: 0;
        /** Single blank line */
        readonly single: 1;
        /** Double blank lines */
        readonly double: 2;
    };
    readonly widths: {
        /** Narrow content (50 chars or 60% of terminal) */
        readonly narrow: () => number;
        /** Medium content (70 chars or 80% of terminal) */
        readonly medium: () => number;
        /** Wide content (90 chars or 95% of terminal) */
        readonly wide: () => number;
        /** Full terminal width */
        readonly full: () => number;
    };
    readonly indentStr: typeof indentStr;
    readonly blankLines: typeof blankLines;
    readonly getTerminalWidth: typeof getTerminalWidth;
    readonly getContentWidth: typeof getContentWidth;
};
//# sourceMappingURL=spacing.d.ts.map