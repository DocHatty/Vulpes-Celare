# Vulpes Celare Verification Portal

**One-click cryptographic verification for non-technical auditors**

The Verification Portal is a simple web interface that allows compliance officers, auditors, and legal teams to verify the integrity of redacted documents without needing technical expertise.

## Features

✅ **Drag-and-drop interface** - Upload Trust Bundles (.red files) instantly  
✅ **Cryptographic verification** - Validates hash integrity, chain validity, and certificates  
✅ **Visual feedback** - Clear pass/fail indicators with detailed check results  
✅ **No technical knowledge required** - Designed for non-technical auditors  
✅ **Instant results** - Verification completes in seconds  
✅ **Detailed reporting** - Shows certificate details, timestamps, and PHI removal stats  

## Quick Start

### Installation

```bash
cd verification-portal
npm install
```

### Running the Portal

```bash
npm start
```

The portal will be available at **http://localhost:3000**

### Development Mode

For development with auto-reload:

```bash
npm run dev
```

## Usage

### For Auditors

1. **Open the portal** in your web browser (http://localhost:3000)
2. **Drag and drop** a Trust Bundle (.red file) or click to browse
3. **Click "Verify Trust Bundle"** 
4. **Review results** - Green checkmarks indicate successful verification

### What Gets Verified

The portal performs the following checks:

| Check | Description |
|-------|-------------|
| **Bundle Integrity** | Verifies all required files are present |
| **Manifest Valid** | Confirms manifest structure is correct |
| **Hash Chain Valid** | Cryptographically verifies document hasn't been tampered with |
| **Certificate Valid** | Validates attestations and signatures |
| **Timestamp Valid** | Checks timestamp is reasonable |

### Verification Results

**✓ VERIFIED** - All cryptographic checks passed. The document's integrity is guaranteed.

**✗ VERIFICATION FAILED** - One or more checks failed. The document may have been tampered with or is incomplete.

## API Usage

For programmatic verification:

```bash
POST /api/verify
Content-Type: multipart/form-data

bundle: [Trust Bundle file]
```

**Response:**

```json
{
  "valid": true,
  "checks": {
    "bundleIntegrity": true,
    "manifestValid": true,
    "hashChainValid": true,
    "certificateValid": true,
    "timestampValid": true
  },
  "details": {
    "jobId": "rdx-2024-12-06-abc123",
    "certificateId": "cert-rdx-2024-12-06-abc123",
    "timestamp": "2024-12-06T15:30:45.123Z",
    "phiElementsRemoved": 47,
    "policy": "HIPAA Safe Harbor - All 18 identifiers checked"
  },
  "errors": [],
  "warnings": []
}
```

## Integration with Vulpes Celare

The verification portal is designed to work with Trust Bundles created by Vulpes Celare's redaction engine.

### Creating a Trust Bundle

See the main documentation for creating Trust Bundles:
- [Trust Bundle Specification](../docs/TRUST-BUNDLE.md)
- [Creating Trust Bundles](../docs/TRUST-BUNDLE.md#creating-a-trust-bundle)

### Verification Workflow

```
┌─────────────────────┐
│  Redaction Engine   │
│  (Vulpes Celare)    │
└──────────┬──────────┘
           │
           │ Creates
           ▼
┌─────────────────────┐
│   Trust Bundle      │
│   (.red file)       │
└──────────┬──────────┘
           │
           │ Upload
           ▼
┌─────────────────────┐
│ Verification Portal │
│ (This application)  │
└──────────┬──────────┘
           │
           │ Verifies
           ▼
┌─────────────────────┐
│  Verification       │
│  Report             │
└─────────────────────┘
```

## Security Considerations

### What the Portal Does

✅ Verifies cryptographic hashes  
✅ Validates certificate structure  
✅ Checks chain integrity  
✅ Confirms attestations  

### What the Portal Does NOT Do

❌ Store any uploaded files (deleted immediately after verification)  
❌ Send data to external services  
❌ Require user accounts or authentication  
❌ Log PHI or sensitive information  

### Deployment Recommendations

**For Internal Use:**
- Deploy on internal network only
- Use HTTPS in production
- Implement authentication if required
- Configure CORS appropriately

**For Air-Gapped Environments:**
- No internet connection required
- All verification happens locally
- Can run on isolated networks

## Configuration

### Environment Variables

```bash
PORT=3000                    # Server port (default: 3000)
NODE_ENV=production          # Environment mode
MAX_UPLOAD_SIZE=10485760     # Max upload size in bytes (default: 10MB)
```

### Custom Configuration

Edit `src/server.js` to customize:
- Upload size limits
- Allowed file extensions
- Verification logic
- Response format

## Troubleshooting

### Upload Fails

**Problem:** File upload returns an error

**Solutions:**
- Ensure file is a valid .red or .zip file
- Check file size (default limit: 10MB)
- Verify file isn't corrupted

### Verification Always Fails

**Problem:** All bundles fail verification

**Solutions:**
- Ensure bundle was created with compatible version
- Check that bundle contains all required files
- Verify bundle hasn't been modified after creation

### Port Already in Use

**Problem:** Server won't start - port 3000 in use

**Solution:**
```bash
PORT=3001 npm start
```

## Development

### Project Structure

```
verification-portal/
├── src/
│   └── server.js          # Express server and verification logic
├── public/
│   └── index.html         # Web interface
├── package.json           # Dependencies
└── README.md             # This file
```

### Adding Features

The codebase is designed for easy extension:

**To add new verification checks:**
1. Add check to `TrustBundleVerifier.verify()` method
2. Update `checks` object with new check name
3. Frontend will automatically display new check

**To customize UI:**
1. Edit `public/index.html`
2. Modify styles in `<style>` section
3. Update JavaScript for behavior changes

## Production Deployment

### Using PM2

```bash
npm install -g pm2
pm2 start src/server.js --name vulpes-verify
pm2 save
pm2 startup
```

### Using Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t vulpes-verify .
docker run -p 3000:3000 vulpes-verify
```

### Using Systemd

Create `/etc/systemd/system/vulpes-verify.service`:

```ini
[Unit]
Description=Vulpes Celare Verification Portal
After=network.target

[Service]
Type=simple
User=vulpes
WorkingDirectory=/opt/vulpes-celare/verification-portal
ExecStart=/usr/bin/node src/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable vulpes-verify
sudo systemctl start vulpes-verify
```

## Support

For questions or issues:
- 📖 [Main Documentation](../README.md)
- 💬 [Discussions](https://github.com/DocHatty/Vulpes-Celare/discussions)
- 🐛 [Report Issues](https://github.com/DocHatty/Vulpes-Celare/issues)

## License

AGPL-3.0 - Same as Vulpes Celare main project

---

**Built with transparency. Validated through cryptography. 🦊**
