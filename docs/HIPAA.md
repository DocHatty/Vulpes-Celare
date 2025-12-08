# HIPAA Compliance & Safe System Requirements

> **Quick Reference Guide** - For the comprehensive HIPAA compliance mapping with filter implementations and code examples, see [compliance/HIPAA-COMPLIANCE.md](compliance/HIPAA-COMPLIANCE.md).

> **Disclaimer**: This provides a technical overview, not legal advice. Compliance requires legal counsel and organizational policies.

---

## The Golden Rules

1. **If you can't prove it, you didn't do it.** Documentation is as important as security itself.
2. **"No Actual Knowledge" is the trap.** Removing identifiers isn't enough if remaining data is unique enough to identify someone.
3. **Security is not static.** 2025 rules make MFA and encryption mandatory (not addressable).

---

## De-identification: The 18 Identifiers (Safe Harbor)

| # | Identifier | Notes |
|---|------------|-------|
| 1 | **Names** | Full names, initials, nicknames |
| 2 | **Geographic** | Anything smaller than State. ZIP: Keep first 3 digits if pop > 20k |
| 3 | **Dates** | DOB, admission, discharge, death. Keep year only. Ages 90+ → "90+" |
| 4 | **Phone** | All phone numbers |
| 5 | **Fax** | All fax numbers |
| 6 | **Email** | All email addresses |
| 7 | **SSN** | Social Security Numbers |
| 8 | **MRN** | Medical Record Numbers |
| 9 | **Health Plan IDs** | Member/beneficiary numbers |
| 10 | **Account Numbers** | Financial accounts |
| 11 | **Licenses** | Driver's license, professional licenses, DEA |
| 12 | **Vehicle IDs** | VINs, license plates |
| 13 | **Device IDs** | Implant IDs, serial numbers |
| 14 | **URLs** | Patient portal URLs |
| 15 | **IP Addresses** | **Crucial:** IP addresses are PHI |
| 16 | **Biometrics** | Fingerprints, voiceprints, DNA |
| 17 | **Photos** | Full-face or comparable images |
| 18 | **Other Unique IDs** | Any unique identifying code |

---

## 2025 Security Requirements

| Control | Status | Details |
|---------|--------|---------|
| Access Control | **Mandatory** | Unique IDs, RBAC, auto-logoff |
| MFA | **Mandatory** | Required for ALL ePHI access |
| Encryption | **Mandatory** | AES-256 at rest, TLS 1.2+ in transit |
| Audit Logs | **Mandatory** | Log all access, immutable logs |
| Risk Analysis | Annual | Formal assessment |
| Vulnerability Scan | Every 6 months | |
| Penetration Test | Annual | |
| Breach Notification | **72 hours** | Down from 60 days |

---

## Developer Tips

### Architecture

- **Data Minimization:** Don't store what you don't need
- **Isolate PHI:** Separate database/schema limits breach "blast radius"
- **Break Glass:** Emergency access with heavy logging

### Coding

- **Never Log PHI:** Sanitize before logging
- **Sanitize Filenames:** Use UUIDs, never patient names
- **No Hardcoded Secrets:** Use environment variables

### Operations

- **BAA Required:** Must have Business Associate Agreement with any vendor touching PHI
- **No Real Test Data:** Never copy production to staging

---

## Common Pitfalls

| Trap | Reality |
|------|---------|
| "Internal tool, no MFA needed" | Admins need MFA most. 2025 makes this mandatory. |
| "I hashed the email" | Hashing is reversible. Still PHI without secret salt. |
| "Analytics on patient portal" | Google Analytics collects IP + URLs = PHI disclosure to Google |
| "Test data from production" | Never use real patient data in dev/staging |

---

## Recognized Security Practices (Safe Harbor for Liability)

Implement **NIST CSF** or **Section 405(d) HICP** for 12 months → mitigating factor in enforcement.

---

*See [HHS De-identification Guidance](https://www.hhs.gov/hipaa/for-professionals/special-topics/de-identification/index.html) for official reference.*
