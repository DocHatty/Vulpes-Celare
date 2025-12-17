# Vulpes Celare CLI

A beautiful, production-grade command-line interface for HIPAA PHI redaction.

## Installation

### From Repository

```bash
npm install
npm run build
npm run install-global
```

### Verify Installation

```bash
vulpes --version
vulpes --help
```

## Quick Start

```bash
# Interactive menu
vulpes

# Redact a file
vulpes redact document.txt

# Start chat with auto-redaction
vulpes chat

# Analyze without redacting
vulpes analyze document.txt
```

## Commands

### Core Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `vulpes redact <file>` | | Redact PHI from a file or stdin |
| `vulpes batch <dir>` | | Batch process files in a directory |
| `vulpes analyze <file>` | | Analyze document for PHI without redacting |
| `vulpes stream` | | Real-time streaming redaction from stdin |
| `vulpes interactive` | `i` | Start interactive REPL mode |

### Chat Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `vulpes chat` | `c` | Native streaming chat with tool calling |
| `vulpes safe-chat` | `sc` | Interactive chat with automatic PHI redaction |
| `vulpes query <text>` | | One-shot query with redaction |

### Agent Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `vulpes agent` | `a` | AI-powered redaction development agent |
| `vulpes cc` | | Quick launch Claude Code with Vulpes context |
| `vulpes vulpesify` | | Install integrations with Claude Code, Codex, Copilot |
| `vulpes wrap <cmd>` | | Wrap Codex/Copilot with automatic PHI redaction |

### Policy Commands

| Command | Description |
|---------|-------------|
| `vulpes policy list` | List available policy templates |
| `vulpes policy show <name>` | Show details of a policy template |
| `vulpes policy compile <file>` | Compile a .dsl policy file to JSON |
| `vulpes policy validate <file>` | Validate a policy file |

### Utility Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `vulpes info` | | Display system and engine information |
| `vulpes filters` | | List all available PHI filters |
| `vulpes benchmark` | | Run performance benchmarks |
| `vulpes test` | | Run PHI detection test suite |
| `vulpes deep-analyze` | `da` | Deep analysis with self-correction |
| `vulpes completions` | | Generate shell completion scripts |
| `vulpes examples` | | Show usage examples |
| `vulpes tips` | | Show tips and tricks |
| `vulpes quickstart` | `qs` | Show quick start guide |

## Common Options

### Redaction Options

```bash
# Output format
vulpes redact file.txt -f json          # json, csv, text, report
vulpes redact file.txt -o output.txt    # Write to file

# Replacement style
vulpes redact file.txt -s brackets      # [NAME], [SSN]
vulpes redact file.txt -s asterisks     # ****
vulpes redact file.txt -s empty         # (removes PHI)

# PHI type filtering
vulpes redact file.txt --enable name,ssn,phone
vulpes redact file.txt --disable email,url

# Policy file
vulpes redact file.txt -p policy.json
vulpes redact file.txt -p policy.dsl
```

### Chat Options

```bash
# Provider selection
vulpes chat --provider anthropic
vulpes chat --provider openai
vulpes chat --provider openrouter
vulpes chat --provider ollama

# Model selection
vulpes chat --model claude-sonnet-4-20250514
vulpes chat --model gpt-4o

# API configuration
vulpes chat --api-key sk-...
vulpes chat --base-url https://custom.api.com

# Operation mode
vulpes chat --mode dev          # Full access
vulpes chat --mode qa           # Read-only
vulpes chat --mode production   # Redacted only

# Subagent orchestration
vulpes chat --subagents
vulpes chat --parallel 5
```

### Batch Options

```bash
vulpes batch ./docs -o ./redacted
vulpes batch ./docs -t 8                    # 8 concurrent workers
vulpes batch ./docs -e ".txt,.md,.json"     # File extensions
vulpes batch ./docs --max-depth 5           # Directory depth
vulpes batch ./docs --dry-run               # Preview only
vulpes batch ./docs --summary               # Show summary report
```

## Configuration

### Storage Location

```
~/.vulpes/
├── config.json     # API keys, preferences, provider settings
└── vulpes.db       # SQLite: sessions, audit logs, agent memory
```

### API Keys

API keys can be provided via:

1. **Environment variables** (recommended for CI/CD):
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   export OPENAI_API_KEY=sk-...
   export OPENROUTER_API_KEY=sk-or-...
   export GOOGLE_API_KEY=...
   ```

2. **Command-line flag**:
   ```bash
   vulpes chat --api-key sk-...
   ```

3. **Stored configuration** (saved in `~/.vulpes/config.json`):
   - Keys entered during interactive setup are stored locally
   - Never committed to git

### Preferences

Preferences are stored in `config.json` and can be modified via the interactive CLI:

```json
{
  "preferences": {
    "defaultProvider": "anthropic",
    "defaultModel": "claude-sonnet-4-20250514",
    "theme": "default",
    "verboseMode": false,
    "subagentsEnabled": false,
    "maxParallelSubagents": 3
  }
}
```

## Examples

### Basic Redaction

```bash
# Redact from stdin
echo "Patient John Smith, SSN 123-45-6789" | vulpes redact

# Redact file with JSON output
vulpes redact medical-note.txt -f json -o redacted.json

# Batch process with summary
vulpes batch ./patient-files --summary
```

### Chat Integration

```bash
# Start chat with Claude
vulpes chat --provider anthropic

# Use with custom model
vulpes chat --provider openrouter --model anthropic/claude-3-opus

# Local Ollama
vulpes chat --provider ollama --model llama2
```

### Streaming

```bash
# Real-time redaction (e.g., from dictation)
cat dictation.txt | vulpes stream --mode sentence

# Pipe through other tools
some-transcription-tool | vulpes stream | tee output.txt
```

### Policy-Based Redaction

```bash
# Use built-in policy
vulpes redact file.txt -p maximum

# Use custom DSL policy
vulpes policy compile my-policy.dsl -o compiled.json
vulpes redact file.txt -p compiled.json
```

## Shell Completion

```bash
# Generate completions
vulpes completions bash >> ~/.bashrc
vulpes completions zsh >> ~/.zshrc
vulpes completions fish > ~/.config/fish/completions/vulpes.fish
vulpes completions powershell >> $PROFILE
```

## Troubleshooting

### Common Issues

**"Command not found"**
```bash
npm run install-global
# Or add to PATH manually
export PATH="$PATH:$(npm root -g)/.bin"
```

**"API key not found"**
```bash
# Set environment variable
export ANTHROPIC_API_KEY=sk-ant-...
# Or use --api-key flag
vulpes chat --api-key sk-ant-...
```

**"Permission denied"**
```bash
# Fix permissions on config directory
chmod 700 ~/.vulpes
```

### Verbose Output

```bash
vulpes chat -v          # Verbose mode
vulpes redact file.txt --show-spans  # Show detection details
```

### Debug Logging

Set environment variables for detailed logging:

```bash
export VULPES_LOG_LEVEL=debug
export VULPES_LOG_FORMAT=json
```

## Security Notes

- API keys are stored in `~/.vulpes/config.json` with mode 0700
- The `~/.vulpes/` directory is excluded from git
- Never commit credentials or API keys
- Use environment variables in CI/CD pipelines
- All verification is performed locally; no data is sent externally during redaction
