# Vulpes Celare Verification Portal

One-click Trust Bundle verification for non-technical auditors.

## What It Verifies

Given a Trust Bundle (`.red`, ZIP-based), the portal verifies:

- required files exist (`manifest.json`, `certificate.json`, `redacted-document.txt`)
- `redacted-document.txt` hash matches `certificate.json`
- basic manifest structure and timestamp sanity checks

## Quick Start

```bash
cd verification-portal
npm install
npm start
```

Open `http://localhost:3000`.

## API

`POST /api/verify` (multipart form-data)

- field name: `bundle`
- value: `.red` file

## Notes

- Verification is local; uploads are deleted immediately after processing.
- The portal does not send data to external services.

