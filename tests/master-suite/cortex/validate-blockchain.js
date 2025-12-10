const fs = require('fs');
const path = require('path');
const { MerkleLog } = require('./core/merkle-log');
const { CortexDatabase } = require('./db/database');

const TEST_DB_PATH = path.join(__dirname, 'storage', 'test_blockchain.db');

async function runValidation() {
    console.log("🔒 BLOCKCHAIN PHASE 1 VALIDATION");
    console.log("================================");

    // 1. Setup Test DB
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);

    const db = new CortexDatabase(TEST_DB_PATH, { verbose: false });
    const log = new MerkleLog(db); // Pass the CortexDatabase wrapper

    try {
        // 2. Test Tamper Evidence (Append)
        console.log("\n[TEST 1] Appending Events...");
        const e1 = log.append("ACCESS", "user_1", { doc: "A" });
        console.log(`  Entry 1: ${e1.hash.substring(0, 16)}... (Prev: ${e1.prevHash.substring(0, 16)}...)`);

        const e2 = log.append("REDACTION", "system", { doc: "A", field: "ssn" });
        console.log(`  Entry 2: ${e2.hash.substring(0, 16)}... (Prev: ${e2.prevHash.substring(0, 16)}...)`);

        const e3 = log.append("ACCESS", "user_2", { doc: "B" });
        console.log(`  Entry 3: ${e3.hash.substring(0, 16)}... (Prev: ${e3.prevHash.substring(0, 16)}...)`);

        // Verify Linkage
        if (e2.prevHash !== e1.hash) throw new Error("Chain broken: E2 does not point to E1");
        if (e3.prevHash !== e2.hash) throw new Error("Chain broken: E3 does not point to E2");
        console.log("  ✓ Chain linkage verified");

        // 3. Test Verification
        console.log("\n[TEST 2] Verifying Integrity...");
        const v1 = log.verify(e1.id);
        if (!v1.valid) throw new Error(`Verification failed for E1: ${v1.error}`);
        console.log("  ✓ E1 Verified");

        const v2 = log.verify(e2.id);
        if (!v2.valid) throw new Error(`Verification failed for E2: ${v2.error}`);
        console.log("  ✓ E2 Verified");

        // 4. Test Tamper Detection
        console.log("\n[TEST 3] Testing Tamper Detection...");

        // Attack: Modify payload of E2 in DB
        console.log("  > ATTACK: Malicious actor changes 'ssn' to 'name' in Entry 2 payload...");
        // Direct SQL injection to mock attack
        db.run("UPDATE audit_log SET payload = ? WHERE id = ?", [JSON.stringify({ doc: "A", field: "name" }), e2.id]);

        const v2_tampered = log.verify(e2.id);
        if (v2_tampered.valid) throw new Error("Tamper detection FAILED! Modified record was accepted.");
        console.log(`  ✓ Tamper Detected! Error: ${v2_tampered.error}`);

        // Attack: Modify hash to match payload (but break chain)
        // To make E2 valid self-contained, attacker must rehash it.
        // But then E3.prevHash won't match.

        console.log("  > ATTACK: Malicious actor re-hashes Entry 2 to hide payload change...");

        // Calculate new hash for E2
        const fakePayload = JSON.stringify({ doc: "A", field: "name" });
        const fakeContent = `${e2.prevHash}|REDACTION|system|${e2.timestamp}|${fakePayload}`;
        const fakeHash = log.sha256(fakeContent);

        // Update E2 hash in DB
        db.run("UPDATE audit_log SET data_hash = ? WHERE id = ?", [fakeHash, e2.id]);

        // Now verify E2 (should be valid itself)
        // But E3 should fail

        const v2_rehash = log.verify(e2.id);
        // Wait, verify() checks next record too!
        // So verify(e2) should fail because e3.prevHash != e2.newHash

        if (v2_rehash.valid) {
            // It might be valid if verify() only checked self.
            // But my implementation checks next record too.
            // Let's verify E3 as well.
            const v3 = log.verify(e3.id);
            if (v3.valid) throw new Error("E3 should see the chain break!");
            console.log("  ✓ Propagation Detected! E3 sees chain break.");
        } else {
            console.log(`  ✓ Chain Break Detected! Error: ${v2_rehash.error}`);
        }

        console.log("  ✓ System successfully detects modifications");

        // 5. Performance Test
        console.log("\n[TEST 4] Performance Benchmark...");
        const start = Date.now();
        const ITERATIONS = 1000;

        // Use transaction for bulk insert speed
        db.transaction(() => {
            for (let i = 0; i < ITERATIONS; i++) {
                log.append("BENCH", "bot", { i });
            }
        });

        const end = Date.now();
        console.log(`  Inserted ${ITERATIONS} records in ${end - start}ms (${((end - start) / ITERATIONS).toFixed(2)}ms/op)`);

    } catch (err) {
        console.error("\n❌ VALIDATION FAILED");
        console.error(err);
        process.exit(1);
    } finally {
        db.close();
        // Cleanup
        if (fs.existsSync(TEST_DB_PATH)) {
            try { fs.unlinkSync(TEST_DB_PATH); } catch (e) { }
        }
        if (fs.existsSync(TEST_DB_PATH + "-wal")) {
            try { fs.unlinkSync(TEST_DB_PATH + "-wal"); } catch (e) { }
        }
        if (fs.existsSync(TEST_DB_PATH + "-shm")) {
            try { fs.unlinkSync(TEST_DB_PATH + "-shm"); } catch (e) { }
        }
    }

    console.log("\n✅ ALL CHECKS PASSED. SYSTEM IS SECURE.");
}

runValidation();
