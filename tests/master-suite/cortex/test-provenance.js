const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const { getDatabase } = require('./db/database');

async function run() {
    console.log("🔒 RPL PROVENANCE VERIFICATION");
    console.log("===============================");

    let serverProcess = null;
    const PORT = 3106; // Distinct port

    try {
        // 0. Ensure Schema (including new table)
        console.log("\n[STEP 0] Checking Schema...");
        const db = getDatabase();
        // Re-run schema migration just in case
        try {
            db.db.exec(`
            CREATE TABLE IF NOT EXISTS redaction_jobs (
                job_id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                hash_original TEXT NOT NULL,
                hash_redacted TEXT NOT NULL,
                hash_manifest TEXT NOT NULL,
                zk_proof TEXT,
                signature TEXT,
                audit_log_id INTEGER,
                FOREIGN KEY(audit_log_id) REFERENCES audit_log(id)
            );
        `);
        } catch (e) { console.warn("Schema init valid:", e.message); }

        // 1. Start Server
        console.log("\n[STEP 1] Starting MCP Server...");
        const scriptPath = path.join(__dirname, 'index.js');
        serverProcess = spawn('node', [scriptPath, '--server', '--daemon', `--port=${PORT}`], {
            cwd: __dirname,
            stdio: ['ignore', 'ignore', 'pipe']
        });

        serverProcess.stderr.on('data', d => {
            // Uncomment to debug
            // console.log(`[SERVER] ${d}`);
        });

        await waitForServer(PORT);
        console.log("  > Server ready.");

        // 2. Create Provenance Job
        console.log("\n[STEP 2] Creating Redaction Job...");
        const payload = {
            docId: "doc-123",
            original: "Patient Name: John Doe",
            redacted: "Patient Name: [REDACTED]",
            manifest: { fields: ["Name"] },
            actorId: "test-redactor"
        };

        const receipt = await postJson(`http://localhost:${PORT}/provenance/record`, payload);
        console.log("  > Receipt:", JSON.stringify(receipt, null, 2));

        if (!receipt.jobId || !receipt.merkleRoot) {
            throw new Error("Invalid receipt received");
        }
        console.log("  ✓ Job recorded successfully");

        // 3. Verify Job
        console.log("\n[STEP 3] Verifying Job via API...");
        const verification = await fetchJson(`http://localhost:${PORT}/provenance/verify/${receipt.jobId}`);
        console.log("  > Verification:", JSON.stringify(verification, null, 2));

        if (!verification.valid) throw new Error("Verification failed (valid=false)");
        if (verification.fingerprints.hashOriginal !== receipt.hashes.original) {
            throw new Error("Hash mismatch");
        }
        console.log("  ✓ Job verified via API");

        // 4. Verify Chain Linkage
        console.log("\n[STEP 4] Verifying Chain Linkage...");
        // Check if the audit log entry actually exists and matches
        const auditHead = await fetchJson(`http://localhost:${PORT}/audit/head`);
        console.log(`  > Chain Head: ${auditHead.merkle_root}`);

        // The receipt's merkleRoot might be older than current head if other things happened, 
        // but in this isolated test, it should likely match or be in lineage.
        // For now, just ensure we can fetch the specific audit ID from receipt
        const auditEntry = await fetchJson(`http://localhost:${PORT}/audit/verify/${receipt.auditLogId}`);
        if (!auditEntry.valid) throw new Error("Linked audit entry invalid");
        console.log("  ✓ Linked audit entry confirmed");

        console.log("\n✅ RPL VERIFICATION PASSED");

    } catch (err) {
        console.error("\n❌ FAILED:", err);
        process.exit(1);
    } finally {
        if (serverProcess) serverProcess.kill();
        process.exit(0);
    }
}

async function waitForServer(port) {
    for (let i = 0; i < 20; i++) {
        try { await fetchJson(`http://localhost:${port}/health`); return; }
        catch (e) { await new Promise(r => setTimeout(r, 500)); }
    }
    throw new Error("Server timeout");
}

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        http.get(url, res => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => {
                try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

function postJson(url, body) {
    return new Promise((resolve, reject) => {
        const req = http.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, res => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => {
                try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.write(JSON.stringify(body));
        req.end();
    });
}

run();
