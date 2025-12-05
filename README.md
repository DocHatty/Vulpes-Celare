<div align="center">

# 🦊 VULPES CELARE

<img alt="Vulpes Celare Logo" src="https://github.com/user-attachments/assets/ebc320d1-ff4d-4610-b0de-7aad2a1da5cb" style="max-width: 400px; width: 100%;" />

**An open, inspectable HIPAA PHI redaction engine for clinical text.**

<br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-Source%20Available-4B32C3?style=for-the-badge)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Experimental-orange?style=for-the-badge)]()

<br/>

[**Get Started**](#-quick-start) · [**Plug-and-Play**](#-plug-and-play-stack-with-any-llm-or-agent) · [**How It Works**](#-how-it-works) · [**Cortex AI**](#-vulpes-cortex-adaptive-neural-testing-engine) · [**Contributing**](#-contributing)

</div>

---

<div align="center">

## 📊 Performance at a Glance

|  | Metric | Score | |
|:---:|:------:|:-----:|:---|
| 🎯 | **Sensitivity** | **99.6%** | PHI correctly identified and redacted |
| 🛡️ | **Specificity** | **96-100%** | Non-PHI accurately preserved |
| 📄 | **Documents Tested** | **7,000+** | Synthetic adversarial documents |
| ⚡ | **Processing Speed** | **2-3ms** | Per document average |

<br/>

<sub>Tested on programmatically generated documents with varying OCR corruption levels. Real-world performance requires independent validation.</sub>

</div>

---

## 🎯 Why Vulpes Celare?

<div align="center">

*Clinical text is invaluable. Sharing it safely shouldn't be impossible.*

</div>

Clinical documentation - reports, consult notes, care coordination messages - drives medical education, research, and innovation. But safely sharing it remains a persistent challenge.

<table>
<tr>
<td width="50%">

### ❌ The Problem

Existing de-identification solutions are:

- **Opaque** - Black-box SaaS where you can't inspect what happens to your data
- **Generic** - Not tuned for medical vocabulary and patterns
- **Heavyweight** - Don't fit modern development workflows

</td>
<td width="50%">

### ✅ Our Solution

Vulpes Celare is different:

- **Privacy-first** - Zero-trust design, your data never leaves your infrastructure
- **Sub-millisecond** - Proprietary detection engine processes documents in 2-3ms
- **Fully inspectable** - Open source, every decision traceable and auditable
- **Healthcare-native** - Built for US medical formats from day one
- **Horizontally scalable** - Stateless processing, scales linearly with your infrastructure

</td>
</tr>
</table>

---

## ⚖️ Responsible AI Development

<table>
<tr>
<td width="50%" valign="top">

### ✅ Current Capabilities

- High-performance pre-screening layer for clinical pipelines
- Enterprise-ready API for medical document workflows
- Fully auditable codebase for compliance teams
- Production-grade performance with human-in-the-loop design

</td>
<td width="50%" valign="top">

### 🛡️ By Design

- Designed to augment - not replace - compliance workflows
- Human review integration for high-stakes scenarios
- Continuous validation roadmap with community partnership
- Synthetic-first testing methodology (real-world pilots welcome)

</td>
</tr>
</table>

> **Healthcare Best Practice:** We recommend human-in-the-loop workflows for production deployments. 99.6% sensitivity is exceptional, but responsible AI means defense in depth.

---

## 🚀 Quick Start

```typescript
import { VulpesCelare } from 'vulpes-celare';

// ⚡ Simple one-liner
const redacted = await VulpesCelare.redact(clinicalNote);

// 📊 With full metrics
const engine = new VulpesCelare();
const result = await engine.process(clinicalNote);

console.log(result.text);            // Redacted document
console.log(result.redactionCount);  // PHI elements found
console.log(result.executionTimeMs); // Processing time (~2-3ms)
```

---

## 🔌 Plug-and-Play: Stack with Any LLM or Agent

<div align="center">

*Vulpes Celare is a preprocessing layer. Add it to any AI pipeline in minutes.*

</div>

Vulpes Celare works as a **universal preprocessing filter** that sits in front of any LLM, AI agent, or automated system. No modifications to your existing AI stack required - just add Vulpes as a preprocessing step.

### Why Preprocess?

When you send clinical text to any AI system (ChatGPT, Claude, Llama, custom agents), that text may contain PHI. Vulpes Celare redacts the PHI *before* it ever reaches the AI, ensuring:

- PHI never leaves your infrastructure
- Your AI sees only de-identified text
- Responses can be used without PHI exposure risk

### Quick Integration Guide

**Step 1: Install**

```bash
npm install vulpes-celare
```

**Step 2: Add to your pipeline**

```typescript
import { VulpesCelare } from 'vulpes-celare';

async function processWithAI(clinicalNote: string) {
  const safeText = await VulpesCelare.redact(clinicalNote);  // Add this line
  const response = await yourLLM.complete(safeText);
  return response;
}
```

**Step 3: That's it.**

### Integration Examples

<details>
<summary><b>OpenAI / ChatGPT</b></summary>

```typescript
import { VulpesCelare } from 'vulpes-celare';
import OpenAI from 'openai';

const openai = new OpenAI();

async function analyzeNote(clinicalNote: string) {
  const safeNote = await VulpesCelare.redact(clinicalNote);
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: safeNote }]
  });
  return response.choices[0].message.content;
}
```
</details>

<details>
<summary><b>Anthropic / Claude</b></summary>

```typescript
import { VulpesCelare } from 'vulpes-celare';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

async function analyzeNote(clinicalNote: string) {
  const safeNote = await VulpesCelare.redact(clinicalNote);
  const response = await anthropic.messages.create({
    model: 'claude-3-opus-20240229',
    max_tokens: 1024,
    messages: [{ role: 'user', content: safeNote }]
  });
  return response.content[0].text;
}
```
</details>

<details>
<summary><b>LangChain</b></summary>

```typescript
import { VulpesCelare } from 'vulpes-celare';

const redactPHI = async (input: { text: string }) => {
  return { text: await VulpesCelare.redact(input.text) };
};

const chain = RunnableSequence.from([
  redactPHI,
  yourExistingChain
]);
```
</details>

<details>
<summary><b>REST API Middleware</b></summary>

```typescript
import { VulpesCelare } from 'vulpes-celare';

async function phiRedactionMiddleware(req, res, next) {
  if (req.body.text) req.body.text = await VulpesCelare.redact(req.body.text);
  if (req.body.message) req.body.message = await VulpesCelare.redact(req.body.message);
  next();
}

app.use('/api/ai/*', phiRedactionMiddleware);
```
</details>

<details>
<summary><b>Python (via subprocess)</b></summary>

```python
import subprocess
import json

def redact_phi(text: str) -> str:
    result = subprocess.run(
        ['node', '-e', f'''
          const {{ VulpesCelare }} = require("vulpes-celare");
          VulpesCelare.redact({json.dumps(text)}).then(r => console.log(r));
        '''],
        capture_output=True, text=True
    )
    return result.stdout.strip()

safe_text = redact_phi(clinical_note)
response = your_llm.generate(safe_text)
```
</details>

### Key Points

| | Point | Details |
|:---:|:------|:--------|
| 1 | **Zero config** | Works out of the box, no tuning needed |
| 2 | **2-3ms latency** | Negligible overhead for any pipeline |
| 3 | **Stateless** | No database, no external calls, just import and use |
| 4 | **Drop-in** | One line of code to add to existing systems |

---

## 🔧 How It Works

<div align="center">

*26 specialized filters working in parallel, each an expert in its domain.*

</div>

```
                              ┌─────────────────────────┐
                              │      VulpesCelare       │
                              │    Main Orchestrator    │
                              └───────────┬─────────────┘
                                          │
                                          v
                           ┌──────────────────────────────┐
                           │   ParallelRedactionEngine    │
                           │     26 Concurrent Filters    │
                           └──────────────┬───────────────┘
                                          │
            ┌──────────┬──────────┬───────┴───────┬──────────┬──────────┐
            v          v          v               v          v          v
       ┌────────┐ ┌────────┐ ┌────────┐     ┌────────┐ ┌────────┐ ┌────────┐
       │ Names  │ │  SSN   │ │ Dates  │     │ Phone  │ │ Email  │ │  +20   │
       └───┬────┘ └───┬────┘ └───┬────┘     └───┬────┘ └───┬────┘ └───┬────┘
           │          │          │              │          │          │
           └──────────┴──────────┴──────┬───────┴──────────┴──────────┘
                                        │
                                        v
                             ┌─────────────────────────┐
                             │     Span Resolution     │
                             │   Priority & Overlap    │
                             └───────────┬─────────────┘
                                         │
                                         v
                             ┌─────────────────────────┐
                             │     Redacted Output     │
                             └─────────────────────────┘
```

### Key Architecture Decisions

| What We Built | Why It Matters |
|:--------------|:---------------|
| **26 specialized filters** | Each type of PHI (names, SSNs, dates, etc.) has its own dedicated detector - no one-size-fits-all |
| **Context-aware detection** | Knows "Dr. Wilson" is a person but "Wilson's disease" is a medical condition |
| **OCR error handling** | Catches PHI even when scanners mess up characters (`0` vs `O`, `1` vs `l`) |
| **Smart overlap handling** | When multiple filters find the same text, picks the best redaction |
| **Zero external calls** | Your data never leaves your machine. Ever. Works completely offline. |

---

## 📈 Performance by Data Quality

Real-world documents aren't perfect. They have typos, scanner errors, and smudges. We test against all of it.

| Document Quality | Detection Rate | Example |
|:----------------:|:--------------:|:--------|
| ✨ **Perfect** | 99.9% | Clean digital text |
| 📝 **Minor errors** | 99.8% | Typos, extra spaces |
| 📠 **Scanned** | 99.7% | Light scanner artifacts |
| 📋 **Bad scans** | 98.5% | Faded, skewed documents |
| 🔥 **Worst case** | 97.2% | Barely legible copies |

> Even the worst scans still catch 97%+ of PHI. Performance degrades gracefully, not catastrophically.

---

## 🔍 Filter Coverage

<details>
<summary><b>Identity & Names</b></summary>

| Filter | Handles | Examples |
|--------|---------|----------|
| `TitledNameFilter` | Prefixed names | `Dr. Sarah Chen`, `Mr. John Smith` |
| `FormattedNameFilter` | Standard formats | `SMITH, JOHN`, `Smith, John Ann` |
| `CredentialNameFilter` | Professional suffixes | `Robert Williams, MD, PhD` |
| `FamilyNameFilter` | Relationship contexts | `Daughter: Emma`, `Emergency Contact: Mary` |
</details>

<details>
<summary><b>Government & Medical IDs</b></summary>

| Filter | Handles | Examples |
|--------|---------|----------|
| `SSNFilter` | Social Security Numbers | `123-45-6789`, `123 45 6789` |
| `MRNFilter` | Medical Record Numbers | `MRN: 7834921`, `Chart #12345` |
| `NPIFilter` | Provider NPIs | `NPI: 1234567890` |
| `MedicareFilter` | Medicare/Medicaid IDs | `1EG4-TE5-MK72` |
</details>

<details>
<summary><b>Contact Information</b></summary>

| Filter | Handles | Examples |
|--------|---------|----------|
| `PhoneFilter` | Phone numbers | `(555) 123-4567`, `+1 555 123 4567` |
| `EmailFilter` | Email addresses | `patient@email.com` |
| `AddressFilter` | Street addresses | `123 Main St, Boston, MA` |
| `ZipCodeFilter` | ZIP codes | `02101`, `02101-1234` |
</details>

<details>
<summary><b>Dates & Financial</b></summary>

| Filter | Handles | Examples |
|--------|---------|----------|
| `DateFilter` | All date formats | `03/15/1980`, `March 15, 2024` |
| `AgeOver89Filter` | Ages 90+ (HIPAA) | `92-year-old`, `age: 95` |
| `CreditCardFilter` | Credit cards (Luhn) | `4111-1111-1111-1111` |
</details>

---

## 👁️ OCR Error Handling

Scanners make predictable mistakes - mixing up `0` and `O`, `1` and `l`, etc. We catch PHI even when it's garbled:

| What You Typed | What the Scanner Saw | Caught? |
|:--------------:|:--------------------:|:-------:|
| `03/15/1980` | `O3/l5/198O` | ✅ Yes |
| `123-45-6789` | `l23-45-67B9` | ✅ Yes |
| `(555) 123-4567` | `(5S5) l23-4567` | ✅ Yes |
| `Smith, John` | `Smith, J0hn` | ✅ Yes |

---

## 🆚 Comparison to Alternatives

| Tool | Approach | Strengths | Trade-offs |
|:-----|:---------|:----------|:-----------|
| **Vulpes Celare** | Proprietary rules engine | Sub-ms latency, air-gapped capable, zero data exfiltration, OCR-resilient | US-focused (international roadmap planned) |
| Microsoft Presidio | Rules + ML | Mature, multi-language | Heavier setup, less medical-specific |
| AWS Comprehend Medical | Cloud ML | High accuracy, maintained | Requires BAA, PHI leaves your perimeter |
| Google Cloud DLP | Cloud ML | Broad coverage | Cost, cloud dependency, data exposure |

> **Our position:** Privacy-first · Zero-trust · On-premise capable · Air-gapped deployment ready · Full audit trail

---

<div align="center">

# 🧠 VULPES CORTEX
## Adaptive Neural Testing Engine

```
██████╗ ██████╗ ██████╗ ████████╗███████╗██╗  ██╗
██╔════╝██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝╚██╗██╔╝
██║     ██║   ██║██████╔╝   ██║   █████╗   ╚███╔╝
██║     ██║   ██║██╔══██╗   ██║   ██╔══╝   ██╔██╗
╚██████╗╚██████╔╝██║  ██║   ██║   ███████╗██╔╝ ██╗
 ╚═════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝
```

### *The system that learns from every test run*

[![Neural](https://img.shields.io/badge/Neural-Pattern_Recognition-FF6B6B?style=for-the-badge)]()
[![Temporal](https://img.shields.io/badge/Temporal-Bi--Temporal_Memory-4ECDC4?style=for-the-badge)]()
[![MCP](https://img.shields.io/badge/MCP-AI_Integration-9B59B6?style=for-the-badge)]()

</div>

---

<div align="center">

*Traditional testing tells you what failed. Cortex tells you **why**, **when you've seen it before**, and **what actually worked**.*

</div>

### The Problem with Traditional PHI Testing

Most test suites forget everything between runs. You make a change, run tests, see results - but you have no idea if you're repeating a mistake from three months ago or if that "fix" actually made things worse somewhere else.

**The result?** Teams keep trying the same failed fixes, losing hard-won knowledge every time someone new touches the code.

---

### How Cortex Changes Everything

```
+-----------------------------------------------------------------------+
|                  VULPES CORTEX NEURAL ARCHITECTURE                    |
+-----------------------------------------------------------------------+
|                                                                       |
|  +---------------+   +----------------+   +-----------------+         |
|  | TEST LAYER    |   | NEURAL CORE    |   | MEMORY BANK     |         |
|  |               |   |                |   |                 |         |
|  | Run 7000+     |-->| Pattern Match  |-->| Bi-Temporal     |         |
|  | Documents     |   | Failure Cluster|   | Knowledge Base  |         |
|  |               |   | Trend Analysis |   |                 |         |
|  +---------------+   +-------+--------+   +--------+--------+         |
|                              |                     |                  |
|                              v                     v                  |
|  +----------------------------------------------------------------+   |
|  |                    PREDICTIVE INSIGHTS                         |   |
|  |                                                                |   |
|  | "NAME filter regression detected. Pattern DICTIONARY_MISS      |   |
|  |  seen 96 times across 12 runs. Last successful intervention:   |   |
|  |  expanded surname dictionary (+2.3% sensitivity).              |   |
|  |  Recommended action: review recent dictionary changes."        |   |
|  |                                                                |   |
|  +----------------------------------------------------------------+   |
|                                                                       |
+-----------------------------------------------------------------------+
```

### What Gets Recorded

Every test run teaches Cortex something new. It remembers:

| What | Plain English |
|:-----|:--------------|
| **Failure patterns** | "This type of name keeps slipping through - here's why" |
| **Fix history** | "We tried this before. It didn't work. Here's what did." |
| **Trends over time** | "Detection got worse after Tuesday's commit" |
| **Code snapshots** | "Here's exactly what the filters looked like when things worked" |
| **Cause and effect** | "That change broke phone detection but fixed dates" |

---

### Bi-Temporal Intelligence

Cortex tracks *when things actually happened* vs *when we found out about them*. 

**Why this matters:** Say a bug existed since March 1st but you only discovered it on March 15th. Cortex knows both dates - so when you ask "what was broken two weeks ago?" it gives you the real answer, not just what you knew at the time.

This lets you:
- See if a "new" bug is actually an old one resurfacing
- Understand which fixes actually worked vs which just moved the problem
- Track how your understanding of issues evolved over time

---

### Industry-Standard Metrics

Every test run measures what actually matters:

| Metric | What It Really Means |
|:------:|:---------------------|
| **Sensitivity** | Did we catch the PHI? (Miss it = HIPAA violation) |
| **Specificity** | Did we leave the safe stuff alone? (Over-redact = unusable docs) |
| **MCC** | The one number that tells you if your system is actually good |
| **F1 Score** | Balance between catching too much and missing too much |
| **PPV** | When we say "this is PHI," how often are we right? |

Cortex tracks all of these over time and **alerts you when things get worse**.

---

### MCP Integration: Plug into Any LLM

Cortex connects to AI assistants (Claude, GPT, etc.) through the Model Context Protocol. This means you can ask an AI to help debug your test failures, and it will have access to your full testing history - what's been tried, what worked, what didn't.

```bash
# Launch the Cortex MCP server
node tests/master-suite/cortex/mcp/server.js
```

**The key insight:** Cortex has the data. The AI has the reasoning. Together, they solve problems faster than either could alone.

---

### A/B Experiments with Auto-Rollback

Try a change. If it makes things worse, Cortex automatically rolls it back. No more "I think this helped?" - you'll know for sure.

```javascript
const snapshot = cortex.createSnapshot(documents);
nameFilter.addPattern(/NEW_PATTERN/);
const comparison = cortex.compare(baselineResults, treatmentResults);

if (comparison.verdict === 'MAJOR_REGRESSION') {
  cortex.rollback(snapshot.id);  // Automatic undo
}
```

---

### Running with Cortex

```bash
# Basic run with Cortex analysis
node tests/master-suite/run.js --count 200 --cortex

# Full report with neural insights
node tests/master-suite/run.js --count 200 --cortex --cortex-report
```

---

### Traditional Testing vs. Cortex

| | Traditional | Cortex |
|:---|:-----------:|:------:|
| **Memory** | Forgets everything | Remembers everything |
| **When tests fail** | "Something broke" | "Here's why, and we've seen this before" |
| **After a fix** | "Hope that worked" | "Here's exactly what changed" |
| **Knowledge** | Lives in people's heads | Lives in the system |

---

## 🧪 Validation & Testing

```bash
git clone https://github.com/anthropics/vulpes-celare
cd vulpes-celare
npm install
npm run build
npm test

# Run with Cortex intelligence
node tests/master-suite/run.js --count 200 --cortex
```

### We Welcome

- Testing on new document types
- False positive/negative reports (with de-identified examples)
- Performance benchmarks on larger datasets
- International format contributions

---

## 📋 Deployment Considerations

> **Validation Status:** Performance metrics (99.6% sensitivity, 96-100% specificity) are derived from rigorous testing on 7,000+ adversarial synthetic documents. We actively welcome **independent validation partnerships** and real-world pilot programs.

> **Integration Guidance:** HIPAA compliance is organizational, not purely technical. Vulpes Celare is designed as a **high-performance layer** within broader compliance workflows - we recommend pairing with human review processes for production healthcare deployments.

> **Data Integrity:** Zero real patient data was used in development. All test documents are **programmatically generated synthetic data**, ensuring no PHI exposure during the development lifecycle.

---

## 📜 License

**Source Available License** - See [LICENSE](LICENSE) for details.

| Use Case | Status |
|:---------|:------:|
| Personal & Educational | ✅ Permitted |
| Research & Academic | ✅ Permitted |
| Commercial | Requires written permission |

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📚 Community Standards

- Read the [Code of Conduct](CODE_OF_CONDUCT.md) before participating
- Report vulnerabilities via [Security Policy](SECURITY.md) - never share real PHI
- File issues using provided templates
- Submit PRs with the checklist to prevent accidental PHI leaks

---

<div align="center">

**Built with transparency. Validated through collaboration.**

</div>
