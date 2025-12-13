# Vulpes CLI Guide

## Overview

The Vulpes CLI is a command-line interface for:

- running redaction locally
- interacting with provider-backed chat (PHI is redacted before sending)
- managing local configuration (`~/.vulpes/`)

## Install (Repo)

```bash
npm install
npm run build
npm run install-global
```

Verify:

```bash
vulpes --help
vulpes --version
```

## Commands

```bash
vulpes              # Interactive menu
vulpes chat         # LLM chat with auto-redaction
vulpes redact "<text>"
vulpes --help
```

## Configuration

The CLI stores configuration in `~/.vulpes/`:

```
~/.vulpes/
  config.json     # API keys, preferences, provider settings
  vulpes.db       # SQLite: sessions, audit logs, agent memory
```

Security note: this directory contains API keys and is excluded from git. Never commit credentials.

## Testing

```bash
npm run build
npm test
```

