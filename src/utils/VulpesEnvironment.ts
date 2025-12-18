/**
 * Vulpes Celare - Environment Detection
 *
 * Comprehensive CI/CD environment detection for adaptive behavior.
 * Detects TTY, CI providers, and adjusts output accordingly.
 */

// ============================================================================
// Types
// ============================================================================

export type CIProvider =
  | "github_actions"
  | "gitlab_ci"
  | "jenkins"
  | "circleci"
  | "travis"
  | "azure_pipelines"
  | "bitbucket_pipelines"
  | "drone"
  | "teamcity"
  | "buildkite"
  | "appveyor"
  | "codebuild"
  | "bamboo"
  | "semaphore"
  | "buddy"
  | "woodpecker"
  | "unknown";

export type ShellType =
  | "bash"
  | "zsh"
  | "fish"
  | "powershell"
  | "cmd"
  | "unknown";

export type TerminalEmulator =
  | "iterm"
  | "hyper"
  | "alacritty"
  | "kitty"
  | "wezterm"
  | "windows_terminal"
  | "vscode"
  | "xterm"
  | "gnome_terminal"
  | "konsole"
  | "terminal_app"
  | "unknown";

export interface ColorSupport {
  level: 0 | 1 | 2 | 3;
  hasBasic: boolean;
  has256: boolean;
  has16m: boolean;
}

export interface EnvironmentInfo {
  // CI Detection
  isCI: boolean;
  ciProvider: CIProvider | null;
  ciName: string | null;
  buildId: string | null;
  buildUrl: string | null;
  branch: string | null;
  commitSha: string | null;
  pullRequestNumber: string | null;
  isPullRequest: boolean;

  // Terminal Detection
  isTTY: boolean;
  isInteractive: boolean;
  hasStdin: boolean;
  hasStdout: boolean;
  hasStderr: boolean;

  // Color Support
  colorSupport: ColorSupport;
  noColor: boolean;
  forceColor: boolean;

  // Shell & Terminal
  shell: ShellType;
  terminalEmulator: TerminalEmulator;
  termWidth: number;
  termHeight: number;

  // OS & Runtime
  platform: NodeJS.Platform;
  isWindows: boolean;
  isMacOS: boolean;
  isLinux: boolean;
  nodeVersion: string;
  npmVersion: string | null;

  // Vulpes-specific
  isDebug: boolean;
  isVerbose: boolean;
  isQuiet: boolean;
  logLevel: string;
  traceEnabled: boolean;
}

// ============================================================================
// CI Provider Detection
// ============================================================================

interface CIDetector {
  name: CIProvider;
  displayName: string;
  detect: () => boolean;
  getBuildId: () => string | null;
  getBuildUrl: () => string | null;
  getBranch: () => string | null;
  getCommitSha: () => string | null;
  getPullRequest: () => string | null;
}

const CI_DETECTORS: CIDetector[] = [
  {
    name: "github_actions",
    displayName: "GitHub Actions",
    detect: () => !!process.env.GITHUB_ACTIONS,
    getBuildId: () => process.env.GITHUB_RUN_ID ?? null,
    getBuildUrl: () => {
      const server = process.env.GITHUB_SERVER_URL;
      const repo = process.env.GITHUB_REPOSITORY;
      const runId = process.env.GITHUB_RUN_ID;
      return server && repo && runId
        ? `${server}/${repo}/actions/runs/${runId}`
        : null;
    },
    getBranch: () =>
      process.env.GITHUB_HEAD_REF ??
      process.env.GITHUB_REF_NAME ??
      (process.env.GITHUB_REF?.replace("refs/heads/", "") ?? null),
    getCommitSha: () => process.env.GITHUB_SHA ?? null,
    getPullRequest: () => {
      const ref = process.env.GITHUB_REF ?? "";
      const match = ref.match(/refs\/pull\/(\d+)/);
      return match ? match[1] : null;
    },
  },
  {
    name: "gitlab_ci",
    displayName: "GitLab CI",
    detect: () => !!process.env.GITLAB_CI,
    getBuildId: () => process.env.CI_JOB_ID ?? null,
    getBuildUrl: () => process.env.CI_JOB_URL ?? null,
    getBranch: () =>
      process.env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME ??
      process.env.CI_COMMIT_REF_NAME ??
      null,
    getCommitSha: () => process.env.CI_COMMIT_SHA ?? null,
    getPullRequest: () => process.env.CI_MERGE_REQUEST_IID ?? null,
  },
  {
    name: "jenkins",
    displayName: "Jenkins",
    detect: () =>
      !!process.env.JENKINS_URL ||
      !!process.env.JENKINS_HOME ||
      !!process.env.BUILD_ID,
    getBuildId: () => process.env.BUILD_ID ?? process.env.BUILD_NUMBER ?? null,
    getBuildUrl: () => process.env.BUILD_URL ?? null,
    getBranch: () =>
      process.env.GIT_BRANCH ??
      process.env.BRANCH_NAME ??
      null,
    getCommitSha: () => process.env.GIT_COMMIT ?? null,
    getPullRequest: () => process.env.CHANGE_ID ?? null,
  },
  {
    name: "circleci",
    displayName: "CircleCI",
    detect: () => !!process.env.CIRCLECI,
    getBuildId: () => process.env.CIRCLE_BUILD_NUM ?? null,
    getBuildUrl: () => process.env.CIRCLE_BUILD_URL ?? null,
    getBranch: () => process.env.CIRCLE_BRANCH ?? null,
    getCommitSha: () => process.env.CIRCLE_SHA1 ?? null,
    getPullRequest: () => {
      const url = process.env.CIRCLE_PULL_REQUEST ?? "";
      const match = url.match(/\/pull\/(\d+)/);
      return match ? match[1] : null;
    },
  },
  {
    name: "travis",
    displayName: "Travis CI",
    detect: () => !!process.env.TRAVIS,
    getBuildId: () => process.env.TRAVIS_BUILD_ID ?? null,
    getBuildUrl: () => process.env.TRAVIS_BUILD_WEB_URL ?? null,
    getBranch: () =>
      process.env.TRAVIS_PULL_REQUEST_BRANCH ??
      process.env.TRAVIS_BRANCH ??
      null,
    getCommitSha: () => process.env.TRAVIS_COMMIT ?? null,
    getPullRequest: () => {
      const pr = process.env.TRAVIS_PULL_REQUEST;
      return pr && pr !== "false" ? pr : null;
    },
  },
  {
    name: "azure_pipelines",
    displayName: "Azure Pipelines",
    detect: () =>
      !!process.env.TF_BUILD || !!process.env.AZURE_PIPELINES,
    getBuildId: () => process.env.BUILD_BUILDID ?? null,
    getBuildUrl: () => {
      const collection = process.env.SYSTEM_COLLECTIONURI;
      const project = process.env.SYSTEM_TEAMPROJECT;
      const buildId = process.env.BUILD_BUILDID;
      return collection && project && buildId
        ? `${collection}${project}/_build/results?buildId=${buildId}`
        : null;
    },
    getBranch: () =>
      process.env.SYSTEM_PULLREQUEST_SOURCEBRANCH ??
      process.env.BUILD_SOURCEBRANCHNAME ??
      null,
    getCommitSha: () =>
      process.env.BUILD_SOURCEVERSION ?? null,
    getPullRequest: () =>
      process.env.SYSTEM_PULLREQUEST_PULLREQUESTID ?? null,
  },
  {
    name: "bitbucket_pipelines",
    displayName: "Bitbucket Pipelines",
    detect: () => !!process.env.BITBUCKET_BUILD_NUMBER,
    getBuildId: () => process.env.BITBUCKET_BUILD_NUMBER ?? null,
    getBuildUrl: () => {
      const workspace = process.env.BITBUCKET_WORKSPACE;
      const repo = process.env.BITBUCKET_REPO_SLUG;
      const buildNum = process.env.BITBUCKET_BUILD_NUMBER;
      return workspace && repo && buildNum
        ? `https://bitbucket.org/${workspace}/${repo}/addon/pipelines/home#!/results/${buildNum}`
        : null;
    },
    getBranch: () => process.env.BITBUCKET_BRANCH ?? null,
    getCommitSha: () => process.env.BITBUCKET_COMMIT ?? null,
    getPullRequest: () => process.env.BITBUCKET_PR_ID ?? null,
  },
  {
    name: "drone",
    displayName: "Drone",
    detect: () => !!process.env.DRONE,
    getBuildId: () => process.env.DRONE_BUILD_NUMBER ?? null,
    getBuildUrl: () => process.env.DRONE_BUILD_LINK ?? null,
    getBranch: () =>
      process.env.DRONE_SOURCE_BRANCH ??
      process.env.DRONE_BRANCH ??
      null,
    getCommitSha: () => process.env.DRONE_COMMIT_SHA ?? null,
    getPullRequest: () => process.env.DRONE_PULL_REQUEST ?? null,
  },
  {
    name: "teamcity",
    displayName: "TeamCity",
    detect: () => !!process.env.TEAMCITY_VERSION,
    getBuildId: () => process.env.BUILD_NUMBER ?? null,
    getBuildUrl: () => null, // TeamCity doesn't provide this by default
    getBranch: () => process.env.BRANCH_NAME ?? null,
    getCommitSha: () => process.env.BUILD_VCS_NUMBER ?? null,
    getPullRequest: () => null,
  },
  {
    name: "buildkite",
    displayName: "Buildkite",
    detect: () => !!process.env.BUILDKITE,
    getBuildId: () => process.env.BUILDKITE_BUILD_NUMBER ?? null,
    getBuildUrl: () => process.env.BUILDKITE_BUILD_URL ?? null,
    getBranch: () => process.env.BUILDKITE_BRANCH ?? null,
    getCommitSha: () => process.env.BUILDKITE_COMMIT ?? null,
    getPullRequest: () => process.env.BUILDKITE_PULL_REQUEST ?? null,
  },
  {
    name: "appveyor",
    displayName: "AppVeyor",
    detect: () => !!process.env.APPVEYOR,
    getBuildId: () => process.env.APPVEYOR_BUILD_NUMBER ?? null,
    getBuildUrl: () => {
      const account = process.env.APPVEYOR_ACCOUNT_NAME;
      const project = process.env.APPVEYOR_PROJECT_SLUG;
      const buildId = process.env.APPVEYOR_BUILD_ID;
      return account && project && buildId
        ? `https://ci.appveyor.com/project/${account}/${project}/builds/${buildId}`
        : null;
    },
    getBranch: () =>
      process.env.APPVEYOR_PULL_REQUEST_HEAD_REPO_BRANCH ??
      process.env.APPVEYOR_REPO_BRANCH ??
      null,
    getCommitSha: () => process.env.APPVEYOR_REPO_COMMIT ?? null,
    getPullRequest: () => process.env.APPVEYOR_PULL_REQUEST_NUMBER ?? null,
  },
  {
    name: "codebuild",
    displayName: "AWS CodeBuild",
    detect: () => !!process.env.CODEBUILD_BUILD_ID,
    getBuildId: () => process.env.CODEBUILD_BUILD_NUMBER ?? null,
    getBuildUrl: () => {
      const region = process.env.AWS_REGION;
      const buildId = process.env.CODEBUILD_BUILD_ID;
      return region && buildId
        ? `https://${region}.console.aws.amazon.com/codesuite/codebuild/projects/builds/${encodeURIComponent(buildId)}`
        : null;
    },
    getBranch: () => {
      const ref = process.env.CODEBUILD_WEBHOOK_HEAD_REF ?? "";
      return ref.replace("refs/heads/", "") || null;
    },
    getCommitSha: () => process.env.CODEBUILD_RESOLVED_SOURCE_VERSION ?? null,
    getPullRequest: () => {
      const ref = process.env.CODEBUILD_WEBHOOK_TRIGGER ?? "";
      const match = ref.match(/pr\/(\d+)/);
      return match ? match[1] : null;
    },
  },
  {
    name: "semaphore",
    displayName: "Semaphore",
    detect: () => !!process.env.SEMAPHORE,
    getBuildId: () => process.env.SEMAPHORE_JOB_ID ?? null,
    getBuildUrl: () => {
      const org = process.env.SEMAPHORE_ORGANIZATION_URL;
      const project = process.env.SEMAPHORE_PROJECT_NAME;
      const jobId = process.env.SEMAPHORE_JOB_ID;
      return org && project && jobId
        ? `${org}/projects/${project}/jobs/${jobId}`
        : null;
    },
    getBranch: () => process.env.SEMAPHORE_GIT_BRANCH ?? null,
    getCommitSha: () => process.env.SEMAPHORE_GIT_SHA ?? null,
    getPullRequest: () => process.env.SEMAPHORE_GIT_PR_NUMBER ?? null,
  },
];

// ============================================================================
// Terminal Detection
// ============================================================================

function detectShell(): ShellType {
  const shell = process.env.SHELL ?? process.env.ComSpec ?? "";
  const shellName = shell.toLowerCase();

  if (shellName.includes("bash")) return "bash";
  if (shellName.includes("zsh")) return "zsh";
  if (shellName.includes("fish")) return "fish";
  if (shellName.includes("powershell") || shellName.includes("pwsh"))
    return "powershell";
  if (shellName.includes("cmd")) return "cmd";

  // Check PSModulePath for PowerShell
  if (process.env.PSModulePath) return "powershell";

  return "unknown";
}

function detectTerminalEmulator(): TerminalEmulator {
  const termProgram = process.env.TERM_PROGRAM?.toLowerCase() ?? "";
  const wtSession = process.env.WT_SESSION;
  const vscodeTerminal = process.env.VSCODE_INJECTION;
  const term = process.env.TERM?.toLowerCase() ?? "";

  if (termProgram === "iterm.app") return "iterm";
  if (termProgram === "hyper") return "hyper";
  if (termProgram === "alacritty") return "alacritty";
  if (process.env.KITTY_WINDOW_ID) return "kitty";
  if (process.env.WEZTERM_PANE) return "wezterm";
  if (wtSession) return "windows_terminal";
  if (vscodeTerminal || termProgram === "vscode") return "vscode";
  if (termProgram === "apple_terminal") return "terminal_app";
  if (process.env.GNOME_TERMINAL_SCREEN) return "gnome_terminal";
  if (process.env.KONSOLE_VERSION) return "konsole";
  if (term.includes("xterm")) return "xterm";

  return "unknown";
}

function detectColorSupport(): ColorSupport {
  // Check for explicit NO_COLOR
  if (
    process.env.NO_COLOR !== undefined ||
    process.env.VULPES_NO_COLOR !== undefined
  ) {
    return { level: 0, hasBasic: false, has256: false, has16m: false };
  }

  // Check for FORCE_COLOR
  const forceColor = process.env.FORCE_COLOR;
  if (forceColor !== undefined) {
    if (forceColor === "0" || forceColor === "false") {
      return { level: 0, hasBasic: false, has256: false, has16m: false };
    }
    if (forceColor === "1") {
      return { level: 1, hasBasic: true, has256: false, has16m: false };
    }
    if (forceColor === "2") {
      return { level: 2, hasBasic: true, has256: true, has16m: false };
    }
    if (forceColor === "3") {
      return { level: 3, hasBasic: true, has256: true, has16m: true };
    }
    // FORCE_COLOR without value means level 1
    return { level: 1, hasBasic: true, has256: false, has16m: false };
  }

  // Check if not a TTY
  if (!process.stdout.isTTY) {
    return { level: 0, hasBasic: false, has256: false, has16m: false };
  }

  // Check COLORTERM for true color
  const colorTerm = process.env.COLORTERM?.toLowerCase() ?? "";
  if (colorTerm === "truecolor" || colorTerm === "24bit") {
    return { level: 3, hasBasic: true, has256: true, has16m: true };
  }

  // Check TERM for 256 colors
  const term = process.env.TERM?.toLowerCase() ?? "";
  if (term.includes("256color") || term.includes("256")) {
    return { level: 2, hasBasic: true, has256: true, has16m: false };
  }

  // Check for known terminals with true color support
  const termProgram = process.env.TERM_PROGRAM?.toLowerCase() ?? "";
  const trueColorTerminals = ["iterm.app", "hyper", "alacritty"];
  if (
    trueColorTerminals.includes(termProgram) ||
    process.env.KITTY_WINDOW_ID ||
    process.env.WEZTERM_PANE ||
    process.env.WT_SESSION
  ) {
    return { level: 3, hasBasic: true, has256: true, has16m: true };
  }

  // Windows conhost has limited color support
  if (process.platform === "win32") {
    // Windows 10+ supports ANSI colors
    const osRelease = parseInt(require("os").release().split(".")[0], 10);
    if (osRelease >= 10) {
      return { level: 2, hasBasic: true, has256: true, has16m: false };
    }
    return { level: 1, hasBasic: true, has256: false, has16m: false };
  }

  // Default to basic colors for other TTYs
  return { level: 1, hasBasic: true, has256: false, has16m: false };
}

// ============================================================================
// VulpesEnvironment Class
// ============================================================================

export class VulpesEnvironment {
  private static instance: VulpesEnvironment | null = null;
  private cachedInfo: EnvironmentInfo | null = null;

  private constructor() {}

  static getInstance(): VulpesEnvironment {
    if (!VulpesEnvironment.instance) {
      VulpesEnvironment.instance = new VulpesEnvironment();
    }
    return VulpesEnvironment.instance;
  }

  static resetInstance(): void {
    if (VulpesEnvironment.instance) {
      VulpesEnvironment.instance.cachedInfo = null;
    }
    VulpesEnvironment.instance = null;
  }

  /**
   * Get comprehensive environment information.
   * Results are cached for performance.
   */
  getInfo(refresh = false): EnvironmentInfo {
    if (this.cachedInfo && !refresh) {
      return this.cachedInfo;
    }

    const ciDetector = this.detectCI();
    const colorSupport = detectColorSupport();

    this.cachedInfo = {
      // CI Detection
      isCI: this.detectIsCI(),
      ciProvider: ciDetector?.name ?? null,
      ciName: ciDetector?.displayName ?? null,
      buildId: ciDetector?.getBuildId() ?? null,
      buildUrl: ciDetector?.getBuildUrl() ?? null,
      branch: ciDetector?.getBranch() ?? null,
      commitSha: ciDetector?.getCommitSha() ?? null,
      pullRequestNumber: ciDetector?.getPullRequest() ?? null,
      isPullRequest: ciDetector ? !!ciDetector.getPullRequest() : false,

      // Terminal Detection
      isTTY: !!process.stdout.isTTY,
      isInteractive:
        !!process.stdout.isTTY &&
        !!process.stdin.isTTY &&
        !this.detectIsCI(),
      hasStdin: !!process.stdin.isTTY,
      hasStdout: !!process.stdout.isTTY,
      hasStderr: !!process.stderr.isTTY,

      // Color Support
      colorSupport,
      noColor:
        process.env.NO_COLOR !== undefined ||
        process.env.VULPES_NO_COLOR !== undefined,
      forceColor: process.env.FORCE_COLOR !== undefined,

      // Shell & Terminal
      shell: detectShell(),
      terminalEmulator: detectTerminalEmulator(),
      termWidth: process.stdout.columns ?? 80,
      termHeight: process.stdout.rows ?? 24,

      // OS & Runtime
      platform: process.platform,
      isWindows: process.platform === "win32",
      isMacOS: process.platform === "darwin",
      isLinux: process.platform === "linux",
      nodeVersion: process.version,
      npmVersion: process.env.npm_package_version ?? null,

      // Vulpes-specific
      isDebug: process.env.DEBUG === "vulpes" || process.env.DEBUG === "*",
      isVerbose: process.env.VULPES_VERBOSE === "1",
      isQuiet: process.env.VULPES_QUIET === "1",
      logLevel: process.env.VULPES_LOG_LEVEL ?? "info",
      traceEnabled: process.env.VULPES_TRACE === "1",
    };

    return this.cachedInfo;
  }

  // ============================================================================
  // Convenience Getters
  // ============================================================================

  get isCI(): boolean {
    return this.getInfo().isCI;
  }

  get isTTY(): boolean {
    return this.getInfo().isTTY;
  }

  get isInteractive(): boolean {
    return this.getInfo().isInteractive;
  }

  get ciProvider(): CIProvider | null {
    return this.getInfo().ciProvider;
  }

  get ciName(): string | null {
    return this.getInfo().ciName;
  }

  // ============================================================================
  // Output Behavior Decisions
  // ============================================================================

  /**
   * Should we show animated spinners?
   * No in CI, no if not interactive TTY
   */
  shouldShowSpinners(): boolean {
    const info = this.getInfo();
    return info.isInteractive && !info.isQuiet;
  }

  /**
   * Should we use colors in output?
   * Respects NO_COLOR, FORCE_COLOR, and TTY detection
   */
  shouldUseColor(): boolean {
    const info = this.getInfo();
    if (info.noColor) return false;
    if (info.forceColor) return true;
    return info.colorSupport.hasBasic;
  }

  /**
   * Should we use progress bars?
   * No in CI (use percentage logging instead)
   */
  shouldShowProgressBars(): boolean {
    const info = this.getInfo();
    return info.isInteractive && !info.isQuiet;
  }

  /**
   * Should we use emoji in output?
   * Some terminals/CI don't render emoji well
   */
  shouldUseEmoji(): boolean {
    const info = this.getInfo();

    // Disable emoji on Windows unless Windows Terminal
    if (info.isWindows && info.terminalEmulator !== "windows_terminal") {
      return false;
    }

    // Disable in some CI environments
    if (info.isCI && info.ciProvider === "jenkins") {
      return false;
    }

    return info.colorSupport.hasBasic;
  }

  /**
   * Should output be machine-readable JSON?
   * Yes if not a TTY (likely piped) or explicitly requested
   */
  shouldOutputJSON(): boolean {
    const info = this.getInfo();
    return !info.isTTY || process.env.VULPES_OUTPUT === "json";
  }

  /**
   * Get recommended output width
   * Accounts for narrow terminals and CI defaults
   */
  getOutputWidth(): number {
    const info = this.getInfo();

    if (!info.isTTY) {
      return 80; // Default for piped output
    }

    // Clamp to reasonable bounds
    return Math.min(Math.max(info.termWidth, 40), 200);
  }

  /**
   * Should we show verbose output?
   */
  shouldBeVerbose(): boolean {
    return this.getInfo().isVerbose;
  }

  /**
   * Should we suppress non-essential output?
   */
  shouldBeQuiet(): boolean {
    return this.getInfo().isQuiet;
  }

  // ============================================================================
  // CI-Specific Helpers
  // ============================================================================

  /**
   * Output a GitHub Actions annotation (error, warning, notice)
   */
  outputGitHubAnnotation(
    type: "error" | "warning" | "notice",
    message: string,
    options?: { file?: string; line?: number; col?: number; title?: string }
  ): void {
    if (this.ciProvider !== "github_actions") return;

    let annotation = `::${type}`;
    const params: string[] = [];

    if (options?.file) params.push(`file=${options.file}`);
    if (options?.line) params.push(`line=${options.line}`);
    if (options?.col) params.push(`col=${options.col}`);
    if (options?.title) params.push(`title=${options.title}`);

    if (params.length > 0) {
      annotation += ` ${params.join(",")}`;
    }

    annotation += `::${message.replace(/\n/g, "%0A")}`;
    console.log(annotation);
  }

  /**
   * Start a GitHub Actions group
   */
  startGroup(name: string): void {
    if (this.ciProvider === "github_actions") {
      console.log(`::group::${name}`);
    } else if (this.ciProvider === "azure_pipelines") {
      console.log(`##[group]${name}`);
    } else if (this.ciProvider === "gitlab_ci") {
      console.log(`\e[0Ksection_start:${Date.now()}:${name.replace(/\s/g, "_")}\r\e[0K${name}`);
    }
  }

  /**
   * End a GitHub Actions group
   */
  endGroup(name?: string): void {
    if (this.ciProvider === "github_actions") {
      console.log("::endgroup::");
    } else if (this.ciProvider === "azure_pipelines") {
      console.log("##[endgroup]");
    } else if (this.ciProvider === "gitlab_ci" && name) {
      console.log(`\e[0Ksection_end:${Date.now()}:${name.replace(/\s/g, "_")}\r\e[0K`);
    }
  }

  /**
   * Set an output variable for CI
   */
  setOutput(name: string, value: string): void {
    if (this.ciProvider === "github_actions") {
      const outputFile = process.env.GITHUB_OUTPUT;
      if (outputFile) {
        const fs = require("fs");
        fs.appendFileSync(outputFile, `${name}=${value}\n`);
      } else {
        // Fallback for older GitHub Actions
        console.log(`::set-output name=${name}::${value}`);
      }
    } else if (this.ciProvider === "azure_pipelines") {
      console.log(`##vso[task.setvariable variable=${name}]${value}`);
    }
  }

  /**
   * Mask a value from appearing in logs
   */
  maskValue(value: string): void {
    if (this.ciProvider === "github_actions") {
      console.log(`::add-mask::${value}`);
    } else if (this.ciProvider === "azure_pipelines") {
      console.log(`##vso[task.setvariable variable=SECRET;issecret=true]${value}`);
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private detectIsCI(): boolean {
    // Check common CI environment variables
    if (
      process.env.CI === "true" ||
      process.env.CI === "1" ||
      process.env.CONTINUOUS_INTEGRATION === "true" ||
      process.env.BUILD_NUMBER !== undefined ||
      process.env.RUN_ID !== undefined
    ) {
      return true;
    }

    // Check if any CI detector matches
    return CI_DETECTORS.some((detector) => detector.detect());
  }

  private detectCI(): CIDetector | null {
    for (const detector of CI_DETECTORS) {
      if (detector.detect()) {
        return detector;
      }
    }
    return null;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const vulpesEnvironment = VulpesEnvironment.getInstance();

// ============================================================================
// Convenience Functions
// ============================================================================

export function isCI(): boolean {
  return vulpesEnvironment.isCI;
}

export function isTTY(): boolean {
  return vulpesEnvironment.isTTY;
}

export function isInteractive(): boolean {
  return vulpesEnvironment.isInteractive;
}

export function shouldUseColor(): boolean {
  return vulpesEnvironment.shouldUseColor();
}

export function getCIProvider(): CIProvider | null {
  return vulpesEnvironment.ciProvider;
}

export function getEnvironmentInfo(): EnvironmentInfo {
  return vulpesEnvironment.getInfo();
}
