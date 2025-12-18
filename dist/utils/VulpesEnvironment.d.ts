/**
 * Vulpes Celare - Environment Detection
 *
 * Comprehensive CI/CD environment detection for adaptive behavior.
 * Detects TTY, CI providers, and adjusts output accordingly.
 */
export type CIProvider = "github_actions" | "gitlab_ci" | "jenkins" | "circleci" | "travis" | "azure_pipelines" | "bitbucket_pipelines" | "drone" | "teamcity" | "buildkite" | "appveyor" | "codebuild" | "bamboo" | "semaphore" | "buddy" | "woodpecker" | "unknown";
export type ShellType = "bash" | "zsh" | "fish" | "powershell" | "cmd" | "unknown";
export type TerminalEmulator = "iterm" | "hyper" | "alacritty" | "kitty" | "wezterm" | "windows_terminal" | "vscode" | "xterm" | "gnome_terminal" | "konsole" | "terminal_app" | "unknown";
export interface ColorSupport {
    level: 0 | 1 | 2 | 3;
    hasBasic: boolean;
    has256: boolean;
    has16m: boolean;
}
export interface EnvironmentInfo {
    isCI: boolean;
    ciProvider: CIProvider | null;
    ciName: string | null;
    buildId: string | null;
    buildUrl: string | null;
    branch: string | null;
    commitSha: string | null;
    pullRequestNumber: string | null;
    isPullRequest: boolean;
    isTTY: boolean;
    isInteractive: boolean;
    hasStdin: boolean;
    hasStdout: boolean;
    hasStderr: boolean;
    colorSupport: ColorSupport;
    noColor: boolean;
    forceColor: boolean;
    shell: ShellType;
    terminalEmulator: TerminalEmulator;
    termWidth: number;
    termHeight: number;
    platform: NodeJS.Platform;
    isWindows: boolean;
    isMacOS: boolean;
    isLinux: boolean;
    nodeVersion: string;
    npmVersion: string | null;
    isDebug: boolean;
    isVerbose: boolean;
    isQuiet: boolean;
    logLevel: string;
    traceEnabled: boolean;
}
export declare class VulpesEnvironment {
    private static instance;
    private cachedInfo;
    private constructor();
    static getInstance(): VulpesEnvironment;
    static resetInstance(): void;
    /**
     * Get comprehensive environment information.
     * Results are cached for performance.
     */
    getInfo(refresh?: boolean): EnvironmentInfo;
    get isCI(): boolean;
    get isTTY(): boolean;
    get isInteractive(): boolean;
    get ciProvider(): CIProvider | null;
    get ciName(): string | null;
    /**
     * Should we show animated spinners?
     * No in CI, no if not interactive TTY
     */
    shouldShowSpinners(): boolean;
    /**
     * Should we use colors in output?
     * Respects NO_COLOR, FORCE_COLOR, and TTY detection
     */
    shouldUseColor(): boolean;
    /**
     * Should we use progress bars?
     * No in CI (use percentage logging instead)
     */
    shouldShowProgressBars(): boolean;
    /**
     * Should we use emoji in output?
     * Some terminals/CI don't render emoji well
     */
    shouldUseEmoji(): boolean;
    /**
     * Should output be machine-readable JSON?
     * Yes if not a TTY (likely piped) or explicitly requested
     */
    shouldOutputJSON(): boolean;
    /**
     * Get recommended output width
     * Accounts for narrow terminals and CI defaults
     */
    getOutputWidth(): number;
    /**
     * Should we show verbose output?
     */
    shouldBeVerbose(): boolean;
    /**
     * Should we suppress non-essential output?
     */
    shouldBeQuiet(): boolean;
    /**
     * Output a GitHub Actions annotation (error, warning, notice)
     */
    outputGitHubAnnotation(type: "error" | "warning" | "notice", message: string, options?: {
        file?: string;
        line?: number;
        col?: number;
        title?: string;
    }): void;
    /**
     * Start a GitHub Actions group
     */
    startGroup(name: string): void;
    /**
     * End a GitHub Actions group
     */
    endGroup(name?: string): void;
    /**
     * Set an output variable for CI
     */
    setOutput(name: string, value: string): void;
    /**
     * Mask a value from appearing in logs
     */
    maskValue(value: string): void;
    private detectIsCI;
    private detectCI;
}
export declare const vulpesEnvironment: VulpesEnvironment;
export declare function isCI(): boolean;
export declare function isTTY(): boolean;
export declare function isInteractive(): boolean;
export declare function shouldUseColor(): boolean;
export declare function getCIProvider(): CIProvider | null;
export declare function getEnvironmentInfo(): EnvironmentInfo;
//# sourceMappingURL=VulpesEnvironment.d.ts.map