/**
 * TEST INTEGRATION (REAL PIPELINE)
 *
 * Spins up the MCP provenance server, runs the compiled VulpesCelare engine
 * against a synthetic PHI fixture, and records provenance through the live API.
 */

const { spawn } = require("child_process");
const path = require("path");
const { VulpesCelare } = require("../../../dist");

async function run() {
    console.log("?? RPL INTEGRATION SIMULATION");
    console.log("===============================");

    // 1. Ensure Server is Running (using test-provenance logic)
    console.log("\n[STEP 1] Starting MCP Server...");
    const absScriptPath = path.resolve(__dirname, "mcp/server.js");
    const PORT = 3106;

    const serverProcess = spawn("node", [absScriptPath, "--server", "--daemon", `--port=${PORT}`], {
        cwd: path.join(__dirname, "../../.."),
        stdio: ["ignore", "ignore", "pipe"],
    });

    serverProcess.stderr.on("data", () => {
        // Silence noisy startup output; health check will confirm availability
    });

    try {
        await waitForServer(PORT);
        console.log("  > Server ready.");

        // 2. Run Real Redaction
        console.log("\n[STEP 2] Redacting synthetic PHI...");
        const engine = new VulpesCelare();
        const originalText = [
            "Patient John Doe (DOB 01/02/1980) called from (555) 123-4567.",
            "SSN: 123-45-6789, Email: john.doe@example.com",
            "Address: 123 Main St, Boston MA 02110",
            "Provider noted IP 192.168.1.10 and MRN 445566 during visit on 03/14/2025."
        ].join(" ");

        const redaction = await engine.process(originalText);
        const redacted = redaction.text;

        if (redaction.redactionCount < 4) {
            throw new Error(`Expected multiple PHI detections, got ${redaction.redactionCount}`);
        }
        if (redacted.includes("John Doe") || redacted.includes("123-45-6789")) {
            throw new Error("PHI still present after redaction");
        }

        await recordProvenance(originalText, redacted);
        console.log(`  > Redaction Result: "${redacted.substring(0, 120)}..."`);
        console.log("\n? INTEGRATION TEST PASSED");

    } catch (err) {
        console.error("\n? FAILED:", err);
        process.exit(1);
    } finally {
        serverProcess.kill();
        process.exit(0);
    }
}

async function recordProvenance(original, redacted) {
    const manifest = {
        timestamp: new Date().toISOString(),
        engine: "Vulpes-Celare RedactionEngine v1.0",
        synthetic: true,
    };

    const payload = {
        docId: `doc-${Date.now()}`,
        original,
        redacted,
        manifest,
        actorId: "system-redaction-engine"
    };

    const response = await fetch("http://localhost:3106/provenance/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`RPL Server responded with ${response.status}: ${err}`);
    }

    const receipt = await response.json();
    if (!receipt.signatureValid) {
        console.warn("  ! Signature could not be verified by server response");
    }
    console.log("  û Provenance recorded:", receipt.jobId);
}

async function waitForServer(port) {
    for (let i = 0; i < 20; i++) {
        try {
            await fetch(`http://localhost:${port}/health`);
            return;
        } catch (e) {
            await new Promise((r) => setTimeout(r, 500));
        }
    }
    throw new Error("Server timeout");
}

run();
