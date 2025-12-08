# Vulpes CLI & Cortex Guide

## Overview

The Vulpes CLI is a powerful command-line interface for interacting with the Vulpes Celare PHI redaction engine, managing configurations, and orchestrating multi-agent workflows.

## Installation

### Global Installation

```bash
# From the repository
cd Vulpes-Celare
npm install
npm run build
npm run install-global
```

After installation, add the displayed path to your system PATH.

### Verify Installation

```bash
vulpes --help
vulpes --version
```

## Quick Start

### Interactive Menu

```bash
vulpes
```

Launches an interactive menu with options for:
- Native API chat
- Configuration management
- Testing tools
- Documentation

### Direct Commands

```bash
vulpes chat         # Start native API chat with PHI redaction
vulpes --help       # Show all available commands
```

## Configuration

### Config Directory

Vulpes stores configuration in `~/.vulpes/`:

```
~/.vulpes/
├── config.json     # API keys, preferences, provider settings
└── vulpes.db       # SQLite: sessions, audit logs, agent memory
```

> ⚠️ **Security:** Never commit the `~/.vulpes/` directory. It contains API keys.

### Setting Up API Keys

First time you run `vulpes chat`, you'll be prompted to configure your API provider:

```bash
vulpes chat
# Follow prompts to:
# 1. Select provider (OpenAI, Anthropic, Google, etc.)
# 2. Enter API key
# 3. Select default model
```

### Manual Configuration

Edit `~/.vulpes/config.json`:

```json
{
  "provider": "anthropic",
  "apiKey": "sk-ant-...",
  "model": "claude-3-5-sonnet-20241022",
  "temperature": 0.7,
  "maxTokens": 4096
}
```

## Native Chat Mode

### Starting a Chat Session

```bash
vulpes chat
```

### Chat Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/redact <text>` | Redact PHI from text | `/redact Patient John Smith, DOB 1/1/1970` |
| `/analyze <text>` | Analyze PHI without redacting | `/analyze Check this note for PHI` |
| `/info` | Show Vulpes engine info | `/info` |
| `/model` | Switch models | `/model` |
| `/provider` | Switch providers | `/provider` |
| `/subagents` or `/s` | Toggle subagent orchestration | `/s` |
| `/orchestrate <task>` | Run intelligent workflow | `/orchestrate scan this note` |
| `/history` | View session history | `/history` |
| `/clear` | Clear conversation | `/clear` |
| `/exit` or `/quit` | Exit chat | `/exit` |

### PHI Redaction in Chat

**All messages are automatically redacted before being sent to the LLM.**

Example:
```
You: Analyze this note: Patient John Smith, MRN 123456, seen on 1/15/2024

[Vulpes automatically redacts before sending to LLM]

LLM sees: "Patient [NAME-1], MRN [MRN-1], seen on [DATE-1]"

LLM: Based on the note, the patient was seen recently...

You see: Based on the note, John Smith was seen on 1/15/2024...
```

## Supported Providers

### OpenAI

```bash
# Configuration
Provider: openai
API Key: sk-...
Models: gpt-4, gpt-4-turbo, gpt-3.5-turbo
```

**Features:**
- Function calling
- Streaming responses
- Vision support (GPT-4V)

### Anthropic

```bash
# Configuration
Provider: anthropic
API Key: sk-ant-...
Models: claude-3-opus, claude-3-5-sonnet, claude-3-haiku
```

**Features:**
- Extended context (200K tokens)
- Function calling
- Streaming responses

### Google (Gemini)

```bash
# Configuration
Provider: google
API Key: AI...
Models: gemini-1.5-pro, gemini-1.5-flash
```

**Features:**
- Long context support
- Multimodal input
- Fast responses

### OpenRouter

```bash
# Configuration
Provider: openrouter
API Key: sk-or-...
Models: Multiple (70+ models)
```

**Features:**
- Access to multiple providers
- Model fallback
- Usage tracking

### Ollama (Local)

```bash
# Configuration
Provider: ollama
API URL: http://localhost:11434
Models: llama2, mistral, codellama, etc.
```

**Features:**
- Fully local
- No API costs
- Air-gapped deployment

## Subagent Orchestration

### Overview

The CLI includes an **intelligent multi-agent system** that automatically routes tasks to specialized agents.

### Available Agents

| Agent | Role | Model | Use Case |
|-------|------|-------|----------|
| **Scout** | Fast PHI scanning | haiku | Quick document analysis |
| **Analyst** | Root cause analysis | sonnet | Debugging detection failures |
| **Engineer** | Code fixes | sonnet | Filter and dictionary updates |
| **Tester** | Test execution | haiku | Validation and regression |
| **Auditor** | HIPAA compliance | haiku | Compliance certification |
| **Setup** | System health | haiku | MCP status, diagnostics |

### Enabling Subagents

```bash
# In chat
/subagents
# or
/s

# Toggle subagent orchestration on/off
```

### Workflow Detection

The system automatically detects workflow types:

```bash
# Single agent workflows
"scan this note"        → Scout agent
"fix the SSN filter"    → Engineer agent
"audit this document"   → Auditor agent
"why did this fail?"    → Analyst agent

# Multi-agent workflows
"full review"           → Scout → Analyst → Engineer → Tester → Auditor
"scan and fix"          → Scout → Engineer → Tester
```

### Manual Orchestration

```bash
/orchestrate <task description>

# Examples:
/orchestrate scan this clinical note for PHI
/orchestrate fix name detection issues
/orchestrate full HIPAA compliance review
```

### Parallel vs Serial Execution

- **Parallel:** Independent tasks run simultaneously
- **Serial:** Dependent tasks run in sequence

**Example:**
```
Task: "scan and audit"
Execution: Scout || Auditor (parallel)

Task: "scan, fix, test"
Execution: Scout → Engineer → Tester (serial)
```

## HIPAA Knowledge Base

The CLI includes **989 HIPAA Q&A pairs** with CFR citations.

### Querying HIPAA Knowledge

```bash
# In chat
What are the HIPAA Safe Harbor requirements?
How should we handle dates under Safe Harbor?
What is a Business Associate Agreement?
```

The system will:
1. Search the knowledge base
2. Return relevant Q&A pairs
3. Include CFR citations
4. Provide context-aware answers

### Knowledge Base Stats

- **989 Q&A pairs**
- **254 unique CFR references**
- **18 HIPAA Safe Harbor categories covered**
- **Updated regularly** with regulatory changes

## Session Management

### Session Persistence

All chat sessions are stored in `~/.vulpes/vulpes.db`:

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  created_at INTEGER,
  updated_at INTEGER,
  messages TEXT,
  metadata TEXT
);
```

### Viewing History

```bash
# In chat
/history

# Shows:
# - Session ID
# - Message count
# - Created/updated timestamps
# - Summary
```

### Clearing Sessions

```bash
# In chat
/clear              # Clear current conversation
/clear all          # Clear all sessions (with confirmation)
```

## Cortex Intelligence

### Overview

**Cortex** is the self-learning test system with failure analysis capabilities.

### Features

- **Failure Pattern Detection** - Why specific PHI types slip through
- **Fix History** - What worked, what didn't, and why
- **Regression Alerts** - Automatic metric degradation detection
- **LLM-Augmented Analysis** - AI introspection of failures

### Running Tests with Cortex

```bash
# From repository root
node tests/master-suite/run.js --count 200 --cortex --cortex-report

# Options:
# --count N          Generate N test documents
# --cortex           Enable Cortex intelligence
# --cortex-report    Generate detailed analysis report
# --verbose          Show detailed output
```

### Cortex Reports

Generates:
- **Failure summaries** - Grouped by PHI type
- **Root cause analysis** - Why failures occurred
- **Fix suggestions** - Actionable improvements
- **Trend analysis** - Performance over time

### MCP Integration

Cortex supports **Model Context Protocol (MCP)** for enhanced agent capabilities:

```bash
# Check MCP status
vulpes chat
/orchestrate check MCP status

# Setup MCP
Setup agent will:
1. Verify MCP server running
2. Check agent connectivity
3. Test knowledge base access
4. Validate audit log integration
```

## Advanced Features

### Custom Endpoints

For custom or self-hosted models:

```json
{
  "provider": "custom",
  "apiUrl": "https://your-endpoint.com/v1",
  "apiKey": "your-key",
  "model": "your-model"
}
```

### Streaming Responses

Streaming is enabled by default for supported providers:

```bash
# Real-time token-by-token output
# No configuration needed
```

### Temperature Control

```bash
# In chat
/settings

# Adjust:
# - Temperature (0.0-2.0)
# - Max tokens
# - Top-p sampling
# - Frequency penalty
```

### Batch Redaction

```bash
# Create a file with clinical notes (one per line)
# notes.txt

# Run batch redaction
vulpes redact-file notes.txt > redacted.txt
```

## Troubleshooting

### API Key Issues

```bash
# Error: "Invalid API key"
# Solution: Reconfigure provider
vulpes chat
/provider
# Select provider and re-enter API key
```

### Slow Responses

```bash
# Check provider status
# Try different model
/model

# Switch to faster model:
# - OpenAI: gpt-3.5-turbo
# - Anthropic: claude-3-haiku
# - Google: gemini-1.5-flash
```

### Subagent Not Working

```bash
# Check MCP status
/orchestrate check system health

# Common issues:
# 1. MCP server not running
# 2. Database permissions
# 3. API rate limits
```

### Database Errors

```bash
# Reset database (WARNING: loses history)
rm ~/.vulpes/vulpes.db

# Vulpes will recreate on next run
```

## Command Reference

### Global Commands

```bash
vulpes                  # Interactive menu
vulpes chat             # Native API chat
vulpes --help           # Show help
vulpes --version        # Show version
```

### In-Chat Commands

```bash
/redact <text>          # Redact PHI
/analyze <text>         # Analyze PHI
/info                   # Engine info
/model                  # Switch models
/provider               # Switch providers
/subagents, /s          # Toggle subagents
/orchestrate <task>     # Run workflow
/history                # View history
/clear                  # Clear session
/settings               # Adjust settings
/help                   # Show help
/exit, /quit            # Exit
```

## Configuration Reference

### config.json Schema

```json
{
  "provider": "anthropic",           // Provider name
  "apiKey": "sk-ant-...",           // API key
  "model": "claude-3-5-sonnet",     // Model name
  "temperature": 0.7,                // 0.0-2.0
  "maxTokens": 4096,                 // Max response tokens
  "topP": 1.0,                       // Nucleus sampling
  "frequencyPenalty": 0.0,           // -2.0 to 2.0
  "presencePenalty": 0.0,            // -2.0 to 2.0
  "stream": true,                    // Enable streaming
  "subagentsEnabled": false,         // Enable orchestration
  "cortexEnabled": true,             // Enable Cortex
  "auditLog": true                   // Enable audit logging
}
```

## Best Practices

### For Production Use

1. **Use dedicated API keys** - Separate from development
2. **Enable audit logging** - Track all redactions
3. **Regular backups** - Save `~/.vulpes/vulpes.db`
4. **Monitor usage** - Track API costs
5. **Review redactions** - Human oversight for critical cases

### For Development

1. **Use test API keys** - Avoid production charges
2. **Enable Cortex** - Learn from failures
3. **Run local models** - Use Ollama for faster iteration
4. **Clear sessions** - Keep database clean

### For Compliance

1. **Enable provenance** - Cryptographic audit trails
2. **Document workflows** - Save orchestration results
3. **Regular audits** - Use Auditor agent
4. **Version control** - Track configuration changes

## Security Considerations

### API Key Storage

- Keys stored in `~/.vulpes/config.json`
- File permissions: 600 (user read/write only)
- Never commit to version control
- Rotate keys regularly

### Audit Logs

- All redactions logged to SQLite
- Includes timestamps, user, session
- Cryptographic integrity verification
- Export for compliance reporting

### PHI Handling

- PHI never sent to external services (with redaction)
- Local processing only
- Session data encrypted at rest
- Automatic cleanup options

## Examples

### Example 1: Quick Redaction

```bash
vulpes chat

You: /redact Patient John Smith, DOB 1/1/1970, MRN 123456

Vulpes: Redacted text:
Patient [NAME-1], DOB [DATE-1], MRN [MRN-1]

Redaction map:
- NAME-1: John Smith
- DATE-1: 1/1/1970
- MRN-1: 123456
```

### Example 2: Subagent Workflow

```bash
vulpes chat
/s  # Enable subagents

You: Full HIPAA compliance review of this note: [paste note]

Vulpes:
✓ Scout: Scanning for PHI... Found 12 elements
✓ Analyst: Checking coverage... 17/18 Safe Harbor categories
✓ Auditor: Compliance check... PASS
✓ Report generated: hipaa-audit-20241208.json
```

### Example 3: Fix Development

```bash
vulpes chat
/s  # Enable subagents

You: The SSN filter missed "111-22-3333"

Vulpes:
✓ Scout: Confirming false negative...
✓ Analyst: Root cause - regex doesn't handle leading zeros
✓ Engineer: Updating SSNFilter.ts...
✓ Tester: Running regression suite...
✓ All tests passed. Fix committed.
```

## Integration Examples

### Shell Script Integration

```bash
#!/bin/bash
# redact-notes.sh

while IFS= read -r note; do
  echo "$note" | vulpes redact
done < clinical-notes.txt
```

### Python Integration

```python
import subprocess
import json

def redact_phi(text):
    result = subprocess.run(
        ['vulpes', 'redact', text],
        capture_output=True,
        text=True
    )
    return result.stdout.strip()

note = "Patient John Smith, DOB 1/1/1970"
redacted = redact_phi(note)
print(redacted)
```

### Node.js Integration

```javascript
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function redactPHI(text) {
  const { stdout } = await execPromise(`vulpes redact "${text}"`);
  return stdout.trim();
}

// Usage
redactPHI('Patient John Smith').then(console.log);
```

---

**Need help?** [Open a discussion](https://github.com/DocHatty/Vulpes-Celare/discussions)

**Found a bug?** [Report an issue](https://github.com/DocHatty/Vulpes-Celare/issues)
