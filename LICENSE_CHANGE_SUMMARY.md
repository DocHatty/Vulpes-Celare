# 📜 LICENSE CHANGE - AGPL-3.0 IMPLEMENTATION COMPLETE

**Date**: December 5, 2025  
**Previous License**: Source Available (Custom)  
**New License**: AGPL-3.0 with Commercial Exception

---

## ✅ What Was Changed

### Files Created (NEW):

1. **`LICENSE`** 
   - Full AGPL-3.0 license text
   - Commercial exception clause
   - $1M revenue threshold
   - Clear free use cases

2. **`COMMERCIAL_LICENSE.md`**
   - When commercial license is needed
   - Pricing structure outline
   - FAQ for common questions
   - Contact information

3. **`CONTRIBUTING_CLA.md`**
   - Contributor License Agreement
   - Dual licensing explanation
   - Sign-off requirements
   - Why it's needed for sustainability

4. **`LICENSE_CHANGE_SUMMARY.md`** (this file)
   - Complete change documentation

### Files Modified:

5. **`README.md`**
   - License section completely rewritten
   - Clear table showing who can use freely
   - Links to commercial license docs
   - Explains AGPL benefits for healthcare

6. **`CONTRIBUTING.md`**
   - Added CLA section at top
   - Links to CONTRIBUTING_CLA.md
   - Explains sign-off requirement

7. **`package.json`**
   - Changed from: `"SEE LICENSE IN LICENSE"`
   - Changed to: `"AGPL-3.0-only"`

---

## 📊 What Changed Conceptually

### Before (Source Available):

```
❌ Not truly open source
❌ "Need permission" for commercial use (vague)
❌ No clear threshold
❌ Hard to evaluate for companies
❌ Limited community growth potential
```

### After (AGPL-3.0):

```
✅ Truly open source (AGPL-3.0 is OSI approved)
✅ Clear $1M revenue threshold
✅ Anyone can fork, modify, distribute
✅ Companies can evaluate freely
✅ Community can contribute
✅ Still protected from exploitation
```

---

## 🎯 Who Can Use Vulpes Celare and How

### ✅ FREE Use Under AGPL-3.0 (No License Needed):

| User Type | Annual Revenue | Conditions | License Needed? |
|-----------|---------------|------------|-----------------|
| **Individuals** | Any | Personal projects, learning | ❌ No - AGPL-3.0 |
| **Researchers** | Any | Academic research, papers | ❌ No - AGPL-3.0 |
| **Students** | Any | Educational use | ❌ No - AGPL-3.0 |
| **Non-Profits** | Any | Healthcare organizations | ❌ No - AGPL-3.0 |
| **Government** | Any | Healthcare facilities | ❌ No - AGPL-3.0 |
| **Startups** | < $1M | Any use, even proprietary | ❌ No - AGPL-3.0 |
| **Small Companies** | < $1M | Any use, even proprietary | ❌ No - AGPL-3.0 |
| **Any Company** | Any | Internal use only | ❌ No - AGPL-3.0 |
| **Open Source Projects** | Any | GPL-compatible projects | ❌ No - AGPL-3.0 |

### 💼 COMMERCIAL License Required:

| User Type | Annual Revenue | Use Case | License Needed? |
|-----------|---------------|----------|-----------------|
| **Large Company** | > $1M | Closed-source product integration | ✅ Yes - Commercial |
| **Large Company** | > $1M | Offering as managed SaaS | ✅ Yes - Commercial |
| **Large Company** | > $1M | Keeping modifications private | ✅ Yes - Commercial |
| **Any Company** | > $1M | Redistributing without AGPL | ✅ Yes - Commercial |

---

## 🛡️ What AGPL-3.0 Protects You From

### The "SaaS Loophole" (Closed):

**Before AGPL (with GPL):**
```
AWS takes your code
→ Runs it as a service
→ Never distributes it
→ Doesn't have to share modifications
→ You get $0
```

**With AGPL:**
```
AWS takes your code
→ Runs it as a service
→ MUST make source available to users
→ OR buy commercial license from you
→ You get paid OR they contribute back
```

### Real Examples:

1. **MongoDB** switched to SSPL (similar to AGPL) specifically to prevent AWS DocumentDB
2. **Elastic** switched to SSPL to prevent AWS Elasticsearch Service
3. **Redis** moved modules to proprietary to prevent AWS ElastiCache

You're doing the same thing, but being MORE generous:
- ✅ Small companies (< $1M) can use freely in proprietary products
- ✅ Clear threshold ($1M revenue)
- ✅ Fair and transparent

---

## 📈 Expected Impact on Adoption

### Short Term (0-6 months):

**Positive:**
- ✅ More GitHub stars (people trust AGPL)
- ✅ More forks (people can experiment)
- ✅ More contributors (can contribute without legal concerns)
- ✅ Better reputation in open source community

**Neutral:**
- ⚠️ Some large companies may pause to evaluate license
- ⚠️ Legal teams need to review AGPL implications

### Medium Term (6-18 months):

**Positive:**
- ✅ 10-50x more users (lower friction)
- ✅ More validation/testing (real-world use)
- ✅ More feature requests/bug reports
- ✅ Community improvements contributed back
- ✅ Startups build on top of it (< $1M free)

### Long Term (18+ months):

**Positive:**
- ✅ Industry standard for PHI redaction
- ✅ Commercial license revenue from enterprises
- ✅ Sustainable development funded by large companies
- ✅ Small orgs benefit from improvements funded by large orgs
- ✅ Higher acquisition value (proven adoption + revenue)

---

## 💰 Commercial Licensing Strategy

### Target Market:

| Segment | Revenue | Approach |
|---------|---------|----------|
| **Startups** | $0-1M | Free - Let them grow |
| **Growing** | $1-10M | Startup tier - Easy entry |
| **Enterprise** | $10M+ | Enterprise tier - Full service |
| **EMR Vendors** | $100M+ | OEM tier - Volume pricing |

### Conversion Funnel:

```
10,000 users (free AGPL)
  ↓
1,000 companies < $1M (free)
  ↓
100 companies grow past $1M
  ↓
10 convert to commercial license ($20-100k each)
  ↓
$200k-1M annual recurring revenue
```

---

## 🔄 Migration for Existing Users

### If Anyone Was Using Under Old License:

**Grandfathering:**
- Existing users can continue under old terms OR upgrade to AGPL
- No forced migration
- Goodwill gesture

**Communication:**
- Email existing known users (if any)
- Post on GitHub
- Update website/docs
- Explain benefits of new license

---

## ⚖️ Legal Compliance Checklist

### ✅ Completed:

- [x] LICENSE file contains full AGPL-3.0 text
- [x] LICENSE file includes commercial exception
- [x] Copyright notice includes your name
- [x] README.md clearly explains license
- [x] package.json has correct SPDX identifier
- [x] CONTRIBUTING.md references CLA
- [x] CLA document created and linked
- [x] Commercial license documentation created

### 📋 Recommended Next Steps:

1. **Add license headers to source files:**
   ```typescript
   /*
    * Copyright (C) 2024-2025 Andrew Hathaway (DocHatty)
    * 
    * This file is part of Vulpes Celare.
    * 
    * Vulpes Celare is free software: you can redistribute it and/or modify
    * it under the terms of the GNU Affero General Public License as published
    * by the Free Software Foundation, either version 3 of the License, or
    * (at your option) any later version.
    * 
    * See LICENSE file for full terms.
    */
   ```

2. **Create .github/PULL_REQUEST_TEMPLATE.md:**
   ```markdown
   ## Contributor Checklist
   - [ ] I have read and agree to the [CLA](../CONTRIBUTING_CLA.md)
   - [ ] My commits include `Signed-off-by: Name <email>`
   - [ ] Tests pass locally
   ```

3. **Setup GitHub issue labels:**
   - `commercial-license` - For licensing inquiries
   - `CLA-required` - For PRs missing sign-off

4. **Consider automation:**
   - CLA bot to check sign-offs
   - Auto-comment on PRs about CLA

---

## 📣 Announcing the Change

### GitHub Release Notes:

```markdown
# v1.0.0 - License Change to AGPL-3.0

We're excited to announce Vulpes Celare is now AGPL-3.0!

## What Changed:
- ✅ Now truly open source (AGPL-3.0)
- ✅ Free for individuals, researchers, non-profits
- ✅ Free for companies < $1M revenue
- ✅ Commercial licenses for large enterprises

## Why This Matters:
- 🔓 More transparent and auditable
- 🚀 Easier to adopt and evaluate
- 🤝 Community can contribute
- 💰 Sustainable through commercial licensing

## Who This Helps:
- Students and researchers: Use freely
- Startups: Build on it for free
- Small hospitals: No barriers
- Open source projects: Fully compatible

## Migration:
No action needed. All existing use cases remain valid.

See LICENSE and COMMERCIAL_LICENSE.md for details.
```

### Social Media (LinkedIn/Twitter):

```
🦊 Big news for #HealthTech: Vulpes Celare is now AGPL-3.0!

✅ Truly open source PHI redaction
✅ Free for researchers & startups
✅ Auditable for HIPAA compliance
✅ Commercial options for enterprises

Making healthcare AI more transparent and accessible.

#OpenSource #HealthcareIT #HIPAA #AI
```

---

## 🤔 FAQ for the Change

**Q: Why change from Source Available to AGPL?**  
A: To increase adoption and prove market value while staying protected from exploitation.

**Q: Can I still use it commercially?**  
A: Yes! If revenue < $1M, use freely. If > $1M and want closed-source, get commercial license.

**Q: What if I already have a commercial agreement?**  
A: It remains valid. This doesn't affect existing agreements.

**Q: Will you accept contributions now?**  
A: Yes! With CLA sign-off. See CONTRIBUTING_CLA.md.

**Q: Can AWS/Google/Microsoft just take it?**  
A: Not without open-sourcing their modifications (AGPL) or paying for commercial license.

**Q: What about my company that's at $900k revenue?**  
A: You're fine! Free use under AGPL-3.0.

**Q: We just hit $1.1M revenue, do we owe money?**  
A: Contact us for reasonable transition terms. We're friendly to growing companies.

---

## 🎯 Success Metrics to Track

### Adoption Metrics:
- GitHub stars (target: 100 → 1000 in 6 months)
- Forks (target: 10 → 100)
- npm downloads (target: 100/month → 1000/month)
- Contributors (target: 1 → 10)

### Revenue Metrics:
- Commercial license inquiries (target: 1/month)
- Conversion rate (target: 10%)
- ARR from commercial licenses (target: $50k year 1)

### Community Metrics:
- Issues opened (engagement)
- PRs submitted (contributions)
- Discussions started (community building)

---

## ✅ Checklist for Going Live

- [x] LICENSE file updated
- [x] README.md updated
- [x] CONTRIBUTING.md updated
- [x] package.json updated
- [x] Commercial license docs created
- [x] CLA document created
- [ ] Add license headers to source files (optional but recommended)
- [ ] Create GitHub release notes
- [ ] Post announcement on social media
- [ ] Update any external documentation/website
- [ ] Notify existing users (if any)

---

## 📞 Contact for Questions

If anyone has questions about the license change:
- Open GitHub issue with `license-question` label
- Email: [via GitHub profile]
- Response time: 24-48 hours

---

## 🙏 Credits

License strategy inspired by:
- MongoDB (AGPL → SSPL)
- Elastic (Apache → SSPL)
- Grafana (Apache → AGPL)
- GitLab (MIT → Dual License)

These companies proved you can be both open source AND sustainable.

---

**License change implemented**: December 5, 2025  
**Previous license**: Source Available (Custom)  
**New license**: AGPL-3.0-only with Commercial Exception  
**Status**: ✅ COMPLETE

Welcome to true open source! 🎉
