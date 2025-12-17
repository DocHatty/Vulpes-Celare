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
export declare const brand: {
    /** Fox orange - Primary brand color */
    readonly primary: "#FF6B35";
    /** Teal - Secondary accent */
    readonly secondary: "#4ECDC4";
    /** Gold - Highlight/accent */
    readonly accent: "#FFE66D";
    /** Deep orange - Darker variant for contrast */
    readonly primaryDark: "#D63000";
    /** Deep teal - Darker secondary */
    readonly secondaryDark: "#2A9D8F";
};
export declare const semantic: {
    /** Success - Emerald green */
    readonly success: "#10B981";
    /** Warning - Amber */
    readonly warning: "#F59E0B";
    /** Error - Rose red */
    readonly error: "#EF4444";
    /** Info - Blue */
    readonly info: "#3B82F6";
    /** Debug - Purple */
    readonly debug: "#8B5CF6";
};
export declare const neutral: {
    readonly 50: "#FAFAFA";
    readonly 100: "#F4F4F5";
    readonly 200: "#E4E4E7";
    readonly 300: "#D4D4D8";
    readonly 400: "#A1A1AA";
    readonly 500: "#71717A";
    readonly 600: "#52525B";
    readonly 700: "#3F3F46";
    readonly 800: "#27272A";
    readonly 900: "#18181B";
    readonly 950: "#09090B";
};
/**
 * Distinct colors for each PHI type in breakdown displays.
 * Colors chosen for visual distinction while maintaining harmony.
 */
export declare const phi: {
    readonly NAME: "#8B5CF6";
    readonly SSN: "#EF4444";
    readonly PHONE: "#3B82F6";
    readonly EMAIL: "#06B6D4";
    readonly ADDRESS: "#F59E0B";
    readonly DATE: "#10B981";
    readonly MRN: "#EC4899";
    readonly DOB: "#14B8A6";
    readonly AGE: "#84CC16";
    readonly ZIP: "#F97316";
    readonly FAX: "#6366F1";
    readonly URL: "#0EA5E9";
    readonly IP: "#8B5CF6";
    readonly ACCOUNT: "#A855F7";
    readonly LICENSE: "#D946EF";
    readonly VEHICLE: "#64748B";
    readonly DEVICE: "#78716C";
    readonly BIOMETRIC: "#DC2626";
    readonly PASSPORT: "#7C3AED";
    readonly NPI: "#2563EB";
    readonly DEA: "#059669";
    readonly CREDIT_CARD: "#B91C1C";
    readonly HEALTH_PLAN: "#0891B2";
    readonly RELATIVE_DATE: "#65A30D";
    readonly UNIQUE_ID: "#9333EA";
    readonly DEFAULT: "#71717A";
};
export declare const roles: {
    /** User messages */
    readonly user: "#10B981";
    /** Assistant/AI messages */
    readonly assistant: "#3B82F6";
    /** System messages */
    readonly system: "#71717A";
    /** Agent/orchestrator */
    readonly agent: "#8B5CF6";
    /** Tool calls */
    readonly tool: "#EC4899";
    /** Code blocks */
    readonly code: "#60A5FA";
    /** Orchestrator */
    readonly orchestrator: "#F59E0B";
};
export declare const terminal: {
    /** Background for code spans in terminal */
    readonly codeBg: "#1E1E2E";
    /** Highlight for search matches */
    readonly highlight: "#FFE66D";
    /** Dimmed text */
    readonly dim: "#71717A";
    /** Link color */
    readonly link: "#4ECDC4";
};
export declare const colors: {
    readonly brand: {
        /** Fox orange - Primary brand color */
        readonly primary: "#FF6B35";
        /** Teal - Secondary accent */
        readonly secondary: "#4ECDC4";
        /** Gold - Highlight/accent */
        readonly accent: "#FFE66D";
        /** Deep orange - Darker variant for contrast */
        readonly primaryDark: "#D63000";
        /** Deep teal - Darker secondary */
        readonly secondaryDark: "#2A9D8F";
    };
    readonly semantic: {
        /** Success - Emerald green */
        readonly success: "#10B981";
        /** Warning - Amber */
        readonly warning: "#F59E0B";
        /** Error - Rose red */
        readonly error: "#EF4444";
        /** Info - Blue */
        readonly info: "#3B82F6";
        /** Debug - Purple */
        readonly debug: "#8B5CF6";
    };
    readonly neutral: {
        readonly 50: "#FAFAFA";
        readonly 100: "#F4F4F5";
        readonly 200: "#E4E4E7";
        readonly 300: "#D4D4D8";
        readonly 400: "#A1A1AA";
        readonly 500: "#71717A";
        readonly 600: "#52525B";
        readonly 700: "#3F3F46";
        readonly 800: "#27272A";
        readonly 900: "#18181B";
        readonly 950: "#09090B";
    };
    readonly phi: {
        readonly NAME: "#8B5CF6";
        readonly SSN: "#EF4444";
        readonly PHONE: "#3B82F6";
        readonly EMAIL: "#06B6D4";
        readonly ADDRESS: "#F59E0B";
        readonly DATE: "#10B981";
        readonly MRN: "#EC4899";
        readonly DOB: "#14B8A6";
        readonly AGE: "#84CC16";
        readonly ZIP: "#F97316";
        readonly FAX: "#6366F1";
        readonly URL: "#0EA5E9";
        readonly IP: "#8B5CF6";
        readonly ACCOUNT: "#A855F7";
        readonly LICENSE: "#D946EF";
        readonly VEHICLE: "#64748B";
        readonly DEVICE: "#78716C";
        readonly BIOMETRIC: "#DC2626";
        readonly PASSPORT: "#7C3AED";
        readonly NPI: "#2563EB";
        readonly DEA: "#059669";
        readonly CREDIT_CARD: "#B91C1C";
        readonly HEALTH_PLAN: "#0891B2";
        readonly RELATIVE_DATE: "#65A30D";
        readonly UNIQUE_ID: "#9333EA";
        readonly DEFAULT: "#71717A";
    };
    readonly roles: {
        /** User messages */
        readonly user: "#10B981";
        /** Assistant/AI messages */
        readonly assistant: "#3B82F6";
        /** System messages */
        readonly system: "#71717A";
        /** Agent/orchestrator */
        readonly agent: "#8B5CF6";
        /** Tool calls */
        readonly tool: "#EC4899";
        /** Code blocks */
        readonly code: "#60A5FA";
        /** Orchestrator */
        readonly orchestrator: "#F59E0B";
    };
    readonly terminal: {
        /** Background for code spans in terminal */
        readonly codeBg: "#1E1E2E";
        /** Highlight for search matches */
        readonly highlight: "#FFE66D";
        /** Dimmed text */
        readonly dim: "#71717A";
        /** Link color */
        readonly link: "#4ECDC4";
    };
};
export type ColorKey = keyof typeof colors;
export type BrandColor = keyof typeof brand;
export type SemanticColor = keyof typeof semantic;
export type NeutralShade = keyof typeof neutral;
export type PHIType = keyof typeof phi;
export type RoleColor = keyof typeof roles;
//# sourceMappingURL=colors.d.ts.map