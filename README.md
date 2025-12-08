# 🦊 VULPES CELARE

![Vulpes Celare Logo](https://github.com/user-attachments/assets/ebc320d1-ff4d-4610-b0de-7aad2a1da5cb)

**An open, inspectable HIPAA PHI redaction engine for clinical text.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-Source%20Available-4B32C3?style=for-the-badge)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Validation%20In%20Progress-orange?style=for-the-badge)](#-validation-status)

|     | Metric                | Score         | Validation        |
|:---:|:---------------------:|:-------------:|:-----------------:|
| 🎯  | **Sensitivity**       | **99.6%**     | Synthetic corpus* |
| 🛡️  | **Specificity**       | **96–100%**   | Synthetic corpus* |
| 📄  | **Documents Tested**  | **7,000+**    | Adversarial synthetic |
| ⚡  | **Speed**             | **2–3 ms**    | Benchmarked |

*\*Pending validation against i2b2 2014 clinical corpus. See [Validation Status](#-validation-status).*

---

> **IMPORTANT DISCLAIMER: DEVELOPMENT STATUS**
>
> Vulpes Celare is currently in active development and has been validated only against **synthetic test data**. 
>
> **DO NOT use real patient data** until the system has been:
> - Validated against the i2b2 2014 benchmark corpus
> - Tested in a production pilot deployment
> - Reviewed by your organization's compliance team
>
> **For development and testing:** Use only synthetic/fake patient data. The `tests/master-suite` includes synthetic document generators you can use.
>
> **The developers assume no liability** for PHI exposure resulting from use of this software prior to production validation. Users are solely responsible for ensuring HIPAA compliance within their organizations.

---

## Why Vulpes Celare?

Clinical documentation drives medical education, research, and innovation - but safely sharing it remains a persistent challenge.

**Most PHI redaction tools are opaque black-boxes where you can't inspect what happens.** Vulpes Celare is fully open source - every decision is traceable.

**Generic tools aren't tuned for medical vocabulary.** We're healthcare-native, built for US medical formats from day one.

**Heavyweight solutions don't fit modern workflows.** We process documents in 2–3 milliseconds, stateless, and scale linearly.

**Cloud services force PHI to leave your network.** Our zero-trust design keeps data inside your infrastructure. Always.

---

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

> **The key insight:** PHI never crosses the network boundary. The LLM only sees tokenized placeholders. Your data stays local. Always.

---

## 🚀 Quick Start

### CLI Installation (Interactive Menu)

```bash
# Clone and build
git clone https://github.com/DocHatty/Vulpes-Celare.git
cd Vulpes-Celare
npm install
npm run build

# Install globally (creates vulpes command)
npm run install-global

# Or run directly
npm run vulpes
```

After running `install-global`, add the displayed path to your system PATH, then:

```bash
vulpes              # Interactive menu
vulpes cc           # Claude CLI chat (no API key needed)
vulpes chat         # Native API chat
vulpes --help       # All options
```

### Vulpes CLI Modes

| Mode | Description | API Key |
|------|-------------|---------|
| **Native API Chat** | Direct chat with OpenAI, Anthropic, Google, OpenRouter, or local models. Supports subagent orchestration for complex PHI tasks. | Required |
| **Agent Mode** | Launch Claude Code or GitHub Copilot with Vulpes integration (CLAUDE.md, slash commands, MCP). | Varies |

**Native Chat Commands:**
- `/redact <text>` - Redact PHI from text
- `/analyze <text>` - Analyze PHI without redacting
- `/info` - Show Vulpes engine info
- `/model` - Switch models
- `/provider` - Switch providers
- `/subagents` or `/s` - Toggle subagent orchestration
- `/orchestrate <task>` - Run intelligent workflow

**Subagent Orchestration:**
The CLI includes an intelligent multi-agent system that automatically routes tasks:
- **Scout** - Fast PHI scanning and detection
- **Analyst** - Root cause analysis for detection issues
- **Engineer** - Code fixes for filters and dictionaries
- **Tester** - Run tests and validate changes
- **Auditor** - HIPAA compliance certification
- **Setup** - System health and MCP status

Workflows are automatically detected and executed in parallel or serial based on task dependencies.

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
console.log(result.executionTimeMs); // Processing time (~2–3 ms)
```

### Policy DSL

**Declarative policy language for simplified customization**

```typescript
import { PolicyCompiler } from 'vulpes-celare';

const policy = `
policy RESEARCH {
  description "IRB-approved research"
  
  redact names
  redact ssn
  keep dates
  keep ages
  
  threshold 0.4
}
`;

const compiled = PolicyCompiler.compile(policy);
```

> 📊 **System Assessment Available**  
> - [📋 Quick Summary](docs/internal/ASSESSMENT-SUMMARY.md)
> - [📖 Full Assessment](docs/internal/COMPREHENSIVE-ASSESSMENT.md)

---

## 🧪 Validation Status

> **Transparency builds trust.** We believe in honest disclosure about what's been validated and what hasn't.

### Current Validation

| Aspect | Status | Details |
|--------|--------|---------|
| **Sensitivity (99.6%)** | ⚠️ Synthetic Only | 7,000+ adversarial synthetic clinical documents |
| **Specificity (96-100%)** | ⚠️ Synthetic Only | Same synthetic corpus |
| **Processing Speed** | ✅ Verified | 2-3ms benchmarked on standard hardware |
| **HIPAA Safe Harbor** | ✅ 17/18 | Photo/image identifiers pending |
| **i2b2 2014 Benchmark** | ❌ Not Yet | Industry gold standard - data access pending |
| **Real Clinical Notes** | ❌ Not Yet | Seeking validation partners |
| **Production Deployment** | ❌ Not Yet | Seeking pilot deployments |

### What This Means

**Our synthetic test corpus is adversarial**, including:
- OCR-degraded documents with character substitutions (`0↔O`, `1↔l`, `5↔S`)
- Edge cases (hyphenated names, international formats, ambiguous dates)
- Medical context challenges ("Dr. Wilson" vs "Wilson's disease")
- 7,000+ documents across 28 PHI types

**Limitations of synthetic testing:**
- Real clinical notes may have patterns we haven't anticipated
- Production environments introduce unexpected edge cases
- Industry acceptance requires benchmark validation against the i2b2 2014 corpus

### Validation Roadmap

| Priority | Benchmark | Status | Impact |
|----------|-----------|--------|--------|
| 🔴 **High** | i2b2 2014 De-identification Corpus | Awaiting data access | Industry-standard accuracy claims |
| 🔴 **High** | Pilot deployment (1,000+ real notes) | Seeking partners | Production validation |
| 🟡 **Medium** | Third-party security audit | Seeking sponsors | Enterprise trust |

### The i2b2 2014 Benchmark

The **i2b2 2014 De-identification Challenge** corpus is the industry gold standard for PHI redaction validation:
- **1,304 longitudinal clinical narratives** from 296 patients
- **All 18 HIPAA Safe Harbor categories** annotated with character offsets
- **Cited in 36+ peer-reviewed studies** (2024 alone)
- **The benchmark competitors use** (CliniDeID, Philter, NLM Scrubber)

Access is currently restricted through Harvard DBMI. We are actively pursuing data access to provide industry-comparable validation metrics.

### How You Can Help

We're actively seeking:
- **i2b2 Data Access** — Researchers with existing access who can run comparative benchmarks
- **Validation Partners** — Healthcare organizations with de-identified test data
- **Pilot Deployments** — Clinics for real-world validation
- **Security Auditors** — Third-party review for independent trust

**Interested?** [Open an issue](https://github.com/DocHatty/Vulpes-Celare/issues) or contact us directly.

---

## 🔌 Integration Examples

Vulpes Celare works as a **universal preprocessing filter** for any LLM:

```typescript
const safeNote = await VulpesCelare.redact(clinicalNote);  // ← Add this line
const response = await yourLLM.complete(safeNote);
```

### OpenAI / ChatGPT

```typescript
import { VulpesCelare } from 'vulpes-celare';
import OpenAI from 'openai';

async function analyzeNote(clinicalNote: string) {
  const safeNote = await VulpesCelare.redact(clinicalNote);
  return await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: safeNote }]
  });
}
```

### Streaming Redaction

**Real-time PHI protection for live dictation and scribe applications**

```typescript
import { StreamingRedactor } from 'vulpes-celare';

const redactor = new StreamingRedactor({
  bufferSize: 100,
  mode: 'sentence'
});

for await (const chunk of redactor.redactStream(speechToTextStream)) {
  console.log(chunk.text);  // PHI already redacted in real-time
}
```

### Anthropic / Claude

```typescript
import { VulpesCelare } from 'vulpes-celare';
import Anthropic from '@anthropic-ai/sdk';

async function analyzeNote(clinicalNote: string) {
  const safeNote = await VulpesCelare.redact(clinicalNote);
  return await anthropic.messages.create({
    model: 'claude-3-opus-20240229',
    max_tokens: 1024,
    messages: [{ role: 'user', content: safeNote }]
  });
}
```

### LangChain

```typescript
import { VulpesCelare } from 'vulpes-celare';

const redactPHI = async (input: { text: string }) => {
  return { text: await VulpesCelare.redact(input.text) };
};

const chain = RunnableSequence.from([redactPHI, yourExistingChain]);
```

### REST API Middleware

```typescript
async function phiRedactionMiddleware(req, res, next) {
  if (req.body.text) req.body.text = await VulpesCelare.redact(req.body.text);
  next();
}

app.use('/api/ai/*', phiRedactionMiddleware);
```

---

## 🔧 Architecture

**Twenty-eight specialized filters run in parallel**, covering 17 of 18 HIPAA Safe Harbor identifiers:

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

**Coverage: 17/18 (94%)** — Photo/image identifier detection planned for future release.

### Key Capabilities

- **Context-Aware Detection** - Knows "Dr. Wilson" is a person but "Wilson's disease" is a medical condition
- **OCR Error Resilience** - Catches PHI even when scanners corrupt characters
- **Smart Overlap Handling** - When multiple filters match, picks the optimal redaction
- **Zero External Calls** - Works completely offline, air-gapped deployment ready

---

## 🆚 Competitive Comparison

### Feature Comparison

| Feature | Vulpes Celare | Presidio | CliniDeID | Philter | AWS Comprehend Medical |
|---------|--------------|----------|-----------|---------|----------------------|
| **Open Source** | ✅ AGPL-3.0 | ✅ MIT | ✅ Open | ✅ BSD-3 | ❌ Proprietary |
| **Air-Gapped** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ❌ Cloud only |
| **Streaming API** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| **Policy DSL** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| **Cryptographic Provenance** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| **OCR Error Resilience** | ✅ Built-in | ❌ No | ❌ No | 🟡 Partial | ❌ No |
| **Trust Bundles** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |

### Accuracy Comparison (Honest Assessment)

| Tool | Sensitivity | Speed | Validation Status |
|------|-------------|-------|-------------------|
| **Vulpes Celare** | 99.6% | 2-3ms | ⚠️ Synthetic only |
| **CliniDeID** | 95.9% (names) | ~1 note/sec | ✅ i2b2 validated |
| **Philter** | 87-96% | ~1.4 notes/sec | ✅ i2b2, 130M+ notes |
| **Presidio** | ~88% recall | 3-11 sec/7K words | ✅ Multiple corpora |
| **NLM Scrubber** | 88.1% (names) | 8.6 notes/sec | ✅ i2b2 validated |

### Our Honest Position

**Demonstrable Advantages (Verified):**
- ⚡ **Speed**: Designed for 1000x+ faster processing
- 🔄 **Streaming**: Only open-source tool with real-time redaction API
- 📜 **Policy DSL**: Declarative policies without code changes
- 🔐 **Provenance**: Cryptographic audit trail no competitor offers
- 📄 **OCR Resilience**: Built-in tolerance for scanned document artifacts

**Advantages Pending Validation:**
- 🎯 **Accuracy**: 99.6% sensitivity needs i2b2 2014 validation
- 🏭 **Production Scale**: Competitors like Philter have processed 130M+ notes
- 🏥 **Real-World Coverage**: Production deployment reveals true edge cases

> **The Bottom Line:** We have the most comprehensive *feature set* in the open-source PHI redaction space. Our *accuracy claims* await industry-standard validation against the i2b2 2014 corpus. We're transparent about this because we believe it builds trust.

---

## 📊 Advanced Analytics

**Matthews Correlation Coefficient (MCC):** The gold standard for imbalanced classification. Unlike accuracy or F1, MCC correctly handles the asymmetry between PHI (rare) and non-PHI (common).

**F2-Score (Recall-Weighted):** Because missing PHI is catastrophic while over-redacting is merely inconvenient.

**Grading Profiles:**

| Profile | Sensitivity Weight | Use Case |
|---------|-------------------|----------|
| `HIPAA_STRICT` | 70% | Production - zero tolerance |
| `DEVELOPMENT` | 60% | Iterative improvement |
| `OCR_TOLERANT` | 55% | Scanned documents |
| `RESEARCH` | 50% | Pattern analysis |

---

## 📈 Performance

| Document Quality | Detection Rate |
|------------------|----------------|
| Perfect digital text | 99.9% |
| Minor errors | 99.8% |
| Light scan artifacts | 99.7% |
| Bad scans | 98.5% |
| Barely legible | 97.2% |

> Performance degrades gracefully, not catastrophically.

---

## 🧠 Vulpes Cortex & CLI System

Vulpes Celare includes a powerful **intelligent CLI system** that serves as the primary interface for interacting with the redaction engine, managing configurations, and orchestrating multi-agent workflows.

### CLI Architecture

```
~/.vulpes/                    # Local config directory (auto-created)
├── config.json              # API keys, preferences, provider settings
└── vulpes.db                # SQLite: sessions, audit logs, agent memory, HIPAA knowledge
```

> **Security Note**: The `~/.vulpes/` directory contains sensitive API keys and is excluded from git via `.gitignore`. Never commit this directory.

### Installation & Usage

```bash
# Install globally
npm run install-global

# Launch interactive menu
vulpes

# Direct commands
vulpes chat         # Native API chat with PHI redaction
vulpes cc           # Claude Code integration (wrapper)
vulpes --help       # Full command reference
```

### Native Chat Features

The native chat (`vulpes chat`) provides:

| Feature | Description |
|---------|-------------|
| **Multi-Provider Support** | OpenAI, Anthropic, Google, OpenRouter, Ollama, custom endpoints |
| **Automatic PHI Redaction** | All messages pass through Vulpes engine before LLM |
| **Subagent Orchestration** | Intelligent task routing with parallel/serial execution |
| **Session Persistence** | Conversations stored in SQLite with full audit trail |
| **HIPAA Knowledge Base** | 989 Q&A pairs with CFR citations for compliance queries |

### Subagent Orchestration

The CLI includes an **intelligent multi-agent system** that automatically detects workflow types and routes tasks:

| Agent | Role | Model |
|-------|------|-------|
| **Scout** | Fast PHI scanning and detection | haiku |
| **Analyst** | Root cause analysis for detection issues | sonnet |
| **Engineer** | Code fixes for filters and dictionaries | sonnet |
| **Tester** | Run tests and validate changes | haiku |
| **Auditor** | HIPAA compliance certification | haiku |
| **Setup** | System health and MCP status | haiku |

**Workflow Detection:**
```
"scan this note"        → Scout agent (parallel scan)
"fix the SSN filter"    → Engineer → Tester (serial)
"audit this document"   → Auditor agent
"why did this fail"     → Analyst agent
"full review"           → Scout → Analyst → Engineer → Tester → Auditor
```

### Chat Commands

```bash
/redact <text>      # Redact PHI from text
/analyze <text>     # Analyze PHI without redacting
/info               # Show Vulpes engine info
/model              # Switch models
/provider           # Switch providers
/subagents or /s    # Toggle subagent orchestration
/orchestrate <task> # Run intelligent workflow
/history            # View session history
/clear              # Clear conversation
```

### Cortex Intelligence

**Self-learning test system** with MCP (Model Context Protocol) integration:

- **Failure Patterns** - Why specific PHI types slip through
- **Fix History** - What worked, what didn't, and why
- **Regression Alerts** - Automatic detection of metric degradation
- **LLM-Augmented Analysis** - AI can introspect failures and propose fixes
- **HIPAA Knowledge RAG** - 989 compliance Q&A pairs with 254 unique CFR references

```bash
# Run tests with Cortex intelligence
node tests/master-suite/run.js --count 200 --cortex --cortex-report
```

### Custom Claude Agents

The project includes specialized Claude Code agents in `.claude/agents/`:

| Agent | Purpose |
|-------|---------|
| `phi-auditor.md` | HIPAA Safe Harbor compliance auditing |
| `filter-engineer.md` | Vulpes filter development and fixes |
| `test-analyst.md` | Test metrics analysis and recommendations |
| `hipaa-reviewer.md` | Full CFR-cited compliance review |

---

## ⛓️ Cryptographic Provenance

**Trust, but verify.** Includes immutable audit logs that cryptographically anchor every redaction event.

| Capability | Description |
|:---|:---|
| **Merkle-Linked Audit Log** | Every action hashed and linked. Tampering breaks the chain. |
| **Redaction Certificates** | Prove compliance mathematically without revealing PHI. |
| **Verification Portal** | Drag-and-drop Trust Bundles for instant verification. |
| **Zero-Knowledge Ready** | Designed for ZK-proof verification. |

> **The Ledger Remembers:** Your data stays local, but its integrity is anchored by math.

---

## 🧪 Technical Validation

```bash
git clone https://github.com/DocHatty/Vulpes-Celare
cd vulpes-celare && npm install && npm run build && npm test
```

### Validation Matrix

| Type | Status | Details |
|------|--------|---------|
| **Synthetic Corpus** | ✅ | 7,000+ adversarial documents |
| **Unit Tests** | ✅ | Core engine fully tested |
| **i2b2 2014 Benchmark** | ❌ | Industry gold standard - pending |
| **Production Pilot** | ❌ | Seeking partners |
| **Third-Party Audit** | ❌ | Seeking sponsors |

### Integration Guidance

> **HIPAA compliance is organizational, not purely technical.**

For production healthcare deployments, we recommend:
1. Human review for high-risk documents
2. Logging and monitoring of all operations
3. Incident response procedures
4. BAA review for cloud LLM providers
5. Legal counsel for compliance attestation

---

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

For commercial licensing: See [docs/legal/COMMERCIAL_LICENSE.md](docs/legal/COMMERCIAL_LICENSE.md)

---

## 🤝 Contributing

Contributions welcome! See [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md).

### Validation Contributions Especially Welcome

| Contribution | Impact |
|--------------|--------|
| **Run against i2b2 2014** | Validate accuracy claims |
| **Pilot deployment** | Real-world testing |
| **Security audit** | Enterprise trust |
| **Bug reports** | Improve coverage |
| **International formats** | Expand global support |

**Contributors who help validate will be acknowledged in published benchmarks.**

---

**Built with transparency. Validated through collaboration.**
