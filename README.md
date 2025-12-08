# 🦊 VULPES CELARE

![Vulpes Celare Logo](https://github.com/user-attachments/assets/ebc320d1-ff4d-4610-b0de-7aad2a1da5cb)

**Open-source HIPAA PHI redaction engine for clinical text. Fast, inspectable, air-gapped.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-Source%20Available-4B32C3?style=for-the-badge)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Validation%20In%20Progress-orange?style=for-the-badge)](#-validation--benchmarks)

|     | Metric                | Score         | Validation        |
|:---:|:---------------------:|:-------------:|:-----------------:|
| 🎯  | **Sensitivity**       | **99.6%**     | Synthetic corpus* |
| 🛡️  | **Specificity**       | **96–100%**   | Synthetic corpus* |
| 📄  | **Documents Tested**  | **7,000+**    | Adversarial synthetic |
| ⚡  | **Speed**             | **2–3 ms**    | Benchmarked |

*\*Validated on synthetic data only. i2b2 2014 benchmark validation pending. See [Validation & Benchmarks](#-validation--benchmarks).*

> ⚠️ **Development Status:** Validated only against synthetic test data. DO NOT use with real patient data until validated against i2b2 2014 corpus, production-tested, and reviewed by your compliance team. Use synthetic data only. See `tests/master-suite` for generators.

---

## Why Vulpes Celare?

**Most PHI redaction tools are opaque black-boxes** where you can't inspect what happens. Vulpes Celare is fully open source—every decision is traceable. **Generic tools aren't tuned for medical vocabulary**—we're healthcare-native, built for US formats. **Heavyweight solutions don't fit modern workflows**—we process in 2–3ms, stateless, and scale linearly. **Cloud services force PHI to leave your network**—our zero-trust design keeps data inside your infrastructure. Always.

## How It Works

```mermaid
flowchart TB
    subgraph INPUT [" "]
        direction LR
        Access["🖥️ Access Point<br/>Epic · PACS · Web"]
        Data["📋 Clinical Data<br/>+ Question"]
    end

    Access --> Data

    subgraph CORE ["🦊 VULPES CELARE"]
        direction TB
        Redact["✂️ REDACT<br/>John Smith<br/>742 Evergreen Terrace<br/>eGFR 28, Cr 2.4 (was 1.8)<br/>↓<br/>[NAME-1]<br/>[ADDRESS-1]<br/>eGFR 28, Cr 2.4 (was 1.8)"]
        Map["🗺️ STORE MAP<br/>Kept locally"]
        Redact --> Map
    end

    Data -->|"Data"| Redact
    Data -->|"Question"| LLM

    subgraph EXT ["☁️ LLM"]
        LLM["Claude / GPT-5.1 / Gemini<br/>Only sees: [NAME-1], [ADDRESS-1]<br/>eGFR 28, Cr 2.4 (was 1.8)"]
    end

    Map -->|"Clean data"| LLM

    subgraph CORE2 ["🦊 VULPES CELARE"]
        direction TB
        Restore["🔄 RESTORE<br/>[NAME-1], [ADDRESS-1]<br/>has stage 4 CKD with rapid progression.<br/>Nephrology referral recommended.<br/>↓<br/>John Smith, 742 Evergreen Terrace<br/>has stage 4 CKD with rapid progression.<br/>Nephrology referral recommended."]
        Audit["📝 AUDIT LOG"]
        Restore --> Audit
    end

    LLM -->|"Response"| Restore

    Result["✅ You see real names<br/>AI never knew them"]
    Audit --> Result

    style CORE fill:#ff6b35,stroke:#d63000,color:#fff
    style CORE2 fill:#ff6b35,stroke:#d63000,color:#fff
    style EXT fill:#e8e8e8,stroke:#999
    style Result fill:#c8e6c9,stroke:#2e7d32
```

PHI never crosses the network boundary. The LLM only sees tokenized placeholders. Your data stays local. Always.

## 🚀 Quick Start

### Installation

```bash
# Clone and build
git clone https://github.com/DocHatty/Vulpes-Celare.git
cd Vulpes-Celare
npm install
npm run build

# Install globally (creates vulpes command)
npm run install-global
```

After `install-global`, add the displayed path to your PATH:
```bash
vulpes              # Interactive menu
vulpes chat         # Native API chat with PHI redaction
vulpes --help       # All options
```

### Library Usage

```bash
npm install vulpes-celare
```

```typescript
import { VulpesCelare } from 'vulpes-celare';

// One-liner
const redacted = await VulpesCelare.redact(clinicalNote);

// With metrics
const engine = new VulpesCelare();
const result = await engine.process(clinicalNote);

console.log(result.text);            // Redacted document
console.log(result.redactionCount);  // PHI elements found
console.log(result.executionTimeMs); // ~2–3 ms
```

### Integration Example

Works as a **universal preprocessing filter** for any LLM:

```typescript
import { VulpesCelare } from 'vulpes-celare';
import OpenAI from 'openai';

async function analyzeNote(clinicalNote: string) {
  const safeNote = await VulpesCelare.redact(clinicalNote);  // ← Add this line
  return await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: safeNote }]
  });
}
```

> More examples: [OpenAI](examples/integrations/LLM-INTEGRATIONS.md) • [Anthropic](examples/integrations/LLM-INTEGRATIONS.md) • [Streaming](examples/streaming/STREAMING-API.md) • [LangChain](examples/integrations/LLM-INTEGRATIONS.md)

## ✨ Features

### HIPAA Safe Harbor Coverage

| # | Identifier | Filter(s) | Status |
|---|------------|-----------|--------|
| 1 | Names | `SmartNameFilter`, `TitledNameFilter`, `FormattedNameFilter`, `FamilyNameFilter` | ✅ |
| 2 | Geographic | `AddressFilter`, `ZipCodeFilter`, `HospitalFilter` | ✅ |
| 3 | Dates | `DateFilter` | ✅ |
| 4 | Phone numbers | `PhoneFilter` | ✅ |
| 5 | Fax numbers | `FaxNumberFilter` | ✅ |
| 6 | Email | `EmailFilter` | ✅ |
| 7 | SSN | `SSNFilter` | ✅ |
| 8 | MRN | `MRNFilter` | ✅ |
| 9 | Health plan IDs | `HealthPlanNumberFilter` | ✅ |
| 10 | Account numbers | `AccountNumberFilter` | ✅ |
| 11 | License numbers | `LicenseNumberFilter`, `DEAFilter` | ✅ |
| 12 | Vehicle IDs | `VehicleIdentifierFilter` | ✅ |
| 13 | Device IDs | `DeviceIdentifierFilter` | ✅ |
| 14 | URLs | `URLFilter` | ✅ |
| 15 | IP addresses | `IPAddressFilter` | ✅ |
| 16 | Biometrics | `BiometricContextFilter` | ✅ |
| 17 | Photos/images | — | ❌ Planned |
| 18 | Other unique IDs | `UniqueIdentifierFilter`, `NPIFilter`, `PassportNumberFilter` | ✅ |

**Coverage: 17/18 (94%)** — Photo/image identifier detection planned.

### Key Capabilities

- **Context-Aware Detection** - Knows "Dr. Wilson" is a person but "Wilson's disease" is a medical condition
- **OCR Error Resilience** - Catches PHI even when scanners corrupt characters
- **Smart Overlap Handling** - When multiple filters match, picks the optimal redaction
- **Zero External Calls** - Works completely offline, air-gapped deployment ready
- **Streaming API** - Real-time PHI protection for live dictation ([docs](examples/streaming/STREAMING-API.md))
- **Policy DSL** - Declarative policies without code changes ([docs](examples/policy-dsl/POLICY-DSL.md))
- **Cryptographic Provenance** - Immutable audit logs with Merkle-linked chains ([docs](docs/TRUST-BUNDLE.md))

## 🔗 Blockchain Audit Trail (Industry-First)

**The problem:** When OCR audits you, how do you *prove* you redacted PHI before sending data to AI?

**Traditional tools:** "Trust us, we deleted it" ¯\\\_(ツ)_/¯

**Vulpes Celare:** Cryptographic proof. Every redaction gets a tamper-proof certificate showing:
- ✅ What was redacted (47 PHI elements)
- ✅ When it happened (timestamped)
- ✅ Which policy was used (HIPAA Safe Harbor)
- ✅ Document hasn't been altered (SHA-256 hashes match)
- ✅ Chain of custody intact (blockchain-style Merkle log)

**Think FedEx tracking, but for compliance.** Auditors verify in 30 seconds—no technical knowledge needed.

### Why This Matters

| Without Blockchain | With Vulpes Blockchain |
|-------------------|----------------------|
| 🤷 "We think we redacted it" | 📜 Cryptographic proof in hand |
| ⚖️ Pray auditors believe you | ⚖️ Math proves it (no trust required) |
| 💸 Pray no HIPAA fines | 💸 Provable due diligence |
| 🚫 Can't prove to customers | ✅ Give customers verification files |

**Real scenario:** Data breach investigation. *"Did PHI leave your network?"*
- Without: "We can't prove what was redacted."
- With: "Here's the immutable audit log. Hash-verified. Certificate signed."

### What's Built (Production-Ready)

✅ Merkle-linked blockchain (like Bitcoin, but for compliance)
✅ Trust Bundles (`.red` files with cryptographic certificates)
✅ One-click verification portal for auditors
✅ Zero cost (runs on your infrastructure, no fees)
✅ Optional (only use when you need proof)

```typescript
// Generate cryptographic proof (optional, adds 5ms)
const bundle = await TrustBundleExporter.generate(original, result.text, result);
await TrustBundleExporter.export(bundle, 'proof.red');
// → Auditor drags proof.red into web portal → Verified in 30 seconds
```

**Future-proofing:** When AI regulations require cryptographic audit trails (and they will), you're already compliant.

> 📖 [Trust Bundle Docs](docs/TRUST-BUNDLE.md) • [Verification Portal](verification-portal/README.md)

## 🏗️ Architecture

**Twenty-eight specialized filters** run in parallel, covering 17/18 HIPAA Safe Harbor identifiers. Each filter is independently testable and inspectable—no black boxes.

**Processing Pipeline:**
1. Parallel filter execution (2–3ms total)
2. Smart overlap resolution
3. Redaction token generation
4. Optional cryptographic audit logging

> 📖 **Detailed Documentation:** [Architecture Deep Dive](docs/ARCHITECTURE.md)

## 🖥️ CLI & Cortex

### Installation & Usage

```bash
npm run install-global  # Creates vulpes command

vulpes                  # Interactive menu
vulpes chat             # Native API chat
vulpes --help           # Full reference
```

### Native Chat Features

- **Multi-Provider Support:** OpenAI, Anthropic, Google, OpenRouter, Ollama, custom endpoints
- **Automatic PHI Redaction:** All messages pass through Vulpes engine before LLM
- **Subagent Orchestration:** Intelligent task routing (Scout, Analyst, Engineer, Tester, Auditor)
- **HIPAA Knowledge Base:** 989 Q&A pairs with CFR citations

**Key Commands:**
- `/redact <text>` - Redact PHI from text
- `/analyze <text>` - Analyze PHI without redacting
- `/model` - Switch models
- `/subagents` - Toggle subagent orchestration

> 📖 **Full CLI Documentation:** Run `vulpes --help` or see [CLI Guide](docs/CLI.md)

## 🧪 Validation & Benchmarks

### Current Validation Status

| Aspect | Status | Details |
|--------|--------|---------|
| **Sensitivity (99.6%)** | ⚠️ Synthetic Only | 7,000+ adversarial synthetic clinical documents |
| **Specificity (96-100%)** | ⚠️ Synthetic Only | Same synthetic corpus |
| **Processing Speed** | ✅ Verified | 2-3ms benchmarked on standard hardware |
| **HIPAA Safe Harbor** | ✅ 17/18 | Photo/image identifiers pending |
| **i2b2 2014 Benchmark** | ❌ Not Yet | Industry gold standard - data access pending |
| **Real Clinical Notes** | ❌ Not Yet | Seeking validation partners |

### Synthetic Test Corpus

Our adversarial test corpus includes:
- OCR-degraded documents with character substitutions (`0↔O`, `1↔l`, `5↔S`)
- Edge cases (hyphenated names, international formats, ambiguous dates)
- Medical context challenges ("Dr. Wilson" vs "Wilson's disease")
- 7,000+ documents across 28 PHI types

**Limitations:** Real clinical notes may have patterns we haven't anticipated. Industry acceptance requires benchmark validation against the i2b2 2014 corpus.

### Competitive Comparison

| Tool | Sensitivity | Speed | Validation | Open Source |
|------|-------------|-------|------------|-------------|
| **Vulpes Celare** | 99.6% | 2-3ms | ⚠️ Synthetic | ✅ AGPL-3.0 |
| **CliniDeID** | 95.9% (names) | ~1 note/sec | ✅ i2b2 | ✅ Open |
| **Philter** | 87-96% | ~1.4 notes/sec | ✅ i2b2, 130M+ notes | ✅ BSD-3 |
| **Presidio** | ~88% recall | 3-11 sec/7K words | ✅ Multiple corpora | ✅ MIT |
| **AWS Comprehend Medical** | Varies | Fast | ✅ Proprietary | ❌ Cloud only |

**Our Honest Position:**

✅ **Demonstrable Advantages (Verified):**
- Speed: Designed for 1000x+ faster processing
- Streaming: Only open-source tool with real-time redaction API
- Policy DSL: Declarative policies without code changes
- Provenance: Cryptographic audit trail no competitor offers

⚠️ **Advantages Pending Validation:**
- Accuracy: 99.6% sensitivity needs i2b2 2014 validation
- Production Scale: Competitors like Philter have processed 130M+ notes

> 📖 **Detailed Benchmarks:** [Full Comparison](docs/BENCHMARKS.md)

### External Dataset Analysis

**NEW:** Test Vulpes against your own labeled datasets (parquet format):

```bash
# Quick test (100 documents)
npm run test:parquet:quick

# Full analysis (5k-60k documents)
npm run test:parquet -- --dir /path/to/parquet
```

**Features:**
- ✅ Massive test expansion (from 7k to 60k+ documents)
- ✅ Missing pattern detection (see exactly what Vulpes missed)
- ✅ Dictionary expansion (extract thousands of new names/locations)
- ✅ Adversarial test generation (find rare edge cases)
- ✅ Benchmark reporting (industry-standard metrics)

**Performance:** Batched processing (100 docs at a time), cached results, ~2-3 minutes for 5k documents.

> 📖 **Full Documentation:** [Parquet Analysis Guide](tests/master-suite/cortex/PARQUET-ANALYSIS.md)

### Validation Roadmap

| Priority | Benchmark | Status | Impact |
|----------|-----------|--------|--------|
| 🔴 **High** | i2b2 2014 De-identification Corpus | Awaiting data access | Industry-standard accuracy claims |
| 🔴 **High** | Pilot deployment (1,000+ real notes) | Seeking partners | Production validation |
| 🟡 **Medium** | Third-party security audit | Seeking sponsors | Enterprise trust |

**Want to help?** We're seeking validation partners with i2b2 data access, healthcare organizations with de-identified test data, or sponsors for third-party audits. [Open an issue](https://github.com/DocHatty/Vulpes-Celare/issues).

## 🔐 Integration Guidance

> **HIPAA compliance is organizational, not purely technical.**

For production healthcare deployments:
1. Human review for high-risk documents
2. Logging and monitoring of all operations
3. Incident response procedures
4. BAA review for cloud LLM providers
5. Legal counsel for compliance attestation

## 📜 License

**AGPL-3.0 with Commercial Exception** - See [LICENSE](LICENSE)

**Free use for:**
- Individuals, researchers, educators
- Non-profit hospitals and clinics
- Companies making < $1M/year
- Open source projects
- Internal use (not offered as a service)

**Commercial license required for:**
- For-profit companies > $1M/year
- Managed service offerings

📄 [Commercial Licensing Details](docs/legal/COMMERCIAL_LICENSE.md)

## 🤝 Contributing

Contributions welcome! See [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md).

**Validation Contributions Especially Valued:**
- Run against i2b2 2014 corpus
- Pilot deployment feedback
- Security audit findings
- Bug reports and edge cases
- International format support

**Contributors who help validate will be acknowledged in published benchmarks.**

---

**Built with transparency. Validated through collaboration.**

📚 [Full Documentation](docs/) • 🐛 [Report Issues](https://github.com/DocHatty/Vulpes-Celare/issues) • 💬 [Discussions](https://github.com/DocHatty/Vulpes-Celare/discussions)
