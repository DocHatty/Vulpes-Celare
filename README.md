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

[**Get Started**](#-quick-start) · [**How It Works**](#-how-it-works) · [**Cortex AI**](#-vulpes-cortex-adaptive-neural-testing-engine) · [**Contributing**](#-contributing)

</div>

<br/>

---

<br/>

<div align="center">

## 📊 Performance at a Glance

<br/>

|  | Metric | Score | |
|:---:|:------:|:-----:|:---|
| 🎯 | **Sensitivity** | **99.6%** | PHI correctly identified and redacted |
| 🛡️ | **Specificity** | **96-100%** | Non-PHI accurately preserved |
| 📄 | **Documents Tested** | **7,000+** | Synthetic adversarial documents |
| ⚡ | **Processing Speed** | **2-3ms** | Per document average |

<br/>

<sub>📋 Tested on programmatically generated documents with varying OCR corruption levels.<br/>Real-world performance requires independent validation.</sub>

</div>

<br/>

---

<br/>

## 🎯 Why Vulpes Celare?

<div align="center">

*Clinical text is invaluable. Sharing it safely shouldn't be impossible.*

</div>

<br/>

Clinical documentation—reports, consult notes, care coordination messages—drives medical education, research, and innovation. But safely sharing it remains a persistent challenge.

<br/>

<table>
<tr>
<td width="50%">

### ❌ The Problem

Existing de-identification solutions are:

- **🔒 Opaque** — Black-box SaaS where you can't inspect what happens to your data
- **🌍 Generic** — Not tuned for medical vocabulary and patterns
- **⚙️ Heavyweight** — Don't fit modern development workflows

</td>
<td width="50%">

### ✅ Our Solution

Vulpes Celare is different:

- **🔍 Fully Inspectable** — Open source, every decision traceable
- **🏥 Healthcare-Native** — Built for US medical formats from day one
- **🚀 Developer-First** — TypeScript, embeddable anywhere

</td>
</tr>
</table>

<br/>

---

<br/>

## ⚖️ What This Is (and Isn't)

<br/>

<table>
<tr>
<td width="50%" valign="top">

### ✅ This IS

- 🔬 A first-pass redaction tool for pre-screening
- 🛠️ A research utility for medical document developers
- 📖 An open, hackable codebase to inspect and extend
- 🌱 A starting point that needs community validation

</td>
<td width="50%" valign="top">

### ❌ This is NOT

- 📜 A compliance certification or HIPAA guarantee
- 🤖 A replacement for human review in high-stakes scenarios
- 🏭 Production-ready for unsupervised de-identification
- ✅ Validated on real clinical data (yet)

</td>
</tr>
</table>

<br/>

> **💡 Reality Check:** 99.6% sensitivity means ~0.4% of PHI may slip through. For most use cases, that requires human spot-checking or a double-pass workflow.

<br/>

---

<br/>

## 🚀 Quick Start

```typescript
import { VulpesCelare } from 'vulpes-celare';

// ⚡ Simple one-liner
const redacted = await VulpesCelare.redact(clinicalNote);

// 📊 With full metrics
const engine = new VulpesCelare();
const result = await engine.process(clinicalNote);

console.log(result.text);            // 📄 Redacted document
console.log(result.redactionCount);  // 🔢 PHI elements found
console.log(result.executionTimeMs); // ⏱️  Processing time (~2-3ms)
```

<br/>

---

<br/>

## 🔧 How It Works

<div align="center">

*26 specialized filters working in parallel, each an expert in its domain.*

</div>

<br/>

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

<br/>

### 🏗️ Key Architecture Decisions

| | Decision | Why It Matters |
|:---:|:---------|:---------------|
| 🎯 | **26 Specialized Filters** | Each PHI type has dedicated logic—no monolithic one-size-fits-all model |
| 🧠 | **Context Awareness** | Distinguishes "Dr. Wilson" (person) from "Wilson's disease" (condition) via 10,000+ medical terms |
| 👁️ | **OCR Tolerance** | Handles scan errors: `O`↔`0`, `l`↔`1`, `S`↔`5`, `B`↔`8`, `\|`↔`l` |
| ⚖️ | **Span Resolution** | When filters overlap, priority rules determine the winner |
| 🚫 | **Rules Over ML** | Transparency, speed, predictability. No GPU. No cloud. No black box. |

<br/>

---

<br/>

## 📈 Performance by Data Quality

<div align="center">

*Real documents have errors. We test against them.*

</div>

<br/>

| Quality Level | Sensitivity | What It Simulates |
|:-------------:|:-----------:|:------------------|
| ✨ **Clean** | 99.9% | Perfect digital text |
| 📝 **Low Noise** | 99.8% | Minor typos and spacing |
| 📠 **Medium OCR** | 99.7% | Light scan artifacts |
| 📋 **High OCR** | 98.5% | Heavy corruption |
| 🔥 **Extreme** | 97.2% | Worst-case scan quality |

<br/>

> **🎯 Key Insight:** Performance degrades *gracefully*. Even worst-case scans maintain 97%+ detection.

<br/>

---

<br/>

## 🔍 Filter Coverage

<br/>

<details>
<summary><b>👤 Identity & Names</b></summary>
<br/>

| Filter | Handles | Examples |
|--------|---------|----------|
| `TitledNameFilter` | Prefixed names | `Dr. Sarah Chen`, `Mr. John Smith` |
| `FormattedNameFilter` | Standard formats | `SMITH, JOHN`, `Smith, John Ann` |
| `CredentialNameFilter` | Professional suffixes | `Robert Williams, MD, PhD` |
| `FamilyNameFilter` | Relationship contexts | `Daughter: Emma`, `Emergency Contact: Mary` |

</details>

<details>
<summary><b>🪪 Government & Medical IDs</b></summary>
<br/>

| Filter | Handles | Examples |
|--------|---------|----------|
| `SSNFilter` | Social Security Numbers | `123-45-6789`, `123 45 6789` |
| `MRNFilter` | Medical Record Numbers | `MRN: 7834921`, `Chart #12345` |
| `NPIFilter` | Provider NPIs | `NPI: 1234567890` |
| `MedicareFilter` | Medicare/Medicaid IDs | `1EG4-TE5-MK72` |

</details>

<details>
<summary><b>📞 Contact Information</b></summary>
<br/>

| Filter | Handles | Examples |
|--------|---------|----------|
| `PhoneFilter` | Phone numbers | `(555) 123-4567`, `+1 555 123 4567` |
| `EmailFilter` | Email addresses | `patient@email.com` |
| `AddressFilter` | Street addresses | `123 Main St, Boston, MA` |
| `ZipCodeFilter` | ZIP codes | `02101`, `02101-1234` |

</details>

<details>
<summary><b>📅 Dates & Financial</b></summary>
<br/>

| Filter | Handles | Examples |
|--------|---------|----------|
| `DateFilter` | All date formats | `03/15/1980`, `March 15, 2024` |
| `AgeOver89Filter` | Ages 90+ (HIPAA) | `92-year-old`, `age: 95` |
| `CreditCardFilter` | Credit cards (Luhn) | `4111-1111-1111-1111` |

</details>

<br/>

---

<br/>

## 👁️ OCR Error Handling

<div align="center">

*Scanned documents introduce predictable errors. We catch them.*

</div>

<br/>

| Original | Corrupted | Status |
|:--------:|:---------:|:------:|
| `03/15/1980` | `O3/l5/198O` | ✅ Detected |
| `123-45-6789` | `l23-45-67B9` | ✅ Detected |
| `(555) 123-4567` | `(5S5) l23-4567` | ✅ Detected |
| `Smith, John` | `Smith, J0hn` | ✅ Detected |
| `William` | `WiIlliam` | ✅ Detected |
| `Elizabeth` | `EIiz@beth` | ✅ Detected |

<br/>

**Substitution Matrix:** `O`↔`0` · `l`↔`1`↔`I`↔`|` · `S`↔`5` · `B`↔`8` · `g`↔`9` · plus spacing variations

<br/>

---

<br/>

## 🔌 Integration Examples

<br/>

<details>
<summary><b>🌐 Express Middleware</b></summary>

```typescript
import { VulpesCelare } from 'vulpes-celare';

app.use('/api/notes', async (req, res, next) => {
  if (req.body.clinicalNote) {
    req.body.clinicalNote = await VulpesCelare.redact(req.body.clinicalNote);
  }
  next();
});
```

</details>

<details>
<summary><b>📦 Batch Processing</b></summary>

```typescript
const engine = new VulpesCelare();
const results = await engine.processBatch(documents);
// ⚡ Average: 2-3ms per document
```

</details>

<details>
<summary><b>👁️ Human Review Workflow</b></summary>

```typescript
const engine = new VulpesCelare();
const result = await engine.process(document);

if (result.redactionCount > 0) {
  await queueForReview({
    original: document,
    redacted: result.text,
    phiCount: result.redactionCount,
    breakdown: result.breakdown
  });
}
```

</details>

<br/>

---

<br/>

## 🆚 Comparison to Alternatives

<br/>

| Tool | Approach | Strengths | Trade-offs |
|:-----|:---------|:----------|:-----------|
| **🦊 Vulpes Celare** | Rules + Vocabulary | Fast, local, inspectable, OCR-tolerant | Synthetic-only validation; US-focused |
| Microsoft Presidio | Rules + ML | Mature, multi-language | Heavier setup, less medical-specific |
| AWS Comprehend Medical | Cloud ML | High accuracy, maintained | Requires BAA, data leaves your network |
| Google Cloud DLP | Cloud ML | Broad coverage | Cost, cloud dependency |

<br/>

> **🎯 Our Niche:** Local-first · TypeScript-native · Healthcare-specific · Fully inspectable

<br/>

---

<br/>

<div align="center">

# 🧠 VULPES CORTEX
## Adaptive Neural Testing Engine

<br/>

```
   ██████╗ ██████╗ ██████╗ ████████╗███████╗██╗  ██╗
  ██╔════╝██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝╚██╗██╔╝
  ██║     ██║   ██║██████╔╝   ██║   █████╗   ╚███╔╝
  ██║     ██║   ██║██╔══██╗   ██║   ██╔══╝   ██╔██╗
  ╚██████╗╚██████╔╝██║  ██║   ██║   ███████╗██╔╝ ██╗
   ╚═════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝
```

<br/>

### *The System That Learns From Every Test Run*

<br/>

[![Neural](https://img.shields.io/badge/Neural-Pattern_Recognition-FF6B6B?style=for-the-badge)]()
[![Temporal](https://img.shields.io/badge/Temporal-Bi--Temporal_Memory-4ECDC4?style=for-the-badge)]()
[![MCP](https://img.shields.io/badge/MCP-AI_Integration-9B59B6?style=for-the-badge)]()

</div>

<br/>

---

<br/>

<div align="center">

*Traditional testing tells you what failed.*

*Cortex tells you **why**, **when you've seen it before**, and **what actually worked**.*

</div>

<br/>

### 🧩 The Problem with Traditional PHI Testing

Most test suites are **stateless amnesiacs**. Run 1,000 tests, get results, make changes, run again. But critical questions go unanswered:

- 🔄 Did that regex change *actually* help, or did it break something else?
- 🔁 We fixed NAME detection last month—why is it failing *the same way* again?
- 📊 Which patterns keep recurring across hundreds of runs?

**The result?** Teams make the same mistakes, try the same failed fixes, and lose institutional knowledge every time someone new touches the code.

<br/>

---

<br/>

### 🧠 How Cortex Changes Everything

<br/>

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                      VULPES CORTEX NEURAL ARCHITECTURE                        │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│    ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐     │
│    │   TEST LAYER    │      │   NEURAL CORE   │      │   MEMORY BANK   │     │
│    │                 │      │                 │      │                 │     │
│    │   Run 7000+     │─────>│ Pattern Match   │─────>│  Bi-Temporal    │     │
│    │   Documents     │      │ Failure Cluster │      │  Knowledge Base │     │
│    │                 │      │ Trend Analysis  │      │                 │     │
│    └─────────────────┘      └────────┬────────┘      └────────┬────────┘     │
│                                      │                        │              │
│                                      v                        v              │
│    ┌─────────────────────────────────────────────────────────────────────┐   │
│    │                       PREDICTIVE INSIGHTS                            │   │
│    │                                                                      │   │
│    │  "NAME filter regression detected. Pattern DICTIONARY_MISS seen     │   │
│    │   96 times across 12 runs. Last successful intervention: expanded   │   │
│    │   surname dictionary (+2.3% sensitivity). Recommended action:       │   │
│    │   review recent dictionary changes."                                 │   │
│    │                                                                      │   │
│    └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

<br/>

### 📊 What Gets Recorded

Every test run feeds the neural knowledge base:

| Data Layer | What It Captures | Why It Matters |
|:-----------|:-----------------|:---------------|
| 🔴 **Failure Patterns** | Categorized failure signatures | Know *why* things fail, not just *that* they failed |
| 🔧 **Intervention History** | Every fix attempt and outcome | Never repeat a failed experiment |
| 📈 **Metric Trends** | Sensitivity/specificity over time | Catch regressions before they compound |
| 💻 **Codebase State** | Filter versions at each run | Correlate code changes with outcomes |
| 🔗 **Causal Links** | Change → Effect relationships | Understand the *impact* of every modification |

<br/>

---

<br/>

### ⏱️ Bi-Temporal Intelligence

Cortex doesn't just store data—it understands **time** in two dimensions:

```
┌────────────────────────────────────────────────────────────────────┐
│                    BI-TEMPORAL KNOWLEDGE MODEL                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   t_occurred    When did this pattern first appear in reality?     │
│        │                                                           │
│        ▼                                                           │
│   ════════════════════════════════════════════════════════════     │
│   │ Mar 1 │ Mar 8 │ Mar 15 │ Mar 22 │ Mar 29 │ Apr 5  │            │
│   ════════════════════════════════════════════════════════════     │
│        ▲                                                           │
│        │                                                           │
│   t_recorded    When did Cortex learn about it?                    │
│                                                                    │
│   t_valid       When was this knowledge true/applicable?           │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

<br/>

> **🔮 Query Example:** *"What did we know about NAME detection failures on March 15th, and what have we learned since?"*

This temporal awareness lets Cortex provide historically-accurate insights and track how understanding evolves over time.

<br/>

---

<br/>

### 📏 Industry-Standard Metrics

Cortex tracks every metric that matters for PHI detection:

<br/>

| Metric | Icon | What It Measures | Risk if Wrong |
|:------:|:----:|:-----------------|:--------------|
| **Sensitivity** | 🎯 | PHI correctly caught | Missed PHI = HIPAA violation |
| **Specificity** | 🛡️ | Non-PHI correctly preserved | Over-redaction = unusable docs |
| **MCC** | ⚖️ | Matthews Correlation Coefficient | Best single metric for imbalanced data |
| **F1 Score** | 🎼 | Harmonic precision/recall balance | Overall detection quality |
| **PPV** | 📊 | Positive Predictive Value | Confidence in redaction decisions |

<br/>

Every run calculates all metrics, tracks trends, and **alerts on regressions automatically**.

<br/>

---

<br/>

### 🤖 MCP Integration: Plug Into Any LLM

Cortex speaks **Model Context Protocol (MCP)**—the emerging standard for AI tool integration:

```bash
# 🚀 Launch the Cortex MCP Server
node tests/master-suite/cortex/mcp/server.js

# What Cortex exposes:
# ├── 16 Tools    → analyze, compare, record, rollback, snapshot...
# ├── 8 Prompts   → debug failures, plan experiments, status reports...
# └── Auto-handshake with any MCP-compatible AI client
```

<br/>

```
┌──────────────────────┐          ┌──────────────────────┐
│      Your LLM        │<────────>│     Cortex MCP       │
│  (Claude, GPT, etc)  │   MCP    │                      │
│                      │ Protocol │  - Historical data   │
│  Reasoning &         │          │  - Pattern analysis  │
│  Decisions           │          │  - Metric trends     │
│                      │          │  - Recommendations   │
└──────────────────────┘          └──────────────────────┘
```

**The key insight:** Cortex provides **data and context**. The LLM provides **reasoning and decisions**. Together, they form a complete intelligent testing system.

<br/>

---

<br/>

### 🧪 A/B Experiments with Auto-Rollback

Test changes with confidence:

```javascript
// 📸 Snapshot current state
const snapshot = cortex.createSnapshot(documents);

// 🔧 Make your filter change
nameFilter.addPattern(/NEW_PATTERN/);

// ⚖️ Compare before/after on IDENTICAL documents
const comparison = cortex.compare(baselineResults, treatmentResults);

// 🔄 Automatic rollback if sensitivity drops >1%
if (comparison.verdict === 'MAJOR_REGRESSION') {
  cortex.rollback(snapshot.id);
  console.log('⚠️ Change reverted - sensitivity regression detected');
}
```

<br/>

> **🎯 No more guessing.** Measure. Compare. *Know.*

<br/>

---

<br/>

### 🏃 Running with Cortex

```bash
# 🧪 Basic run with Cortex analysis
node tests/master-suite/run.js --count 200 --cortex

# 📊 Full report with neural insights
node tests/master-suite/run.js --count 200 --cortex --cortex-report

# What you'll see:
# ┌──────────────────────────────────────────────────┐
# │ ✓ Sensitivity: 99.6%                             │
# │ ✓ Top failure pattern: DICTIONARY_MISS (12x)     │
# │ ✓ Trend: IMPROVING over last 5 runs              │
# │ ✓ Recommendation: Focus on NAME edge cases       │
# │ ✓ Confidence: HIGH (based on 7000+ samples)      │
# └──────────────────────────────────────────────────┘
```

<br/>

---

<br/>

### 🔄 Traditional Testing vs. Cortex

<br/>

| | Traditional | Vulpes Cortex |
|:---:|:-----------:|:-------------:|
| **Memory** | ❌ Stateless | ✅ Remembers everything |
| **Insight** | "Test failed" | "Why, and have we seen this before?" |
| **Analysis** | Manual | Pattern recognition built-in |
| **Experiments** | Hope it helped | Measured A/B with auto-rollback |
| **Knowledge** | In people's heads | In the system, forever |
| **Learning** | None | Improves with every run |

<br/>

---

<br/>

## 🧪 Validation & Testing

```bash
# Clone and setup
git clone https://github.com/anthropics/vulpes-celare
cd vulpes-celare
npm install
npm run build

# 🧪 Run comprehensive test suite
npm test

# 🧠 Run with Cortex intelligence
node tests/master-suite/run.js --count 200 --cortex
```

<br/>

### 🤝 We Welcome

- 📄 Testing on new document types
- 🐛 False positive/negative reports (with de-identified examples)
- 📊 Performance benchmarks on larger datasets
- 🌍 International format contributions

<br/>

---

<br/>

## ⚠️ Important Notices

<br/>

> **🧪 Experimental Status**
>
> This software is experimental. The metrics reported (99.6% sensitivity, 96-100% specificity) are based on testing with 7,000+ programmatically generated synthetic documents. These results have **not been independently verified** or tested against real clinical data.

<br/>

> **📋 Not a Compliance Solution**
>
> HIPAA compliance is organizational, not just technical. De-identification requires policies, procedures, training, risk assessment, and often human review workflows. This tool is **one component**, not a complete solution.

<br/>

> **🔒 No Real Patient Data**
>
> No real patient data, hospital resources, or Protected Health Information was used in development or testing. All test documents are **entirely synthetic**.

<br/>

---

<br/>

## 📜 License

**Source Available License** — See [LICENSE](LICENSE) for details.

| Use Case | Status |
|:---------|:------:|
| 👤 Personal & Educational | ✅ Permitted |
| 🎓 Research & Academic | ✅ Permitted |
| 💼 Commercial | 📝 Requires written permission |

<br/>

---

<br/>

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

<br/>

---

<br/>

## 📚 Community Standards

- 📖 Read the [Code of Conduct](CODE_OF_CONDUCT.md) before participating
- 🔐 Report vulnerabilities via [Security Policy](SECURITY.md)—never share real PHI
- 🐛 File issues using provided templates
- ✅ Submit PRs with the checklist to prevent accidental PHI leaks

<br/>

---

<br/>

<div align="center">

**Built for transparency. Requires validation. Welcomes collaboration.**

</div>
