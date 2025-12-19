# Post-Development Fixes (Required Before Clinical Use)

Purpose: Track items that are acceptable during development with synthetic data
but must be fixed before any real PHI or clinical deployment.

Status: If an item is fixed early, mark it as resolved and keep it for record.

## Deferred Items

1) Tool output safety (analyze_redaction)
- What it is: The analyze_redaction tool returns the original input text.
- Why it matters: When this tool is later wired to external LLMs or shared
  across systems, raw text can escape the redaction boundary.
- Fix before clinical use:
  - Remove original text from tool output by default, or
  - Require an explicit flag (opt-in) to include raw input.
- Current status: Fixed early (2025-12-19)
- References:
  - src/mcp/server.ts:141
  - src/cli/NativeChat.ts:582

2) Logging of detected PHI
- What it is: Detected PHI values are logged to stdout and to
  ~/.vulpes/logs/vulpes.log by default.
- Why it matters: Logs become a second copy of sensitive text and are easy to
  overlook or forward to other systems.
- Fix before clinical use:
  - Do not log raw PHI by default (only counts/types), or
  - Require an explicit flag to log raw text, and
  - Make file logging opt-in for PHI contexts.
- Current status: Fixed early (2025-12-19)
- References:
  - src/utils/RadiologyLogger.ts:259
  - src/utils/RadiologyLogger.ts:291
  - src/utils/VulpesLogger.ts:720
  - src/utils/VulpesLogger.ts:728
