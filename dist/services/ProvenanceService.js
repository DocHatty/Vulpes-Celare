"use strict";
/**
 * ProvenanceService
 *
 * Records redaction provenance to the local RPL layer (when available).
 * Extracted from `RedactionEngine` to keep orchestration concerns separate.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvenanceService = void 0;
const meta_1 = require("../meta");
class ProvenanceService {
    static DEFAULT_ENDPOINT = "http://localhost:3106/provenance/record";
    static async recordRedaction(original, redacted, options = {}) {
        // Only attempt if we are in an environment with fetch (Node 18+)
        if (typeof fetch === "undefined")
            return;
        const manifest = {
            timestamp: new Date().toISOString(),
            engine: options.engine ?? `${meta_1.ENGINE_NAME} v${meta_1.VERSION}`,
        };
        const payload = {
            docId: options.docId ?? `doc-${Date.now()}`,
            original,
            redacted,
            manifest,
            actorId: options.actorId ?? "system-redaction-engine",
        };
        const endpoint = options.endpoint ?? ProvenanceService.DEFAULT_ENDPOINT;
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`RPL Server responded with ${response.status}: ${err}`);
        }
    }
}
exports.ProvenanceService = ProvenanceService;
//# sourceMappingURL=ProvenanceService.js.map