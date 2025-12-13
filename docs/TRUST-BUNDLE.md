# Trust Bundle (`.red`) Format

The Trust Bundle is a tamper-evident export format for redaction results.

In this repo, a `.red` file is a ZIP archive containing JSON metadata plus the redacted output text.

## Files

Required files:

```
manifest.json
certificate.json
redacted-document.txt
policy.json
auditor-instructions.md
```

Optional files:

```
merkle-proof.json
```

## How To Create

```ts
import { VulpesCelare, TrustBundleExporter } from "vulpes-celare";

const original = "Patient John Smith, MRN 123456";
const result = await VulpesCelare.redactWithDetails(original);

const bundle = await TrustBundleExporter.generate(original, result.text, result, {
  policyName: "maximum",
  documentId: "doc-001",
  actorId: "system",
});

await TrustBundleExporter.export(bundle, "trust-bundle.red");
```

## How To Verify

```ts
import { TrustBundleExporter } from "vulpes-celare";

const verification = await TrustBundleExporter.verify("trust-bundle.red");
if (!verification.valid) {
  console.error(verification.errors);
}
```

## What Verification Checks Today

- bundle contains required files
- `redacted-document.txt` hash matches `certificate.json` and `manifest.json`
- basic version compatibility
- `merkle-proof.json` (if present) has a consistent root hash

## Notes

- This format intentionally avoids including original PHI.
- Hashing uses SHA-256; the implementation prefers the Rust native crypto helper when available and falls back to Node's `crypto` module.
- Future cryptographic proofs (ZK proofs, external timestamping, blockchain anchoring) are out of scope for the current implementation and are tracked in `docs/ROADMAP.md`.

