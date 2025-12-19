/**
 * ============================================================================
 * VULPES CELARE CLI - Core Implementation
 * ============================================================================
 *
 * Beautiful, production-grade CLI implementation with:
 * - Rich colored output
 * - Progress indicators
 * - Interactive mode
 * - Batch processing
 * - Multiple output formats
 */
import { RedactOptions, BatchOptions, InteractiveOptions, AnalyzeOptions, InfoOptions, FiltersOptions, BenchmarkOptions, StreamOptions, PolicyCompileOptions } from "./types";
export declare class CLI {
    private static spinner;
    static getBanner(): string;
    static printBanner(): void;
    static log(message: string): void;
    static success(message: string): void;
    static error(message: string): void;
    static warn(message: string): void;
    static infoMsg(message: string): void;
    static divider(): void;
    static newline(): void;
    static startSpinner(text: string): void;
    static updateSpinner(text: string): void;
    static succeedSpinner(text?: string): void;
    static failSpinner(text?: string): void;
    static stopSpinner(): void;
    static progressBar(current: number, total: number, width?: number): string;
    private static parseConfig;
    static redact(file: string | undefined, options: RedactOptions): Promise<void>;
    static batch(directory: string, options: BatchOptions): Promise<void>;
    static interactive(options: InteractiveOptions): Promise<void>;
    static analyze(file: string, options: AnalyzeOptions): Promise<void>;
    static policyList(): Promise<void>;
    static policyShow(name: string): Promise<void>;
    static policyCompile(file: string, options: PolicyCompileOptions): Promise<void>;
    static policyValidate(file: string): Promise<void>;
    static info(options: InfoOptions): Promise<void>;
    static filters(options: FiltersOptions): Promise<void>;
    static benchmark(options: BenchmarkOptions): Promise<void>;
    static stream(options: StreamOptions): Promise<void>;
    private static readStdin;
    private static findFiles;
    private static formatOutput;
    private static printBreakdown;
    private static printInteractiveHelp;
    private static printSessionStats;
    private static highlightRedactions;
    private static getPhiColor;
    private static getTableChars;
    static deepAnalyze(options: {
        threshold?: string;
        force?: boolean;
        deep?: boolean;
        enhanced?: boolean;
        production?: boolean;
        selfCorrect?: boolean;
        checkpoints?: boolean;
        report?: boolean;
        json?: boolean;
        verbose?: boolean;
    }): Promise<void>;
    static runTests(options: {
        count?: string;
        profile?: string;
        selfCorrect?: boolean;
        checkpoints?: boolean;
        quick?: boolean;
        thorough?: boolean;
        logFile?: boolean;
        verbose?: boolean;
    }): Promise<void>;
    static diagnose(options: {
        json?: boolean;
        verbose?: boolean;
    }): Promise<void>;
}
//# sourceMappingURL=CLI.d.ts.map