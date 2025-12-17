/**
 * DFA Pattern Definitions
 *
 * All PHI detection patterns consolidated in one place for DFA compilation.
 * These patterns are extracted from the Rust scan.rs implementation.
 *
 * PATTERN CATEGORIES:
 * - SSN: 27 patterns (with/without dashes, spaces, context)
 * - PHONE: 36 patterns (US formats, international, extensions)
 * - EMAIL: Standard email patterns
 * - DATE: 10+ patterns (MM/DD/YYYY, written months, etc.)
 * - MRN: 13 patterns (various hospital formats)
 * - CREDIT_CARD: 11 patterns (Visa, MC, Amex, etc.)
 * - And more...
 *
 * FUTURE: These patterns will be compiled into a Zig DFA at build time.
 * For now, they're used by the JavaScript multi-pattern matcher.
 *
 * @module redaction/dfa
 */
import { FilterType } from "../models/Span";
export interface PatternDef {
    id: string;
    regex: RegExp;
    filterType: FilterType;
    confidence: number;
    description: string;
    validator?: (match: string) => boolean;
}
export declare const SSN_PATTERNS: PatternDef[];
export declare const PHONE_PATTERNS: PatternDef[];
export declare const EMAIL_PATTERNS: PatternDef[];
export declare const DATE_PATTERNS: PatternDef[];
export declare const MRN_PATTERNS: PatternDef[];
export declare const CREDIT_CARD_PATTERNS: PatternDef[];
export declare const IP_PATTERNS: PatternDef[];
export declare const ZIPCODE_PATTERNS: PatternDef[];
export declare const ALL_PATTERNS: PatternDef[];
export declare function getPatternStats(): {
    total: number;
    byType: Record<string, number>;
};
//# sourceMappingURL=patterns.d.ts.map