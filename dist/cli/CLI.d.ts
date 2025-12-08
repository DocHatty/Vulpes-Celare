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
    static redact(file: string | undefined, options: any): Promise<void>;
    static batch(directory: string, options: any): Promise<void>;
    static interactive(options: any): Promise<void>;
    static analyze(file: string, options: any): Promise<void>;
    static policyList(): Promise<void>;
    static policyShow(name: string): Promise<void>;
    static policyCompile(file: string, options: any): Promise<void>;
    static policyValidate(file: string): Promise<void>;
    static info(options: any): Promise<void>;
    static filters(options: any): Promise<void>;
    static benchmark(options: any): Promise<void>;
    static stream(options: any): Promise<void>;
    private static readStdin;
    private static findFiles;
    private static formatOutput;
    private static printBreakdown;
    private static printInteractiveHelp;
    private static printSessionStats;
    private static highlightRedactions;
    private static getPhiColor;
    private static getTableChars;
}
//# sourceMappingURL=CLI.d.ts.map