/**
 * VULPES CELARE - PROVENANCE VERIFICATION PORTAL
 * 
 * Simple Express.js server providing verification API for Trust Bundles (RED files)
 * Non-technical auditors can upload a Trust Bundle and get instant verification results
 */

const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const unzipper = require('unzipper');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const upload = multer({ dest: 'uploads/' });

// Serve static files from public directory
app.use(express.static('public'));
app.use(express.json());

/**
 * Trust Bundle Verifier
 * Validates cryptographic integrity of redaction certificates
 */
class TrustBundleVerifier {
  constructor() {
    this.requiredFiles = [
      'manifest.json',
      'certificate.json',
      'redacted-document.txt'
    ];
  }

  /**
   * Verify a Trust Bundle (.red file)
   * @param {string} bundlePath - Path to uploaded .red file
   * @returns {Object} Verification result
   */
  async verify(bundlePath) {
    const checks = {
      bundleIntegrity: false,
      manifestValid: false,
      hashChainValid: false,
      certificateValid: false,
      timestampValid: false
    };

    const errors = [];
    const warnings = [];
    let manifest = null;
    let certificate = null;
    let redactedText = null;

    try {
      // Step 1: Extract and parse bundle
      const directory = await unzipper.Open.file(bundlePath);
      
      // Check required files exist
      const fileNames = directory.files.map(f => f.path);
      const missingFiles = this.requiredFiles.filter(rf => !fileNames.includes(rf));
      
      if (missingFiles.length > 0) {
        errors.push(`Missing required files: ${missingFiles.join(', ')}`);
        return { valid: false, checks, errors, warnings };
      }

      checks.bundleIntegrity = true;

      // Step 2: Parse files
      const manifestFile = directory.files.find(f => f.path === 'manifest.json');
      const certificateFile = directory.files.find(f => f.path === 'certificate.json');
      const redactedFile = directory.files.find(f => f.path === 'redacted-document.txt');

      manifest = JSON.parse(await manifestFile.buffer());
      certificate = JSON.parse(await certificateFile.buffer());
      redactedText = (await redactedFile.buffer()).toString();

      // Step 3: Validate manifest structure
      if (manifest && manifest.version && manifest.jobId && manifest.timestamp) {
        checks.manifestValid = true;
      } else {
        errors.push('Invalid manifest structure');
      }

      // Step 4: Verify hash chain
      if (certificate && certificate.cryptographicProofs && certificate.cryptographicProofs.hashChain) {
        const hashChain = certificate.cryptographicProofs.hashChain;
        
        // Verify redacted document hash matches certificate
        const computedHash = this.sha256(redactedText);
        
        if (computedHash === hashChain.redactedHash) {
          checks.hashChainValid = true;
        } else {
          errors.push(`Hash mismatch: computed ${computedHash.substring(0, 16)}... but certificate has ${hashChain.redactedHash.substring(0, 16)}...`);
        }
      } else {
        errors.push('Missing cryptographic proofs in certificate');
      }

      // Step 5: Validate certificate
      if (certificate && certificate.attestations) {
        if (certificate.attestations.redactionPerformed === true &&
            certificate.attestations.integrityVerified === true) {
          checks.certificateValid = true;
        } else {
          warnings.push('Certificate attestations incomplete');
        }
      }

      // Step 6: Validate timestamp
      if (manifest && manifest.timestamp) {
        const timestamp = new Date(manifest.timestamp);
        const now = new Date();
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        
        if (timestamp > oneYearAgo && timestamp <= now) {
          checks.timestampValid = true;
        } else if (timestamp > now) {
          warnings.push('Timestamp is in the future');
          checks.timestampValid = false;
        } else {
          warnings.push('Timestamp is more than 1 year old');
          checks.timestampValid = true; // Still valid, just old
        }
      }

      // Overall validation
      const valid = checks.bundleIntegrity && 
                    checks.manifestValid && 
                    checks.hashChainValid && 
                    checks.certificateValid;

      return {
        valid,
        checks,
        errors,
        warnings,
        details: {
          jobId: manifest?.jobId,
          certificateId: certificate?.certificateId,
          timestamp: manifest?.timestamp,
          phiElementsRemoved: manifest?.statistics?.phiElementsRemoved,
          policy: certificate?.attestations?.policyCompliance
        }
      };

    } catch (error) {
      errors.push(`Verification failed: ${error.message}`);
      return {
        valid: false,
        checks,
        errors,
        warnings
      };
    }
  }

  sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

// API Endpoints

/**
 * POST /api/verify
 * Upload and verify a Trust Bundle
 */
app.post('/api/verify', upload.single('bundle'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const verifier = new TrustBundleVerifier();
    const result = await verifier.verify(req.file.path);

    // Clean up uploaded file
    await fs.unlink(req.file.path).catch(() => {});

    res.json(result);
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Verification failed', message: error.message });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Vulpes Celare Verification Portal' });
});

/**
 * GET /
 * Serve the verification portal UI
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🦊 Vulpes Celare Verification Portal running on http://localhost:${PORT}`);
  console.log(`📋 API available at http://localhost:${PORT}/api`);
});

module.exports = app;
