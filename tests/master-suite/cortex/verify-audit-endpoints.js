const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const { getDatabase } = require('./db/database');
const { MerkleLog } = require('./core/merkle-log');

async function run() {
    console.log("🔒 AUDIT API VERIFICATION");
    console.log("=========================");

    let serverProcess = null;
    const PORT = 3105; // Use a distinct port

    try {
        // 0. Ensure Schema Exists (Migration)
        console.log("\n[STEP 0] Checking/Migrating Schema...");
        const db = getDatabase();

        // Manually run the table creation in case it's missing (dev environment migration)
        try {
            const rawDb = db.db;
            rawDb.exec(`
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                actor_id TEXT,
                event_type TEXT NOT NULL,
                data_hash TEXT NOT NULL,
                prev_hash TEXT NOT NULL,
                merkle_root TEXT NOT NULL,
                payload TEXT,
                signature TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(timestamp);
            CREATE INDEX IF NOT EXISTS idx_audit_type ON audit_log(event_type);
            CREATE INDEX IF NOT EXISTS idx_audit_hash ON audit_log(data_hash);
        `);
            console.log("  > Schema ensured.");
        } catch (e) {
            console.warn("  ! Schema check warning:", e.message);
        }

        // 1. Insert Test Data (Directly to DB)
        console.log("\n[STEP 1] Seeding Database...");
        const log = new MerkleLog(db);

        // Create a unique test event
        const timestamp = Date.now();
        const entry1 = log.append("API_TEST_INIT", "verify_script", { step: 1, ts: timestamp });
        const entry2 = log.append("API_TEST_VERIFY", "verify_script", { step: 2, ref: entry1.hash });

        console.log(`  > Inserted Entry 1: ID ${entry1.id} | Hash ${entry1.hash.substring(0, 8)}...`);
        console.log(`  > Inserted Entry 2: ID ${entry2.id} | Hash ${entry2.hash.substring(0, 8)}...`);

        // 2. Start MCP Server
        console.log("\n[STEP 2] Starting MCP Server (Daemon Mode)...");
        const scriptPath = path.join(__dirname, 'index.js');

        serverProcess = spawn('node', [scriptPath, '--server', '--daemon', `--port=${PORT}`], {
            cwd: __dirname,
            // Pipe stdio so we don't pollute our output but can debug if needed
            stdio: ['ignore', 'ignore', 'pipe']
        });

        // Capture stderr for debugging server start
        serverProcess.stderr.on('data', (data) => {
            // Uncomment to debug server output
            // console.error(`[SERVER] ${data}`);
        });

        // Wait for server to be ready
        console.log("  > Waiting for server to initialize...");
        await waitForServer(PORT);
        console.log("  > Server is ready.");

        // 3. Test /audit/head
        console.log("\n[STEP 3] Testing GET /audit/head...");
        const head = await fetchJson(`http://localhost:${PORT}/audit/head`);
        console.log("  > Response:", JSON.stringify(head, null, 2));

        if (!head.data_hash) throw new Error("Response missing data_hash");
        if (head.data_hash !== entry2.hash) {
            throw new Error(`Head mismatch! Expected ${entry2.hash}, got ${head.data_hash}`);
        }
        console.log("  ✓ Head endpoint verified (Matches last insertion)");

        // 4. Test /audit/verify/:id
        console.log("\n[STEP 4] Testing GET /audit/verify/:id...");

        // Verify Entry 1
        const v1 = await fetchJson(`http://localhost:${PORT}/audit/verify/${entry1.id}`);
        console.log(`  > Verify ID ${entry1.id}:`, JSON.stringify(v1));
        if (!v1.valid) throw new Error(`Verification failed for valid ID ${entry1.id}`);
        if (v1.hash !== entry1.hash) throw new Error("Hash verification mismatch");
        console.log("  ✓ Entry 1 validated");

        // Verify Entry 2
        const v2 = await fetchJson(`http://localhost:${PORT}/audit/verify/${entry2.id}`);
        console.log(`  > Verify ID ${entry2.id}:`, JSON.stringify(v2));
        if (!v2.valid) throw new Error(`Verification failed for valid ID ${entry2.id}`);
        console.log("  ✓ Entry 2 validated");

        // Verify Invalid ID
        console.log("\n[STEP 5] Testing Invalid ID...");
        const vInvalid = await fetchJson(`http://localhost:${PORT}/audit/verify/999999`);
        console.log("  > Verify Invalid ID:", JSON.stringify(vInvalid));

        if (vInvalid.valid !== false) throw new Error("Invalid ID should return valid: false");
        if (!vInvalid.error) throw new Error("Invalid ID should return error message");
        console.log("  ✓ Invalid ID handling verified");

        console.log("\n✅ ALL API TESTS PASSED");

    } catch (err) {
        console.error("\n❌ VERIFICATION FAILED");
        console.error(err);
        process.exit(1);
    } finally {
        if (serverProcess) {
            console.log("\nStopping server...");
            serverProcess.kill();
        }
        process.exit(0);
    }
}

async function waitForServer(port, retries = 10) {
    for (let i = 0; i < retries; i++) {
        try {
            await fetchJson(`http://localhost:${port}/health`);
            return;
        } catch (e) {
            await new Promise(r => setTimeout(r, 500));
        }
    }
    throw new Error("Server failed to start within timeout");
}

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Failed to parse JSON: ${data}`));
                }
            });
        }).on('error', reject);
    });
}

run();
