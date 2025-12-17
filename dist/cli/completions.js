"use strict";
/**
 * ============================================================================
 * VULPES CELARE - SHELL COMPLETIONS
 * ============================================================================
 *
 * Generate shell completion scripts for bash, zsh, fish, and PowerShell.
 *
 * Usage:
 *   vulpes completions bash > ~/.bashrc.d/vulpes
 *   vulpes completions zsh > ~/.zfunc/_vulpes
 *   vulpes completions fish > ~/.config/fish/completions/vulpes.fish
 *   vulpes completions powershell >> $PROFILE
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCompletions = generateCompletions;
exports.showCompletionHelp = showCompletionHelp;
const theme_1 = require("../theme");
const output_1 = require("../theme/output");
const VulpesOutput_1 = require("../utils/VulpesOutput");
// ============================================================================
// COMMAND DEFINITIONS
// ============================================================================
const COMMANDS = [
    { name: "redact", desc: "Redact PHI from a file or stdin" },
    { name: "batch", desc: "Batch process files in a directory" },
    { name: "interactive", desc: "Start interactive REPL mode", alias: "i" },
    { name: "analyze", desc: "Analyze a document for PHI without redacting" },
    { name: "chat", desc: "Native streaming chat with tool calling", alias: "c" },
    { name: "agent", desc: "AI-powered redaction development agent", alias: "a" },
    { name: "info", desc: "Display system and engine information" },
    { name: "filters", desc: "List all available PHI filters" },
    { name: "benchmark", desc: "Run performance benchmarks" },
    { name: "stream", desc: "Stream redaction from stdin" },
    { name: "policy", desc: "Policy management commands" },
    { name: "vulpesify", desc: "Install deep CLI integrations" },
    { name: "test", desc: "Run PHI detection test suite" },
    { name: "deep-analyze", desc: "Deep analysis with AI", alias: "da" },
    { name: "completions", desc: "Generate shell completion scripts" },
];
// Global options - referenced in generated completion scripts
const _GLOBAL_OPTIONS = [
    { name: "--help", short: "-h", desc: "Show help" },
    { name: "--version", short: "-v", desc: "Show version" },
    { name: "--no-color", desc: "Disable colored output" },
    { name: "--quiet", short: "-q", desc: "Suppress banner" },
];
void _GLOBAL_OPTIONS; // Used in script templates
// ============================================================================
// BASH COMPLETION
// ============================================================================
function generateBash() {
    const commandNames = COMMANDS.map(c => c.name).join(" ");
    const aliases = COMMANDS.filter(c => c.alias).map(c => c.alias).join(" ");
    return `# Vulpes Celare bash completion
# Add to ~/.bashrc or ~/.bash_completion.d/vulpes

_vulpes_completions() {
  local cur prev commands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  
  commands="${commandNames} ${aliases}"
  
  case "\${prev}" in
    vulpes|vulpes-cli|vulpes-celare)
      COMPREPLY=( \$(compgen -W "\${commands}" -- "\${cur}") )
      return 0
      ;;
    redact|analyze)
      # Complete files
      COMPREPLY=( \$(compgen -f -- "\${cur}") )
      return 0
      ;;
    batch)
      # Complete directories
      COMPREPLY=( \$(compgen -d -- "\${cur}") )
      return 0
      ;;
    --provider)
      COMPREPLY=( \$(compgen -W "anthropic openai openrouter ollama custom" -- "\${cur}") )
      return 0
      ;;
    --mode)
      COMPREPLY=( \$(compgen -W "dev qa production" -- "\${cur}") )
      return 0
      ;;
    --backend)
      COMPREPLY=( \$(compgen -W "claude codex copilot" -- "\${cur}") )
      return 0
      ;;
    --style)
      COMPREPLY=( \$(compgen -W "brackets asterisks empty" -- "\${cur}") )
      return 0
      ;;
    --format)
      COMPREPLY=( \$(compgen -W "text json csv report table" -- "\${cur}") )
      return 0
      ;;
    --profile)
      COMPREPLY=( \$(compgen -W "HIPAA_STRICT DEVELOPMENT RESEARCH" -- "\${cur}") )
      return 0
      ;;
    policy)
      COMPREPLY=( \$(compgen -W "list show compile validate" -- "\${cur}") )
      return 0
      ;;
    completions)
      COMPREPLY=( \$(compgen -W "bash zsh fish powershell" -- "\${cur}") )
      return 0
      ;;
  esac
  
  # Option completion
  if [[ "\${cur}" == -* ]]; then
    local opts="--help --version --quiet --no-color --verbose --provider --model --api-key --mode --backend --style --format"
    COMPREPLY=( \$(compgen -W "\${opts}" -- "\${cur}") )
    return 0
  fi
}

complete -F _vulpes_completions vulpes
complete -F _vulpes_completions vulpes-cli
complete -F _vulpes_completions vulpes-celare
`;
}
// ============================================================================
// ZSH COMPLETION
// ============================================================================
function generateZsh() {
    const commandDescriptions = COMMANDS.map(c => `    '${c.name}:${c.desc.replace(/'/g, "\\'")}' \\`).join("\n");
    return `#compdef vulpes vulpes-cli vulpes-celare
# Vulpes Celare zsh completion
# Add to ~/.zfunc/_vulpes and ensure fpath includes ~/.zfunc

_vulpes() {
  local -a commands
  commands=(
${commandDescriptions}
  )

  local -a global_opts
  global_opts=(
    '(-h --help)'{-h,--help}'[Show help]'
    '(-v --version)'{-v,--version}'[Show version]'
    '(-q --quiet)'{-q,--quiet}'[Suppress banner]'
    '--no-color[Disable colored output]'
    '--verbose[Verbose output]'
  )

  _arguments -C \\
    \$global_opts \\
    '1:command:->command' \\
    '*::arg:->args'

  case \$state in
    command)
      _describe -t commands 'vulpes commands' commands
      ;;
    args)
      case \$words[1] in
        redact|analyze)
          _files
          ;;
        batch)
          _directories
          ;;
        --provider)
          local providers=(anthropic openai openrouter ollama custom)
          _describe 'providers' providers
          ;;
        --mode)
          local modes=(dev qa production)
          _describe 'modes' modes
          ;;
        --backend)
          local backends=(claude codex copilot)
          _describe 'backends' backends
          ;;
        policy)
          local subcommands=(list show compile validate)
          _describe 'policy commands' subcommands
          ;;
        completions)
          local shells=(bash zsh fish powershell)
          _describe 'shells' shells
          ;;
      esac
      ;;
  esac
}

_vulpes "\$@"
`;
}
// ============================================================================
// FISH COMPLETION
// ============================================================================
function generateFish() {
    const commandCompletions = COMMANDS.map(c => `complete -c vulpes -n __fish_use_subcommand -a ${c.name} -d '${c.desc.replace(/'/g, "\\'")}'`).join("\n");
    return `# Vulpes Celare fish completion
# Add to ~/.config/fish/completions/vulpes.fish

# Disable file completion by default
complete -c vulpes -f

# Commands
${commandCompletions}

# Global options
complete -c vulpes -s h -l help -d 'Show help'
complete -c vulpes -s v -l version -d 'Show version'
complete -c vulpes -s q -l quiet -d 'Suppress banner'
complete -c vulpes -l no-color -d 'Disable colored output'
complete -c vulpes -l verbose -d 'Verbose output'

# Provider options
complete -c vulpes -l provider -xa 'anthropic openai openrouter ollama custom' -d 'API provider'
complete -c vulpes -l mode -xa 'dev qa production' -d 'Operation mode'
complete -c vulpes -l backend -xa 'claude codex copilot' -d 'Agent backend'
complete -c vulpes -l style -xa 'brackets asterisks empty' -d 'Replacement style'
complete -c vulpes -l format -xa 'text json csv report table' -d 'Output format'
complete -c vulpes -l profile -xa 'HIPAA_STRICT DEVELOPMENT RESEARCH' -d 'Grading profile'

# File completions for specific commands
complete -c vulpes -n '__fish_seen_subcommand_from redact analyze' -F
complete -c vulpes -n '__fish_seen_subcommand_from batch' -a '(__fish_complete_directories)'

# Policy subcommands
complete -c vulpes -n '__fish_seen_subcommand_from policy' -a 'list show compile validate'

# Completions subcommands
complete -c vulpes -n '__fish_seen_subcommand_from completions' -a 'bash zsh fish powershell'
`;
}
// ============================================================================
// POWERSHELL COMPLETION
// ============================================================================
function generatePowerShell() {
    const commandNames = COMMANDS.map(c => `'${c.name}'`).join(", ");
    return `# Vulpes Celare PowerShell completion
# Add to your $PROFILE

$VulpesCommands = @(${commandNames})
$VulpesProviders = @('anthropic', 'openai', 'openrouter', 'ollama', 'custom')
$VulpesModes = @('dev', 'qa', 'production')
$VulpesBackends = @('claude', 'codex', 'copilot')
$VulpesStyles = @('brackets', 'asterisks', 'empty')
$VulpesFormats = @('text', 'json', 'csv', 'report', 'table')
$VulpesShells = @('bash', 'zsh', 'fish', 'powershell')

Register-ArgumentCompleter -CommandName vulpes,vulpes-cli,vulpes-celare -Native -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)
    
    $command = $commandAst.CommandElements
    
    # First argument - complete commands
    if ($command.Count -eq 1) {
        $VulpesCommands | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
        }
        return
    }
    
    $subCommand = $command[1].Extent.Text
    $lastWord = $command[-1].Extent.Text
    
    # Context-specific completions
    switch -Regex ($lastWord) {
        '--provider' {
            $VulpesProviders | ForEach-Object {
                [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
            }
        }
        '--mode' {
            $VulpesModes | ForEach-Object {
                [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
            }
        }
        '--backend' {
            $VulpesBackends | ForEach-Object {
                [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
            }
        }
        '--style' {
            $VulpesStyles | ForEach-Object {
                [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
            }
        }
        '--format' {
            $VulpesFormats | ForEach-Object {
                [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
            }
        }
    }
    
    # Subcommand-specific completions
    switch ($subCommand) {
        'policy' {
            @('list', 'show', 'compile', 'validate') | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
                [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
            }
        }
        'completions' {
            $VulpesShells | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
                [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
            }
        }
        { $_ -in @('redact', 'analyze', 'batch') } {
            # File/directory completion
            Get-ChildItem -Path "$wordToComplete*" | ForEach-Object {
                [System.Management.Automation.CompletionResult]::new($_.Name, $_.Name, 'ParameterValue', $_.FullName)
            }
        }
    }
}
`;
}
// ============================================================================
// MAIN HANDLER
// ============================================================================
function generateCompletions(shell) {
    let script;
    switch (shell.toLowerCase()) {
        case "bash":
            script = generateBash();
            break;
        case "zsh":
            script = generateZsh();
            break;
        case "fish":
            script = generateFish();
            break;
        case "powershell":
        case "pwsh":
            script = generatePowerShell();
            break;
        default:
            VulpesOutput_1.out.print(output_1.Status.error(`Unknown shell: ${shell}`));
            VulpesOutput_1.out.print("\nSupported shells: bash, zsh, fish, powershell");
            VulpesOutput_1.out.print("\nUsage:");
            VulpesOutput_1.out.print("  vulpes completions bash    # Output bash completions");
            VulpesOutput_1.out.print("  vulpes completions zsh     # Output zsh completions");
            VulpesOutput_1.out.print("  vulpes completions fish    # Output fish completions");
            VulpesOutput_1.out.print("  vulpes completions powershell  # Output PowerShell completions");
            VulpesOutput_1.out.print("\nInstallation examples:");
            VulpesOutput_1.out.print("  vulpes completions bash >> ~/.bashrc");
            VulpesOutput_1.out.print("  vulpes completions zsh > ~/.zfunc/_vulpes");
            VulpesOutput_1.out.print("  vulpes completions fish > ~/.config/fish/completions/vulpes.fish");
            VulpesOutput_1.out.print('  vulpes completions powershell >> $PROFILE');
            return;
    }
    // Output the script to stdout for piping
    VulpesOutput_1.out.print(script);
}
function showCompletionHelp() {
    VulpesOutput_1.out.print(output_1.Box.info([
        theme_1.theme.bold("Shell Completions"),
        "",
        "Enable tab completion for Vulpes commands.",
        "",
        theme_1.theme.secondary("Bash:"),
        "  vulpes completions bash >> ~/.bashrc",
        "  source ~/.bashrc",
        "",
        theme_1.theme.secondary("Zsh:"),
        "  mkdir -p ~/.zfunc",
        "  vulpes completions zsh > ~/.zfunc/_vulpes",
        '  echo \'fpath=(~/.zfunc $fpath)\' >> ~/.zshrc',
        "  echo 'autoload -Uz compinit && compinit' >> ~/.zshrc",
        "",
        theme_1.theme.secondary("Fish:"),
        "  vulpes completions fish > ~/.config/fish/completions/vulpes.fish",
        "",
        theme_1.theme.secondary("PowerShell:"),
        "  vulpes completions powershell >> $PROFILE",
    ], { title: "Shell Completions" }));
}
//# sourceMappingURL=completions.js.map