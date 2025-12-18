# Air-Gapped Deployment Guide

**Secure, Zero-Trust Deployment for Trauma Centers, DoD, VA, and High-Security Healthcare Facilities**

This guide covers deploying Vulpes Celare in completely isolated, air-gapped environments where no data can leave the secure perimeter.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation (Offline)](#installation-offline)
4. [Configuration](#configuration)
5. [Local LLM Integration](#local-llm-integration)
6. [Security Hardening](#security-hardening)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Overview

### What is Air-Gapped Deployment?

An **air-gapped** system has:
- ❌ No internet connectivity
- ❌ No external network access
- ❌ No cloud service dependencies
- ✅ All processing happens locally
- ✅ All data stays within secure perimeter
- ✅ All dependencies bundled offline

### Use Cases

- **Trauma Centers**: Sensitive patient data requiring maximum security
- **VA Medical Centers**: Veterans health data with strict access controls
- **DoD Healthcare**: Military healthcare facilities with classified networks
- **Research Facilities**: Controlled access to research subjects
- **Air-Gapped Hospital Networks**: Isolated clinical networks

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AIR-GAPPED PERIMETER                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Clinical   │  │    Vulpes    │  │   Local LLM  │      │
│  │      EHR     │──│    Celare    │──│   (Ollama)   │      │
│  │              │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                            │                                │
│                  ┌────────────────────┐                     │
│                  │  Local Database    │                     │
│                  │  (Audit Logs)      │                     │
│                  └────────────────────┘                     │
│                                                             │
│  ❌ NO EXTERNAL NETWORK ACCESS                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 4 cores | 8+ cores (for local LLM) |
| **RAM** | 8 GB | 32+ GB (for local LLM) |
| **Storage** | 50 GB | 500+ GB (for LLM models) |
| **GPU** | None | NVIDIA GPU with 8+ GB VRAM (for fast LLM inference) |

### Software Requirements

- **OS**: Linux (Ubuntu 22.04 LTS recommended), Windows Server 2019+, or macOS (native addon packaging is currently Windows-first; JS-only mode runs everywhere)
- **Runtime**: Node.js 18+ (bundled offline)
- **Database**: SQLite (bundled) or PostgreSQL (for enterprise)
- **LLM Runtime**: Ollama (for local models)

### Security Requirements

- ✅ Physical access controls to server room
- ✅ Encrypted storage (LUKS/BitLocker/FileVault)
- ✅ Role-based access control
- ✅ Audit logging enabled
- ✅ Tamper-evident hardware (optional: TPM/HSM)

---

## Installation (Offline)

### Step 1: Prepare Offline Bundle

On a **connected machine**, create an offline installation bundle:

```bash
# Clone repository
git clone https://github.com/DocHatty/Vulpes-Celare.git
cd Vulpes-Celare

# Install dependencies
npm install

# Build the project
npm run build

# Create offline bundle with all dependencies
tar -czf vulpes-celare-offline-v1.0.0.tar.gz \
  package.json \
  package-lock.json \
  dist/ \
  node_modules/ \
  src/dictionaries/ \
  redaction/policies/ \
  README.md \
  LICENSE
```

### Step 2: Transfer to Air-Gapped System

Use approved secure transfer method:

- ✅ Encrypted USB drive (FIPS 140-2 validated)
- ✅ CD/DVD (write-once media)
- ✅ Secure file transfer via designated transfer server

```bash
# On air-gapped system
tar -xzf vulpes-celare-offline-v1.0.0.tar.gz
cd vulpes-celare-offline
```

### Step 3: Install on Air-Gapped System

```bash
# Verify Node.js is installed (offline installer if needed)
node --version  # Should be v18+

# Install Vulpes Celare (dependencies already bundled)
npm install --offline --no-audit

# Build
npm run build

# Run tests to verify
npm test
```

---

## Configuration

### Fortress Mode Policy

Use the trauma-fortress policy for maximum security:

```typescript
import { VulpesCelare } from 'vulpes-celare';
import * as fs from 'fs';

// Load air-gapped policy
const policy = JSON.parse(
  fs.readFileSync('./examples/policies/trauma-fortress.json', 'utf8')
);

const engine = new VulpesCelare({ policy });

// All processing is local - no network calls
const result = await engine.process(clinicalNote);
```

---

## Local LLM Integration

### Install Ollama (Offline)

```bash
# Download Ollama offline installer on connected system
# Then transfer to air-gapped system

# Install Ollama
sudo dpkg -i ollama_*.deb  # Linux
# or
./ollama-installer.exe  # Windows

# Start service
sudo systemctl start ollama
sudo systemctl enable ollama
```

### Install Medical Models

```bash
# On connected system, download and export model
ollama pull llama2
ollama save llama2 llama2.tar

# Transfer llama2.tar to air-gapped system

# On air-gapped system, import model
ollama load llama2.tar

# Verify
ollama list
```

### Integration Code

```typescript
import { VulpesCelare } from 'vulpes-celare';

async function airgappedAnalysis(clinicalNote: string) {
  // Step 1: Redact PHI locally
  const engine = new VulpesCelare({
    policy: 'trauma-fortress'
  });
  const redacted = await engine.process(clinicalNote);

  console.log(`PHI removed: ${redacted.redactionCount} elements`);

  // Step 2: Analyze with local LLM (no network call)
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model: 'llama2',
      prompt: redacted.text,
      stream: false
    })
  });

  const analysis = await response.json();

  return {
    redacted: redacted.text,
    analysis: analysis.response
  };
}
```

---

## Security Hardening

### 1. Network Isolation

Disable all network interfaces except loopback:

```bash
# Verify no external connectivity
ping -c 1 8.8.8.8  # Should fail

# Monitor for unauthorized network activity
sudo tcpdump -i any -n 'not port 22'  # Should show no traffic
```

### 2. Disk Encryption

```bash
# Ubuntu/Debian - LUKS encryption
sudo cryptsetup luksFormat /dev/sda1
sudo cryptsetup luksOpen /dev/sda1 vulpes-data
sudo mkfs.ext4 /dev/mapper/vulpes-data
```

### 3. Access Control

```bash
# Create dedicated service user
sudo useradd -r -s /bin/false vulpes-celare

# Set restrictive permissions
sudo chown -R vulpes-celare:vulpes-celare /opt/vulpes-celare
sudo chmod 700 /opt/vulpes-celare/data
```

---

## Monitoring & Maintenance

### Health Checks

```bash
#!/bin/bash
# health-check.sh

# 1. Verify service is running
systemctl is-active vulpes-celare || echo "ERROR: Service not running"

# 2. Check disk space
df -h /opt/vulpes-celare

# 3. Verify network isolation
ping -c 1 -W 1 8.8.8.8 &> /dev/null && echo "CRITICAL: Network detected!"

# 4. Check audit logs
tail -n 100 /var/log/vulpes-celare/audit.log
```

### Backup Strategy

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/mnt/secure-backup/vulpes-celare"
DATE=$(date +%Y%m%d-%H%M%S)

# Backup database and audit logs
tar -czf ${BACKUP_DIR}/backup-${DATE}.tar.gz \
  /opt/vulpes-celare/data \
  /var/log/vulpes-celare/audit

# Retain for 6 years (HIPAA requirement)
find ${BACKUP_DIR} -mtime +2190 -delete
```

---

## Support

For air-gapped deployment support:

- 📧 Email: support@vulpes-celare.org
- 📖 Documentation: https://github.com/DocHatty/Vulpes-Celare/docs

**Note**: For air-gapped systems, support must be provided via approved secure channels.
